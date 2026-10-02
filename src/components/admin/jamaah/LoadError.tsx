import { AlertTriangle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { loadErrorMessage } from "@/lib/jamaah";

/**
 * Shown instead of the table when loading failed. Without it a failed load looks like "no jamaah yet"
 * with Rp 0 everywhere, which is wrong for money data and invites people to import again.
 */
export function LoadError({ what, error, onRetry, retrying }: { what: string; error: unknown; onRetry: () => void; retrying?: boolean }) {
  const { title, hint } = loadErrorMessage(error);
  return (
    <Alert variant="destructive" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div>
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>
            {what} belum tampil. {hint}
          </AlertDescription>
        </div>
      </div>
      <Button type="button" variant="outline" size="sm" className="gap-1 self-start sm:self-center" onClick={onRetry} disabled={retrying}>
        <RefreshCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} aria-hidden />
        {retrying ? "Memuat..." : "Coba lagi"}
      </Button>
    </Alert>
  );
}
