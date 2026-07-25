import { createClient } from "@supabase/supabase-js";
import type { Config } from "./types";

export function createServiceClient(config: Config) {
  return createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false },
  });
}
