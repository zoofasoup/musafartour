import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

let version = Date.now();
const listeners = new Set<() => void>();

/** Call after a photo was set or removed: every avatar on screen (header, profile) reloads. */
export function bumpAvatarVersion() {
  version = Date.now();
  listeners.forEach((l) => l());
}

/** The current picture version; changes when bumpAvatarVersion() is called. */
export const useAvatarVersion = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version
  );

/** Where an agent's profile photo lives. The file may not exist yet; an <img> that fails to load shows the initial instead. */
export function agentAvatarUrl(agentId: string, v: number = version): string {
  const { data } = supabase.storage.from("marketing-materials").getPublicUrl(`${agentId}/avatar.jpg`);
  return `${data.publicUrl}?v=${v}`;
}

export const agentAvatarPath = (agentId: string) => `${agentId}/avatar.jpg`;
