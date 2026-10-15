import { useState } from "react";
import { Award, Lock } from "lucide-react";
import { badgeImage } from "@/lib/badges";

/** The artwork of a badge, or a plain icon when the picture is not there. Locked badges are grey and faded. */
export function BadgeArt({ code, earned, className = "" }: { code: string; earned: boolean; className?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className={`relative grid aspect-square place-items-center overflow-hidden rounded-[22px] pkg-glass ${earned ? "" : "opacity-60"} ${className}`}>
      {broken ? (
        <Award className="h-1/3 w-1/3 text-pkg-fg-3" aria-hidden />
      ) : (
        <img src={badgeImage(code)} alt="" loading="lazy" onError={() => setBroken(true)} className={`absolute inset-0 h-full w-full object-cover mix-blend-multiply ${earned ? "" : "grayscale"}`} />
      )}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent" aria-hidden />
      {!earned && (
        <span className="absolute bottom-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-pkg-ink/70 text-pkg-cream">
          <Lock className="h-3.5 w-3.5" aria-hidden />
        </span>
      )}
    </span>
  );
}
