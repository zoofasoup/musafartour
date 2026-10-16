import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Runs the badge migration against a stand-in of the tables it reads (agents, agent_sales, ...) and checks what gets
 * earned, the "seen" flag and that the migration can be applied twice.
 */
const MIGRATION = readFileSync("supabase/migrations/20261015140000_agent_badges_active.sql", "utf8").replace(/REVOKE[^;]*;/gs, "").replace(/GRANT[^;]*;/gs, "");

const STUB = `
CREATE TYPE app_role AS ENUM ('admin','agent_admin');
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('app.uid', true),'')::uuid $$;
CREATE FUNCTION has_role(_u uuid, _r app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE TABLE agents(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, name text, ktp_number text, ktp_image_url text, address text, sop_accepted_at timestamptz, registration_fee_status text DEFAULT 'unpaid', bank_name text, bank_account text, referred_by_id uuid, total_sales int DEFAULT 0);
CREATE TABLE jamaah_registrations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), group_id uuid);
CREATE TABLE agent_sales(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agent_id uuid, registration_id uuid, counted boolean DEFAULT false, booking_date timestamptz DEFAULT now());
CREATE TABLE agent_leads(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agent_id uuid);
CREATE TABLE agent_badges(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, description text NOT NULL, icon text NOT NULL DEFAULT 'award', requirement_type text NOT NULL, requirement_value integer NOT NULL DEFAULT 1, points_reward integer NOT NULL DEFAULT 100, created_at timestamptz NOT NULL DEFAULT now());
INSERT INTO agent_badges(name, description, requirement_type) VALUES ('Old generic badge', 'x', 'x');
CREATE TABLE agent_earned_badges(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE, badge_id uuid NOT NULL REFERENCES agent_badges(id) ON DELETE CASCADE, earned_at timestamptz NOT NULL DEFAULT now(), UNIQUE(agent_id, badge_id));
`;

let db: PGlite;
const earned = async (agent: string) =>
  (await db.query<{ code: string }>("SELECT b.code FROM agent_earned_badges e JOIN agent_badges b ON b.id = e.badge_id WHERE e.agent_id = $1 ORDER BY 1", [agent])).rows.map((r) => r.code);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(STUB);
  await db.exec(MIGRATION);
});

describe("agent badges", () => {
  it("replaces the old generic badges with the 23 catalogue badges, and can run twice", async () => {
    await db.exec(MIGRATION);
    const { rows } = await db.query<{ n: number; old: number }>("SELECT count(*)::int AS n, count(*) FILTER (WHERE code IS NULL)::int AS old FROM agent_badges");
    expect(rows[0]).toEqual({ n: 23, old: 0 });
  });

  it("awards the setup badges as the agent completes the steps", async () => {
    const user = (await db.query<{ u: string }>("SELECT gen_random_uuid() u")).rows[0].u;
    const a = (await db.query<{ id: string }>("INSERT INTO agents(user_id, name) VALUES ($1, 'A') RETURNING id", [user])).rows[0].id;
    expect(await earned(a)).toEqual([]);
    await db.query("UPDATE agents SET ktp_number='1', ktp_image_url='u', address='x' WHERE id=$1", [a]);
    expect(await earned(a)).toEqual(["paperwork-wizard"]);
    await db.query("UPDATE agents SET sop_accepted_at=now(), registration_fee_status='paid', bank_name='BCA', bank_account='123' WHERE id=$1", [a]);
    expect(await earned(a)).toEqual(["fine-print-reader", "golden-ticket", "paperwork-wizard", "wallet-ready"]);
  });

  it("counts jamaah, one invoice and consecutive months from counted sales only", async () => {
    const a = (await db.query<{ id: string }>("INSERT INTO agents(name) VALUES ('B') RETURNING id")).rows[0].id;
    const group = (await db.query<{ g: string }>("SELECT gen_random_uuid() g")).rows[0].g;
    for (let i = 0; i < 6; i++) {
      const reg = (await db.query<{ id: string }>("INSERT INTO jamaah_registrations(group_id) VALUES ($1) RETURNING id", [group])).rows[0].id;
      await db.query("INSERT INTO agent_sales(agent_id, registration_id, counted, booking_date) VALUES ($1, $2, true, now() - ($3 || ' months')::interval)", [a, reg, String(i)]);
    }
    await db.query("INSERT INTO agent_sales(agent_id, counted) VALUES ($1, false)", [a]);
    expect(await earned(a)).toEqual(["day-one-closer", "on-fire", "one-shot", "squad-goals", "warming-up"]);
  });

  it("credits the referrer when a recruited agent gets going", async () => {
    const boss = (await db.query<{ id: string }>("INSERT INTO agents(name) VALUES ('Boss') RETURNING id")).rows[0].id;
    const kid = (await db.query<{ id: string }>("INSERT INTO agents(name, referred_by_id) VALUES ('Kid', $1) RETURNING id", [boss])).rows[0].id;
    expect(await earned(boss)).toEqual(["plus-one"]);
    await db.query("INSERT INTO agent_sales(agent_id, counted) VALUES ($1, true)", [kid]);
    expect(await earned(boss)).toEqual(["pay-it-forward", "plus-one"]);
  });

  it("reports progress and the seen flag per agent, and marks badges seen once", async () => {
    const user = (await db.query<{ u: string }>("SELECT gen_random_uuid() u")).rows[0].u;
    const a = (await db.query<{ id: string }>("INSERT INTO agents(user_id, name, ktp_number, ktp_image_url, address) VALUES ($1, 'C', '1', 'u', 'x') RETURNING id", [user])).rows[0].id;
    await db.exec(`SET app.uid = '${user}'`);
    const before = (await db.query<{ code: string; seen: boolean }>("SELECT code, seen FROM my_badge_progress() WHERE earned_at IS NOT NULL")).rows;
    expect(before).toEqual([{ code: "paperwork-wizard", seen: false }]);
    await db.query("SELECT mark_badges_seen(ARRAY['paperwork-wizard'])");
    const after = (await db.query<{ seen: boolean }>("SELECT seen FROM my_badge_progress() WHERE code = 'paperwork-wizard'")).rows[0];
    expect(after.seen).toBe(true);
    const all = (await db.query("SELECT code FROM my_badge_progress()")).rows;
    expect(all).toHaveLength(23);
    expect(a).toBeTruthy();
  });
});
