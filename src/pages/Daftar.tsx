import { Link, useParams, useSearchParams } from "react-router-dom";
import { CalendarDays, Clock, Plane } from "lucide-react";
import { PkgPage, pkgFocus } from "@/components/PkgPage";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { RegistrationForm, type SubmitPayload } from "@/components/daftar/RegistrationForm";
import { usePackageBySlug } from "@/hooks/usePackages";
import { useHomepageData } from "@/hooks/useHomepageData";
import { getReferralCookie } from "@/hooks/useReferralCapture";
import { roomPriceOf } from "@/lib/jamaah";
import { trackLead } from "@/lib/tracking";
import { formatWhatsAppUrl, isPackageDeparted } from "@/lib/utils";

const FALLBACK_WHATSAPP = "6281917403797";

const fmtDate = (d: string) =>
  new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

/** The registration form behind every package's "Daftar" link: /daftar/<slug>, optionally with ?ref=<agent code>. */
export default function Daftar() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const { data: pkg, isLoading } = usePackageBySlug(slug);
  const { websiteSettings } = useHomepageData();
  const whatsapp = websiteSettings?.whatsapp_number || FALLBACK_WHATSAPP;
  const refCode = (params.get("ref") || getReferralCookie() || "").trim() || null;

  const submit = async (payload: SubmitPayload) => {
    let res: Response;
    try {
      res = await fetch("/api/daftar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    } catch {
      throw new Error("Tidak bisa terhubung ke server. Periksa internet kamu, lalu coba lagi.");
    }
    const data = (await res.json().catch(() => null)) as { ok?: boolean; code?: string; error?: string } | null;
    if (!res.ok || !data?.ok || !data.code) throw new Error(data?.error || "Pendaftaran belum bisa dikirim. Coba lagi sebentar lagi atau hubungi UC lewat WhatsApp.");
    return { code: data.code };
  };

  if (isLoading) {
    return (
      <PkgPage title="Daftar umroh">
        <PkgPanel tone="cream" last>
          <div className="mx-auto max-w-2xl space-y-4" aria-busy="true">
            <Skeleton className="h-16 w-full rounded-full" />
            <Skeleton className="h-16 w-full rounded-full" />
            <Skeleton className="h-40 w-full rounded-[24px]" />
          </div>
        </PkgPanel>
      </PkgPage>
    );
  }

  if (!pkg || isPackageDeparted(pkg)) {
    const gone = !!pkg;
    return (
      <PkgPage title={gone ? "Paket ini sudah berangkat." : "Paket tidak ditemukan."} intro={gone ? "Silakan pilih jadwal keberangkatan berikutnya." : "Link pendaftaran ini sudah tidak berlaku atau paketnya sudah tidak tersedia."}>
        <PkgPanel tone="cream" last>
          <div className="mx-auto max-w-2xl">
            <Link to="/paket-umroh" className={`pkg-press pkg-glass-red pkg-label inline-flex h-14 items-center justify-center rounded-full px-7 ${pkgFocus}`}>
              {gone ? "Lihat jadwal" : "Lihat paket yang tersedia"}
            </Link>
          </div>
        </PkgPanel>
      </PkgPage>
    );
  }

  return (
    <PkgPage
      title={`Daftar ${pkg.package_name}.`}
      intro="Sekitar 2 menit. Dokumen menyusul setelah DP."
      heroExtra={
        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[15px] text-pkg-fg-2">
          <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4" aria-hidden /> Berangkat {fmtDate(pkg.departure_date)}</li>
          <li className="flex items-center gap-2"><Clock className="h-4 w-4" aria-hidden /> {pkg.duration_days} hari</li>
          {pkg.flight && <li className="flex items-center gap-2"><Plane className="h-4 w-4" aria-hidden /> {pkg.flight}</li>}
        </ul>
      }
    >
      <PkgPanel tone="cream" last>
        <div className="pkg-form mx-auto max-w-2xl">
          <RegistrationForm
            pkg={pkg}
            refCode={refCode}
            submit={submit}
            whatsappUrl={(message) => formatWhatsAppUrl(whatsapp, message)}
            onSubmitted={({ people }) =>
              trackLead("form_pendaftaran", { id: pkg.id, name: pkg.package_name, value: roomPriceOf(pkg, "quad") * people || undefined })
            }
          />
        </div>
      </PkgPanel>
    </PkgPage>
  );
}
