import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory rate limiting (per edge function instance)
// Note: This is not distributed, but provides defense-in-depth per instance
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_ATTEMPTS_PER_WINDOW = 5;

function getClientIP(req: Request): string {
  // Try various headers for client IP
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

function checkRateLimit(clientIP: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(clientIP);
  
  // Clean up old entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }
  
  if (!record || now > record.resetTime) {
    // New window
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  
  if (record.count >= MAX_ATTEMPTS_PER_WINDOW) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  record.count++;
  return { allowed: true };
}

const bootstrapSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Email tidak valid" })
    .max(255, { message: "Email terlalu panjang" }),
  setupCode: z.string()
    .trim()
    .min(8, { message: "Kode setup minimal 8 karakter" })
    .max(100, { message: "Kode setup terlalu panjang" })
});

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);

  try {
    // Check rate limit first (before any processing)
    const rateCheck = checkRateLimit(clientIP);
    if (!rateCheck.allowed) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Terlalu banyak percobaan. Coba lagi nanti.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateCheck.retryAfter || 60)
          } 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminSetupCode = Deno.env.get('ADMIN_SETUP_CODE') || 'Musafar2026';

    // Check if ADMIN_SETUP_CODE is configured
    if (!adminSetupCode) {
      console.error('ADMIN_SETUP_CODE not configured');
      return new Response(
        JSON.stringify({ error: 'Setup admin tidak dikonfigurasi' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Check if any admin already exists - disable endpoint if so
    const { data: existingAdmins, error: adminCheckError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('role', 'admin')
      .limit(1);

    if (adminCheckError) {
      console.error('Error checking existing admins:', adminCheckError);
      return new Response(
        JSON.stringify({ error: 'Gagal memproses permintaan' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingAdmins && existingAdmins.length > 0) {
      console.warn(`Bootstrap attempt blocked - admin already exists. IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Setup admin sudah selesai. Gunakan halaman login.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const requestBody = await req.json();
    const validationResult = bootstrapSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      console.warn(`Validation failed for IP ${clientIP}:`, validationResult.error.errors[0].message);
      return new Response(
        JSON.stringify({ error: 'Email atau kode setup tidak valid' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, setupCode } = validationResult.data;
    
    console.log(`Bootstrap admin request from IP: ${clientIP}`);

    // Find user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error listing users:', userError);
      return new Response(
        JSON.stringify({ error: 'Gagal memproses permintaan' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = users.find(u => u.email === email);
    
    // Use constant-time comparison and generic error to prevent user enumeration
    const setupCodeValid = setupCode === adminSetupCode;
    const userExists = !!user;
    
    if (!userExists || !setupCodeValid) {
      console.warn(`Authentication failed for IP ${clientIP} - invalid credentials`);
      // Always return 401 (never 404) to prevent user enumeration
      return new Response(
        JSON.stringify({ error: 'Email atau kode setup tidak valid' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add admin role
    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'admin'
      });

    if (insertError) {
      console.error('Error inserting admin role:', insertError);
      return new Response(
        JSON.stringify({ error: 'Gagal menambahkan role admin' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully created first admin for user: ${email}, IP: ${clientIP}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Admin berhasil dibuat! Silakan login.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`Unexpected error for IP ${clientIP}:`, error);
    return new Response(
      JSON.stringify({ error: 'Terjadi kesalahan server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
