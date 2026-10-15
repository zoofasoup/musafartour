import { Component, ErrorInfo, ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import "@/styles/pkg-v2.css";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const CHUNK_ERROR_PATTERN = /dynamically imported module|Importing a module script failed|Failed to fetch dynamically imported module|ChunkLoadError/i;
export const CHUNK_RELOAD_FLAG = "chunk-error-reload-attempted";

function isChunkLoadError(error: Error): boolean {
  return CHUNK_ERROR_PATTERN.test(error.message);
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);

    // A stale/deleted JS chunk (e.g. after a new deploy replaces hashed
    // filenames while this tab is still running the old bundle) looks like
    // an app error to the user but is self-healing with a single reload,
    // which fetches the fresh HTML/asset manifest. Guard with a flag so a
    // genuinely broken deploy still falls through to the visible error UI
    // instead of reload-looping forever.
    // The flag holds the time of the last auto-reload: one reload per minute at most, so a chunk that stays
    // broken ends on the error screen instead of looping. Before reloading we drop the service worker and its
    // caches, because a stale cached index.html (pointing at chunk files that no longer exist) is what makes the
    // same chunk fail again after a plain reload.
    if (isChunkLoadError(error)) {
      const last = Number(sessionStorage.getItem(CHUNK_RELOAD_FLAG) || 0);
      if (!last || Date.now() - last > 60_000) {
        sessionStorage.setItem(CHUNK_RELOAD_FLAG, String(Date.now()));
        const purge = async () => {
          try {
            const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
            await Promise.all(regs.map((r) => r.unregister()));
            const keys = (await window.caches?.keys?.()) ?? [];
            await Promise.all(keys.map((k) => window.caches.delete(k)));
          } catch {
            /* best effort */
          }
        };
        void purge().finally(() => window.location.reload());
      }
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const btn = "pkg-press pkg-label inline-flex h-14 items-center justify-center gap-2 rounded-full px-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream focus-visible:ring-offset-2 focus-visible:ring-offset-pkg-ink";
      return (
        <div className="pkg-v2 min-h-screen">
          <div data-pkg-tone="ink" className="flex min-h-screen flex-col justify-center px-6 py-16 text-pkg-fg">
            <div className="mx-auto w-full max-w-xl">
              <p aria-hidden className="pkg-title !text-[min(calc((100vw-48px)/3),200px)] !leading-[0.85]">Oops</p>
              <h1 className="pkg-h2 mt-8 text-balance">Ada yang tidak beres</h1>
              <p className="mt-4 text-[17px] leading-[1.5] text-pkg-fg-2">Coba lagi, atau muat ulang halaman.</p>
              {this.state.error?.message && (
                <p className="pkg-glass mt-6 break-words rounded-[16px] px-4 py-3 font-mono text-[12px] leading-[1.4] text-pkg-fg-2">{this.state.error.message}</p>
              )}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={this.handleRetry} className={`${btn} pkg-glass-red`}>
                  <RefreshCw className="h-4 w-4" aria-hidden /> Coba lagi
                </button>
                <button type="button" onClick={this.handleReload} className={`${btn} pkg-glass`}>Muat ulang</button>
              </div>
              {import.meta.env.DEV && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-pkg-fg-2">Detail error (development)</summary>
                  <pre className="pkg-glass mt-2 max-h-48 overflow-auto rounded-[16px] p-4 text-xs">
                    {this.state.error.message}
                    {"\n"}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}