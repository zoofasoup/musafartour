import { PkgPanel } from "@/components/package-detail/PkgPanel";
import { cn } from "@/lib/utils";

/** A shimmering placeholder block; takes its colours from the panel tone around it (see .pkg-skel in pkg-v2.css). */
export function Skel({ className }: { className?: string }) {
  return <div className={cn("pkg-skel rounded-2xl", className)} aria-hidden />;
}

/** One package card while loading: the same glass container and proportions as PkgListCard. */
export function PkgCardSkeleton() {
  return (
    <div className="pkg-card flex flex-col rounded-[32px] p-3" aria-hidden>
      <Skel className="aspect-[16/10] rounded-[20px]" />
      <div className="mt-4 space-y-3 px-2 pb-2">
        <Skel className="h-6 w-3/4 rounded-full" />
        <Skel className="h-4 w-1/2 rounded-full" />
        <Skel className="h-4 w-2/5 rounded-full" />
        <div className="flex items-end justify-between pt-3">
          <Skel className="h-9 w-24 rounded-full" />
          <Skel className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** The phone package page while loading: flyer, title panel, price panel, schedule panel, all shimmering. */
export function PkgDetailSkeleton() {
  return (
    <div className="pkg-v2 min-h-screen" role="status" aria-label="Memuat paket">
      <div className="pt-16">
        <div className="pkg-skel w-full" style={{ height: "min(125vw, 560px)", background: "var(--pkg-ink)" }} aria-hidden />
      </div>

      <PkgPanel tone="cream">
        <Skel className="h-4 w-28 rounded-full" />
        <Skel className="mt-4 h-14 w-4/5 rounded-2xl" />
        <Skel className="mt-3 h-14 w-3/5 rounded-2xl" />
        <Skel className="mt-6 h-11 w-44 rounded-full" />
      </PkgPanel>

      <PkgPanel tone="red">
        <div className="flex gap-2">
          <Skel className="h-11 flex-1 rounded-full" />
          <Skel className="h-11 flex-1 rounded-full" />
          <Skel className="h-11 flex-1 rounded-full" />
        </div>
        <Skel className="mt-8 h-7 w-44 rounded-full" />
        <Skel className="mt-3 h-24 w-3/4 rounded-2xl" />
        <Skel className="mt-8 h-14 w-full rounded-full" />
        <div className="mt-2 flex gap-2">
          <Skel className="h-12 flex-1 rounded-full" />
          <Skel className="h-12 flex-1 rounded-full" />
        </div>
      </PkgPanel>

      <PkgPanel tone="cream" last>
        <Skel className="h-10 w-40 rounded-2xl" />
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Skel className="col-span-2 h-28 rounded-[24px]" />
          <Skel className="h-28 rounded-[24px]" />
        </div>
        <Skel className="mt-6 h-12 w-full rounded-2xl" />
        <Skel className="mt-2 h-12 w-full rounded-2xl" />
      </PkgPanel>
    </div>
  );
}
