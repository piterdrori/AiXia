import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Palette,
  Shield,
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

import {
  DESIGN_CREW_HUB_PATH,
  getDesignCrewHubCards,
  getDesignCrewMemoryMetadata,
  getDesignCrewToolPageConfig,
  type DesignCrewMemoryMetadata,
  type DesignCrewStatusItem,
  type DesignCrewToolPageConfig,
  type DesignCrewToolRegistryId,
} from "@/lib/agentops/designCrewReferencesService";
import { TOOLS_HUB_BASE_PATH } from "@/lib/agentops/tools/toolRegistry";

import { ToolsHubShell } from "./toolsHubViews";

function StatusGrid({ items }: { items: DesignCrewStatusItem[] }) {
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

function TopicList({ title, items }: { title: string; items: string[] }) {
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

function buildMemoryMetadataItems(metadata: DesignCrewMemoryMetadata): string[] {
  const base = [
    "Memory status: Metadata ready",
    "Connection mode: Metadata only",
    "Live memory connection: Not connected yet",
    "Supabase writes: No",
    "AgentMemory writes: No",
    "Runtime import: Forbidden",
  ];

  if (metadata.type === "external_design_reference") {
    return [
      ...base,
      "Works when local is off: Metadata only",
      "Deep repo inspection: Requires local clone or future approved snapshot",
      "GitHub/Vercel availability: No — local sibling clone only",
    ];
  }

  if (metadata.toolId === "design-aixia-global-sot") {
    return [
      ...base,
      "Related memory tool: gm-design-sot",
      "Authority: final design law",
      "Memory cannot override source-of-truth files",
    ];
  }

  if (metadata.toolId === "design-visual-qa-rules") {
    return [
      ...base,
      "Related execution surface: Evidence Tools / Guardrails",
      "Execution: owner-triggered elsewhere",
    ];
  }

  return base;
}

function DesignCrewMemoryMetadataSection({ registryId }: { registryId: DesignCrewToolRegistryId }) {
  const metadata = getDesignCrewMemoryMetadata(registryId);
  const items = buildMemoryMetadataItems(metadata);

  return (
    <AixiaSection
      surface="command"
      title="Memory Hub metadata"
      description="Read-only readiness preview — no sync, no writes, no live recall"
      icon={BookOpen}
      bodyClassName="aixia-dash-panel-body aixia-tools-hub-hermes-panel-body"
      data-testid="design-crew-memory-metadata"
    >
      <TopicList title="Memory readiness" items={items} />
    </AixiaSection>
  );
}

function DesignCrewToolPage({ config }: { config: DesignCrewToolPageConfig }) {
  const navigate = useNavigate();

  return (
    <ToolsHubShell
      title={config.title}
      subtitle={config.subtitle}
      parentLabel="Design Crew & References"
      parentPath={DESIGN_CREW_HUB_PATH}
      badges={[
        { label: "Read-only", tone: "cyan" },
        { label: "Reference-only", tone: "amber" },
        { label: "Local Cursor", tone: "emerald" },
        { label: "No auto-run", tone: "neutral" },
      ]}
    >
      <div
        className="aixia-tools-hub-hermes-page aixia-tools-hub-hermes-foundation-layer-page"
        data-testid={config.testId}
      >
        <AixiaSection
          surface="command"
          title="Availability"
          description="Local Cursor, GitHub/Vercel, and runtime import boundaries"
          icon={ExternalLink}
          bodyClassName="aixia-dash-panel-body aixia-tools-hub-hermes-panel-body"
        >
          <StatusGrid items={config.availability} />
        </AixiaSection>

        <DesignCrewMemoryMetadataSection registryId={config.registryId} />

        {config.extraSections?.map((section) => (
          <AixiaSection
            key={section.title}
            surface="command"
            title={section.title}
            description="Static honest status from DESIGN-1A"
            icon={BookOpen}
            bodyClassName="aixia-dash-panel-body aixia-tools-hub-hermes-panel-body"
          >
            <TopicList title={section.title} items={section.items} />
          </AixiaSection>
        ))}

        <AixiaSection
          surface="command"
          title="Safe usage"
          description="Allowed design reference workflow"
          icon={Shield}
          bodyClassName="aixia-dash-panel-body aixia-tools-hub-hermes-panel-body"
        >
          <TopicList title="Safe" items={config.safeUsage} />
          <TopicList title="Forbidden" items={config.forbidden} />
        </AixiaSection>

        {config.linkSurfaces?.length ? (
          <AixiaSection
            surface="command"
            className="aixia-non-cropping-grid-section"
            title="Related surfaces"
            description="Link only — does not duplicate other hub pages"
            icon={ExternalLink}
            bodyClassName="aixia-dash-panel-body aixia-tools-hub-hermes-panel-body"
          >
            <AixiaNavigationGrid className="aixia-tools-hub-level3-grid">
              {config.linkSurfaces.map((link) => (
                <div key={link.path} className="aixia-tools-hub-level3-cell">
                  <AixiaNavigationCard
                    className="aixia-tools-hub-level3-card"
                    eyebrow="Related"
                    title={link.label}
                    description={link.path}
                    icon={Shield}
                    tone="cyan"
                    statusLabel="Owner-triggered elsewhere"
                    actionLabel={link.navigable ? "Open" : "Path only"}
                    disabled={!link.navigable}
                    onClick={link.navigable ? () => navigate(link.path) : undefined}
                  />
                </div>
              ))}
            </AixiaNavigationGrid>
          </AixiaSection>
        ) : null}

        <AixiaInfoBlock tone="gold" icon={Shield} title="Safety boundaries">
          {config.safetyBanner}
        </AixiaInfoBlock>

        <div className="aixia-tools-hub-hermes-foundation-layer-actions">
          <AixiaButton variant="secondary" onClick={() => navigate(DESIGN_CREW_HUB_PATH)}>
            Back to Design Crew & References
          </AixiaButton>
        </div>
      </div>
    </ToolsHubShell>
  );
}

export function ToolsHubDesignCrewReferencesPage() {
  const navigate = useNavigate();
  const cards = getDesignCrewHubCards();

  return (
    <ToolsHubShell
      title="Design Crew & References"
      subtitle="Design reference repos, aixia-global law status, and visual QA rules — five active design tools."
      parentLabel="Tools Hub"
      parentPath={TOOLS_HUB_BASE_PATH}
      badges={[
        { label: "5 tools · active", tone: "emerald" },
        { label: "Reference-only", tone: "amber" },
        { label: "Local Cursor", tone: "cyan" },
        { label: "No auto-run", tone: "neutral" },
      ]}
    >
      <AixiaInfoBlock tone="gold" icon={Shield} title="Design authority">
        AiXia design law in <code>src/design-system/aixia-global/</code> is the final authority.
        External reference repos are inspiration-only. No direct import into AiXia runtime. No
        page-local design standards. Memory connection comes later — not on this hub.
      </AixiaInfoBlock>

      <AixiaSection
        surface="command"
        className="aixia-non-cropping-grid-section"
        title="Design tools"
        description="Each card opens its own read-only design tool page"
        icon={Palette}
        bodyClassName="aixia-dash-panel-body aixia-tools-hub-hermes-panel-body"
        data-testid="design-crew-references-hub"
      >
        <AixiaNavigationGrid className="aixia-tools-hub-level3-grid">
          {cards.map((card) => (
            <div key={card.id} className="aixia-tools-hub-level3-cell" data-tool-id={card.id}>
              <AixiaNavigationCard
                className="aixia-tools-hub-level3-card"
                eyebrow="Design tool"
                title={card.title}
                description={card.description}
                icon={Palette}
                tone="emerald"
                statusLabel={card.statusLabel}
                actionLabel={card.actionLabel}
                summary={card.summary}
                meta={[
                  { label: "Route", value: card.route.replace(DESIGN_CREW_HUB_PATH, "") || "/" },
                  { label: "Runtime", value: "Read-only" },
                ]}
                onClick={() => navigate(card.route)}
              />
            </div>
          ))}
        </AixiaNavigationGrid>
      </AixiaSection>
    </ToolsHubShell>
  );
}

export function ToolsHubDesignCrewToolPage({ routeSlug }: { routeSlug: string }) {
  const config = getDesignCrewToolPageConfig(routeSlug);

  if (!config) {
    return (
      <ToolsHubShell
        title="Design tool not found"
        subtitle="This design tool route is not in the Design Crew registry."
        parentLabel="Design Crew & References"
        parentPath={DESIGN_CREW_HUB_PATH}
      >
        <AixiaInfoBlock tone="rose" icon={Shield} title="Unknown tool">
          No registry entry for <code>{routeSlug}</code>.
        </AixiaInfoBlock>
      </ToolsHubShell>
    );
  }

  return <DesignCrewToolPage config={config} />;
}
