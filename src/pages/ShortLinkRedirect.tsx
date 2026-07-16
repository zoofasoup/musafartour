import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const ShortLinkRedirect = () => {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleRedirect = async () => {
      if (!code) {
        setError('Link tidak valid');
        return;
      }

      try {
        // Fetch the short link
        const { data: link, error: fetchError } = await supabase
          .from('short_links')
          .select('*')
          .eq('short_code', code)
          .eq('is_active', true)
          .single();

        if (fetchError || !link) {
          setError('Link tidak ditemukan atau sudah tidak aktif');
          return;
        }

        // Check expiration
        if (link.expires_at && new Date(link.expires_at) < new Date()) {
          setError('Link sudah kadaluarsa');
          return;
        }

        // Record click
        const utmSource = searchParams.get('utm_source') || '';
        const utmMedium = searchParams.get('utm_medium') || '';
        const utmCampaign = searchParams.get('utm_campaign') || '';

        // Insert click record (don't await to speed up redirect)
        supabase
          .from('short_link_clicks')
          .insert({
            link_id: link.id,
            user_agent: navigator.userAgent.substring(0, 500),
            referer: document.referrer.substring(0, 500),
            utm_source: utmSource,
            utm_medium: utmMedium,
            utm_campaign: utmCampaign,
          })
          .then(() => {
            // Update click count
            supabase
              .from('short_links')
              .update({ click_count: link.click_count + 1 })
              .eq('id', link.id);
          });

        // Build redirect URL with UTM params
        let redirectUrl = link.original_url;
        const additionalParams = new URLSearchParams();
        
        if (utmSource) additionalParams.set('utm_source', utmSource);
        if (utmMedium) additionalParams.set('utm_medium', utmMedium);
        if (utmCampaign) additionalParams.set('utm_campaign', utmCampaign);
        
        if (additionalParams.toString()) {
          const separator = redirectUrl.includes('?') ? '&' : '?';
          redirectUrl += separator + additionalParams.toString();
        }

        // Check if it's an internal or external link
        if (redirectUrl.startsWith('/')) {
          navigate(redirectUrl, { replace: true });
        } else if (redirectUrl.includes('musafartour.com')) {
          // Internal link with full URL
          const url = new URL(redirectUrl);
          navigate(url.pathname + url.search, { replace: true });
        } else {
          // External link
          window.location.href = redirectUrl;
        }
      } catch (err) {
        console.error('Redirect error:', err);
        setError('Terjadi kesalahan');
      }
    };

    handleRedirect();
  }, [code, navigate, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Oops!</h1>
          <p className="text-muted-foreground">{error}</p>
          <a 
            href="/"
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Kembali ke Beranda
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Mengalihkan...</p>
      </div>
    </div>
  );
};

export default ShortLinkRedirect;
