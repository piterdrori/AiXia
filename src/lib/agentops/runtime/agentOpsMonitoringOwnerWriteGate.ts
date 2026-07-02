/**
 * Owner write approval gate — required when monitoring dry-run is disabled.
 */

export const OWNER_MONITORING_WRITE_APPROVAL_ENV = "AGENTOPS_OWNER_APPROVED_MONITORING_WRITE";

export type OwnerWriteGateStatus = {
  dryRunRequested: boolean;
  ownerWriteApproved: boolean;
  effectiveDryRun: boolean;
  writesBlocked: boolean;
  writesBlockedReason: string | null;
  refuseStartup: boolean;
  refuseStartupReason: string | null;
};

export function isOwnerMonitoringWriteApproved(): boolean {
  const raw = process.env[OWNER_MONITORING_WRITE_APPROVAL_ENV]?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export function resolveOwnerWriteGate(
  dryRunRequested: boolean,
  options: { strictStartup?: boolean } = {},
): OwnerWriteGateStatus {
  const ownerWriteApproved = isOwnerMonitoringWriteApproved();
  const strictStartup = options.strictStartup ?? false;

  if (dryRunRequested) {
    return {
      dryRunRequested: true,
      ownerWriteApproved,
      effectiveDryRun: true,
      writesBlocked: true,
      writesBlockedReason: "dry-run mode — mutations disabled",
      refuseStartup: false,
      refuseStartupReason: null,
    };
  }

  if (!ownerWriteApproved) {
    const reason =
      "write blocked — missing owner approval env (set AGENTOPS_OWNER_APPROVED_MONITORING_WRITE=true)";
    return {
      dryRunRequested: false,
      ownerWriteApproved: false,
      effectiveDryRun: true,
      writesBlocked: true,
      writesBlockedReason: reason,
      refuseStartup: strictStartup,
      refuseStartupReason: strictStartup
        ? `Refusing to run: AGENTOPS_MONITORING_DRY_RUN=false requires ${OWNER_MONITORING_WRITE_APPROVAL_ENV}=true`
        : null,
    };
  }

  return {
    dryRunRequested: false,
    ownerWriteApproved: true,
    effectiveDryRun: false,
    writesBlocked: false,
    writesBlockedReason: null,
    refuseStartup: false,
    refuseStartupReason: null,
  };
}
