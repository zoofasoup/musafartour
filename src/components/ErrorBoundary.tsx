import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

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
    if (isChunkLoadError(error) && !sessionStorage.getItem(CHUNK_RELOAD_FLAG)) {
      sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1");
      window.location.reload();
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

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Terjadi Kesalahan
            </h1>
            <p className="text-muted-foreground mb-6">
              Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi atau refresh halaman.
              <br /><br />
              <span className="text-xs font-mono text-red-500 break-all block max-w-full text-left bg-red-50 p-2 rounded">
                {this.state.error?.message}
                <br />
                {this.state.error?.stack?.split('\n').slice(0, 3).join('\n')}
              </span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleRetry} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Coba Lagi
              </Button>
              <Button onClick={this.handleReload} variant="outline">
                Refresh Halaman
              </Button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Detail Error (Development)
                </summary>
                <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto max-h-48">
                  {this.state.error.message}
                  {"\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}