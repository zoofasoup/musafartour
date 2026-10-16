import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** A block of a form with a heading: fields stacked on a phone, two columns from a tablet when `columns` is 2. */
export function FormSection({ title, description, columns = 1, children }: { title?: string; description?: string; columns?: 1 | 2; children: ReactNode }) {
  return (
    <section className="py-6 first:pt-0 last:pb-0">
      {title && <h3 className="text-[19px] font-medium leading-tight text-pkg-fg">{title}</h3>}
      {description && <p className="mt-1 text-[14px] text-pkg-fg-3">{description}</p>}
      <div className={cn("grid gap-5", title || description ? "mt-5" : "", columns === 2 && "md:grid-cols-2")}>{children}</div>
    </section>
  );
}

/** Label above the field, a quiet hint under it, and the error in place. */
export function FormField({ label, htmlFor, hint, error, required, className, children }: { label: string; htmlFor?: string; hint?: string; error?: string | null; required?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>{label}{required && <span className="text-pkg-red-deep" aria-hidden> *</span>}</Label>
      {children}
      {hint && !error && <p className="text-[13px] text-pkg-fg-3">{hint}</p>}
      {error && <p className="text-[13px] text-pkg-red-deep" role="alert">{error}</p>}
    </div>
  );
}

/**
 * The buttons that save or cancel a form. On a phone the bar sticks to the bottom of the screen (above the home
 * gesture area) so Simpan is always in reach; on a desktop it sits at the end of the form.
 */
export function StickyActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-6 mt-8 flex flex-col gap-2 border-t border-pkg-hair bg-pkg-cream/95 px-6 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:static md:mx-0 md:flex-row md:justify-end md:border-t md:bg-transparent md:px-0 md:pb-0 md:pt-5 md:backdrop-blur-none">
      {children}
    </div>
  );
}
