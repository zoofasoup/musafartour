import { describe, expect, it } from "vitest";
import { nextBadges, type BadgeProgress } from "./badges";

const b = (code: string, group: BadgeProgress["group_key"], sort: number, target: number, current: number, earned = false, manual = false): BadgeProgress => ({
  code, name: code, description: code, group_key: group, sort_order: sort, manual, target, current, earned_at: earned ? "2026-10-01T00:00:00Z" : null, seen: true,
});

describe("nextBadges", () => {
  it("shows only the next badge of a chain", () => {
    const all = [b("day-one-closer", "penjualan", 10, 1, 1, true), b("squad-goals", "penjualan", 20, 5, 3), b("full-house", "penjualan", 30, 10, 3), b("tour-bus-tycoon", "penjualan", 40, 25, 3)];
    expect(nextBadges(all).map((x) => x.code)).toEqual(["squad-goals"]);
  });

  it("puts the closest to done first, then keeps the catalogue order", () => {
    const all = [b("wallet-ready", "persiapan", 40, 1, 0), b("squad-goals", "penjualan", 20, 5, 4), b("golden-ticket", "persiapan", 30, 1, 0)];
    expect(nextBadges(all).map((x) => x.code)).toEqual(["squad-goals", "golden-ticket", "wallet-ready"]);
  });

  it("leaves out earned and admin-given badges, and respects the limit", () => {
    const all = [b("class-act", "jaringan", 50, 1, 0, false, true), b("paperwork-wizard", "persiapan", 10, 1, 1, true), b("wallet-ready", "persiapan", 40, 1, 0), b("golden-ticket", "persiapan", 30, 1, 0)];
    expect(nextBadges(all, 1).map((x) => x.code)).toEqual(["golden-ticket"]);
  });
});
