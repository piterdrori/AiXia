# AgentOps Daily 12-Agent Output Quality Policy (Phase 5H-C)

**Authority:** staging-only · owner-gated · proposals only

## Principle

Daily accountability requires **one execution result per agent per UTC day**.  
Draft volume is **not** a success metric.

## Required behavior

| Outcome | Execution row | Owner draft queue |
|---------|---------------|-------------------|
| ERROR (evidence-backed) | Record finding counts + evidence | Queue after dedupe (no hard daily cap) |
| IMPROVEMENT | Record detected improvements | Max **1 per agent**, max **8 per run** (ranked) |
| NEW_FEATURE | Record detected features | Max **1 per agent**, max **3 per run** (ranked) |
| OBSERVATION / NO_FINDING | Record honest result | **No draft** |

## Draft creation gates

A candidate enters the owner queue only when it has:

1. Actionable Playwright evidence
2. Clear expected benefit
3. Precise route/scope
4. Job-perspective relevance
5. Not duplicate / near-duplicate (consolidated first)
6. Minimum confidence (improvement ≥ 0.55, feature ≥ 0.70, error ≥ 0.55)
7. Meaningful priority score from ranking

## Ranking factors

- User impact · business value · evidence strength · confidence
- Implementation clarity · architectural alignment · uniqueness
- Effort/risk ratio · agent relevance to route/module

## Cross-agent consolidation (before caps)

- Group by route + normalized issue pattern + kind
- One canonical draft with `reportingAgents[]`
- Supporting agents preserved in execution rows
- Confidence boost only when multiple agents corroborate

## Rejected candidates

Stored in daily artifact as `candidateNotQueued[]` with:

- `reason` (e.g. `exceeded_run_cap`, `cross_agent_consolidated`, `below_daily_quality_threshold`)
- `rankingScore`

Not deleted from agent observations — only excluded from owner queue insertion.

## Implementation

- `src/lib/agentops/runtime/agentOpsDailyReviewQueuePolicy.ts`
- Worker: `agentOpsDaily12AgentReview.ts` applies consolidation → rank → caps → insert
- UI: Agents hub Daily 12 card shows detected vs queued vs not queued

## Forbidden

- Forced drafts to fill quotas
- Auto-promotion, auto-memory, auto-fix, auto-PR, auto-deploy
- Production scans or main-branch workflow registration without owner approval
