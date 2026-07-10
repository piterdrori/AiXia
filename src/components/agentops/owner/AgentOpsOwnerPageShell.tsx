import type { ReactNode } from "react";

import { AixiaAsyncState, AixiaCommandPageLayout, AixiaInfoBlock } from "@/components/aixia";
import { AgentOpsOwnerLayout } from "@/components/agentops/owner/AgentOpsOwnerLayout";

type AgentOpsOwnerPageShellProps = {
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: ReactNode;
};

export function AgentOpsOwnerPageShell({
  loading = false,
  error = null,
  onRetry,
  children,
}: AgentOpsOwnerPageShellProps) {
  return (
    <AixiaCommandPageLayout hero={<span className="sr-only">AgentOps</span>}>
      <AgentOpsOwnerLayout>
        {error ? (
          <AixiaInfoBlock tone="rose" title="Could not load this page">
            <p className="text-sm text-white/75">{error}</p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/5"
              >
                Try again
              </button>
            ) : null}
          </AixiaInfoBlock>
        ) : null}
        <AixiaAsyncState loading={loading && !error}>{children}</AixiaAsyncState>
      </AgentOpsOwnerLayout>
    </AixiaCommandPageLayout>
  );
}
