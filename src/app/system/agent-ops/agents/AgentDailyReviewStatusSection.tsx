import { useCallback, useEffect, useMemo, useState } from "react";

import { AixiaBadge, AixiaInfoBlock, AixiaSection } from "@/components/aixia";
import { getCanonicalDailyReviewProfile } from "@/lib/agentops/runtime/canonicalAgentDailyReview";
import { formatTimestamp } from "@/lib/agentops/agents/monitoringOwnerDisplayCopy";
import { CalendarClock } from "lucide-react";

type DailyRosterRow = {
  agentSlug: string;
  username: string;
  jobTitle: string;
  todayStatus: string;
  todayResult: string;
  lastDailyRunAt: string | null;
  routesReviewed: string[];
  errorsFound: number;
  improvementsFound: number;
  featuresFound: number;
  noFindings: boolean;
  failureReason: string | null;
};

type Props = {
  agentSlug: string;
};

export function AgentDailyReviewStatusSection({ agentSlug }: Props) {
  const profile = useMemo(() => getCanonicalDailyReviewProfile(agentSlug), [agentSlug]);
  const [row, setRow] = useState<DailyRosterRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/agentops/monitoring/status");
      const payload = (await response.json()) as {
        ok?: boolean;
        status?: {
          daily12ReviewStatus?: { roster?: DailyRosterRow[] };
          dailyStatusError?: string | null;
        };
      };
      const roster = payload.status?.daily12ReviewStatus?.roster ?? [];
      setRow(roster.find((entry) => entry.agentSlug === agentSlug) ?? null);
      if (payload.status?.dailyStatusError) setError(payload.status.dailyStatusError);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [agentSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!profile) return null;

  return (
    <AixiaSection
      title="Daily website review"
      description="Staging-only daily accountability from this agent's assigned professional perspective."
      icon={CalendarClock}
    >
      {loading ? (
        <p className="text-sm text-white/55">Loading daily review status…</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <AixiaBadge tone="neutral">{profile.username}</AixiaBadge>
            <AixiaBadge tone="cyan">{profile.jobTitle}</AixiaBadge>
            {row ? (
              <AixiaBadge tone={row.todayStatus === "completed" ? "emerald" : "amber"}>
                Today: {row.todayStatus}
              </AixiaBadge>
            ) : null}
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/75 space-y-2">
            <p>
              <span className="text-white/45">Perspective:</span> {profile.perspectiveTitle}
            </p>
            <p>
              <span className="text-white/45">Job description:</span> {profile.jobDescription}
            </p>
            <p>
              <span className="text-white/45">Primary responsibility:</span>{" "}
              {profile.primaryResponsibility}
            </p>
          </div>

          {error ? (
            <AixiaInfoBlock title="Daily status note" tone="gold">
              {error}
            </AixiaInfoBlock>
          ) : null}

          {row ? (
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-white/45">Last daily run</p>
                <p className="mt-1 text-white/90">{formatTimestamp(row.lastDailyRunAt)}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-white/45">Findings summary</p>
                <p className="mt-1 text-white/90">
                  Errors {row.errorsFound} · Improvements {row.improvementsFound} · Features{" "}
                  {row.featuresFound}
                </p>
                {row.noFindings ? (
                  <p className="mt-1 text-xs text-cyan-300/80">No credible actionable finding recorded.</p>
                ) : null}
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 md:col-span-2">
                <p className="text-xs uppercase tracking-wide text-white/45">Routes reviewed</p>
                <p className="mt-1 text-white/75">
                  {row.routesReviewed.length > 0 ? row.routesReviewed.join(", ") : "—"}
                </p>
                {row.failureReason ? (
                  <p className="mt-2 text-xs text-rose-300/90">Failure: {row.failureReason}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <AixiaInfoBlock title="No daily run recorded today" tone="gold">
              This agent has not completed today&apos;s daily review yet.
            </AixiaInfoBlock>
          )}
        </div>
      )}
    </AixiaSection>
  );
}
