
import type { WebsiteSettings } from "@/hooks/useHomepageData";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

interface CTASectionProps {
  websiteSettings: WebsiteSettings | null | undefined;
}

export const CTASection = (_props: CTASectionProps) => {
  return (
    <PkgPanel tone="red" last className="!pb-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="pkg-h2 text-balance text-pkg-on-red">Belum yakin paket mana yang cocok?</h2>
        <p className="mt-4 text-[17px] leading-[1.5] text-pkg-on-red">Tim Musamin bantu cari yang pas dengan kebutuhan dan budget kamu.</p>
        <button
          type="button"
          onClick={() => redirectToWhatsApp("Halo Musamin, saya tertarik untuk mengetahui lebih lanjut tentang paket Umroh", "home_cta_section")}
          className="pkg-press pkg-glass-deep pkg-label mt-6 inline-flex h-14 items-center gap-2 rounded-full px-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-on-red focus-visible:ring-offset-2"
        >
          <WhatsAppIcon className="h-5 w-5" /> Tanya via WhatsApp
        </button>
      </div>
    </PkgPanel>
  );
};
