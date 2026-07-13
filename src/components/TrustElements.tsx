import { Award, ShieldCheck, FileCheck } from "lucide-react";

export const TrustElements = () => {
  return (
    <section className="py-16 md:py-24 bg-background border-t border-border">
      <div className="container mx-auto px-6 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-accent uppercase tracking-[0.2em] text-xs font-bold mb-4 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Legalitas Resmi
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-slate-900 tracking-tight">
            Terdaftar Resmi & Terpercaya
          </h2>
          <p className="text-slate-600 text-sm md:text-base leading-relaxed">
            Musafar Tour beroperasi dengan izin resmi dan diawasi langsung oleh Kementerian Agama Republik Indonesia serta tergabung dalam asosiasi travel resmi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Kemenag Card */}
          <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col items-center text-center transition-all hover:shadow-md">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-rose-50 rounded-2xl flex items-center justify-center mb-5 md:mb-6">
              <Award className="h-8 w-8 md:h-10 md:w-10 text-rose-600" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2">Kementerian Agama RI</h3>
            <p className="text-sm md:text-base text-slate-500 mb-6">Penyelenggara Perjalanan Ibadah Umrah (PPIU) Resmi.</p>
            
            {/* Placeholder for Certificate */}
            <div className="w-full aspect-[4/3] bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 group">
              <FileCheck className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform text-slate-300" />
              <span className="text-xs md:text-sm font-medium px-4">Tempat Foto Sertifikat PPIU (Kemenag)</span>
            </div>
          </div>

          {/* Himpuh Card */}
          <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col items-center text-center transition-all hover:shadow-md">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-5 md:mb-6">
              <ShieldCheck className="h-8 w-8 md:h-10 md:w-10 text-blue-600" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2">Asosiasi HIMPUH</h3>
            <p className="text-sm md:text-base text-slate-500 mb-6">Anggota Himpunan Penyelenggara Umrah dan Haji Khusus.</p>
            
            {/* Placeholder for Certificate */}
            <div className="w-full aspect-[4/3] bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 group">
              <FileCheck className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform text-slate-300" />
              <span className="text-xs md:text-sm font-medium px-4">Tempat Foto Sertifikat HIMPUH</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
