import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useResolveLeadDispute } from "@/hooks/useCommissionPayouts";
import { commissionErrorMessage, type DisputeRow } from "@/lib/commissionPayout";

/**
 * Management decides a lead dispute (SOP bagian 6): who is credited, and optionally a helper share for the other agent.
 * Until it is decided the commission of every jamaah of that registration stays held (PENDING / Ditahan).
 */
export function DisputeDialog({ dispute, onOpenChange }: { dispute: DisputeRow | null; onOpenChange: (open: boolean) => void }) {
  const resolve = useResolveLeadDispute();
  const [winner, setWinner] = useState("");
  const [split, setSplit] = useState("none");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (dispute) {
      setWinner(dispute.lead_agent_id ?? "");
      setSplit("none");
      setNote("");
    }
  }, [dispute]);

  if (!dispute) return null;
  const agents = [
    { id: dispute.lead_agent_id, name: `${dispute.lead_agent_name ?? "-"} (${dispute.lead_agent_code ?? "-"})`, role: "pemilik lead terlindungi" },
    { id: dispute.intake_agent_id, name: `${dispute.intake_agent_name ?? "-"} (${dispute.intake_agent_code ?? "-"})`, role: "agen yang mendaftarkan" },
  ].filter((a): a is { id: string; name: string; role: string } => !!a.id);
  const other = agents.find((a) => a.id !== winner);

  const submit = async () => {
    try {
      await resolve.mutateAsync({
        intakeId: dispute.intake_id,
        winnerId: winner,
        helperPercent: split === "none" ? null : Number(split),
        note: note.trim(),
      });
      toast.success("Sengketa diputuskan. Komisi dilepas dari status Ditahan.");
      onOpenChange(false);
    } catch (e) {
      toast.error(commissionErrorMessage(e));
    }
  };

  return (
    <Dialog open={!!dispute} onOpenChange={(o) => !resolve.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Putuskan sengketa lead</DialogTitle>
          <DialogDescription>
            Jamaah {dispute.contact_name ?? "-"}. Keputusan manajemen bersifat final. Komisi seluruh jamaah di pendaftaran ini ikut keputusan ini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Komisi untuk</Label>
            <RadioGroup value={winner} onValueChange={setWinner} className="gap-2">
              {agents.map((a) => (
                <label key={a.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
                  <RadioGroupItem value={a.id} className="mt-0.5" />
                  <span>{a.name} · {a.role}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Bagi dengan agen pembantu</Label>
            <RadioGroup value={split} onValueChange={setSplit} className="gap-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm">
                <RadioGroupItem value="none" /> Tidak dibagi (100% untuk yang menang)
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm">
                <RadioGroupItem value="30" /> Agen pembantu 30%, yang menang 70%
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm">
                <RadioGroupItem value="40" /> Agen pembantu 40%, yang menang 60%
              </label>
            </RadioGroup>
            {split !== "none" && other && (
              <p className="text-[13px] text-muted-foreground">Agen pembantu: {other.name}. Nominal total mengikuti level agen yang menang.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dispute-note">Catatan keputusan (opsional)</Label>
            <Textarea id="dispute-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={resolve.isPending}>Batal</Button>
          <Button onClick={submit} disabled={!winner || resolve.isPending}>
            {resolve.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Putuskan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
