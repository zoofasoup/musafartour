import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching current hero image URL...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the active hero section
    const { data: heroData, error } = await supabase
      .from('hero_section')
      .select('background_image')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching hero data:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch hero data', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!heroData?.background_image) {
      console.log('No hero image found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          heroImageUrl: null,
          preloadTag: null,
          message: 'No hero image configured' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const heroImageUrl = heroData.background_image;
    
    // Generate the preload tag for index.html
    const preloadTag = `<link rel="preload" as="image" href="${heroImageUrl}" fetchpriority="high" type="image/webp" imagesrcset="${heroImageUrl} 1920w" imagesizes="100vw" />`;

    console.log('Hero image URL:', heroImageUrl);

    return new Response(
      JSON.stringify({
        success: true,
        heroImageUrl,
        preloadTag,
        instructions: 'Copy the preloadTag value and replace the existing hero preload link in index.html (line 25) for optimal LCP performance.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
