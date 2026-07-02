/**
 * ACDL Unified Semantic Language (USL v1)
 * Display-only semantic normalization — ACDL engines unchanged; v10.4 final gate preserved.
 */

export {
  USL_VERSION,
  USL_LEXICON,
  USL_AUTHORITY_LEAK_TERMS,
  USL_FINAL_GATE_MARKER,
  USL_DRIFT_LABEL,
  USL_COVERED_LEGACY_TERMS,
  type UslLexiconEntry,
} from "./semanticLexicon";

export {
  translateToUSL,
  translateToUSLDeep,
  normalizeAcdlReportForDisplay,
  type UslTranslateOptions,
} from "./uslTranslator";

export {
  containsAuthorityLeak,
  normalizeDisplayString,
  normalizeDisplayPayload,
  normalizeDisplayWithDrift,
  validateAndSanitizeDisplayText,
  type UslDisplayNormalizeOptions,
} from "./uslDisplayNormalizer";

export {
  detectAuthorityLeaks,
  assertNoPreGateAuthorityLeaks,
  type UslDriftFinding,
} from "./uslValidationFirewall";

export {
  normalizeLifecycleStepsForDisplay,
  normalizeTimelineEventsForDisplay,
  normalizeRuntimeDisplayText,
} from "./uslDynamicDisplay";
