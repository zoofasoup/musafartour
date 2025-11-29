import musafarLogo from "@/assets/musafar-logo.svg";
const Footer = () => {
  return <footer className="bg-foreground text-background py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <img src={musafarLogo} alt="Musafar Tour" className="h-12 mb-4" width="240" height="48" />
            <p className="text-sm opacity-80">Setiap langkah menuju Tanah Suci dimulai dengan niat yang suci — dan bimbingan yang tulus.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Hubungi Kami</h3>
            <p className="text-sm opacity-80 mb-2">
              Commercial Park Harapan Indah Ruko Emerald Blok EB1 No. 28<br />
              Medan Satria, Kota Bekasi, Jawa Barat 17131
            </p>
            <p className="text-sm opacity-80">
              Izin PPIU: 17102200953750002<br />
              Telepon: 021-38312137<br />
              WhatsApp: 0819-1740-3797<br />
              Email: musafartour@gmail.com
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Ikuti Kami</h3>
            <div className="flex gap-4 text-sm">
              <a href="https://instagram.com/musafartour" target="_blank" rel="noopener noreferrer" className="opacity-80 hover:opacity-100 transition-opacity">Instagram</a>
              <a href="https://facebook.com/musafartour" target="_blank" rel="noopener noreferrer" className="opacity-80 hover:opacity-100 transition-opacity">Facebook</a>
              <a href="https://youtube.com/@musafartour" target="_blank" rel="noopener noreferrer" className="opacity-80 hover:opacity-100 transition-opacity">YouTube</a>
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