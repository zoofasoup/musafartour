import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, Send, RotateCcw, WifiOff, Wifi } from "lucide-react";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import { supabase } from "@/integrations/supabase/client";
import musafarLogo from "@/assets/musafar-logo-dark.svg";
import { z } from "zod";

const leadSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  whatsapp: z
    .string()
    .trim()
    .min(10, "Nomor WhatsApp minimal 10 digit")
    .max(15)
    .regex(/^[0-9+]+$/, "Nomor WhatsApp hanya boleh angka"),
});

// IndexedDB helpers for offline lead storage
const DB_NAME = "musafar_booth_leads";
const STORE_NAME = "leads";

function openLeadDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveLead(name: string, whatsapp: string) {
  const db = await openLeadDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).add({ name, whatsapp, created_at: new Date().toISOString() });
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllLeads(): Promise<{ id: number; name: string; whatsapp: string; created_at: string }[]> {
  const db = await openLeadDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteLead(id: number) {
  const db = await openLeadDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(id);
}

async function syncOfflineLeads() {
  try {
    const leads = await getAllLeads();
    if (leads.length === 0) return 0;
    
    let synced = 0;
    for (const lead of leads) {
      try {
        // Save to whatsapp_clicks as a booth lead record
        await supabase.from("whatsapp_clicks").insert({
          cs_name: "Booth Lead",
          message: `Booth lead: ${lead.name} (${lead.whatsapp})`,
          referrer: "/booth",
        });
        await deleteLead(lead.id);
        synced++;
      } catch {
        // Skip failed ones, will retry next sync
      }
    }
    return synced;
  } catch {
    return 0;
  }
}

const BoothLead = () => {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [errors, setErrors] = useState<{ name?: string; whatsapp?: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  // Online/offline detection + auto-sync
  useEffect(() => {
    const goOnline = async () => {
      setIsOnline(true);
      const synced = await syncOfflineLeads();
      if (synced > 0) {
        setPendingCount(0);
      }
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Initial sync attempt
    syncOfflineLeads().then(() => getAllLeads().then(l => setPendingCount(l.length)));

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = leadSchema.safeParse({ name, whatsapp });
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof typeof errors;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSending(true);

    // Always save to IndexedDB first (offline-first)
    await saveLead(result.data.name, result.data.whatsapp);

    if (isOnline) {
      // If online, sync immediately and open WhatsApp
      await syncOfflineLeads();
      const message = `Assalamu'alaikum, saya ${result.data.name} (WA: ${result.data.whatsapp}). Saya baru saja mengunjungi booth Musafar Tour dan tertarik dengan paket umroh. Mohon informasi lebih lanjut. Terima kasih!`;
      await redirectToWhatsApp(message);
      setPendingCount(0);
    } else {
      // Offline: just save, will sync later
      const leads = await getAllLeads();
      setPendingCount(leads.length);
    }

    setSending(false);
    setSubmitted(true);
  };

  const handleReset = () => {
    setName("");
    setWhatsapp("");
    setErrors({});
    setSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Offline/Online Banner */}
      <div className={`fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
        isOnline
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
      }`}>
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            Online — Data tersinkronisasi
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            Anda sedang Offline — Data akan disimpan lokal
            {pendingCount > 0 && ` (${pendingCount} lead tertunda)`}
          </>
        )}
      </div>

      <Card className="w-full max-w-md shadow-xl border-0 bg-card mt-12">
        <CardHeader className="text-center pb-4">
          <img
            src={musafarLogo}
            alt="Musafar Tour"
            className="h-10 mx-auto mb-4"
            width="200"
            height="40"
          />
          <CardTitle className="text-2xl tracking-tight font-bold">
            {submitted ? "Terima Kasih! 🤍" : "Daftar Sekarang"}
          </CardTitle>
          <CardDescription className="text-sm leading-snug">
            {submitted
              ? `${name}, tim kami akan segera menghubungi Anda via WhatsApp.`
              : "Isi data singkat, tim kami langsung follow up via WhatsApp."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {submitted ? (
            <div className="flex flex-col items-center gap-6 py-4">
              <CheckCircle className="w-16 h-16 text-primary" />
              <p className="text-center text-muted-foreground text-sm">
                {isOnline
                  ? "Pesan otomatis telah dikirim ke tim CS kami."
                  : "Data tersimpan offline. Akan otomatis terkirim saat ada koneksi internet."}
              </p>
              <Button onClick={handleReset} variant="outline" className="gap-2 w-full">
                <RotateCcw className="w-4 h-4" />
                Input Lead Baru
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Nama Lengkap
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ahmad Fauzi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  autoFocus
                  className="h-12 text-base"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-sm font-medium">
                  Nomor WhatsApp
                </Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  placeholder="08123456789"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  autoComplete="tel"
                  className="h-12 text-base"
                />
                {errors.whatsapp && (
                  <p className="text-xs text-destructive">{errors.whatsapp}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={sending}
                className="w-full h-12 text-base font-semibold gap-2"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {isOnline ? "Kirim & Hubungi via WhatsApp" : "Simpan Lead (Offline)"}
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BoothLead;