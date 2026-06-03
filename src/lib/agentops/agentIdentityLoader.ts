import agentopsOwnerManifest from "../../../qa-agent/agents/agentops-owner/manifest.json";
import platformAdminManifest from "../../../qa-agent/agents/platform-admin/manifest.json";
import financeAdminManifest from "../../../qa-agent/agents/finance-admin/manifest.json";
import financeViewerManifest from "../../../qa-agent/agents/finance-viewer/manifest.json";
import employeeManifest from "../../../qa-agent/agents/employee/manifest.json";
import hrAdminManifest from "../../../qa-agent/agents/hr-admin/manifest.json";
import hrEmployeeManifest from "../../../qa-agent/agents/hr-employee/manifest.json";
import managerManifest from "../../../qa-agent/agents/manager/manifest.json";
import aiUserManifest from "../../../qa-agent/agents/ai-user/manifest.json";
import guestManifest from "../../../qa-agent/agents/guest/manifest.json";
import vendorExternalManifest from "../../../qa-agent/agents/vendor-external/manifest.json";
import tenantAdminManifest from "../../../qa-agent/agents/tenant-admin/manifest.json";

import { appendAgentOpsGlobalApprovedMemoryPromptLines } from "./globalMemoryApprovedService";
import type { AgentOpsChatScope } from "./types";

export interface AgentOpsAgentManifest {
  agentId: string;
  displayName: string;
  syntheticEmail: string;
  appRole: string;
  qaSpecialty: string;
  purpose: string;
  allowedModules: string[];
  blockedModules: string[];
  agentOpsOwnerAccess: boolean;
  jobStatus: "placeholder" | "defined";
  folderPath: string;
}

const CREATIVITY_BRIEFS: Record<string, string> = {
  "agentops-owner":
    "Chair council discussions, prioritize implementation sequencing, and surface cross-module risks.",
  "platform-admin":
    "Imagine UX friction, layout regressions, navigation dead-ends, and design-system drift.",
  "finance-admin":
    "Hunt for workflow inconsistencies, calculation edge cases, and finance permission gaps.",
  "finance-viewer":
    "Look for read-only leaks, hidden write paths, and confusing finance visibility.",
  employee: "Explore employee-day workflows for confusing states and missing validations.",
  "hr-admin": "Watch people ops flows for policy gaps, role mismatches, and HR data integrity.",
  "hr-employee": "Report employee-side HR friction and unclear self-service paths.",
  manager: "Review manager workflows for approval bottlenecks and operational blind spots.",
  "ai-user": "Probe AI productivity flows for confusing controls and weak feedback loops.",
  guest: "Stress-test guest isolation, permission boundaries, and accidental data exposure.",
  "vendor-external": "Challenge external/vendor access boundaries and cross-tenant leakage.",
  "tenant-admin": "Audit tenant admin powers for overreach and missing guardrails.",
};

const MANIFEST_BY_ID: Record<string, AgentOpsAgentManifest> = {
  "agentops-owner": agentopsOwnerManifest as AgentOpsAgentManifest,
  "platform-admin": platformAdminManifest as AgentOpsAgentManifest,
  "finance-admin": financeAdminManifest as AgentOpsAgentManifest,
  "finance-viewer": financeViewerManifest as AgentOpsAgentManifest,
  employee: employeeManifest as AgentOpsAgentManifest,
  "hr-admin": hrAdminManifest as AgentOpsAgentManifest,
  "hr-employee": hrEmployeeManifest as AgentOpsAgentManifest,
  manager: managerManifest as AgentOpsAgentManifest,
  "ai-user": aiUserManifest as AgentOpsAgentManifest,
  guest: guestManifest as AgentOpsAgentManifest,
  "vendor-external": vendorExternalManifest as AgentOpsAgentManifest,
  "tenant-admin": tenantAdminManifest as AgentOpsAgentManifest,
};

const JOB_PLACEHOLDER =
  "Job definition placeholder — Mission, Responsibilities, Out of scope, and Escalation to be defined by Piter.";

export function getAgentOpsAgentManifest(agentId: string): AgentOpsAgentManifest | null {
  const normalized = agentId?.trim();
  if (!normalized) return null;
  return MANIFEST_BY_ID[normalized] ?? MANIFEST_BY_ID[normalized.toLowerCase()] ?? null;
}

export function listAgentOpsAgentManifests(): AgentOpsAgentManifest[] {
  return Object.values(MANIFEST_BY_ID);
}

export interface AgentOpsAgentSystemPromptInput {
  chatScope: AgentOpsChatScope;
  memorySnippets?: string[];
  /** Hermes H2-F3B-2 — Issue Chat only; not per-agent memory. */
  globalApprovedMemorySnippets?: string[];
  roomContext?: string;
  issueContextLines?: string[];
  enableCreativity?: boolean;
}

export function buildAgentOpsAgentSystemPrompt(
  agentId: string,
  input: AgentOpsAgentSystemPromptInput,
): string {
  const manifest = getAgentOpsAgentManifest(agentId);
  const specialty = manifest?.qaSpecialty ?? "General synthetic QA";
  const displayName = manifest?.displayName ?? agentId;
  const creativity = CREATIVITY_BRIEFS[agentId] ?? CREATIVITY_BRIEFS[agentId.toLowerCase()] ?? specialty;

  const lines = [
    `You are ${displayName}, an individual synthetic QA agent in AgentOps.`,
    `Agent ID: ${agentId}`,
    `App role: ${manifest?.appRole ?? "unknown"}`,
    `QA specialty: ${specialty}`,
    `Purpose: ${manifest?.purpose ?? "QA workflow support"}`,
    `Job status: ${manifest?.jobStatus === "defined" ? "defined" : JOB_PLACEHOLDER}`,
    `Chat scope: ${input.chatScope}`,
    "Staging-only. Never claim to have executed Cursor, changed production, or written memory automatically.",
    "Reply in first person as this agent only. Do not speak for other agents.",
    "Label speculation as hypothesis, not confirmed fact.",
  ];

  if (input.enableCreativity !== false) {
    lines.push(`Creativity lens: ${creativity}`);
    lines.push(
      "You may propose problem hypotheses and test ideas in your specialty. Format optional proposals clearly.",
    );
  }

  if (input.roomContext?.trim()) {
    lines.push(`Room context: ${input.roomContext.trim()}`);
  }

  if (input.issueContextLines?.length) {
    lines.push("Issue context:");
    lines.push(...input.issueContextLines.map((line) => `- ${line}`));
  }

  appendAgentOpsGlobalApprovedMemoryPromptLines(lines, input.globalApprovedMemorySnippets);

  const memory = (input.memorySnippets ?? []).map((item) => item.trim()).filter(Boolean);
  if (memory.length) {
    lines.push("Your active memory (do not confuse with other agents):");
    lines.push(...memory.map((item) => `- ${item}`));
  } else {
    lines.push("Your active memory: none recorded yet.");
  }

  return lines.join("\n");
}

export function parseAgentCreativeProposal(text: string): {
  cleanedResponse: string;
  proposal: {
    proposalType: "problem_hypothesis" | "feature_idea" | "test_idea";
    title: string;
    summary: string;
    suggestedRoute: string | null;
    confidence: "low" | "medium" | "high";
  } | null;
} {
  const marker = "```agentProposal";
  const start = text.indexOf(marker);
  if (start === -1) {
    return { cleanedResponse: text, proposal: null };
  }
  const end = text.indexOf("```", start + marker.length);
  if (end === -1) {
    return { cleanedResponse: text, proposal: null };
  }
  const jsonText = text.slice(start + marker.length, end).trim();
  const cleanedResponse = `${text.slice(0, start).trim()}\n${text.slice(end + 3).trim()}`.trim();
  try {
    const parsed = JSON.parse(jsonText) as {
      proposalType?: string;
      title?: string;
      summary?: string;
      suggestedRoute?: string | null;
      confidence?: string;
    };
    if (!parsed.title?.trim() || !parsed.summary?.trim()) {
      return { cleanedResponse: text, proposal: null };
    }
    const proposalType =
      parsed.proposalType === "feature_idea" || parsed.proposalType === "test_idea"
        ? parsed.proposalType
        : "problem_hypothesis";
    const confidence =
      parsed.confidence === "high" || parsed.confidence === "low" ? parsed.confidence : "medium";
    return {
      cleanedResponse,
      proposal: {
        proposalType,
        title: parsed.title.trim(),
        summary: parsed.summary.trim(),
        suggestedRoute: parsed.suggestedRoute?.trim() || null,
        confidence,
      },
    };
  } catch {
    return { cleanedResponse: text, proposal: null };
  }
}
