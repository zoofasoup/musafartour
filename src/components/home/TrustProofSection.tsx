import { Camera, MapPin } from "lucide-react";

const photos = [
  { id: 1, src: "/gallery/jamaah-1.jpg", location: "Makkah Al-Mukarramah", span: "md:col-span-2 md:row-span-2" },
  { id: 2, src: "/gallery/jamaah-2.jpg", location: "Madinah Al-Munawwarah", span: "md:col-span-1 md:row-span-1" },
  { id: 3, src: "/gallery/jamaah-3.jpg", location: "Masjid Nabawi", span: "md:col-span-1 md:row-span-1" },
  { id: 4, src: "/gallery/jamaah-4.jpg", location: "Jabal Rahmah", span: "md:col-span-2 md:row-span-1" }
];

export const TrustProofSection = () => {
  return (
    <section className="py-24 md:py-32 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="text-accent uppercase tracking-[0.2em] text-xs font-bold mb-4 flex items-center justify-center gap-2">
            <Camera className="w-4 h-4" /> Dokumentasi Perjalanan
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 tracking-tight">
            Jejak Langkah Tamu Allah
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Alhamdulillah, ribuan jamaah telah mempercayakan perjalanan suci mereka bersama Musafar Tour. Berikut adalah momen-momen indah mereka di Tanah Suci.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 md:auto-rows-[250px] gap-4 max-w-5xl mx-auto">
          {photos.map((photo) => (
            <div 
              key={photo.id} 
              className={`group relative rounded-2xl overflow-hidden shadow-sm ${photo.span}`}
            >
              <img 
                src={photo.src} 
                alt={`Dokumentasi Jamaah Musafar Tour di ${photo.location}`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
              <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-2 group-hover:translate-y-0 transition-transform">
                <p className="text-white font-medium flex items-center gap-2 text-sm md:text-base">
                  <MapPin className="w-4 h-4 text-accent" /> {photo.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
