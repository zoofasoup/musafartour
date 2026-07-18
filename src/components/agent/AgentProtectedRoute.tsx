import { Skeleton } from "@/components/ui/skeleton";
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { Loader2 } from "lucide-react";
import AgentLayout from "./AgentLayout";

interface AgentProtectedRouteProps {
  children: ReactNode;
}

const AgentProtectedRoute = ({ children }: AgentProtectedRouteProps) => {
  const { user, agent, loading } = useAgentAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <Skeleton className="h-4 w-32 mt-4" />
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/agent/login" state={{ from: location }} replace />;
  }

  // No agent profile found
  if (!agent) {
    return <Navigate to="/agent/login" state={{ from: location }} replace />;
  }

  const isFullyOnboarded = !!(agent.ktp_number && agent.ktp_image_url && agent.address);
  const isOnboardingPage = location.pathname === '/agent/onboarding';

  // If not fully onboarded, force redirect to onboarding page
  if (!isFullyOnboarded && !isOnboardingPage) {
    return <Navigate to="/agent/onboarding" replace />;
  }

  // Agent not active
  if (agent.status === 'pending' && !isOnboardingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Menunggu Persetujuan</h1>
          <p className="text-muted-foreground mb-6">
            Akun Anda masih dalam proses verifikasi oleh admin. Kami akan menghubungi Anda setelah akun diaktifkan.
          </p>
          <a 
            href="/agent/login" 
            className="text-primary hover:underline"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = '/agent/login';
            }}
          >
            Kembali ke halaman login
          </a>
        </div>
      </div>
    );
  }

  if (agent.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Akun Dinonaktifkan</h1>
          <p className="text-muted-foreground mb-6">
            Akun Anda telah dinonaktifkan. Silakan hubungi admin untuk informasi lebih lanjut.
          </p>
        </div>
      </div>
    );
  }

  // If it's the onboarding page, render without the AgentLayout sidebar
  if (isOnboardingPage) {
    return <>{children}</>;
  }

  return <AgentLayout>{children}</AgentLayout>;
};

export default AgentProtectedRoute;
