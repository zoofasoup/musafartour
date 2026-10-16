import { describe, expect, it } from "vitest";
import { buildPackageTexts, packageReferralLink } from "./marketingText";
import type { PublishedPackage } from "@/hooks/usePackages";

const pkg = {
  id: "p1", slug: "umroh-nyaman", package_name: "Umroh Nyaman", departure_date: "2026-11-05", duration_days: 9, flight: "Saudia", flight_type: "Direct",
  package_price: { quad: 33_000_000, triple: 34_000_000, double: 35_000_000 }, available_tiers: ["nyaman"],
  makkah_hotel_name: "Rua International", makkah_hotel_star: 5, makkah_distance: "300 m",
  madinah_hotel_name: "Movenpick", madinah_hotel_star: 5, madinah_distance: "200 m",
  slots_total: 45, slots_filled: 40,
} as unknown as PublishedPackage;

describe("buildPackageTexts", () => {
  const t = buildPackageTexts(pkg, "AG0011", "https://musafartour.com");

  it("puts the agent's code in the link", () => {
    expect(t.link).toBe("https://musafartour.com/paket-umroh/umroh-nyaman?ref=AG0011");
    expect(packageReferralLink({ id: "p1", slug: null }, "", "https://x.id")).toBe("https://x.id/paket-umroh/p1");
  });

  it("fills package details and leaves nothing in square brackets", () => {
    for (const text of [t.wa_short, t.wa_full, t.instagram]) {
      expect(text).toContain("Umroh Nyaman");
      expect(text).toContain("5 November 2026");
      expect(text).not.toMatch(/\[[^\]]+\]/);
    }
    expect(t.wa_full).toContain("Rua International");
    expect(t.wa_full).toContain("Sisa seat: 5");
    expect(t.instagram).toContain("#umroh2026");
  });

  it("skips the hotel and seat lines when the data is missing", () => {
    const bare = buildPackageTexts({ ...pkg, makkah_hotel_name: null, madinah_hotel_name: null, slots_total: null } as unknown as PublishedPackage, "AG1", "https://x.id");
    expect(bare.wa_full).not.toContain("Hotel:");
    expect(bare.wa_full).not.toContain("Sisa seat");
  });
});
