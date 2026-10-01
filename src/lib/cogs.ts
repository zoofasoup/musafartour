import type { CogsDataV2, ExpenseItem, RoomPricing } from "@/components/admin/cogs/CogsCalculator";

/**
 * COGS (HPP) arithmetic for one package, per room type. Shared by the COGS
 * calculator (which shows every intermediate line) and the finance report
 * (which only needs the final HPP), so both always agree.
 */

const sum = <T extends RoomPricing>(items: T[]): RoomPricing =>
  items.reduce(
    (acc, curr) => ({ double: acc.double + curr.double, triple: acc.triple + curr.triple, quad: acc.quad + curr.quad }),
    { double: 0, triple: 0, quad: 0 }
  );

const map = (p: RoomPricing, fn: (v: number) => number): RoomPricing => ({
  double: fn(p.double),
  triple: fn(p.triple),
  quad: fn(p.quad),
});

const add = (...parts: RoomPricing[]): RoomPricing =>
  parts.reduce((acc, p) => ({ double: acc.double + p.double, triple: acc.triple + p.triple, quad: acc.quad + p.quad }), {
    double: 0,
    triple: 0,
    quad: 0,
  });

export function computeCogs(data: CogsDataV2) {
  // 1. Hotel, entered in SAR per person for the whole stay.
  const totalHotelSar = sum(data.land_arrangement.hotels);
  // 2. SAR -> USD
  const totalHotelUsd = map(totalHotelSar, (sar) => (data.rates.sar_usd > 0 ? sar / data.rates.sar_usd : 0));
  // 3. Handling & visa, entered in USD
  const totalHandlingUsd = sum(data.land_arrangement.handling);
  const totalVisaUsd = sum(data.land_arrangement.visa);
  const totalSaudiUsd = add(totalHotelUsd, totalHandlingUsd, totalVisaUsd);
  const totalSaudiIdr = map(totalSaudiUsd, (usd) => usd * data.rates.usd_idr);

  // Indonesia costs, checked rows only. Siskopatuh (e6) and Asuransi (e7) are
  // excluded as they were in the original sheet logic.
  const sumChecked = (items: ExpenseItem[]) => sum(items.filter((i) => i.checked && i.id !== "e6" && i.id !== "e7"));
  const totalEsensialIdr = sumChecked(data.indo_expenses.esensial);
  const totalAddonsIdr = sumChecked(data.indo_expenses.add_ons);
  const totalIndoIdr = add(totalEsensialIdr, totalAddonsIdr);

  const totalIndoSaudiIdr = add(totalSaudiIdr, totalIndoIdr);
  const totalLainLainIdr = sum(data.lain_lain);
  const finalCogsIdr = add(totalIndoSaudiIdr, totalLainLainIdr);

  const profit: RoomPricing = {
    double: data.pricing.harga_jual.double - finalCogsIdr.double,
    triple: data.pricing.harga_jual.triple - finalCogsIdr.triple,
    quad: data.pricing.harga_jual.quad - finalCogsIdr.quad,
  };

  return {
    totalHotelSar,
    totalHotelUsd,
    totalHandlingUsd,
    totalVisaUsd,
    totalSaudiUsd,
    totalSaudiIdr,
    totalEsensialIdr,
    totalAddonsIdr,
    totalIndoIdr,
    totalIndoSaudiIdr,
    totalLainLainIdr,
    finalCogsIdr,
    profit,
  };
}

/** Final HPP per room type, or null when the package has no saved COGS sheet. */
export function cogsPerRoom(cogsData: unknown): RoomPricing | null {
  const data = cogsData as CogsDataV2 | null;
  if (!data || data.version !== "2.0") return null;
  return computeCogs(data).finalCogsIdr;
}
