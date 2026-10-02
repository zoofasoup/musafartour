import { supabase } from "@/integrations/supabase/client";
import type { ImportRow } from "@/lib/jamaahExcel";

/** Rows that can go in: not skipped, no errors, not already registered on the package. */
export const readyRows = (rows: ImportRow[]) => rows.filter((r) => !r.skipped && !r.errors.length && !r.duplicate);

/**
 * Add jamaah and their opening balances to one package in a single all-or-nothing database call
 * (import_jamaah_rows): if any row is refused, nothing from this call is saved.
 */
export async function importRows(packageId: string, rows: ImportRow[]): Promise<number> {
  const payload = readyRows(rows).map((r) => ({
    full_name: r.full_name,
    phone: r.phone,
    room_type: r.room_type,
    list_price: r.list_price,
    paid: r.paid,
    price_note: r.price_note,
    agent_id: r.agent_id,
    referral_note: r.agent_id ? null : r.agent_raw,
    equipment_size: r.equipment_size,
    equipment_taken: r.equipment_taken,
    domicile: r.domicile,
    start_city: r.start_city,
  }));
  if (!payload.length) return 0;
  const { data, error } = await supabase.rpc("import_jamaah_rows", { _package_id: packageId, _rows: payload });
  if (error) throw new Error(error.message);
  return data ?? 0;
}
