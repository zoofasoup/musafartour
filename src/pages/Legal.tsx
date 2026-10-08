import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";

const COMPANY = "PT Musa Amanah Wisata (Musafar Tour & Travel)";
const ADDRESS =
  "Commercial Park Harapan Indah, Ruko Emerald Blok EB1 No. 28, Medan Satria, Kota Bekasi, Jawa Barat 17131";
const PHONE = "0819-1740-3797";
const UPDATED = "29 September 2026";

type Section = { title: string; body: (string | string[])[] };

const LegalLayout = ({
  title,
  path,
  description,
  sections,
}: {
  title: string;
  path: string;
  description: string;
  sections: Section[];
}) => (
  <div className="min-h-screen bg-background">
    <SEO title={`${title} - Musafar Tour`} description={description} canonicalUrl={`https://musafartour.com${path}`} />
    <Navbar />
    <main className="container mx-auto px-6 md:px-8 py-16 max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">{title}</h1>
      <p className="text-sm text-muted-foreground mb-10">Terakhir diperbarui: {UPDATED}</p>
      <div className="space-y-10">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-xl font-semibold text-foreground mb-3">{s.title}</h2>
            <div className="space-y-3 text-foreground/80 leading-relaxed">
              {s.body.map((b, i) =>
                Array.isArray(b) ? (
                  <ul key={i} className="list-disc pl-5 space-y-1.5">
                    {b.map((li) => (
                      <li key={li}>{li}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={i}>{b}</p>
                )
              )}
            </div>
          </section>
        ))}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Hubungi Kami</h2>
          <p className="text-foreground/80 leading-relaxed">
            {COMPANY}
            <br />
            {ADDRESS}
            <br />
            Telepon/WhatsApp: {PHONE}
            <br />
            Atau melalui halaman{" "}
            <Link to="/kontak" className="text-primary underline underline-offset-4">
              Kontak
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
    <Footer />
  </div>
);

export const KebijakanPrivasi = () => (
  <LegalLayout
    title="Kebijakan Privasi"
    path="/kebijakan-privasi"
    description="Bagaimana Musafar Tour mengumpulkan, menggunakan, dan melindungi data pribadi jamaah dan pengunjung situs."
    sections={[
      {
        title: "Ringkasan",
        body: [
          `Kebijakan ini menjelaskan bagaimana ${COMPANY}, penyelenggara perjalanan ibadah umrah berizin resmi Kementerian Agama (PPIU), mengumpulkan, menggunakan, menyimpan, dan melindungi data pribadi Anda saat menggunakan musafartour.com, menghubungi kami melalui WhatsApp, atau mendaftar perjalanan. Kami memproses data pribadi sesuai Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.`,
        ],
      },
      {
        title: "Data yang Kami Kumpulkan",
        body: [
          [
            "Data yang Anda berikan: nama, nomor WhatsApp/telepon, email, dan pesan saat mengisi formulir, kalkulator tabungan umroh, atau menghubungi kami.",
            "Data pendaftaran perjalanan: data jamaah yang diperlukan untuk booking, visa, tiket, dan asuransi (misalnya nama sesuai paspor, tanggal lahir, nomor paspor, dan kontak darurat).",
            "Data pembayaran: nominal, tanggal, rekening tujuan, dan bukti transfer ke rekening resmi PT Musa Amanah Wisata. Kami tidak meminta dan tidak menyimpan PIN, kata sandi, atau data kartu Anda.",
            "Data teknis: halaman yang dikunjungi, perangkat, dan sumber kunjungan (misalnya tautan iklan atau kode referensi agen).",
          ],
        ],
      },
      {
        title: "Penggunaan Data",
        body: [
          [
            "Memproses pendaftaran, pembayaran, dokumen perjalanan, dan layanan selama ibadah.",
            "Menghubungi Anda terkait paket, jadwal, waitlist, dan konsultasi yang Anda minta.",
            "Mencatat referensi agen untuk perhitungan komisi mitra agen.",
            "Mengukur dan meningkatkan performa situs dan iklan kami.",
            "Memenuhi kewajiban hukum dan pelaporan kepada regulator penyelenggaraan ibadah umrah.",
          ],
        ],
      },
      {
        title: "Cookie dan Pelacakan",
        body: [
          "Situs ini menggunakan cookie dan teknologi serupa, termasuk Meta Pixel, TikTok Pixel, dan Google Analytics, untuk memahami kunjungan dan mengukur efektivitas iklan. Kami juga menyimpan cookie referensi agen selama 30 hari agar pendaftaran Anda tercatat untuk agen yang merekomendasikan. Anda dapat menghapus atau memblokir cookie melalui pengaturan browser.",
        ],
      },
      {
        title: "Berbagi Data",
        body: [
          "Kami tidak menjual data pribadi Anda. Data hanya dibagikan sejauh diperlukan kepada: maskapai, hotel, dan penyedia layanan di Arab Saudi; pihak pengurusan visa dan asuransi; mitra pembayaran; penyedia layanan teknologi yang menyimpan data atas nama kami; serta instansi pemerintah bila diwajibkan oleh hukum.",
        ],
      },
      {
        title: "Penyimpanan dan Keamanan",
        body: [
          "Data disimpan selama diperlukan untuk tujuan di atas dan untuk memenuhi kewajiban hukum, lalu dihapus atau dianonimkan. Kami menerapkan kontrol akses dan pengamanan teknis yang wajar untuk melindungi data Anda.",
        ],
      },
      {
        title: "Hak Anda",
        body: [
          "Anda berhak meminta akses, perbaikan, atau penghapusan data pribadi Anda, serta menarik persetujuan pemrosesan data untuk keperluan pemasaran. Hubungi kami melalui kontak di bawah; kami akan menanggapi permintaan Anda dalam waktu yang wajar.",
        ],
      },
    ]}
  />
);

export const SyaratKetentuan = () => (
  <LegalLayout
    title="Syarat & Ketentuan"
    path="/syarat-ketentuan"
    description="Syarat dan ketentuan pendaftaran, pembayaran, dan pembatalan paket umroh Musafar Tour."
    sections={[
      {
        title: "Penyelenggara",
        body: [
          `Perjalanan ibadah umrah diselenggarakan oleh ${COMPANY}, Penyelenggara Perjalanan Ibadah Umrah (PPIU) berizin resmi Kementerian Agama Republik Indonesia. Dengan mendaftar, Anda menyetujui syarat dan ketentuan berikut.`,
        ],
      },
      {
        title: "Pendaftaran dan Seat",
        body: [
          "Seat dianggap terkonfirmasi setelah Uang Muka (DP) diterima. Harga dan ketersediaan seat mengikuti informasi terbaru pada saat pendaftaran dan dapat berubah sewaktu-waktu sebelum DP dibayarkan.",
        ],
      },
      {
        title: "Pembayaran",
        body: [
          [
            "Uang Muka (DP) sebesar Rp 5.000.000 per jamaah.",
            "Pelunasan dapat dicicil kapan saja dan berapa saja, dan harus lunas paling lambat H-30 sebelum tanggal keberangkatan.",
            "Pembayaran hanya melalui transfer ke rekening resmi atas nama PT Musa Amanah Wisata: BCA 1643337111, BSI 7213170788, atau BNI 1784469461. Kami tidak bertanggung jawab atas transfer ke rekening lain.",
          ],
        ],
      },
      {
        title: "Pembatalan dan Pengembalian Dana",
        body: [
          [
            "Uang Muka (DP) sebesar Rp 5.000.000 tidak dapat dikembalikan (non refundable).",
            "Pendaftaran tidak bisa dibatalkan atau digantikan setelah 5 hari kerja.",
          ],
          "Jika pembatalan disetujui, pengembalian dana diproses paling lama 90 hari kerja, dengan besar pengembalian sebagai berikut (dari harga paket):",
          [
            "6 Minggu sebelum keberangkatan 50 % dari harga paket",
            "3 Minggu sebelum keberangkatan 25 % dari harga paket",
            "2 Minggu sebelum keberangkatan 0 % dari harga paket",
          ],
        ],
      },
      {
        title: "Dokumen Perjalanan",
        body: [
          "Jamaah bertanggung jawab menyerahkan dokumen yang dipersyaratkan (antara lain paspor yang masih berlaku) sesuai jadwal yang diinformasikan. Keterlambatan atau ketidaklengkapan dokumen dapat memengaruhi pengurusan visa dan keberangkatan.",
        ],
      },
      {
        title: "Perubahan Jadwal dan Layanan",
        body: [
          "Jadwal penerbangan, hotel, dan rangkaian kegiatan dapat berubah karena kebijakan maskapai, otoritas Arab Saudi, atau keadaan di luar kendali kami. Bila terjadi perubahan, kami akan menginformasikan dan mengupayakan pengganti yang setara.",
        ],
      },
      {
        title: "Kode Referensi Agen",
        body: [
          "Pendaftaran yang berasal dari tautan atau kode referensi agen dicatat untuk agen yang bersangkutan. Hal ini tidak mengubah harga yang Anda bayarkan.",
        ],
      },
    ]}
  />
);
