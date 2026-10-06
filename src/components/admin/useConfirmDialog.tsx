import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface AskOptions {
  title: string;
  description?: React.ReactNode;
  /** Label of the main button. Defaults to "Hapus". */
  confirmLabel?: string;
  /** Ask the person to type this before the main button turns on (for deletes that cannot be undone). */
  confirmText?: string;
  /** Solid dark red main button. Defaults to true. */
  destructive?: boolean;
}

/**
 * Replacement for window.confirm() in admin pages. `ask(options, run)` opens a ConfirmDialog and calls `run`
 * when the person confirms; render `dialog` once anywhere in the page.
 *
 *   const { ask, dialog } = useConfirmDialog();
 *   <Button onClick={() => ask({ title: "Hapus FAQ ini?" }, () => remove(id))} />
 *   {dialog}
 */
export function useConfirmDialog() {
  const [state, setState] = useState<(AskOptions & { run: () => void | Promise<void> }) | null>(null);

  const ask = (options: AskOptions, run: () => void | Promise<void>) => setState({ ...options, run });

  const dialog = (
    <ConfirmDialog
      open={!!state}
      onOpenChange={(open) => !open && setState(null)}
      title={state?.title ?? ""}
      description={state?.description}
      confirmLabel={state?.confirmLabel ?? "Hapus"}
      confirmText={state?.confirmText}
      destructive={state?.destructive ?? true}
      onConfirm={() => {
        const run = state?.run;
        setState(null);
        void run?.();
      }}
    />
  );

  return { ask, dialog };
}
