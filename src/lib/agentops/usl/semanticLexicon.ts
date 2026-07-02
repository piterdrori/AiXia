/**
 * ACDL Unified Semantic Language (USL v1) — canonical vocabulary.
 * Display-only shim. Does not change ACDL engine logic or v10.4 authority.
 * @see registry/ACDL_SYSTEM_LOCK_v2.md
 */

export const USL_VERSION = "v1" as const;

export type UslLexiconEntry = {
  id: string;
  pattern: RegExp;
  replacement: string;
  legacyTerms: string[];
};

/** Ordered longest-phrase-first to avoid partial clobbering. */
export const USL_LEXICON: UslLexiconEntry[] = [
  {
    id: "recommended_action",
    pattern: /\brecommended action\b/gi,
    replacement: "suggested trace",
    legacyTerms: ["recommended action"],
  },
  {
    id: "next_recommended",
    pattern: /\bnext recommended(?: action| step)?\b/gi,
    replacement: "suggested trace",
    legacyTerms: ["next recommended action", "next recommended step"],
  },
  {
    id: "governance_outcome",
    pattern: /\bgovernance outcome\b/gi,
    replacement: "stability signal",
    legacyTerms: ["governance outcome"],
  },
  {
    id: "governance_result",
    pattern: /\bgovernance result\b/gi,
    replacement: "stability signal",
    legacyTerms: ["governance result"],
  },
  {
    id: "queue_health",
    pattern: /\bqueue health\b/gi,
    replacement: "system signal state",
    legacyTerms: ["queue health"],
  },
  {
    id: "fix_plan",
    pattern: /\bfix plan\b/gi,
    replacement: "diagnostic trace",
    legacyTerms: ["fix plan"],
  },
  {
    id: "recommended",
    pattern: /\brecommended\b/gi,
    replacement: "suggested",
    legacyTerms: ["recommended"],
  },
  {
    id: "recommendation",
    pattern: /\brecommendation\b/gi,
    replacement: "suggested trace",
    legacyTerms: ["recommendation"],
  },
  {
    id: "priority",
    pattern: /\bpriority\b/gi,
    replacement: "signal strength",
    legacyTerms: ["priority"],
  },
  {
    id: "decision",
    pattern: /\bdecision\b/gi,
    replacement: "observation",
    legacyTerms: ["decision"],
  },
  {
    id: "verdict",
    pattern: /\bverdict\b/gi,
    replacement: "advisory note",
    legacyTerms: ["verdict"],
  },
  {
    id: "approval",
    pattern: /\bapproval\b/gi,
    replacement: "owner record trace",
    legacyTerms: ["approval"],
  },
  {
    id: "best_path",
    pattern: /\bbest path\b/gi,
    replacement: "higher-signal path",
    legacyTerms: ["best path"],
  },
  {
    id: "best",
    pattern: /\bbest\b/gi,
    replacement: "high signal",
    legacyTerms: ["best"],
  },
  {
    id: "worst",
    pattern: /\bworst\b/gi,
    replacement: "low signal",
    legacyTerms: ["worst"],
  },
  {
    id: "must",
    pattern: /\bmust\b/gi,
    replacement: "may",
    legacyTerms: ["must"],
  },
  {
    id: "should",
    pattern: /\bshould\b/gi,
    replacement: "could",
    legacyTerms: ["should"],
  },
];

/** Terms that indicate authority leak when present outside v10.4 final gate. */
export const USL_AUTHORITY_LEAK_TERMS = [
  "decision",
  "priority",
  "recommended",
  "recommendation",
  "fix plan",
  "governance outcome",
  "governance result",
  "verdict",
  "must fix",
  "top priority",
] as const;

export const USL_FINAL_GATE_MARKER = "## Final gate (v10.4 ONLY";

export const USL_DRIFT_LABEL = "USL ARCHITECTURE DRIFT DETECTED";

export const USL_COVERED_LEGACY_TERMS = USL_LEXICON.flatMap((e) => e.legacyTerms);
