import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createPortal } from "react-dom";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { useMyBadges } from "@/hooks/useMyBadges";
import { BadgeArt } from "@/components/agent/BadgeArt";
import type { BadgeProgress } from "@/lib/badges";
import "@/styles/pkg-v2.css";

const SPARKS = [
  { dx: "-120px", dy: "-90px", delay: "420ms" }, { dx: "110px", dy: "-100px", delay: "480ms" },
  { dx: "-140px", dy: "10px", delay: "540ms" }, { dx: "135px", dy: "20px", delay: "460ms" },
  { dx: "-80px", dy: "110px", delay: "520ms" }, { dx: "90px", dy: "115px", delay: "580ms" },
];

/** One way in per badge group (the way out is the same for all). */
const VARIANT: Record<string, "pop" | "drop" | "flip" | "rise"> = { persiapan: "pop", penjualan: "drop", konsistensi: "rise", jaringan: "flip" };
const OUT_MS = 240;

/**
 * The full-screen reveal of one badge: the card rises, the picture comes in (pop, drop, flip or rise depending on the badge
 * group), a ring of light and a few sparks play. Tap anywhere to go on; the card and the picture play out before it ends.
 */
export function BadgeReveal({ badge, hint, label = "Badge baru", onTap }: { badge: BadgeProgress; hint: string; label?: string; onTap: () => void }) {
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const variant = VARIANT[badge.group_key] ?? "pop";

  const finish = useCallback(() => {
    if (timer.current) return;
    setClosing(true);
    timer.current = setTimeout(onTap, OUT_MS);
  }, [onTap]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${label}: ${badge.name}`} data-closing={closing ? "" : undefined} className="pkg-cel-scrim pkg-v2 fixed inset-0 z-[130] grid cursor-pointer place-items-center bg-[#0f0c0a]/80 px-6 backdrop-blur-sm" onClick={finish}>
      <div data-pkg-tone="ink" className="pkg-cel-card relative w-full max-w-sm overflow-hidden rounded-[32px] px-6 pb-7 pt-9 text-center shadow-[inset_0_1px_0_rgb(244_239_230/0.3),inset_0_0_0_1px_rgb(244_239_230/0.14),0_30px_60px_-20px_rgb(0_0_0/0.7)]">
        <p className="pkg-label text-pkg-red-bright">{label}</p>
        <div className="relative mx-auto mt-6 grid h-48 w-48 place-items-center">
          <span className="pkg-cel-ring absolute inset-0 rounded-full border-2 border-pkg-red-bright" aria-hidden />
          {SPARKS.map((s, i) => (
            <span key={i} className="pkg-cel-spark absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pkg-red-bright" style={{ ["--dx" as string]: s.dx, ["--dy" as string]: s.dy, ["--delay" as string]: s.delay }} aria-hidden />
          ))}
          <span data-variant={variant} className="pkg-cel-art grid w-44">
            <BadgeArt code={badge.code} earned className="w-full shadow-[0_24px_40px_-16px_rgb(26_21_18/0.5)]" />
          </span>
        </div>
        <h2 className="mt-7 text-[32px] font-light leading-[1.05] tracking-[-0.035em] text-pkg-fg">{badge.name}</h2>
        <p className="mt-3 text-[16px] leading-snug text-pkg-fg-2">{badge.description}</p>
        <p className="mt-7 text-[13px] text-pkg-fg-3">{hint}</p>
      </div>
    </div>,
    document.body
  );
}

/**
 * Tells the agent when a new badge was earned: one reveal per badge, once per account. "Seen" is kept in the database
 * (public.mark_badges_seen), so logging in again, or from another device, does not show it again.
 */
export function BadgeCelebration() {
  const { agent } = useAgentAuth();
  const { data } = useMyBadges();
  const queryClient = useQueryClient();
  // Badges already shown in this session, so a slow refetch cannot bring one back before the database answers.
  const [shown, setShown] = useState<string[]>([]);

  const queue = useMemo(() => (data ?? []).filter((b) => b.earned_at && b.seen === false && !shown.includes(b.code)), [data, shown]);
  const current = queue[0];
  if (!current || !agent?.id) return null;

  const next = () => {
    setShown((s) => [...s, current.code]);
    queryClient.setQueryData<BadgeProgress[]>(["my-badges", agent.id], (old) => old?.map((b) => (b.code === current.code ? { ...b, seen: true } : b)));
    void supabase.rpc("mark_badges_seen" as never, { _codes: [current.code] } as never);
  };

  return <BadgeReveal key={current.code} badge={current} onTap={next} hint={queue.length > 1 ? `Ketuk untuk lanjut, masih ada ${queue.length - 1} badge baru` : "Ketuk untuk tutup"} />;
}
