import { Card, CardContent } from "@/components/ui/card";

/** One summary number (label, value, optional hint) for the jamaah and finance pages. */
export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {hint && <p className="mt-0.5 text-[13px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
