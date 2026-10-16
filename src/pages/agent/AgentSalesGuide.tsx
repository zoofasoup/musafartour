import { useState, type ReactNode } from "react";
import { ChevronRight, Copy } from "lucide-react";
import { AgentPage, AgentPanel } from "@/components/agent/AgentPage";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { USD_KURS } from "@/lib/calcConfig";
import { CHILD_PRICE, INFANT_PRICE } from "@/lib/roomCombos";
import { COMMISSION_PAYOUT_TEXT } from "@/lib/sopAgen";
import { agentCsWhatsAppUrl } from "@/lib/agentSupport";
import { copyText } from "@/lib/copy";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { useHomepageData } from "@/hooks/useHomepageData";
import { usePublishedPackages } from "@/hooks/usePackages";
import { COMPANY_FOUNDED, COMPANY_JAMAAH, PPIU_NUMBER } from "@/lib/company";

const fmt = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;

const TIER_FALLBACK = [
  { tier: "Hemat", price: 28_900_000, position: "Hotel bintang 3, untuk jamaah yang paling mengutamakan harga." },
  { tier: "Nyaman (Best Seller)", price: 33_400_000, position: "Paling laris: harga dan jarak hotel ke masjid seimbang." },
  { tier: "Pelataran (Hemat)", price: 33_900_000, position: "Hotel sangat dekat dengan pelataran masjid, harga terjangkau." },
  { tier: "Five Star", price: 41_400_000, position: "Hotel bintang 5, jarak terdekat, fasilitas paling premium." },
];

const GLOSSARY = [
  { term: "Ihram", def: "Pakaian dan niat suci sebelum memasuki miqat: dua lembar kain putih tanpa jahitan untuk laki-laki." },
  { term: "Miqat", def: "Batas wilayah tempat jamaah wajib mulai berihram sebelum memasuki tanah suci." },
  { term: "Tawaf", def: "Mengelilingi Ka'bah 7 kali sebagai bagian dari rangkaian ibadah umroh." },
  { term: "Sa'i", def: "Berjalan atau berlari kecil 7 kali antara bukit Shafa dan Marwah." },
  { term: "Manasik", def: "Bimbingan tata cara ibadah umroh sebelum keberangkatan." },
  { term: "Muthowwif", def: "Pembimbing ibadah yang mendampingi jamaah selama di tanah suci." },
  { term: "Talbiyah", def: "Kalimat yang diucapkan berulang selama ihram: \"Labbaik Allahumma labbaik...\"" },
  { term: "Dam", def: "Denda (biasanya menyembelih hewan) karena melanggar larangan ihram." },
];

const PERLENGKAPAN = [
  "Ransel", "Koper 24 inch", "Buku panduan umroh dan notebook", "Syal",
  "Kain ihram (laki-laki)", "Baju koko (laki-laki)", "Abaya (perempuan)",
  "Mukena (perempuan)", "Kaos ikhwan", "Strap ID card", "Tumbler",
];

const SCRIPTS = [
  {
    title: "Kenapa penerbangannya transit?",
    content:
      "Baik Bapak/Ibu, untuk paket ini penerbangannya transit sebentar sebelum lanjut ke Jeddah atau Madinah 🙏\n\nTransit ini yang membuat harga tiketnya lebih terjangkau dibanding penerbangan langsung, tapi maskapainya tetap maskapai besar dan terpercaya.\n\nKalau Bapak/Ibu lebih nyaman dengan penerbangan langsung, kami juga punya paket direct flight. Mau saya bandingkan harganya?",
  },
  {
    title: "Kenapa ada beberapa tingkatan harga?",
    content:
      "Perbedaan tier itu utamanya di kelas hotel dan jarak ke masjid 🙏\n\nPaket Hemat hotelnya bintang 3, Nyaman atau Best Seller sudah lebih dekat, dan Five Star hotel bintang 5 yang jaraknya paling dekat dengan fasilitas terbaik.\n\nIbadahnya sama, bedanya di kenyamanan menginap. Mau saya bantu pilihkan sesuai budget dan kebutuhan Bapak/Ibu?",
  },
  {
    title: "Bagaimana kalau mau batal atau reschedule?",
    content:
      "Terima kasih sudah bertanya, Bapak/Ibu 🙏\n\nDP Rp 5.000.000 tidak dapat dikembalikan, dan pendaftaran tidak bisa dibatalkan atau digantikan setelah 5 hari kerja. Pengembalian maksimal 90 hari kerja: 6 minggu sebelum berangkat 50 % dari harga paket, 3 minggu sebelum 25 %, 2 minggu sebelum 0 %. Untuk reschedule, saya koordinasikan dengan tim kami dan kabari secepatnya.\n\nBoleh saya tahu dulu alasannya? Supaya saya bisa bantu carikan solusi terbaik.",
  },
  {
    title: "Kompetitor lebih murah",
    content:
      "Terima kasih sudah cek-cek harga ya, Bapak/Ibu, itu wajar sekali 🙏\n\nBoleh saya tahu paket pembandingnya apa saja yang termasuk? Sering kali harga murah belum termasuk sesuatu, misalnya handling, perlengkapan, atau hotelnya lebih jauh dari masjid.\n\nDi Musafar Tour, harga yang tertera sudah all-in dan kami berizin resmi PPIU Kemenag, jadi tidak ada biaya tambahan mendadak. Mau saya bandingkan detailnya?",
  },
];

type Script = (typeof SCRIPTS)[number];
type Topic = { id: string; title: string; hint: string; group: string; body: ReactNode };

const Bullets = ({ items }: { items: ReactNode[] }) => (
  <ul className="space-y-3">
    {items.map((x, i) => (
      <li key={i} className="flex gap-3 text-[16px] leading-[1.5] text-pkg-fg">
        <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-pkg-red" aria-hidden />
        <span className="min-w-0">{x}</span>
      </li>
    ))}
  </ul>
);

const Note = ({ children, name, code }: { children: ReactNode; name: string; code: string }) => (
  <p className="mt-6 rounded-[20px] bg-pkg-cream-2 p-4 text-[15px] leading-[1.5] text-pkg-fg-2">
    {children}{" "}
    <a href={agentCsWhatsAppUrl(name, code)} target="_blank" rel="noopener noreferrer" className="font-medium text-pkg-red-deep underline underline-offset-4">Tanya PIC Agen</a>
  </p>
);

function Sheet({ title, hint, onClose, children }: { title: string; hint: string; onClose: () => void; children: ReactNode }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{hint}</DialogDescription>
        </DialogHeader>
        <div className="pkg-v2 min-w-0 !bg-transparent">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

const rowCls = "pkg-press flex min-h-14 w-full items-center gap-3 border-b border-pkg-hair py-3 text-left last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2";

const AgentSalesGuide = () => {
  const { agent } = useAgentAuth();
  const { websiteSettings } = useHomepageData();
  const [open, setOpen] = useState<Topic | null>(null);
  const [script, setScript] = useState<Script | null>(null);
  const { data: packages } = usePublishedPackages();

  // "Mulai dari" per tier: the lowest quad price among the packages on sale now; the old reference price only when none is.
  const tiers = TIER_FALLBACK.map((t) => {
    const field = { Hemat: "hemat_package_price", "Nyaman (Best Seller)": "package_price", "Pelataran (Hemat)": "pelataran_package_price", "Five Star": "five_star_package_price" }[t.tier] as
      | "hemat_package_price" | "package_price" | "pelataran_package_price" | "five_star_package_price";
    const prices = (packages ?? []).map((p) => p[field]?.quad ?? 0).filter((n) => n > 0);
    return { ...t, price: prices.length ? Math.min(...prices) : t.price, live: prices.length > 0 };
  });

  const ppiuNumber = websiteSettings?.ppiu_license_number || PPIU_NUMBER;
  const companyName = websiteSettings?.company_legal_name || "PT Musa Amanah Wisata";
  const bankNames = websiteSettings?.bank_names?.length ? websiteSettings.bank_names.join(", ") : "BCA, BSI, BNI";
  const officeAddress = websiteSettings?.address || "Commercial Park Harapan Indah, Ruko Emerald Blok EB1 No.28, Medan Satria, Kota Bekasi, Jawa Barat 17131";
  const officePhone = websiteSettings?.phone_number || "021-38312137";
  const name = agent?.name ?? "";
  const code = agent?.referral_code ?? "";

  const topics: Topic[] = [
    {
      id: "legalitas", group: "Meyakinkan calon jamaah", title: "Legalitas dan kredibilitas", hint: "Izin, rekening resmi, kantor",
      body: (
        <Bullets
          items={[
            <>Izin resmi <strong>PPIU Kemenag No. {ppiuNumber}</strong>, atas nama <strong>{companyName}</strong>.</>,
            <>Berdiri sejak <strong>{COMPANY_FOUNDED}</strong>, sudah memberangkatkan <strong>{COMPANY_JAMAAH} jamaah</strong>.</>,
            <>Rekening resmi hanya {bankNames} a.n. {companyName}. <strong>Jangan pernah</strong> minta jamaah transfer ke rekening pribadi.</>,
            <>Kantor: {officeAddress}, {officePhone}.</>,
            <>Harga sudah <strong>all-in</strong> dan tiket confirmed di awal, tanpa biaya tersembunyi.</>,
            <>Kereta Cepat Haramain (Madinah-Makkah) ada di sebagian besar paket.</>,
            <>Akses Lounge Eksklusif di Bandara Soekarno-Hatta.</>,
          ]}
        />
      ),
    },
    {
      id: "perjalanan", group: "Meyakinkan calon jamaah", title: "Gambaran perjalanan", hint: "Cerita singkat untuk calon jamaah",
      body: (
        <>
          <Bullets
            items={[
              "Sebagian besar paket terbang langsung ke Madinah. Check-in dibantu tim handling.",
              "Di Madinah: khusyuk di Raudhah, ziarah ke Masjid Quba dan Jabal Uhud.",
              "Ke Makkah naik Kereta Cepat Haramain, tanpa lelah di jalan.",
              "Di Makkah: puncak ibadah umroh dan city tour. Sebagian paket ada wisata sejarah ke Thaif.",
              "Ditutup dengan Tawaf Wada sebelum pulang, InsyaAllah membawa predikat Mabrur.",
            ]}
          />
          <p className="mt-6 text-[14px] text-pkg-fg-3">Durasi tiap paket berbeda (9 sampai 12 hari lebih). Itinerary rinci ada di halaman detail paket.</p>
        </>
      ),
    },
    {
      id: "keberatan", group: "Meyakinkan calon jamaah", title: "Jawaban untuk keberatan", hint: "Pesan siap salin",
      body: (
        <ul>
          {SCRIPTS.map((s) => (
            <li key={s.title}>
              <button type="button" data-plain onClick={() => { setOpen(null); setScript(s); }} className={`${rowCls} text-[17px] text-pkg-fg`}>
                <span className="flex-1">{s.title}</span>
                <ChevronRight className="h-5 w-5 text-pkg-fg-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "pembayaran", group: "Harga dan pembayaran", title: "Pembayaran dan pendaftaran", hint: "DP, cicilan, komisi, pembatalan",
      body: (
        <>
          <Bullets
            items={[
              <>DP <strong>{fmt(5_000_000)} per orang</strong> untuk booking seat, <strong>tidak dapat dikembalikan</strong>.</>,
              <>Pelunasan maksimal <strong>H-30</strong> sebelum berangkat.</>,
              <>Cicilan <strong>bebas</strong>: kapan saja, berapa saja, asal lunas H-30. Transfer hanya ke rekening {companyName}.</>,
              <>{COMMISSION_PAYOUT_TEXT} Besarnya mengikuti level dan paket.</>,
              <>Harga memakai kurs USD {fmt(USD_KURS)}. Harga final dikonfirmasi saat pendaftaran.</>,
              <>Harga dan program bisa berubah mengikuti kebijakan pemerintah, hotel, dan maskapai. Sampaikan ini di awal.</>,
              <>Jamaah bisa <strong>upgrade kamar atau kelas penerbangan</strong> di luar harga paket. Tawarkan kalau relevan.</>,
              <>Tanpa teman sekamar sesuai tipe (quad, triple, double), ada penyesuaian biaya lewat musyawarah.</>,
            ]}
          />
          <p className="mt-6 text-[15px] leading-[1.5] text-pkg-fg-2">
            Pembatalan: DP tidak kembali, dan tidak bisa dibatalkan atau digantikan setelah 5 hari kerja. Pengembalian 50 % (6 minggu sebelum berangkat), 25 % (3 minggu), 0 % (2 minggu). Rinciannya ada di halaman Syarat Umroh.
          </p>
          <Note name={name} code={code}>Aturan reschedule belum ditetapkan. Jangan janjikan apa pun.</Note>
        </>
      ),
    },
    {
      id: "tier", group: "Harga dan pembayaran", title: "Perbandingan paket", hint: "Hemat sampai Five Star",
      body: (
        <>
          <ul>
            {tiers.map((t) => (
              <li key={t.tier} className="border-b border-pkg-hair py-4 last:border-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[18px] text-pkg-fg">{t.tier}</p>
                  <p className="shrink-0 text-[15px] tabular-nums text-pkg-fg-2">{fmt(t.price)}</p>
                </div>
                <p className="mt-1 text-[14px] leading-snug text-pkg-fg-3">{t.position}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[14px] text-pkg-fg-3">Harga mulai dari paket yang sedang dijual. Angka pasti per keberangkatan ada di halaman paket.</p>
        </>
      ),
    },
    {
      id: "termasuk", group: "Harga dan pembayaran", title: "Termasuk dan tidak termasuk", hint: "Standar tiap paket",
      body: (
        <>
          <p className="pkg-label text-pkg-ok">Termasuk</p>
          <p className="mt-2 text-[16px] leading-[1.5] text-pkg-fg">Tiket PP, visa, hotel fullboard, makan 3 kali sehari, handling, manasik, city tour, transportasi, tour leader, muthowwif, perlengkapan, transmitter, Al Baik, air zam-zam 5 liter.</p>
          <p className="pkg-label mt-6 text-pkg-red-deep">Tidak termasuk</p>
          <p className="mt-2 text-[16px] leading-[1.5] text-pkg-fg">Pembuatan paspor, vaksin meningitis dan polio (wajib, biaya sendiri), tiket PP dari daerah asal (jika bukan dari Jakarta), kelebihan bagasi, pengeluaran pribadi, biaya kirim perlengkapan.</p>
          <p className="mt-6 text-[14px] text-pkg-fg-3">Tiap paket bisa punya daftar sendiri. Cek halaman detail paket.</p>
        </>
      ),
    },
    {
      id: "anak", group: "Harga dan pembayaran", title: "Harga anak dan infant", hint: "Sharing bed dan tanpa bed",
      body: (
        <ul>
          <li className="flex items-baseline justify-between gap-3 border-b border-pkg-hair py-4"><span className="text-[16px] text-pkg-fg">Anak (sharing bed dengan orang tua)</span><span className="shrink-0 tabular-nums text-pkg-fg-2">{fmt(CHILD_PRICE)}</span></li>
          <li className="flex items-baseline justify-between gap-3 py-4"><span className="text-[16px] text-pkg-fg">Infant (tanpa bed dan perlengkapan)</span><span className="shrink-0 tabular-nums text-pkg-fg-2">{fmt(INFANT_PRICE)}</span></li>
        </ul>
      ),
    },
    {
      id: "dokumen", group: "Persiapan jamaah", title: "Dokumen dan kesehatan", hint: "Paspor, vaksin, berkas",
      body: (
        <>
          <Bullets
            items={[
              <>Paspor asli, <strong>berlaku minimal 1 tahun</strong> dari tanggal berangkat, nama minimal <strong>2 suku kata</strong> (nama 1 kata ditambah dulu di Disdukcapil).</>,
              "Pasfoto 4x6 sebanyak 2 lembar (boleh softcopy).",
              "KTP asli.",
              "Fotokopi surat nikah, bagi suami istri yang berangkat bersama.",
              "Fotokopi Kartu Keluarga, bagi anak yang berangkat bersama orang tua.",
              <>Vaksin <strong>meningitis dan polio wajib</strong>, diurus dan dibiayai sendiri.</>,
            ]}
          />
          <Note name={name} code={code}>Aturan mahram untuk jamaah wanita dan batas usia belum ditetapkan. Jangan menjawab dengan pasti.</Note>
        </>
      ),
    },
    {
      id: "perlengkapan", group: "Persiapan jamaah", title: "Perlengkapan jamaah", hint: "Yang didapat jamaah",
      body: (
        <>
          <ul>
            {PERLENGKAPAN.map((item) => (
              <li key={item} className="border-b border-pkg-hair py-3 text-[16px] text-pkg-fg last:border-0">{item}</li>
            ))}
          </ul>
          <p className="mt-4 text-[14px] text-pkg-fg-3">Sudah termasuk dalam paket.</p>
        </>
      ),
    },
    {
      id: "kamus", group: "Persiapan jamaah", title: "Kamus istilah", hint: "Ihram, miqat, tawaf, dan lainnya",
      body: (
        <dl>
          {GLOSSARY.map((g) => (
            <div key={g.term} className="border-b border-pkg-hair py-4 last:border-0">
              <dt className="text-[18px] text-pkg-fg">{g.term}</dt>
              <dd className="mt-1 text-[15px] leading-snug text-pkg-fg-2">{g.def}</dd>
            </div>
          ))}
        </dl>
      ),
    },
  ];

  const groups = ["Meyakinkan calon jamaah", "Harga dan pembayaran", "Persiapan jamaah"];

  return (
    <>
      <AgentPage title="Panduan">
        <AgentPanel last>
          {groups.map((g, i) => (
            <section key={g} className={i ? "mt-10" : ""}>
              <h2 className="pkg-label text-pkg-fg-3">{g}</h2>
              <ul className="mt-2">
                {topics.filter((t) => t.group === g).map((t) => (
                  <li key={t.id}>
                    <button type="button" data-plain onClick={() => setOpen(t)} className={`${rowCls} min-h-16`}>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[18px] leading-tight text-pkg-fg">{t.title}</span>
                        <span className="mt-0.5 block text-[14px] text-pkg-fg-3">{t.hint}</span>
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-pkg-fg-3" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </AgentPanel>
      </AgentPage>

      {open && <Sheet title={open.title} hint={open.hint} onClose={() => setOpen(null)}>{open.body}</Sheet>}
      {script && (
        <Sheet title={script.title} hint="Pesan siap salin" onClose={() => setScript(null)}>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-[20px] bg-pkg-cream-2 p-4 font-sans text-[15px] leading-[1.5] text-pkg-fg">{script.content}</pre>
          <button type="button" data-plain onClick={() => void copyText(script.content, "Pesan disalin.")} className="pkg-press pkg-glass-red pkg-label mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2">
            <Copy className="h-4 w-4" aria-hidden /> Salin pesan
          </button>
        </Sheet>
      )}
    </>
  );
};

export default AgentSalesGuide;
