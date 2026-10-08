/** Building blocks for the full SOP/AGEN/001 text. Plain data, rendered by src/pages/SopAgen.tsx. */
export type SopBlock =
  /** Paragraph. **double asterisks** mark bold, as in the signed document. */
  | { t: "p"; text: string }
  /** Small heading inside a section. Give it an id to list it in the table of contents. */
  | { t: "h"; text: string; id?: string }
  | { t: "ul"; items: readonly string[] }
  | { t: "ol"; items: readonly string[] }
  /** Checklist (the document uses empty boxes). */
  | { t: "check"; items: readonly string[]; done?: boolean }
  | { t: "table"; head: readonly string[]; rows: readonly (readonly string[])[] }
  /** Vertical flow of steps. */
  | { t: "flow"; steps: readonly string[] }
  /** Highlighted notice that is NOT part of the signed text (owner/fee letters). */
  | { t: "notice"; text: string }
  /** Blank fill-in lines (agent statement form). */
  | { t: "fields"; labels: readonly string[] }
  | { t: "signatures" };

export type SopSection = {
  id: string;
  /** Number as printed in the document (1 to 25). */
  num: number;
  title: string;
  blocks: readonly SopBlock[];
};

/** Shown in section 4e and section 10: the signed amounts are superseded for specific departures. */
export const SOP_FEE_LETTER_NOTICE =
  "Besaran komisi untuk keberangkatan tertentu mengikuti surat pemberitahuan fee dari Direktur Utama (Nomor 035/036/037/MSFR/IX/2026) dan dapat berbeda dari contoh di bawah. Besaran yang berlaku untuk tingkatmu tampil di portal agen.";
