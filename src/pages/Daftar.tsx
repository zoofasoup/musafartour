import { Link, useParams, useSearchParams } from "react-router-dom";
import { CalendarDays, Clock, Plane } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
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
    if (!res.ok || !data?.ok || !data.code) throw new Error(data?.error || "Pendaftaran belum bisa dikirim. Coba lagi sebentar lagi atau hubungi CS lewat WhatsApp.");
    return { code: data.code };
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-28 sm:px-6">
        {isLoading ? (
          <div className="space-y-4" aria-busy="true">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : !pkg ? (
          <div className="rounded-2xl border bg-white p-8 text-center">
            <h1 className="text-2xl font-bold">Paket tidak ditemukan</h1>
            <p className="mt-2 text-muted-foreground">Link pendaftaran ini sudah tidak berlaku atau paketnya sudah tidak tersedia.</p>
            <Button variant="brand" asChild className="mt-6"><Link to="/paket-umroh">Lihat paket yang tersedia</Link></Button>
          </div>
        ) : isPackageDeparted(pkg) ? (
          <div className="rounded-2xl border bg-white p-8 text-center">
            <h1 className="text-2xl font-bold">Paket ini sudah berangkat</h1>
            <p className="mt-2 text-muted-foreground">Silakan pilih jadwal keberangkatan berikutnya.</p>
            <Button variant="brand" asChild className="mt-6"><Link to="/paket-umroh">Lihat jadwal</Link></Button>
          </div>
        ) : (
          <>
            <header className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">Daftar {pkg.package_name}</h1>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden /> Berangkat {fmtDate(pkg.departure_date)}</li>
                <li className="flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden /> {pkg.duration_days} hari</li>
                {pkg.flight && <li className="flex items-center gap-1.5"><Plane className="h-4 w-4" aria-hidden /> {pkg.flight}</li>}
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">Isi sekali saja, sekitar 2 menit. Data paspor dan dokumen dilengkapi nanti, setelah DP.</p>
            </header>
            <RegistrationForm
              pkg={pkg}
              refCode={refCode}
              submit={submit}
              whatsappUrl={(message) => formatWhatsAppUrl(whatsapp, message)}
              onSubmitted={({ people }) =>
                trackLead("form_pendaftaran", { id: pkg.id, name: pkg.package_name, value: roomPriceOf(pkg, "quad") * people || undefined })
              }
            />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
