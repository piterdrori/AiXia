import { trackEvent, trackFormEvent } from "./analyticsClient";
import type { AnalyticsMetadata } from "./types";

type CommonTrackOpts = {
  moduleName?: string;
  workflowName?: string;
  workflowStep?: string;
  companyId?: string | null;
  metadata?: AnalyticsMetadata;
};

export function trackButtonClick(opts: {
  targetLabel: string;
  targetType?: string;
  targetId?: string;
  moduleName?: string;
  workflowName?: string;
  metadata?: AnalyticsMetadata;
}): void {
  trackEvent({
    eventName: "button_click",
    eventType: "interaction",
    targetType: opts.targetType ?? "button",
    targetId: opts.targetId,
    targetLabel: opts.targetLabel,
    moduleName: opts.moduleName,
    workflowName: opts.workflowName,
    metadata: opts.metadata,
  });
}

export function trackWorkflowStep(opts: {
  workflowName: string;
  step: string;
  action: string;
  moduleName?: string;
  metadata?: AnalyticsMetadata;
}): void {
  trackEvent({
    eventName: "workflow_step",
    eventType: "workflow",
    workflowName: opts.workflowName,
    workflowStep: opts.step,
    targetLabel: opts.action,
    moduleName: opts.moduleName,
    metadata: opts.metadata,
  });
}

export function trackFormStart(opts: {
  formName: string;
  moduleName?: string;
  workflowName?: string;
  workflowStep?: string;
  companyId?: string | null;
}): void {
  trackFormEvent({
    formName: opts.formName,
    formAction: "start",
    moduleName: opts.moduleName,
    workflowName: opts.workflowName,
    workflowStep: opts.workflowStep,
    companyId: opts.companyId,
  });
}

export function trackFormSubmit(opts: {
  formName: string;
  success: boolean;
  durationMs?: number;
  moduleName?: string;
  workflowName?: string;
  companyId?: string | null;
  metadata?: AnalyticsMetadata;
}): void {
  trackFormEvent({
    formName: opts.formName,
    formAction: "submit",
    success: opts.success,
    durationMs: opts.durationMs,
    moduleName: opts.moduleName,
    workflowName: opts.workflowName,
    companyId: opts.companyId,
    metadata: opts.metadata,
  });
}

export function trackValidationError(opts: {
  formName: string;
  fieldName: string;
  validationError: string;
  moduleName?: string;
  workflowName?: string;
}): void {
  trackFormEvent({
    formName: opts.formName,
    formAction: "validation_error",
    fieldName: opts.fieldName,
    validationError: opts.validationError,
    moduleName: opts.moduleName,
    workflowName: opts.workflowName,
    success: false,
  });
}

export function trackArchiveAction(opts: {
  targetType: string;
  targetId?: string;
  targetLabel?: string;
  success?: boolean;
} & CommonTrackOpts): void {
  trackEvent({
    eventName: "archive_action",
    eventType: "action",
    targetType: opts.targetType,
    targetId: opts.targetId,
    targetLabel: opts.targetLabel,
    moduleName: opts.moduleName,
    workflowName: opts.workflowName,
    success: opts.success,
    metadata: opts.metadata,
  });
}

export function trackSearchAction(opts: {
  queryLength: number;
  resultCount?: number;
  targetLabel?: string;
} & CommonTrackOpts): void {
  trackEvent({
    eventName: "search",
    eventType: "interaction",
    targetType: "search",
    targetLabel: opts.targetLabel,
    moduleName: opts.moduleName,
    metadata: {
      ...opts.metadata,
      query_length: opts.queryLength,
      result_count: opts.resultCount,
    },
  });
}

export function trackFilterAction(opts: {
  filterName: string;
  filterValue?: string;
} & CommonTrackOpts): void {
  trackEvent({
    eventName: "filter",
    eventType: "interaction",
    targetType: "filter",
    targetLabel: opts.filterName,
    moduleName: opts.moduleName,
    metadata: {
      ...opts.metadata,
      filter_value: opts.filterValue,
    },
  });
}

export function trackModalOpen(opts: {
  modalName: string;
  moduleName?: string;
  metadata?: AnalyticsMetadata;
}): void {
  trackEvent({
    eventName: "modal_open",
    eventType: "interaction",
    targetType: "modal",
    targetLabel: opts.modalName,
    moduleName: opts.moduleName,
    metadata: opts.metadata,
  });
}

/** Safe AI interaction tracking — never pass prompts or responses. */
export function trackAIInteraction(opts: {
  feature: string;
  action: string;
  success?: boolean;
  moduleName?: string;
}): void {
  trackEvent({
    eventName: "ai_interaction",
    eventType: "ai",
    targetType: "ai",
    targetLabel: opts.feature,
    moduleName: opts.moduleName,
    success: opts.success,
    metadata: {
      action: opts.action,
    },
  });
}
