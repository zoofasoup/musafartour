import musafarLogo from "@/assets/musafar-logo.svg";
import { Instagram, Facebook, Youtube, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useHomepageData } from "@/hooks/useHomepageData";

const FALLBACK_PHONE = "021-38312137";
const FALLBACK_WHATSAPP = "6281917403797";
const FALLBACK_ADDRESS = "Commercial Park Harapan Indah Ruko Emerald Blok EB1 No. 28, Medan Satria, Kota Bekasi, Jawa Barat 17131";

const Footer = () => {
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
    "@id": "https://musafartour.com",
    "url": "https://musafartour.com",
    "telephone": phone,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": address,
      "addressCountry": "ID"
    },
    "sameAs": [instagramUrl, facebookUrl, youtubeUrl]
  };

  return (
    <footer className="bg-neutral-950 text-white pt-16 md:pt-24 pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
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
                  className="flex items-center gap-2 text-emerald-400 font-semibold hover:text-emerald-300 transition-colors text-lg"
                >
                  Hubungi via WhatsApp <ArrowRight className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Socials */}
            <div className="flex gap-4 mt-auto">
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-white text-neutral-950 flex items-center justify-center hover:bg-white/80 transition-colors" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-white text-neutral-950 flex items-center justify-center hover:bg-white/80 transition-colors" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-white text-neutral-950 flex items-center justify-center hover:bg-white/80 transition-colors" aria-label="YouTube">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col pl-0 md:pl-20 pt-12 md:pt-0">
            <div className="grid grid-cols-2 gap-8 md:mt-24">
              <div>
                <h4 className="font-medium text-white mb-6 text-lg">Menu</h4>
                <ul className="space-y-4 text-white/60">
                  <li><Link to="/" className="hover:text-white transition-colors">Beranda</Link></li>
                  <li><Link to="/paket-umroh" className="hover:text-white transition-colors">Paket Umroh</Link></li>
                  <li><Link to="/tentang-kami" className="hover:text-white transition-colors">Tentang Kami</Link></li>
                  <li><Link to="/galeri" className="hover:text-white transition-colors">Galeri</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-white mb-6 text-lg">Support</h4>
                <ul className="space-y-4 text-white/60">
                  <li><Link to="/kontak" className="hover:text-white transition-colors">FAQs</Link></li>
                  <li><Link to="/tentang-kami" className="hover:text-white transition-colors">Kebijakan Privasi</Link></li>
                  <li><Link to="/tentang-kami" className="hover:text-white transition-colors">Syarat & Ketentuan</Link></li>
                  <li><Link to="/kontak" className="hover:text-white transition-colors">Kontak</Link></li>
                </ul>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center text-sm font-medium text-white">
          <p>2025 © Musafar Tour</p>
          <p className="mt-4 md:mt-0 text-white/40">Made by Musawara Creative</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;