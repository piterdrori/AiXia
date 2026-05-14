import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  BadgeCheck,
  Eye,
  FileSignature,
  MoreHorizontal,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  AixiaAlert,
  AixiaArchiveManagerModal,
  AixiaBadge,
  AixiaButton,
  AixiaEmptyState,
  AixiaHero,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaPage,
  AixiaRegistryToolbar,
  AixiaSearchField,
  AixiaSection,
  AixiaSortableHeader,
  AixiaStatusBadge,
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableDateCell,
  AixiaTableShell,
  AixiaTableTextCell,
} from "@/components/aixia";
import { type FinanceLoadMode } from "@/lib/finance/pageAccess";
import { supabase } from "@/lib/supabase";

type LoadMode = FinanceLoadMode;
type SortDirection = "asc" | "desc";

type SortKey =
  | "request_number"
  | "employee"
  | "period_start"
  | "period_end"
  | "requested_net_amount"
  | "requested_currency_code"
  | "status"
  | "review_status"
  | "signed_form_status"
  | "recipient_confirmation_status"
  | "updated_at"
  | "created_at";

type ArchiveTab = "archived" | "deleted";

type EmployeeRefRow = {
  id: string;
  user_id: string;
  code: string;
  status: string;
  mark: string | null;
  metadata: Record<string, unknown> | null;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  display_name: string | null;
};

type PayProfileRow = {
  id: string;
  profile_number: string | null;
  pay_type: string;
  payment_frequency: string;
  currency_code: string;
};

type PayrollRunRow = {
  id: string;
  run_number: string | null;
  status: string;
};

type PaycheckRow = {
  id: string;
  paycheck_number: string | null;
  payment_status: string;
};

type PayrollPaymentRow = {
  id: string;
  payment_number: string | null;
  status: string;
  payment_date: string | null;
  paycheck_currency_code: string | null;
  payment_currency_code: string | null;
  paycheck_amount: number | string | null;
  payment_amount: number | string | null;
};

type PaycheckRequestRow = {
  id: string;
  request_number: string | null;
  employee_ref_id: string;
  employee_user_id: string;
  pay_profile_id: string | null;
  company_id: string | null;
  requested_bank_account_id: string | null;
  period_start: string;
  period_end: string;
  requested_pay_date: string | null;
  requested_currency_code: string;
  requested_gross_amount: number | string | null;
  requested_bonus_amount: number | string | null;
  requested_deduction_amount: number | string | null;
  requested_reimbursement_amount: number | string | null;
  requested_net_amount: number | string | null;
  status: string;
  review_status: string;
  documentation_status: string;
  signed_form_status: string;
  recipient_confirmation_status: string;
  signed_form_file_upload_id: string | null;
  signed_form_storage_bucket: string | null;
  signed_form_storage_path: string | null;
  signed_form_external_url: string | null;
  signed_form_uploaded_at: string | null;
  signed_form_submitted_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  correction_notes: string | null;
  rejected_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  linked_payroll_run_id: string | null;
  linked_paycheck_id: string | null;
  linked_payment_id: string | null;
  payment_sent_at: string | null;
  payment_confirmed_at: string | null;
  payment_disputed_at: string | null;
  confirmation_notes: string | null;
  archived_at: string | null;
  archived_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  reference_number: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  employee_ref?: EmployeeRefRow | null;
  profile?: ProfileRow | null;
  pay_profile?: PayProfileRow | null;
  payroll_run?: PayrollRunRow | null;
  paycheck?: PaycheckRow | null;
  payment?: PayrollPaymentRow | null;
};

type EnrichedPaycheckRequestRow = PaycheckRequestRow & {
  employeeLabel: string;
  employeeSubLabel: string;
  periodLabel: string;
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number | string | null | undefined) {
  return toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "—";
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getEmployeeLabel(row: PaycheckRequestRow) {
  const profileName =
    row.profile?.full_name?.trim() || row.profile?.display_name?.trim();

  if (profileName) return profileName;
  if (row.employee_ref?.code) return `Employee ${row.employee_ref.code}`;
  return "Employee";
}

function getEmployeeSubLabel(row: PaycheckRequestRow) {
  const parts = [
    row.employee_ref?.code ? `Code ${row.employee_ref.code}` : null,
    row.pay_profile?.pay_type ? formatLabel(row.pay_profile.pay_type) : null,
    row.pay_profile?.payment_frequency
      ? formatLabel(row.pay_profile.payment_frequency)
      : null,
  ].filter(Boolean);

  return parts.join(" • ") || row.employee_user_id;
}

function getPeriodLabel(row: PaycheckRequestRow) {
  return `${formatDate(row.period_start)} → ${formatDate(row.period_end)}`;
}

function getSortValue(row: EnrichedPaycheckRequestRow, sortKey: SortKey) {
  switch (sortKey) {
    case "request_number":
      return row.request_number || "";
    case "employee":
      return row.employeeLabel || "";
    case "period_start":
      return row.period_start || "";
    case "period_end":
      return row.period_end || "";
    case "requested_net_amount":
      return toNumber(row.requested_net_amount);
    case "requested_currency_code":
      return row.requested_currency_code || "";
    case "status":
      return row.status || "";
    case "review_status":
      return row.review_status || "";
    case "signed_form_status":
      return row.signed_form_status || "";
    case "recipient_confirmation_status":
      return row.recipient_confirmation_status || "";
    case "updated_at":
      return row.updated_at || "";
    case "created_at":
    default:
      return row.created_at || "";
  }
}

function sortRows(
  rows: EnrichedPaycheckRequestRow[],
  sortKey: SortKey,
  direction: SortDirection
) {
  return [...rows].sort((a, b) => {
    const aValue = getSortValue(a, sortKey);
    const bValue = getSortValue(b, sortKey);

    if (typeof aValue === "number" && typeof bValue === "number") {
      return direction === "asc" ? aValue - bValue : bValue - aValue;
    }

    const result = String(aValue).localeCompare(String(bValue), undefined, {
      numeric: true,
      sensitivity: "base",
    });

    return direction === "asc" ? result : -result;
  });
}

function PaycheckRequestTable({
  rows,
  sortKey,
  sortDirection,
  onSort,
  onOpen,
  onArchive,
  onDelete,
  archiveMode = false,
  archiveTab = "archived",
  onRestore,
  onHardDelete,
}: {
  rows: EnrichedPaycheckRequestRow[];
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  onOpen: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  archiveMode?: boolean;
  archiveTab?: ArchiveTab;
  onRestore?: (id: string) => void;
  onHardDelete?: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <AixiaEmptyState
        icon={FileSignature}
        title="No paycheck requests found"
        description="Employee paycheck requests, signed forms, Finance review, payroll linking, payment sent, and employee confirmation will appear here."
      />
    );
  }

  return (
    <AixiaTableShell
      variant={archiveMode ? "archive" : "registry"}
      minWidthClassName={archiveMode ? "min-w-[1380px]" : "min-w-[1420px]"}
      maxHeightClassName={archiveMode ? "max-h-[520px]" : "max-h-[720px]"}
    >
      <thead className="aixia-table-head">
        <tr>
          <th>
            <AixiaSortableHeader
              label="Request"
              sortKey="request_number"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Employee"
              sortKey="employee"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Period Start"
              sortKey="period_start"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Period End"
              sortKey="period_end"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Currency"
              sortKey="requested_currency_code"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Net Amount"
              sortKey="requested_net_amount"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Status"
              sortKey="status"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Review"
              sortKey="review_status"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Signed Form"
              sortKey="signed_form_status"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Confirmation"
              sortKey="recipient_confirmation_status"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>
            <AixiaSortableHeader
              label="Updated"
              sortKey="updated_at"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </th>
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        {rows.map((row) => {
          const hasSignedForm = Boolean(
            row.signed_form_storage_path || row.signed_form_external_url
          );

          return (
            <tr key={row.id} className="aixia-table-row">
              <AixiaTableTextCell
                width="lg"
                primary={row.request_number || row.reference_number || "Draft Request"}
                secondary={`Created ${formatDate(row.created_at)}`}
              />

              <AixiaTableTextCell
                width="xl"
                primary={
                  <span className="inline-flex items-center justify-center gap-2">
                    <UserRound className="h-4 w-4 text-cyan-200" />
                    {row.employeeLabel}
                  </span>
                }
                secondary={row.employeeSubLabel}
              />

              <AixiaTableDateCell>{formatDate(row.period_start)}</AixiaTableDateCell>

              <AixiaTableDateCell>{formatDate(row.period_end)}</AixiaTableDateCell>

              <AixiaTableBadgeCell>
                <AixiaBadge tone="cyan">{row.requested_currency_code || "USD"}</AixiaBadge>
              </AixiaTableBadgeCell>

              <AixiaTableTextCell
                width="md"
                primary={`${row.requested_currency_code || "USD"} ${formatMoney(
                  row.requested_net_amount
                )}`}
              />

              <AixiaTableBadgeCell>
                <AixiaStatusBadge value={row.status} />
              </AixiaTableBadgeCell>

              <AixiaTableBadgeCell>
                <AixiaStatusBadge value={row.review_status} />
              </AixiaTableBadgeCell>

              <AixiaTableBadgeCell width="md">
                <div className="flex flex-col items-center justify-center gap-1">
                  <AixiaStatusBadge value={row.signed_form_status} />
                  {hasSignedForm ? (
                    <AixiaBadge tone="emerald">Form attached</AixiaBadge>
                  ) : null}
                </div>
              </AixiaTableBadgeCell>

              <AixiaTableBadgeCell width="md">
                <AixiaStatusBadge value={row.recipient_confirmation_status} />
              </AixiaTableBadgeCell>

              <AixiaTableDateCell>{formatDate(row.updated_at)}</AixiaTableDateCell>

              <AixiaTableActionsCell>
                {!archiveMode ? (
                  <>
                    <AixiaButton
                      type="button"
                      variant="primary"
                      onClick={() => onOpen(row.id)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Open
                    </AixiaButton>

                    <AixiaButton
                      type="button"
                      variant="danger"
                      onClick={() => onArchive?.(row.id)}
                      title="Archive"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      Archive
                    </AixiaButton>

                    <AixiaButton
                      type="button"
                      variant="danger"
                      onClick={() => onDelete?.(row.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </AixiaButton>
                  </>
                ) : (
                  <>
                    <AixiaButton
                      type="button"
                      variant="primary"
                      onClick={() => onOpen(row.id)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </AixiaButton>

                    <AixiaButton
                      type="button"
                      variant="secondary"
                      onClick={() => onRestore?.(row.id)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restore
                    </AixiaButton>

                    {archiveTab === "deleted" ? (
                      <AixiaButton
                        type="button"
                        variant="danger"
                        onClick={() => onHardDelete?.(row.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete Permanently
                      </AixiaButton>
                    ) : null}
                  </>
                )}
              </AixiaTableActionsCell>
            </tr>
          );
        })}
      </tbody>
    </AixiaTableShell>
  );
}

export default function PaycheckRequestsPage() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState<PaycheckRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("archived");

  const loadRequests = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoading(true);
      setActionError(null);
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const result = await supabase
        .from("finance_paycheck_requests")
        .select(
          [
            "id",
            "request_number",
            "employee_ref_id",
            "employee_user_id",
            "pay_profile_id",
            "company_id",
            "requested_bank_account_id",
            "period_start",
            "period_end",
            "requested_pay_date",
            "requested_currency_code",
            "requested_gross_amount",
            "requested_bonus_amount",
            "requested_deduction_amount",
            "requested_reimbursement_amount",
            "requested_net_amount",
            "status",
            "review_status",
            "documentation_status",
            "signed_form_status",
            "recipient_confirmation_status",
            "signed_form_file_upload_id",
            "signed_form_storage_bucket",
            "signed_form_storage_path",
            "signed_form_external_url",
            "signed_form_uploaded_at",
            "signed_form_submitted_at",
            "submitted_at",
            "reviewed_at",
            "reviewed_by",
            "review_notes",
            "correction_notes",
            "rejected_reason",
            "approved_at",
            "approved_by",
            "linked_payroll_run_id",
            "linked_paycheck_id",
            "linked_payment_id",
            "payment_sent_at",
            "payment_confirmed_at",
            "payment_disputed_at",
            "confirmation_notes",
            "archived_at",
            "archived_by",
            "deleted_at",
            "deleted_by",
            "notes",
            "metadata",
            "reference_number",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "employee_ref:finance_employee_refs!finance_paycheck_requests_employee_ref_id_fkey(id, user_id, code, status, mark, metadata)",
            "profile:profiles!finance_paycheck_requests_employee_user_id_fkey(user_id, full_name, display_name)",
            "pay_profile:finance_pay_profiles!finance_paycheck_requests_pay_profile_id_fkey(id, profile_number, pay_type, payment_frequency, currency_code)",
            "payroll_run:finance_payroll_runs!finance_paycheck_requests_linked_payroll_run_id_fkey(id, run_number, status)",
            "paycheck:finance_paychecks!finance_paycheck_requests_linked_paycheck_id_fkey(id, paycheck_number, payment_status)",
            "payment:finance_payroll_payments!finance_paycheck_requests_linked_payment_id_fkey(id, payment_number, status, payment_date, paycheck_currency_code, payment_currency_code, paycheck_amount, payment_amount)",
          ].join(", ")
        )
        .order("created_at", { ascending: false });

      if (result.error) throw result.error;

      setRequests((result.data || []) as unknown as PaycheckRequestRow[]);
    } catch (error) {
      console.error("Failed to load paycheck requests:", error);

      if (mode === "initial") {
        setActionError(
          error instanceof Error
            ? error.message
            : "Failed to load paycheck requests."
        );
        setRequests([]);
      }
    } finally {
      if (mode === "initial") {
        setIsLoading(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadRequests("initial");
  }, [loadRequests]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-paycheck-requests-registry")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paycheck_requests" },
        () => void loadRequests("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_payments" },
        () => void loadRequests("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paychecks" },
        () => void loadRequests("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadRequests("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadRequests]);

  const enrichedRequests = useMemo<EnrichedPaycheckRequestRow[]>(() => {
    return requests.map((row) => ({
      ...row,
      employeeLabel: getEmployeeLabel(row),
      employeeSubLabel: getEmployeeSubLabel(row),
      periodLabel: getPeriodLabel(row),
    }));
  }, [requests]);

  const activeRows = useMemo(() => {
    return enrichedRequests.filter(
      (row) => row.status !== "archived" && row.status !== "deleted"
    );
  }, [enrichedRequests]);

  const archivedRows = useMemo(() => {
    return enrichedRequests.filter((row) => row.status === "archived");
  }, [enrichedRequests]);

  const deletedRows = useMemo(() => {
    return enrichedRequests.filter((row) => row.status === "deleted");
  }, [enrichedRequests]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const sourceRows = archiveOpen
      ? archiveTab === "archived"
        ? archivedRows
        : deletedRows
      : activeRows;

    if (!query) return sourceRows;

    return sourceRows.filter((row) => {
      const haystack = [
        row.request_number,
        row.reference_number,
        row.employeeLabel,
        row.employeeSubLabel,
        row.periodLabel,
        row.requested_currency_code,
        row.status,
        row.review_status,
        row.signed_form_status,
        row.recipient_confirmation_status,
        row.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeRows, archiveOpen, archiveTab, archivedRows, deletedRows, searchTerm]);

  const sortedRows = useMemo(() => {
    return sortRows(filteredRows, sortKey, sortDirection);
  }, [filteredRows, sortDirection, sortKey]);

  const metrics = useMemo(() => {
    const submitted = activeRows.filter(
      (row) => row.status === "submitted" || row.review_status === "pending_review"
    ).length;

    const approved = activeRows.filter(
      (row) => row.status === "approved_for_payroll" || row.review_status === "approved"
    ).length;

    const paymentSent = activeRows.filter(
      (row) => row.status === "payment_sent"
    ).length;

    const totalNet = activeRows.reduce(
      (sum, row) => sum + toNumber(row.requested_net_amount),
      0
    );

    return {
      active: activeRows.length,
      submitted,
      approved,
      paymentSent,
      totalNet,
    };
  }, [activeRows]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
        return;
      }

      setSortKey(key);
      setSortDirection("asc");
    },
    [sortKey]
  );

  const openRequest = useCallback(
    (id: string) => {
      navigate(`/finance/transactions/paycheck-requests/${id}`);
    },
    [navigate]
  );

  const runRpcAction = useCallback(
    async (rpcName: string, requestId: string, successMessage: string) => {
      setActionError(null);
      setActionMessage(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setActionError("You must be signed in to perform this action.");
        return;
      }

      const result = await supabase.rpc(rpcName, {
        p_request_id: requestId,
        p_actor_user_id: user.id,
      });

      if (result.error) {
        setActionError(result.error.message);
        return;
      }

      setActionMessage(successMessage);
      await loadRequests("silent");
    },
    [loadRequests]
  );

  const archiveRequest = useCallback(
    async (id: string) => {
      await runRpcAction(
        "finance_archive_paycheck_request",
        id,
        "Paycheck request archived."
      );
    },
    [runRpcAction]
  );

  const deleteRequest = useCallback(
    async (id: string) => {
      await runRpcAction(
        "finance_delete_paycheck_request",
        id,
        "Paycheck request moved to deleted."
      );
    },
    [runRpcAction]
  );

  const restoreRequest = useCallback(
    async (id: string) => {
      await runRpcAction(
        "finance_restore_paycheck_request",
        id,
        "Paycheck request restored."
      );
    },
    [runRpcAction]
  );

  const hardDeleteRequest = useCallback(
    async (id: string) => {
      await runRpcAction(
        "finance_hard_delete_paycheck_request",
        id,
        "Paycheck request permanently deleted."
      );
    },
    [runRpcAction]
  );

  const registrySearch = (
    <AixiaSearchField
      width="wide"
      value={searchTerm}
      onChange={(event) => setSearchTerm(event.target.value)}
      placeholder="Search paycheck requests..."
    />
  );

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Transactions"
        parentPath="/finance/transactions"
        badges={[
          { label: "Paycheck Requests", tone: "cyan" },
          { label: "Signed Forms", tone: "emerald" },
          { label: "Payroll Linking", tone: "violet" },
          { label: "Payment Confirmation", tone: "amber" },
        ]}
        gradientTitle="Employee"
        title="Paycheck Requests"
        description="Employee-side paycheck request intake for signed forms, Finance review, payroll linking, payment execution, and employee payment confirmation."
        statusCards={[
          {
            label: "Active Requests",
            value: isLoading ? "—" : formatCount(metrics.active),
            description: "Active paycheck requests excluding archived and deleted records.",
            icon: FileSignature,
            tone: "cyan",
          },
          {
            label: "Submitted",
            value: isLoading ? "—" : formatCount(metrics.submitted),
            description: "Signed forms waiting for Finance review.",
            icon: ShieldCheck,
            tone: "amber",
          },
          {
            label: "Approved",
            value: isLoading ? "—" : formatCount(metrics.approved),
            description: "Approved requests ready to link to payroll.",
            icon: BadgeCheck,
            tone: "emerald",
          },
        ]}
      />

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Total Active"
          value={isLoading ? "—" : formatCount(metrics.active)}
          description="Visible active paycheck requests."
          icon={FileSignature}
          tone="cyan"
        />
        <AixiaMetricCard
          label="Pending Review"
          value={isLoading ? "—" : formatCount(metrics.submitted)}
          description="Submitted signed forms waiting for Finance review."
          icon={ShieldCheck}
          tone="amber"
        />
        <AixiaMetricCard
          label="Approved For Payroll"
          value={isLoading ? "—" : formatCount(metrics.approved)}
          description="Approved requests ready to link to payroll run."
          icon={BadgeCheck}
          tone="emerald"
        />
        <AixiaMetricCard
          label="Payment Sent"
          value={isLoading ? "—" : formatCount(metrics.paymentSent)}
          description="Requests waiting for employee payment confirmation."
          icon={WalletCards}
          tone="violet"
        />
        <AixiaMetricCard
          label="Total Net"
          value={isLoading ? "—" : formatMoney(metrics.totalNet)}
          description="Total requested net amount for active requests."
          icon={WalletCards}
          tone="gold"
        />
      </AixiaMetricGrid>

      <AixiaSection
        title="Paycheck Requests Registry"
        description="Active registry: Request, Employee, Period, Currency, Net Amount, Status, Review, Signed Form, Confirmation, and Actions."
        icon={FileSignature}
        badge={
          backgroundRefreshing ? (
            <AixiaBadge tone="neutral">Syncing</AixiaBadge>
          ) : (
            <AixiaBadge tone="emerald">Live</AixiaBadge>
          )
        }
        actions={
          <AixiaRegistryToolbar
            search={registrySearch}
            archiveAction={
              <AixiaButton
                type="button"
                variant="danger"
                onClick={() => {
                  setArchiveOpen(true);
                  setArchiveTab("archived");
                }}
              >
                <MoreHorizontal className="h-4 w-4" />
                Archive
              </AixiaButton>
            }
            primaryAction={
              <AixiaButton
                type="button"
                variant="primary"
                onClick={() => navigate("/finance/transactions/paycheck-requests/new")}
              >
                <Plus className="h-4 w-4" />
                New Paycheck Request
              </AixiaButton>
            }
          />
        }
      >
        {actionError ? (
          <AixiaAlert tone="error" className="mb-4">
            {actionError}
          </AixiaAlert>
        ) : null}

        {actionMessage ? (
          <AixiaAlert tone="success" className="mb-4">
            {actionMessage}
          </AixiaAlert>
        ) : null}

        <PaycheckRequestTable
          rows={sortedRows}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          onOpen={openRequest}
          onArchive={archiveRequest}
          onDelete={deleteRequest}
        />
      </AixiaSection>

      <AixiaArchiveManagerModal
        open={archiveOpen}
        title="Archived & Deleted Paycheck Requests"
        description="Archived requests can be restored. Deleted requests can be restored or permanently deleted."
        archivedCount={archivedRows.length}
        deletedCount={deletedRows.length}
        countLabel="Paycheck Requests"
        activeTab={archiveTab}
        onTabChange={setArchiveTab}
        onClose={() => setArchiveOpen(false)}
        maxWidthClassName="max-w-[1500px]"
      >
        <AixiaRegistryToolbar
          search={
            <AixiaSearchField
              width="wide"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search archive..."
            />
          }
        />

        <PaycheckRequestTable
          rows={sortedRows}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          onOpen={openRequest}
          archiveMode
          archiveTab={archiveTab}
          onRestore={restoreRequest}
          onHardDelete={hardDeleteRequest}
        />
      </AixiaArchiveManagerModal>
    </AixiaPage>
  );
}
