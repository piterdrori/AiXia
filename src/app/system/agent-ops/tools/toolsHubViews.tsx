import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Cloud,
  Code2,
  GitBranch,
  Layers,
  MessageSquare,
  Palette,
  Search,
  Server,
  Wrench,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  AixiaCommandPageLayout,
  AixiaHero,
  AixiaInfoBlock,
  AixiaNavigationCard,
  AixiaNavigationGrid,
  AixiaSection,
} from "@/components/aixia";

type AixiaNavigationTone = NonNullable<ComponentProps<typeof AixiaNavigationCard>["tone"]>;

import {
  TOOLS_HUB_BASE_PATH,
  categoryHasNestedLevel3,
  formatToolRegistryStatus,
  getToolRegistryCategoryHubGroups,
  getToolRegistryCategoryRoute,
  getToolRegistryChildren,
  getToolRegistryEntry,
  getToolRegistryGroupRoute,
  getToolRegistryMainCategories,
  resolveLevel3DetailRoute,
  summarizeChildStatuses,
  type ToolRegistryEntry,
  type ToolRegistryNodeType,
  type ToolRegistryStatus,
} from "@/lib/agentops/tools/toolRegistry";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "agent-brain-memory": Brain,
  "chat-voice": MessageSquare,
  "website-qa-evidence": Search,
  "build-development": Code2,
  "design-crew-references": Palette,
  "automation-integrations": Zap,
  "runtime-platform": Server,
};

const CATEGORY_TONES: Record<string, AixiaNavigationTone> = {
  "agent-brain-memory": "violet",
  "chat-voice": "cyan",
  "website-qa-evidence": "amber",
  "build-development": "indigo",
  "design-crew-references": "gold",
  "automation-integrations": "rose",
  "runtime-platform": "emerald",
};

const GROUP_ICONS: Record<string, LucideIcon> = {
  "global-memory": Layers,
  "per-agent-memory": Brain,
  "memory-coordination-tools": Cloud,
  "code-context-understanding": Code2,
  "evidence-tools": Search,
  "reasoning-layer": GitBranch,
};

function statusTone(status: ToolRegistryStatus): AixiaNavigationTone {
  if (status === "existing") return "emerald";
  if (status === "partial" || status === "cloned-only") return "amber";
  if (status === "needs-setup") return "cyan";
  if (status === "planned" || status === "target-only" || status === "not-installed") {
    return "neutral";
  }
  return "neutral";
}

function resolveCategoryIcon(categoryId: string): LucideIcon {
  return CATEGORY_ICONS[categoryId] ?? Wrench;
}

function resolveGroupIcon(groupId: string, categoryId: string): LucideIcon {
  return GROUP_ICONS[groupId] ?? resolveCategoryIcon(categoryId);
}

function resolveLevel3Icon(
  item: ToolRegistryEntry,
  categoryId: string,
  groupId: string,
): LucideIcon {
  if (item.type === "memory-area") return Layers;
  if (item.type === "tool") return Wrench;
  return resolveGroupIcon(groupId, categoryId);
}

function formatLevel3Eyebrow(type: ToolRegistryNodeType): string {
  if (type === "memory-area") return "Memory area";
  if (type === "tool") return "Tool";
  if (type === "runtime-service") return "Runtime service";
  if (type === "reference") return "Reference";
  return "Registry item";
}

function level3ActionLabel(status: ToolRegistryStatus): string {
  if (
    status === "existing" ||
    status === "partial" ||
    status === "cloned-only" ||
    status === "needs-setup"
  ) {
    return "Open";
  }
  return "Planned";
}

function level3CardMeta(item: ToolRegistryEntry) {
  const meta: { label: string; value: string; description?: string }[] = [
    {
      label: "Data location",
      value: item.dataLocation || "—",
    },
    {
      label: "Runtime",
      value: item.currentRuntime,
    },
  ];

  const sourceNote = item.sourcePath ?? item.sourceUrl;
  if (sourceNote) {
    meta.push({
      label: "Source",
      value:
        sourceNote.length > 52
          ? `${sourceNote.slice(0, 24)}…${sourceNote.slice(-24)}`
          : sourceNote,
      description: sourceNote,
    });
  } else if (item.notes) {
    meta.push({
      label: "Note",
      value: item.notes,
    });
  }

  return meta;
}

type ToolsHubLevel3GridProps = {
  items: ToolRegistryEntry[];
  categoryId: string;
  groupId: string;
};

function ToolsHubLevel3Grid({ items, categoryId, groupId }: ToolsHubLevel3GridProps) {
  const navigate = useNavigate();

  return (
    <AixiaNavigationGrid className="aixia-tools-hub-level3-grid">
      {items.map((item) => {
        const detailRoute = resolveLevel3DetailRoute(item, categoryId, groupId);

        return (
          <div key={item.id} className="aixia-tools-hub-level3-cell" data-tool-id={item.id}>
            <AixiaNavigationCard
              className="aixia-tools-hub-level3-card"
              eyebrow={formatLevel3Eyebrow(item.type)}
              title={item.title}
              description={item.description}
              icon={resolveLevel3Icon(item, categoryId, groupId)}
              tone={statusTone(item.status)}
              statusLabel={formatToolRegistryStatus(item.status)}
              actionLabel={detailRoute ? "Open" : level3ActionLabel(item.status)}
              summary={item.dataLocation || item.currentRuntime}
              meta={level3CardMeta(item)}
              disabled={!detailRoute}
              onClick={detailRoute ? () => navigate(detailRoute) : undefined}
            />
          </div>
        );
      })}
    </AixiaNavigationGrid>
  );
}

type AixiaHeroShellProps = Pick<
  ComponentProps<typeof AixiaHero>,
  "badges" | "statusCards" | "description"
>;

type ToolsHubShellProps = {
  title: string;
  subtitle: string;
  parentLabel: string;
  parentPath: string;
  children: ReactNode;
  infoTitle?: string;
  infoDescription?: string;
  showRegistryNote?: boolean;
} & AixiaHeroShellProps;

export function ToolsHubShell({
  title,
  subtitle,
  parentLabel,
  parentPath,
  children,
  infoTitle,
  infoDescription,
  showRegistryNote = false,
  badges,
  statusCards,
  description,
}: ToolsHubShellProps) {
  return (
    <AixiaCommandPageLayout
      hero={
        <AixiaHero
          surface="command"
          className="shrink-0 space-y-4"
          gradientTitle="AgentOps"
          title={title}
          subtitle={subtitle}
          description={description}
          parentLabel={parentLabel}
          parentPath={parentPath}
          badges={badges}
          statusCards={statusCards}
        />
      }
    >
      {showRegistryNote && infoTitle ? (
        <AixiaSection surface="command" title="Registry note" description={infoDescription} icon={Wrench}>
          <AixiaInfoBlock tone="cyan" icon={Wrench} title={infoTitle}>
            Cards and statuses are driven by{" "}
            <code className="text-xs">src/lib/agentops/tools/toolRegistry.ts</code>. No live tool
            connections, enable/disable actions, or API keys in this phase.
          </AixiaInfoBlock>
        </AixiaSection>
      ) : null}
      {children}
    </AixiaCommandPageLayout>
  );
}

export function ToolsHubMainPage() {
  const navigate = useNavigate();
  const categories = getToolRegistryMainCategories();

  return (
    <ToolsHubShell
      title="Tools Hub"
      subtitle="Registry-driven map of AgentOps tools, memory, QA, build, design, and platform surfaces."
      parentLabel="Control Center"
      parentPath="/system/agent-ops"
      showRegistryNote
      infoTitle="Phase 1 — structure only"
      infoDescription="Seven main categories. Honest statuses from audits. Individual tool programming pages are not built yet."
    >
      <AixiaSection
        surface="command"
        title="Main categories"
        description="Exactly seven tool families. Open a category to see child cards."
        icon={Wrench}
        bodyClassName="aixia-dash-panel-body"
      >
        <AixiaNavigationGrid className="aixia-tools-hub-main-grid">
          {categories.map((category) => (
            <AixiaNavigationCard
              key={category.id}
              title={category.title}
              description={category.description}
              icon={resolveCategoryIcon(category.id)}
              tone={CATEGORY_TONES[category.id] ?? "indigo"}
              statusLabel={formatToolRegistryStatus(category.status)}
              actionLabel="Open"
              meta={[
                {
                  label: "Groups",
                  value: String(category.childrenIds.length),
                },
                {
                  label: "Status mix",
                  value: summarizeChildStatuses(category.childrenIds),
                },
              ]}
              onClick={() => navigate(getToolRegistryCategoryRoute(category.id))}
            />
          ))}
        </AixiaNavigationGrid>
      </AixiaSection>
    </ToolsHubShell>
  );
}

export function ToolsHubCategoryPage({ categoryId }: { categoryId: string }) {
  const navigate = useNavigate();
  const category = getToolRegistryEntry(categoryId);

  if (!category || category.level !== 1) {
    return (
      <ToolsHubShell
        title="Category not found"
        subtitle="This category is not in the Tools Hub registry."
        parentLabel="Tools Hub"
        parentPath={TOOLS_HUB_BASE_PATH}
      >
        <AixiaInfoBlock tone="rose" icon={Wrench} title="Unknown category">
          No registry entry for <code>{categoryId}</code>.
        </AixiaInfoBlock>
      </ToolsHubShell>
    );
  }

  const hubGroups = getToolRegistryCategoryHubGroups(categoryId);
  const showNestedOnPage = categoryHasNestedLevel3(categoryId);
  const hubDescription = showNestedOnPage
    ? categoryId === "agent-brain-memory"
      ? `${hubGroups.length} operational groups · Global and per-agent memory foundations live inside Hermes · ${formatToolRegistryStatus(category.status)}`
      : `${hubGroups.length} groups · open a card for Level 3 items · ${formatToolRegistryStatus(category.status)}`
    : `${hubGroups.length} child tools · ${formatToolRegistryStatus(category.status)} · detail pages planned later`;

  return (
    <ToolsHubShell
      title={category.title}
      subtitle={category.description}
      parentLabel="Tools Hub"
      parentPath={TOOLS_HUB_BASE_PATH}
    >
      <AixiaSection
        surface="command"
        title="Category overview"
        description={hubDescription}
        icon={resolveCategoryIcon(categoryId)}
        bodyClassName="aixia-dash-panel-body"
      >
        <AixiaNavigationGrid
          className={showNestedOnPage ? "aixia-tools-hub-category-grid" : "aixia-tools-hub-tool-grid"}
        >
          {hubGroups.map((group) => {
            const nested = getToolRegistryChildren(group.id);
            const hasNested = nested.length > 0;
            const groupRoute = getToolRegistryGroupRoute(categoryId, group.id);

            const cellClassName = showNestedOnPage
              ? "aixia-tools-hub-group-cell"
              : "aixia-tools-hub-tool-cell";

            return (
              <div key={group.id} className={cellClassName} data-group-id={group.id}>
                <AixiaNavigationCard
                  title={group.title}
                  description={group.description}
                  icon={
                    showNestedOnPage
                      ? resolveGroupIcon(group.id, categoryId)
                      : resolveCategoryIcon(categoryId)
                  }
                  tone={statusTone(group.status)}
                  statusLabel={formatToolRegistryStatus(group.status)}
                  actionLabel={showNestedOnPage && hasNested ? "View group" : "Planned"}
                  meta={
                    showNestedOnPage
                      ? [
                          {
                            label: "Nested items",
                            value: String(group.childrenIds.length),
                          },
                          {
                            label: "Status mix",
                            value: summarizeChildStatuses(group.childrenIds),
                          },
                        ]
                      : [
                          {
                            label: "Installed",
                            value: group.installedStatus,
                          },
                          {
                            label: "Configured",
                            value: group.configuredStatus,
                          },
                        ]
                  }
                  onClick={
                    showNestedOnPage && hasNested
                      ? () => navigate(groupRoute)
                      : undefined
                  }
                  disabled={!showNestedOnPage || !hasNested}
                />
              </div>
            );
          })}
        </AixiaNavigationGrid>
      </AixiaSection>
    </ToolsHubShell>
  );
}

export function ToolsHubGroupPage({
  categoryId,
  groupId,
}: {
  categoryId: string;
  groupId: string;
}) {
  const category = getToolRegistryEntry(categoryId);
  const group = getToolRegistryEntry(groupId);

  if (
    !category ||
    category.level !== 1 ||
    !group ||
    group.level !== 2 ||
    group.categoryId !== categoryId
  ) {
    return (
      <ToolsHubShell
        title="Group not found"
        subtitle="This nested group is not in the Tools Hub registry."
        parentLabel="Tools Hub"
        parentPath={TOOLS_HUB_BASE_PATH}
      >
        <AixiaInfoBlock tone="rose" icon={Wrench} title="Unknown group">
          No registry entry for <code>{categoryId}/{groupId}</code>.
        </AixiaInfoBlock>
      </ToolsHubShell>
    );
  }

  const items = getToolRegistryChildren(groupId);

  return (
    <ToolsHubShell
      title={group.title}
      subtitle={group.description}
      parentLabel={category.title}
      parentPath={getToolRegistryCategoryRoute(categoryId)}
    >
      <AixiaSection
        surface="command"
        className="aixia-tools-hub-level3-section aixia-non-cropping-grid-section"
        title="Nested items"
        description={`${items.length} registry items · ${summarizeChildStatuses(group.childrenIds)} · detail programming pages not built yet`}
        icon={resolveGroupIcon(groupId, categoryId)}
        bodyClassName="aixia-dash-panel-body aixia-tools-hub-level3-body"
      >
        <ToolsHubLevel3Grid items={items} categoryId={categoryId} groupId={groupId} />
      </AixiaSection>
    </ToolsHubShell>
  );
}
