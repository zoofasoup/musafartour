import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CellStatus = "idle" | "saving" | "saved" | "error";

const fmt = (n: number | null) => (n == null ? "" : new Intl.NumberFormat("id-ID").format(n));
const parse = (s: string): number | null => {
  const digits = s.replace(/\D/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  // 0 means "nothing"; an empty cell is the one way to say "not filled".
  return n > 0 ? n : null;
};

/**
 * One editable commission amount. Saves on blur or Enter when the number changed, clears the rate when
 * emptied, and shows its own saving/saved/error state. Escape puts the saved value back.
 */
export function CommissionCell({
  value,
  ariaLabel,
  onSave,
  className,
}: {
  value: number | null;
  ariaLabel: string;
  onSave: (amount: number | null) => Promise<void>;
  className?: string;
}) {
  const [draft, setDraft] = useState(fmt(value));
  const [focused, setFocused] = useState(false);
  const [status, setStatus] = useState<CellStatus>("idle");
  // The value the server is known to hold (or is being sent), so blur + Enter never save twice.
  const known = useRef<number | null>(value);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const skipBlurCommit = useRef(false);

  // Follow outside changes (refetch) unless the person is typing here.
  useEffect(() => {
    known.current = value;
    if (!focused) setDraft(fmt(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const commit = async () => {
    const next = parse(draft);
    setDraft(fmt(next));
    if (next === known.current) return;
    const previous = known.current;
    known.current = next;
    clearTimeout(timer.current);
    setStatus("saving");
    try {
      await onSave(next);
      setStatus("saved");
      timer.current = setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      known.current = previous;
      setStatus("error");
      toast.error(e instanceof Error && e.message ? e.message : "Komisi belum tersimpan");
    }
  };

  const empty = !draft && !focused;

  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center text-[13px] text-muted-foreground">
        {status === "saving" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : status === "saved" ? (
          <Check className="h-4 w-4 text-status-ok-text" aria-hidden />
        ) : status === "error" ? (
          <AlertCircle className="h-4 w-4 text-status-bad-text" aria-hidden />
        ) : empty ? null : (
          "Rp"
        )}
      </span>
      <input
        inputMode="numeric"
        autoComplete="off"
        aria-label={ariaLabel}
        aria-invalid={status === "error" || undefined}
        placeholder={focused ? "0" : "Belum diisi"}
        value={draft}
        onFocus={(e) => {
          setFocused(true);
          e.currentTarget.select();
        }}
        onBlur={() => {
          setFocused(false);
          if (skipBlurCommit.current) skipBlurCommit.current = false;
          else void commit();
        }}
        onChange={(e) => setDraft(fmt(parse(e.target.value) ?? (e.target.value.replace(/\D/g, "") ? 0 : null)))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commit();
          } else if (e.key === "Escape") {
            skipBlurCommit.current = true;
            setDraft(fmt(known.current));
            setStatus((s) => (s === "error" ? "idle" : s));
            e.currentTarget.blur();
          }
        }}
        className={cn(
          "h-10 w-full rounded-md border border-transparent bg-field pl-9 pr-3 text-right text-sm text-foreground transition-colors [@media(pointer:coarse)]:h-11",
          "hover:bg-field-hover focus-visible:border-foreground focus-visible:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15",
          "aria-[invalid=true]:border-status-bad-text aria-[invalid=true]:bg-status-bad-bg",
          empty && status === "idle" && "border-status-warn-border bg-status-warn-bg text-status-warn-fg placeholder:text-status-warn-fg hover:bg-status-warn-bg placeholder:font-medium",
        )}
      />
      <span className="sr-only" aria-live="polite">
        {status === "saving" ? "Menyimpan" : status === "saved" ? "Tersimpan" : status === "error" ? "Gagal menyimpan" : ""}
      </span>
    </div>
  );
}
