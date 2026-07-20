import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EquipmentItem {
  id: string;
  name: string;
  image_url: string | null;
}

const fetchEquipmentItems = async (): Promise<EquipmentItem[]> => {
  const { data, error } = await supabase
    .from("equipment_items")
    .select("id, name, image_url")
    .eq("is_active", true)
    .order("display_order");
  if (error) throw error;
  return data || [];
};

/** Sitewide "what jamaah receive" catalog - not per-package, since packages never stored real per-package equipment. */
export const useEquipmentItems = () => {
  return useQuery({
    queryKey: ["equipment-items"],
    queryFn: fetchEquipmentItems,
    staleTime: 5 * 60 * 1000,
  });
};
