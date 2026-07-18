import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
import { Building2, Bus, Plane, CheckCircle2, XCircle, Gift, MapPin, CalendarDays, ExternalLink, Moon } from "lucide-react";

interface Props {
  pkg: any;
}

export const ExpandedPackageDetails = ({ pkg }: Props) => {
  const tiers = pkg.available_tiers || [];

  const formatTierName = (tier: string) => {
    if (tier === 'five-star') return 'Bintang 5';
    if (tier === 'pelataran-hemat') return 'Pelataran';
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  const getTierData = (tier: string) => {
    if (tier === 'nyaman') return {
      price: pkg.package_price,
      makkah_hotel: pkg.makkah_hotel_name,
      makkah_star: pkg.makkah_hotel_star,
      makkah_dist: pkg.makkah_distance,
      madinah_hotel: pkg.madinah_hotel_name,
      madinah_star: pkg.madinah_hotel_star,
      madinah_dist: pkg.madinah_distance,
      transport: pkg.best_seller_transport
    };
    if (tier === 'hemat') return {
      price: pkg.hemat_package_price,
      makkah_hotel: pkg.hemat_makkah_hotel_name,
      makkah_star: pkg.hemat_makkah_hotel_star,
      makkah_dist: pkg.hemat_makkah_distance,
      madinah_hotel: pkg.hemat_madinah_hotel_name,
      madinah_star: pkg.hemat_madinah_hotel_star,
      madinah_dist: pkg.hemat_madinah_distance,
      transport: pkg.hemat_transport
    };
    if (tier === 'five-star') return {
      price: pkg.five_star_package_price,
      makkah_hotel: pkg.five_star_makkah_hotel_name,
      makkah_star: pkg.five_star_makkah_hotel_star,
      makkah_dist: pkg.five_star_makkah_distance,
      madinah_hotel: pkg.five_star_madinah_hotel_name,
      madinah_star: pkg.five_star_madinah_hotel_star,
      madinah_dist: pkg.five_star_madinah_distance,
      transport: pkg.five_star_transport
    };
    if (tier === 'pelataran-hemat') return {
      price: pkg.pelataran_package_price,
      makkah_hotel: pkg.pelataran_makkah_hotel_name,
      makkah_star: pkg.pelataran_makkah_hotel_star,
      makkah_dist: pkg.pelataran_makkah_distance,
      madinah_hotel: pkg.pelataran_madinah_hotel_name,
      madinah_star: pkg.pelataran_madinah_hotel_star,
      madinah_dist: pkg.pelataran_madinah_distance,
      transport: pkg.pelataran_transport
    };
    
    // JSONB fallback if not in flat columns
    if (pkg.tiers_data && pkg.tiers_data[tier.replace("-", "_")]) {
      return pkg.tiers_data[tier.replace("-", "_")];
    }
    
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Kolom Kiri: Rute & Waktu */}
      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2 text-slate-800">
          <Plane className="h-4 w-4 text-primary" /> Rute & Perjalanan
        </h4>
        <div className="bg-white p-4 rounded-lg border text-sm space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-500">Penerbangan</span>
            <span className="font-medium text-right">{pkg.flight} ({pkg.flight_type || 'Direct'})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Rute</span>
            <span className="font-medium text-right">{pkg.route || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Berangkat dari</span>
            <span className="font-medium text-right">{pkg.start_airport || '-'}</span>
          </div>
          <hr />
          <div className="flex justify-between">
            <span className="text-slate-500">Makkah</span>
            <span className="font-medium flex items-center gap-1"><Moon className="h-3 w-3"/> {pkg.nights_makkah || 0} Malam</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Madinah</span>
            <span className="font-medium flex items-center gap-1"><Moon className="h-3 w-3"/> {pkg.nights_madinah || 0} Malam</span>
          </div>
          {pkg.nights_extra > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Ekstra/Transit</span>
              <span className="font-medium flex items-center gap-1"><Moon className="h-3 w-3"/> {pkg.nights_extra} Malam</span>
            </div>
          )}
        </div>

        <h4 className="font-semibold flex items-center gap-2 text-slate-800 pt-2">
          <Gift className="h-4 w-4 text-primary" /> Informasi Tambahan
        </h4>
        <div className="bg-white p-4 rounded-lg border text-sm space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-500">Maks Diskon</span>
            <span className="font-medium text-right">Rp {formatNumber(pkg.max_discount || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Waitlist</span>
            <span className="font-medium text-right">{pkg.waitlist_count || 0} orang</span>
          </div>
          {(pkg.banner_image || pkg.catalog_link) && (
            <>
              <hr />
              <div className="flex flex-col gap-2">
                {pkg.banner_image && (
                  <a href={pkg.banner_image} target="_blank" rel="noreferrer" className="text-primary flex items-center gap-1 hover:underline">
                    <ExternalLink className="h-3 w-3" /> Lihat Flyer / Banner
                  </a>
                )}
                {pkg.catalog_link && (
                  <a href={pkg.catalog_link} target="_blank" rel="noreferrer" className="text-primary flex items-center gap-1 hover:underline">
                    <ExternalLink className="h-3 w-3" /> Lihat Katalog PDF
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Kolom Tengah: Tiers & Harga */}
      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2 text-slate-800">
          <Building2 className="h-4 w-4 text-primary" /> Kategori & Harga
        </h4>
        
        <div className="space-y-3">
          {tiers.map((tier: string) => {
            const data = getTierData(tier);
            if (!data) return null;
            
            return (
              <div key={tier} className="bg-white p-3 rounded-lg border text-sm">
                <div className="font-semibold text-primary border-b pb-2 mb-2 uppercase text-xs tracking-wider">
                  Paket {formatTierName(tier)}
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-xs">Makkah</span>
                    <span className="font-medium">{data.makkah_hotel || '-'} {data.makkah_star ? `(⭐${data.makkah_star})` : ''}</span>
                    <span className="text-xs text-slate-400">{data.makkah_dist || '-'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-xs">Madinah</span>
                    <span className="font-medium">{data.madinah_hotel || '-'} {data.madinah_star ? `(⭐${data.madinah_star})` : ''}</span>
                    <span className="text-xs text-slate-400">{data.madinah_dist || '-'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-xs flex items-center gap-1"><Bus className="h-3 w-3"/> Transportasi</span>
                    <span className="font-medium">{data.transport || '-'}</span>
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded p-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quad:</span>
                    <span className="font-semibold">Rp {formatNumber(data.price?.quad || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Triple:</span>
                    <span className="font-semibold">Rp {formatNumber(data.price?.triple || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Double:</span>
                    <span className="font-semibold">Rp {formatNumber(data.price?.double || 0)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Kolom Kanan: Fasilitas */}
      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2 text-slate-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Fasilitas & Catatan
        </h4>
        
        <div className="bg-white p-4 rounded-lg border text-sm space-y-4">
          <div>
            <span className="text-slate-500 block mb-1">Selling Points (Keunggulan)</span>
            <p className="font-medium whitespace-pre-wrap">{pkg.selling_points || '-'}</p>
          </div>
          
          <div>
            <span className="text-slate-500 block mb-1">Termasuk (Included)</span>
            <p className="font-medium whitespace-pre-wrap">{pkg.included_items || '-'}</p>
          </div>
          
          <div>
            <span className="text-slate-500 block mb-1">Perlengkapan</span>
            <p className="font-medium whitespace-pre-wrap">{pkg.equipment_list || '-'}</p>
          </div>
          
          <div>
            <span className="text-slate-500 flex items-center gap-1 mb-1">
              <XCircle className="h-3 w-3 text-red-500"/> Tidak Termasuk (Excluded)
            </span>
            <p className="font-medium whitespace-pre-wrap">{pkg.excluded_items || '-'}</p>
          </div>
        </div>
      </div>
      
    </div>
  );
};
