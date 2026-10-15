import { GoogleMapsIcon } from "@/components/icons/GoogleMapsIcon";

interface GoogleMapProps {
  className?: string;
  googleMapsUrl?: string;
}

/** embedUrl's lat/lng pin is baked into this iframe query string, not sourced from website_settings (no column holds map embed coordinates) - only the "Lihat di Google Maps" link below is centralized. */
export const GoogleMap = ({ className = "", googleMapsUrl = "https://maps.app.goo.gl/sq4uivE9cHuvUhgi6" }: GoogleMapProps) => {
  const embedUrl = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3965.881951691795!2d106.98234287499658!3d-6.183195293794784!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e698b00698b5b3f%3A0xb96c099500ce30b8!2sMusafar%20Tour%20%26%20Travel!5e0!3m2!1sen!2sid!4v1234567890`;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="relative h-[320px] w-full overflow-hidden rounded-[24px] shadow-[0_18px_36px_-18px_rgb(26_21_18/0.4)] md:h-[440px]">
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Lokasi Musafar Tour & Travel"
          className="absolute inset-0"
        />
      </div>

      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="pkg-press pkg-glass pkg-label inline-flex h-14 items-center justify-center gap-2.5 rounded-full px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2"
      >
        <GoogleMapsIcon className="h-6 w-6 object-contain" /> Buka di Google Maps
      </a>
    </div>
  );
};
