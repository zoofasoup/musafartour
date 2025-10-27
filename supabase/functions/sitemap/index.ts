import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const baseUrl = 'https://musafartour.com';
    
    // Static pages with priority and change frequency
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/paket-umroh', priority: '0.9', changefreq: 'daily' },
      { url: '/wisata-halal', priority: '0.8', changefreq: 'weekly' },
      { url: '/haji-khusus', priority: '0.8', changefreq: 'weekly' },
      { url: '/jadwal-umroh', priority: '0.9', changefreq: 'daily' },
      { url: '/tentang-kami', priority: '0.7', changefreq: 'monthly' },
      { url: '/galeri', priority: '0.6', changefreq: 'weekly' },
      { url: '/kontak', priority: '0.7', changefreq: 'monthly' },
      { url: '/artikel', priority: '0.8', changefreq: 'weekly' },
    ];

    // Fetch published articles
    const { data: articles } = await supabase
      .from('articles')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false });

    // Fetch published packages
    const { data: packages } = await supabase
      .from('packages')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false });

    // Generate XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add static pages
    staticPages.forEach(page => {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    // Add article pages
    if (articles) {
      articles.forEach(article => {
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/artikel/${article.slug}</loc>\n`;
        xml += `    <lastmod>${new Date(article.updated_at).toISOString().split('T')[0]}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.7</priority>\n';
        xml += '  </url>\n';
      });
    }

    // Add package pages
    if (packages) {
      packages.forEach(pkg => {
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/paket/${pkg.slug}</loc>\n`;
        xml += `    <lastmod>${new Date(pkg.updated_at).toISOString().split('T')[0]}</lastmod>\n`;
        xml += '    <changefreq>daily</changefreq>\n';
        xml += '    <priority>0.9</priority>\n';
        xml += '  </url>\n';
      });
    }

    xml += '</urlset>';

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
