import { supabase } from "@/lib/supabase";
import { moduleFromPath } from "./moduleFromPath";
import {
  sanitizeFrontendErrorInput,
  sanitizeUserAgent,
} from "./sanitizeFrontendError";
import { sanitizeAnalyticsMetadata } from "./sanitizeMetadata";
import type {
  AnalyticsContext,
  QueuedAnalyticsCall,
  TrackEventInput,
  TrackFeatureFeedbackInput,
  TrackFormEventInput,
  TrackFrontendErrorInput,
  TrackPageViewInput,
} from "./types";

const ANON_STORAGE_KEY = "aixia-analytics-anon-id";
const SESSION_STORAGE_KEY = "aixia-analytics-session-id";

const FLUSH_INTERVAL_MS = 2000;
const MAX_QUEUE_SIZE = 20;

const MISSING_RPC_CODES = new Set(["PGRST202", "42883"]);

let flushTimer: number | null = null;
let isFlushing = false;
const queue: QueuedAnalyticsCall[] = [];

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `aixia-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function safeStorageGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
}

export function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") return "server";

  const existing = safeStorageGet(localStorage, ANON_STORAGE_KEY);
  if (existing) return existing;

  const id = generateId();
  safeStorageSet(localStorage, ANON_STORAGE_KEY, id);
  return id;
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "server-session";

  const existing = safeStorageGet(sessionStorage, SESSION_STORAGE_KEY);
  if (existing) return existing;

  const id = generateId();
  safeStorageSet(sessionStorage, SESSION_STORAGE_KEY, id);
  return id;
}

export function getViewportInfo(): {
  viewportWidth: number | null;
  viewportHeight: number | null;
} {
  if (typeof window === "undefined") {
    return { viewportWidth: null, viewportHeight: null };
  }
  return {
    viewportWidth: window.innerWidth ?? null,
    viewportHeight: window.innerHeight ?? null,
  };
}

export { sanitizeAnalyticsMetadata } from "./sanitizeMetadata";

async function resolveUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function getCurrentAnalyticsContext(
  companyId?: string | null
): Promise<AnalyticsContext> {
  const pagePath =
    typeof window !== "undefined" ? window.location.pathname : "";
  const { viewportWidth, viewportHeight } = getViewportInfo();

  return {
    userId: await resolveUserId(),
    companyId: companyId ?? null,
    sessionId: getOrCreateSessionId(),
    anonymousId: getOrCreateAnonymousId(),
    pagePath,
    pageTitle: typeof document !== "undefined" ? document.title : "",
    moduleName: moduleFromPath(pagePath),
    viewportWidth,
    viewportHeight,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  };
}

function isMissingRpcError(code: string | undefined): boolean {
  return code !== undefined && MISSING_RPC_CODES.has(code);
}

function scheduleFlush(): void {
  if (typeof window === "undefined") return;
  if (flushTimer !== null) return;

  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushQueue();
  }, FLUSH_INTERVAL_MS);
}

function enqueue(item: QueuedAnalyticsCall): void {
  queue.push(item);
  if (queue.length >= MAX_QUEUE_SIZE) {
    void flushQueue();
    return;
  }
  scheduleFlush();
}

async function sendOne(
  item: QueuedAnalyticsCall,
  ctx: AnalyticsContext
): Promise<{ error: { code?: string; message: string } | null }> {
  const base = {
    p_session_id: ctx.sessionId,
    p_anonymous_id: ctx.anonymousId,
    p_company_id: ctx.companyId,
  };

  switch (item.kind) {
    case "event": {
      const p = item.payload;
      return supabase.rpc("insert_app_analytics_event", {
        ...base,
        p_event_name: p.eventName,
        p_event_type: p.eventType,
        p_page_path: p.pagePath ?? ctx.pagePath,
        p_page_title: p.pageTitle ?? ctx.pageTitle,
        p_module_name: p.moduleName ?? ctx.moduleName,
        p_workflow_name: p.workflowName ?? null,
        p_workflow_step: p.workflowStep ?? null,
        p_target_type: p.targetType ?? null,
        p_target_id: p.targetId ?? null,
        p_target_label: p.targetLabel ?? null,
        p_metadata: sanitizeAnalyticsMetadata(p.metadata),
        p_duration_ms: p.durationMs ?? null,
        p_success: p.success ?? null,
        p_error_code: p.errorCode ?? null,
        p_error_message: p.errorMessage ?? null,
        p_user_agent: ctx.userAgent,
        p_viewport_width: ctx.viewportWidth,
        p_viewport_height: ctx.viewportHeight,
      });
    }
    case "page_view": {
      const p = item.payload;
      return supabase.rpc("insert_app_analytics_page_view", {
        ...base,
        p_page_path: p.pagePath,
        p_page_title: p.pageTitle ?? ctx.pageTitle,
        p_module_name: p.moduleName ?? ctx.moduleName,
        p_referrer: p.referrer ?? null,
        p_duration_ms: p.durationMs ?? null,
        p_exit_page: p.exitPage ?? false,
        p_metadata: sanitizeAnalyticsMetadata(p.metadata),
        p_viewport_width: ctx.viewportWidth,
        p_viewport_height: ctx.viewportHeight,
      });
    }
    case "form_event": {
      const p = item.payload;
      return supabase.rpc("insert_app_analytics_form_event", {
        ...base,
        p_form_name: p.formName,
        p_form_action: p.formAction,
        p_page_path: p.pagePath ?? ctx.pagePath,
        p_module_name: p.moduleName ?? ctx.moduleName,
        p_workflow_name: p.workflowName ?? null,
        p_workflow_step: p.workflowStep ?? null,
        p_field_name: p.fieldName ?? null,
        p_validation_error: p.validationError ?? null,
        p_duration_ms: p.durationMs ?? null,
        p_success: p.success ?? null,
        p_metadata: sanitizeAnalyticsMetadata(p.metadata),
      });
    }
    case "frontend_error": {
      const p = sanitizeFrontendErrorInput(item.payload);
      return supabase.rpc("insert_app_analytics_frontend_error", {
        ...base,
        p_page_path: p.pagePath ?? ctx.pagePath,
        p_module_name: p.moduleName ?? ctx.moduleName,
        p_error_name: p.errorName ?? null,
        p_error_message: p.errorMessage ?? null,
        p_error_stack: p.errorStack ?? null,
        p_component_stack: p.componentStack ?? null,
        p_metadata: sanitizeAnalyticsMetadata(p.metadata),
        p_user_agent: sanitizeUserAgent(ctx.userAgent) ?? null,
      });
    }
    case "feature_feedback": {
      const p = item.payload;
      return supabase.rpc("insert_app_analytics_feature_feedback", {
        p_page_path: p.pagePath ?? ctx.pagePath,
        p_module_name: p.moduleName ?? ctx.moduleName,
        p_feature_name: p.featureName ?? null,
        p_feedback_type: p.feedbackType ?? null,
        p_rating: p.rating ?? null,
        p_comment: p.comment ?? null,
        p_company_id: ctx.companyId,
        p_session_id: ctx.sessionId,
        p_metadata: sanitizeAnalyticsMetadata(p.metadata),
      });
    }
    default:
      return { error: null };
  }
}

export async function flushQueue(): Promise<void> {
  if (isFlushing || queue.length === 0) return;

  isFlushing = true;
  const batch = queue.splice(0, queue.length);

  try {
    const ctx = await getCurrentAnalyticsContext();

    for (const item of batch) {
      try {
        const { error } = await sendOne(item, ctx);
        if (error && !isMissingRpcError(error.code)) {
          console.warn("Analytics flush:", error.message);
        }
      } catch {
        /* silent */
      }
    }
  } finally {
    isFlushing = false;
    if (queue.length > 0) {
      scheduleFlush();
    }
  }
}

function safeTrack(fn: () => void): void {
  try {
    fn();
  } catch {
    /* never break UX */
  }
}

export function trackEvent(input: TrackEventInput): void {
  safeTrack(() => {
    enqueue({ kind: "event", payload: input });
  });
}

export function trackPageView(input: TrackPageViewInput): void {
  safeTrack(() => {
    enqueue({ kind: "page_view", payload: input });
  });
}

export function trackFormEvent(input: TrackFormEventInput): void {
  safeTrack(() => {
    enqueue({ kind: "form_event", payload: input });
  });
}

export function trackFrontendError(input: TrackFrontendErrorInput): void {
  safeTrack(() => {
    enqueue({
      kind: "frontend_error",
      payload: sanitizeFrontendErrorInput(input),
    });
  });
}

export function trackFeatureFeedback(input: TrackFeatureFeedbackInput): void {
  safeTrack(() => {
    enqueue({ kind: "feature_feedback", payload: input });
  });
}

/** Call once at app init to flush on tab hide / unload. */
export function initAnalyticsLifecycle(): void {
  if (typeof window === "undefined") return;

  const onHide = () => {
    if (document.visibilityState === "hidden") {
      void flushQueue();
    }
  };

  const onPageHide = () => {
    void flushQueue();
  };

  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onPageHide);
}
