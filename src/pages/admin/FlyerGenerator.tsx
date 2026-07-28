import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FlyerPreview } from "@/components/admin/flyer/FlyerPreview";
import { FlyerRowPicker } from "@/components/admin/flyer/FlyerRowPicker";
import { exportFlyerAsImage } from "@/lib/flyer/flyerExport";
import { FLYER_PACKAGE_COLUMNS, SAFE_ZONE_MAX_ROWS, getSeatLabel, type FlyerPackage } from "@/lib/flyer/flyerData";

const PREVIEW_SCALE = 0.4;

/** Replaces the manual Canva redesign of the seat-availability flyer - renders live from packages data (kept fresh by the existing 5-minute Google Sheet sync) and exports via html2canvas, so there's no longer a step that can be forgotten. */
export default function FlyerGenerator() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState<"png" | "jpeg" | null>(null);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["flyer-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select(FLYER_PACKAGE_COLUMNS)
        .eq("status", "published")
        .gte("departure_date", new Date().toISOString().slice(0, 10))
        .order("departure_date", { ascending: true });
      if (error) throw error;
      // Sold-out departures are never shown on the flyer - excluded automatically, not just marked.
      const rows = (data as unknown as FlyerPackage[]).filter((p) => getSeatLabel(p) !== "Sold Out!");
      setSelectedIds(new Set(rows.slice(0, SAFE_ZONE_MAX_ROWS).map((p) => p.id)));
      return rows;
    },
  });

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (next.size >= SAFE_ZONE_MAX_ROWS) {
        toast.error(`Maksimal ${SAFE_ZONE_MAX_ROWS} paket bisa tampil di flyer.`);
        return prev;
      }
      next.add(id);
      return next;
    });
  };

  const selectedPackages = useMemo(
    () => packages.filter((p) => selectedIds.has(p.id)),
    [packages, selectedIds]
  );

  const handleExport = async (format: "png" | "jpeg") => {
    if (!previewRef.current) return;
    setExporting(format);
    try {
      await exportFlyerAsImage(previewRef.current, format);
      toast.success("Flyer berhasil diunduh");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat flyer");
    } finally {
      setExporting(null);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Memuat paket...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Flyer Generator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pilih paket yang tampil di flyer, lalu unduh sebagai gambar. Preview di bawah adalah persis apa yang akan diunduh.
        </p>
      </div>

      <div className="flex gap-6 flex-wrap lg:flex-nowrap">
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="text-sm font-medium">
            Dipilih: {selectedIds.size}/{SAFE_ZONE_MAX_ROWS}
          </div>
          <FlyerRowPicker packages={packages} selectedIds={selectedIds} onToggle={toggle} />
          <div className="flex gap-2">
            <Button onClick={() => handleExport("png")} disabled={exporting !== null || selectedPackages.length === 0}>
              {exporting === "png" ? "Membuat..." : "Download PNG"}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("jpeg")}
              disabled={exporting !== null || selectedPackages.length === 0}
            >
              {exporting === "jpeg" ? "Membuat..." : "Download JPEG"}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto border rounded-lg bg-muted/30 p-4">
          <div
            style={{
              width: 1080 * PREVIEW_SCALE,
              height: 1920 * PREVIEW_SCALE,
            }}
          >
            <div style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left" }}>
              <FlyerPreview ref={previewRef} packages={selectedPackages} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
