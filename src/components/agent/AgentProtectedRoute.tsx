import { Skeleton } from "@/components/ui/skeleton";
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { Loader2 } from "lucide-react";
import AgentLayout from "./AgentLayout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { AGENT_CS_WHATSAPP } from "@/lib/agentSupport";

interface AgentProtectedRouteProps {
  children: ReactNode;
}

const AgentProtectedRoute = ({ children }: AgentProtectedRouteProps) => {
  const { user, agent, loading, signOut } = useAgentAuth();
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
  if ((agent.status === 'pending' && !isOnboardingPage) || agent.status === 'suspended') {
    const pending = agent.status === 'pending';
    const waText = encodeURIComponent(
      pending
        ? `Halo CS Musafar, saya ${agent.name} (kode ${agent.referral_code}). Mohon dicek persetujuan akun agen saya.`
        : `Halo CS Musafar, saya ${agent.name} (kode ${agent.referral_code}). Akun agen saya dinonaktifkan, mohon info lebih lanjut.`
    );
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-4">
            <StatusBadge kind={pending ? "warn" : "bad"}>{pending ? "Menunggu verifikasi" : "Dinonaktifkan"}</StatusBadge>
          </div>
          <h1 className="mb-2 text-2xl font-bold">{pending ? "Menunggu Persetujuan" : "Akun Dinonaktifkan"}</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            {pending
              ? "Data kamu sudah kami terima dan sedang diperiksa admin, biasanya 1-2 hari kerja. Kami kabari lewat WhatsApp begitu akun aktif."
              : "Akun agen kamu sedang dinonaktifkan. Hubungi CS untuk informasi lebih lanjut."}
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild variant="brand" className="w-full">
              <a href={`https://wa.me/${AGENT_CS_WHATSAPP}?text=${waText}`} target="_blank" rel="noopener noreferrer">
                Hubungi CS via WhatsApp
              </a>
            </Button>
            <Button variant="outline" className="w-full" onClick={() => signOut()}>
              Keluar
            </Button>
          </div>
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
