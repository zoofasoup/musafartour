import musafarLogo from "@/assets/musafar-logo.svg";
import { jsonForScript } from "@/lib/jsonLd";
import { Instagram, Facebook, Youtube, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useHomepageData } from "@/hooks/useHomepageData";
import { trackWhatsAppLead } from "@/lib/tracking";
import { openConsentSettings } from "@/lib/consent";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

const FALLBACK_PHONE = "021-38312137";
const FALLBACK_WHATSAPP = "6281917403797";
const FALLBACK_ADDRESS = "Commercial Park Harapan Indah Ruko Emerald Blok EB1 No. 28, Medan Satria, Kota Bekasi, Jawa Barat 17131";

const PKG_MENU = [
  { to: "/", label: "Beranda" },
  { to: "/paket-umroh", label: "Paket Umroh" },
  { to: "/artikel", label: "Artikel" },
  { to: "/tentang-kami", label: "Tentang Kami" },
  { to: "/galeri", label: "Galeri" },
  { to: "/jadi-agen", label: "Jadi Agen Musafar" },
];
const PKG_SUPPORT = [
  { to: "/#faq", label: "FAQs" },
  { to: "/cara-bayar", label: "Cara Bayar" },
  { to: "/cek-status", label: "Cek Status Pendaftaran" },
  { to: "/kebijakan-privasi", label: "Kebijakan Privasi" },
  { to: "/syarat-ketentuan", label: "Syarat & Ketentuan" },
];
const LINK = "inline-flex min-h-11 items-center text-base font-normal text-pkg-fg-2 transition-colors hover:text-pkg-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream";

const Footer = ({ variant }: { variant?: "pkg" }) => {
  const { websiteSettings } = useHomepageData();

  const phone = websiteSettings?.phone_number || FALLBACK_PHONE;
  const whatsapp = websiteSettings?.whatsapp_number || FALLBACK_WHATSAPP;
  const address = websiteSettings?.address || FALLBACK_ADDRESS;
  const instagramUrl = websiteSettings?.instagram_url || "https://instagram.com/musafartour";
  const facebookUrl = websiteSettings?.facebook_url || "https://facebook.com/musafartour";
  const youtubeUrl = websiteSettings?.youtube_url || "https://youtube.com/@musafartour";

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "name": "Musafar Tour",
    "image": "https://musafartour.com/logo.webp",
    // Same @id as the homepage's Organization block so search engines merge them into one business.
    "@id": "https://musafartour.com/#organization",
    "url": "https://musafartour.com",
    "telephone": String(phone).replace(/[^\d+]/g, "").replace(/^0/, "+62"),
    "address": {
      "@type": "PostalAddress",
      "streetAddress": address,
      "addressCountry": "ID"
    },
    "sameAs": [instagramUrl, facebookUrl, youtubeUrl]
  };

  if (variant === "pkg") {
    const social = [
      { href: instagramUrl, label: "Instagram", Icon: Instagram },
      { href: facebookUrl, label: "Facebook", Icon: Facebook },
      { href: youtubeUrl, label: "YouTube", Icon: Youtube },
    ];
    return (
      <div className="pkg-v2 pkg-float">
        <footer data-pkg-tone="ink" className="pkg-panel pkg-panel-last">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonForScript(schemaData) }} />
          <div className="mx-auto max-w-[1280px]">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-24">
              <div>
                <div
                  className="h-9 w-36 bg-pkg-cream [mask-image:url('/logo.webp')] [mask-size:contain] [mask-repeat:no-repeat] [mask-position:left] [-webkit-mask-image:url('/logo.webp')] [-webkit-mask-size:contain] [-webkit-mask-repeat:no-repeat] [-webkit-mask-position:left]"
                  role="img"
                  aria-label="Musafar Tour"
                />
                <h2 className="pkg-h2 mt-10 max-w-md">Info promo paket umroh terbaru</h2>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href={`https://wa.me/${whatsapp}?text=Halo%20Musamin,%20saya%20ingin%20mendapatkan%20info%20promo%20paket%20umroh%20terbaru`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackWhatsAppLead("footer")}
                    className="pkg-press pkg-glass-red pkg-label inline-flex h-12 items-center gap-2 rounded-full px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream focus-visible:ring-offset-2 focus-visible:ring-offset-pkg-ink"
                  >
                    <WhatsAppIcon className="h-5 w-5" /> Tanya UC
                  </a>
                  <Link
                    to="/paket-umroh"
                    className="pkg-press pkg-glass pkg-label inline-flex h-12 items-center rounded-full px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream focus-visible:ring-offset-2 focus-visible:ring-offset-pkg-ink"
                  >
                    Lihat paket
                  </Link>
                </div>
                <div className="mt-8 flex gap-3">
                  {social.map(({ href, label, Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="pkg-press pkg-glass flex h-12 w-12 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream"
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </a>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <nav aria-label="Menu">
                  <h3 className="pkg-label text-pkg-fg-3">Menu</h3>
                  <ul className="mt-2">
                    {PKG_MENU.map((l) => (
                      <li key={l.to}><Link to={l.to} className={LINK}>{l.label}</Link></li>
                    ))}
                  </ul>
                </nav>
                <nav aria-label="Support">
                  <h3 className="pkg-label text-pkg-fg-3">Support</h3>
                  <ul className="mt-2">
                    {PKG_SUPPORT.map((l) => (
                      <li key={l.to}><Link to={l.to} className={LINK}>{l.label}</Link></li>
                    ))}
                    <li><button type="button" onClick={openConsentSettings} className={LINK}>Pengaturan cookie</button></li>
                    <li><Link to="/kontak" className={LINK}>Kontak</Link></li>
                  </ul>
                </nav>
              </div>
            </div>

            <div className="mt-12 flex flex-col gap-1 border-t border-pkg-hair pt-6 text-sm text-pkg-fg-3 md:flex-row md:justify-between">
              <p>{new Date().getFullYear()} © Musafar Tour</p>
              <p>Made by Musawara Creative</p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <footer className="bg-primary text-white pt-16 md:pt-24 pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonForScript(schemaData) }}
      />
      <div className="container mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[400px]">

          {/* Left Column */}
          <div className="flex flex-col justify-between pr-0 md:pr-16 md:border-r border-white/10 pb-16 md:pb-0">
            <div>
              {/* Dynamic color logo using CSS mask */}
              <div
                className="h-10 w-40 md:h-12 md:w-48 bg-white mb-16 md:mb-24 [mask-image:url('/logo.webp')] [mask-size:contain] [mask-repeat:no-repeat] [mask-position:left] [-webkit-mask-image:url('/logo.webp')] [-webkit-mask-size:contain] [-webkit-mask-repeat:no-repeat] [-webkit-mask-position:left]"
                aria-label="Musafar Tour"
              />

              <h3 className="text-3xl md:text-[2.5rem] font-medium tracking-tight mb-12 max-w-md leading-[1.1] text-white">
                Dapatkan Info<br/>
                Promo Paket Umroh<br/>
                Terbaru dari Kami.
              </h3>

              <div className="flex items-center pb-3 max-w-sm mb-16">
                <a
                  href={`https://wa.me/${whatsapp}?text=Halo%20Musamin,%20saya%20ingin%20mendapatkan%20info%20promo%20paket%20umroh%20terbaru`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackWhatsAppLead("footer")}
                  className="flex items-center gap-2 text-emerald-400 font-semibold hover:text-emerald-300 transition-colors text-lg"
                >
                  Hubungi via WhatsApp <ArrowRight className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Socials */}
            <div className="flex gap-4 mt-auto">
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-white text-foreground flex items-center justify-center hover:bg-white/80 transition-colors" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-white text-foreground flex items-center justify-center hover:bg-white/80 transition-colors" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-white text-foreground flex items-center justify-center hover:bg-white/80 transition-colors" aria-label="YouTube">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col pl-0 md:pl-20 pt-12 md:pt-0">
            <div className="grid grid-cols-2 gap-8 md:mt-24">
              <div>
                <h4 className="font-medium text-white mb-6 text-lg">Menu</h4>
                <ul className="space-y-2 text-white/60">
                  <li><Link to="/" className="inline-block py-1.5 hover:text-white transition-colors">Beranda</Link></li>
                  <li><Link to="/paket-umroh" className="inline-block py-1.5 hover:text-white transition-colors">Paket Umroh</Link></li>
                  <li><Link to="/artikel" className="inline-block py-1.5 hover:text-white transition-colors">Artikel</Link></li>
                  <li><Link to="/tentang-kami" className="inline-block py-1.5 hover:text-white transition-colors">Tentang Kami</Link></li>
                  <li><Link to="/galeri" className="inline-block py-1.5 hover:text-white transition-colors">Galeri</Link></li>
                  <li><Link to="/jadi-agen" className="inline-block py-1.5 hover:text-white transition-colors">Jadi Agen Musafar</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-white mb-6 text-lg">Support</h4>
                <ul className="space-y-2 text-white/60">
                  <li><Link to="/#faq" className="inline-block py-1.5 hover:text-white transition-colors">FAQs</Link></li>
                  <li><Link to="/cara-bayar" className="inline-block py-1.5 hover:text-white transition-colors">Cara Bayar</Link></li>
                  <li><Link to="/cek-status" className="inline-block py-1.5 hover:text-white transition-colors">Cek Status Pendaftaran</Link></li>
                  <li><Link to="/kebijakan-privasi" className="inline-block py-1.5 hover:text-white transition-colors">Kebijakan Privasi</Link></li>
                  <li><Link to="/syarat-ketentuan" className="inline-block py-1.5 hover:text-white transition-colors">Syarat & Ketentuan</Link></li>
                  <li><button type="button" onClick={openConsentSettings} className="inline-block py-1.5 text-left hover:text-white transition-colors">Pengaturan cookie</button></li>
                  <li><Link to="/kontak" className="inline-block py-1.5 hover:text-white transition-colors">Kontak</Link></li>
                </ul>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center text-sm font-medium text-white">
          <p>{new Date().getFullYear()} © Musafar Tour</p>
          <p className="mt-4 md:mt-0 text-white/60">Made by Musawara Creative</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;