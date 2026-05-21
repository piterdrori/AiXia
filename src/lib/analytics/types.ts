export type AnalyticsMetadata = Record<string, unknown>;

export type AnalyticsContext = {
  userId: string | null;
  companyId: string | null;
  sessionId: string;
  anonymousId: string;
  pagePath: string;
  pageTitle: string;
  moduleName: string;
  viewportWidth: number | null;
  viewportHeight: number | null;
  userAgent: string | null;
};

export type TrackEventInput = {
  eventName: string;
  eventType: string;
  pagePath?: string;
  pageTitle?: string;
  moduleName?: string;
  workflowName?: string;
  workflowStep?: string;
  companyId?: string | null;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  metadata?: AnalyticsMetadata;
  durationMs?: number;
  success?: boolean;
  errorCode?: string;
  errorMessage?: string;
};

export type TrackPageViewInput = {
  pagePath: string;
  pageTitle?: string;
  moduleName?: string;
  companyId?: string | null;
  referrer?: string;
  durationMs?: number;
  exitPage?: boolean;
  metadata?: AnalyticsMetadata;
};

export type TrackFormEventInput = {
  formName: string;
  formAction: string;
  pagePath?: string;
  moduleName?: string;
  workflowName?: string;
  workflowStep?: string;
  companyId?: string | null;
  fieldName?: string;
  validationError?: string;
  durationMs?: number;
  success?: boolean;
  metadata?: AnalyticsMetadata;
};

export type TrackFrontendErrorInput = {
  pagePath?: string;
  moduleName?: string;
  companyId?: string | null;
  errorName?: string;
  errorMessage?: string;
  errorStack?: string;
  componentStack?: string;
  metadata?: AnalyticsMetadata;
};

export type TrackFeatureFeedbackInput = {
  pagePath?: string;
  moduleName?: string;
  featureName?: string;
  feedbackType?: string;
  rating?: number;
  comment?: string;
  companyId?: string | null;
  metadata?: AnalyticsMetadata;
};

export type QueuedAnalyticsCall =
  | { kind: "event"; payload: TrackEventInput }
  | { kind: "page_view"; payload: TrackPageViewInput }
  | { kind: "form_event"; payload: TrackFormEventInput }
  | { kind: "frontend_error"; payload: TrackFrontendErrorInput }
  | { kind: "feature_feedback"; payload: TrackFeatureFeedbackInput };
