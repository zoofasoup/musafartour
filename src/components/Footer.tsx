import musafarLogo from "@/assets/musafar-logo.svg";
const Footer = () => {
  return <footer className="bg-foreground text-background py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <img src={musafarLogo} alt="Musafar Tour" className="h-12 mb-4" />
            <p className="text-sm opacity-80">Setiap langkah menuju Tanah Suci dimulai dengan niat yang suci, dan bimbingan yang tulus.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Hubungi Kami</h3>
            <p className="text-sm opacity-80 mb-2">
              Jl. Kebon Jeruk Raya No. 123<br />
              Jakarta Barat 11530
            </p>
            <p className="text-sm opacity-80">
              Izin PPIU: 123/2024/PPIU<br />
              Telepon: +62 812 3456 7890
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Ikuti Kami</h3>
            <div className="flex gap-4 text-sm">
              <a href="#" className="opacity-80 hover:opacity-100 transition-opacity">Instagram</a>
              <a href="#" className="opacity-80 hover:opacity-100 transition-opacity">Facebook</a>
              <a href="#" className="opacity-80 hover:opacity-100 transition-opacity">YouTube</a>
            </div>
          </div>
        </div>
        <div className="border-t border-background/20 pt-6 text-center text-sm opacity-80">
          © 2025 Musafar Tour. Hak Cipta Dilindungi.
        </div>
      </div>
    </footer>;
};
export default Footer;