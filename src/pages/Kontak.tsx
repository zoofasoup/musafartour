import { useState } from "react";
import { Link } from "react-router-dom";
import { PkgPage, pkgArea, pkgFocus, pkgInput, pkgLabel } from "@/components/PkgPage";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import { SEO } from "@/components/SEO";
import { GoogleMap } from "@/components/GoogleMap";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatWhatsAppUrl } from "@/lib/utils";
import { useHomepageData } from "@/hooks/useHomepageData";
import { trackWhatsAppLead } from "@/lib/tracking";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { formatPhone } from "@/lib/phone";

const FALLBACK_WHATSAPP = "6281917403797";
const FALLBACK_ADDRESS = "Commercial Park Harapan Indah Ruko Emerald Blok EB1 No. 28, Medan Satria, Kota Bekasi, Jawa Barat 17131";
const FALLBACK_OFFICE_HOURS = "Senin - Jumat: 09.00 - 17.00 WIB, Sabtu: 09.00 - 14.00 WIB, Minggu & Libur: Tutup";

const Kontak = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const { toast } = useToast();
  const { websiteSettings } = useHomepageData();

  const whatsapp = websiteSettings?.whatsapp_number || FALLBACK_WHATSAPP;
  const phone = websiteSettings?.phone_number || "021-38312137";
  const email = websiteSettings?.email || "musafartour@gmail.com";
  const address = websiteSettings?.address || FALLBACK_ADDRESS;
  const officeHours = websiteSettings?.office_hours || FALLBACK_OFFICE_HOURS;

  const handleWhatsAppClick = () => {
    const message = "Halo Musafar Tour, saya ingin bertanya tentang paket umroh.";
    const whatsappUrl = formatWhatsAppUrl(whatsapp, message);
    trackWhatsAppLead("kontak_page");
    window.open(whatsappUrl, "_blank");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: "Form tidak lengkap",
        description: "Mohon lengkapi semua field yang wajib diisi.",
        variant: "destructive",
      });
      return;
    }

    const message = `Halo Musafar Tour,

Nama: ${formData.name}
Email: ${formData.email}
Telepon: ${formData.phone}
Subjek: ${formData.subject}

Pesan:
${formData.message}`;

    const whatsappUrl = formatWhatsAppUrl(whatsapp, message);
    trackWhatsAppLead("kontak_form");
    window.open(whatsappUrl, "_blank");

    // Nothing is sent until the user taps send in WhatsApp, so don't claim it was,
    // and keep the form filled in case they close WhatsApp without sending.
    toast({
      title: "Lanjutkan di WhatsApp",
      description: "Pesan Anda sudah disiapkan. Tekan kirim di WhatsApp untuk mengirimkannya.",
    });
  };

  // 6281917403797 -> 0819 - 1740 - 3797. One number serves calls and WhatsApp.
  const digits = whatsapp.replace(/\D/g, "").replace(/^62/, "0");
  const displayPhone = digits.length >= 10 ? `${digits.slice(0, 4)} - ${digits.slice(4, 8)} - ${digits.slice(8)}` : phone;
  // One line per schedule entry, even when the saved text has them run together ("...WIBSabtu...").
  const hoursLines = officeHours
    .split(/\r?\n|\s*,\s*|(?<=WIB)\s*(?=[A-Z])/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rows = [
    { icon: MapPin, label: "Alamat kantor", lines: [address] },
    { icon: Phone, label: "Telepon dan WhatsApp", lines: [displayPhone] },
    { icon: Mail, label: "Email", lines: [email] },
    { icon: Clock, label: "Jam operasional", lines: hoursLines },
  ];

  return (
    <>
      <SEO 
        title="Kontak Kami - Musafar Tour | Hubungi Tim Musamin"
        description="Hubungi Musafar Tour untuk konsultasi gratis tentang paket umroh dan wisata halal. WhatsApp: 0819-1740-3797. Kantor di Bekasi, buka Senin-Sabtu."
        keywords="kontak musafar tour, telepon musafar tour, alamat kantor umroh bekasi"
        canonicalUrl="https://musafartour.com/kontak"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "mainEntity": {
            "@type": "TravelAgency",
            "name": "Musafar Tour",
            "telephone": `+${whatsapp}`,
            "email": email,
            "address": {
              "@type": "PostalAddress",
              "streetAddress": address,
              "addressCountry": "ID"
            }
          }
        }}
      />
      <PkgPage title="Hubungi kami" intro="Tanya paket, jadwal, atau cara daftar. Kami balas lewat WhatsApp.">
        <PkgPanel tone="cream">
          <div className="mx-auto max-w-5xl">
            <ul className="space-y-6">
              {rows.map(({ icon: Icon, label, lines }) => (
                <li key={label} className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-pkg-cream-2 text-pkg-red-deep">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="pkg-caption text-pkg-fg-3">{label}</p>
                    {lines.map((l) => (
                      <p key={l} className="mt-0.5 text-[17px] leading-[1.45] text-pkg-fg">{l}</p>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={handleWhatsAppClick} className={`pkg-press pkg-glass-red pkg-label inline-flex h-14 items-center justify-center gap-2.5 rounded-full px-7 ${pkgFocus}`}>
              <WhatsAppIcon className="h-5 w-5" /> Chat WhatsApp
            </button>
              <Link to="/paket-umroh" className={`pkg-press pkg-glass pkg-label inline-flex h-14 items-center justify-center rounded-full px-7 ${pkgFocus}`}>
                Lihat paket
              </Link>
            </div>
          </div>
        </PkgPanel>

        <PkgPanel tone="cream-2">
          <div className="mx-auto max-w-3xl">
            <h2 className="pkg-h2">Kirim pesan</h2>
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="k-name" className={pkgLabel}>Nama lengkap</label>
                <input id="k-name" className={pkgInput} placeholder="Nama kamu" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <label htmlFor="k-email" className={pkgLabel}>Email</label>
                <input id="k-email" type="email" className={pkgInput} placeholder="nama@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div>
                <label htmlFor="k-phone" className={pkgLabel}>Nomor telepon <span className="text-pkg-fg-3">(opsional)</span></label>
                <input id="k-phone" type="tel" className={pkgInput} placeholder="0812 3456 7890" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })} />
              </div>
              <div>
                <label htmlFor="k-subject" className={pkgLabel}>Subjek <span className="text-pkg-fg-3">(opsional)</span></label>
                <input id="k-subject" className={pkgInput} placeholder="Perihal pesan" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} />
              </div>
              <div>
                <label htmlFor="k-msg" className={pkgLabel}>Pesan</label>
                <textarea id="k-msg" rows={5} className={pkgArea} placeholder="Tulis pesanmu" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} required />
              </div>
              <button type="submit" className={`pkg-press pkg-glass-red pkg-label inline-flex h-14 w-full items-center justify-center rounded-full px-7 sm:w-auto ${pkgFocus}`}>
                Kirim lewat WhatsApp
              </button>
            </form>
          </div>
        </PkgPanel>

        <PkgPanel tone="cream" last>
          <div className="mx-auto max-w-5xl">
            <h2 className="pkg-h2">Lokasi kantor</h2>
            <GoogleMap className="mt-6" googleMapsUrl={websiteSettings?.google_maps_url || undefined} />
          </div>
        </PkgPanel>
      </PkgPage>
    </>
  );
};

export default Kontak;
