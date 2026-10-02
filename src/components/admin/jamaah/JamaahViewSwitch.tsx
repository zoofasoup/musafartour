import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNewIntakeCount } from "@/hooks/useJamaahIntake";

type View = "paket" | "semua" | "masuk";

const PATH: Record<View, string> = { paket: "/admin/jamaah", semua: "/admin/jamaah/semua", masuk: "/admin/jamaah/masuk" };

/** Data Jamaah has one entry in the sidebar; this chooses how to look at it: one package at a time, everyone, or what just came in. */
export function JamaahViewSwitch({ active }: { active: View }) {
  const navigate = useNavigate();
  const { data: waiting = 0 } = useNewIntakeCount();
  return (
    <Tabs value={active} onValueChange={(v) => navigate(PATH[v as View])}>
      <TabsList aria-label="Tampilan data jamaah">
        <TabsTrigger value="paket">Per paket</TabsTrigger>
        <TabsTrigger value="semua">Semua jamaah</TabsTrigger>
        <TabsTrigger value="masuk" className="gap-2">
          Pendaftaran masuk
          {waiting > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground" aria-label={`${waiting} menunggu`}>
              {waiting}
            </span>
          )}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
