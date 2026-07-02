import { translateToUSL, translateToUSLDeep, type UslTranslateOptions } from "./uslTranslator";
import {
  containsAuthorityLeak,
  detectAuthorityLeaks,
  validateAndSanitizeDisplayText,
} from "./uslValidationFirewall";

export type UslDisplayNormalizeOptions = UslTranslateOptions & {
  /** When true, drift findings are returned but text is still sanitized. */
  collectDrifts?: boolean;
};

/** Sanitize a single UI string before render. */
export function normalizeDisplayString(
  text: string,
  options: UslDisplayNormalizeOptions = {},
): string {
  if (!text) return text;
  return translateToUSL(text, options);
}

/** Sanitize string values in display payloads (keys unchanged). */
export function normalizeDisplayPayload<T>(payload: T, options: UslDisplayNormalizeOptions = {}): T {
  return translateToUSLDeep(payload, options) as T;
}

/** Sanitize with drift collection for diagnostics. */
export function normalizeDisplayWithDrift(
  text: string,
  options: UslDisplayNormalizeOptions = {},
): { text: string; drifts: ReturnType<typeof detectAuthorityLeaks> } {
  const { sanitized, drifts } = validateAndSanitizeDisplayText(text, options);
  return { text: sanitized, drifts: options.collectDrifts === false ? [] : drifts };
}

export { containsAuthorityLeak, detectAuthorityLeaks, validateAndSanitizeDisplayText };
