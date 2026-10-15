import { useRef } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import { usePkgNav } from "@/hooks/usePkgNav";
import "@/styles/pkg-v2.css";

const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream focus-visible:ring-offset-2 focus-visible:ring-offset-pkg-ink";

const NotFound = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  usePkgNav(rootRef);
  return (
    <div ref={rootRef} className="pkg-v2 flex min-h-screen flex-col">
      <SEO title="Halaman Tidak Ditemukan - Musafar Tour" noindex useDefaults={false} />
      <Navbar />
      <main id="main" className="flex-1">
        <PkgPanel tone="ink" top last className="min-h-[calc(100svh-120px)]">
          <div className="mx-auto max-w-3xl">
            <p aria-hidden className="pkg-title tabular-nums !leading-[0.85] !tracking-[-0.06em] !text-[min(calc((100vw-48px)/1.83),320px)]">404</p>
            <h1 className="pkg-h2 mt-8 text-balance">Halaman tidak ditemukan</h1>
            <p className="mt-4 max-w-md text-[17px] leading-[1.5] text-pkg-fg-2">Mungkin sudah dipindahkan atau tidak tersedia lagi.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/paket-umroh" className={`pkg-press pkg-glass-red pkg-label inline-flex h-14 items-center justify-center rounded-full px-7 ${focus}`}>Lihat paket umroh</Link>
              <Link to="/" className={`pkg-press pkg-glass pkg-label inline-flex h-14 items-center justify-center rounded-full px-7 ${focus}`}>Kembali ke beranda</Link>
            </div>
            <p className="mt-8 text-[15px] text-pkg-fg-2">
              Sudah mendaftar? <Link to="/cek-status" className="font-medium text-pkg-fg underline underline-offset-4">Cek status pendaftaran</Link>
            </p>
          </div>
        </PkgPanel>
      </main>
      <Footer variant="pkg" />
    </div>
  );
};

export default NotFound;
