import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Layers, ShieldCheck, Sparkles } from "lucide-react";

import {
  AixiaBadge,
  AixiaButton,
  AixiaInfoBlock,
  AixiaInputField,
  AixiaSection,
  AixiaTableShell,
  AixiaTextareaField,
} from "@/components/aixia";
import {
  createAgentOpsFocusDirective,
  getAgentOpsFocusDirectives,
  getAgentOpsFocusRankingPreview,
  getAgentOpsOwnerStatus,
  recordAgentOpsFocusRankingDecision,
  updateAgentOpsFocusDirective,
  type AgentOpsFocusDirective,
  type AgentOpsFocusDirectiveTarget,
  type AgentOpsFocusDirectiveType,
  type AgentOpsFocusRankingDecision,
  type AgentOpsFocusRankingPreview,
} from "@/lib/agentops";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export type AgentOpsFocusOperatorSurfaceProps = {
  onRefresh?: () => void | Promise<void>;
  disabled?: boolean;
};

export function AgentOpsFocusOperatorSurface({
  onRefresh,
  disabled = false,
}: AgentOpsFocusOperatorSurfaceProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );
  const [directives, setDirectives] = useState<AgentOpsFocusDirective[]>([]);
  const [directivesError, setDirectivesError] = useState<string | null>(null);
  const [rankingPreview, setRankingPreview] = useState<AgentOpsFocusRankingPreview | null>(null);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [directiveSubmitting, setDirectiveSubmitting] = useState(false);
  const [rankingSubmitting, setRankingSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [directiveType, setDirectiveType] = useState<AgentOpsFocusDirectiveType>("prioritize_module");
  const [target, setTarget] = useState<AgentOpsFocusDirectiveTarget>("module");
  const [targetValue, setTargetValue] = useState("");
  const [priorityWeight, setPriorityWeight] = useState("20");

  const loadData = useCallback(async () => {
    setLoading(true);
    setDirectivesError(null);
    setRankingError(null);

    const [ownerResult, directivesResult, rankingResult] = await Promise.all([
      getAgentOpsOwnerStatus(),
      getAgentOpsFocusDirectives(),
      getAgentOpsFocusRankingPreview(),
    ]);

    if (ownerResult.error || !ownerResult.data?.isOwner) {
      setDirectives([]);
      setRankingPreview(null);
      setDirectivesError(ownerResult.error ?? "Owner access required.");
      setLoading(false);
      return;
    }

    if (directivesResult.error) setDirectivesError(directivesResult.error);
    if (rankingResult.error) setRankingError(rankingResult.error);
    setDirectives(directivesResult.data ?? []);
    setRankingPreview(rankingResult.data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const submitDirective = useCallback(async () => {
    setDirectiveSubmitting(true);
    setFeedback(null);
    const parsedWeight = Number(priorityWeight);
    const result = await createAgentOpsFocusDirective({
      title: title.trim(),
      description: description.trim(),
      directiveType,
      target,
      targetValue: targetValue.trim(),
      priorityWeight: Number.isFinite(parsedWeight) ? parsedWeight : 0,
    });
    setDirectiveSubmitting(false);
    if (result.error) {
      setFeedback({ tone: "error", message: result.error });
      return;
    }
    setFeedback({ tone: "success", message: "Focus directive recorded (preview-only)." });
    setTitle("");
    setDescription("");
    setTargetValue("");
    await loadData();
    await onRefresh?.();
  }, [
    description,
    directiveType,
    loadData,
    onRefresh,
    priorityWeight,
    target,
    targetValue,
    title,
  ]);

  const toggleDirectiveActive = useCallback(
    async (directive: AgentOpsFocusDirective, active: boolean) => {
      setDirectiveSubmitting(true);
      setFeedback(null);
      const result = await updateAgentOpsFocusDirective({
        directiveId: directive.directiveId.replace("feedback-", ""),
        active,
        note: `${active ? "Activated" : "Deactivated"} from Agents route focus operator.`,
      });
      setDirectiveSubmitting(false);
      if (result.error) {
        setFeedback({ tone: "error", message: result.error });
        return;
      }
      setFeedback({
        tone: "success",
        message: `Focus directive ${active ? "activated" : "deactivated"}.`,
      });
      await loadData();
      await onRefresh?.();
    },
    [loadData, onRefresh],
  );

  const submitRankingDecision = useCallback(
    async (decision: AgentOpsFocusRankingDecision) => {
      setRankingSubmitting(true);
      setFeedback(null);
      const result = await recordAgentOpsFocusRankingDecision({
        decision,
        note: `Focus ranking preview decision: ${decision.replaceAll("_", " ")}.`,
      });
      setRankingSubmitting(false);
      if (result.error) {
        setFeedback({ tone: "error", message: result.error });
        return;
      }
      setFeedback({
        tone: "success",
        message: `Ranking preview decision recorded: ${decision.replaceAll("_", " ")}.`,
      });
    },
    [],
  );

  return (
    <>
      {feedback ? (
        <AixiaInfoBlock
          tone={feedback.tone === "success" ? "emerald" : "rose"}
          icon={feedback.tone === "success" ? ShieldCheck : AlertTriangle}
          title="Focus operator"
        >
          {feedback.message}
        </AixiaInfoBlock>
      ) : null}

      <AixiaSection
        surface="command"
        title="Focus Directives"
        description="Controlled preview directives — G10 operator parity from Hub legacy."
        icon={Sparkles}
      >
        <AixiaInfoBlock tone="violet" icon={AlertTriangle} title="Preview-only safety">
          No automatic ranking apply, import, scheduler activation, or command execution from UI.
        </AixiaInfoBlock>
        {directivesError ? (
          <AixiaInfoBlock tone="rose" icon={AlertTriangle} title="Focus directives unavailable">
            {directivesError}
          </AixiaInfoBlock>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Title</span>
            <AixiaInputField
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Directive title"
              disabled={disabled || directiveSubmitting}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Type</span>
            <select
              className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              value={directiveType}
              onChange={(event) =>
                setDirectiveType(event.target.value as AgentOpsFocusDirectiveType)
              }
              disabled={disabled || directiveSubmitting}
            >
              <option value="prioritize_module">prioritize_module</option>
              <option value="deprioritize_module">deprioritize_module</option>
              <option value="prioritize_issue_type">prioritize_issue_type</option>
              <option value="workflow_focus">workflow_focus</option>
              <option value="route_focus">route_focus</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Target</span>
            <select
              className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              value={target}
              onChange={(event) => setTarget(event.target.value as AgentOpsFocusDirectiveTarget)}
              disabled={disabled || directiveSubmitting}
            >
              <option value="module">module</option>
              <option value="route">route</option>
              <option value="issueType">issueType</option>
              <option value="agentId">agentId</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Target value
            </span>
            <AixiaInputField
              value={targetValue}
              onChange={(event) => setTargetValue(event.target.value)}
              placeholder="e.g. finance/quotations"
              disabled={disabled || directiveSubmitting}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Priority weight
            </span>
            <AixiaInputField
              value={priorityWeight}
              onChange={(event) => setPriorityWeight(event.target.value)}
              disabled={disabled || directiveSubmitting}
            />
          </label>
          <label className="block space-y-2 sm:col-span-2 lg:col-span-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Description
            </span>
            <AixiaTextareaField
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              disabled={disabled || directiveSubmitting}
            />
          </label>
        </div>
        <div className="mt-3">
          <AixiaButton
            variant="primary"
            disabled={disabled || directiveSubmitting || !title.trim()}
            onClick={() => void submitDirective()}
          >
            {directiveSubmitting ? "Saving…" : "Record Focus Directive"}
          </AixiaButton>
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-slate-400">Loading focus directives…</p>
        ) : directives.length > 0 ? (
          <div className="aixia-scrollbar mt-4 w-full max-w-full overflow-x-auto pb-3">
            <AixiaTableShell variant="registry" minWidthClassName="min-w-[900px]">
              <thead className="aixia-table-head">
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Target</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {directives.map((directive) => (
                  <tr key={directive.directiveId}>
                    <td>{directive.title}</td>
                    <td>{directive.directiveType}</td>
                    <td>
                      {directive.target}:{directive.targetValue}
                    </td>
                    <td>
                      <AixiaBadge tone={directive.active ? "emerald" : "neutral"}>
                        {directive.active ? "active" : "inactive"}
                      </AixiaBadge>
                    </td>
                    <td>
                      <AixiaButton
                        variant="secondary"
                        className="text-xs px-3 py-1.5"
                        disabled={disabled || directiveSubmitting}
                        onClick={() =>
                          void toggleDirectiveActive(directive, !directive.active)
                        }
                      >
                        {directive.active ? "Deactivate" : "Activate"}
                      </AixiaButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </AixiaTableShell>
          </div>
        ) : null}
      </AixiaSection>

      <AixiaSection
        surface="command"
        title="Ranking Preview"
        description="Preview-only recommendation layer — G11 operator parity."
        icon={Layers}
      >
        {rankingError ? (
          <AixiaInfoBlock tone="rose" icon={AlertTriangle} title="Ranking preview unavailable">
            {rankingError}
          </AixiaInfoBlock>
        ) : null}
        {loading ? (
          <p className="text-sm text-slate-400">Loading ranking preview…</p>
        ) : rankingPreview ? (
          <>
            <p className="text-sm text-slate-300">
              Rules: {rankingPreview.rulesVersion} · Generated:{" "}
              {formatDateTime(rankingPreview.generatedAt)}
            </p>
            <div className="aixia-scrollbar mt-3 w-full max-w-full overflow-x-auto pb-3">
              <AixiaTableShell variant="registry" minWidthClassName="min-w-[1200px]">
                <thead className="aixia-table-head">
                  <tr>
                    <th>Issue</th>
                    <th>Title</th>
                    <th>Rank</th>
                    <th>Agent</th>
                    <th>Explanation</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingPreview.items.slice(0, 20).map((item) => (
                    <tr key={`rank-${item.issueCode}`}>
                      <td className="font-mono text-xs">{item.issueCode}</td>
                      <td>{item.title}</td>
                      <td>{item.recommendedRank}</td>
                      <td>{item.recommendedAgent ?? "—"}</td>
                      <td className="text-xs text-slate-300">{item.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </AixiaTableShell>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ["approve_preview", "Approve Preview"],
                  ["needs_adjustment", "Needs Adjustment"],
                  ["hold", "Hold"],
                  ["apply_later", "Copy Recommendation"],
                ] as const
              ).map(([decision, label]) => (
                <AixiaButton
                  key={decision}
                  variant="secondary"
                  className="text-xs px-3 py-1.5"
                  disabled={disabled || rankingSubmitting}
                  onClick={() => void submitRankingDecision(decision)}
                >
                  {label}
                </AixiaButton>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">No ranking preview loaded.</p>
        )}
      </AixiaSection>
    </>
  );
}
