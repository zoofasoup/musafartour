import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { formatIDR, type TierResult } from "@/lib/umrohCalc";
import musafarLogo from "@/assets/musafar-logo-dark.svg";

import { PRICING_FOOTNOTE } from "@/lib/calcConfig";

const BRAND = {
  red: "#C8102E",
  gold: "#FFB100",
  ink: "#262626",
  bg: "#F2F3F3",
  muted: "#989999",
};

interface LeadRow {
  id: string;
  name: string;
  whatsapp: string;
  monthly_saving: number;
  pilgrim_count: number;
  existing_savings: number;
  recommended_tier: string | null;
  daily_target: number | null;
  months_to_departure: number | null;
  result_data: any;
}

export default function UmrohCalculatorResult() {
  const { id } = useParams();
  const [lead, setLead] = useState<LeadRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (document.getElementById("onest-font")) return;
    const link = document.createElement("link");
    link.id = "onest-font";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Onest:wght@300;400;500;600;700;800;900&display=swap";
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data, error } = await supabase
        .rpc("get_calculator_lead_by_token", { _token: id });
      if (!error && data) {
        const row = Array.isArray(data) ? data[0] : data;
        if (row) setLead(row as any);
      }
      setLoading(false);
    })();
  }, [id]);

  const resultUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/kalkulator/hasil/${id}`
      : "";

  const results: TierResult[] = lead?.result_data?.results ?? [];
  const recommended = results.find((r) => r.tier === lead?.recommended_tier) ?? results[0];

  const waMessage = lead
    ? `Assalamu'alaikum, saya ${lead.name}. Saya baru saja pakai Kalkulator Kesiapan Umroh Musafar.\n\n*Rencana saya:*\n• Sisihkan: ${formatIDR(lead.monthly_saving)}/bulan\n• Jumlah jamaah: ${lead.pilgrim_count} orang\n• Tabungan awal: ${formatIDR(lead.existing_savings)}\n\n*Hasil:*\n• Paket cocok: ${recommended?.label ?? "-"}\n• Insya Allah berangkat: ${recommended?.feasibleLabel ?? "-"}\n• Target harian: ${formatIDR(lead.daily_target ?? 0)}/hari\n\nLink hasil: ${resultUrl}\n\nMohon info lebih lanjut. Terima kasih.`
    : "";
  const waHref = lead
    ? `https://wa.me/?text=${encodeURIComponent(waMessage)}`
    : "#";

  return (
    <div
      style={{
        background: BRAND.bg,
        color: BRAND.ink,
        fontFamily:
          "'Onest', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        minHeight: "100vh",
        letterSpacing: "-0.02em",
      }}
    >
      <header className="px-6 py-5 flex items-center justify-between">
        <img src={musafarLogo} alt="Musafar" className="h-7" />
        <div
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: BRAND.muted }}
        >
          Hasil Financial Planner
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-16">
        {loading && (
          <div className="text-center py-24" style={{ color: BRAND.muted }}>
            Memuat hasilmu…
          </div>
        )}
        {!loading && !lead && (
          <div className="text-center py-24">
            <div className="text-2xl font-black" style={{ letterSpacing: "-0.04em" }}>
              Hasil tidak ditemukan
            </div>
            <p className="mt-2" style={{ color: BRAND.muted }}>
              Link mungkin sudah tidak berlaku.
            </p>
          </div>
        )}

        {lead && recommended && (
          <div className="space-y-6">
            {/* Hero result card */}
            <div
              className="rounded-3xl p-8 md:p-10 text-center"
              style={{ background: "white", boxShadow: "0 20px 60px -20px rgba(0,0,0,0.12)" }}
            >
              <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: BRAND.muted }}>
                {lead.name}, ini rencanamu
              </div>
              <div className="text-base mb-4" style={{ color: BRAND.muted }}>
                Insya Allah, berangkat di
              </div>
              <div
                className="text-5xl md:text-7xl font-black"
                style={{ color: BRAND.red, letterSpacing: "-0.05em", lineHeight: 0.95 }}
              >
                {recommended.feasibleLabel}
              </div>
              <div className="mt-4 inline-block px-4 py-1.5 rounded-full text-sm font-bold" style={{ background: BRAND.gold + "33", color: BRAND.ink }}>
                Paket {recommended.label} · {formatIDR(recommended.pricePerPerson)}/jamaah
              </div>
            </div>

            {/* Daily target */}
            <div className="grid grid-cols-3 gap-3">
              <Mini label="Per hari" value={formatIDR(lead.daily_target ?? 0)} accent />
              <Mini label="Per bulan" value={formatIDR(lead.monthly_saving)} />
              <Mini label="Jamaah" value={`${lead.pilgrim_count} orang`} />
            </div>

            {/* Ladder */}
            <div
              className="rounded-3xl p-6"
              style={{ background: "white", boxShadow: "0 20px 60px -20px rgba(0,0,0,0.08)" }}
            >
              <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: BRAND.muted }}>
                Tangga keberangkatanmu
              </div>
              <div className="space-y-2">
                {results.map((r) => {
                  const isRec = r.tier === lead.recommended_tier;
                  return (
                    <div
                      key={r.tier}
                      className="rounded-2xl px-4 py-3 flex items-center justify-between"
                      style={{
                        background: isRec ? BRAND.red : BRAND.bg,
                        color: isRec ? "white" : BRAND.ink,
                      }}
                    >
                      <div className="text-sm font-bold uppercase">{r.label}</div>
                      <div className="text-right">
                        <div className="text-sm font-black" style={{ letterSpacing: "-0.02em" }}>
                          {r.monthsRequired >= 999 ? "—" : r.feasibleLabel}
                        </div>
                        <div className="text-[10px] opacity-75 uppercase tracking-widest">
                          {r.monthsRequired >= 999 ? "Perlu tambahan" : `${r.monthsRequired} bulan`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CTA + QR */}
            <div
              className="rounded-3xl p-6 md:p-8 grid md:grid-cols-[1fr_auto] gap-6 items-center"
              style={{ background: BRAND.ink, color: "white" }}
            >
              <div>
                <div className="text-xs font-bold uppercase tracking-widest mb-2 opacity-70">
                  Bawa pulang hasilmu
                </div>
                <div className="text-xl md:text-2xl font-black mb-3" style={{ letterSpacing: "-0.035em" }}>
                  Scan QR ini dengan HP-mu, atau kirim ke WhatsApp.
                </div>
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-12 px-5 rounded-full font-bold text-sm"
                  style={{ background: BRAND.red, color: "white" }}
                >
                  Kirim ke WhatsApp Saya →
                </a>
              </div>
              <div className="bg-white p-3 rounded-2xl mx-auto">
                <QRCodeSVG value={resultUrl} size={140} level="M" />
              </div>
            </div>

            <div className="text-center text-[11px] pt-2 leading-snug" style={{ color: BRAND.muted }}>
              * {PRICING_FOOTNOTE}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className="rounded-2xl p-4 text-center"
      style={{
        background: accent ? BRAND.red : "white",
        color: accent ? "white" : BRAND.ink,
        boxShadow: "0 8px 24px -12px rgba(0,0,0,0.08)",
      }}
    >
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</div>
      <div className="text-base font-black mt-1" style={{ letterSpacing: "-0.025em" }}>
        {value}
      </div>
    </div>
  );
}
