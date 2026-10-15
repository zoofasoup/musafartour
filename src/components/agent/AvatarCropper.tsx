import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Minus, Plus } from "lucide-react";

const VIEW = 288; // the round window on screen, in px
const OUT = 512; // the saved photo, in px

/**
 * Full-screen square-to-circle cropper: drag the photo to place it, pinch or use the slider to zoom, and what sits
 * inside the circle is saved as a 512 px JPEG. The photo can never be moved off the circle, so there are no empty edges.
 */
export function AvatarCropper({ file, onCancel, onSave }: { file: File | null; onCancel: () => void; onSave: (blob: Blob) => Promise<void> | void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1); // 1 = just covers the circle
  const [pos, setPos] = useState({ x: 0, y: 0 }); // image centre relative to the circle centre
  const [saving, setSaving] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; z: number } | null>(null);

  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    setZoom(1);
    setPos({ x: 0, y: 0 });
    setSize(null);
    const img = new Image();
    img.onload = () => setSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = u;
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const base = size ? Math.max(VIEW / size.w, VIEW / size.h) : 1; // scale at which the photo just covers the circle
  const scale = base * zoom;

  const clamp = useCallback(
    (p: { x: number; y: number }, z: number) => {
      if (!size) return p;
      const s = base * z;
      const mx = Math.max(0, (size.w * s - VIEW) / 2);
      const my = Math.max(0, (size.h * s - VIEW) / 2);
      return { x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(-my, Math.min(my, p.y)) };
    },
    [size, base]
  );

  const setZoomClamped = (z: number) => {
    const next = Math.max(1, Math.min(4, z));
    setZoom(next);
    setPos((p) => clamp(p, next));
  };

  useEffect(() => {
    if (!file) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [file, saving, onCancel]);

  const onPointerDown = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* a pointer that is already gone: keep going */
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      setZoomClamped((pinch.current.z * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.d);
    } else if (pointers.current.size === 1) {
      setPos((p) => clamp({ x: p.x + e.clientX - prev.x, y: p.y + e.clientY - prev.y }, zoom));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const save = async () => {
    if (!url || !size) return;
    setSaving(true);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = OUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      const k = OUT / VIEW;
      const w = size.w * scale * k;
      const h = size.h * scale * k;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, OUT, OUT);
      ctx.drawImage(img, OUT / 2 + pos.x * k - w / 2, OUT / 2 + pos.y * k - h / 2, w, h);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.9));
      if (!blob) throw new Error("blob");
      await onSave(blob);
    } finally {
      setSaving(false);
    }
  };

  if (!file) return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Atur foto profil" className="pkg-v2 pkg-float fixed inset-0 z-[120] flex flex-col items-center justify-center bg-[#1a1512]/95 px-6 backdrop-blur-sm">
      <p className="pkg-label mb-8 text-pkg-fg-2">Geser dan perbesar</p>

      <div
        className="relative touch-none select-none overflow-hidden rounded-full bg-[#2a2420] shadow-[0_0_0_2px_rgb(244_239_230/0.5)]"
        style={{ width: VIEW, height: VIEW }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(e) => setZoomClamped(zoom * (e.deltaY < 0 ? 1.08 : 0.93))}
      >
        {url && size && (
          <img
            src={url}
            alt=""
            draggable={false}
            className="absolute left-1/2 top-1/2 max-w-none"
            style={{ width: size.w * scale, height: size.h * scale, transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` }}
          />
        )}
        {!size && <div className="absolute inset-0 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-pkg-fg-3" aria-hidden /></div>}
      </div>

      <div className="mt-8 flex w-full max-w-xs items-center gap-3 text-pkg-fg-2">
        <button type="button" aria-label="Perkecil" onClick={() => setZoomClamped(zoom - 0.25)} className="pkg-press pkg-glass grid h-11 w-11 shrink-0 place-items-center rounded-full"><Minus className="h-4 w-4" aria-hidden /></button>
        <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoomClamped(Number(e.target.value))} aria-label="Zoom" className="h-2 w-full accent-[#c4141b]" />
        <button type="button" aria-label="Perbesar" onClick={() => setZoomClamped(zoom + 0.25)} className="pkg-press pkg-glass grid h-11 w-11 shrink-0 place-items-center rounded-full"><Plus className="h-4 w-4" aria-hidden /></button>
      </div>

      <div className="mt-10 flex w-full max-w-xs gap-3">
        <button type="button" onClick={onCancel} disabled={saving} className="pkg-press pkg-glass pkg-label h-14 flex-1 rounded-full disabled:opacity-50">Batal</button>
        <button type="button" onClick={() => void save()} disabled={saving || !size} className="pkg-press pkg-glass-red pkg-label inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full disabled:opacity-50">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null} Pasang
        </button>
      </div>
    </div>,
    document.body
  );
}
