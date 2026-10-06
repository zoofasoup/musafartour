import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileText, Image as ImageIcon, Loader2, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const MarketingAutoGeneratorModal = ({ open, onOpenChange, packageId, packageTitle }: any) => {
  const [progress, setProgress] = useState({ flyer: 0, catalog: 0, itinerary: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setProgress({ flyer: 0, catalog: 0, itinerary: 0 });
      setTimeout(() => setProgress(p => ({ ...p, flyer: 100 })), 1500);
      setTimeout(() => setProgress(p => ({ ...p, catalog: 100 })), 3000);
      setTimeout(() => setProgress(p => ({ ...p, itinerary: 100 })), 4500);
    }
  }, [open]);

  const allDone = progress.flyer === 100 && progress.catalog === 100 && progress.itinerary === 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-8 h-8" />
            Paket Berhasil Di-publish!
          </DialogTitle>
          <DialogDescription className="text-base text-slate-600">
            "{packageTitle}" sudah aktif sebagai Single Source of Truth. Sistem sedang mengotomatisasi aset marketing kamu...
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          {/* Flyer */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded flex items-center justify-center">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">Auto-Flyer IG/WA</h4>
                <p className="text-xs text-slate-500">Gambar HD dengan harga & fasilitas</p>
              </div>
            </div>
            <div>
              {progress.flyer < 100 ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : <CheckCircle2 className="w-6 h-6 text-green-500" />}
            </div>
          </div>

          {/* Catalog */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">Katalog Brosur (PDF)</h4>
                <p className="text-xs text-slate-500">Brosur lengkap info hotel & maskapai</p>
              </div>
            </div>
            <div>
              {progress.catalog < 100 ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : <CheckCircle2 className="w-6 h-6 text-green-500" />}
            </div>
          </div>

          {/* Itinerary */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">Itinerary Perjalanan (PDF)</h4>
                <p className="text-xs text-slate-500">Jadwal H-1 sampai kepulangan</p>
              </div>
            </div>
            <div>
              {progress.itinerary < 100 ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : <CheckCircle2 className="w-6 h-6 text-green-500" />}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3 border-t pt-4">
          <Button variant="outline" onClick={() => navigate("/admin/packages")} className="w-full">
            Kembali ke Product Dev
          </Button>
          <Button disabled={!allDone} className="w-full bg-slate-900 hover:bg-slate-800 text-white gap-2">
            <Send className="w-4 h-4" />
            Distribusi ke 200+ Agen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
