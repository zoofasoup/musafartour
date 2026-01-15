import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Agent {
  id: string;
  user_id: string;
  email: string;
  phone: string;
  wa_number: string | null;
  name: string;
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
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
}

interface AgentAuthContextType {
  user: User | null;
  session: Session | null;
  agent: Agent | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshAgent: () => void;
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

// Generate referral code
const generateReferralCode = async (): Promise<string> => {
  const { data, error } = await supabase.rpc('generate_referral_code');
  if (error) {
    // Fallback to client-side generation
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'MUS-';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  return data as string;
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

      if (error) {
        console.error("Error fetching agent profile:", error);
        return null;
      }

      return data as Agent | null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const signUp = async (data: SignUpData): Promise<{ success: boolean; error?: string }> => {
    try {
      // Check if email already exists in agents table
      const { data: existingAgent } = await supabase
        .from('agents')
        .select('email')
        .eq('email', data.email)
        .maybeSingle();

      if (existingAgent) {
        return { success: false, error: 'Email sudah terdaftar sebagai agent' };
      }

      // Check if phone already exists
      const { data: existingPhone } = await supabase
        .from('agents')
        .select('phone')
        .eq('phone', data.phone)
        .maybeSingle();

      if (existingPhone) {
        return { success: false, error: 'Nomor telepon sudah terdaftar' };
      }

      // Look up referrer if referral code provided
      let referrerId: string | null = null;
      if (data.referral_code) {
        const { data: referrer } = await supabase
          .from('agents')
          .select('id')
          .eq('referral_code', data.referral_code)
          .eq('status', 'active')
          .maybeSingle();

        if (referrer) {
          referrerId = referrer.id;
        }
      }

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: window.location.origin + '/agent/login',
        }
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Gagal membuat akun' };
      }

      // Generate unique referral code
      const referralCode = await generateReferralCode();

      // Create agent profile
      const { error: agentError } = await supabase
        .from('agents')
        .insert({
          user_id: authData.user.id,
          email: data.email,
          phone: data.phone,
          wa_number: data.wa_number || data.phone,
          name: data.name,
          referral_code: referralCode,
          referred_by_id: referrerId,
          status: 'pending',
        });

      if (agentError) {
        console.error("Error creating agent profile:", agentError);
        // If agent creation fails, we should clean up the auth user
        // But we can't delete auth users from client, so just return error
        return { success: false, error: 'Gagal membuat profil agent: ' + agentError.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Sign up error:", error);
      return { success: false, error: 'Terjadi kesalahan saat pendaftaran' };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Login gagal' };
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

      if (agentError || !agentData) {
        await supabase.auth.signOut();
        return { success: false, error: 'Akun agent tidak ditemukan. Silakan daftar terlebih dahulu.' };
      }

      if (agentData.status === 'pending') {
        await supabase.auth.signOut();
        return { success: false, error: 'Akun Anda masih menunggu approval dari admin' };
      }

      if (agentData.status === 'suspended') {
        await supabase.auth.signOut();
        return { success: false, error: 'Akun Anda telah dinonaktifkan. Hubungi admin untuk informasi lebih lanjut' };
      }

      return { success: true };
    } catch (error) {
      console.error("Sign in error:", error);
      return { success: false, error: 'Terjadi kesalahan saat login' };
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
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Google sign in error:", error);
      return { success: false, error: 'Terjadi kesalahan saat login dengan Google' };
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
        refreshAgent: () => refreshAgent(),
      }}
    >
      {children}
    </AgentAuthContext.Provider>
  );
};
