/**
 * Shared cancel checkpoint helper for staging worker engines / Playwright runners.
 */

export class AgentOpsCancelRequestedError extends Error {
  readonly phase: string;
  readonly code = "AGENTOPS_CANCEL_REQUESTED";

  constructor(phase: string) {
    super(`Canceled at checkpoint: ${phase}`);
    this.name = "AgentOpsCancelRequestedError";
    this.phase = phase;
  }
}

export type AgentOpsCancelCheck = (phase: string) => Promise<boolean> | boolean;

export async function honorCancelCheckpoint(
  cancelCheck: AgentOpsCancelCheck | undefined,
  phase: string,
): Promise<void> {
  if (!cancelCheck) return;
  const requested = await cancelCheck(phase);
  if (requested) {
    throw new AgentOpsCancelRequestedError(phase);
  }
}

export function isCancelRequestedError(error: unknown): error is AgentOpsCancelRequestedError {
  return (
    error instanceof AgentOpsCancelRequestedError ||
    (Boolean(error) &&
      typeof error === "object" &&
      (error as { code?: string }).code === "AGENTOPS_CANCEL_REQUESTED")
  );
}
