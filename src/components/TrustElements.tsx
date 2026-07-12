import { Award } from "lucide-react";

export const TrustElements = () => {
  return (
    <section className="py-8 md:py-12 bg-white">
      <div className="container mx-auto px-6 md:px-8">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-4 px-6 py-4 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 transition-transform hover:scale-105 duration-300">
            <div className="p-3.5 bg-rose-100/80 rounded-2xl">
              <Award className="h-7 w-7 text-rose-700" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-tight">Terdaftar Kemenag RI</h3>
              <p className="text-sm md:text-base text-slate-500 font-medium">PPIU & HIMPUH</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
