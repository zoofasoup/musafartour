import { MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GoogleMapProps {
  className?: string;
}

export const GoogleMap = ({ className = "" }: GoogleMapProps) => {
  const address = "Commercial Park Harapan Indah Ruko Emerald Blok EB1 No. 28, Medan Satria, Kota Bekasi, Jawa Barat 17131";
  const googleMapsUrl = "https://maps.app.goo.gl/sq4uivE9cHuvUhgi6";
  const embedUrl = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3965.881951691795!2d106.98234287499658!3d-6.183195293794784!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e698b8e2e2e2e2f%3A0x1234567890abcdef!2sMusafar%20Tour%20%26%20Travel!5e0!3m2!1sen!2sid!4v1234567890`;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="relative w-full h-[400px] md:h-[500px] rounded-lg overflow-hidden shadow-lg border border-border">
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
      
      <div className="flex justify-center">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => window.open(googleMapsUrl, '_blank')}
          className="gap-2"
        >
          <MapPin className="h-4 w-4" />
          Lihat di Google Maps
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
