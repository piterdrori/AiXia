import type { TrackFrontendErrorInput } from "./types";

const MAX_ERROR_MESSAGE = 500;
const MAX_STACK = 4000;
const MAX_USER_AGENT = 300;

const JWT_PATTERN =
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._~+/=-]{12,}/gi;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const SECRET_QUERY_PATTERN =
  /(token|access_token|refresh_token|password|secret|api_key|authorization)=[^&\s"'`;]+/gi;
const STRIPE_KEY_PATTERN = /(sk|pk)_[a-zA-Z0-9]{16,}/g;
const SUPABASE_KEY_PATTERN = /sbp_[a-zA-Z0-9]{20,}/g;
const LONG_HEX_PATTERN = /\b[0-9a-f]{40,}\b/gi;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

/** Redact tokens, JWTs, emails, and secret-like substrings from free text. */
export function redactSensitiveText(text: string | undefined | null): string | undefined {
  if (text == null || text === "") return undefined;

  let s = String(text).replace(/\0/g, "");

  s = s.replace(JWT_PATTERN, "[redacted-jwt]");
  s = s.replace(BEARER_PATTERN, "Bearer [redacted]");
  s = s.replace(EMAIL_PATTERN, "[redacted-email]");
  s = s.replace(SECRET_QUERY_PATTERN, "$1=[redacted]");
  s = s.replace(STRIPE_KEY_PATTERN, "[redacted-key]");
  s = s.replace(SUPABASE_KEY_PATTERN, "[redacted-key]");
  s = s.replace(LONG_HEX_PATTERN, "[redacted-hex]");

  return s;
}

export function sanitizeErrorMessage(
  message: string | undefined | null
): string | undefined {
  const redacted = redactSensitiveText(message);
  if (!redacted) return undefined;
  return truncate(redacted, MAX_ERROR_MESSAGE);
}

export function sanitizeErrorStack(
  stack: string | undefined | null
): string | undefined {
  const redacted = redactSensitiveText(stack);
  if (!redacted) return undefined;
  return truncate(redacted, MAX_STACK);
}

export function sanitizeComponentStack(
  stack: string | undefined | null
): string | undefined {
  const redacted = redactSensitiveText(stack);
  if (!redacted) return undefined;
  return truncate(redacted, MAX_STACK);
}

export function sanitizeUserAgent(
  userAgent: string | undefined | null
): string | undefined {
  if (userAgent == null || userAgent === "") return undefined;
  return truncate(userAgent, MAX_USER_AGENT);
}

/** Apply privacy rules before enqueueing a frontend error. */
export function sanitizeFrontendErrorInput(
  input: TrackFrontendErrorInput
): TrackFrontendErrorInput {
  return {
    ...input,
    errorName: input.errorName
      ? truncate(redactSensitiveText(input.errorName) ?? input.errorName, 200)
      : undefined,
    errorMessage: sanitizeErrorMessage(input.errorMessage),
    errorStack: sanitizeErrorStack(input.errorStack),
    componentStack: sanitizeComponentStack(input.componentStack),
    metadata: input.metadata,
  };
}
