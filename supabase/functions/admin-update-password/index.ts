import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Verify the caller is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Verify the caller: owner (admin, superadmin) may reset anyone; agent_admin may reset AGENT accounts only (ADM-116)
    const { data: callerRoles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'superadmin', 'agent_admin'])

    if (roleError || !callerRoles || callerRoles.length === 0) {
      throw new Error('Forbidden: Requires admin or agent_admin role')
    }
    const isOwner = callerRoles.some((r: { role: string }) => r.role === 'admin' || r.role === 'superadmin')

    const { userId, newPassword } = await req.json()
    if (!userId || !newPassword) {
      throw new Error('Missing required fields')
    }

    // Create a client with the SERVICE_ROLE_KEY to perform the update
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (!isOwner) {
      // agent_admin: the target must be an agent login and must not hold any staff role
      const { data: agentRow } = await supabaseAdmin.from('agents').select('id').eq('user_id', userId).maybeSingle()
      const { data: staffRow } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId).limit(1)
      if (!agentRow || (staffRow && staffRow.length > 0)) {
        throw new Error('Forbidden: agent_admin can only reset passwords of agent accounts')
      }
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (updateError) {
      throw updateError
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
