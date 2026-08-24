import type { BrowserWorker } from "@cloudflare/puppeteer";

export interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  MIDTRANS_SERVER_KEY: string;
  BROWSER: BrowserWorker;
}

// Fallback to the same public URL/anon key already shipped in the client JS
// bundle (see .env's VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY). These
// are not secrets - the anon key only grants what RLS already allows anyone -
// so the Function keeps working even if the Pages dashboard env vars are
// never configured, and only the dashboard values (if set) take precedence.
const FALLBACK_SUPABASE_URL = "https://lcpjuaxiwbdzdozitwzi.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjcGp1YXhpd2JkemRveml0d3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMDM4NDUsImV4cCI6MjA5OTY3OTg0NX0.vj42rEICtLaREhNm1f2HfgNKbfZonV46ZTrf5lvDFvA";

export function getSupabaseConfig(env: Env) {
  return {
    url: env.SUPABASE_URL || FALLBACK_SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY,
  };
}
