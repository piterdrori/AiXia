import { Component, type ErrorInfo, type ReactNode } from "react";
import { AixiaPageState } from "@/components/aixia/AixiaPageStates";
import { trackFrontendError } from "@/lib/analytics";
import { moduleFromPath } from "@/lib/analytics/moduleFromPath";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

/**
 * Catches React render errors, logs to analytics, shows shared page state.
 */
export class AiXiaAnalyticsErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const pagePath =
      typeof window !== "undefined" ? window.location.pathname : "";

    trackFrontendError({
      pagePath,
      moduleName: moduleFromPath(pagePath),
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <AixiaPageState
          fullPage
          title="Something went wrong"
          description="An unexpected error occurred. Try refreshing the page. If the problem continues, contact your administrator."
        />
      );
    }

    return this.props.children;
  }
}
