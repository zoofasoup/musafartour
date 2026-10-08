import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import { useCommissionRateHistory } from "@/hooks/useCommissionRates";
import { COMMISSION_LEVEL_LABEL, rupiah, tierLabel, type CommissionLevel } from "@/lib/commission";

const amount = (n: number | null) => (n == null ? "kosong" : rupiah(n));

/** Riwayat tarif komisi satu paket: siapa mengubah tingkat mana, dari berapa ke berapa. */
export function RateHistoryDrawer({ packageId, packageName, onClose }: { packageId: string | null; packageName: string; onClose: () => void }) {
  const q = useCommissionRateHistory(packageId);
  return (
    <Sheet open={!!packageId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Riwayat tarif</SheetTitle>
          <SheetDescription>{packageName}</SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          {q.isLoading ? (
            <div className="space-y-2" role="status" aria-label="Memuat riwayat">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : q.isError ? (
            <LoadError what="Riwayat tarif" error={q.error} onRetry={() => void q.refetch()} retrying={q.isFetching} />
          ) : !q.data?.length ? (
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">Belum ada perubahan tarif tercatat untuk paket ini.</p>
          ) : (
            <ol className="divide-y rounded-lg border">
              {q.data.map((h, i) => (
                <li key={i} className="space-y-0.5 px-4 py-3 text-sm">
                  <p className="font-semibold">
                    {tierLabel(h.tier)} · {COMMISSION_LEVEL_LABEL[h.level as CommissionLevel] ?? h.level}
                  </p>
                  <p>
                    {amount(h.old_amount)} <span aria-label="menjadi">→</span> <span className="font-semibold">{amount(h.new_amount)}</span>
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {h.changed_by_name} · {format(parseISO(h.changed_at), "d MMM yyyy, HH:mm", { locale: idLocale })}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
