import { useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import {
  flushQueue,
  initAnalyticsLifecycle,
  moduleFromPath,
  trackFrontendError,
  trackPageView,
} from "@/lib/analytics";
import { AiXiaAnalyticsErrorBoundary } from "./AiXiaAnalyticsErrorBoundary";

const DEDUPE_MS = 300;

type Props = {
  children: ReactNode;
};

let globalHandlersRegistered = false;

function registerGlobalErrorHandlers(): void {
  if (globalHandlersRegistered || typeof window === "undefined") return;
  globalHandlersRegistered = true;

  window.addEventListener("error", (event) => {
    const pagePath = window.location.pathname;
    trackFrontendError({
      pagePath,
      moduleName: moduleFromPath(pagePath),
      errorName: event.error?.name ?? "Error",
      errorMessage: event.message ?? String(event.error),
      errorStack: event.error?.stack,
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const pagePath = window.location.pathname;
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "Unhandled promise rejection";

    trackFrontendError({
      pagePath,
      moduleName: moduleFromPath(pagePath),
      errorName: reason instanceof Error ? reason.name : "UnhandledRejection",
      errorMessage: message,
      errorStack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}

/**
 * Silent analytics: page views, duration on leave, global errors.
 * Renders no UI; wraps children in error boundary.
 */
export function AiXiaAnalyticsTracker({ children }: Props) {
  const location = useLocation();
  const pageEnteredAtRef = useRef<number | null>(null);
  const previousPathRef = useRef<string | null>(null);
  const lastTrackedPathRef = useRef<string | null>(null);
  const lastTrackedAtRef = useRef<number>(0);

  useEffect(() => {
    pageEnteredAtRef.current = Date.now();
    initAnalyticsLifecycle();
    registerGlobalErrorHandlers();
  }, []);

  useEffect(() => {
    const pathname = location.pathname;
    const now = Date.now();

    if (
      lastTrackedPathRef.current === pathname &&
      now - lastTrackedAtRef.current < DEDUPE_MS
    ) {
      return;
    }

    const previousPath = previousPathRef.current;
    if (previousPath && previousPath !== pathname) {
      const enteredAt = pageEnteredAtRef.current ?? now;
      const durationMs = Math.max(0, now - enteredAt);
      trackPageView({
        pagePath: previousPath,
        pageTitle: typeof document !== "undefined" ? document.title : "",
        moduleName: moduleFromPath(previousPath),
        durationMs,
        exitPage: true,
        referrer: typeof document !== "undefined" ? document.referrer : undefined,
      });
    }

    trackPageView({
      pagePath: pathname,
      pageTitle: typeof document !== "undefined" ? document.title : "",
      moduleName: moduleFromPath(pathname),
      referrer: previousPath ?? (typeof document !== "undefined" ? document.referrer : undefined),
    });

    previousPathRef.current = pathname;
    lastTrackedPathRef.current = pathname;
    lastTrackedAtRef.current = now;
    pageEnteredAtRef.current = now;
  }, [location.pathname]);

  useEffect(() => {
    const onUnload = () => {
      const pathname = previousPathRef.current;
      if (!pathname) return;

      const enteredAt = pageEnteredAtRef.current ?? Date.now();
      const durationMs = Math.max(0, Date.now() - enteredAt);
      trackPageView({
        pagePath: pathname,
        moduleName: moduleFromPath(pathname),
        durationMs,
        exitPage: true,
      });
      void flushQueue();
    };

    window.addEventListener("pagehide", onUnload);
    return () => window.removeEventListener("pagehide", onUnload);
  }, []);

  return (
    <AiXiaAnalyticsErrorBoundary>{children}</AiXiaAnalyticsErrorBoundary>
  );
}
