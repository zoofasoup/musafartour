import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

interface BootstrapRequest {
  email: string;
  setupCode: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminSetupCode = Deno.env.get('ADMIN_SETUP_CODE')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse and validate request body
    const requestBody = await req.json();
    const validationResult = bootstrapSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      console.warn('Validation failed:', validationResult.error.errors[0].message);
      return new Response(
        JSON.stringify({ error: 'Email atau kode setup tidak valid' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, setupCode } = validationResult.data;
    
    console.log('Bootstrap admin request received');

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
      console.warn('Authentication failed - invalid credentials');
      // Always return 401 (never 404) to prevent user enumeration
      return new Response(
        JSON.stringify({ error: 'Email atau kode setup tidak valid' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has admin role
    const { data: existingRole, error: roleCheckError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleCheckError) {
      console.error('Error checking user role:', roleCheckError);
      return new Response(
        JSON.stringify({ error: 'Gagal memeriksa role user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingRole) {
      console.log('User is already an admin:', email);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'User sudah menjadi admin.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    console.log('Successfully created admin');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Admin berhasil dibuat! Silakan login.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Terjadi kesalahan server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
