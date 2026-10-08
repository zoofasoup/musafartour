import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { translateAuthError } from "@/lib/authErrors";
import { takeAgentReferral } from "@/lib/agentReferral";

interface Agent {
  id: string;
  user_id: string;
  email: string;
  phone: string;
  wa_number: string | null;
  name: string;
  level: 'silver' | 'gold' | 'platinum';
  total_sales: number;
  total_commission: number;
  available_balance: number;
  referral_code: string;
  referred_by_id: string | null;
  bank_name: string | null;
  bank_account: string | null;
  account_name: string | null;
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
  approved_at: string | null;
  // SOP: registration fee (unpaid / paid / waived) and acceptance of the agent SOP
  registration_fee_status?: 'unpaid' | 'paid' | 'waived';
  registration_fee_paid_at?: string | null;
  sop_accepted_at?: string | null;
  sop_version?: string | null;
  // Onboarding fields
  agency_name?: string | null;
  ktp_number?: string | null;
  ktp_image_url?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  social_links?: any;
  experience_level?: string | null;
}

interface AgentAuthContextType {
  user: User | null;
  session: Session | null;
  agent: Agent | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; needsEmailConfirmation?: boolean }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshAgent: () => void;
  updateAgentProfile: (data: Partial<Agent>) => Promise<{ success: boolean; error?: string }>;
}

interface SignUpData {
  name: string;
  email: string;
  phone: string;
  wa_number: string;
  password: string;
  referral_code?: string;
}

const AgentAuthContext = createContext<AgentAuthContextType | undefined>(undefined);

export const useAgentAuth = () => {
  const context = useContext(AgentAuthContext);
  if (!context) {
    throw new Error("useAgentAuth must be used within an AgentAuthProvider");
  }
  return context;
};

// Creates (or returns) the agents row for the logged-in user. Runs server-side because the row
// can only be created once the user has a session (RLS: auth.uid() = user_id), and the server
// reads the signup data from the user's own metadata. Idempotent.
const registerAgentProfile = async (): Promise<{ agent: Agent | null; error?: string }> => {
  const { data, error } = await supabase.rpc('register_agent_profile');
  if (error) {
    console.error("Error registering agent profile:", error);
    return {
      agent: null,
      error: error.code === 'P0001' ? error.message : 'Gagal menyiapkan profil agen. Silakan coba lagi.',
    };
  }
  return { agent: (data as unknown as Agent) ?? null };
};

// A Google sign-up has no referral code in its metadata, so the register page remembered ?ref= in sessionStorage.
// Once the agents row exists, hand the code to the database, which attributes it only for an active other agent and
// only while the row has no referrer. Always silent: a wrong or stale code must never get in the way of logging in.
const applyRememberedReferrer = async (agent: Agent): Promise<void> => {
  const code = takeAgentReferral();
  if (!code || agent.referred_by_id) return;
  const { error } = await supabase.rpc('set_agent_referrer', { _code: code });
  if (error) console.error("set_agent_referrer failed:", error);
};

export const AgentAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_OUT') {
          queryClient.removeQueries({ queryKey: ['agent-profile'] });
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // Fetch agent profile
  const { data: agent, refetch: refreshAgent, status: agentQueryStatus } = useQuery({
    queryKey: ['agent-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Signed in but no agents row yet (first login after email confirmation, or Google sign-in).
      // This provider wraps the whole app, so only run it on agent pages: otherwise every jamaah
      // or admin who logs in would get an agent row (and an admin "new agent" alert).
      // /agent/register is skipped so a half-finished sign-up never creates a row by itself.
      const path = window.location.pathname;
      const onAgentPage = path.startsWith("/agent") && !path.startsWith("/agent/register");
      if (!data && !error && user.email && onAgentPage) {
        const created = await registerAgentProfile();
        if (created.agent) {
          await applyRememberedReferrer(created.agent);
          return created.agent;
        }
      }

      if (error) {
        console.error("Error fetching agent profile:", error);
        // A failed refresh must not replace a good cached profile with null: that would bounce a signed-in agent to the login page.
        if (queryClient.getQueryData(['agent-profile', user.id])) throw error;
        return null;
      }

      if (data) await applyRememberedReferrer(data as Agent);
      return data as Agent | null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const signUp = async (data: SignUpData): Promise<{ success: boolean; error?: string }> => {
    try {
      // The agents row is NOT created here: with email confirmation on there is no session yet, so
      // RLS would reject it. The form data travels in user_metadata and register_agent_profile()
      // turns it into the row on first login. Duplicate/referral checks happen there too (anon
      // cannot read agents, so checking from the browser never worked).
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          emailRedirectTo: window.location.origin + '/agent/login',
          data: {
            full_name: data.name.trim(),
            phone: data.phone,
            wa_number: data.wa_number || data.phone,
            referral_code: (data.referral_code || '').trim().toUpperCase(),
            agent_signup: true,
          },
        },
      });

      if (authError) {
        console.error("Auth signup error:", authError);
        return { success: false, error: translateAuthError(authError) };
      }

      if (!authData.user) {
        return { success: false, error: 'Gagal membuat akun. Silakan coba lagi.' };
      }

      // Supabase hides existing emails: it returns a user with no identities instead of an error.
      if (authData.user.identities && authData.user.identities.length === 0) {
        return { success: false, error: translateAuthError({ code: 'user_already_exists' }) };
      }

      // Make sure no session lingers: the user logs in after confirming the email.
      if (authData.session) {
        await supabase.auth.signOut();
      }

      return { success: true };
    } catch (error) {
      console.error("Sign up error:", error);
      return { success: false, error: translateAuthError(error) };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string; needsEmailConfirmation?: boolean }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const needsEmailConfirmation = error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message);
        return { success: false, error: translateAuthError(error), needsEmailConfirmation };
      }

      if (!data.user) {
        return { success: false, error: 'Login gagal. Silakan coba lagi.' };
      }

      // Check if user is an admin - admins should use admin portal
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (adminRole) {
        await supabase.auth.signOut();
        return { success: false, error: 'Akun ini adalah akun Admin. Silakan login di halaman Admin (/auth)' };
      }

      // Check if user has an agent profile
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('status')
        .eq('user_id', data.user.id)
        .maybeSingle();

      let status: Agent['status'] | undefined = agentData?.status as Agent['status'] | undefined;

      // First login after email confirmation: the row does not exist yet, create it server-side
      // from the signup metadata instead of turning the user away.
      if (!agentError && !agentData) {
        const created = await registerAgentProfile();
        if (!created.agent) {
          await supabase.auth.signOut();
          return { success: false, error: created.error || 'Gagal menyiapkan profil agen. Silakan coba lagi.' };
        }
        status = created.agent.status;
        queryClient.setQueryData(['agent-profile', data.user.id], created.agent);
      } else if (agentError) {
        await supabase.auth.signOut();
        return { success: false, error: 'Gagal memuat akun agen. Silakan coba lagi.' };
      }

      // 'pending' agents are allowed in: they must reach /agent/onboarding to submit KTP and
      // address. AgentProtectedRoute shows the "Menunggu Persetujuan" screen after that.
      if (status === 'suspended') {
        await supabase.auth.signOut();
        return { success: false, error: 'Akun kamu telah dinonaktifkan. Hubungi admin untuk informasi lebih lanjut' };
      }

      return { success: true };
    } catch (error) {
      console.error("Sign in error:", error);
      return { success: false, error: translateAuthError(error) };
    }
  };

  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/agent/login',
        }
      });

      if (error) {
        return { success: false, error: translateAuthError(error) };
      }

      return { success: true };
    } catch (error) {
      console.error("Google sign in error:", error);
      return { success: false, error: translateAuthError(error) };
    }
  };

  const updateAgentProfile = async (data: Partial<Agent>): Promise<{ success: boolean; error?: string }> => {
    if (!agent?.id) return { success: false, error: 'User tidak ditemukan' };
    
    try {
      const { error } = await supabase
        .from('agents')
        .update(data)
        .eq('id', agent.id);

      if (error) throw error;
      
      refreshAgent();
      return { success: true };
    } catch (error: any) {
      console.error("Error updating agent profile:", error);
      return { success: false, error: error.message || 'Gagal menyimpan profil' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.removeQueries({ queryKey: ['agent-profile'] });
  };

  const isAgentPending = !!user?.id && agentQueryStatus === 'pending';
  const isFullyLoaded = !loading && !isAgentPending;

  return (
    <AgentAuthContext.Provider
      value={{
        user,
        session,
        agent: agent ?? null,
        loading: !isFullyLoaded,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshAgent,
        updateAgentProfile,
      }}
    >
      {children}
    </AgentAuthContext.Provider>
  );
};
