import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Save, Plus, Trash2, Undo2, Redo2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChangeReasonDialog } from '@/components/admin/ChangeReasonDialog';
import { packageStatusLabel, statusNeedsChangeReason } from '@/lib/packageStatus';

// --- DATA MODELS ---

export type RoomPricing = { double: number; triple: number; quad: number; };

export type HotelItem = { id: string; city: string; name: string; type: string; dur_d: number; dur_n: number; } & RoomPricing;
export type HandlingItem = { id: string; name: string; } & RoomPricing;
export type VisaItem = { id: string; name: string; } & RoomPricing;

export type ExpenseItem = { id: string; checked: boolean; name: string; provider?: string; } & RoomPricing;
export type LainLainItem = { id: string; name: string; } & RoomPricing;

export type CogsDataV2 = {
  version: "2.0";
  rates: { sar_usd: number; usd_idr: number; };
  land_arrangement: {
    hotels: HotelItem[];
    handling: HandlingItem[];
    visa: VisaItem[];
  };
  indo_expenses: {
    esensial: ExpenseItem[];
    add_ons: ExpenseItem[];
  };
  lain_lain: LainLainItem[];
  pricing: {
    harga_jual: RoomPricing;
    harga_diskon: RoomPricing;
  };
};

const DEFAULT_COGS_V2: CogsDataV2 = {
  version: "2.0",
  rates: { sar_usd: 3.75, usd_idr: 16000 },
  land_arrangement: {
    hotels: [
      { id: 'h1', city: 'Makkah', name: 'Maysan Almaqam', type: 'FB', dur_d: 4, dur_n: 4, double: 405, triple: 455, quad: 505 },
      { id: 'h2', city: 'Madinah', name: 'Rua International', type: 'FB', dur_d: 3, dur_n: 3, double: 310, triple: 355, quad: 530 }
    ],
    handling: [
      { id: 'hn1', name: 'Mutawif/ah', double: 0, triple: 0, quad: 0 },
      { id: 'hn2', name: 'Snack', double: 0, triple: 0, quad: 0 },
      { id: 'hn3', name: 'Zam - zam 5L', double: 75, triple: 75, quad: 75 },
      { id: 'hn4', name: 'Ziarah/City Tour', double: 0, triple: 0, quad: 0 },
      { id: 'hn5', name: 'Tiping & Handling', double: 0, triple: 0, quad: 0 }
    ],
    visa: [
      { id: 'v1', name: 'Visa Umroh', double: 135, triple: 135, quad: 135 },
      { id: 'v2', name: 'BRN Hotel', double: 0, triple: 0, quad: 0 },
      { id: 'v3', name: 'Bus', double: 0, triple: 0, quad: 0 }
    ]
  },
  indo_expenses: {
    esensial: [
      { id: 'e1', checked: true, name: 'Tiket Pesawat', provider: 'Garuda Indonesia', double: 18200000, triple: 18200000, quad: 18200000 },
      { id: 'e2', checked: true, name: 'Perlengkapan', double: 900000, triple: 900000, quad: 900000 },
      { id: 'e3', checked: true, name: 'Transmitter', double: 100000, triple: 100000, quad: 100000 },
      { id: 'e4', checked: true, name: 'Manasik', double: 250000, triple: 250000, quad: 250000 },
      { id: 'e5', checked: true, name: 'Handling (Jakarta PP)', double: 250000, triple: 250000, quad: 250000 },
      { id: 'e6', checked: false, name: 'Siskopatuh', double: 0, triple: 0, quad: 0 },
      { id: 'e7', checked: false, name: 'Asuransi', double: 0, triple: 0, quad: 0 },
      { id: 'e8', checked: true, name: 'Tour Leader', double: 1000000, triple: 1000000, quad: 1000000 },
      { id: 'e9', checked: true, name: 'Anggaran Marketing & Expo', double: 200000, triple: 200000, quad: 200000 },
    ],
    add_ons: []
  },
  lain_lain: [
    { id: 'l1', name: 'Sales Fee', double: 2000000, triple: 2000000, quad: 1500000 },
    { id: 'l2', name: 'Reserved Fee', double: 500000, triple: 500000, quad: 500000 },
    { id: 'l3', name: 'Gimmick Fee', double: 500000, triple: 500000, quad: 500000 },
  ],
  pricing: {
    harga_jual: { double: 37400000, triple: 35400000, quad: 33400000 },
    harga_diskon: { double: 36900000, triple: 34900000, quad: 32900000 }
  }
};

// --- HELPER COMPONENT ---
const formatIdr = (val: number) => Math.round(val).toLocaleString('id-ID');


// --- STYLED COMPONENTS FOR SPREADSHEET ---
const Td = ({ children, className = "", rowSpan, colSpan }: { children?: React.ReactNode, className?: string, rowSpan?: number, colSpan?: number }) => (
  <td className={`relative border border-slate-300 p-1.5 has-[input]:p-0 text-[11px] align-middle ${className}`} rowSpan={rowSpan} colSpan={colSpan}>{children}</td>
);

const InputCell = ({ value, onChange, type = "number", className = "", options, id }: { value: any, onChange: (v: any) => void, type?: string, className?: string, options?: string[], id?: string }) => {
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(
    type === "number" ? (value === 0 ? "" : value.toLocaleString('id-ID')) : value
  );

  useEffect(() => {
    setLocalValue(type === "number" ? (value === 0 ? "" : value.toLocaleString('id-ID')) : value);
  }, [value, type]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (type !== "number") {
      setLocalValue(e.target.value);
      onChange(e.target.value);
      return;
    }
    
    const rawValue = e.target.value.replace(/\./g, '');
    if (rawValue === "") {
      setLocalValue("");
      onChange(0);
      return;
    }
    
    if (!isNaN(Number(rawValue))) {
      const num = Number(rawValue);
      setLocalValue(num.toLocaleString('id-ID'));
      onChange(num);
    }
  };

  const isDarkBg = className.includes('text-white');
  const bgClass = isDarkBg
    ? 'bg-transparent hover:bg-white/10'
    : 'bg-transparent hover:bg-slate-100/50';

  const inputEl = (
    <input 
      id={id}
      type="text" 
      value={localValue} 
      onChange={e => {
        handleChange(e);
        if (options) setOpen(true);
      }}
      onFocus={(e) => { 
        if (options) setOpen(true); 
        const target = e.target as HTMLInputElement;
        setTimeout(() => {
          if (target && typeof target.select === 'function') {
            target.select();
          }
        }, 30);
      }}
      onClick={e => {
        if (options) {
          e.stopPropagation();
        }
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          if (options) {
            const filtered = options.filter(o => o.toLowerCase().includes(String(localValue).toLowerCase()));
            if (filtered.length > 0) {
              setLocalValue(filtered[0]);
              onChange(filtered[0]);
            }
            setOpen(false);
          }
          e.currentTarget.blur();
        }
      }}
      className={cn("w-full h-full min-h-[28px] outline-none cursor-cell focus:cursor-text focus:bg-white focus:text-slate-900 focus:ring-[1.5px] focus:ring-blue-500 focus:border-transparent focus:relative focus:z-10 px-1.5 py-1 rounded-none", type === "number" ? "text-right" : "text-left", "font-medium transition-all", bgClass, className, options ? "pr-6" : "")}
      placeholder={type === "number" ? "0" : ""}
    />
  );

  if (options) {
    const filtered = options.filter(o => o.toLowerCase().includes(String(localValue).toLowerCase()));
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative w-full h-full flex items-center">
            {inputEl}
            <div className="absolute right-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-pointer hover:bg-slate-200/60 transition-colors text-slate-400 hover:text-slate-700">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start" onOpenAutoFocus={e => e.preventDefault()}>
          <div className="max-h-[200px] overflow-y-auto py-1">
             {filtered.map(opt => (
               <div 
                 key={opt} 
                 className="px-2 py-1.5 text-sm cursor-pointer hover:bg-slate-100"
                 onClick={() => {
                   setLocalValue(opt);
                   onChange(opt);
                   setOpen(false);
                 }}
               >
                 {opt}
               </div>
             ))}
             {filtered.length === 0 && (
               <div className="px-2 py-1.5 text-sm text-slate-500 italic">Ketik manual...</div>
             )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return inputEl;
};

export const CogsCalculator = ({ packageId, initialData, packageData, onSaved, isTemplate, onChange, readOnly }: { packageId?: string; initialData?: any; packageData?: any; onSaved?: () => void, isTemplate?: boolean, onChange?: (data: CogsDataV2, prices: RoomPricing) => void, /** Contributors: view the numbers, no save button. */ readOnly?: boolean }) => {
  const [data, setData] = useState<CogsDataV2>(() => {
    let parsed: CogsDataV2;
    if (!initialData || initialData.version !== "2.0") {
      parsed = JSON.parse(JSON.stringify(DEFAULT_COGS_V2));
    } else {
      parsed = initialData as CogsDataV2;
    }

    if (packageData) {
      // 1. Sync Maskapai (Flight)
      if (packageData.flight) {
        parsed.indo_expenses.esensial[0].name = 'Tiket Pesawat';
        parsed.indo_expenses.esensial[0].provider = packageData.flight;
      }

      // 2. Sync Hotels
      if (packageData.makkah_hotel_name && parsed.land_arrangement.hotels[0]) {
        parsed.land_arrangement.hotels[0].name = packageData.makkah_hotel_name;
      }
      if (packageData.madinah_hotel_name && parsed.land_arrangement.hotels[1]) {
        parsed.land_arrangement.hotels[1].name = packageData.madinah_hotel_name;
      }

      // 3. Sync Fasilitas (Add-ons)
      if (packageData.included_items && typeof packageData.included_items === 'string') {
        const items = packageData.included_items.split(',').map((i: string) => i.trim()).filter(Boolean);
        items.forEach((itemName: string, idx: number) => {
          const exists = parsed.indo_expenses.add_ons.some(a => a.name.toLowerCase() === itemName.toLowerCase());
          if (!exists) {
            parsed.indo_expenses.add_ons.push({
              id: 'ao_sync_' + Date.now() + '_' + idx,
              name: itemName,
              checked: true,
              double: 0, triple: 0, quad: 0
            });
          }
        });
      }
    }

    return parsed;
  });
  const [isSaving, setIsSaving] = useState(false);

  // -- HISTORY (UNDO/REDO) --
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoing, setIsUndoing] = useState(false);

  useEffect(() => {
    if (isUndoing) {
      setIsUndoing(false);
      return;
    }
    
    const handler = setTimeout(() => {
      const serialized = JSON.stringify(data);
      if (historyIndex === -1 || history[historyIndex] !== serialized) {
        setHistory(prev => {
          const newHistory = prev.slice(0, historyIndex + 1);
          newHistory.push(serialized);
          if (newHistory.length > 50) newHistory.shift();
          return newHistory;
        });
        setHistoryIndex(prev => {
          return prev === -1 ? 0 : Math.min(prev + 1, 49);
        });
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [data, isUndoing, historyIndex, history]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      setIsUndoing(true);
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setData(JSON.parse(history[prevIndex]));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setIsUndoing(true);
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setData(JSON.parse(history[nextIndex]));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // -- CALCULATIONS --
  
  // 1. HOTEL (SAR)
  const totalHotelSar = data.land_arrangement.hotels.reduce((acc, curr) => ({
    double: acc.double + curr.double, triple: acc.triple + curr.triple, quad: acc.quad + curr.quad
  }), { double: 0, triple: 0, quad: 0 });

  // 2. HOTEL (USD)
  const sarToUsd = (sar: number) => data.rates.sar_usd > 0 ? sar / data.rates.sar_usd : 0;
  const totalHotelUsd = {
    double: sarToUsd(totalHotelSar.double), triple: sarToUsd(totalHotelSar.triple), quad: sarToUsd(totalHotelSar.quad)
  };

  // 3. HANDLING & VISA (USD)
  const totalHandlingUsd = data.land_arrangement.handling.reduce((acc, curr) => ({
    double: acc.double + curr.double, triple: acc.triple + curr.triple, quad: acc.quad + curr.quad
  }), { double: 0, triple: 0, quad: 0 });

  const totalVisaUsd = data.land_arrangement.visa.reduce((acc, curr) => ({
    double: acc.double + curr.double, triple: acc.triple + curr.triple, quad: acc.quad + curr.quad
  }), { double: 0, triple: 0, quad: 0 });

  // TOTAL SAUDI (USD)
  const totalSaudiUsd = {
    double: totalHotelUsd.double + totalHandlingUsd.double + totalVisaUsd.double,
    triple: totalHotelUsd.triple + totalHandlingUsd.triple + totalVisaUsd.triple,
    quad: totalHotelUsd.quad + totalHandlingUsd.quad + totalVisaUsd.quad,
  };

  // TOTAL SAUDI (IDR)
  const usdToIdr = (usd: number) => usd * data.rates.usd_idr;
  const totalSaudiIdr = {
    double: usdToIdr(totalSaudiUsd.double), triple: usdToIdr(totalSaudiUsd.triple), quad: usdToIdr(totalSaudiUsd.quad)
  };

  // TOTAL INDONESIA (IDR) (Only checked items)
  const sumChecked = (items: ExpenseItem[]) => items.filter(i => i.checked && i.id !== 'e6' && i.id !== 'e7').reduce((acc, curr) => ({
    double: acc.double + curr.double, triple: acc.triple + curr.triple, quad: acc.quad + curr.quad
  }), { double: 0, triple: 0, quad: 0 });

  const totalEsensialIdr = sumChecked(data.indo_expenses.esensial);
  const totalAddonsIdr = sumChecked(data.indo_expenses.add_ons);
  
  const totalIndoIdr = {
    double: totalEsensialIdr.double + totalAddonsIdr.double,
    triple: totalEsensialIdr.triple + totalAddonsIdr.triple,
    quad: totalEsensialIdr.quad + totalAddonsIdr.quad,
  };

  // TOTAL INDO + SAUDI (IDR)
  const totalIndoSaudiIdr = {
    double: totalSaudiIdr.double + totalIndoIdr.double,
    triple: totalSaudiIdr.triple + totalIndoIdr.triple,
    quad: totalSaudiIdr.quad + totalIndoIdr.quad,
  };

  // TOTAL LAIN-LAIN (IDR)
  const totalLainLainIdr = data.lain_lain.reduce((acc, curr) => ({
    double: acc.double + curr.double, triple: acc.triple + curr.triple, quad: acc.quad + curr.quad
  }), { double: 0, triple: 0, quad: 0 });

  // GRAND TOTAL COGS (IDR)
  const finalCogsIdr = {
    double: totalIndoSaudiIdr.double + totalLainLainIdr.double,
    triple: totalIndoSaudiIdr.triple + totalLainLainIdr.triple,
    quad: totalIndoSaudiIdr.quad + totalLainLainIdr.quad,
  };

  const profit = {
    double: data.pricing.harga_jual.double - finalCogsIdr.double,
    triple: data.pricing.harga_jual.triple - finalCogsIdr.triple,
    quad: data.pricing.harga_jual.quad - finalCogsIdr.quad,
  };

  // -- HANDLERS --
  
  const handleRateChange = (field: keyof CogsDataV2['rates'], val: number) => {
    setData(prev => ({ ...prev, rates: { ...prev.rates, [field]: val } }));
  };

  const updateHotel = (id: string, field: keyof HotelItem, val: any) => {
    setData(prev => ({ ...prev, land_arrangement: { ...prev.land_arrangement, hotels: prev.land_arrangement.hotels.map(i => i.id === id ? { ...i, [field]: val } : i) } }));
  };

  const updateArrayItem = (path: 'handling' | 'visa', id: string, field: string, val: any) => {
    setData(prev => ({ ...prev, land_arrangement: { ...prev.land_arrangement, [path]: prev.land_arrangement[path].map((i: any) => i.id === id ? { ...i, [field]: val } : i) } }));
  };

  
  const addAddOn = () => {
    setData(prev => ({
      ...prev,
      indo_expenses: {
        ...prev.indo_expenses,
        add_ons: [
          ...prev.indo_expenses.add_ons,
          { id: 'ao' + Date.now(), name: '', double: 0, triple: 0, quad: 0, checked: true }
        ]
      }
    }));
  };

  
  const removeAddOn = (id: string) => {
    setData(prev => ({
      ...prev,
      indo_expenses: {
        ...prev.indo_expenses,
        add_ons: prev.indo_expenses.add_ons.filter(item => item.id !== id)
      }
    }));
  };

  
  const [dbFacilities, setDbFacilities] = useState<string[]>([]);
  const [dbHotels, setDbHotels] = useState<string[]>([]);
  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd + Shift + A (Mac) or Ctrl + Shift + A (Win)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyA') {
        e.preventDefault();
        addAddOn();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Auto-focus when Add-on is added
  const addOnsLength = data.indo_expenses.add_ons.length;
  useEffect(() => {
    if (addOnsLength > 0) {
      const lastItem = data.indo_expenses.add_ons[addOnsLength - 1];
      // Only focus if the name is empty (meaning it was just created)
      if (lastItem.name === '') {
        const el = document.getElementById(`input-name-${lastItem.id}`);
        if (el) el.focus();
      }
    }
  }, [addOnsLength]);

  useEffect(() => {
    // If it's a new package, fetch the master template
    if (!isTemplate && (!initialData || initialData.version !== "2.0")) {
      const fetchTemplate = async () => {
        const { data: tmpl } = await supabase.from('cogs_defaults').select('data').eq('id', 'default').single();
        if (tmpl && tmpl.data) {
          const parsed = tmpl.data as unknown as CogsDataV2;
          
          if (packageData) {
            if (packageData.flight && parsed.indo_expenses.esensial[0]) {
              parsed.indo_expenses.esensial[0].name = 'Tiket Pesawat';
              parsed.indo_expenses.esensial[0].provider = packageData.flight;
            }
            if (packageData.makkah_hotel_name && parsed.land_arrangement.hotels[0]) {
              parsed.land_arrangement.hotels[0].name = packageData.makkah_hotel_name;
            }
            if (packageData.madinah_hotel_name && parsed.land_arrangement.hotels[1]) {
              parsed.land_arrangement.hotels[1].name = packageData.madinah_hotel_name;
            }
            if (packageData.included_items && typeof packageData.included_items === 'string') {
              const items = packageData.included_items.split(',').map((i: string) => i.trim()).filter(Boolean);
              items.forEach((itemName: string, idx: number) => {
                const exists = parsed.indo_expenses.add_ons.some((a: any) => a.name.toLowerCase() === itemName.toLowerCase());
                if (!exists) {
                  parsed.indo_expenses.add_ons.push({
                    id: 'ao_sync_' + Date.now() + '_' + idx,
                    name: itemName,
                    checked: true,
                    double: 0, triple: 0, quad: 0
                  });
                }
              });
            }
          }
          
          setData(parsed);
        }
      };
      fetchTemplate();
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const [facilitiesRes, hotelsRes] = await Promise.all([
        supabase.from("package_items").select("name").eq("type", "include").eq("is_active", true),
        supabase.from("hotels").select("name").order("name")
      ]);
      
      const items = new Set<string>();
      if (facilitiesRes.data) {
        facilitiesRes.data.forEach(d => items.add(d.name));
      }
      if (typeof packageData?.included_items === 'string') {
        packageData.included_items.split(',').forEach((i: string) => {
          if (i.trim()) items.add(i.trim());
        });
      }
      setDbFacilities(Array.from(items).sort());

      if (hotelsRes.data) {
        setDbHotels(hotelsRes.data.map(d => d.name));
      }
    };
    fetchData();
  }, [packageData?.included_items]);

  const updateExpenseItem = (path: 'esensial' | 'add_ons', id: string, field: string, val: any) => {
    setData(prev => ({ ...prev, indo_expenses: { ...prev.indo_expenses, [path]: prev.indo_expenses[path].map((i: any) => i.id === id ? { ...i, [field]: val } : i) } }));
  };

  const updateLainLain = (id: string, field: string, val: any) => {
    setData(prev => ({ ...prev, lain_lain: prev.lain_lain.map(i => i.id === id ? { ...i, [field]: val } : i) }));
  };

  const updatePricing = (type: 'harga_jual' | 'harga_diskon', field: keyof RoomPricing, val: number) => {
    setData(prev => ({ ...prev, pricing: { ...prev.pricing, [type]: { ...prev.pricing[type], [field]: val } } }));
  };

  // Saving COGS also rewrites package_price, so a Final/live package must say why.
  const needsReason = !isTemplate && statusNeedsChangeReason(packageData?.status);
  const [reasonOpen, setReasonOpen] = useState(false);

  const requestSave = () => {
    if (needsReason) setReasonOpen(true);
    else saveCogs();
  };

  const saveCogs = async (changeReason?: string) => {
    if (!isTemplate && !packageId) {
      toast.error("Simpan paket terlebih dahulu (tombol Simpan utama) sebelum menyimpan COGS secara terpisah.");
      return;
    }
    setIsSaving(true);
    try {
      const gimmickFeeItem = data.lain_lain.find(item => item.name.toLowerCase().includes('gimmick')) || { double: 0, triple: 0, quad: 0 };
      const computedHargaDiskon = {
        quad: data.pricing.harga_jual.quad - gimmickFeeItem.quad,
        triple: data.pricing.harga_jual.triple - gimmickFeeItem.triple,
        double: data.pricing.harga_jual.double - gimmickFeeItem.double,
      };

      const packagePriceObj = {
        quad: computedHargaDiskon.quad > 0 ? computedHargaDiskon.quad : data.pricing.harga_jual.quad,
        triple: computedHargaDiskon.triple > 0 ? computedHargaDiskon.triple : data.pricing.harga_jual.triple,
        double: computedHargaDiskon.double > 0 ? computedHargaDiskon.double : data.pricing.harga_jual.double,
      };
      
      const dataToSave = {
        ...data,
        pricing: {
          ...data.pricing,
          harga_diskon: computedHargaDiskon
        }
      };

      let error;
      if (isTemplate) {
        const res = await supabase.from('cogs_defaults').upsert({ id: 'default', data: dataToSave });
        error = res.error;
      } else {
        const res = await supabase
          .from('packages')
          .update({
            cogs_data: dataToSave as any,
            cogs_status: 'Saved',
            package_price: packagePriceObj,
            ...(changeReason ? { change_reason: changeReason } : {}),
          })
          .eq('id', packageId)
          .select('id');
        error = res.error;
        // RLS rejects a write by returning zero rows rather than an error;
        // without this check the toast below claimed success for a save that never happened.
        if (!error && (res.data?.length ?? 0) === 0) {
          throw new Error("Akun kamu tidak punya izin mengubah paket ini.");
        }
      }

      if (error) throw error;
      setReasonOpen(false);
      toast.success(isTemplate ? "Template Master COGS berhasil disimpan!" : "HPP / COGS berhasil disimpan dan disinkronkan dengan Harga Paket");
      if (onSaved) onSaved();
    } catch (e: any) {
      toast.error(`Gagal menyimpan: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="space-y-4 max-w-full overflow-x-auto pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold uppercase tracking-tight">Kalkulator HPP / COGS</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleUndo} disabled={historyIndex <= 0} className="shadow-sm">
            <Undo2 className="w-4 h-4 mr-1.5" /> Undo
          </Button>
          <Button variant="outline" size="sm" onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="shadow-sm">
            <Redo2 className="w-4 h-4 mr-1.5" /> Redo
          </Button>
          {readOnly ? (
            <span className="text-sm text-muted-foreground">Mode lihat saja</span>
          ) : (
            <Button onClick={requestSave} disabled={isSaving} className="shadow-sm">
              <Save className="w-4 h-4 mr-2" /> Simpan Data COGS
            </Button>
          )}
        </div>
      </div>
      <ChangeReasonDialog
        open={reasonOpen}
        onOpenChange={setReasonOpen}
        onConfirm={(reason) => saveCogs(reason)}
        statusLabel={packageStatusLabel(packageData?.status)}
        loading={isSaving}
      />

      <div className="bg-white border border-slate-300 shadow-sm rounded-lg overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-[#B91C1C] text-white text-[11px] uppercase tracking-wider font-bold">
              <th rowSpan={2} className="border border-slate-300 p-2 text-center w-8">NO</th>
              <th rowSpan={2} className="border border-slate-300 p-2 w-[180px]">DESCRIPTION</th>
              <th colSpan={2} rowSpan={2} className="border border-slate-300 p-2 text-center">HOTEL</th>
              <th rowSpan={2} className="border border-slate-300 p-2 w-16 text-center">TYPE</th>
              <th colSpan={2} className="border border-slate-300 p-1 text-center border-b-white/20">DURASI</th>
              <th colSpan={3} className="border border-slate-300 p-1 text-center border-b-white/20">ALLOCATION/PAX/USD</th>
            </tr>
            <tr className="bg-[#B91C1C] text-white text-[11px] uppercase tracking-wider font-bold">
              <th className="border border-slate-300 p-1 text-center font-normal w-12">D</th>
              <th className="border border-slate-300 p-1 text-center font-normal w-12">N</th>
              <th className="border border-slate-300 p-1 text-center font-normal">DOUBLE</th>
              <th className="border border-slate-300 p-1 text-center font-normal">TRIPLE</th>
              <th className="border border-slate-300 p-1 text-center font-normal">QUAD</th>
            </tr>
          </thead>
          <tbody className="cursor-cell">
            
            {/* --- LAND ARRANGEMENT (SAUDI) --- */}
            <tr>
              <Td className="font-bold text-center vertical-middle" rowSpan={data.land_arrangement.hotels.length + data.land_arrangement.handling.length + data.land_arrangement.visa.length + 3}>
                <div className="writing-mode-vertical whitespace-nowrap rotate-180 font-black text-slate-400 tracking-widest text-xs inline-block" style={{ writingMode: 'vertical-rl' }}>LAND ARRANGEMENT (SAUDI)</div>
              </Td>
              
              {/* HOTELS */}
              <Td className="font-bold bg-slate-50 text-center" rowSpan={data.land_arrangement.hotels.length}>
                <div className="writing-mode-vertical whitespace-nowrap rotate-180 font-bold text-slate-600 inline-block" style={{ writingMode: 'vertical-rl' }}>HOTEL</div>
              </Td>
              <Td className="font-bold bg-slate-50">Makkah</Td>
              <Td><InputCell type="text" className="text-left font-sans" value={data.land_arrangement.hotels[0].name} onChange={v => updateHotel(data.land_arrangement.hotels[0].id, 'name', v)} options={dbHotels} /></Td>
              <Td className="text-center"><InputCell type="text" className="text-center font-sans" value={data.land_arrangement.hotels[0].type} onChange={v => updateHotel(data.land_arrangement.hotels[0].id, 'type', v)} /></Td>
              <Td className="p-0"><InputCell value={data.land_arrangement.hotels[0].dur_d} onChange={v => updateHotel(data.land_arrangement.hotels[0].id, 'dur_d', v)} className="text-center bg-slate-50"/></Td>
              <Td className="p-0"><InputCell value={data.land_arrangement.hotels[0].dur_n} onChange={v => updateHotel(data.land_arrangement.hotels[0].id, 'dur_n', v)} className="text-center bg-slate-50"/></Td>
              <Td className="font-medium text-right"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">SAR</span><InputCell className="w-full min-w-[80px]" value={data.land_arrangement.hotels[0].double} onChange={v => updateHotel(data.land_arrangement.hotels[0].id, 'double', v)} /></Td>
              <Td className="font-medium text-right"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">SAR</span><InputCell className="w-full min-w-[80px]" value={data.land_arrangement.hotels[0].triple} onChange={v => updateHotel(data.land_arrangement.hotels[0].id, 'triple', v)} /></Td>
              <Td className="font-medium text-right"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">SAR</span><InputCell className="w-full min-w-[80px]" value={data.land_arrangement.hotels[0].quad} onChange={v => updateHotel(data.land_arrangement.hotels[0].id, 'quad', v)} /></Td>
            </tr>
            <tr>
              <Td className="font-bold bg-slate-50">Madinah</Td>
              <Td><InputCell type="text" className="text-left font-sans" value={data.land_arrangement.hotels[1].name} onChange={v => updateHotel(data.land_arrangement.hotels[1].id, 'name', v)} options={dbHotels} /></Td>
              <Td className="text-center"><InputCell type="text" className="text-center font-sans" value={data.land_arrangement.hotels[1].type} onChange={v => updateHotel(data.land_arrangement.hotels[1].id, 'type', v)} /></Td>
              <Td className="p-0"><InputCell value={data.land_arrangement.hotels[1].dur_d} onChange={v => updateHotel(data.land_arrangement.hotels[1].id, 'dur_d', v)} className="text-center bg-slate-50"/></Td>
              <Td className="p-0"><InputCell value={data.land_arrangement.hotels[1].dur_n} onChange={v => updateHotel(data.land_arrangement.hotels[1].id, 'dur_n', v)} className="text-center bg-slate-50"/></Td>
              <Td className="font-medium text-right"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">SAR</span><InputCell className="w-full min-w-[80px]" value={data.land_arrangement.hotels[1].double} onChange={v => updateHotel(data.land_arrangement.hotels[1].id, 'double', v)} /></Td>
              <Td className="font-medium text-right"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">SAR</span><InputCell className="w-full min-w-[80px]" value={data.land_arrangement.hotels[1].triple} onChange={v => updateHotel(data.land_arrangement.hotels[1].id, 'triple', v)} /></Td>
              <Td className="font-medium text-right"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">SAR</span><InputCell className="w-full min-w-[80px]" value={data.land_arrangement.hotels[1].quad} onChange={v => updateHotel(data.land_arrangement.hotels[1].id, 'quad', v)} /></Td>
            </tr>

            {/* TOTAL COST HOTEL -> SAR */}
            <tr className="bg-slate-100 font-bold">
              <Td colSpan={6} className="text-right py-2 pr-4">TOTAL COST HOTEL ➔ SAR</Td>
              <Td className="font-medium text-right text-slate-800 bg-white"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">SAR</span>{formatIdr(totalHotelSar.double)}</Td>
              <Td className="font-medium text-right text-slate-800 bg-white"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">SAR</span>{formatIdr(totalHotelSar.triple)}</Td>
              <Td className="font-medium text-right text-slate-800 bg-white"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">SAR</span>{formatIdr(totalHotelSar.quad)}</Td>
            </tr>

            {/* KURS SAR -> USD */}
            <tr className="bg-[#E6F4EA] font-bold">
              <Td colSpan={4} className="text-right py-2 pr-4">KURS ➔ SAR to USD</Td>
              <Td colSpan={2} className="bg-[#FEF3C7] border-[#FDE68A]"><InputCell value={data.rates.sar_usd} onChange={v => handleRateChange('sar_usd', v)} className="text-center font-bold text-amber-900 w-full min-w-[80px]" /></Td>
              <Td className="font-medium text-right text-emerald-800"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">$</span>{formatIdr(totalHotelUsd.double)}</Td>
              <Td className="font-medium text-right text-emerald-800"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">$</span>{formatIdr(totalHotelUsd.triple)}</Td>
              <Td className="font-medium text-right text-emerald-800"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">$</span>{formatIdr(totalHotelUsd.quad)}</Td>
            </tr>

            {/* HANDLING */}
            {data.land_arrangement.handling.map((item, idx) => (
              <tr key={item.id}>
                {idx === 0 && (
                  <Td className="font-bold bg-slate-50 text-center" rowSpan={data.land_arrangement.handling.length}>
                    <div className="writing-mode-vertical whitespace-nowrap rotate-180 font-bold text-slate-600 inline-block" style={{ writingMode: 'vertical-rl' }}>HANDLING</div>
                  </Td>
                )}
                <Td colSpan={5} className="bg-white"><InputCell type="text" className="text-left font-sans" value={item.name} onChange={v => updateArrayItem('handling', item.id, 'name', v)} /></Td>
                {idx === 0 && (
                  <>
                    <Td rowSpan={data.land_arrangement.handling.length} className="font-medium text-right bg-white p-0"><div className="absolute inset-0 flex"><span className="absolute left-1.5 top-2 pointer-events-none text-slate-400 z-20">$</span><InputCell className="w-full h-full min-w-[80px] !pt-2" value={item.double} onChange={v => updateArrayItem('handling', item.id, 'double', v)} /></div></Td>
                    <Td rowSpan={data.land_arrangement.handling.length} className="font-medium text-right bg-white p-0"><div className="absolute inset-0 flex"><span className="absolute left-1.5 top-2 pointer-events-none text-slate-400 z-20">$</span><InputCell className="w-full h-full min-w-[80px] !pt-2" value={item.triple} onChange={v => updateArrayItem('handling', item.id, 'triple', v)} /></div></Td>
                    <Td rowSpan={data.land_arrangement.handling.length} className="font-medium text-right bg-white p-0"><div className="absolute inset-0 flex"><span className="absolute left-1.5 top-2 pointer-events-none text-slate-400 z-20">$</span><InputCell className="w-full h-full min-w-[80px] !pt-2" value={item.quad} onChange={v => updateArrayItem('handling', item.id, 'quad', v)} /></div></Td>
                  </>
                )}
              </tr>
            ))}

            {/* VISA */}
            {data.land_arrangement.visa.map((item, idx) => (
              <tr key={item.id}>
                {idx === 0 && (
                  <Td className="font-bold bg-slate-50 text-center" rowSpan={data.land_arrangement.visa.length}>
                    <div className="writing-mode-vertical whitespace-nowrap rotate-180 font-bold text-slate-600 inline-block" style={{ writingMode: 'vertical-rl' }}>VISA</div>
                  </Td>
                )}
                <Td colSpan={5} className="bg-white"><InputCell type="text" className="text-left font-sans" value={item.name} onChange={v => updateArrayItem('visa', item.id, 'name', v)} /></Td>
                {idx === 0 && (
                  <>
                    <Td rowSpan={data.land_arrangement.visa.length} className="font-medium text-right bg-white p-0"><div className="absolute inset-0 flex"><span className="absolute left-1.5 top-2 pointer-events-none text-slate-400 z-20">$</span><InputCell className="w-full h-full min-w-[80px] !pt-2" value={item.double} onChange={v => updateArrayItem('visa', item.id, 'double', v)} /></div></Td>
                    <Td rowSpan={data.land_arrangement.visa.length} className="font-medium text-right bg-white p-0"><div className="absolute inset-0 flex"><span className="absolute left-1.5 top-2 pointer-events-none text-slate-400 z-20">$</span><InputCell className="w-full h-full min-w-[80px] !pt-2" value={item.triple} onChange={v => updateArrayItem('visa', item.id, 'triple', v)} /></div></Td>
                    <Td rowSpan={data.land_arrangement.visa.length} className="font-medium text-right bg-white p-0"><div className="absolute inset-0 flex"><span className="absolute left-1.5 top-2 pointer-events-none text-slate-400 z-20">$</span><InputCell className="w-full h-full min-w-[80px] !pt-2" value={item.quad} onChange={v => updateArrayItem('visa', item.id, 'quad', v)} /></div></Td>
                  </>
                )}
              </tr>
            ))}

            {/* TOTAL COST SAUDI -> USD */}
            <tr className="bg-slate-100 font-bold">
              <Td colSpan={6} className="text-right py-2 pr-4">TOTAL COST SAUDI ➔ USD</Td>
              <Td className="font-medium text-right text-slate-800 bg-white"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">$</span>{formatIdr(totalSaudiUsd.double)}</Td>
              <Td className="font-medium text-right text-slate-800 bg-white"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">$</span>{formatIdr(totalSaudiUsd.triple)}</Td>
              <Td className="font-medium text-right text-slate-800 bg-white"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">$</span>{formatIdr(totalSaudiUsd.quad)}</Td>
            </tr>

            {/* KURS LA -> USD to IDR */}
            <tr className="bg-[#E6F4EA] font-bold">
              <Td colSpan={5} className="text-right py-2 pr-4">KURS LA ➔ USD to IDR</Td>
              <Td colSpan={2} className="bg-[#FEF3C7] border-[#FDE68A]"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-amber-700/50 text-[10px]">Rp</span><InputCell value={data.rates.usd_idr} onChange={v => handleRateChange('usd_idr', v)} className="text-right font-bold text-amber-900 w-full min-w-[80px]" /></Td>
              <Td className="font-medium text-right text-emerald-800"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">Rp</span>{formatIdr(totalSaudiIdr.double)}</Td>
              <Td className="font-medium text-right text-emerald-800"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">Rp</span>{formatIdr(totalSaudiIdr.triple)}</Td>
              <Td className="font-medium text-right text-emerald-800"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">Rp</span>{formatIdr(totalSaudiIdr.quad)}</Td>
            </tr>

            <tr className="bg-black"><Td colSpan={10} className="h-4 p-0 border-none"></Td></tr>

            {/* --- MUSAFAR'S EXPENSES (INDONESIA) --- */}
            
            {/* ESENSIAL */}
            
            {/* TIKET PESAWAT */}
            <tr>
              <Td className="font-bold text-center vertical-middle" rowSpan={9 + data.indo_expenses.add_ons.length + 1}>
                <div className="writing-mode-vertical whitespace-nowrap rotate-180 -translate-y-8 font-black text-slate-400 tracking-widest text-xs inline-block" style={{ writingMode: 'vertical-rl' }}>MUSAFAR'S EXPENSES (INDONESIA)</div>
              </Td>
              <Td className="font-bold bg-slate-50 text-center" rowSpan={9}>
                <div className="writing-mode-vertical whitespace-nowrap rotate-180 font-bold text-slate-600 inline-block" style={{ writingMode: 'vertical-rl' }}>ESENSIAL</div>
              </Td>
              <Td colSpan={5} className="bg-white p-0 relative group">
                <div className="flex items-center h-full px-1.5 py-1">
                  <div className="flex items-center mr-2 pr-2 w-[24px]"></div>
                  <div className="text-left font-sans flex-1 text-[11px] py-1 text-slate-700">Tiket Pesawat</div>
                  <div className="font-bold text-[10px] px-1 py-0.5 rounded ml-2 whitespace-nowrap border-b border-slate-300">
                    <InputCell type="text" options={["Garuda Indonesia", "Saudia", "Scoot Airlines", "Oman Air", "Qatar Airways", "Lion Air", "Emirates"]} className="text-left font-sans font-bold bg-transparent text-[10px] p-0" value={data.indo_expenses.esensial.find(i => i.id === 'e1')?.provider || ''} onChange={v => updateExpenseItem('esensial', 'e1', 'provider', v)} />
                  </div>
                </div>
              </Td>
              <Td className="font-medium text-right bg-white"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">Rp</span><InputCell className="w-full min-w-[80px]" value={data.indo_expenses.esensial.find(i=>i.id==='e1')?.double || 0} onChange={v => updateExpenseItem('esensial', 'e1', 'double', v)} /></Td>
              <Td className="font-medium text-right bg-white"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">Rp</span><InputCell className="w-full min-w-[80px]" value={data.indo_expenses.esensial.find(i=>i.id==='e1')?.triple || 0} onChange={v => updateExpenseItem('esensial', 'e1', 'triple', v)} /></Td>
              <Td className="font-medium text-right bg-white"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">Rp</span><InputCell className="w-full min-w-[80px]" value={data.indo_expenses.esensial.find(i=>i.id==='e1')?.quad || 0} onChange={v => updateExpenseItem('esensial', 'e1', 'quad', v)} /></Td>
            </tr>

            {/* PERLENGKAPAN */}
            <tr>
              <Td colSpan={5} className="bg-white p-0 relative group border-t-0">
                <div className="flex items-center h-full px-1.5 py-1">
                  <div className="flex items-center mr-2 border-r border-slate-200 pr-2">
                      <Checkbox checked={data.indo_expenses.esensial.find(i=>i.id==='e2')?.checked} onCheckedChange={(c) => updateExpenseItem('esensial', 'e2', 'checked', c)} className="h-4 w-4 rounded-sm border-slate-300"/>
                  </div>
                  <div className="text-left font-sans flex-1 text-[11px] py-1 text-slate-700">Perlengkapan</div>
                </div>
              </Td>
              <Td className={cn("font-medium text-right transition-colors", !data.indo_expenses.esensial.find(i=>i.id==='e2')?.checked && "opacity-30 bg-slate-50")}><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">Rp</span><InputCell className="w-full min-w-[80px]" value={data.indo_expenses.esensial.find(i=>i.id==='e2')?.double || 0} onChange={v => updateExpenseItem('esensial', 'e2', 'double', v)} /></Td>
              <Td className={cn("font-medium text-right transition-colors", !data.indo_expenses.esensial.find(i=>i.id==='e2')?.checked && "opacity-30 bg-slate-50")}><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">Rp</span><InputCell className="w-full min-w-[80px]" value={data.indo_expenses.esensial.find(i=>i.id==='e2')?.triple || 0} onChange={v => updateExpenseItem('esensial', 'e2', 'triple', v)} /></Td>
              <Td className={cn("font-medium text-right transition-colors", !data.indo_expenses.esensial.find(i=>i.id==='e2')?.checked && "opacity-30 bg-slate-50")}><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">Rp</span><InputCell className="w-full min-w-[80px]" value={data.indo_expenses.esensial.find(i=>i.id==='e2')?.quad || 0} onChange={v => updateExpenseItem('esensial', 'e2', 'quad', v)} /></Td>
            </tr>

            {/* TRANSMITTER */}
            <tr>
              <Td colSpan={5} className="bg-white p-0 relative group border-t-0">
                <div className="flex items-center h-full px-1.5 py-1">
                  <div className="flex items-center mr-2 border-r border-slate-200 pr-2">
                      <Checkbox checked={data.indo_expenses.esensial.find(i=>i.id==='e3')?.checked} onCheckedChange={(c) => updateExpenseItem('esensial', 'e3', 'checked', c)} className="h-4 w-4 rounded-sm border-slate-300"/>
                  </div>
                  <div className="text-left font-sans flex-1 text-[11px] py-1 text-slate-700">Transmitter</div>
                </div>
              </Td>
              <Td className={cn("font-medium text-right transition-colors", !data.indo_expenses.esensial.find(i=>i.id==='e3')?.checked && "opacity-30 bg-slate-50")}><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">Rp</span><InputCell className="w-full min-w-[80px]" value={data.indo_expenses.esensial.find(i=>i.id==='e3')?.double || 0} onChange={v => updateExpenseItem('esensial', 'e3', 'double', v)} /></Td>
              <Td className={cn("font-medium text-right transition-colors", !data.indo_expenses.esensial.find(i=>i.id==='e3')?.checked && "opacity-30 bg-slate-50")}><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">Rp</span><InputCell className="w-full min-w-[80px]" value={data.indo_expenses.esensial.find(i=>i.id==='e3')?.triple || 0} onChange={v => updateExpenseItem('esensial', 'e3', 'triple', v)} /></Td>
              <Td className={cn("font-medium text-right transition-colors", !data.indo_expenses.esensial.find(i=>i.id==='e3')?.checked && "opacity-30 bg-slate-50")}><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">Rp</span><InputCell className="w-full min-w-[80px]" value={data.indo_expenses.esensial.find(i=>i.id==='e3')?.quad || 0} onChange={v => updateExpenseItem('esensial', 'e3', 'quad', v)} /></Td>
            </tr>

            {/* MANASIK */}
            <tr>
              <Td colSpan={5} className="bg-white p-0 relative group border-t-0">
                <div className="flex items-center h-full px-1.5 py-1">
                  <div className="flex items-center mr-2 border-r border-slate-200 pr-2">
                      <Checkbox checked={data.indo_expenses.esensial.find(i=>i.id==='e4')?.checked} onCheckedChange={(c) => updateExpenseItem('esensial', 'e4', 'checked', c)} className="h-4 w-4 rounded-sm border-slate-300"/>
                  </div>
                  <div className="text-left font-sans flex-1 text-[11px] py-1 text-slate-700">Manasik</div>
                </div>
              </Td>
              <Td className={cn("font-medium text-right transition-colors", !data.indo_expenses.esensial.find(i=>i.id==='e4')?.checked && "opacity-30 bg-slate-50")}><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">Rp</span><InputCell className="w-full min-w-[80px]" value={data.indo_expenses.esensial.find(i=>i.id==='e4')?.double || 0} onChange={v => updateExpenseItem('esensial', 'e4', 'double', v)} /></Td>
              <Td className={cn("font-medium text-right transition-colors", !data.indo_expenses.esensial.find(i=>i.id==='e4')?.checked && "opacity-30 bg-slate-50")}><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">Rp</span><InputCell className="w-full min-w-[80px]" value={data.indo_expenses.esensial.find(i=>i.id==='e4')?.triple || 0} onChange={v => updateExpenseItem('esensial', 'e4', 'triple', v)} /></Td>
              <Td className={cn("font-medium text-right transition-colors", !data.indo_expenses.esensial.find(i=>i.id==='e4')?.checked && "opacity-30 bg-slate-50")}><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">Rp</span><InputCell className="w-full min-w-[80px]" value={data.indo_expenses.esensial.find(i=>i.id==='e4')?.quad || 0} onChange={v => updateExpenseItem('esensial', 'e4', 'quad', v)} /></Td>
            </tr>

            {/* MERGED: HANDLING, SISKOPATUH, ASURANSI (e5) */}
            <tr>
              <Td colSpan={5} className="bg-white p-0 relative group border-t-0 border-b-0">
                <div className="flex items-center h-full px-1.5 py-1">
                  <div className="flex items-center mr-2 pr-2 w-[24px]"></div>
                  <div className="text-left font-sans flex-1 text-[11px] py-0.5 text-slate-700">Handling (Jakarta PP)</div>
                </div>
              </Td>
              <Td rowSpan={3} className={cn("font-medium text-right p-0 transition-colors", !data.indo_expenses.esensial.find(i=>i.id==='e5')?.checked && "opacity-30 bg-slate-50")}>
                <div className="absolute inset-0 flex"><span className="absolute left-1.5 top-2 pointer-events-none text-slate-400 z-20">Rp</span><InputCell className="w-full h-full min-w-[80px] !pt-2" value={data.indo_expenses.esensial.find(i=>i.id==='e5')?.double || 0} onChange={v => updateExpenseItem('esensial', 'e5', 'double', v)} /></div>
              </Td>
              <Td rowSpan={3} className={cn("font-medium text-right p-0 transition-colors", !data.indo_expenses.esensial.find(i=>i.id==='e5')?.checked && "opacity-30 bg-slate-50")}>
                <div className="absolute inset-0 flex"><span className="absolute left-1.5 top-2 pointer-events-none text-slate-400 z-20">Rp</span><InputCell className="w-full h-full min-w-[80px] !pt-2" value={data.indo_expenses.esensial.find(i=>i.id==='e5')?.triple || 0} onChange={v => updateExpenseItem('esensial', 'e5', 'triple', v)} /></div>
              </Td>
              <Td rowSpan={3} className={cn("font-medium text-right p-0 transition-colors", !data.indo_expenses.esensial.find(i=>i.id==='e5')?.checked && "opacity-30 bg-slate-50")}>
                <div className="absolute inset-0 flex"><span className="absolute left-1.5 top-2 pointer-events-none text-slate-400 z-20">Rp</span><InputCell className="w-full h-full min-w-[80px] !pt-2" value={data.indo_expenses.esensial.find(i=>i.id==='e5')?.quad || 0} onChange={v => updateExpenseItem('esensial', 'e5', 'quad', v)} /></div>
              </Td>
            </tr>
            <tr>
              <Td colSpan={5} className="bg-white p-0 relative group border-t-0 border-b-0">
                <div className="flex items-center h-full px-1.5 py-1">
                  <div className="flex items-center mr-2 border-r border-slate-200 pr-2">
                      <Checkbox checked={data.indo_expenses.esensial.find(i=>i.id==='e5')?.checked} onCheckedChange={(c) => updateExpenseItem('esensial', 'e5', 'checked', c)} className="h-4 w-4 rounded-sm border-slate-300"/>
                  </div>
                  <div className="text-left font-sans flex-1 text-[11px] py-0.5 text-slate-700">Siskopatuh</div>
                </div>
              </Td>
            </tr>
            <tr>
              <Td colSpan={5} className="bg-white p-0 relative group border-t-0">
                <div className="flex items-center h-full px-1.5 py-1">
                  <div className="flex items-center mr-2 pr-2 w-[24px]"></div>
                  <div className="text-left font-sans flex-1 text-[11px] py-0.5 text-slate-700">Asuransi</div>
                </div>
              </Td>
            </tr>

            {/* TOUR LEADER */}
            <tr>
              <Td colSpan={5} className="bg-white p-0 relative group border-t-0">
                <div className="flex items-center h-full px-1.5 py-1">
                  <div className="flex items-center mr-2 border-r border-slate-200 pr-2">
                      <Checkbox checked={data.indo_expenses.esensial.find(i=>i.id==='e8')?.checked} onCheckedChange={(c) => updateExpenseItem('esensial', 'e8', 'checked', c)} className="h-4 w-4 rounded-sm border-slate-300"/>
                  </div>
                  <div className="text-left font-sans flex-1 text-[11px] py-1 text-slate-700">Tour Leader</div>
                </div>
              </Td>
              <Td className={cn("font-medium text-right transition-colors", !data.indo_expenses.esensial.find(i=>i.id==='e8')?.checked && "opacity-30 bg-slate-50")}><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">Rp</span><InputCell className="w-full min-w-[80px]" value={data.indo_expenses.esensial.find(i=>i.id==='e8')?.double || 0} onChange={v => updateExpenseItem('esensial', 'e8', 'double', v)} /></Td>
              <Td className={cn("font-medium text-right transition-colors", !data.indo_expenses.esensial.find(i=>i.id==='e8')?.checked && "opacity-30 bg-slate-50")}><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">Rp</span><InputCell className="w-full min-w-[80px]" value={data.indo_expenses.esensial.find(i=>i.id==='e8')?.triple || 0} onChange={v => updateExpenseItem('esensial', 'e8', 'triple', v)} /></Td>
              <Td className={cn("font-medium text-right transition-colors", !data.indo_expenses.esensial.find(i=>i.id==='e8')?.checked && "opacity-30 bg-slate-50")}><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">Rp</span><InputCell className="w-full min-w-[80px]" value={data.indo_expenses.esensial.find(i=>i.id==='e8')?.quad || 0} onChange={v => updateExpenseItem('esensial', 'e8', 'quad', v)} /></Td>
            </tr>

            {/* MARKETING EXPO */}
            <tr>
              <Td colSpan={5} className="bg-white p-0 relative group border-t-0">
                <div className="flex items-center h-full px-1.5 py-1">
                  <div className="flex items-center mr-2 border-r border-slate-200 pr-2">
                      <Checkbox checked={data.indo_expenses.esensial.find(i=>i.id==='e9')?.checked} onCheckedChange={(c) => updateExpenseItem('esensial', 'e9', 'checked', c)} className="h-4 w-4 rounded-sm border-slate-300"/>
                  </div>
                  <div className="text-left font-sans flex-1 text-[11px] py-1 text-slate-700">Anggaran Marketing & Expo</div>
                </div>
              </Td>
              <Td className={cn("font-medium text-right transition-colors", !data.indo_expenses.esensial.find(i=>i.id==='e9')?.checked && "opacity-30 bg-slate-50")}><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">Rp</span><InputCell className="w-full min-w-[80px]" value={data.indo_expenses.esensial.find(i=>i.id==='e9')?.double || 0} onChange={v => updateExpenseItem('esensial', 'e9', 'double', v)} /></Td>
              <Td className={cn("font-medium text-right transition-colors", !data.indo_expenses.esensial.find(i=>i.id==='e9')?.checked && "opacity-30 bg-slate-50")}><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">Rp</span><InputCell className="w-full min-w-[80px]" value={data.indo_expenses.esensial.find(i=>i.id==='e9')?.triple || 0} onChange={v => updateExpenseItem('esensial', 'e9', 'triple', v)} /></Td>
              <Td className={cn("font-medium text-right transition-colors", !data.indo_expenses.esensial.find(i=>i.id==='e9')?.checked && "opacity-30 bg-slate-50")}><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">Rp</span><InputCell className="w-full min-w-[80px]" value={data.indo_expenses.esensial.find(i=>i.id==='e9')?.quad || 0} onChange={v => updateExpenseItem('esensial', 'e9', 'quad', v)} /></Td>
            </tr>


            {/* ADD ONS */}
            
            
            
            {data.indo_expenses.add_ons.map((item, idx) => (
              <tr key={item.id}>
                {idx === 0 && (
                  <Td className="font-bold bg-slate-50 text-center" rowSpan={data.indo_expenses.add_ons.length + 1}>
                    <div className="writing-mode-vertical whitespace-nowrap rotate-180 font-bold text-slate-600 inline-block" style={{ writingMode: 'vertical-rl' }}>ADD ONS</div>
                  </Td>
                )}
                <Td colSpan={5} className="bg-white p-0 relative group">
                    <div className="flex items-center h-full px-1.5 py-1">
                      <div className="flex items-center mr-2 border-r border-slate-200 pr-2">
                         <Checkbox checked={item.checked} onCheckedChange={(checked) => updateExpenseItem('add_ons', item.id, 'checked', checked)} className="h-4 w-4 rounded-sm border-slate-300"/>
                      </div>
                      <InputCell id={`input-name-${item.id}`} type="text" className="text-left font-sans flex-1 text-[11px]" value={item.name} onChange={v => updateExpenseItem('add_ons', item.id, 'name', v)} options={dbFacilities} />
                      <div className="flex items-center ml-2 pl-2">
                         <button type="button" onClick={() => removeAddOn(item.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Hapus Fasilitas">
                            <Trash2 className="w-3.5 h-3.5" />
                         </button>
                      </div>
                    </div>
                </Td>
                <Td className={cn("font-medium text-right transition-colors", !item.checked && "text-slate-300 bg-slate-50")}><span className={cn("absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none", item.checked ? "text-slate-400" : "text-slate-200")}>Rp</span>{item.checked ? <InputCell className="w-full min-w-[80px]" value={item.double} onChange={v => updateExpenseItem('add_ons', item.id, 'double', v)} /> : "-"}</Td>
                <Td className={cn("font-medium text-right transition-colors", !item.checked && "text-slate-300 bg-slate-50")}><span className={cn("absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none", item.checked ? "text-slate-400" : "text-slate-200")}>Rp</span>{item.checked ? <InputCell className="w-full min-w-[80px]" value={item.triple} onChange={v => updateExpenseItem('add_ons', item.id, 'triple', v)} /> : "-"}</Td>
                <Td className={cn("font-medium text-right transition-colors", !item.checked && "text-slate-300 bg-slate-50")}><span className={cn("absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none", item.checked ? "text-slate-400" : "text-slate-200")}>Rp</span>{item.checked ? <InputCell className="w-full min-w-[80px]" value={item.quad} onChange={v => updateExpenseItem('add_ons', item.id, 'quad', v)} /> : "-"}</Td>
              </tr>
            ))}
            
            {/* ADD ON BUTTON ROW */}
            <tr>
              {data.indo_expenses.add_ons.length === 0 && (
                <Td className="font-bold bg-slate-50 text-center" rowSpan={1}>
                  <div className="writing-mode-vertical whitespace-nowrap rotate-180 font-bold text-slate-600 inline-block" style={{ writingMode: 'vertical-rl' }}>ADD ONS</div>
                </Td>
              )}
              <Td colSpan={8} className="bg-white p-0 text-left">
                <button type="button" onClick={addAddOn} className="flex items-center text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors ml-1 my-1">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Add-on
                </button>
              </Td>
            </tr>

            {/* TOTAL COST INDONESIA */}
            <tr className="bg-[#E6F4EA] font-bold">
              <Td colSpan={7} className="text-right py-2 pr-4">TOTAL COST ➔ INDONESIA</Td>
              <Td className="font-medium text-right text-emerald-800"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">Rp</span>{formatIdr(totalIndoIdr.double)}</Td>
              <Td className="font-medium text-right text-emerald-800"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">Rp</span>{formatIdr(totalIndoIdr.triple)}</Td>
              <Td className="font-medium text-right text-emerald-800"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">Rp</span>{formatIdr(totalIndoIdr.quad)}</Td>
            </tr>

            <tr className="bg-black"><Td colSpan={10} className="h-4 p-0 border-none"></Td></tr>

            {/* TOTAL COST INDO + SAUDI */}
            <tr className="bg-[#E6F4EA] font-bold">
              <Td colSpan={7} className="text-right py-2 pr-4">TOTAL COST ➔ INDO + SAUDI</Td>
              <Td className="font-medium text-right text-emerald-900"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">Rp</span>{formatIdr(totalIndoSaudiIdr.double)}</Td>
              <Td className="font-medium text-right text-emerald-900"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">Rp</span>{formatIdr(totalIndoSaudiIdr.triple)}</Td>
              <Td className="font-medium text-right text-emerald-900"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">Rp</span>{formatIdr(totalIndoSaudiIdr.quad)}</Td>
            </tr>

            <tr className="bg-black"><Td colSpan={10} className="h-4 p-0 border-none"></Td></tr>

            {/* --- LAIN-LAIN --- */}
            {data.lain_lain.map((item, idx) => (
              <tr key={item.id}>
                {idx === 0 && (
                  <Td className="font-bold bg-slate-50 text-center" rowSpan={data.lain_lain.length + 1} colSpan={2}>
                    <div className="font-black text-slate-400 tracking-widest text-xs whitespace-nowrap inline-block">LAIN - LAIN</div>
                  </Td>
                )}
                <Td colSpan={5} className="bg-white"><InputCell type="text" className="text-left font-sans text-[11px]" value={item.name} onChange={v => updateLainLain(item.id, 'name', v)} /></Td>
                <Td className="font-medium text-right"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">Rp</span><InputCell className="w-full min-w-[80px]" value={item.double} onChange={v => updateLainLain(item.id, 'double', v)} /></Td>
                <Td className="font-medium text-right"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">Rp</span><InputCell className="w-full min-w-[80px]" value={item.triple} onChange={v => updateLainLain(item.id, 'triple', v)} /></Td>
                <Td className="font-medium text-right"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">Rp</span><InputCell className="w-full min-w-[80px]" value={item.quad} onChange={v => updateLainLain(item.id, 'quad', v)} /></Td>
              </tr>
            ))}
            
            {/* TOTAL LAIN-LAIN */}
            <tr className="bg-[#E6F4EA] font-bold">
              <Td colSpan={5} className="text-right py-2 pr-4">TOTAL COST ➔ LAIN-LAIN</Td>
              <Td className="font-medium text-right text-emerald-800"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">Rp</span>{formatIdr(totalLainLainIdr.double)}</Td>
              <Td className="font-medium text-right text-emerald-800"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">Rp</span>{formatIdr(totalLainLainIdr.triple)}</Td>
              <Td className="font-medium text-right text-emerald-800"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">Rp</span>{formatIdr(totalLainLainIdr.quad)}</Td>
            </tr>

            <tr className="bg-black"><Td colSpan={10} className="h-4 p-0 border-none"></Td></tr>

            {/* --- FINAL --- */}
            <tr className="bg-[#E6F4EA] font-bold text-sm">
              <Td rowSpan={4} colSpan={2} className="font-bold bg-slate-50 text-center"><div className="font-black text-slate-500 tracking-widest">FINAL</div></Td>
              <Td colSpan={5} className="text-right py-2 pr-4">TOTAL ➔ COGS</Td>
              <Td className="font-medium text-right text-emerald-900 py-2"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">Rp</span>{formatIdr(finalCogsIdr.double)}</Td>
              <Td className="font-medium text-right text-emerald-900 py-2"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">Rp</span>{formatIdr(finalCogsIdr.triple)}</Td>
              <Td className="font-medium text-right text-emerald-900 py-2"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">Rp</span>{formatIdr(finalCogsIdr.quad)}</Td>
            </tr>
            <tr className="bg-[#166534] text-white font-bold">
              <Td colSpan={5} className="text-left border-[#14532D] pl-4">Harga Jual</Td>
              <Td className="font-medium text-right border-[#14532D]"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 text-[10px]">Rp</span><InputCell className="w-full min-w-[80px] text-white font-bold text-sm" value={data.pricing.harga_jual.double} onChange={v => updatePricing('harga_jual', 'double', v)} /></Td>
              <Td className="font-medium text-right border-[#14532D]"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 text-[10px]">Rp</span><InputCell className="w-full min-w-[80px] text-white font-bold text-sm" value={data.pricing.harga_jual.triple} onChange={v => updatePricing('harga_jual', 'triple', v)} /></Td>
              <Td className="font-medium text-right border-[#14532D]"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 text-[10px]">Rp</span><InputCell className="w-full min-w-[80px] text-white font-bold text-sm" value={data.pricing.harga_jual.quad} onChange={v => updatePricing('harga_jual', 'quad', v)} /></Td>
            </tr>
            <tr className={cn("font-bold", (profit.double < 0 || profit.triple < 0 || profit.quad < 0) ? "bg-red-600 text-white" : "bg-[#0284C7] text-white")}>
              <Td colSpan={5} className="text-left border-[#0369A1] pl-4">
                Profit
                {(profit.double < 0 || profit.triple < 0 || profit.quad < 0) && (
                  <span className="ml-2 font-normal text-red-100">⚠ Harga jual di bawah COGS — rugi per jamaah</span>
                )}
              </Td>
              <Td className="font-medium text-right border-[#0369A1] text-sm"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 text-[10px]">Rp</span>{formatIdr(profit.double)}</Td>
              <Td className="font-medium text-right border-[#0369A1] text-sm"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 text-[10px]">Rp</span>{formatIdr(profit.triple)}</Td>
              <Td className="font-medium text-right border-[#0369A1] text-sm"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 text-[10px]">Rp</span>{formatIdr(profit.quad)}</Td>
            </tr>
            {(() => {
              const gimmickFeeItem = data.lain_lain.find(item => item.name.toLowerCase().includes('gimmick')) || { double: 0, triple: 0, quad: 0 };
              const hargaDiskon = {
                double: data.pricing.harga_jual.double - gimmickFeeItem.double,
                triple: data.pricing.harga_jual.triple - gimmickFeeItem.triple,
                quad: data.pricing.harga_jual.quad - gimmickFeeItem.quad,
              };
              return (
                <tr className="bg-[#9F1239] text-white font-bold">
                  <Td colSpan={5} className="text-left border-[#881337] pl-4">Harga Setelah Diskon</Td>
                  <Td className="font-bold text-right border-[#881337] text-sm pr-4"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 text-[10px]">Rp</span>{formatIdr(hargaDiskon.double)}</Td>
                  <Td className="font-bold text-right border-[#881337] text-sm pr-4"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 text-[10px]">Rp</span>{formatIdr(hargaDiskon.triple)}</Td>
                  <Td className="font-bold text-right border-[#881337] text-sm pr-4"><span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 text-[10px]">Rp</span>{formatIdr(hargaDiskon.quad)}</Td>
                </tr>
              );
            })()}

          </tbody>
        </table>
      </div>
    </div>
  );
};
