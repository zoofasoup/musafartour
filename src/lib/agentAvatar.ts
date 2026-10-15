import { supabase } from "@/integrations/supabase/client";

const SESSION = Date.now();

/** Where an agent's profile photo lives. The file may not exist yet; an <img> that fails to load shows the initial instead. */
export function agentAvatarUrl(agentId: string, version: number = SESSION): string {
  const { data } = supabase.storage.from("marketing-materials").getPublicUrl(`${agentId}/avatar.jpg`);
  return `${data.publicUrl}?v=${version}`;
}
