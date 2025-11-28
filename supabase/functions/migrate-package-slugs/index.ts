import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Package {
  id: string
  package_name: string
  departure_date: string
  slug: string | null
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // === AUTHENTICATION CHECK ===
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      console.log('Invalid token or user not found:', authError?.message)
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has admin role
    const { data: adminRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (roleError || !adminRole) {
      console.log(`User ${user.id} attempted admin action without admin role`)
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Admin ${user.id} initiated package slug migration`)
    // === END AUTHENTICATION CHECK ===

    console.log('Fetching all packages...')
    
    // Fetch all packages
    const { data: packages, error: fetchError } = await supabaseClient
      .from('packages')
      .select('id, package_name, departure_date, slug')
      .order('departure_date', { ascending: true })

    if (fetchError) {
      console.error('Error fetching packages:', fetchError)
      throw fetchError
    }

    if (!packages || packages.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No packages found', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${packages.length} packages to process`)

    const generateSlug = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
    }

    const formatDateToDDMMMYYYY = (dateString: string): string => {
      const date = new Date(dateString)
      const day = String(date.getDate()).padStart(2, '0')
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des']
      const month = monthNames[date.getMonth()]
      const year = date.getFullYear()
      return `${day}-${month}-${year}`
    }

    const usedSlugs = new Set<string>()
    const updates: Array<{ id: string; oldSlug: string | null; newSlug: string }> = []

    // Generate new slugs for all packages
    for (const pkg of packages as Package[]) {
      const baseSlug = generateSlug(pkg.package_name)
      const formattedDate = formatDateToDDMMMYYYY(pkg.departure_date)
      let newSlug = `${baseSlug}-${formattedDate}`

      // Handle duplicates
      let counter = 2
      while (usedSlugs.has(newSlug)) {
        newSlug = `${baseSlug}-${formattedDate}-${counter}`
        counter++
      }

      usedSlugs.add(newSlug)
      updates.push({
        id: pkg.id,
        oldSlug: pkg.slug,
        newSlug: newSlug
      })
    }

    console.log('Updating packages with new slugs...')

    // Update each package
    let successCount = 0
    let errorCount = 0

    for (const update of updates) {
      const { error: updateError } = await supabaseClient
        .from('packages')
        .update({ slug: update.newSlug })
        .eq('id', update.id)

      if (updateError) {
        console.error(`Error updating package ${update.id}:`, updateError)
        errorCount++
      } else {
        console.log(`Updated: ${update.oldSlug || 'null'} → ${update.newSlug}`)
        successCount++
      }
    }

    const result = {
      message: 'Migration completed',
      total: packages.length,
      updated: successCount,
      failed: errorCount,
      updates: updates
    }

    console.log('Migration summary:', result)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Migration error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
