import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LazyImage } from "@/components/ui/lazy-image";
import { PkgPanel } from "@/components/package-detail/PkgPanel";

const fallbackPhotos = [
  { id: "1", image_url: "/gallery/jamaah-1.jpg" },
  { id: "2", image_url: "/gallery/jamaah-2.jpg" },
  { id: "3", image_url: "/gallery/jamaah-3.jpg" },
  { id: "4", image_url: "/gallery/jamaah-4.jpg" },
];

// Tilt and lift per position inside one group, so both copies of the group look identical.
const TILT = ["-rotate-3 translate-y-2", "rotate-2 -translate-y-3", "-rotate-1 translate-y-4", "rotate-3 -translate-y-1"];

export const JamaahCarousel = () => {
  const countRef = useRef(null);
  const isInView = useInView(countRef, { once: true, margin: "-50px" });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString("id-ID"));

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, 3000, { duration: 2.5, ease: "easeOut" });
      return controls.stop;
    }
  }, [isInView]);

  const { data: galleryPhotos } = useQuery({
    queryKey: ["jamaah-photos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("id, image_url, title")
        .eq("is_active", true)
        .eq("category", "jamaah")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
  const photos = galleryPhotos && galleryPhotos.length > 0 ? galleryPhotos : fallbackPhotos;
  // One group is at least 8 photos (wider than a desktop screen) and a multiple of 4, so the tilt pattern repeats cleanly.
  const groupSize = Math.max(8, Math.ceil(photos.length / 4) * 4);
  const group = Array.from({ length: groupSize }, (_, i) => photos[i % photos.length]);

  return (
    <PkgPanel tone="ink">
      <div className="mx-auto max-w-6xl">
        <h2 ref={countRef} className="pkg-title whitespace-nowrap tabular-nums !leading-[0.85] !tracking-[-0.06em] !text-[min(calc((100vw-48px)/3.15),300px)]">
          <span><motion.span>{rounded}</motion.span>+</span>
        </h2>
        <p className="pkg-label mt-3 text-center text-pkg-fg-2">Jamaah sudah menjadi keluarga Musafar</p>
      </div>
      {/* Photos drift left in a loop. Two identical groups, track as wide as its content, so the -50% shift never cuts. */}
      <div className="-mx-6 mt-10 overflow-hidden py-6 [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]">
        <div className="flex w-max items-center animate-scroll-photos" style={{ animationDuration: "170s" }}>
          {[0, 1].map((g) => (
            <div key={g} className="flex shrink-0 items-center" aria-hidden={g === 1}>
              {group.map((photo, i) => (
                <div
                  key={`${g}-${i}`}
                  className={`h-[260px] w-[196px] shrink-0 overflow-hidden rounded-[24px] bg-pkg-ink-2 shadow-[0_18px_30px_-14px_rgb(0_0_0/0.6)] md:h-[320px] md:w-[240px] ${i > 0 ? "-ml-4" : ""} ${TILT[i % 4]}`}
                >
                  <LazyImage src={photo.image_url} alt={g === 0 ? "Jamaah umroh Musafar Tour" : ""} className="h-full w-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </PkgPanel>
  );
};
