import { useParams } from "react-router-dom";

import { usePageTitle } from "@/hooks/usePageTitle";
import {
  getToolRegistryToolBySlug,
} from "@/lib/agentops/tools/toolRegistry";

import {
  ToolsHubClaudeContextFoundationPage,
  ToolsHubCodeGraphFoundationPage,
  ToolsHubUnderstandAnythingFoundationPage,
} from "../../../codeContextUnderstandingViews";
import {
  ToolsHubBrowserQaFoundationPage,
  ToolsHubGuardrailsFoundationPage,
  ToolsHubPlaywrightFoundationPage,
  ToolsHubReportsFoundationPage,
  ToolsHubVerificationResultsFoundationPage,
} from "../../../evidenceToolsViews";
import {
  ToolsHubHermesDetailNotFound,
  ToolsHubHermesDetailPage,
} from "../../../hermesDetailViews";

const HERMES_REGISTRY_ID = "mct-hermes";
const CODEGRAPH_REGISTRY_ID = "ccu-codegraph";
const UNDERSTAND_ANYTHING_REGISTRY_ID = "ccu-understand-anything";
const CLAUDE_CONTEXT_REGISTRY_ID = "ccu-claude-context";
const BROWSER_QA_REGISTRY_ID = "et-browser-qa";
const PLAYWRIGHT_REGISTRY_ID = "et-playwright";
const REPORTS_REGISTRY_ID = "et-reports";
const GUARDRAILS_REGISTRY_ID = "et-guardrails";
const VERIFICATION_RESULTS_REGISTRY_ID = "et-verification-results";

export default function AgentOpsToolsToolDetailPage() {
  const { categoryId = "", groupId = "", toolId = "" } = useParams();
  const entry = getToolRegistryToolBySlug(categoryId, groupId, toolId);

  usePageTitle(entry ? `${entry.title} · Tools` : "Tool detail");

  if (!entry) {
    return (
      <ToolsHubHermesDetailNotFound
        categoryId={categoryId}
        groupId={groupId}
        toolSlug={toolId}
      />
    );
  }

  if (entry.id === HERMES_REGISTRY_ID) {
    return <ToolsHubHermesDetailPage registryEntry={entry} />;
  }

  if (entry.id === CODEGRAPH_REGISTRY_ID) {
    return <ToolsHubCodeGraphFoundationPage />;
  }

  if (entry.id === UNDERSTAND_ANYTHING_REGISTRY_ID) {
    return <ToolsHubUnderstandAnythingFoundationPage />;
  }

  if (entry.id === CLAUDE_CONTEXT_REGISTRY_ID) {
    return <ToolsHubClaudeContextFoundationPage />;
  }

  if (entry.id === BROWSER_QA_REGISTRY_ID) {
    return <ToolsHubBrowserQaFoundationPage />;
  }

  if (entry.id === PLAYWRIGHT_REGISTRY_ID) {
    return <ToolsHubPlaywrightFoundationPage />;
  }

  if (entry.id === REPORTS_REGISTRY_ID) {
    return <ToolsHubReportsFoundationPage />;
  }

  if (entry.id === GUARDRAILS_REGISTRY_ID) {
    return <ToolsHubGuardrailsFoundationPage />;
  }

  if (entry.id === VERIFICATION_RESULTS_REGISTRY_ID) {
    return <ToolsHubVerificationResultsFoundationPage />;
  }

  return (
    <ToolsHubHermesDetailNotFound
      categoryId={categoryId}
      groupId={groupId}
      toolSlug={toolId}
    />
  );
}
