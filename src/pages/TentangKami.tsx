import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useHomepageData } from "@/hooks/useHomepageData";
import { PackageCard } from "@/components/PackageCard";
import {
  Heart,
  Shield,
  Baby,
  BookOpen,
  Tag,
  Handshake,
  Train,
  Building2,
  Star,
  Plane,
  Hotel,
  CheckCircle2,
  MapPin,
  Calendar,
  Landmark,
  CreditCard,
  MessageCircle,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";
import { redirectToWhatsApp } from "@/lib/chatRedirect";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const TentangKami = () => {
  const { packages, packagesLoading } = useHomepageData();

  const handleWhatsApp = () => {
    redirectToWhatsApp("Assalamu'alaikum, saya ingin konsultasi tentang paket umroh Musafar Tour");
  };

  const handleWhatsAppPaket = (paket: string) => {
    redirectToWhatsApp(`Halo, saya tertarik dengan ${paket}. Bisa info lebih lanjut?`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Tentang Kami - Musafar Tour | Travel Umroh & Haji Terpercaya"
        description="Musafar Tour adalah travel umroh dan haji terpercaya. Berizin resmi PPIU Kemenag, melayani 2000+ jamaah dengan profesional, amanah, dan ramah keluarga."
        keywords="tentang musafar tour, travel umroh terpercaya, ppiu resmi, umroh keluarga"
        canonicalUrl="https://musafartour.com/tentang-kami"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          mainEntity: {
            "@type": "TravelAgency",
            name: "Musafar Tour",
            description: "Travel umroh dan haji terpercaya dengan pelayanan terbaik",
          },
        }}
      />
      <Navbar />

      {/* ══════════════════════════════════════════════════════════
          SECTION 1: HERO — The Hook
      ══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-background text-foreground">
        <div className="relative z-10 container mx-auto px-6 md:px-8 py-24 md:py-32 text-center max-w-4xl">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.p variants={fadeUp} className="text-accent font-semibold text-sm tracking-widest uppercase mb-6">
              Bukan Safar Biasa
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-[1.1] mb-6">
              Lebih Dari Sekadar Perjalanan,{" "}
              <span className="text-accent">Ini Adalah Jalan Pulang</span>{" "}
              Menuju Baitullah.
            </motion.h1>
            <motion.p variants={fadeUp} className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 tracking-tight leading-relaxed">
              Rasakan pengalaman umrah yang Khusyuk, Sesuai Sunnah, dan Ramah Keluarga. Bersama Musafar, jadikan setiap langkah Anda bermakna.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-base px-8 rounded-full"
                onClick={handleWhatsApp}
              >
                Wujudkan Rindu Baitullah Sekarang
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-foreground/20 text-foreground hover:bg-foreground/5 font-semibold text-base px-8 rounded-full"
                onClick={() => window.location.href = "/jadwal-umroh"}
              >
                Lihat Jadwal Keberangkatan
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 2: PROBLEM & SOLUTION — Emotional Connection
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6 md:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="max-w-3xl mx-auto text-center mb-16"
          >
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter mb-6 text-foreground">
              Kami Paham, Membawa Orang Tercinta ke Tanah Suci{" "}
              <span className="text-primary">Bukan Hal Sederhana.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-base md:text-lg leading-relaxed tracking-tight">
              Mungkin Anda cemas membawa orang tua yang sudah sepuh, atau ragu membawa si kecil menempuh perjalanan jauh. Rasa khawatir akan kenyamanan dan keamanan seringkali memecah fokus ibadah Anda.
            </motion.p>
            <motion.p variants={fadeUp} className="text-foreground font-semibold text-base md:text-lg mt-4 tracking-tight">
              Di Musafar Tour & Travel, kami tidak hanya mengurus tiket dan hotel.{" "}
              <span className="text-primary">Kami mengurus Ketenangan Hati Anda.</span>
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
            {[
              {
                icon: Heart,
                title: "Ramah Lansia",
                desc: "Dilengkapi kursi roda dan GPS Tracker untuk keamanan orang tua Anda.",
                color: "text-primary",
                bg: "bg-primary/10",
              },
              {
                icon: Baby,
                title: "Ramah Anak",
                desc: "Tersedia Children Kit, Stroller, dan rencana perjalanan yang tidak melelahkan.",
                color: "text-accent",
                bg: "bg-accent/10",
              },
              {
                icon: BookOpen,
                title: "Sesuai Sunnah",
                desc: "Manasik yang membimbing ibadah sesuai tuntunan Rasulullah ﷺ.",
                color: "text-primary",
                bg: "bg-primary/10",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="group relative bg-card rounded-2xl p-8 border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`${item.bg} w-14 h-14 rounded-xl flex items-center justify-center mb-5`}>
                  <item.icon className={`h-7 w-7 ${item.color}`} />
                </div>
                <h3 className="font-bold text-lg tracking-tight mb-2 text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 3: WHY US — Value Proposition
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-muted/40">
        <div className="container mx-auto px-6 md:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-primary font-semibold text-sm tracking-widest uppercase mb-3">
              Kepercayaan Jamaah
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter text-foreground">
              Mengapa 2.000+ Jamaah Mempercayakan
              <br className="hidden md:block" /> Ibadahnya Kepada Kami?
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto"
          >
            {[
              {
                icon: Tag,
                emoji: "🏷️",
                title: "Transparansi Tanpa Tapi",
                desc: "Biaya yang Anda bayar adalah fasilitas yang Anda dapatkan. Tiket confirmed di awal, tanpa biaya tersembunyi.",
              },
              {
                icon: Handshake,
                emoji: "🤝",
                title: "Amanah & Legalitas Terjamin",
                desc: "Ibadah tenang dengan izin resmi PPIU Kemenag No. 17102200953750002. Rekening resmi a.n PT Musa Amanah Wisata, bukan perorangan.",
              },
              {
                icon: Train,
                emoji: "🚄",
                title: "Fasilitas Modern & Cepat",
                desc: "Hemat waktu dan tenaga dengan Kereta Cepat Haramain (Madinah-Makkah) dan akses Lounge Eksklusif Bandara Soekarno-Hatta.",
              },
              {
                icon: Building2,
                emoji: "🏠",
                title: "Akomodasi Dekat Masjid",
                desc: "Hotel bintang 5 dan setaraf yang dipilih khusus agar langkah Anda menuju Masjid Nabawi dan Masjidil Haram terasa ringan.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="flex gap-5 bg-card rounded-2xl p-7 border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                  {item.emoji}
                </div>
                <div>
                  <h3 className="font-bold text-base tracking-tight mb-1.5 text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 4: SOCIAL PROOF — Trust
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6 md:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter mb-4 text-foreground">
              Kepuasan Jamaah adalah Prioritas Kami
            </motion.h2>
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-6 w-6 fill-accent text-accent" />
              ))}
              <span className="ml-2 font-bold text-foreground">5.0 / 5.0</span>
              <span className="text-muted-foreground text-sm ml-1">di Google Review</span>
            </motion.div>
            <motion.blockquote variants={fadeUp} className="relative bg-card rounded-2xl p-8 md:p-10 border shadow-sm">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold">
                "
              </div>
              <p className="text-foreground text-base md:text-lg leading-relaxed tracking-tight italic mb-6">
                Pelayanan maksimal namun harga terjangkau sehingga siapapun bisa berangkat umrah. Kekeluargaan, kebersamaan, dan keharmonisan adalah kunci pelayanan kami.
              </p>
              <p className="text-sm text-muted-foreground font-medium">— Filosofi Musafar</p>
            </motion.blockquote>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 5: PRODUCT SHOWCASE — Packages
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-muted/40">
        <div className="container mx-auto px-6 md:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-primary font-semibold text-sm tracking-widest uppercase mb-3">
              Paket Umroh
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter text-foreground">
              Pilih Paket Terbaik untuk Kenyamanan Ibadah Anda
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
          >
            {packagesLoading ? (
              <div className="col-span-full text-center text-muted-foreground py-10">Memuat paket...</div>
            ) : packages && packages.length > 0 ? (
              packages.slice(0, 3).map((pkg, i) => (
                <motion.div key={pkg.id} variants={fadeUp} className="h-full">
                  <PackageCard
                    id={pkg.id}
                    slug={pkg.slug}
                    image={pkg.image_url || ""}
                    title={pkg.name}
                    price={pkg.package_price?.quad ? `Rp ${pkg.package_price.quad.toLocaleString("id-ID")}` : "Harga tidak tersedia"}
                    date={new Date(pkg.departure_date).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                    duration={`${pkg.duration_days} Hari`}
                    airline={pkg.airline || "Saudia Airlines"}
                    hotelMakkah={pkg.hotel_makkah || ""}
                    hotelMakkahRating={pkg.hotel_makkah_rating || 4}
                    hotelMadinah={pkg.hotel_madinah || ""}
                    hotelMadinahRating={pkg.hotel_madinah_rating || 4}
                    category={pkg.category}
                    seatAvailable={pkg.available_seats > 0}
                    isSoldOut={pkg.available_seats <= 0}
                    waitlistCount={pkg.waitlist_count}
                    className="h-full"
                  />
                </motion.div>
              ))
            ) : (
              <div className="col-span-full text-center text-muted-foreground py-10">Belum ada paket tersedia.</div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 6: THE EXPERIENCE — 9 Days Journey
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6 md:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-primary font-semibold text-sm tracking-widest uppercase mb-3">
              Perjalanan Hati
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter text-foreground">
              Gambaran Perjalanan Hati Anda (9 Hari)
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={stagger}
            className="max-w-3xl mx-auto relative"
          >
            {/* Vertical line */}
            <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px bg-border" />

            {[
              { day: "1", icon: Plane, text: "Terbang langsung ke Madinah (Tanpa Transit), proses check-in yang dibantu tim handling." },
              { day: "2-3", icon: Landmark, text: "Menyejukkan hati di Raudhah, ziarah ke Masjid Quba & Jabal Uhud." },
              { day: "4", icon: Train, text: "Menuju Makkah dengan kenyamanan Kereta Cepat Haramain (Tanpa lelah di jalan)." },
              { day: "5-7", icon: Star, text: "Puncak ibadah Umrah, City Tour Kota Makkah, hingga wisata sejarah ke Thaif." },
              { day: "8-9", icon: Heart, text: "Tawaf Wada dan kembali ke Tanah Air dengan membawa predikat Mabrur, InsyaAllah." },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} className="relative flex gap-5 md:gap-7 mb-8 last:mb-0">
                <div className="relative z-10 flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                  <item.icon className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div className="pt-2 md:pt-4">
                  <p className="text-xs font-bold text-primary tracking-widest uppercase mb-1">Hari {item.day}</p>
                  <p className="text-sm md:text-base text-foreground leading-relaxed tracking-tight">{item.text}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 7: TRANSPARENCY & FOOTER
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-muted/40">
        <div className="container mx-auto px-6 md:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter text-foreground mb-3">
              Siapkan Niat, Kami Siapkan Sisanya.
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          >
            {/* Persyaratan */}
            <motion.div variants={fadeUp} className="bg-card rounded-2xl p-7 border shadow-sm">
              <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-5">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-base tracking-tight mb-4 text-foreground">Persyaratan Mudah</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  Paspor (Min. 2 suku kata)
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  Deposit Awal hanya <strong className="text-foreground">Rp 5.000.000/pax</strong>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  Pelunasan aman H-45 keberangkatan
                </li>
              </ul>
            </motion.div>

            {/* Pembayaran */}
            <motion.div variants={fadeUp} className="bg-card rounded-2xl p-7 border shadow-sm">
              <div className="bg-accent/10 w-12 h-12 rounded-xl flex items-center justify-center mb-5">
                <CreditCard className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-bold text-base tracking-tight mb-4 text-foreground">Pembayaran Resmi & Aman</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Transfer hanya ke rekening a.n{" "}
                <strong className="text-foreground">PT Musa Amanah Wisata</strong>
              </p>
              <div className="space-y-2">
                {["BCA", "BSI", "BNI"].map((bank) => (
                  <div key={bank} className="flex items-center gap-2 text-sm">
                    <Landmark className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">🏦 {bank}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Alamat */}
            <motion.div variants={fadeUp} className="bg-card rounded-2xl p-7 border shadow-sm">
              <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-5">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-base tracking-tight mb-4 text-foreground">Kantor Kami</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Commercial Park Harapan Indah, Ruko Emerald Blok EB 1 No.28, Medan Satria, Kota Bekasi, Jawa Barat 17131
              </p>
              <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                <p>📞 021-38312137</p>
                <p>💬 0819-1740-3797</p>
                <p>✉️ musafartour@gmail.com</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          STICKY BOTTOM BAR
      ══════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t shadow-[0_-4px_20px_-4px_hsl(var(--foreground)/0.1)] py-3 px-4">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 max-w-5xl">
          <p className="text-sm text-muted-foreground tracking-tight text-center sm:text-left">
            Masih ada pertanyaan tentang jadwal atau fasilitas?
          </p>
          <Button
            className="bg-[#25D366] hover:bg-[#22c55e] text-white font-semibold px-6 shrink-0"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Konsultasi Gratis via WhatsApp
          </Button>
        </div>
      </div>

      {/* Spacer for sticky bar */}
      <div className="h-16" />

      <Footer />
    </div>
  );
};

export default TentangKami;
