import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useHomepageData } from "@/hooks/useHomepageData";
import { TestimonialCard } from "@/components/TestimonialCard";
import { PackageCard } from "@/components/PackageCard";
import { getTierPrice, isPackageUnavailable } from "@/lib/utils";
import {
  Heart,
  Baby,
  Star,
  CheckCircle2,
  MapPin,
  Landmark,
  CreditCard,
  MessageCircle,
  ChevronRight,
  Phone,
  Mail,
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
  const { packages, packagesLoading, testimonials, websiteSettings } = useHomepageData();

  const handleWhatsApp = () => {
    redirectToWhatsApp("Assalamu'alaikum, saya ingin konsultasi tentang paket umroh Musafar Tour");
  };

  const address = websiteSettings?.address || "Commercial Park Harapan Indah, Ruko Emerald Blok EB 1 No.28, Medan Satria, Kota Bekasi, Jawa Barat 17131";
  const phone = websiteSettings?.phone_number || "081917403797";
  const email = websiteSettings?.email || "musafartour@gmail.com";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Tentang Kami - Musafar Tour | Travel Umroh Ramah Keluarga"
        description="Musafar Tour adalah travel umroh dan haji terpercaya, berizin resmi PPIU Kemenag, yang dirancang khusus untuk keluarga - ramah lansia dan ramah anak."
        keywords="tentang musafar tour, travel umroh ramah keluarga, umroh bersama orang tua, umroh bersama anak"
        canonicalUrl="https://musafartour.com/tentang-kami"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          mainEntity: {
            "@type": "TravelAgency",
            name: "Musafar Tour",
            description: "Travel umroh dan haji terpercaya, ramah keluarga",
          },
        }}
      />
      <Navbar />

      {/* ══════════════════════════════════════════════════════════
          SECTION 1: HERO
      ══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-background text-foreground">
        <div className="relative z-10 container mx-auto px-6 md:px-8 py-24 md:py-32 text-center max-w-4xl">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.p variants={fadeUp} className="text-accent font-semibold text-sm tracking-widest uppercase mb-6">
              Bukan Safar Biasa
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-[1.1] mb-6">
              Umroh Bersama Keluarga,{" "}
              <span className="text-accent">Tanpa Cemas Sedikitpun.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 tracking-tight leading-relaxed">
              Membawa orang tua yang sudah sepuh atau si kecil ke Tanah Suci bukan hal sederhana. Musafar Tour dirancang khusus supaya seluruh keluarga bisa beribadah dengan tenang, bersama.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-base px-8 rounded-full"
                onClick={handleWhatsApp}
              >
                Konsultasi Umroh Sekeluarga
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-foreground/20 text-foreground hover:bg-foreground/5 font-semibold text-base px-8 rounded-full"
                onClick={() => window.location.href = "/paket-umroh"}
              >
                Lihat Jadwal Keberangkatan
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 2: RAMAH KELUARGA — the one thing this page is about
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
            className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto"
          >
            {[
              {
                icon: Heart,
                title: "Ramah Lansia",
                desc: "Dilengkapi kursi roda dan GPS Tracker untuk keamanan orang tua Anda selama perjalanan.",
              },
              {
                icon: Baby,
                title: "Ramah Anak",
                desc: "Tersedia Children Kit, Stroller, dan rencana perjalanan yang tidak melelahkan si kecil.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="group relative rounded-3xl border border-slate-100/60 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-8 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="bg-primary/10 w-14 h-14 rounded-xl flex items-center justify-center mb-5">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-bold text-lg tracking-tight mb-2 text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 3: TESTIMONIALS — real reviews, not a made-up stat
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
              Kata Jamaah Kami
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter text-foreground mb-4">
              Cerita Keluarga yang Sudah Berangkat Bersama Kami
            </motion.h2>
            {websiteSettings?.google_review_url && (
              <motion.a
                variants={fadeUp}
                href={websiteSettings.google_review_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                Lihat semua review di Google <ExternalLink className="h-3.5 w-3.5" />
              </motion.a>
            )}
          </motion.div>

          {testimonials.length > 0 ? (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              variants={stagger}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 max-w-5xl mx-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {testimonials.slice(0, 8).map((t) => (
                <motion.div key={t.id} variants={fadeUp} className="w-[320px] shrink-0 snap-start">
                  <TestimonialCard
                    name={t.name}
                    text={t.content}
                    location={t.location || ""}
                    gender={(t.gender as "male" | "female") || "male"}
                    imageUrl={t.image_url}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : null}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 4: PRODUCT SHOWCASE — Packages
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
              Paket Umroh
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter text-foreground">
              Pilih Paket Terbaik untuk Kenyamanan Ibadah Keluarga Anda
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
              <div className="col-span-full py-10 flex gap-4">
                <Skeleton className="h-[300px] w-full rounded-2xl" />
                <Skeleton className="h-[300px] w-full rounded-2xl" />
                <Skeleton className="h-[300px] w-full rounded-2xl" />
              </div>
            ) : packages && packages.length > 0 ? (
              [...packages]
                .sort((a, b) => Number(isPackageUnavailable(a)) - Number(isPackageUnavailable(b)))
                .slice(0, 3)
                .map((pkg, i) => (
                <motion.div key={pkg.id} variants={fadeUp} className="h-full">
                  <PackageCard
                    id={pkg.id}
                    slug={pkg.slug}
                    image={pkg.banner_image || "/placeholder.svg"}
                    title={pkg.package_name}
                    price={getTierPrice(pkg).quad ? `Rp ${getTierPrice(pkg).quad.toLocaleString("id-ID")}` : "Harga tidak tersedia"}
                    date={new Date(pkg.departure_date).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                    duration={`${pkg.duration_days} Hari`}
                    airline={pkg.flight || "Saudia Airlines"}
                    hotelMakkah={pkg.makkah_hotel_name || ""}
                    hotelMakkahRating={pkg.makkah_hotel_star || 4}
                    hotelMadinah={pkg.madinah_hotel_name || ""}
                    hotelMadinahRating={pkg.madinah_hotel_star || 4}
                    category={pkg.available_tiers?.[0] || "nyaman"}
                    seatAvailable={!isPackageUnavailable(pkg)}
                    isSoldOut={isPackageUnavailable(pkg)}
                    waitlistCount={pkg.waitlist_count || 0}
                    slotsTotal={pkg.slots_total}
                    slotsFilled={pkg.slots_filled}
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
          SECTION 5: PRACTICAL INFO
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
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
            {/* Persyaratan */}
            <motion.div variants={fadeUp} className="rounded-3xl border border-slate-100/60 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-7">
              <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-5">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-base tracking-tight mb-4 text-foreground">Persyaratan Mudah</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  Paspor (Min. 8 bulan berlaku)
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  Deposit Awal hanya <strong className="text-foreground">Rp 5.000.000/pax</strong>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  Pelunasan aman H-35 keberangkatan
                </li>
              </ul>
            </motion.div>

            {/* Pembayaran */}
            <motion.div variants={fadeUp} className="rounded-3xl border border-slate-100/60 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-7">
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
                    <span className="font-medium text-foreground">{bank}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Kontak */}
            <motion.div variants={fadeUp} className="rounded-3xl border border-slate-100/60 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-7">
              <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-5">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-base tracking-tight mb-4 text-foreground">Kantor Kami</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {address}
              </p>
              <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-primary" /> {phone}</p>
                <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-primary" /> {email}</p>
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
