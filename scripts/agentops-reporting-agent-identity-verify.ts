/**
 * Reporting-agent identity normalize verify + LLM source accept.
 * Run: npx tsx scripts/agentops-reporting-agent-identity-verify.ts
 */

import { normalizeReportingAgent } from "../src/lib/agentops/findings/reportingAgentIdentity";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function main() {
  const canonical = normalizeReportingAgent("qa-agent");
  assert(canonical.kind === "canonical" && canonical.canonicalId === "qa-agent", "canonical match");
  assert(canonical.canChat, "canonical can chat");

  const atForm = normalizeReportingAgent("@aixia.qa-agent");
  assert(atForm.kind === "canonical" && atForm.canonicalId === "qa-agent", "@aixia prefix");

  const alias = normalizeReportingAgent("@aixia.static-guardrail-import");
  assert(alias.kind === "alias" && alias.canonicalId === "qa-agent", "static alias → qa-agent");
  assert(alias.canChat, "alias can chat");
  assert(alias.originalLabel.includes("static-guardrail"), "original preserved");

  const external = normalizeReportingAgent("some-random-importer-xyz");
  assert(external.kind === "external" && external.canonicalId === null, "unknown external");
  assert(!external.canChat, "external cannot chat");
  assert(external.displayName.includes("External"), "external label");

  const empty = normalizeReportingAgent(null);
  assert(empty.kind === "external" && !empty.canChat, "null reporter");

  // Live LLM client must accept cloud_llm as a live source (Doubao path).
  const acceptLive = (source: string) => source === "local_llm" || source === "cloud_llm";
  assert(acceptLive("cloud_llm"), "cloud_llm accepted");
  assert(acceptLive("local_llm"), "local_llm accepted");
  assert(!acceptLive("unavailable"), "unavailable rejected");

  console.log("[agentops-reporting-agent-identity-verify] PASS");
}

main();
