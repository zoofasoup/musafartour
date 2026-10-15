import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import musafarLogo from "@/assets/musafar-logo.svg";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { supabase } from "@/integrations/supabase/client";
import { SOP_VERSION } from "@/lib/sopAgen";
import "@/styles/pkg-v2.css";
import "@/styles/pkg-app.css";

/** Step 2 of agent onboarding (step 1 is /agent/onboarding): read and accept the agent SOP. */
const AgentSop = () => {
  const { agent, loading, signOut, refreshAgent } = useAgentAuth();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("pkg-app");
    return () => document.documentElement.classList.remove("pkg-app");
  }, []);

  // Nothing to do here once the data is missing (go back to step 1) or the SOP is already accepted.
  useEffect(() => {
    if (loading || !agent) return;
    const dataDone = !!(agent.ktp_number && agent.ktp_image_url && agent.address);
    if (!dataDone) navigate("/agent/onboarding", { replace: true });
    else if (agent.sop_accepted_at) navigate("/agent/dashboard", { replace: true });
  }, [agent, loading, navigate]);

  const accept = async () => {
    setSaving(true);
    const { error } = await supabase.rpc("accept_agent_sop", { _version: SOP_VERSION });
    setSaving(false);
    if (error) {
      toast.error("Persetujuan belum tersimpan. Coba lagi.");
      return;
    }
    refreshAgent();
    toast.success("Persetujuan tercatat.");
    navigate("/agent/dashboard", { replace: true });
  };

  if (loading) {
    return <div className="pkg-v2 grid min-h-screen place-items-center"><Loader2 className="h-8 w-8 animate-spin text-pkg-fg-3" aria-hidden /></div>;
  }

  return (
    <div className="pkg-v2 min-h-screen">
      <PkgPanel tone="ink" top>
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" aria-label="Musafar Tour, ke beranda"><img src={musafarLogo} alt="Musafar Tour" className="h-8 brightness-0 invert" /></Link>
            <button
              type="button"
              className="pkg-press pkg-glass pkg-label inline-flex h-11 items-center rounded-full px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream"
              onClick={async () => {
                await signOut();
                navigate("/agent/login");
              }}
            >
              Keluar
            </button>
          </div>
          <p className="pkg-label mt-10 text-pkg-fg-2">Langkah 2 dari 2</p>
          <h1 className="pkg-title mt-3 text-balance !text-[40px] md:!text-[56px]">Setujui SOP</h1>
        </div>
      </PkgPanel>

      <PkgPanel tone="cream" last className="pkg-auth">
        <div className="mx-auto max-w-2xl">
          <Link to="/sop-agen" target="_blank" rel="noopener noreferrer" className="pkg-label inline-flex min-h-11 items-center gap-2 text-pkg-red-deep underline underline-offset-4">
            Baca SOP Program Agen <ExternalLink className="h-4 w-4" aria-hidden />
          </Link>

          <label className="mt-8 flex cursor-pointer items-start gap-3 text-[17px] leading-[1.45] text-pkg-fg">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-6 w-6 shrink-0 accent-[#c4141b]" />
            <span>Saya sudah membaca, memahami, dan menyetujui SOP Program Agen Musafar.</span>
          </label>

          <form
            className="mt-10"
            onSubmit={(e) => {
              e.preventDefault();
              if (agreed && !saving) void accept();
            }}
          >
            <button type="submit" disabled={!agreed || saving} className="pkg-press w-full disabled:opacity-50">
              {saving ? "Menyimpan..." : "Setuju dan kirim"}
            </button>
          </form>
        </div>
      </PkgPanel>
    </div>
  );
};

export default AgentSop;
