import { Skeleton } from "@/components/ui/skeleton";
import { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { Loader2 } from "lucide-react";
import AgentLayout from "./AgentLayout";
import { Button } from "@/components/ui/button";
import musafarLogo from "@/assets/musafar-logo.svg";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
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
  const isOnboardingPage = location.pathname.startsWith('/agent/onboarding');

  // If not fully onboarded, force redirect to onboarding page
  if (!isFullyOnboarded && !isOnboardingPage) {
    return <Navigate to="/agent/onboarding" replace />;
  }

  // Data sent but the SOP not accepted yet: step 2 is its own page
  if (isFullyOnboarded && agent.status === 'pending' && !agent.sop_accepted_at && location.pathname !== '/agent/onboarding/sop') {
    return <Navigate to="/agent/onboarding/sop" replace />;
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
      <div className="pkg-v2 min-h-screen">
        <PkgPanel tone="ink" top>
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center justify-between gap-4">
              <Link to="/" aria-label="Musafar Tour, ke beranda"><img src={musafarLogo} alt="Musafar Tour" className="h-8 brightness-0 invert" /></Link>
              <button
                type="button"
                className="pkg-press pkg-glass pkg-label inline-flex h-11 items-center rounded-full px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream"
                onClick={() => signOut()}
              >
                Keluar
              </button>
            </div>
            <p className="pkg-label mt-10 inline-flex items-center gap-2 text-pkg-fg-2">
              <span className={`h-2 w-2 rounded-full ${pending ? "bg-[#f0b429]" : "bg-pkg-red-bright"}`} aria-hidden />
              {pending ? "Calon agen" : "Dinonaktifkan"}
            </p>
            <h1 className="pkg-title mt-3 text-balance !text-[40px] md:!text-[56px]">{pending ? "Menunggu persetujuan" : "Akun dinonaktifkan"}</h1>
            <p className="mt-5 text-[17px] leading-[1.5] text-pkg-fg-2">
              {pending ? "Admin sedang memeriksa datamu, biasanya 1-2 hari kerja. Kami kabari lewat WhatsApp." : "Hubungi PIC Agen untuk info lebih lanjut."}
            </p>
            <a
              href={`https://wa.me/${AGENT_CS_WHATSAPP}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="pkg-press pkg-glass pkg-label mt-8 inline-flex h-12 items-center gap-2 rounded-full px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream"
            >
              <WhatsAppIcon className="h-5 w-5" /> Hubungi PIC Agen
            </a>
          </div>
        </PkgPanel>
        {pending && (
          <PkgPanel tone="cream" last>
            <div className="mx-auto max-w-2xl"><AgentSetupChecklist bare /></div>
          </PkgPanel>
        )}
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
            <div role="status" className="flex flex-col gap-2 pkg-v2 rounded-[24px] bg-pkg-cream-2 p-5 text-[15px] text-pkg-fg sm:flex-row sm:items-center sm:justify-between">
              <p>Bayar biaya registrasi dulu untuk mulai jualan.</p>
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
