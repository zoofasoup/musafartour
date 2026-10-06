import { useState } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Check, Copy, IdCard, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { agentLevelLabel } from "@/lib/agentLevels";
import { agentStatusLabel } from "@/lib/agentSupport";

type Props = {
  name: string;
  agentId: string;
  level: string | null | undefined;
  status: string | null | undefined;
  since: string | null | undefined;
};

/** "Kartu Agen": name, Agent ID, level and the date the agent became active, with a print-friendly view (window.print). */
export function AgentIdCard({ name, agentId, level, status, since }: Props) {
  const [copied, setCopied] = useState(false);
  const sinceLabel = since ? format(new Date(since), "d MMMM yyyy", { locale: localeId }) : "Belum aktif";

  const copy = () => {
    navigator.clipboard.writeText(agentId).then(
      () => {
        setCopied(true);
        toast.success("Agent ID disalin!");
        setTimeout(() => setCopied(false), 2000);
      },
      () => toast.error("Belum bisa menyalin. Coba lagi.")
    );
  };

  return (
    <Card>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .agent-card-print, .agent-card-print * { visibility: visible !important; }
          .agent-card-print { position: fixed; left: 0; top: 0; width: 90mm; margin: 12mm; }
          .agent-card-noprint { display: none !important; }
        }
      `}</style>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><IdCard className="h-5 w-5" aria-hidden />Kartu Agen</CardTitle>
        <CardDescription>Tunjukkan Agent ID ini ke calon jamaah. Cetak kartunya kalau perlu.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="agent-card-print max-w-sm rounded-xl border-2 border-foreground bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agen Resmi Musafar Tour</p>
          <p className="mt-2 text-xl font-bold text-foreground">{name}</p>
          <p className="text-sm text-muted-foreground">{agentLevelLabel(level)} · {agentStatusLabel(status)}</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agent ID</p>
          <p className="font-mono text-2xl font-extrabold tracking-wide text-foreground">{agentId}</p>
          <p className="mt-3 text-sm text-muted-foreground">Aktif sejak {sinceLabel}</p>
        </div>
        <div className="agent-card-noprint flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-11 gap-2" onClick={copy}>
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />} Salin Agent ID
          </Button>
          <Button type="button" variant="outline" className="h-11 gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden /> Cetak
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
