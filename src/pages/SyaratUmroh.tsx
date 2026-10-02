import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Clause {
  text: string;
  items?: string[];
}

/** Term of Service of PT Musa Amanah Wisata, copied as written in the registration form PDF. Do not reword without the company's approval. */
const CLAUSES: Clause[] = [
  { text: "Jamaah berhak untuk mendapatkan segala Informasi lengkap tentang paket perjalanan ibadah umroh yang akan di pilih oleh calon jamaah." },
  { text: "Jamaah diberikan pembekalan keberangkatan / manasik sebelum keberangkatan." },
  { text: "Jamaah berhak mengetahui waktu dan jadwal keberangkatan, akomodasi yang digunakan selama program, sistem pelayanan yang didapatkan jamaah selama program. Jika ada perubahan dalam program, travel akan menginfokan langsung ke jamaah." },
  { text: "Pihak penyedia jasa / travel tidak menjanjikan seluruh jamaah bisa masuk Raudhah." },
  { text: "Pendaftaran tidak bisa di batalkan atau di gantikan setelah 5 hari kerja." },
  { text: "Pelayanan penuh sesuai program yang telah di buat oleh travel." },
  { text: "Pembiayaan, service klinik/rumah sakit pada masa program berlangsung tanpa dikenakan biaya sesuai program asuransi pemerintah." },
  {
    text: "Keberangkatan Pada Masa New Normal",
    items: [
      "Jamaah setuju dan patuh pada peraturan perjalanan umroh pada masa pandemi yang diatur oleh negara Indonesia & Saudi Arabia.",
      "Travel akan mendampingi dan mengurus keperluan jamaah sebelum keberangkatan atau ketika perjalanan atau ketika proses pelaksanaan ibadah. Jika jamaah teridentifikasi covid-19 dampak seperti Hangusnya tiket pesawat, Penambahan Isolasi, Pembelian Tiket Kembali, Visa tidak terbit atau faktor lain dikarenakan jamaah covid-19 menjadi tanggung jawab jamaah dan travel bertanggung jawab mencari solusi terbaik untuk jamaah.",
      "Travel & Jamaah akan mencari jalan terbaik jika jamaah dipulangkan ke Indonesia oleh pemerintah Saudi Arabia pada program keberangkatan umroh.",
      "Pembiayaan tambahan yang berkenaan dengan covid-19 menjadi tanggung jawab jamaah dan dikordinir oleh travel.",
    ],
  },
  {
    text: "Jika jamaah sakit dan dirawat dan diperlukan extra hari dari program",
    items: [
      "Jamaah tetap ditangani oleh dokter yang bertanggung jawab pada masa perawatan.",
      "Jamaah di tinggal oleh grup dengan di temani oleh staf handling travel.",
      "Pembiayaaan perawatan dan pesawat pulang Pasien / jamaah yang dirawat ditanggung oleh travel dengan biaya maksimal Rp. 7.000.000,-.",
      "Jika ada keluarga jamaah yang ingin menemani pasien maka pengeluaran sepenuhnya bukan tanggung jawab travel.",
      "Waktu perpulangan hanya dokter yang bisa menentukan.",
    ],
  },
  {
    text: "Jika jamaah meninggal dunia",
    items: [
      "Travel akan mengurus semua administrasi kematian / surat kematian jamaah.",
      "Pemakaman dilakukan dengan syariat Islam di tempat dimana jamaan meninggal dunia.",
      "Informasi lengkap langsung diberikan kepada keluarga jamaah/almarhum dengan sedetil-detilnya tanpa ada yang ditutupi.",
      "Jika keluarga almarhum ingin memulangkan jamaah ke Indonesia, maka seluruh pengurusan dan biaya bukan menjadi tanggung jawab travel.",
    ],
  },
  { text: "Jika jamaah tertinggal maka travel akan menyerahkan kepada KBRI atau perwakilan negara di wilayah jamaah tertinggal dengan biaya menjadi tanggung jawab travel." },
  { text: "Jika bagasi tertinggal di pesawat menjadi tanggung jawab maskapai selama masih ada boarding pass dan koper tag." },
  {
    text: "Jika jamaah kabur",
    items: [
      "Sepenuhnya menjadi tanggung jawab keluarga yang ada di Indonesia dan kasusnya akan di serahkan kepada pihak kepolisian wilayah jamaah kabur.",
      "Denda Rp.1.000.000.000,- (Satu Milyar) dan sangsi yang dijatuhkan kepada travel dan pihak lain menjadi tanggung jawab keluarga jamaah.",
      "Travel tidak bertanggung jawab apapun kepada jamaah yang kabur dari program.",
    ],
  },
  { text: "Pergantian tanggal keberangkatan bukan dari pihak travel, melainkan dari pihak airline / maskapai atau peraturan dari Saudi." },
  { text: "Pergantian hotel di saudi adalah memungkinkan dikarenakan padatnya perputaran masuk keluarnya jamaah di hotel tersebut akan tetapi travel memberikan pengganti hotel dengan yang setaraf." },
  { text: "Jamaah dilarang keluar dari makkah/madinah tanpa ditemani tour leader / muthowif / staf travel." },
  { text: "Tas dan bagasi diperbolehkan hanya yang di berikan dari travel." },
  { text: "Biaya kelebihan bagasi menjadi tanggung jawab jamaah." },
  { text: "Pembongkaran koper/tas bukan menjadi tanggung jawab travel." },
  {
    text: "Pembatalan dapat di kembalikan maksimal 90 Hari kerja, dengan ketentuan sebagai berikut:",
    items: ["6 Minggu Sebelum keberangkatan 50 % dari harga paket", "3 Minggu sebelum keberangkatan 25 % dari harga paket", "2 Minggu sebelum keberangkatan 0 % dari harga paket"],
  },
  {
    text: "Bagasi/Koper hilang/tertinggal:",
    items: [
      "Apabila hilang/tertinggal/rusak di pesawat adalah tanggung jawab maskapai dengan dibantu claim oleh pihak travel.",
      "Apabila hilang/tertinggal/rusak di hotel adalah tanggung jawab jamaah dibantu travel untuk mencari.",
      "Barang/Tas/koper yang di letakan di kabin Bus yang tertinggal bukan menjadi tanggung jawab travel.",
    ],
  },
  { text: "Jamaah umroh telah membaca dan menyetujui persyaratan paket keberangkatan." },
];

const REQUIREMENTS = [
  "Membayar Uang Pendaftaran Sebesar Rp. 5.000.000,- (Non Refundable).",
  "Harga dapat menyesuaikan tergantung kenaikan kurs dollar dan maskapai.",
  "Pelunasan 30 Hari Sebelum Keberangkatan.",
  "Telah melakukan vaksin covid-19 sampai dosis 3 (Booster) (jika diberlakukan oleh pemerintah).",
  "Telah melakukan vaksin meningitis paling cepat 14 hari sebelum keberangkatan (dengan buku kuning/e-ICV).",
  "Paspor dengan masa berlaku tidak kurang dari 12 bulan sebelum jadwal keberangkatan.",
  "Nama di paspor minimal dua suku kata.",
  "Pasfoto 4x6 background Putih sebanyak 2 lembar Fokus Wajah 80%",
];

/** Persyaratan and Term of Service that people agree to on the registration form. */
export default function SyaratUmroh() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">Persyaratan dan Term of Service Umroh</h1>
        <p className="mt-2 text-muted-foreground">PT Musa Amanah Wisata (izin PPIU Kemenag: 17102200953750002)</p>

        <section className="mt-8" aria-labelledby="persyaratan">
          <h2 id="persyaratan" className="text-xl font-bold">Persyaratan umroh</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-6">
            {REQUIREMENTS.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </section>

        <section className="mt-10" aria-labelledby="tos">
          <h2 id="tos" className="text-xl font-bold">Term of Service</h2>
          <ol className="mt-3 list-decimal space-y-3 pl-6">
            {CLAUSES.map((c) => (
              <li key={c.text}>
                {c.text}
                {c.items && (
                  <ol className="mt-2 list-[lower-alpha] space-y-2 pl-6">
                    {c.items.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ol>
                )}
              </li>
            ))}
          </ol>
        </section>
      </main>
      <Footer />
    </div>
  );
}
