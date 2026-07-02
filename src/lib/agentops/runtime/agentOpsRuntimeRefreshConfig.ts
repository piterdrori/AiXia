/**
 * AgentOps runtime mirror refresh policy.
 * When DEBUG_NO_REFRESH is true, only initial load + manual refresh run (no intervals).
 */

/** Set true to disable all automatic polling — manual refresh only. */
export const DEBUG_NO_REFRESH = true;

/** Single global poll interval when DEBUG_NO_REFRESH is false (8–15s range). */
export const AGENTOPS_RUNTIME_GLOBAL_POLL_MS = DEBUG_NO_REFRESH ? 0 : 12_000;
