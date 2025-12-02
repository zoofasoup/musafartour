import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useRedirects = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { data: redirects } = useQuery({
    queryKey: ['redirects'],
    queryFn: async () => {
      const { data } = await supabase
        .from('redirects')
        .select('*')
        .eq('is_active', true);
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  useEffect(() => {
    if (!redirects || redirects.length === 0) return;

    const currentPath = location.pathname;
    const redirect = redirects.find((r: any) => r.from_path === currentPath);

    if (redirect) {
      navigate(redirect.to_path, { replace: true });
    }
  }, [location.pathname, redirects, navigate]);
};
