import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface JamaahAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /**
   * `redirect` is the post-auth destination (e.g. "/booking/baru/<id>"), the
   * same value JamaahAuth threads through its ?redirect= search param. It is
   * carried into emailRedirectTo so a confirmation link returns the jamaah to
   * the booking they were in the middle of.
   *
   * Resolves with `needsEmailConfirmation`: Supabase returns a live session
   * from signUp when the project has email confirmation disabled, and null
   * when it is required. The caller has to branch on this - assuming
   * confirmation is always required shows a "check your email" message to
   * someone who is in fact already signed in.
   */
  signUp: (
    email: string,
    password: string,
    fullName: string,
    redirect?: string | null,
  ) => Promise<{ success: boolean; error?: string; needsEmailConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const JamaahAuthContext = createContext<JamaahAuthContextType | undefined>(undefined);

export const useJamaahAuth = () => {
  const context = useContext(JamaahAuthContext);
  if (!context) {
    throw new Error("useJamaahAuth must be used within a JamaahAuthProvider");
  }
  return context;
};

export const JamaahAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    redirect?: string | null,
  ) => {
    // Without emailRedirectTo the confirmation link falls back to the Supabase
    // project's generic Site URL, dropping the jamaah on the homepage instead
    // of back into the booking they started. useAgentAuth already sets one.
    const returnTo =
      window.location.origin +
      "/jamaah/auth" +
      (redirect ? `?redirect=${encodeURIComponent(redirect)}` : "");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: returnTo },
    });
    if (error) return { success: false, error: error.message };

    // No session back => the project requires email confirmation.
    return { success: true, needsEmailConfirmation: !data.session };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <JamaahAuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </JamaahAuthContext.Provider>
  );
};
