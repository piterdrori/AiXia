import {
  USL_FINAL_GATE_MARKER,
  USL_LEXICON,
  type UslLexiconEntry,
} from "./semanticLexicon";

export type UslTranslateOptions = {
  /** When true (default), v10.4 final gate section is not rewritten. */
  preserveFinalGate?: boolean;
};

function applyLexicon(text: string, lexicon: UslLexiconEntry[] = USL_LEXICON): string {
  let out = text;
  for (const entry of lexicon) {
    out = out.replace(entry.pattern, entry.replacement);
  }
  return out;
}

/** Pure vocabulary shim — never infers new meaning. */
export function translateToUSL(input: string, options: UslTranslateOptions = {}): string {
  const preserveFinalGate = options.preserveFinalGate !== false;
  if (!input) return input;

  if (preserveFinalGate) {
    const idx = input.indexOf(USL_FINAL_GATE_MARKER);
    if (idx >= 0) {
      return (
        applyLexicon(input.slice(0, idx)) +
        input.slice(idx)
      );
    }
  }

  return applyLexicon(input);
}

/** Translate string values in plain objects/arrays; preserve keys and non-strings. */
export function translateToUSLDeep(
  input: unknown,
  options: UslTranslateOptions = {},
): unknown {
  if (typeof input === "string") {
    return translateToUSL(input, options);
  }
  if (Array.isArray(input)) {
    return input.map((item) => translateToUSLDeep(item, options));
  }
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      out[key] = translateToUSLDeep(value, options);
    }
    return out;
  }
  return input;
}

/** ACDL chat/report display boundary — preserves v10.4 ALLOW/HOLD/REJECT block. */
export function normalizeAcdlReportForDisplay(report: string): string {
  return translateToUSL(report, { preserveFinalGate: true });
}
