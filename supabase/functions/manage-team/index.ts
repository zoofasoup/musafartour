import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

    // Verify caller is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'superadmin'])
      .maybeSingle();

    if (roleError || !roleData) {
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
          last_sign_in_at: u.last_sign_in_at,
          confirmed_at: u.confirmed_at,
          invited_at: u.invited_at
        }));

      return new Response(JSON.stringify({ team: teamMembers }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // --- HANDLE POST (Invite Team Member) ---
    if (req.method === 'POST') {
      const { email, fullName, role, isResend } = await req.json();
      
      if (!email || (!isResend && !fullName) || !role) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const userExists = existingUsers.users.find(u => u.email === email);
      
      let newUserId;

      if (userExists && !isResend) {
        // If user already exists, just assign the role
        newUserId = userExists.id;
      } else {
        // Invite new user OR resend invite
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: { full_name: fullName || userExists?.user_metadata?.full_name, name: fullName || userExists?.user_metadata?.name },
          redirectTo: 'https://musafartour.com/set-password'
        });
        if (inviteError) throw inviteError;
        newUserId = inviteData.user.id;
      }

      // Update or insert role safely without relying on UNIQUE constraints
      const { data: existingRole, error: checkError } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', newUserId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingRole) {
        const { error: updateError } = await supabaseAdmin
          .from('user_roles')
          .update({ role: role })
          .eq('user_id', newUserId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: newUserId, role: role });
        if (insertError) throw insertError;
      }

      return new Response(JSON.stringify({ success: true, message: 'User invited successfully' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // --- HANDLE PUT (Change Role) ---
    if (req.method === 'PUT') {
      const { userId, role } = await req.json();
      
      if (!userId || !role) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Ensure they cannot demote themselves accidentally
      if (userId === user.id && role !== 'superadmin' && roleData?.role === 'superadmin') {
        return new Response(JSON.stringify({ error: 'Kamu tidak bisa menurunkan peran Super Admin dirimu sendiri' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Never leave the system without a superadmin.
      if (role !== 'superadmin') {
        const { data: targetRoles, error: targetError } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);
        if (targetError) throw targetError;
        if (targetRoles?.some((r) => r.role === 'superadmin')) {
          const { count: superadminCount, error: countError } = await supabaseAdmin
            .from('user_roles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'superadmin');
          if (countError) throw countError;
          if ((superadminCount ?? 0) <= 1) {
            return new Response(JSON.stringify({ error: 'Super Admin terakhir tidak bisa diturunkan perannya' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from('user_roles')
        .update({ role: role })
        .eq('user_id', userId);
        
      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true, message: 'Role updated successfully' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // --- HANDLE DELETE (Remove Access) ---
    // Only removes the person's admin roles (user_roles rows). The auth account is NEVER deleted:
    // the same person may be an agent, may hold other data, and can be given a role again later.
    if (req.method === 'DELETE') {
      const { userId } = await req.json();

      if (!userId) {
        return new Response(JSON.stringify({ error: 'Missing user ID' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (userId === user.id) {
        return new Response(JSON.stringify({ error: 'Kamu tidak bisa mencabut akses dirimu sendiri' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: targetRoles, error: targetError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      if (targetError) throw targetError;

      if (!targetRoles || targetRoles.length === 0) {
        // Nothing to remove (already removed): report success so a double click is harmless.
        return new Response(JSON.stringify({ success: true, message: 'Akses sudah dicabut' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (targetRoles.some((r) => r.role === 'superadmin')) {
        // Only a superadmin may remove another superadmin, and the last one can never be removed.
        const callerIsSuperadmin = roleData.role === 'superadmin';
        if (!callerIsSuperadmin) {
          return new Response(JSON.stringify({ error: 'Hanya Super Admin yang bisa mencabut akses Super Admin lain' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { count: superadminCount, error: countError } = await supabaseAdmin
          .from('user_roles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'superadmin');
        if (countError) throw countError;
        if ((superadminCount ?? 0) <= 1) {
          return new Response(JSON.stringify({ error: 'Super Admin terakhir tidak bisa dicabut aksesnya' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      const { error: deleteError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ success: true, message: 'Akses admin dicabut. Akun tetap ada.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Manage team error:', error);
    // Return 200 OK so the frontend can read the JSON error body
    return new Response(JSON.stringify({ success: false, error: error.message || 'Internal server error' }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
