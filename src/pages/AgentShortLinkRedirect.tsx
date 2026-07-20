import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

/** Resolves an agent's own promotional short link (AgentMarketingKit generates /l/{code} links) - previously had no matching route, so these links never worked and click_count never moved. */
const AgentShortLinkRedirect = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleRedirect = async () => {
      if (!code) {
        setError('Link tidak valid');
        return;
      }

      try {
        const { data: redirectUrl, error: fetchError } = await supabase.rpc('redirect_agent_short_link', {
          _code: code,
        });

        if (fetchError || !redirectUrl) {
          setError('Link tidak ditemukan');
          return;
        }

        if (redirectUrl.startsWith('/')) {
          navigate(redirectUrl, { replace: true });
        } else if (redirectUrl.includes(window.location.host)) {
          const url = new URL(redirectUrl);
          navigate(url.pathname + url.search, { replace: true });
        } else {
          window.location.href = redirectUrl;
        }
      } catch (err) {
        console.error('Agent short link redirect error:', err);
        setError('Terjadi kesalahan');
      }
    };

    handleRedirect();
  }, [code, navigate]);

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

export default AgentShortLinkRedirect;
