import type { AnalyticsMetadata } from "./types";

const DENY_KEYS = new Set([
  "password",
  "passwd",
  "token",
  "access_token",
  "refresh_token",
  "secret",
  "api_key",
  "apikey",
  "authorization",
  "auth",
  "cookie",
  "session",
  "email",
  "email_address",
  "phone",
  "ssn",
  "card",
  "card_number",
  "cvv",
  "iban",
  "account_number",
  "prompt",
  "response",
  "message",
  "body",
  "content",
  "document",
  "file_content",
  "private",
  "credential",
  "credentials",
]);

const MAX_STRING_LENGTH = 500;
const MAX_DEPTH = 4;
const MAX_KEYS = 30;

function isDeniedKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (DENY_KEYS.has(lower)) return true;
  return (
    lower.includes("password") ||
    lower.includes("token") ||
    lower.includes("secret") ||
    lower.includes("prompt") ||
    lower.includes("email")
  );
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return "[truncated]";

  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH
      ? value.slice(0, MAX_STRING_LENGTH) + "…"
      : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    let count = 0;
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (count >= MAX_KEYS) break;
      if (isDeniedKey(k)) continue;
      out[k] = sanitizeValue(v, depth + 1);
      count += 1;
    }
    return out;
  }

  return String(value).slice(0, MAX_STRING_LENGTH);
}

/** Strip sensitive keys and truncate values before sending to Supabase. */
export function sanitizeAnalyticsMetadata(
  metadata: AnalyticsMetadata | undefined
): AnalyticsMetadata {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  const sanitized = sanitizeValue(metadata, 0);
  if (sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)) {
    return sanitized as AnalyticsMetadata;
  }
  return {};
}
