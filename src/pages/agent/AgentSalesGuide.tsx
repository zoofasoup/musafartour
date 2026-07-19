import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Landmark,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Baby,
  BookOpen,
  MessageCircle,
  FileText,
  Backpack,
} from "lucide-react";
import { USD_KURS } from "@/lib/calcConfig";
import { CHILD_PRICE, INFANT_PRICE } from "@/lib/roomCombos";
import { Link } from "react-router-dom";

const fmt = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;

/** Anything not yet defined anywhere in the site's own content - flagged instead of guessed, so an agent never repeats a made-up number to a jamaah. */
function TbdCallout({ children }: { children: React.ReactNode }) {
  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="text-amber-900">{children}</AlertDescription>
    </Alert>
  );
}

const TIER_COMPARISON = [
  { tier: "Hemat", price: 28_900_000, position: "Entry-level - hotel bintang 3, untuk jamaah yang paling mengutamakan harga." },
  { tier: "Nyaman (Best Seller)", price: 33_400_000, position: "Paling laris - keseimbangan harga dan jarak hotel ke masjid." },
  { tier: "Pelataran (Hemat)", price: 33_900_000, position: "Fokus jarak hotel sangat dekat/pelataran masjid dengan harga terjangkau." },
  { tier: "Five Star", price: 41_400_000, position: "Hotel bintang 5, jarak terdekat, fasilitas paling premium." },
];

const GLOSSARY = [
  { term: "Ihram", def: "Pakaian dan niat suci yang dikenakan sebelum memasuki miqat - dua lembar kain putih tanpa jahitan untuk laki-laki." },
  { term: "Miqat", def: "Batas wilayah tempat jamaah wajib mulai berihram sebelum memasuki tanah suci." },
  { term: "Tawaf", def: "Mengelilingi Ka'bah sebanyak 7 kali sebagai bagian dari rangkaian ibadah umroh." },
  { term: "Sa'i", def: "Berjalan/berlari kecil 7 kali antara bukit Shafa dan Marwah." },
  { term: "Manasik", def: "Bimbingan/pelatihan tata cara ibadah umroh yang diberikan sebelum keberangkatan." },
  { term: "Muthowwif", def: "Pembimbing ibadah yang mendampingi jamaah selama di tanah suci (istilah 'tour guide' versi umroh)." },
  { term: "Talbiyah", def: "Kalimat yang diucapkan berulang selama ihram: \"Labbaik Allahumma labbaik...\"" },
  { term: "Dam", def: "Denda/tebusan (biasanya menyembelih hewan) karena melanggar salah satu larangan ihram." },
];

const PERLENGKAPAN = [
  "Ransel", "Koper 24 Inch", "Buku Panduan Umroh & Notebook", "Syal",
  "Kain Ihram (Laki-laki)", "Baju Koko (Laki-laki)", "Abaya (Perempuan)",
  "Mukena (Perempuan)", "Kaos Ikhwan", "Strap ID Card", "Tumbler",
];

const EXTRA_SCRIPTS = [
  {
    title: "Kenapa penerbangannya transit, bukan langsung?",
    content:
      "Baik Bapak/Ibu, untuk paket ini penerbangannya transit sebentar sebelum lanjut ke Jeddah/Madinah 🙏\n\nTransit ini yang membuat harga tiketnya lebih terjangkau dibanding penerbangan langsung, tapi maskapainya tetap maskapai besar dan terpercaya kok.\n\nKalau Bapak/Ibu lebih nyaman dengan penerbangan langsung, kami juga punya paket dengan direct flight - mau saya bandingkan harganya?",
  },
  {
    title: "Kenapa ada beberapa tingkatan harga (tier) paket?",
    content:
      "Jadi gini Bapak/Ibu, perbedaan tier itu utamanya di kelas hotel dan jarak ke masjid 🙏\n\nPaket Hemat itu hotelnya bintang 3, paket Nyaman/Best Seller sudah lebih dekat, dan Five Star itu hotel bintang 5 yang jaraknya paling dekat dengan fasilitas terbaik.\n\nIbadahnya sama saja, bedanya di kenyamanan menginap. Mau saya bantu pilihkan sesuai budget dan kebutuhan Bapak/Ibu?",
  },
  {
    title: "Bagaimana kalau saya ingin membatalkan/reschedule?",
    content:
      "Terima kasih sudah bertanya, Bapak/Ibu 🙏\n\nUntuk pembatalan dan reschedule, kebijakannya kami tangani case-by-case supaya adil untuk semua pihak - saya akan koordinasikan langsung dengan tim kami dan kabari Bapak/Ibu secepatnya.\n\nBoleh saya tahu dulu situasi/alasannya apa? Supaya saya bisa bantu carikan solusi terbaik.",
  },
  {
    title: "Kompetitor menawarkan harga lebih murah",
    content:
      "Terima kasih sudah cek-cek harga ya, Bapak/Ibu, itu wajar sekali 🙏\n\nBoleh saya tahu paket pembandingnya apa saja yang termasuk? Karena sering kali harga murah itu belum termasuk sesuatu (misal handling, perlengkapan, atau hotelnya lebih jauh dari masjid).\n\nDi Musafar Tour, harga yang tertera sudah all-in dan berizin resmi PPIU Kemenag, jadi Bapak/Ibu tidak akan kena biaya tambahan mendadak. Mau saya bandingkan detailnya?",
  },
];

const AgentSalesGuide = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" /> Panduan Penjualan
        </h1>
        <p className="text-muted-foreground">
          Kebijakan, syarat, perbandingan paket, dan script tambahan - semua yang perlu kamu tahu sebelum ngobrol dengan calon jamaah.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> Kredibilitas & Legalitas
          </CardTitle>
          <CardDescription>Fakta yang bisa langsung kamu sebutkan untuk meyakinkan calon jamaah.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Izin resmi <strong>PPIU Kemenag No. 17102200953750002</strong>, atas nama <strong>PT Musa Amanah Wisata</strong>.</p>
          <p className="flex items-start gap-2">
            <Landmark className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            Rekening resmi hanya BCA, BSI, BNI a.n. PT Musa Amanah Wisata - <strong>jangan pernah</strong> minta jamaah transfer ke rekening pribadi.
          </p>
          <p className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            Kantor: Commercial Park Harapan Indah, Ruko Emerald Blok EB1 No.28, Medan Satria, Kota Bekasi, Jawa Barat 17131 · 021-38312137
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pembayaran & Pendaftaran</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="space-y-1.5 list-disc pl-5">
            <li>DP <strong>{fmt(5_000_000)}/pax</strong> untuk booking seat - <strong>non-refundable</strong>.</li>
            <li>Pelunasan maksimal <strong>H-35</strong> sebelum keberangkatan.</li>
            <li>Tersedia cicilan <strong>0% hingga 12 bulan</strong>.</li>
            <li>Harga mengikuti asumsi kurs USD = <strong>{fmt(USD_KURS)}</strong>; harga final dikonfirmasi saat pendaftaran.</li>
            <li>Harga & program bisa berubah sewaktu-waktu mengikuti kebijakan pemerintah Indonesia/Arab Saudi, hotel, dan maskapai - selalu sampaikan ini di awal supaya jamaah tidak kaget.</li>
            <li>Jamaah bisa <strong>upgrade kamar atau kelas penerbangan</strong> di luar harga paket - ini peluang upsell, tawarkan kalau relevan.</li>
            <li>Kalau jamaah tidak punya teman sekamar sesuai tipe yang dipilih (quad/triple/double), ada penyesuaian biaya lewat musyawarah - bukan biaya sepihak dari kami.</li>
          </ul>
          <TbdCallout>
            Kebijakan refund setelah DP (di luar DP yang memang non-refundable) dan reschedule belum didokumentasikan lengkap. Jangan janjikan persentase atau nominal apa pun ke jamaah - selalu eskalasi ke supervisor dulu.
          </TbdCallout>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Perbandingan Tier Paket</CardTitle>
          <CardDescription>Harga di bawah ini referensi indikatif dari kalkulator - harga dan hotel aktual bisa berbeda per jadwal keberangkatan, cek halaman paket untuk angka pasti.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {TIER_COMPARISON.map((t) => (
            <div key={t.tier} className="flex items-start justify-between gap-3 pb-3 border-b last:border-0 last:pb-0">
              <div>
                <p className="text-sm font-bold">{t.tier}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.position}</p>
              </div>
              <Badge variant="outline" className="shrink-0 font-mono text-xs">{fmt(t.price)}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Standar Termasuk & Tidak Termasuk</CardTitle>
            <CardDescription>Umumnya berlaku, tapi tiap paket bisa punya daftar sendiri - selalu cek halaman detail paket.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-bold text-emerald-600 text-xs uppercase mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Termasuk
              </p>
              <p className="text-muted-foreground">Tiket PP, Visa, Hotel Fullboard, Makan 3x sehari, Handling, Manasik, City Tour, Transportasi, Tour Leader, Muthowwif, Perlengkapan, Transmitter, Al Baik, Air Zam-zam 5L.</p>
            </div>
            <div>
              <p className="font-bold text-destructive text-xs uppercase mb-2 flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5" /> Tidak Termasuk
              </p>
              <p className="text-muted-foreground">Pembuatan paspor, Vaksin Meningitis & Polio (wajib, biaya sendiri), Tiket PP daerah asal (jika bukan dari Jakarta), Kelebihan bagasi, Pengeluaran pribadi, Biaya kirim perlengkapan.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Baby className="h-4 w-4 text-primary" /> Harga Anak & Infant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span>Anak (sharing bed dengan orang tua)</span>
              <strong>{fmt(CHILD_PRICE)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Infant (tanpa bed & perlengkapan)</span>
              <strong>{fmt(INFANT_PRICE)}</strong>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" /> Syarat Dokumen & Kesehatan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="space-y-1.5 list-disc pl-5">
            <li>Paspor asli, <strong>berlaku minimal 1 tahun</strong> dari tanggal keberangkatan, dan nama minimal <strong>2 suku kata</strong> - nama 1 kata harus ditambah dulu di Disdukcapil.</li>
            <li>Pasfoto 4x6 sebanyak 2 lembar (boleh softcopy).</li>
            <li>KTP asli.</li>
            <li>Fotokopi surat nikah - bagi suami istri yang berangkat bersama.</li>
            <li>Fotokopi Kartu Keluarga - bagi anak yang berangkat bersama orang tua.</li>
            <li>Vaksin <strong>Meningitis & Polio wajib</strong>, diurus dan dibiayai sendiri oleh jamaah (tidak termasuk paket).</li>
          </ul>
          <TbdCallout>
            Aturan mahram untuk jamaah wanita dan batas usia jamaah belum didefinisikan di sistem manapun. Jangan menjawab dengan kepastian - eskalasi ke supervisor/tim dokumen.
          </TbdCallout>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Backpack className="h-4 w-4 text-primary" /> Perlengkapan Jamaah
          </CardTitle>
          <CardDescription>Termasuk dalam paket - berguna untuk dijelaskan ke calon jamaah yang belum tahu apa saja yang mereka dapat.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            {PERLENGKAPAN.map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kamus Istilah Umroh</CardTitle>
          <CardDescription>Buat kamu yang masih baru di industri ini.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {GLOSSARY.map((g) => (
              <AccordionItem key={g.term} value={g.term}>
                <AccordionTrigger className="text-sm font-semibold hover:no-underline">{g.term}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{g.def}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4 text-primary" /> Script Tambahan
          </CardTitle>
          <CardDescription>
            Lengkapi script opening/follow-up/objection dasar di{" "}
            <Link to="/agent/marketing-kit" className="text-primary font-semibold hover:underline">Marketing Kit</Link>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {EXTRA_SCRIPTS.map((s) => (
              <AccordionItem key={s.title} value={s.title}>
                <AccordionTrigger className="text-sm font-semibold hover:no-underline text-left">{s.title}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground whitespace-pre-line">{s.content}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentSalesGuide;
