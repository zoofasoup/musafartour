/**
 * Who did what, for the notification bell. Everything here reads the structured `meta` the database now stores
 * (see supabase/migrations/20261003130000_notification_meta.sql). Rows from before that migration have no meta,
 * and every helper returns null for them so the caller falls back to the plain title.
 */

export interface NotificationActor {
  name: string;
  kind: "agent" | "public";
}

export interface NotificationMetaData {
  actor?: NotificationActor;
  contact_name?: string;
  package_name?: string;
  code?: string;
  people_count?: number;
  intake_id?: string;
  agent_id?: string;
}

/** Narrow the untyped jsonb column; anything unexpected reads as "no meta". */
export const readMeta = (raw: unknown): NotificationMetaData | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const m = raw as Record<string, unknown>;
  const actor = m.actor as Record<string, unknown> | undefined;
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
  return {
    actor:
      actor && typeof actor.name === "string" && actor.name.trim()
        ? { name: actor.name.trim(), kind: actor.kind === "agent" ? "agent" : "public" }
        : undefined,
    contact_name: text(m.contact_name),
    package_name: text(m.package_name),
    code: text(m.code),
    people_count: typeof m.people_count === "number" ? m.people_count : undefined,
    intake_id: text(m.intake_id),
    agent_id: text(m.agent_id),
  };
};

export const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return letters.toUpperCase();
};

/** Pastel pairs (bg, text). Same name, same colour, every time. */
const AVATAR_COLORS = [
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
  "bg-indigo-100 text-indigo-700",
];

export const avatarColor = (name: string) => {
  let h = 0;
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

export interface Segment {
  text: string;
  bold?: boolean;
}

/** "Rina mendaftarkan 3 orang di Umroh Nyaman" with the names in bold, or null without meta. */
export const sentenceFor = (type: string, meta: NotificationMetaData | null): Segment[] | null => {
  const actor = meta?.actor?.name;
  if (!actor) return null;
  if (type === "jamaah_intake") {
    const verb = meta.actor?.kind === "agent" ? " mendaftarkan " : " mendaftar ";
    const out: Segment[] = [{ text: actor, bold: true }, { text: verb }];
    out.push({ text: meta.people_count ? `${meta.people_count} orang` : "jamaah", bold: true });
    if (meta.package_name) out.push({ text: " di " }, { text: meta.package_name, bold: true });
    return out;
  }
  if (type === "agent_registration") {
    return [{ text: actor, bold: true }, { text: " mendaftar sebagai agen, menunggu persetujuan" }];
  }
  if (type === "agent_withdrawal") {
    return [{ text: actor, bold: true }, { text: " meminta penarikan komisi" }];
  }
  return null;
};

/** Lines for the grey preview card under a notification, or null when there is nothing worth showing. */
export const previewFor = (type: string, meta: NotificationMetaData | null): string[] | null => {
  if (!meta) return null;
  if (type === "jamaah_intake" && meta.code) {
    const line = [meta.package_name, `kode ${meta.code}`, meta.people_count ? `${meta.people_count} orang` : null].filter(Boolean);
    return [line.join(" · ")];
  }
  if (type === "agent_registration") return ["Menunggu persetujuan"];
  if (type === "agent_withdrawal") return ["Menunggu diproses di Kelola Agent > Penarikan"];
  return null;
};
