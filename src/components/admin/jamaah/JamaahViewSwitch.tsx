import { useNavigate } from "react-router-dom";
import { Chips } from "@/components/agent/AgentPage";
import { useNewIntakeCount } from "@/hooks/useJamaahIntake";

type View = "paket" | "semua" | "masuk";

const PATH: Record<View, string> = { paket: "/admin/jamaah", semua: "/admin/jamaah/semua", masuk: "/admin/jamaah/masuk" };

/** Data Jamaah has one entry in the sidebar; this chooses how to look at it: one package at a time, everyone, or what just came in.
 *  Pass it to <AdminPage tabs>. */
export function JamaahViewSwitch({ active }: { active: View }) {
  const navigate = useNavigate();
  const { data: waiting = 0 } = useNewIntakeCount();
  return (
    <Chips<View>
      label="Tampilan data jamaah"
      value={active}
      onChange={(v) => navigate(PATH[v])}
      options={[
        { value: "paket", label: "Per paket" },
        { value: "semua", label: "Semua jamaah" },
        { value: "masuk", label: waiting > 0 ? `Pendaftaran masuk (${waiting})` : "Pendaftaran masuk" },
      ]}
    />
  );
}
