import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FlyerPreview } from "@/components/admin/flyer/FlyerPreview";
import { FLYER_PACKAGE_COLUMNS, type FlyerPackage } from "@/lib/flyer/flyerData";

/**
 * Unauthenticated route rendered by the headless browser in
 * functions/flyer-image.ts (packages has a public SELECT policy already -
 * see docs/superpowers/plans/2026-07-28-flyer-generator.md). Renders
 * FlyerPreview at true, unscaled 1080x1920px and marks the DOM ready via a
 * body attribute once fonts and images have actually finished loading, so
 * the Function can wait on a real condition instead of a fixed timeout.
 */
export default function FlyerPrint() {
  const [searchParams] = useSearchParams();
  const [packages, setPackages] = useState<FlyerPackage[] | null>(null);

  const idsParam = searchParams.get("ids") ?? "";
  const ids = idsParam.split(",").filter(Boolean);

  useEffect(() => {
    if (ids.length === 0) {
      setPackages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("packages")
        .select(FLYER_PACKAGE_COLUMNS)
        .in("id", ids);
      if (cancelled) return;
      if (error || !data) {
        setPackages([]);
        return;
      }
      const byId = new Map((data as unknown as FlyerPackage[]).map((p) => [p.id, p]));
      const ordered = ids.map((id) => byId.get(id)).filter((p): p is FlyerPackage => Boolean(p));
      setPackages(ordered);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsParam]);

  useEffect(() => {
    if (packages === null) return;
    let cancelled = false;
    (async () => {
      const images = Array.from(document.querySelectorAll("img"));
      await Promise.all([
        document.fonts.ready,
        ...images.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.addEventListener("load", () => resolve(), { once: true });
                img.addEventListener("error", () => resolve(), { once: true });
              })
        ),
      ]);
      if (!cancelled) document.body.setAttribute("data-flyer-ready", "true");
    })();
    return () => {
      cancelled = true;
    };
  }, [packages]);

  if (packages === null) return null;

  return <FlyerPreview packages={packages} />;
}
