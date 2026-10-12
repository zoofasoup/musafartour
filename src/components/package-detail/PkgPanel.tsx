import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PkgTone = "cream" | "cream-2" | "ink" | "red";

/**
 * One panel of the stack on the mobile package page. Panels overlap by their corner radius, so each one
 * sits over the one above it; colour and text tokens come from the tone (see MASTER.md).
 */
export function PkgPanel({ tone = "cream", first = false, top = false, last = false, id, className, children }: { tone?: PkgTone; first?: boolean; top?: boolean; last?: boolean; id?: string; className?: string; children: ReactNode }) {
  return (
    <div id={id} data-pkg-tone={tone} className={cn("pkg-panel", first && "pkg-panel-first", top && "pkg-panel-top", last && "pkg-panel-last", className)}>
      {children}
    </div>
  );
}
