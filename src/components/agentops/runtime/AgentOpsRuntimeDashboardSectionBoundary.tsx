import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { AixiaBadge, AixiaInfoBlock } from "@/components/aixia";

type AgentOpsRuntimeDashboardSectionBoundaryProps = {
  section: string;
  children: ReactNode;
};

type AgentOpsRuntimeDashboardSectionBoundaryState = {
  error: Error | null;
};

export class AgentOpsRuntimeDashboardSectionBoundary extends Component<
  AgentOpsRuntimeDashboardSectionBoundaryProps,
  AgentOpsRuntimeDashboardSectionBoundaryState
> {
  state: AgentOpsRuntimeDashboardSectionBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AgentOpsRuntimeDashboardSectionBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error(
        `[agentops-dashboard] section "${this.props.section}" render error:`,
        error,
        errorInfo.componentStack,
      );
    }
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <AixiaInfoBlock title={`${this.props.section} unavailable`} tone="rose">
          <div className="flex flex-wrap items-center gap-2">
            <AixiaBadge tone="rose">
              <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
              Section error
            </AixiaBadge>
            <span className="text-sm text-white/75">{this.state.error.message}</span>
          </div>
        </AixiaInfoBlock>
      );
    }

    return this.props.children;
  }
}

type AgentOpsRuntimeDashboardSectionProps = {
  title: string;
  sectionKey: string;
  fetchError?: string;
  children: ReactNode;
};

export function AgentOpsRuntimeDashboardSection({
  title,
  sectionKey,
  fetchError,
  children,
}: AgentOpsRuntimeDashboardSectionProps) {
  if (fetchError) {
    return (
      <AixiaInfoBlock title={title} tone="gold">
        <div className="flex flex-wrap items-center gap-2">
          <AixiaBadge tone="amber">Partial failure</AixiaBadge>
          <span className="text-sm text-white/75">{fetchError}</span>
        </div>
      </AixiaInfoBlock>
    );
  }

  return (
    <AgentOpsRuntimeDashboardSectionBoundary section={sectionKey}>
      {children}
    </AgentOpsRuntimeDashboardSectionBoundary>
  );
}
