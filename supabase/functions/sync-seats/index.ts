import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Papa from 'https://esm.sh/papaparse@5.4.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const SPREADSHEET_ID = '11R3Dv7YNJEYj0NLCY-xm4OH2PuZ_T85jsbizPJNQsn0';
const SHEET_NAME = 'ALL PACKAGES_FIX';

function findCol(headers: string[], names: string[]): number {
  const norm = (s: string) => s.toLowerCase().trim();
  for (const name of names) {
    const idx = headers.findIndex((h) => norm(h) === norm(name));
    if (idx !== -1) return idx;
  }
  return -1;
}

// "June 21, 2026" -> "2026-06-21"
function parseSheetDate(v: string): string | null {
  if (!v) return null;
  const d = new Date(v.trim());
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch the sheet as CSV (public, no auth required)
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}&_cb=${Date.now()}`;
    const csvResp = await fetch(csvUrl);
    if (!csvResp.ok) throw new Error(`Failed to fetch sheet: ${csvResp.status}`);
    const csvText = await csvResp.text();

    const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
    const rows = parsed.data;
    if (!rows.length) throw new Error('Sheet returned no rows');

    const headers = rows[0];
    const dateIdx = findCol(headers, ['Berangkat', 'Tanggal Berangkat']);
    const seatIdx = findCol(headers, ['Seat']);
    const sisaIdx = findCol(headers, ['Sisa Seat', 'Seat Sisa']);

    if (dateIdx === -1 || seatIdx === -1 || sisaIdx === -1) {
      throw new Error(`Required columns not found (date=${dateIdx}, seat=${seatIdx}, sisa=${sisaIdx})`);
    }

    // 2. Build departure_date -> {total, remaining} map from the sheet
    const sheetByDate = new Map<string, { total: number; remaining: number }>();
    for (const row of rows.slice(1)) {
      const dateStr = parseSheetDate(row[dateIdx] || '');
      if (!dateStr) continue;
      const total = parseInt(String(row[seatIdx] || '0').replace(/\D/g, ''), 10) || 0;
      const remaining = parseInt(String(row[sisaIdx] || '0').replace(/\D/g, ''), 10) || 0;
      // If the same date appears twice, skip it entirely rather than guess which row is authoritative.
      if (sheetByDate.has(dateStr)) {
        sheetByDate.set(dateStr, { total: -1, remaining: -1 }); // sentinel: ambiguous
      } else {
        sheetByDate.set(dateStr, { total, remaining });
      }
    }

    // 3. Load existing packages
    const { data: packages, error: fetchError } = await supabase
      .from('packages')
      .select('id, departure_date, slots_total, slots_filled');
    if (fetchError) throw fetchError;

    const results = {
      updated: [] as { id: string; departure_date: string; slots_total: number; slots_filled: number }[],
      skipped_no_sheet_row: [] as string[],
      skipped_ambiguous: [] as string[],
      skipped_unchanged: [] as string[],
    };

    for (const pkg of packages || []) {
      const sheetRow = sheetByDate.get(pkg.departure_date);
      if (!sheetRow) {
        results.skipped_no_sheet_row.push(pkg.departure_date);
        continue;
      }
      if (sheetRow.total === -1) {
        results.skipped_ambiguous.push(pkg.departure_date);
        continue;
      }

      const slots_total = sheetRow.total > 0 ? sheetRow.total : pkg.slots_total;
      // Sisa Seat = 0 means fully booked (filled = total), not "no data".
      const slots_filled = slots_total > 0 ? Math.max(0, slots_total - sheetRow.remaining) : 0;

      if (slots_total === pkg.slots_total && slots_filled === pkg.slots_filled) {
        results.skipped_unchanged.push(pkg.departure_date);
        continue;
      }

      const { error: updateError } = await supabase
        .from('packages')
        .update({ slots_total, slots_filled })
        .eq('id', pkg.id);

      if (updateError) throw updateError;
      results.updated.push({ id: pkg.id, departure_date: pkg.departure_date, slots_total, slots_filled });
    }

    return new Response(
      JSON.stringify({ success: true, ...results, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
