import { ReactNode } from "react";
import { Link } from "react-router-dom";
import musafarLogo from "@/assets/musafar-logo.svg";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import "@/styles/pkg-v2.css";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  illustration?: string;
  quote?: string;
}

/**
 * Shared shell for the sign-in family (admin login, agent login, register, forgot password), in the pkg-v2 look.
 * Phone: a short dark header with the logo, then the form on a cream panel. Desktop: dark photo side, form on cream.
 * Fields and buttons inside get their look from `.pkg-auth` in pkg-v2.css.
 */
export const AuthLayout = ({
  children,
  title,
  subtitle,
  illustration = "https://images.unsplash.com/photo-1604871000636-074fa5117945?auto=format&fit=crop&q=80",
}: AuthLayoutProps) => {
  return (
    <div className="pkg-v2 flex min-h-screen flex-col md:flex-row">
      <header data-pkg-tone="ink" className="relative flex text-pkg-fg items-center justify-between overflow-hidden px-6 pb-14 pt-6 md:w-1/2 md:flex-col md:items-start md:justify-between md:p-12 lg:w-[55%] lg:p-20">
        <div aria-hidden className="absolute inset-0 hidden bg-cover bg-center md:block" style={{ backgroundImage: `url(${illustration})` }} />
        <div aria-hidden className="absolute inset-0 hidden bg-gradient-to-t from-black/70 via-black/30 to-black/40 md:block" />
        <Link to="/" className="relative z-10 inline-block" aria-label="Musafar Tour, ke beranda">
          <img src={musafarLogo} alt="Musafar Tour" className="h-8 brightness-0 invert" />
        </Link>
        <Link to="/" className="pkg-glass pkg-label relative z-10 inline-flex h-10 items-center rounded-full px-4 text-[14px] md:hidden">Beranda</Link>
        <p className="pkg-title relative z-10 hidden md:block lg:!text-[72px]">Selamat datang</p>
      </header>

      <PkgPanel tone="cream" last className="pkg-auth flex-1 md:!mt-0 md:!rounded-none md:flex md:items-center md:!px-12 lg:!px-20 xl:!px-24">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="pkg-label hidden min-h-11 items-center text-pkg-fg-2 underline underline-offset-4 md:inline-flex">&larr; Kembali ke halaman utama</Link>
          <h1 className="pkg-h2 mt-2 text-balance md:mt-4">{title}</h1>
          <p className="mt-3 text-[16px] leading-[1.5] text-pkg-fg-2">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </PkgPanel>
    </div>
  );
};

export default AuthLayout;
