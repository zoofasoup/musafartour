export type BadgeGroup = "persiapan" | "penjualan" | "konsistensi" | "jaringan";

export const BADGE_GROUPS: { key: BadgeGroup; label: string }[] = [
  { key: "persiapan", label: "Persiapan" },
  { key: "penjualan", label: "Penjualan dan level" },
  { key: "konsistensi", label: "Konsistensi" },
  { key: "jaringan", label: "Jaringan dan komunitas" },
];

/** One row of public.my_badge_progress(): a badge with the agent's progress and the date earned (null while locked). */
export interface BadgeProgress {
  code: string;
  name: string;
  description: string;
  group_key: BadgeGroup;
  sort_order: number;
  manual: boolean;
  target: number;
  current: number;
  earned_at: string | null;
  /** The agent has seen the reveal of this badge (kept in the database, so once per account). */
  seen: boolean;
}

/** The artwork of a badge: public/badges/<code>.webp. A missing file falls back to an icon in the page. */
export const badgeImage = (code: string) => `/badges/${code}.webp`;

/** Earned in the last 7 days. */
export const isNewBadge = (earnedAt: string | null): boolean => !!earnedAt && Date.now() - new Date(earnedAt).getTime() < 7 * 24 * 3600 * 1000;

/** Badges that build on each other (5, 10, 25 jamaah...). Only the next one of a chain is shown as "next". */
const CHAINS: string[][] = [
  ["day-one-closer", "squad-goals", "full-house", "tour-bus-tycoon"],
  ["gold-rush", "sky-high"],
  ["one-shot", "clean-sweep", "convoy-king"],
  ["warming-up", "on-fire", "never-miss-a-month"],
  ["plus-one", "crew-chief", "whole-village"],
];

const ratio = (b: BadgeProgress) => (b.target > 0 ? b.current / b.target : 0);

/**
 * The badges to chase now: the next of each chain, closest to done first (ties keep the catalogue order, so a new agent
 * sees the setup badges first). Badges handed out by an admin are left out.
 */
export function nextBadges(all: BadgeProgress[], limit = 3): BadgeProgress[] {
  const open = all.filter((b) => !b.earned_at && !b.manual);
  const hidden = new Set<string>();
  for (const chain of CHAINS) {
    const firstOpen = chain.find((c) => open.some((b) => b.code === c));
    chain.forEach((c) => c !== firstOpen && hidden.add(c));
  }
  const groupOrder = ["persiapan", "penjualan", "konsistensi", "jaringan"];
  return open
    .filter((b) => !hidden.has(b.code))
    .sort((a, b) => ratio(b) - ratio(a) || groupOrder.indexOf(a.group_key) - groupOrder.indexOf(b.group_key) || a.sort_order - b.sort_order)
    .slice(0, limit);
}

/** What an agent has to do for a badge, and where to start. `invite` copies the agent's recruiting link instead of opening a page. */
export interface BadgeAction { how: string; label: string; to?: string; invite?: boolean }

const SELL = { how: "Buka paket di Marketing, lalu daftarkan jamaah.", label: "Buka paket", to: "/agent/marketing-kit" };
const INVOICE = { how: "Daftarkan beberapa jamaah sekaligus dalam satu invoice.", label: "Daftarkan jamaah", to: "/agent/daftar-jamaah" };
const MONTHLY = { how: "Usahakan ada minimal 1 jamaah setiap bulan.", label: "Buka Marketing", to: "/agent/marketing-kit" };
const INVITE = { how: "Kirim link ajakan ke calon agen. Agent ID kamu otomatis terisi.", label: "Salin link ajakan", invite: true };

export const BADGE_ACTIONS: Record<string, BadgeAction> = {
  "paperwork-wizard": { how: "Isi KTP, foto KTP, dan alamat domisili.", label: "Lengkapi data", to: "/agent/onboarding" },
  "fine-print-reader": { how: "Baca SOP, lalu centang persetujuanmu.", label: "Setujui SOP", to: "/agent/onboarding/sop" },
  "golden-ticket": { how: "Transfer biaya registrasi, lalu unggah bukti transfernya.", label: "Bayar sekarang", to: "/agent/dashboard" },
  "wallet-ready": { how: "Isi nama bank, nomor rekening, dan nama pemilik rekening.", label: "Atur rekening", to: "/agent/commission?rekening=1" },
  "day-one-closer": SELL, "squad-goals": SELL, "full-house": SELL, "tour-bus-tycoon": SELL,
  "gold-rush": { ...SELL, how: "Capai 15 jamaah dalam satu tahun kalender." },
  "sky-high": { ...SELL, how: "Capai 30 jamaah dalam satu tahun kalender." },
  "one-shot": INVOICE, "clean-sweep": INVOICE, "convoy-king": INVOICE,
  "warming-up": MONTHLY, "on-fire": MONTHLY, "never-miss-a-month": MONTHLY,
  "plus-one": INVITE, "crew-chief": INVITE, "whole-village": INVITE,
  "pay-it-forward": { how: "Bantu agen yang kamu ajak sampai closing pertamanya.", label: "Buka Marketing", to: "/agent/marketing-kit" },
};
