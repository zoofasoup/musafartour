import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const payload = {
    package_name: "Test Package",
    slug: "test-package",
    departure_date: "2026-09-16",
    duration_days: 9,
    flight: "Garuda Indonesia",
    flight_type: "direct",
    available_tiers: ["hemat"],
    status: "draft"
  };
  
  const { data, error } = await supabase
    .from("packages")
    .upsert(payload, { onConflict: "slug" });
    
  console.log("Upsert result:", { data, error });
}

test();
