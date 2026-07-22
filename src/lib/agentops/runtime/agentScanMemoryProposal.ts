/**
 * After a role-first scan, propose Hermes memory lessons for continuous improvement.
 * Proposals only — never silent law changes.
 */

import { getAgentRoleDetectorPack } from "./agentRoleDetectors";
import type { StagingScanFinding } from "./stagingScanTypes";

export type AgentScanMemoryProposal = {
  agentSlug: string;
  hermesNamespace: string;
  proposedAt: string;
  lessonSummaries: string[];
  findingCount: number;
  improvementHints: string[];
};

export function buildAgentScanMemoryProposal(input: {
  agentSlug: string;
  findings: StagingScanFinding[];
}): AgentScanMemoryProposal {
  const pack = getAgentRoleDetectorPack(input.agentSlug);
  const lessons: string[] = [];
  const improvements: string[] = [];

  if (input.findings.length === 0) {
    lessons.push(
      `${pack.agentSlug}: full-site scan produced zero in-skill findings this run.`,
    );
  } else {
    const byIssue = new Map<string, number>();
    for (const finding of input.findings) {
      const key = finding.issue.slice(0, 120);
      byIssue.set(key, (byIssue.get(key) ?? 0) + 1);
    }
    const top = [...byIssue.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [issue, count] of top) {
      lessons.push(`Signal (${count}x): ${issue}`);
    }
  }

  for (const kind of pack.improvementKinds.slice(0, 4)) {
    improvements.push(`Look for ${kind} on next full-site pass.`);
  }

  return {
    agentSlug: pack.agentSlug,
    hermesNamespace: `agentops.agent.${pack.agentSlug}`,
    proposedAt: new Date().toISOString(),
    lessonSummaries: lessons,
    findingCount: input.findings.length,
    improvementHints: improvements,
  };
}
