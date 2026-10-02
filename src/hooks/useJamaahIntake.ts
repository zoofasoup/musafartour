import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface IntakePerson {
  id: string;
  position: number;
  full_name: string;
  gender: string;
  category: "adult" | "child_nobed" | "infant";
  room_type: string;
  relation: string | null;
  registration_id: string | null;
}

export interface Intake {
  id: string;
  code: string;
  package_id: string;
  status: "new" | "accepted" | "rejected";
  contact_name: string;
  contact_phone: string;
  contact_city: string | null;
  contact_attending: boolean;
  pay_together: boolean;
  agent_id: string | null;
  ref_code: string | null;
  heard_from: string | null;
  notes: string | null;
  source: string;
  manifest_token: string;
  reject_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  jamaah_intake_people: IntakePerson[];
}

export type IntakeStatus = Intake["status"];

const COLUMNS =
  "id, code, package_id, status, contact_name, contact_phone, contact_city, contact_attending, pay_together, agent_id, ref_code, " +
  "heard_from, notes, source, manifest_token, reject_reason, reviewed_at, created_at, " +
  "jamaah_intake_people(id, position, full_name, gender, category, room_type, relation, registration_id)";

/** Registrations sent through the public form or the agent portal, newest first. */
export function useIntakes(status: IntakeStatus) {
  return useQuery({
    queryKey: ["jamaah-intakes", status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jamaah_intakes")
        .select(COLUMNS)
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return ((data ?? []) as unknown as Intake[]).map((i) => ({
        ...i,
        jamaah_intake_people: [...i.jamaah_intake_people].sort((a, b) => a.position - b.position),
      }));
    },
  });
}

/** The number on the "Pendaftaran masuk" tab. Cheap: a head request, no rows. */
export function useNewIntakeCount() {
  return useQuery({
    queryKey: ["jamaah-intakes", "count"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase.from("jamaah_intakes").select("id", { count: "exact", head: true }).eq("status", "new");
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export interface KnownJamaah {
  package_id: string;
  full_name: string;
  phone: string | null;
}

/** Name and phone of everyone already registered on the given packages, to flag likely duplicates. */
export function useKnownJamaah(packageIds: string[]) {
  const key = [...packageIds].sort().join(",");
  return useQuery({
    queryKey: ["jamaah-intakes", "known", key],
    enabled: packageIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("jamaah_registrations").select("package_id, full_name, phone").in("package_id", packageIds);
      if (error) throw error;
      return (data ?? []) as KnownJamaah[];
    },
  });
}
