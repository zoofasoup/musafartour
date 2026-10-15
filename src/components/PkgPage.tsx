import { useRef, type ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import { usePkgNav } from "@/hooks/usePkgNav";
import "@/styles/pkg-v2.css";

export const pkgFocus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2";
/** Text field in the pkg-v2 language: a soft glass pill, no border. Textareas use pkgArea. */
export const pkgInput = `pkg-glass h-14 w-full rounded-full px-5 text-[16px] font-normal text-pkg-fg placeholder:text-pkg-fg-3 ${pkgFocus}`;
export const pkgArea = `pkg-glass min-h-32 w-full rounded-[24px] px-5 py-4 text-[16px] font-normal text-pkg-fg placeholder:text-pkg-fg-3 ${pkgFocus}`;
export const pkgLabel = "pkg-caption mb-2 block text-pkg-fg-2";

/**
 * Shared frame for the plain pages (contact, requirements, legal...): the page background and navbar colouring,
 * an ink hero panel with the title, then whatever panels the page passes in, then the footer.
 */
export function PkgPage({ title, intro, children, heroExtra }: { title: string; intro?: string; children: ReactNode; heroExtra?: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  usePkgNav(rootRef);
  return (
    <div ref={rootRef} className="pkg-v2 min-h-screen">
      <Navbar />
      <main id="main">
        <PkgPanel tone="ink" top>
          <div className="mx-auto max-w-3xl">
            <h1 className="pkg-title text-balance !text-[44px] md:!text-[60px]">{title}</h1>
            {intro && <p className="mt-5 text-[17px] leading-[1.5] text-pkg-fg-2">{intro}</p>}
            {heroExtra}
          </div>
        </PkgPanel>
        {children}
      </main>
      <Footer variant="pkg" />
    </div>
  );
}
