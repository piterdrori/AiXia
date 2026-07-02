/** Unified Agent Detail product copy — USL-safe, shared across all 12 agents. */

export const AGENT_DETAIL_DISPLAY = {

  statusDisplayOnly: "Display only — not ACDL authority.",

  derivedFromStoredFields: "Derived from stored fields — not ACDL authority",



  readinessTitle: "Agent readiness",

  readinessDescription: "Availability, activity, work mode, and linked issue load — staging display only",



  availabilityActive: "Active",

  availabilityActiveDetail: "Agent row allows staging work when not blocked or paused.",

  availabilityPaused: "Paused",

  availabilityPausedDetail: "Owner paused this agent.",

  availabilityBlocked: "Blocked",

  availabilityBlockedDetail: "Owner blocked this agent.",



  activityIdle: "Idle — waiting for owner command",

  activityIdleDetail:

    "Idle does not mean inactive. The agent is waiting for an owner command or has no recent runtime task.",

  activityRecentlyActive: "Recently active",

  activityRecentlyActiveDetail: "Agent had runtime activity in the recent window.",



  workModeManualStaging: "Manual-only on staging",

  workModeManualStagingDetail:

    "Manual-only on staging. Scheduled and continuous monitoring are wired but not active without owner env flag.",



  schedulingNotEnabledFromPage: "Prepared — not active",

  schedulingNotEnabledDetail:

    "Scheduled monitoring is wired but not active. Runtime policy requires owner env flag for activation.",

  schedulingStoredConfigDetail:

    "Stored schedule config exists; runtime policy wired — activation requires owner env flag.",



  issueLoadOneLinked: "1 open issue linked",

  issueLoadManyLinked: "{count} open issues linked",

  issueLoadLinkedDetail: "Open issues are linked to this agent.",

  issueLoadNoneLinked: "No open issues linked",

  issueLoadNoneLinkedDetail: "Agent is available and has no linked open issues.",



  headlineActiveWithIssues: "Active · open issues linked",

  headlineActiveNoIssues: "Active · no open issues",

  headlineRunningRecently: "Running recently",

  headlinePaused: "Paused",

  headlineBlocked: "Blocked",

  headlineMissingAgent: "Agent row missing",



  permissionsDescription: "Can do, cannot do, and always forbidden — staging display only",

  workModeDescription: "Manual staging cycles — owner-triggered work only",

  toolsDescription: "Direct agent tools and platform support — display only, not execution authority",

  toolsDirectHeading: "Direct agent tools",

  toolsPlatformHeading: "Platform support (non-direct agent tool)",



  memoryCurrentTitle: "Current memory",

  memoryCurrentDescription: "What this agent currently knows — read only",

  memoryInsightsTitle: "Memory insights",

  memoryInsightsDescription: "What the system has observed about this agent — read only",

  memoryInsightsEmpty: "No memory insights recorded yet for this agent.",

  memoryProposalTitle: "Memory change flow",

  memoryProposalDescription: "Chat-driven proposal — pending approval",



  chatAdvisoryOnly: "Chat is advisory only — no memory mutation",

  chatMemoryUpdateDetected: "Memory update detected",

  chatSendToProposal: "Send to Memory Proposal",

  chatDescription:

    "Instruct this agent in conversation — persistent memory changes require owner approval below",

  chatNewChat: "New chat",

  chatPreviousChats: "Previous chats",

  chatEmptyTitle: "Start a conversation",

  chatEmptyDescription:

    "Ask about work, tools, or blockers. Say “remember this” to open a memory proposal.",

  chatVoiceInputUnavailable: "Voice input unavailable — check Doubao ASR configuration",



  platformSupportStatus: "Platform support (non-direct agent tool)",

  platformSupportDetail:

    "Available through AgentOps platform, not as a direct per-agent tool.",

  directToolAvailable: "Direct tool — available on owner command",

  directToolAvailableDetail: "Stored wiring matches identity capabilities.",

  directToolNotOnRow: "Not assigned to this agent role",

  directToolNotOnRowDetail: "Correct for this agent — not a missing integration.",



  /** Agents Hub — preview layer (same vocabulary as detail) */

  hubLastBehaviorTrace: "Last behavior trace",

  hubOpenAgent: "Open Agent",

  hubReadinessPreview: "Readiness",
  hubAttentionLabel: "Open issue load",
  hubAttentionDetail: "Agents with linked open issues — availability unchanged",

  hubMemoryPreviewTitle: "Current memory (preview)",

  hubViewFullMemory: "View full memory",

  hubCanDoPreview: "Can do (preview)",

  hubToolsPreview: "Tools (preview)",

  hubChatRule: "Chat is advisory only — no memory mutation",

} as const;



/** @deprecated Use buildAgentReadinessHeadlineLabel — kept for tone mapping on legacy ProductAgentStatus */

export function productStatusObservedValue(

  status: "active" | "needs_attention" | "blocked" | "quiet",

): string {

  switch (status) {

    case "active":

      return AGENT_DETAIL_DISPLAY.headlineRunningRecently;

    case "needs_attention":

      return AGENT_DETAIL_DISPLAY.headlineActiveWithIssues;

    case "blocked":

      return AGENT_DETAIL_DISPLAY.headlineBlocked;

    case "quiet":

      return AGENT_DETAIL_DISPLAY.headlineActiveNoIssues;

  }

}


