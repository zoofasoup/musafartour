import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // 1. Validate authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');

    // 2. Initialize Supabase Admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Verify user and check if they are superadmin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: userRoleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
      
    if (roleError || (userRoleData?.role !== 'superadmin' && userRoleData?.role !== 'admin')) {
      return new Response(JSON.stringify({ error: 'Forbidden: Only superadmins can manage team' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- HANDLE GET (List Team Members) ---
    if (req.method === 'GET') {
      // Fetch all users
      const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
      if (usersError) throw usersError;

      // Fetch all roles
      const { data: rolesData, error: rolesListError } = await supabaseAdmin
        .from('user_roles')
        .select('*');
      if (rolesListError) throw rolesListError;

      // Map roles by user_id
      const roleMap = new Map();
      rolesData.forEach(r => roleMap.set(r.user_id, r.role));

      // Combine them (only returning users that have an admin role)
      const teamMembers = usersData.users
        .filter(u => roleMap.has(u.id)) // Only show users who have an entry in user_roles
        .map(u => ({
          id: u.id,
          email: u.email,
          full_name: u.user_metadata?.full_name || u.user_metadata?.name || 'Unknown',
          role: roleMap.get(u.id),
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at
        }));

      return new Response(JSON.stringify({ team: teamMembers }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // --- HANDLE POST (Invite Team Member) ---
    if (req.method === 'POST') {
      const { email, fullName, role } = await req.json();
      
      if (!email || !fullName || !role) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const userExists = existingUsers.users.find(u => u.email === email);
      
      let newUserId;

      if (userExists) {
        // If user already exists, just assign the role
        newUserId = userExists.id;
      } else {
        // Invite new user
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: { full_name: fullName, name: fullName }
        });
        if (inviteError) throw inviteError;
        newUserId = inviteData.user.id;
      }

      // Upsert role
      const { error: upsertError } = await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: newUserId, role: role }, { onConflict: 'user_id' });
        
      if (upsertError) throw upsertError;

      return new Response(JSON.stringify({ success: true, message: 'User invited successfully' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Manage team error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
