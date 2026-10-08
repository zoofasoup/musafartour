import { PT_ACCOUNT_HOLDER, PT_ACCOUNTS } from "@/lib/jamaah";
import type { SopSection } from "@/lib/sopAgenTypes";
import { SOP_SECTIONS_A } from "@/lib/sopAgenTextA";
import { SOP_SECTIONS_B } from "@/lib/sopAgenTextB";
import { SOP_SECTIONS_C } from "@/lib/sopAgenTextC";
import { SOP_SECTIONS_D } from "@/lib/sopAgenTextD";

/**
 * SOP Program Agen Musafar (SOP/AGEN/001, versi 01), as shown on /sop-agen and summarised on /jadi-agen and in the
 * agent portal. One typed source so the pages never disagree with the document.
 *
 * The full text of the signed document is in sopAgenText[A-D].ts (rendered by /sop-agen). Commission AMOUNTS stay
 * out of the other screens: for departures Nov 2026 - Mar 2027 they follow fee letters 035/036/037/MSFR/IX/2026, so
 * screens say "dikonfirmasi PIC Agen" or show the amount from the portal instead of printing a number.
 */

/** Stored in agents.sop_version when an agent accepts the SOP (see accept_agent_sop). */
export const SOP_VERSION = "SOP/AGEN/001-v01";
export const SOP_DOCUMENT = {
  number: "SOP/AGEN/001",
  version: "01",
  effective: "29 Agustus 2026",
  signedPlace: "Bekasi",
  signedDate: "18 Agustus 2026",
  signers: [
    { name: "Nurul Harvirna", role: "PIC Agen Musafar" },
    { name: "Muhammad Aqlus Salim", role: "Direktur Utama" },
  ],
} as const;

/** Registration fee: once for life. */
export const AGENT_REGISTRATION_FEE = 1_500_000;
export const AGENT_PIC_NAME = "Nurul Harvirna";
export const AGENT_PIC_ROLE = "PIC Agen Musafar";

/** Where the registration fee goes: the PT accounts in src/lib/jamaah.ts (they match the SOP). */
export const AGENT_FEE_ACCOUNTS = PT_ACCOUNTS;
export const AGENT_FEE_ACCOUNT_HOLDER = PT_ACCOUNT_HOLDER;

/** What the registration fee includes. */
export const AGENT_FEE_INCLUDES = [
  "Welcome kit: rompi, tumbler, ID card, dan buku panduan",
  "Perlengkapan: koper, ihram, mukena, koko, abaya, dan tumbler",
  "Marketing kit",
  "Grup WhatsApp agen",
  "Pelatihan sales gratis",
  "Sertifikat Agen Resmi",
] as const;

/** Levels count jamaah per YEAR. There is no Bronze. */
export const AGENT_LEVEL_RULES = [
  { key: "duta", label: "Duta Musafar", range: "Setelah registrasi" },
  { key: "silver", label: "Silver", range: "1 sampai 15 jamaah per tahun" },
  { key: "gold", label: "Gold", range: "15 sampai 30 jamaah per tahun" },
  { key: "platinum", label: "Platinum", range: "Minimal 30 jamaah per tahun" },
] as const;

/** One-line commission statements reused across the site. No rupiah figure. */
export const COMMISSION_PER_LEVEL_TEXT = "Komisi sesuai tingkat dan paket, besarnya dikonfirmasi PIC Agen.";
export const COMMISSION_ESTIMATE_NOTE = "Besaran final mengikuti tingkat dan SOP.";
export const COMMISSION_PAYOUT_TEXT =
  "Komisi dicatat setelah syarat terpenuhi (jamaah lunas, data lengkap, tidak ada pembatalan atau refund) dan dibayarkan hari H sampai H+2 setelah jamaah landing.";
export const WITHDRAWAL_SOP_NOTE = "Pencairan mengikuti jadwal SOP; permintaan ini diproses admin sesuai jadwal.";
export const BONUS_TEXT =
  "Bonus Closing: 5 jamaah Rp500.000, 10 jamaah Rp1.500.000, 40 jamaah motor listrik atau tunai. Bonus hanya berlaku bila agen membawa jamaah secara langsung dan nominal tagihan mengikuti harga resmi Musafar.";

/** Who can register. */
export const AGENT_REQUIREMENTS = [
  "Berusia minimal 17 tahun",
  "Warga Negara Indonesia (WNI)",
  "Memiliki KTP",
  "Memiliki nomor WhatsApp aktif",
  "Memiliki rekening bank aktif",
  "Bersedia mengikuti onboarding",
  "Bukan karyawan Musafar",
  "Bukan dalam kerja sama dengan travel lain",
] as const;

export type { SopBlock, SopSection } from "@/lib/sopAgenTypes";

/** Shown as "Terakhir diperbarui" on /sop-agen: when this page text was last checked against the signed document. */
export const SOP_PAGE_UPDATED = "8 Oktober 2026";

/** The full signed text, all 25 numbered sections in order. Lives in four data files to keep each one small. */
export const SOP_SECTIONS: readonly SopSection[] = [...SOP_SECTIONS_A, ...SOP_SECTIONS_B, ...SOP_SECTIONS_C, ...SOP_SECTIONS_D];
