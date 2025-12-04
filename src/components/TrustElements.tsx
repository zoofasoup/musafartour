import { Award, Image as ImageIcon, Youtube } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";

export const TrustElements = () => {
  return (
    <section className="py-6 bg-muted/30 border-y">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {/* Certifications */}
          <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-lg shadow-sm">
            <Award className="h-5 w-5 text-primary" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">Terdaftar Kemenag RI</p>
              <p className="text-xs text-muted-foreground">PPIU & HIMPUH</p>
            </div>
          </div>

          {/* Gallery Link */}
          <Link to="/galeri">
            <Button variant="outline" size="sm" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Lihat Galeri
            </Button>
          </Link>

          {/* YouTube Testimonial */}
          <a href="https://www.youtube.com/@musafartourofficial" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <Youtube className="h-4 w-4" />
              Testimoni Video
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
};
