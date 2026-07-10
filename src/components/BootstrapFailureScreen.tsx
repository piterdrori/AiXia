import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";

type BootstrapFailureScreenProps = {
  diagnosticCode: string;
  message?: string;
  onRetry: () => void;
  onSignInAgain: () => void;
};

export function BootstrapFailureScreen({
  diagnosticCode,
  message = "The application could not finish loading.",
  onRetry,
  onSignInAgain,
}: BootstrapFailureScreenProps) {
  const openExternal = () => {
    window.open(window.location.href, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-white">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300/80">
          Unable to load the workspace
        </p>
        <h1 className="mt-2 text-xl font-semibold text-white">Application bootstrap failed</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/70">{message}</p>
        <p className="mt-4 rounded-md border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-white/60">
          Diagnostic: {diagnosticCode}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </button>
          <button
            type="button"
            onClick={onSignInAgain}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/5"
          >
            Sign in again
          </button>
          <button
            type="button"
            onClick={openExternal}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/5"
          >
            Open staging in external browser
          </button>
        </div>
      </div>
    </div>
  );
}

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-indigo-500" />
    </div>
  );
}

type BootstrapGateProps = {
  loading: boolean;
  timedOut: boolean;
  diagnosticCode?: string | null;
  message?: string | null;
  onRetry: () => void;
  onSignInAgain: () => void;
  children: ReactNode;
};

export function BootstrapGate({
  loading,
  timedOut,
  diagnosticCode,
  message,
  onRetry,
  onSignInAgain,
  children,
}: BootstrapGateProps) {
  if (loading && !timedOut) {
    return <FullScreenSpinner />;
  }

  if (timedOut) {
    return (
      <BootstrapFailureScreen
        diagnosticCode={diagnosticCode ?? "BOOTSTRAP_TIMEOUT"}
        message={message ?? "The application could not finish loading."}
        onRetry={onRetry}
        onSignInAgain={onSignInAgain}
      />
    );
  }

  return <>{children}</>;
}
