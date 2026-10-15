import { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface Place {
  village: string;
  district: string;
  regency: string;
  province: string;
  code: string;
}

interface Index {
  rows: Place[];
  hay: string[];
}

let cache: Promise<Index> | null = null;

/** The whole list (about 84 thousand villages, ~570 KB compressed) is fetched once, only when someone starts typing. */
export function loadIndex(): Promise<Index> {
  cache ??= fetch("/data/wilayah.json")
    .then((r) => {
      if (!r.ok) throw new Error("wilayah");
      return r.json() as Promise<{ p: string[]; r: [string, number][]; d: [string, number][]; v: [string, number, number][] }>;
    })
    .then(({ p, r, d, v }) => {
      const rows: Place[] = v.map(([village, di, code]) => {
        const [district, ri] = d[di];
        const [regency, pi] = r[ri];
        return { village, district, regency, province: p[pi], code: String(code) };
      });
      const hay = rows.map((x) => `${x.village} ${x.district} ${x.regency} ${x.province}`.toLowerCase());
      return { rows, hay };
    })
    .catch((e) => {
      cache = null; // let the next try download again
      throw e;
    });
  return cache;
}

export function search(index: Index, q: string): Place[] {
  const query = q.trim().toLowerCase();
  if (/^\d+$/.test(query)) {
    if (query.length < 3) return [];
    const out: Place[] = [];
    for (const row of index.rows) {
      if (row.code.startsWith(query)) out.push(row);
      if (out.length >= 12) break;
    }
    return out;
  }
  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.join("").length < 3) return [];
  const hits: { row: Place; score: number }[] = [];
  for (let i = 0; i < index.rows.length; i++) {
    const h = index.hay[i];
    if (!tokens.every((t) => h.includes(t))) continue;
    const row = index.rows[i];
    const v = row.village.toLowerCase();
    hits.push({ row, score: v.startsWith(tokens[0]) ? 0 : v.includes(tokens[0]) ? 1 : 2 });
    if (hits.length >= 400) break;
  }
  hits.sort((a, b) => a.score - b.score || a.row.village.length - b.row.village.length);
  return hits.slice(0, 12).map((h) => h.row);
}

/**
 * One field for the whole region: type a village (kelurahan/desa) or a postal code, pick a match, and the district,
 * city/regency, province and postal code come with it.
 */
export function VillageSearch({ onSelect }: { onSelect: (place: Place) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Place[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "failed">("idle");
  const [active, setActive] = useState(-1);
  const indexRef = useRef<Index | null>(null);
  const listId = useId();

  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        if (!indexRef.current) {
          setStatus("loading");
          indexRef.current = await loadIndex();
        }
        if (cancelled) return;
        setStatus("idle");
        setResults(search(indexRef.current, term));
        setActive(-1);
      } catch {
        if (!cancelled) setStatus("failed");
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q]);

  const choose = (place: Place) => {
    setOpen(false);
    setQ("");
    onSelect(place);
  };

  const showList = open && q.trim().length >= 3;

  return (
    <div className="relative">
      <Input
        id="village-search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        inputMode="search"
        placeholder="Cari kelurahan atau kode pos"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!showList || results.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(results.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            choose(results[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-[20px] bg-pkg-white p-1.5 shadow-[0_18px_40px_-14px_rgb(26_21_18/0.45)]"
        >
          {status === "loading" && (
            <li className="flex items-center gap-2 px-4 py-3 text-[15px] text-pkg-fg-3"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Memuat daftar wilayah...</li>
          )}
          {status === "failed" && <li className="px-4 py-3 text-[15px] text-pkg-red-deep">Daftar wilayah belum bisa dimuat. Coba lagi, atau isi manual.</li>}
          {status === "idle" && results.length === 0 && <li className="px-4 py-3 text-[15px] text-pkg-fg-3">Tidak ketemu. Coba ejaan lain, atau isi manual.</li>}
          {results.map((r, i) => (
            <li key={`${r.code}-${r.village}-${r.district}-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                data-plain
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(r)}
                className={`flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left ${i === active ? "bg-pkg-cream-2" : "hover:bg-pkg-cream-2"}`}
              >
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-pkg-fg-3" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[16px] leading-tight text-pkg-fg">{r.village} <span className="text-pkg-fg-3">{r.code}</span></span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-pkg-fg-3">Kec. {r.district}, {r.regency}, {r.province}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const letters = (v: string) => v.toLowerCase().replace(/[^a-z]/g, "");

/** Finds the one village that matches what an ID card says (village and district, optionally the regency). */
export function findPlace(index: Index, village: string, district: string, regency?: string): Place | null {
  if (letters(village).length < 3) return null;
  const hits = search(index, `${village} ${district}`.trim());
  return (
    hits.find((h) => letters(h.village) === letters(village) && letters(h.district) === letters(district)) ??
    hits.find((h) => letters(h.village) === letters(village) && (!regency || letters(h.regency).includes(letters(regency)) || letters(regency).includes(letters(h.regency)))) ??
    null
  );
}

// ---- Manual mode: every region field suggests from the same list while still accepting free text ----

export interface Suggestion {
  key: string;
  label: string;
  sub?: string;
  place: Partial<Place>;
}

interface Lookups {
  districts: { district: string; regency: string; province: string }[];
  regencies: { regency: string; province: string }[];
  provinces: string[];
}
const lookupCache = new WeakMap<Index, Lookups>();

function lookups(index: Index): Lookups {
  let l = lookupCache.get(index);
  if (l) return l;
  const d = new Map<string, { district: string; regency: string; province: string }>();
  const r = new Map<string, { regency: string; province: string }>();
  const p = new Set<string>();
  for (const row of index.rows) {
    d.set(`${row.district}|${row.regency}|${row.province}`, { district: row.district, regency: row.regency, province: row.province });
    r.set(`${row.regency}|${row.province}`, { regency: row.regency, province: row.province });
    p.add(row.province);
  }
  l = { districts: [...d.values()], regencies: [...r.values()], provinces: [...p].sort() };
  lookupCache.set(index, l);
  return l;
}

const has = (hay: string, q: string) => hay.toLowerCase().includes(q.toLowerCase());
const near = (a: string | undefined, b: string) => !a || letters(a) === letters(b);

type Context = { district?: string; regency?: string; province?: string };

export async function suggest(field: "village" | "district" | "city" | "province", q: string, ctx: Context): Promise<Suggestion[]> {
  const term = q.trim();
  if (term.length < (field === "village" ? 3 : 2)) return [];
  const index = await loadIndex();
  if (field === "village") {
    return search(index, term).map((r, i) => ({ key: `${r.code}${r.village}${i}`, label: r.village, sub: `Kec. ${r.district}, ${r.regency}, ${r.province} ${r.code}`, place: r }));
  }
  const l = lookups(index);
  if (field === "district") {
    return l.districts
      .filter((x) => has(x.district, term) && near(ctx.province, x.province) && (!ctx.regency || letters(x.regency).includes(letters(ctx.regency)) || letters(ctx.regency).includes(letters(x.regency))))
      .slice(0, 12)
      .map((x) => ({ key: `${x.district}${x.regency}`, label: x.district, sub: `${x.regency}, ${x.province}`, place: x }));
  }
  if (field === "city") {
    return l.regencies
      .filter((x) => has(x.regency, term) && near(ctx.province, x.province))
      .slice(0, 12)
      .map((x) => ({ key: `${x.regency}${x.province}`, label: x.regency, sub: x.province, place: x }));
  }
  return l.provinces.filter((x) => has(x, term)).slice(0, 12).map((x) => ({ key: x, label: x, place: { province: x } }));
}

/** A text field that suggests while typing (from the region list) but keeps whatever is typed if nothing is picked. */
export function SuggestField({
  id,
  value,
  onChange,
  onPick,
  field,
  context,
  inputMode,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onPick: (s: Suggestion) => void;
  field: "village" | "district" | "city" | "province";
  context: Context;
  inputMode?: "text" | "numeric";
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const typed = useRef(false);
  const listId = useId();

  useEffect(() => {
    if (!typed.current) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      setBusy(true);
      try {
        const r = await suggest(field, value, context);
        if (!cancelled) setItems(r);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 160);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, field]);

  const show = open && items.length > 0;
  return (
    <div className="relative">
      <Input
        id={id}
        name={id}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        inputMode={inputMode}
        value={value}
        onChange={(e) => {
          typed.current = true;
          onChange(e.target.value);
          setOpen(true);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
      />
      {show && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-[20px] bg-pkg-white p-1.5 shadow-[0_18px_40px_-14px_rgb(26_21_18/0.45)]">
          {busy && items.length === 0 && <li className="flex items-center gap-2 px-4 py-3 text-[15px] text-pkg-fg-3"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Memuat...</li>}
          {items.map((s) => (
            <li key={s.key} role="option" aria-selected="false">
              <button
                type="button"
                data-plain
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  typed.current = false;
                  setOpen(false);
                  setItems([]);
                  onPick(s);
                }}
                className="flex w-full flex-col rounded-2xl px-3 py-2.5 text-left hover:bg-pkg-cream-2"
              >
                <span className="text-[16px] leading-tight text-pkg-fg">{s.label}</span>
                {s.sub && <span className="mt-0.5 text-[13px] leading-snug text-pkg-fg-3">{s.sub}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
