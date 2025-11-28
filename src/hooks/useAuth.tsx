import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Use React Query for admin role check with caching
  const { data: isAdmin, status: adminQueryStatus } = useQuery({
    queryKey: ['admin-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        console.error("Error checking admin role:", error);
        return false;
      }

      return !!data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Only show loading on initial fetch when there's no cached data (status: 'pending')
  // Once we have data (status: 'success'), don't show loading even during background refetches
  const isAdminPending = !!user?.id && adminQueryStatus === 'pending';
  const isFullyLoaded = !loading && !isAdminPending;

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    session,
    loading: !isFullyLoaded,
    isAdmin: isAdmin ?? false,
    signOut,
  };
};
