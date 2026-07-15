import { ReactNode } from "react";
import { Link } from "react-router-dom";
import musafarLogo from "@/assets/musafar-logo.svg";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  illustration?: string;
  quote?: string;
}

export const AuthLayout = ({ 
  children, 
  title, 
  subtitle,
  illustration = "https://images.unsplash.com/photo-1604871000636-074fa5117945?auto=format&fit=crop&q=80"
}: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Left Panel - Visual/Brand */}
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] relative overflow-hidden bg-zinc-900">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] hover:scale-105"
          style={{ backgroundImage: `url(${illustration})` }}
        />
        
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/30" />
        <div className="absolute inset-0 bg-primary/20 mix-blend-overlay" />
        
        {/* Content */}
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-12 lg:p-20 text-white">
          <div>
            <Link to="/" className="inline-block transition-transform hover:scale-105">
              <img src={musafarLogo} alt="Musafar Tour" className="h-8 brightness-0 invert" />
            </Link>
          </div>
          
          <div className="max-w-xl animate-fade-up">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight drop-shadow-lg">
              Welcome
            </h1>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full md:w-1/2 lg:w-[45%] flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 xl:px-24 bg-white">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Logo */}
          <div className="md:hidden text-center mb-10 animate-fade-in">
            <Link to="/">
              <img src={musafarLogo} alt="Musafar Tour" className="h-10 mx-auto" />
            </Link>
          </div>

          <div className="mb-6 animate-fade-in-down">
            <Link 
              to="/" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              &larr; Kembali ke halaman utama
            </Link>
          </div>

          <div className="mb-10 animate-fade-in-up">
            <h2 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">
              {title}
            </h2>
            <p className="text-zinc-500">
              {subtitle}
            </p>
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
