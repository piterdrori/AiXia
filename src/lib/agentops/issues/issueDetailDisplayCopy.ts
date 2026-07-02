import { AGENT_DETAIL_DISPLAY } from "@/lib/agentops/agents/agentDetailDisplayCopy";

/** Unified Issues system product copy — USL-safe, aligned with Agent Detail. */
export const ISSUE_DETAIL_DISPLAY = {
  statusObserved: "Stored status",
  statusObservedDetail: "Observed from stored fields — non-authoritative",

  behaviorStatus: "Behavior status",
  diagnosticTrace: "Diagnostic trace",
  storedValidation: "Stored validation",
  suggestedTrace: "Suggested trace",
  outcomeObserved: "Outcome (observed)",
  signalStrength: "Signal strength",
  observation: "Observation",
  evidence: "Evidence",
  behaviorTrace: "Behavior trace",

  chatAdvisoryOnly: AGENT_DETAIL_DISPLAY.chatAdvisoryOnly,
  chatSendToProposal: AGENT_DETAIL_DISPLAY.chatSendToProposal,

  hubStillOpen: "Still open",
  hubAwaitingValidation: "Awaiting stored validation",
  hubAwaitingValidationDetail: "Outcome pending — needs evidence",
  hubValidationToday: "Stored validation today",
  hubValidationWeek: "Stored validation this week",
  hubOutcomesTotal: "Total outcomes (observed)",
  hubOutcomesHistory: "Outcomes recorded (observed)",
  hubOutcomesEmpty: "No recorded outcomes in history yet.",

  lifecycleTitle: "Lifecycle rail",
  lifecycleDescription: "Manual-first path from issue discovery to outcome (observed).",
  timelineTitle: "Behavior trace timeline",

  memoryLinkedObservation: "Linked observation",
  memoryRelatedTrace: "Related behavior trace",
  memoryStoredReference: "Stored memory reference",

  cursorPromptSection: "Cursor prompt / handoff",
  handoffPrepared: "Handoff request prepared. Prompt remains editable until manual owner records.",
  noDiagnosticTrace: "No generated diagnostic trace found",

  workspaceTitle: "Issue-solving workbench",
  workspaceDescription: "Advisory chat with the reporting agent and Cursor prompt preparation — no automatic behavior.",
} as const;
