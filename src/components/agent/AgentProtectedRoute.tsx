import { Skeleton } from "@/components/ui/skeleton";
import { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { Loader2 } from "lucide-react";
import AgentLayout from "./AgentLayout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { AGENT_CS_WHATSAPP } from "@/lib/agentSupport";
import { AgentSetupChecklist } from "@/components/agent/AgentSetupChecklist";

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
        ? `Halo PIC Agen Musafar, saya ${agent.name} (Agent ID ${agent.referral_code}). Mohon dicek persetujuan akun agen saya.`
        : `Halo PIC Agen Musafar, saya ${agent.name} (Agent ID ${agent.referral_code}). Akun agen saya dinonaktifkan, mohon info lebih lanjut.`
    );
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-lg space-y-4">
        <div className="rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-4">
            <StatusBadge kind={pending ? "warn" : "bad"}>{pending ? "Calon Agen" : "Dinonaktifkan"}</StatusBadge>
          </div>
          <h1 className="mb-2 text-2xl font-bold">{pending ? "Menunggu Persetujuan" : "Akun Dinonaktifkan"}</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            {pending
              ? "Data kamu sudah kami terima dan sedang diperiksa admin, biasanya 1-2 hari kerja. Pastikan dua langkah di bawah selesai supaya verifikasi tidak tertunda. Setelah disetujui, kamu tinggal membayar biaya registrasi dan kami kabari lewat WhatsApp."
              : "Akun agen kamu sedang dinonaktifkan. Hubungi PIC Agen untuk informasi lebih lanjut."}
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild variant="brand" className="w-full">
              <a href={`https://wa.me/${AGENT_CS_WHATSAPP}?text=${waText}`} target="_blank" rel="noopener noreferrer">
                Hubungi PIC Agen via WhatsApp
              </a>
            </Button>
            <Button variant="outline" className="w-full" onClick={() => signOut()}>
              Keluar
            </Button>
          </div>
        </div>
        {pending && <AgentSetupChecklist />}
        </div>
      </div>
    );
  }

  // If it's the onboarding page, render without the AgentLayout sidebar
  if (isOnboardingPage) {
    return <>{children}</>;
  }

  // Approved but the registration fee is not received yet: the portal opens read-only (the database refuses leads,
  // jamaah and promo-link registrations), with the payment step on the dashboard and a reminder everywhere else.
  const feeGate = agent.status === 'active' && (agent.registration_fee_status ?? 'unpaid') === 'unpaid';
  const onDashboard = location.pathname === '/agent/dashboard';

  return (
    <AgentLayout>
      {feeGate && (
        <div className="mx-auto mb-4 w-full max-w-6xl">
          {onDashboard ? (
            <AgentSetupChecklist />
          ) : (
            <div role="status" className="flex flex-col gap-2 rounded-xl border border-status-warn-border bg-status-warn-bg p-4 text-sm text-status-warn-text sm:flex-row sm:items-center sm:justify-between">
              <p>Akunmu sudah disetujui. Bayar biaya registrasi dulu supaya bisa mencatat lead dan mendaftarkan jamaah.</p>
              <Button asChild size="sm" className="h-10 shrink-0">
                <Link to="/agent/dashboard">Bayar biaya registrasi</Link>
              </Button>
            </div>
          )}
        </div>
      )}
      {children}
    </AgentLayout>
  );
};

export default AgentProtectedRoute;
