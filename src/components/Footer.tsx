import musafarLogo from "@/assets/musafar-logo.svg";
import { Instagram, Facebook, Youtube, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "name": "Musafar Tour",
    "image": "https://musafartour.com/logo.webp",
    "@id": "https://musafartour.com",
    "url": "https://musafartour.com",
    "telephone": "021-38312137",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Commercial Park Harapan Indah Ruko Emerald Blok EB1 No. 28",
      "addressLocality": "Medan Satria, Kota Bekasi",
      "addressRegion": "Jawa Barat",
      "postalCode": "17131",
      "addressCountry": "ID"
    },
    "sameAs": [
      "https://instagram.com/musafartour",
      "https://facebook.com/musafartour",
      "https://youtube.com/@musafartour"
    ]
  };

  return (
    <footer className="bg-[#FAFAFA] text-[#1c1c1c] pt-16 md:pt-24 pb-8 border-t border-border">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <div className="container mx-auto px-6 md:px-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[400px]">
          
          {/* Left Column */}
          <div className="flex flex-col justify-between pr-0 md:pr-16 md:border-r border-[#1c1c1c]/10 pb-16 md:pb-0">
            <div>
              {/* Dynamic color logo using CSS mask */}
              <div 
                className="h-10 w-40 md:h-12 md:w-48 bg-[#1c1c1c] mb-20 md:mb-32 [mask-image:url('/logo.webp')] [mask-size:contain] [mask-repeat:no-repeat] [mask-position:left] [-webkit-mask-image:url('/logo.webp')] [-webkit-mask-size:contain] [-webkit-mask-repeat:no-repeat] [-webkit-mask-position:left]"
                aria-label="Musafar Tour"
              />

              <h3 className="text-3xl md:text-[2.5rem] font-medium tracking-tight mb-16 max-w-md leading-[1.1]">
                Subscribe to our<br/>
                newsletter<br/>
                to stay in touch with the<br/>
                latest.
              </h3>

              <div className="flex items-center border-b border-[#1c1c1c]/20 pb-3 max-w-sm mb-16">
                <input 
                  type="email" 
                  placeholder="E-mail address" 
                  className="bg-transparent border-none outline-none flex-1 text-[#1c1c1c] placeholder:text-[#1c1c1c]/40 text-lg" 
                />
                <button className="text-[#1c1c1c] hover:text-[#1c1c1c]/60 transition-colors" aria-label="Subscribe">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Socials */}
            <div className="flex gap-4 mt-auto">
              <a href="https://instagram.com/musafartour" target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-[#1c1c1c] text-[#FAFAFA] flex items-center justify-center hover:bg-[#1c1c1c]/80 transition-colors" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="https://facebook.com/musafartour" target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-[#1c1c1c] text-[#FAFAFA] flex items-center justify-center hover:bg-[#1c1c1c]/80 transition-colors" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://youtube.com/@musafartour" target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-[#1c1c1c] text-[#FAFAFA] flex items-center justify-center hover:bg-[#1c1c1c]/80 transition-colors" aria-label="YouTube">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col pl-0 md:pl-20 pt-12 md:pt-0">
            <div className="grid grid-cols-2 gap-8 md:mt-32">
              <div>
                <h4 className="font-medium text-[#1c1c1c] mb-6 text-lg">Menu</h4>
                <ul className="space-y-4 text-[#1c1c1c]/60">
                  <li><Link to="/" className="hover:text-[#1c1c1c] transition-colors">Beranda</Link></li>
                  <li><Link to="/paket-umroh" className="hover:text-[#1c1c1c] transition-colors">Paket Umroh</Link></li>
                  <li><Link to="/tentang-kami" className="hover:text-[#1c1c1c] transition-colors">Tentang Kami</Link></li>
                  <li><Link to="/galeri" className="hover:text-[#1c1c1c] transition-colors">Galeri</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-[#1c1c1c] mb-6 text-lg">Support</h4>
                <ul className="space-y-4 text-[#1c1c1c]/60">
                  <li><Link to="/" className="hover:text-[#1c1c1c] transition-colors">FAQs</Link></li>
                  <li><Link to="/" className="hover:text-[#1c1c1c] transition-colors">Kebijakan Privasi</Link></li>
                  <li><Link to="/" className="hover:text-[#1c1c1c] transition-colors">Syarat & Ketentuan</Link></li>
                  <li><Link to="/" className="hover:text-[#1c1c1c] transition-colors">Kontak</Link></li>
                </ul>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#1c1c1c]/10 mt-20 pt-8 flex flex-col md:flex-row justify-between items-center text-sm font-medium text-[#1c1c1c]">
          <p>2025 © Musafar Tour</p>
          <p className="mt-4 md:mt-0">Made by Musawara Creative</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;