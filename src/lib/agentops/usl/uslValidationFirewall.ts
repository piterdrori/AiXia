import {
  USL_AUTHORITY_LEAK_TERMS,
  USL_DRIFT_LABEL,
  USL_FINAL_GATE_MARKER,
} from "./semanticLexicon";
import { translateToUSL, type UslTranslateOptions } from "./uslTranslator";

const LEAK_PATTERNS: RegExp[] = USL_AUTHORITY_LEAK_TERMS.map(
  (term) => new RegExp(`\\b${term.replace(/\s+/g, "\\s+")}\\b`, "i"),
);

export type UslDriftFinding = {
  label: typeof USL_DRIFT_LABEL;
  term: string;
  context?: string;
};

function preGateSlice(text: string): string {
  const idx = text.indexOf(USL_FINAL_GATE_MARKER);
  return idx >= 0 ? text.slice(0, idx) : text;
};

export function detectAuthorityLeaks(text: string, options?: { ignoreFinalGate?: boolean }): UslDriftFinding[] {
  const scan = options?.ignoreFinalGate ? text : preGateSlice(text);
  const findings: UslDriftFinding[] = [];
  for (const term of USL_AUTHORITY_LEAK_TERMS) {
    const pat = new RegExp(`\\b${term.replace(/\s+/g, "\\s+")}\\b`, "i");
    if (pat.test(scan)) {
      findings.push({ label: USL_DRIFT_LABEL, term });
    }
  }
  return findings;
}

export function containsAuthorityLeak(text: string): boolean {
  return detectAuthorityLeaks(text).length > 0;
}

/** Sanitize + log drift — does not block runtime. */
export function validateAndSanitizeDisplayText(
  text: string,
  options: UslTranslateOptions = {},
): { sanitized: string; drifts: UslDriftFinding[] } {
  const drifts = detectAuthorityLeaks(text);
  const sanitized = translateToUSL(text, options);
  return { sanitized, drifts };
}

export function assertNoPreGateAuthorityLeaks(text: string): string[] {
  return detectAuthorityLeaks(text).map(
    (d) => `${USL_DRIFT_LABEL}: forbidden term "${d.term}" outside v10.4 final gate`,
  );
}

export { LEAK_PATTERNS };
