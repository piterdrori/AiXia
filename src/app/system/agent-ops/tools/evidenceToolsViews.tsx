import {
  CheckCircle2,
  FileText,
  Lock,
  MapPin,
  Monitor,
  Search,
  Shield,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  AixiaBadge,
  AixiaButton,
  AixiaInfoBlock,
  AixiaNavigationCard,
  AixiaNavigationGrid,
  AixiaSection,
} from "@/components/aixia";

import { getToolRegistryCategoryRoute } from "@/lib/agentops/tools/toolRegistry";

import { ToolsHubShell } from "./toolsHubViews";

const AGENT_BRAIN_CATEGORY_ID = "agent-brain-memory";
const EVIDENCE_GROUP_ID = "evidence-tools";
const EVIDENCE_PATH = `/system/agent-ops/tools/${AGENT_BRAIN_CATEGORY_ID}/${EVIDENCE_GROUP_ID}`;
const HERMES_PATH = `/system/agent-ops/tools/${AGENT_BRAIN_CATEGORY_ID}/memory-coordination-tools/hermes`;

const BROWSER_QA_PATH = `${EVIDENCE_PATH}/browser-qa`;
const PLAYWRIGHT_PATH = `${EVIDENCE_PATH}/playwright`;
const REPORTS_PATH = `${EVIDENCE_PATH}/reports`;
const GUARDRAILS_PATH = `${EVIDENCE_PATH}/guardrails`;
const VERIFICATION_RESULTS_PATH = `${EVIDENCE_PATH}/verification-results`;

type FoundationStatusItem = {
  label: string;
  value: string;
  tone: "emerald" | "amber" | "rose" | "neutral" | "cyan" | "violet";
};

type EvidenceToolFoundationConfig = {
  testId: string;
  title: string;
  subtitle: string;
  sectionIcon: typeof Search;
  badges: { label: string; tone: FoundationStatusItem["tone"] }[];
  intro: string;
  moduleStatus: FoundationStatusItem[];
  helpsWithTitle: string;
  helpsWith: string[];
  safeSourcesTitle: string;
  safeSources: string[];
  hermesIntegration: string[];
  safetyGates: string[];
  futurePath: string[];
  safetyBanner: string;
};

function FoundationStatusGrid({ items }: { items: FoundationStatusItem[] }) {
  return (
    <div className="aixia-tools-hub-hermes-memory-grid">
      {items.map((item) => (
        <div key={item.label} className="aixia-tools-hub-hermes-memory-card">
          <div className="aixia-tools-hub-hermes-memory-card-head">
            <div className="aixia-tools-hub-hermes-memory-card-title-row">
              <CheckCircle2 className="aixia-tools-hub-hermes-memory-card-icon" />
              <h3 className="aixia-tools-hub-hermes-memory-card-title">{item.label}</h3>
            </div>
            <AixiaBadge tone={item.tone}>{item.value}</AixiaBadge>
          </div>
        </div>
      ))}
    </div>
  );
}

function FoundationTopicGrid({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="aixia-tools-hub-hermes-foundation-topic-block">
      <h3 className="aixia-tools-hub-hermes-foundation-topic-title">{title}</h3>
      <ul className="aixia-tools-hub-hermes-steps-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function FoundationStagePath({ stages }: { stages: string[] }) {
  return (
    <ol className="aixia-tools-hub-hermes-foundation-path">
      {stages.map((stage) => (
        <li key={stage}>{stage}</li>
      ))}
    </ol>
  );
}

function EvidenceToolFoundationPage({ config }: { config: EvidenceToolFoundationConfig }) {
  const navigate = useNavigate();
  const SectionIcon = config.sectionIcon;

  return (
    <ToolsHubShell
      title={config.title}
      subtitle={config.subtitle}
      parentLabel="Evidence Tools"
      parentPath={EVIDENCE_PATH}
      badges={config.badges}
    >
      <div
        className="aixia-tools-hub-hermes-page aixia-tools-hub-hermes-foundation-layer-page"
        data-testid={config.testId}
      >
        <AixiaSection
          surface="command"
          title="Module status"
          description="Safe foundation only — no website-triggered execution or production runs."
          icon={SectionIcon}
          bodyClassName="aixia-dash-panel-body aixia-tools-hub-hermes-panel-body"
        >
          <p className="aixia-tools-hub-hermes-memory-intro">{config.intro}</p>
          <FoundationStatusGrid items={config.moduleStatus} />
        </AixiaSection>

        <AixiaSection
          surface="command"
          title={`What ${config.title} helps with`}
          description="Planned evidence support — execution blocked in v1."
          icon={Search}
          bodyClassName="aixia-dash-panel-body aixia-tools-hub-hermes-panel-body"
        >
          <FoundationTopicGrid title={config.helpsWithTitle} items={config.helpsWith} />
        </AixiaSection>

        <AixiaSection
          surface="command"
          title="Current safe source"
          description="Honest runtime/source status — verified from repo audit."
          icon={Shield}
          bodyClassName="aixia-dash-panel-body aixia-tools-hub-hermes-panel-body"
        >
          <FoundationTopicGrid title={config.safeSourcesTitle} items={config.safeSources} />
        </AixiaSection>

        <AixiaSection
          surface="command"
          title="Hermes integration"
          description="Future evidence enrichment for Hermes — no execution today."
          icon={Sparkles}
          bodyClassName="aixia-dash-panel-body aixia-tools-hub-hermes-panel-body"
        >
          <FoundationTopicGrid title="Hermes relationship" items={config.hermesIntegration} />
        </AixiaSection>

        <AixiaSection
          surface="command"
          title="Safety gates"
          description="Every execution path requires explicit owner approval."
          icon={Lock}
          bodyClassName="aixia-dash-panel-body aixia-tools-hub-hermes-panel-body"
        >
          <FoundationTopicGrid title="Gates" items={config.safetyGates} />
        </AixiaSection>

        <AixiaSection
          surface="command"
          title="Future activation path"
          description="Staged rollout — v1 foundation with execution blocked."
          icon={MapPin}
          bodyClassName="aixia-dash-panel-body aixia-tools-hub-hermes-panel-body"
        >
          <FoundationStagePath stages={config.futurePath} />
        </AixiaSection>

        <AixiaInfoBlock tone="gold" icon={Shield} title="Safety boundaries">
          {config.safetyBanner}
        </AixiaInfoBlock>

        <div className="aixia-tools-hub-hermes-foundation-layer-actions">
          <AixiaButton variant="secondary" onClick={() => navigate(EVIDENCE_PATH)}>
            Back to Evidence Tools
          </AixiaButton>
          <AixiaButton variant="primary" onClick={() => navigate(HERMES_PATH)}>
            Open Hermes
          </AixiaButton>
        </div>
      </div>
    </ToolsHubShell>
  );
}

const HUB_CARDS = [
  {
    id: "et-browser-qa",
    title: "Browser QA",
    description:
      "Browser QA evidence foundation for route checks, screenshots, and safe workflow specs. Website-triggered execution is blocked.",
    icon: Monitor,
    summary: "Local scripts / execution blocked",
    runtime: "Local scripts / execution blocked",
    path: BROWSER_QA_PATH,
  },
  {
    id: "et-playwright",
    title: "Playwright",
    description:
      "Playwright automation foundation for future browser testing and evidence capture. No test runner is executed from this page.",
    icon: Wrench,
    summary: "Local dev dependency / execution blocked",
    runtime: "Local dev dependency / execution blocked",
    path: PLAYWRIGHT_PATH,
  },
  {
    id: "et-reports",
    title: "reports",
    description:
      "Report artifact foundation for QA, orchestration, and verification outputs used by Hermes and agents.",
    icon: FileText,
    summary: "Local report artifacts / read-only",
    runtime: "Local report artifacts / read-only",
    path: REPORTS_PATH,
  },
  {
    id: "et-guardrails",
    title: "guardrails",
    description:
      "Guardrail evidence foundation for design, build, and source-of-truth rule checks. Website-triggered guardrail execution is blocked.",
    icon: Shield,
    summary: "Build-time guardrails / execution blocked",
    runtime: "Build-time guardrails / execution blocked",
    path: GUARDRAILS_PATH,
  },
  {
    id: "et-verification-results",
    title: "verification results",
    description:
      "Verification evidence foundation for fixed issue checks, QA outcomes, and proof records.",
    icon: CheckCircle2,
    summary: "Verification records / read-only",
    runtime: "Verification records / read-only",
    path: VERIFICATION_RESULTS_PATH,
  },
] as const;

export function ToolsHubEvidenceToolsPage() {
  const navigate = useNavigate();
  const categoryPath = getToolRegistryCategoryRoute(AGENT_BRAIN_CATEGORY_ID);

  return (
    <ToolsHubShell
      title="Evidence Tools"
      subtitle="Browser QA artifacts, guardrails, reports, and verification outcomes for Hermes and agents. All tools are foundation-active evidence sources — execution blocked from the website."
      parentLabel="Agent Brain & Memory"
      parentPath={categoryPath}
      badges={[
        { label: "5 tools · foundation active", tone: "emerald" },
        { label: "Evidence context only", tone: "cyan" },
        { label: "Execution blocked", tone: "rose" },
        { label: "Production off", tone: "neutral" },
      ]}
    >
      <AixiaSection
        surface="command"
        className="aixia-non-cropping-grid-section"
        title="Evidence tools"
        description="5 tools · Browser QA & Playwright execution blocked · reports & verification read-only · guardrails build-time only · Hermes evidence context only"
        icon={Shield}
        bodyClassName="aixia-dash-panel-body aixia-tools-hub-hermes-panel-body"
      >
        <AixiaNavigationGrid className="aixia-tools-hub-level3-grid">
          {HUB_CARDS.map((card) => (
            <div key={card.id} className="aixia-tools-hub-level3-cell" data-tool-id={card.id}>
              <AixiaNavigationCard
                className="aixia-tools-hub-level3-card"
                eyebrow="Tool"
                title={card.title}
                description={card.description}
                icon={card.icon}
                tone="emerald"
                statusLabel="Foundation active"
                actionLabel="Open"
                summary={card.summary}
                meta={[{ label: "Runtime", value: card.runtime }]}
                onClick={() => navigate(card.path)}
              />
            </div>
          ))}
        </AixiaNavigationGrid>
      </AixiaSection>
    </ToolsHubShell>
  );
}

const BROWSER_QA_CONFIG: EvidenceToolFoundationConfig = {
  testId: "browser-qa-foundation",
  title: "Browser QA",
  subtitle: "Foundation active — local Browser QA scripts documented; website execution blocked.",
  sectionIcon: Monitor,
  badges: [
    { label: "Foundation active", tone: "emerald" },
    { label: "Local scripts", tone: "neutral" },
    { label: "Execution blocked", tone: "rose" },
    { label: "Evidence only", tone: "cyan" },
    { label: "Production off", tone: "neutral" },
  ],
  intro:
    "Browser QA provides route checks, screenshots, and workflow evidence via local qa-agent scripts. This foundation page documents safe paths only — the AiXia website does not trigger browser runs.",
  moduleStatus: [
    { label: "Foundation", value: "Active", tone: "emerald" },
    { label: "Runtime", value: "Local scripts", tone: "neutral" },
    { label: "Website execution", value: "Blocked", tone: "rose" },
    { label: "Hermes access", value: "Evidence context only", tone: "cyan" },
    { label: "Production", value: "Off", tone: "rose" },
  ],
  helpsWithTitle: "Evidence capabilities",
  helpsWith: [
    "Route loading checks",
    "Screenshot evidence",
    "Responsive checks",
    "Visual regression clues",
    "Workflow verification",
    "Issue evidence",
    "Fix verification",
    "Hermes evidence context",
  ],
  safeSourcesTitle: "Verified sources",
  safeSources: [
    "qa-agent/scripts/agentops-browser-qa-runner.mjs — npm run qa:agentops-browser-foundation",
    "qa-agent/scripts/import-agentops-browser-findings.mjs",
    "qa-agent/browser-qa/ — specs, scope JSON, safe-workflow-rules.md",
    "qa-agent/browser-qa/tests/*.spec.mjs — AgentOps smoke specs",
    "qa-agent/reports/browser-qa/ — output path when runs are owner-triggered locally",
    "Local-only execution — not callable from this website page",
  ],
  hermesIntegration: [
    "Hermes can read Browser QA evidence later",
    "Hermes cannot run Browser QA today",
    "Stage C safe-read only",
    "Future Stage D may show evidence summaries",
    "No website-triggered browser execution",
  ],
  safetyGates: [
    "No browser runner execution from website",
    "No production run",
    "No external browsing without approval",
    "No memory or SOT write",
    "No automatic verification",
    "Owner approval required for future runs",
  ],
  futurePath: [
    "v1 — foundation active / local scripts documented",
    "v2 — read-only evidence summaries",
    "v3 — owner-approved local QA run",
    "v4 — Hermes evidence injection",
    "v5 — controlled cloud/hybrid runner later",
  ],
  safetyBanner:
    "Browser QA is foundation-active only. No browser runner execution from the website, no production runs, and no automatic verification.",
};

const PLAYWRIGHT_CONFIG: EvidenceToolFoundationConfig = {
  testId: "playwright-foundation",
  title: "Playwright",
  subtitle: "Foundation active — local Playwright config documented; website test execution blocked.",
  sectionIcon: Wrench,
  badges: [
    { label: "Foundation active", tone: "emerald" },
    { label: "Local dependency", tone: "neutral" },
    { label: "Execution blocked", tone: "rose" },
    { label: "Evidence only", tone: "cyan" },
    { label: "Production off", tone: "neutral" },
  ],
  intro:
    "Playwright supports browser automation smokes under qa-agent/browser-qa. This foundation page documents config and npm scripts only — no test runner is executed from the AiXia website.",
  moduleStatus: [
    { label: "Foundation", value: "Active", tone: "emerald" },
    { label: "Runtime", value: "Local dev dependency/config", tone: "neutral" },
    { label: "Website execution", value: "Blocked", tone: "rose" },
    { label: "Hermes access", value: "Evidence context only", tone: "cyan" },
    { label: "Production", value: "Off", tone: "rose" },
  ],
  helpsWithTitle: "Automation capabilities",
  helpsWith: [
    "Browser automation",
    "Smoke tests",
    "Route checks",
    "Screenshots",
    "Responsive viewport tests",
    "Interaction checks",
    "Future verification runner",
  ],
  safeSourcesTitle: "Verified sources",
  safeSources: [
    "qa-agent/browser-qa/playwright.config.mjs",
    "@playwright/test in package.json (devDependency)",
    "npm run qa:agentops-browser-smoke — local owner-triggered only",
    "qa-agent/browser-qa/tests/*.spec.mjs — smoke spec inventory",
    "qa-agent/reports/browser-qa/ — artifact path when runs complete locally",
    "No website-triggered Playwright execution",
  ],
  hermesIntegration: [
    "Future evidence provider for Hermes",
    "No runtime execution today",
    "No automatic Playwright run",
    "No writes to memory or source-of-truth",
  ],
  safetyGates: [
    "Owner approval required",
    "No website-triggered test run",
    "No production browser automation",
    "No SOT writes",
    "No memory writes",
  ],
  futurePath: [
    "v1 — foundation active / local config documented",
    "v2 — read-only test inventory",
    "v3 — owner-approved local test run",
    "v4 — evidence summaries into Hermes",
    "v5 — controlled cloud runner later",
  ],
  safetyBanner:
    "Playwright is foundation-active only. No test runner execution from the website and no production browser automation.",
};

const REPORTS_CONFIG: EvidenceToolFoundationConfig = {
  testId: "reports-foundation",
  title: "reports",
  subtitle: "Foundation active — local report artifact paths documented; read-only from website.",
  sectionIcon: FileText,
  badges: [
    { label: "Foundation active", tone: "emerald" },
    { label: "Local artifacts", tone: "neutral" },
    { label: "Read-only", tone: "cyan" },
    { label: "Evidence context", tone: "amber" },
    { label: "Production off", tone: "neutral" },
  ],
  intro:
    "Report artifacts capture QA, orchestration, verification, and guardrail outputs for agents and Hermes. This foundation page indexes paths only — no report generation from the website.",
  moduleStatus: [
    { label: "Foundation", value: "Active", tone: "emerald" },
    { label: "Runtime", value: "Local files", tone: "neutral" },
    { label: "Writes", value: "Blocked from website", tone: "rose" },
    { label: "Hermes access", value: "Evidence context only", tone: "cyan" },
    { label: "Production", value: "Off", tone: "rose" },
  ],
  helpsWithTitle: "Report evidence",
  helpsWith: [
    "QA evidence",
    "Issue summaries",
    "Fix verification",
    "Build outcomes",
    "Guardrail findings",
    "Browser QA outputs",
    "Audit history",
  ],
  safeSourcesTitle: "Verified sources",
  safeSources: [
    "qa-agent/reports/ — root report artifact folder",
    "qa-agent/reports/browser-qa/ — Browser QA outputs",
    "qa-agent/reports/verification/ — verification foundation paths referenced in AgentOps history",
    "qa-agent/agentops/*.md — phase and stage QA reports (read-only reference)",
    "Gitignored/generated outputs — not produced from this website page",
    "Read-only local artifacts when present",
  ],
  hermesIntegration: [
    "Future report summaries for Hermes",
    "No automatic ingestion today",
    "No memory or SOT writes",
  ],
  safetyGates: [
    "No report generation from website",
    "No automatic report ingestion",
    "No memory writes",
    "No SOT writes",
    "Owner approval required",
  ],
  futurePath: [
    "v1 — foundation active / local artifacts documented",
    "v2 — read-only report index",
    "v3 — owner-approved report import",
    "v4 — Hermes report context",
    "v5 — scheduled report refresh later",
  ],
  safetyBanner:
    "reports is foundation-active only. No report generation from the website and no automatic ingestion.",
};

const GUARDRAILS_CONFIG: EvidenceToolFoundationConfig = {
  testId: "guardrails-foundation",
  title: "guardrails",
  subtitle: "Foundation active — build-time guardrail scripts documented; website execution blocked.",
  sectionIcon: Shield,
  badges: [
    { label: "Foundation active", tone: "emerald" },
    { label: "Build-time checks", tone: "neutral" },
    { label: "Execution blocked", tone: "rose" },
    { label: "Evidence context", tone: "cyan" },
    { label: "Production off", tone: "neutral" },
  ],
  intro:
    "Guardrails enforce design, table/list, shell, and source-of-truth checks during local build and QA scripts. This foundation page documents scripts only — guardrails are not executed from the website UI.",
  moduleStatus: [
    { label: "Foundation", value: "Active", tone: "emerald" },
    { label: "Runtime", value: "Build-time / local script", tone: "neutral" },
    { label: "Website execution", value: "Blocked", tone: "rose" },
    { label: "Hermes access", value: "Evidence context only", tone: "cyan" },
    { label: "Production", value: "Off", tone: "rose" },
  ],
  helpsWithTitle: "Guardrail evidence",
  helpsWith: [
    "Design rules",
    "Source-of-truth checks",
    "Banned UI imports",
    "Finance/page guardrails",
    "Route/layout warnings",
    "Build warning evidence",
    "Fix validation support",
    "Hermes evidence context",
  ],
  safeSourcesTitle: "Verified sources",
  safeSources: [
    "scripts/aixia-guardrails.mjs — runs before npm run build",
    "scripts/guardrails/*.mjs — modular guardrail checks",
    "npm run qa:static-design-guardrails — qa-agent/scripts/static-design-guardrails.mjs",
    "npm run qa:guardrail-action-plan — generate-guardrail-action-plan.mjs",
    "src/design-system/aixia-global/15-guardrail-rules.md — policy reference",
    "Build gate only — not triggered from AgentOps website pages",
  ],
  hermesIntegration: [
    "Hermes can use guardrail evidence later",
    "Hermes cannot run guardrails from website today",
    "No automatic SOT enforcement",
    "No code changes from this page",
    "No website-triggered guardrail execution",
  ],
  safetyGates: [
    "No website-triggered guardrail execution",
    "No production run from website",
    "No SOT writes",
    "No automatic fix",
    "No code modification from this page",
    "Owner approval required",
  ],
  futurePath: [
    "v1 — foundation active / script documented",
    "v2 — read-only guardrail summaries",
    "v3 — owner-approved validation run",
    "v4 — Hermes guardrail context",
    "v5 — automated validation queue later",
  ],
  safetyBanner:
    "guardrails is foundation-active only. No guardrail execution from the website and no automatic SOT enforcement.",
};

const VERIFICATION_RESULTS_CONFIG: EvidenceToolFoundationConfig = {
  testId: "verification-results-foundation",
  title: "verification results",
  subtitle: "Foundation active — verification records documented; writes blocked from this page.",
  sectionIcon: CheckCircle2,
  badges: [
    { label: "Foundation active", tone: "emerald" },
    { label: "Verification records", tone: "neutral" },
    { label: "Read-only", tone: "cyan" },
    { label: "Evidence context", tone: "amber" },
    { label: "Production off", tone: "neutral" },
  ],
  intro:
    "Verification results capture fixed-issue proof, QA acceptance, and owner signoff records. This foundation page documents read paths only — no verification writes or issue status changes from the Tools Hub.",
  moduleStatus: [
    { label: "Foundation", value: "Active", tone: "emerald" },
    { label: "Runtime", value: "Verification records", tone: "neutral" },
    { label: "Writes", value: "Blocked from this page", tone: "rose" },
    { label: "Hermes access", value: "Evidence context only", tone: "cyan" },
    { label: "Production", value: "Off", tone: "rose" },
  ],
  helpsWithTitle: "Verification evidence",
  helpsWith: [
    "Fixed issue proof",
    "QA acceptance",
    "Manual signoff records",
    "Script-recorded outcomes",
    "Before/after checks",
    "Future issue lifecycle confidence",
  ],
  safeSourcesTitle: "Verified sources",
  safeSources: [
    "Supabase agentops_verifications table — verification records",
    "src/lib/agentops/service.ts — getAgentOpsVerificationRequests and related read paths",
    "qa-agent/scripts/agentops-verification-runner.mjs — npm run qa:agentops-verify (local only)",
    "qa-agent/verification/verification-targets.json",
    "AgentOps History / Issues UI — read-only verification request display elsewhere",
    "No verification write or issue status mutation from this Tools Hub page",
  ],
  hermesIntegration: [
    "Hermes can use verification evidence later",
    "No automatic issue closure",
    "No status mutation from this page",
    "No memory or SOT write",
  ],
  safetyGates: [
    "No issue status mutation from this page",
    "No automatic fixed marking",
    "No verification write from Tools Hub",
    "No production action",
    "Owner approval required",
  ],
  futurePath: [
    "v1 — foundation active / records documented",
    "v2 — read-only verification index",
    "v3 — owner-approved verification request",
    "v4 — Hermes verification context",
    "v5 — controlled lifecycle automation later",
  ],
  safetyBanner:
    "verification results is foundation-active only. No verification writes, issue status changes, or production actions from this page.",
};

export function ToolsHubBrowserQaFoundationPage() {
  return <EvidenceToolFoundationPage config={BROWSER_QA_CONFIG} />;
}

export function ToolsHubPlaywrightFoundationPage() {
  return <EvidenceToolFoundationPage config={PLAYWRIGHT_CONFIG} />;
}

export function ToolsHubReportsFoundationPage() {
  return <EvidenceToolFoundationPage config={REPORTS_CONFIG} />;
}

export function ToolsHubGuardrailsFoundationPage() {
  return <EvidenceToolFoundationPage config={GUARDRAILS_CONFIG} />;
}

export function ToolsHubVerificationResultsFoundationPage() {
  return <EvidenceToolFoundationPage config={VERIFICATION_RESULTS_CONFIG} />;
}
