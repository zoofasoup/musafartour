import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const shortCode = pathParts[pathParts.length - 1];

    if (!shortCode) {
      return new Response(
        JSON.stringify({ error: 'Short code required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for unrestricted access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up the short link
    const { data: link, error } = await supabase
      .from('short_links')
      .select('*')
      .eq('short_code', shortCode)
      .eq('is_active', true)
      .single();

    if (error || !link) {
      console.log(`Short link not found: ${shortCode}`);
      return new Response(
        JSON.stringify({ error: 'Link not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      console.log(`Short link expired: ${shortCode}`);
      return new Response(
        JSON.stringify({ error: 'Link has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract analytics data
    const userAgent = req.headers.get('user-agent') || '';
    const referer = req.headers.get('referer') || '';
    
    // Get UTM params from query string
    const utmSource = url.searchParams.get('utm_source') || '';
    const utmMedium = url.searchParams.get('utm_medium') || '';
    const utmCampaign = url.searchParams.get('utm_campaign') || '';

    // Hash IP for privacy
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const encoder = new TextEncoder();
    const data = encoder.encode(clientIP + new Date().toDateString());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const ipHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);

    // Record click asynchronously (don't await to speed up redirect)
    supabase
      .from('short_link_clicks')
      .insert({
        link_id: link.id,
        user_agent: userAgent.substring(0, 500),
        referer: referer.substring(0, 500),
        ip_hash: ipHash,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      })
      .then(() => {
        // Update click count
        supabase
          .from('short_links')
          .update({ click_count: link.click_count + 1 })
          .eq('id', link.id)
          .then(() => console.log(`Click recorded for ${shortCode}`));
      });

    console.log(`Redirecting ${shortCode} to ${link.original_url}`);

    // Build redirect URL with any additional query params
    let redirectUrl = link.original_url;
    const additionalParams = new URLSearchParams();
    
    // Pass through UTM params if they exist
    if (utmSource) additionalParams.set('utm_source', utmSource);
    if (utmMedium) additionalParams.set('utm_medium', utmMedium);
    if (utmCampaign) additionalParams.set('utm_campaign', utmCampaign);
    
    if (additionalParams.toString()) {
      const separator = redirectUrl.includes('?') ? '&' : '?';
      redirectUrl += separator + additionalParams.toString();
    }

    // Return redirect response
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
