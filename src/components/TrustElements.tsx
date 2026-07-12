import { Award } from "lucide-react";

export const TrustElements = () => {
  return (
    <section className="py-8 bg-muted/30">
      <div className="container mx-auto px-6 md:px-8">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3 px-6 py-3 bg-background rounded-xl shadow-sm border">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <div className="text-sm">
              <p className="font-semibold text-foreground">Terdaftar Kemenag RI</p>
              <p className="text-xs text-muted-foreground">PPIU & HIMPUH</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
