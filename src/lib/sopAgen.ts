import { PT_ACCOUNT_HOLDER, PT_ACCOUNTS, rupiah } from "@/lib/jamaah";

/**
 * SOP Program Agen Musafar (SOP/AGEN/001, versi 01), as shown on /sop-agen and summarised on /jadi-agen and in the
 * agent portal. One typed source so the pages never disagree with the document.
 *
 * Commission AMOUNTS are deliberately absent: the owner has not confirmed the per-level, per-package table, so every
 * screen says "dikonfirmasi PIC Agen" instead of printing a number.
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
  { key: "platinum", label: "Platinum", range: "Di atas 30 jamaah per tahun" },
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
] as const;

export type SopSection = {
  id: string;
  title: string;
  /** Short lead paragraph. */
  intro?: string;
  /** Bullet list. */
  items?: readonly string[];
  /** Small labelled groups inside one section. */
  groups?: readonly { title: string; items: readonly string[] }[];
  /** Highlighted note under the section. */
  note?: string;
};

const feeAccounts = PT_ACCOUNTS.map((a) => `${a.code} ${a.number}`).join(", ");

export const SOP_SECTIONS: readonly SopSection[] = [
  {
    id: "tentang-program",
    title: "Tentang program",
    intro:
      "Program Agen Musafar adalah program keagenan resmi PT Musa Amanah Wisata (Musafar Tour). Agen memasarkan produk Musafar, mendampingi calon jamaah, dan menerima komisi sesuai ketentuan di dokumen ini.",
    note: "Dokumen ini adalah SOP/AGEN/001 versi 01. Dengan mendaftar, agen menyatakan sudah membaca, memahami, dan menyetujuinya.",
  },
  {
    id: "siapa-bisa-jadi-agen",
    title: "Siapa bisa jadi agen",
    intro: "Perorangan yang memenuhi syarat di bawah ini dan lolos verifikasi data.",
    items: AGENT_REQUIREMENTS,
  },
  {
    id: "status-agen",
    title: "Status agen",
    items: [
      "Calon Agen: belum boleh bertransaksi atas nama Musafar.",
      "Agen Aktif: sudah terverifikasi, memiliki Agent ID, mengikuti onboarding, dan menyetujui ketentuan.",
      "Nonaktif: tidak ada aktivitas selama 3 bulan atau tidak memenuhi administrasi.",
      "Diberhentikan: karena pelanggaran berat.",
    ],
  },
  {
    id: "tingkat",
    title: "Tingkat agen",
    intro: "Tingkat dihitung dari jumlah jamaah per tahun.",
    items: AGENT_LEVEL_RULES.map((l) => `${l.label}: ${l.range}`),
    note: COMMISSION_PER_LEVEL_TEXT,
  },
  {
    id: "biaya-registrasi",
    title: "Biaya registrasi",
    intro: `Biaya registrasi ${rupiah(AGENT_REGISTRATION_FEE)}, dibayar satu kali seumur hidup. Biaya ini mencakup:`,
    items: AGENT_FEE_INCLUDES,
    note: `Pembayaran hanya ke rekening ${AGENT_FEE_ACCOUNT_HOLDER}: ${feeAccounts}. Kirim bukti transfer ke ${AGENT_PIC_NAME}, ${AGENT_PIC_ROLE}.`,
  },
  {
    id: "hak-dan-kewajiban",
    title: "Hak dan kewajiban agen",
    groups: [
      {
        title: "Hak agen",
        items: [
          "Menjual seluruh produk Musafar",
          "Mendapat komisi untuk setiap jamaah",
          "Mendapat pelatihan gratis",
          "Mendapat materi promosi",
          "Mengikuti gathering agen",
          "Mendapat sertifikat Agen Resmi",
        ],
      },
      {
        title: "Kewajiban agen",
        items: [
          "Menjaga nama baik Musafar",
          "Tidak memberi informasi palsu",
          "Tidak mengubah harga, kecuali ada kesepakatan B2B",
          "Tidak menerima uang jamaah ke rekening pribadi tanpa izin perusahaan",
          "Mengikuti SOP",
          "Aktif mengikuti pembinaan, minimal 6 kali per tahun",
        ],
      },
    ],
  },
  {
    id: "kapan-komisi",
    title: "Kapan komisi diterima",
    intro: "Komisi diterima bila semua syarat ini terpenuhi:",
    items: [
      "Agen aktif",
      "Jamaah adalah lead dari agen yang terdaftar",
      "Agent ID tercatat",
      "Jamaah membayar sesuai ketentuan",
      "Pembayaran diterima dan diverifikasi Musafar",
      "Data jamaah lengkap",
      "Transaksi terverifikasi",
      "Tidak ada pembatalan",
      "Tidak ada refund",
      "Tidak ada sengketa lead",
      "Tidak ada pelanggaran oleh agen",
      "Memenuhi ketentuan minimum komisi",
    ],
    groups: [
      {
        title: "Kapan komisi dibayarkan",
        items: [
          "Komisi dibayarkan pada hari H sampai H+2 setelah jamaah landing di negara tujuan.",
          "Ketentuan tanggal dapat berubah dan akan diinformasikan.",
        ],
      },
    ],
    note: "Jika ada syarat yang belum terpenuhi, komisi berstatus PENDING. Besaran komisi per tingkat dan paket dikonfirmasi PIC Agen.",
  },
  {
    id: "komisi-tidak-berlaku",
    title: "Komisi tidak berlaku bila",
    items: [
      "Lead tidak terdaftar",
      "Transaksi bukan dari agen",
      "Agent ID tidak tercatat",
      "Jamaah membatalkan atau refund",
      "Pembayaran belum memenuhi ketentuan",
      "Transaksi fiktif",
      "Manipulasi data",
      "Pelanggaran harga",
      "Informasi palsu",
      "Sengketa lead tanpa bukti",
      "Di luar prosedur resmi",
      "Pelanggaran SOP",
    ],
    note: "Bila jamaah refund setelah komisi dibayar, komisi dipotong dari komisi berikutnya, dikembalikan oleh agen, atau diselesaikan lewat mekanisme lain yang disepakati.",
  },
  {
    id: "harga",
    title: "Harga",
    intro: "Agen wajib memakai harga resmi Musafar. Agen dilarang:",
    items: [
      "Mengubah harga",
      "Memberi diskon pribadi (bila ada diskon, dikurangi dari fee komisi)",
      "Menjanjikan cashback pribadi",
      "Menambah fasilitas yang tidak tersedia",
      "Mengubah itinerary",
      "Membuat promo sendiri atas nama Musafar",
    ],
  },
  {
    id: "pembayaran-jamaah",
    title: "Pembayaran jamaah",
    items: [
      "Semua pembayaran jamaah lewat rekening resmi Musafar.",
      "Agen tidak boleh menerima pembayaran ke rekening pribadi tanpa persetujuan perusahaan.",
      "Risiko ditanggung oleh agen.",
    ],
  },
  {
    id: "larangan",
    title: "Larangan",
    items: [
      "Mengaku sebagai karyawan",
      "Menjanjikan keberangkatan atau fasilitas di luar ketentuan",
      "Mengubah harga",
      "Membuat promo pribadi",
      "Menerima uang jamaah ke rekening pribadi",
      "Mengambil lead agen lain",
      "Memalsukan data",
      "Membuat transaksi fiktif",
      "Menyebarkan data jamaah",
      "Memakai logo atau nama Musafar di luar program",
      "Merugikan jamaah atau Musafar",
      "Menyerahkan tanggung jawab leads kepada orang lain",
    ],
  },
  {
    id: "sanksi",
    title: "Sanksi",
    items: [
      "Level 1: teguran lisan",
      "Level 2: peringatan tertulis",
      "Level 3: pembekuan agen",
      "Level 4: pemutusan keagenan, untuk penipuan, penyalahgunaan dana jamaah, pemalsuan data, manipulasi transaksi, penyalahgunaan nama Musafar, dan tindakan yang merugikan",
    ],
  },
  {
    id: "penanganan-komplain",
    title: "Penanganan komplain",
    intro: "Alur komplain: jamaah, agen, PIC Musafar, divisi terkait, manajemen.",
    items: [
      "Agen meneruskan komplain jamaah ke PIC.",
      "Agen tidak memutuskan refund, kompensasi, perubahan fasilitas, jadwal, atau itinerary.",
    ],
  },
  {
    id: "ketentuan-penutup",
    title: "Ketentuan penutup",
    intro:
      "Musafar berhak mengubah persyaratan agen, masa perlindungan lead, besaran komisi, sistem bonus, mekanisme pembayaran komisi, produk yang dapat dikomisi, dan ketentuan evaluasi. Perubahan diinformasikan lewat media resmi. Hal yang belum diatur ditentukan oleh manajemen.",
    note: `Dokumen ${SOP_DOCUMENT.number} versi ${SOP_DOCUMENT.version}, berlaku ${SOP_DOCUMENT.effective}. Ditandatangani ${SOP_DOCUMENT.signers[0].name} (${SOP_DOCUMENT.signers[0].role}) dan ${SOP_DOCUMENT.signers[1].name} (${SOP_DOCUMENT.signers[1].role}), ${SOP_DOCUMENT.signedPlace}, ${SOP_DOCUMENT.signedDate}.`,
  },
];
