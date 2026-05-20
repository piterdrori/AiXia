import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ExternalLink,
  FolderKanban,
  RefreshCw,
  Search,
  Target,
  Users,
  X,
} from "lucide-react";

import {
  AixiaAccessRule,
  AixiaBadge,
  AixiaButton,
  AixiaEmptyState,
  AixiaHero,
  AixiaLoadingState,
  AixiaModal,
  FinancePage,
  AixiaRegistryToolbar,
  AixiaSearchField,
  AixiaSection,
  AixiaSelectField,
  AixiaSortableHeader,
  AixiaStatusBadge,
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableDateCell,
  AixiaTableShell,
  AixiaTableTextCell,
  AixiaValueBlock,
  AixiaCommandMetrics
} from "@/components/aixia";

import { supabase } from "@/lib/supabase";

type FilterStatus = "all" | "active" | "inactive" | "archived";
type SortKey = "code" | "name" | "status" | "progress" | "members" | "created_at";
type SortDirection = "asc" | "desc";

type FinanceProjectRow = {
  id: string;
  project_id: string;
  code: string;
  status: "active" | "inactive" | "archived";
  mark: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    progress: number;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
  } | null;
};

type ProjectMemberCountRow = {
  project_id: string;
  count: number;
};

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCount(value: number) {
  return value.toLocaleString();
}

function compareStrings(
  first: string | null | undefined,
  second: string | null | undefined
) {
  return (first || "").localeCompare(second || "");
}

function compareNumbers(
  first: number | null | undefined,
  second: number | null | undefined
) {
  return Number(first || 0) - Number(second || 0);
}

function compareDates(
  first: string | null | undefined,
  second: string | null | undefined
) {
  return new Date(first || 0).getTime() - new Date(second || 0).getTime();
}

function getProjectName(row: FinanceProjectRow) {
  return row.project?.name || "Unnamed Project";
}

export default function FinanceMasterDataProjectsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<FinanceProjectRow[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [selected, setSelected] = useState<FinanceProjectRow | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const loadData = useCallback(async (mode: "initial" | "silent" = "initial") => {
    if (mode === "initial") {
      setLoading(true);
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const [
        { data: projectsData, error: projectsError },
        { data: memberData, error: memberError },
      ] = await Promise.all([
        supabase
          .from("finance_project_refs")
          .select(`
            id,
            project_id,
            code,
            status,
            mark,
            notes,
            metadata,
            created_at,
            updated_at,
            project:projects (
              id,
              name,
              description,
              status,
              progress,
              start_date,
              end_date,
              created_at
            )
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("project_members")
          .select("project_id, count:id.count()")
          .order("project_id"),
      ]);

      if (projectsError) throw projectsError;
      if (memberError) {
        console.error("Project members aggregate load failed:", memberError);
      }

      const mappedCounts = (
        ((memberData || []) as unknown) as ProjectMemberCountRow[]
      ).reduce<Record<string, number>>((acc, item) => {
        acc[item.project_id] = Number(item.count || 0);
        return acc;
      }, {});

      setRows(((projectsData || []) as unknown) as FinanceProjectRow[]);
      setMemberCounts(mappedCounts);
    } catch (error) {
      console.error("Failed to load finance projects:", error);

      if (mode === "initial") {
        setRows([]);
        setMemberCounts({});
      }
    } finally {
      if (mode === "initial") {
        setLoading(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadData("initial");
  }, [loadData]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-projects-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_project_refs" },
        () => void loadData("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => void loadData("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_members" },
        () => void loadData("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadData("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadData]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!query) return true;

      const source = [
        row.code,
        row.mark,
        row.status,
        row.project?.name,
        row.project?.description,
        row.project?.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return source.includes(query);
    });
  }, [rows, search, statusFilter]);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];

    sorted.sort((first, second) => {
      let comparison = 0;

      if (sortKey === "code") {
        comparison = compareStrings(first.code, second.code);
      }

      if (sortKey === "name") {
        comparison = compareStrings(getProjectName(first), getProjectName(second));
      }

      if (sortKey === "status") {
        comparison = compareStrings(first.status, second.status);
      }

      if (sortKey === "progress") {
        comparison = compareNumbers(first.project?.progress, second.project?.progress);
      }

      if (sortKey === "members") {
        comparison = compareNumbers(
          memberCounts[first.project_id] ?? 0,
          memberCounts[second.project_id] ?? 0
        );
      }

      if (sortKey === "created_at") {
        comparison = compareDates(first.project?.created_at, second.project?.created_at);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredRows, memberCounts, sortDirection, sortKey]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((row) => row.status === "active").length,
      inactive: rows.filter((row) => row.status === "inactive").length,
      archived: rows.filter((row) => row.status === "archived").length,
    };
  }, [rows]);

  function updateSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "created_at" ? "desc" : "asc");
  }

  const __registryCommandMetrics = useMemo(
    () => [
    { key: "total-projects", title: "Total Projects", value: String(loading ? "—" : formatCount(stats.total)), subtitle: "All finance project reference records.", icon: FolderKanban, tone: "cyan", },
    { key: "active", title: "Active", value: String(loading ? "—" : formatCount(stats.active)), subtitle: "Finance project references currently active.", icon: Target, tone: "emerald", },
    { key: "inactive", title: "Inactive", value: String(loading ? "—" : formatCount(stats.inactive)), subtitle: "Inactive finance project references.", icon: Users, tone: "gold", },
    { key: "archived", title: "Archived", value: String(loading ? "—" : formatCount(stats.archived)), subtitle: "Archived finance project references.", icon: Users, tone: "rose", }
    
    ],
    [loading, stats, formatCount]
  );

  if (loading) {
    return (
      <AixiaLoadingState
        title="Loading Finance Projects"
        description="Finance project references, source projects, and project member counts are being loaded."
      />
    );
  }

return (
    <FinancePage>
      <AixiaHero
        className="shrink-0 space-y-4"
        surface="command"
        parentLabel="Master Data"
        parentPath="/finance/master-data"
        gradientTitle="Projects"
        title="Reference Registry"
        subtitle="Finance Project Reference View">
        <AixiaCommandMetrics items={__registryCommandMetrics} />
      </AixiaHero>

      <div className="aixia-command-scroll">


      <AixiaSection
        title="Project Reference Records"
        description="Search, filter, inspect, and open source project records when needed."
        icon={FolderKanban}
      >
        <AixiaRegistryToolbar
          search={
            <AixiaSearchField
              width="full"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects, codes, marks, status, or descriptions..."
            />
          }
          filters={
            <AixiaSelectField
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as FilterStatus)}
              aria-label="Project status filter"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </AixiaSelectField>
          }
          secondaryActions={
            <AixiaButton
              type="button"
              variant="secondary"
              onClick={() => void loadData("silent")}
              disabled={backgroundRefreshing}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </AixiaButton>
          }
        />

        {sortedRows.length === 0 ? (
          <AixiaEmptyState
            icon={Search}
            title="No finance project references found"
            description="Adjust search or status filters to find finance project reference records."
          />
        ) : (
          <AixiaTableShell
            variant="registry"
            minWidthClassName="min-w-[1240px]"
            maxHeightClassName="max-h-[720px]"
          >
            <thead className="aixia-table-head">
              <tr>
                <th>
                  <AixiaSortableHeader
                    label="Project"
                    sortKey="name"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={updateSort}
                    align="left"
                  />
                </th>
                <th>
                  <AixiaSortableHeader
                    label="Code"
                    sortKey="code"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={updateSort}
                  />
                </th>
                <th>
                  <AixiaSortableHeader
                    label="Status"
                    sortKey="status"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={updateSort}
                  />
                </th>
                <th>
                  <AixiaSortableHeader
                    label="Progress"
                    sortKey="progress"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={updateSort}
                  />
                </th>
                <th>
                  <AixiaSortableHeader
                    label="Members"
                    sortKey="members"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={updateSort}
                  />
                </th>
                <th>
                  <AixiaSortableHeader
                    label="Created"
                    sortKey="created_at"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={updateSort}
                  />
                </th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.id} className="aixia-table-row">
                  <AixiaTableTextCell
                    width="xl"
                    primary={getProjectName(row)}
                    secondary={row.project?.description || "Finance project reference"}
                  />

                  <AixiaTableTextCell
                    width="md"
                    primary={row.code}
                    secondary={row.mark || "No mark"}
                  />

                  <AixiaTableBadgeCell width="sm">
                    <AixiaStatusBadge value={row.status} />
                    {row.project?.status ? (
                      <div className="aixia-table-secondary-text">
                        Source: {row.project.status}
                      </div>
                    ) : null}
                  </AixiaTableBadgeCell>

                  <AixiaTableTextCell
                    width="sm"
                    primary={`${row.project?.progress ?? 0}%`}
                    secondary="Source progress"
                  />

                  <AixiaTableTextCell
                    width="sm"
                    primary={formatCount(memberCounts[row.project_id] ?? 0)}
                    secondary="Project members"
                  />

                  <AixiaTableDateCell width="sm">
                    {formatDateLabel(row.project?.created_at)}
                  </AixiaTableDateCell>

                  <AixiaTableActionsCell>
                    <AixiaButton
                      type="button"
                      variant="primary"
                      onClick={() => setSelected(row)}
                    >
                      Inspect
                    </AixiaButton>

                    <AixiaButton
                      type="button"
                      variant="secondary"
                      onClick={() => navigate(`/projects/${row.project_id}`)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Source
                    </AixiaButton>
                  </AixiaTableActionsCell>
                </tr>
              ))}
            </tbody>
          </AixiaTableShell>
        )}
      </AixiaSection>

      <AixiaAccessRule
        title="Locked access rule"
        description="Finance registry pages must show the shared Locked access rule block."
      >
        This page is a finance reference registry for operational projects. It must use shared
        AiXia page, hero, metric, section, toolbar, table, modal, and button components only.
        Source project editing stays in the operational project record.
      </AixiaAccessRule>

      <AixiaModal
        open={Boolean(selected)}
        title={selected?.project?.name || "Unnamed Project"}
        description={selected?.code || "Finance project reference"}
        badge={
          selected ? (
            <>
              <AixiaStatusBadge value={selected.status} />
              {selected.mark ? <AixiaBadge tone="cyan">{selected.mark}</AixiaBadge> : null}
            </>
          ) : null
        }
        onClose={() => setSelected(null)}
        maxWidthClassName="max-w-4xl"
        footer={
          selected ? (
            <>
              <AixiaButton
                type="button"
                variant="secondary"
                onClick={() => setSelected(null)}
              >
                <X className="h-4 w-4" />
                Close
              </AixiaButton>

              <AixiaButton
                type="button"
                variant="primary"
                onClick={() => navigate(`/projects/${selected.project_id}`)}
              >
                <ExternalLink className="h-4 w-4" />
                Open Source Record
              </AixiaButton>
            </>
          ) : null
        }
      >
        {selected ? (
          <div className="aixia-stack">
            <div className="aixia-smart-grid" data-mode="cards">
              <AixiaValueBlock
                label="Finance Status"
                value={<AixiaStatusBadge value={selected.status} />}
                detail="Finance project reference lifecycle status."
              />

              <AixiaValueBlock
                label="Finance Mark"
                value={selected.mark || "—"}
                detail="Finance mark or internal project classification."
              />

              <AixiaValueBlock
                label="Source Status"
                value={selected.project?.status || "—"}
                detail="Operational project status."
              />

              <AixiaValueBlock
                label="Progress"
                value={`${selected.project?.progress ?? 0}%`}
                detail="Progress from the source project."
              />

              <AixiaValueBlock
                label="Members"
                value={formatCount(memberCounts[selected.project_id] ?? 0)}
                detail="Project member count."
              />

              <AixiaValueBlock
                label="Created"
                value={formatDateLabel(selected.project?.created_at)}
                detail="Source project creation date."
              />

              <AixiaValueBlock
                label="Start Date"
                value={formatDateLabel(selected.project?.start_date)}
                detail="Source project start date."
              />

              <AixiaValueBlock
                label="End Date"
                value={formatDateLabel(selected.project?.end_date)}
                detail="Source project end date."
              />
            </div>

            <AixiaValueBlock
              label="Description"
              value={selected.project?.description || "—"}
              detail="Source project description."
            />

            <AixiaValueBlock
              label="Notes"
              value={selected.notes || "—"}
              detail="Finance reference notes."
            />
          </div>
        ) : null}
      </AixiaModal>
      </div>
    </FinancePage>
  );
}
