import { useState } from "react";
import { agentAvatarUrl } from "@/lib/agentAvatar";

const FLOWER_ID = "rank-flower";

/** A 12-lobed scalloped outline as a clip path in 0..1 units. Render <FlowerDefs /> once on the page. */
const flowerPath = (() => {
  const pts: string[] = [];
  for (let i = 0; i <= 144; i++) {
    const a = (i / 144) * Math.PI * 2;
    const r = 0.5 * (0.965 + 0.035 * Math.cos(12 * a));
    pts.push(`${(0.5 + r * Math.cos(a)).toFixed(4)} ${(0.5 + r * Math.sin(a)).toFixed(4)}`);
  }
  return `M${pts.join(" L")} Z`;
})();

export const FlowerDefs = () => (
  <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
    <clipPath id={FLOWER_ID} clipPathUnits="objectBoundingBox"><path d={flowerPath} /></clipPath>
  </svg>
);

/**
 * An agent's picture (or initial) in the scalloped shape. `ring` paints a coloured border around it; the photo is the
 * agent's profile picture from storage and the initial shows until it loads or when there is none.
 */
export function RankAvatar({ id, name, size, ring }: { id: string; name: string; size: number; ring?: string }) {
  const [photo, setPhoto] = useState(false);
  const inner = ring ? size - 8 : size;
  const shape = { clipPath: `url(#${FLOWER_ID})` };
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size, ...(ring ? { ...shape, background: ring } : {}) }} aria-hidden>
      <span className="relative grid place-items-center overflow-hidden bg-pkg-red text-pkg-on-red" style={{ width: inner, height: inner, ...shape, fontSize: Math.round(inner * 0.4) }}>
        {name.trim().charAt(0).toUpperCase() || "?"}
        <img
          src={agentAvatarUrl(id)}
          alt=""
          onLoad={() => setPhoto(true)}
          onError={() => setPhoto(false)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity ${photo ? "opacity-100" : "opacity-0"}`}
        />
      </span>
    </span>
  );
}
