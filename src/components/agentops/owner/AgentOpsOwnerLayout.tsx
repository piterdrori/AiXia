import type { ReactNode } from "react";

import { AgentOpsOwnerNav } from "@/components/agentops/owner/AgentOpsOwnerNav";

type AgentOpsOwnerLayoutProps = {
  children: ReactNode;
};

export function AgentOpsOwnerLayout({ children }: AgentOpsOwnerLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 md:px-6 md:py-8">
      <AgentOpsOwnerNav />
      {children}
    </div>
  );
}
