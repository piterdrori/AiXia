import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardList,
  FileInput,
  ListChecks,
  RefreshCw,
  ShieldCheck,
  TerminalSquare,
  Wrench,
} from "lucide-react";

import {
  AixiaAsyncState,
  AixiaButton,
  AixiaCommandHubMetaStrip,
  AixiaCommandMetrics,
  AixiaCommandPageLayout,
  AixiaEmptyState,
  AixiaHero,
  AixiaInfoBlock,
  AixiaSection,
} from "@/components/aixia";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  getAgentOpsGeneratedFixPlans,
  getAgentOpsImportReviewSummary,
  getAgentOpsOwnerStatus,
  getAgentOpsRunHistory,
  getAgentOpsVerificationRequests,
  type AgentOpsGeneratedFixPlan,
  type AgentOpsImportCandidateSource,
  type AgentOpsVerificationRequestItem,
} from "@/lib/agentops";
import { AgentOpsFixPlanOperatorSurface } from "@/app/system/agent-ops/operators/AgentOpsFixPlanOperatorSurface";
import { AgentOpsImportOperatorSurface } from "@/app/system/agent-ops/operators/AgentOpsImportOperatorSurface";
import { AgentOpsVerificationRequestOperatorSurface } from "@/app/system/agent-ops/operators/AgentOpsVerificationRequestOperatorSurface";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export default function AgentOpsAdvancedPage() {
  usePageTitle("AgentOps Advanced");

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [importSources, setImportSources] = useState<AgentOpsImportCandidateSource[]>([]);
  const [fixPlans, setFixPlans] = useState<AgentOpsGeneratedFixPlan[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<AgentOpsVerificationRequestItem[]>([]);
  const [latestRunAt, setLatestRunAt] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [ownerResult, importResult, plansResult, verificationResult, runHistoryResult] =
      await Promise.all([
        getAgentOpsOwnerStatus(),
        getAgentOpsImportReviewSummary(),
        getAgentOpsGeneratedFixPlans(),
        getAgentOpsVerificationRequests(),
        getAgentOpsRunHistory(10),
      ]);

    if (ownerResult.error || !ownerResult.data?.isOwner) {
      setIsOwner(false);
      setError(ownerResult.error ?? "AgentOps Owner access required.");
      setLoading(false);
      return;
    }

    setIsOwner(true);
    setImportSources(importResult.data?.sources ?? []);
    setFixPlans(plansResult.data?.plans ?? []);
    setVerificationRequests(verificationResult.data ?? []);
    setLatestRunAt(runHistoryResult.data?.[0]?.started_at ?? null);

    const firstError =
      importResult.error ?? plansResult.error ?? verificationResult.error ?? runHistoryResult.error;
    if (firstError) setError(firstError);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const summary = useMemo(() => {
    const importCandidates = importSources.reduce((sum, source) => sum + source.candidateCount, 0);
    const pendingVerification = verificationRequests.filter(
      (item) => item.requestStatus !== "verification_passed",
    ).length;
    const ownerReviewFixPlans = fixPlans.filter((plan) =>
      ["ready_for_owner_review", "draft_plan", "needs_better_plan"].includes(plan.planStatus),
    ).length;
    return {
      importSources: importSources.length,
      importCandidates,
      fixPlans: fixPlans.length,
      ownerReviewFixPlans,
      verificationRequests: verificationRequests.length,
      pendingVerification,
    };
  }, [fixPlans, importSources, verificationRequests]);

  const advancedMetaStripItems = useMemo(
    () => [
      {
        key: "staging",
        label: "Environment",
        value: "Staging only",
        detail: "Manual-first AgentOps staging surface.",
        tone: "amber" as const,
      },
      {
        key: "control",
        label: "Control mode",
        value: "Owner-controlled",
        detail: "Technical tools require explicit owner action.",
        tone: "rose" as const,
      },
      {
        key: "scope",
        label: "Tool scope",
        value: "Import, fix plans, verification",
        detail: "Rare operator workflows grouped below.",
        tone: "neutral" as const,
      },
      {
        key: "safety",
        label: "Runtime safety",
        value: "Manual-first only",
        detail: "No scheduler or automatic Cursor execution.",
        tone: "cyan" as const,
      },
    ],
    [],
  );

  const advancedCommandMetrics = useMemo(
    () => [
      {
        key: "import-sources",
        title: "Import sources",
        value: loading ? "Checking…" : String(summary.importSources),
        subtitle: "Candidate source plans loaded",
        icon: FileInput,
        tone: "cyan" as const,
      },
      {
        key: "import-candidates",
        title: "Import candidates",
        value: loading ? "Checking…" : String(summary.importCandidates),
        subtitle: "Across all import sources",
        icon: FileInput,
        tone: "indigo" as const,
      },
      {
        key: "fix-plans",
        title: "Fix plans",
        value: loading ? "Checking…" : String(summary.fixPlans),
        subtitle: "Generated fix plan artifacts",
        icon: ClipboardList,
        tone: "violet" as const,
      },
      {
        key: "owner-review-plans",
        title: "Owner review fix plans",
        value: loading ? "Checking…" : String(summary.ownerReviewFixPlans),
        subtitle: "Draft or review-needed plans",
        icon: Wrench,
        tone: "amber" as const,
      },
      {
        key: "verification-requests",
        title: "Verification requests",
        value: loading ? "Checking…" : String(summary.verificationRequests),
        subtitle: "Recorded verification queue rows",
        icon: ShieldCheck,
        tone: "emerald" as const,
      },
      {
        key: "pending-verification",
        title: "Pending verification",
        value: loading ? "Checking…" : String(summary.pendingVerification),
        subtitle: "Awaiting owner review",
        icon: ShieldCheck,
        tone: "rose" as const,
      },
    ],
    [loading, summary],
  );

  const advancedHero = (
    <AixiaHero
      surface="command"
      className="shrink-0 space-y-4"
      gradientTitle="AgentOps"
      title="Advanced"
      subtitle="Technical tools and manual operator workflows"
      parentLabel="Control Center"
      parentPath="/system/agent-ops"
      actions={
        <>
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Control Center
          </AixiaButton>
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/issues")}>
            <ListChecks className="mr-2 h-4 w-4" />
            Issues
          </AixiaButton>
          <AixiaButton variant="secondary" disabled={loading} onClick={() => void loadData()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </AixiaButton>
        </>
      }
    >
      <AixiaCommandMetrics items={advancedCommandMetrics} />
    </AixiaHero>
  );

  if (!loading && (!isOwner || error?.toLowerCase().includes("owner access required"))) {
    return (
      <AixiaCommandPageLayout hero={advancedHero}>
        <AixiaSection
          surface="command"
          title="AgentOps Advanced"
          description="Owner access required"
          icon={ShieldCheck}
        >
          <AixiaInfoBlock tone="rose" icon={ShieldCheck} title="Access restricted">
            {error ?? "Only AgentOps owner users can view this page."}
          </AixiaInfoBlock>
        </AixiaSection>
      </AixiaCommandPageLayout>
    );
  }

  return (
    <AixiaCommandPageLayout
      hero={advancedHero}
      scrollLead={<AixiaCommandHubMetaStrip variant="command" items={advancedMetaStripItems} />}
    >
      <div data-testid="agentops-advanced">
        <AixiaSection
          surface="command"
          title="Safety boundaries"
          description="Manual-first guardrails for this advanced operator route."
          icon={ShieldCheck}
        >
          <AixiaInfoBlock tone="gold" icon={ShieldCheck} title="Safety boundaries">
            Technical/operator tools stay manual-first. No scheduler activation, no runtime activation, and no automatic
            Cursor execution are enabled on this page.
          </AixiaInfoBlock>
        </AixiaSection>

        <AixiaAsyncState
          loading={loading}
          fallback={
            <AixiaSection
              surface="command"
              title="Advanced tools"
              description="Loading import, fix plan, and verification operator data."
              icon={Wrench}
            >
              <AixiaEmptyState
                icon={Wrench}
                title="Loading advanced tools"
                description="Import sources, fix plans, and verification queues are being prepared."
              />
            </AixiaSection>
          }
        >
          <>
            {error && !error.toLowerCase().includes("owner access required") ? (
              <AixiaInfoBlock tone="rose" icon={ShieldCheck} title="Data issue">
                {error}
              </AixiaInfoBlock>
            ) : null}

            <AgentOpsImportOperatorSurface disabled={loading} onRefresh={loadData} />

            <AgentOpsFixPlanOperatorSurface
              fixPlans={fixPlans}
              loading={loading}
              onRefresh={loadData}
            />

            <AgentOpsVerificationRequestOperatorSurface
              verificationRequests={verificationRequests}
              loading={loading}
              onRefresh={loadData}
            />

            <AixiaSection
              surface="command"
              title="Reports and command examples"
              description="Manual operator commands and latest run marker."
              icon={TerminalSquare}
            >
              <details className="agentops-disclosure rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                  Reports and command examples
                </summary>
                <div className="mt-4 space-y-3">
                  <AixiaInfoBlock tone="cyan" icon={TerminalSquare} title="Manual operator command examples">
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      <li>
                        <code>npm run qa:agentops-static-import-plan</code>
                      </li>
                      <li>
                        <code>npm run qa:agentops-fix-plans</code>
                      </li>
                      <li>
                        <code>npm run qa:agentops-verify -- --issue &lt;ISSUE_CODE&gt;</code>
                      </li>
                      <li>
                        <code>npm run qa:agentops-browser-findings-import-plan</code>
                      </li>
                    </ul>
                  </AixiaInfoBlock>
                  <AixiaInfoBlock tone="cyan" icon={ClipboardList} title="Latest technical run marker">
                    Latest run recorded: {formatDateTime(latestRunAt)}
                  </AixiaInfoBlock>
                </div>
              </details>
            </AixiaSection>

            <AixiaSection
              surface="command"
              title="Control Center legacy fallback"
              description="Hub legacy panel preserved until Phase 0B removal — operator parity now on this route."
              icon={Wrench}
            >
              <AixiaInfoBlock tone="cyan" icon={Wrench} title="Legacy fallback still available">
                Interactive import, fix-plan, and verification operators are on this Advanced route. The Control Center
                legacy fallback remains unchanged as a secondary copy until Phase 0B.
              </AixiaInfoBlock>
            </AixiaSection>
          </>
        </AixiaAsyncState>
      </div>
    </AixiaCommandPageLayout>
  );
}
