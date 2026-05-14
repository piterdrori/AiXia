import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  RotateCcw,
  ShieldCheck,
  Trash2,
  WalletCards,
} from "lucide-react";

import {
  AixiaAccessRule,
  AixiaAlert,
  AixiaArchiveManagerModal,
  AixiaBadge,
  AixiaButton,
  AixiaEmployeeIdentityCell,
  AixiaEmptyState,
  AixiaHero,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaPage,
  AixiaRegistryToolbar,
  AixiaSearchField,
  AixiaSection,
  AixiaStatusBadge,
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableDateCell,
  AixiaTableShell,
  AixiaTableTextCell,
} from "@/components/aixia";
import type { FinanceEmployeeIdentity } from "@/lib/finance/employeeIdentity";
import {
  getFinanceEmployeePrimaryName,
  getFinanceEmployeeReferenceLabel,
  getFinanceEmployeeSearchText,
  getFinanceEmployeeSecondaryLabel,
} from "@/lib/finance/employeeIdentity";
import { supabase } from "@/lib/supabase";

type WorkbenchTab =
  | "paycheck_requests"
  | "payroll_documents"
  | "payroll_review"
  | "ready_for_payment"
  | "employee_confirmation"
  | "funding_batches"
  | "payment_distributions";

type ArchiveScope = "workflow" | "execution";
type ArchiveTab = "archived" | "deleted";
type Tone = "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";
type LoadMode = "initial" | "silent";

type PaycheckRequestRow = {
  id: string;
  request_number: string | null;
  employee_ref_id: string | null;
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
  admin_signed_form_status: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  correction_notes: string | null;
  rejected_reason: string | null;
  approved_at: string | null;
  linked_payroll_run_id: string | null;
  linked_paycheck_id: string | null;
  linked_payment_id: string | null;
  linked_payment_distribution_id: string | null;
  payment_sent_at: string | null;
  payment_confirmed_at: string | null;
  payment_disputed_at: string | null;
  confirmation_notes: string | null;
  funding_status: string | null;
  payment_status: string | null;
  paid_amount: number | string | null;
  remaining_amount: number | string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  reference_number: string | null;
  created_at: string;
  updated_at: string;
};

type EmployeeRefRow = {
  id: string;
  user_id: string | null;
  code: string | null;
  status: string | null;
  mark: string | null;
  metadata: {
    company?: string | null;
    job_title?: string | null;
    member_type?: string | null;
    source_role?: string | null;
    source_status?: string | null;
    [key: string]: unknown;
  } | null;
};

type PayProfileRow = {
  id: string;
  profile_number: string | null;
  user_id: string;
  pay_type: string;
  payment_frequency: string;
  base_salary: number | string | null;
  hourly_rate: number | string | null;
  default_hours: number | string | null;
  currency_code: string;
  active: boolean | null;
  status: string;
};

type CompanyRow = {
  id: string;
  name: string | null;
  legal_name: string | null;
};

type BankAccountRow = {
  id: string;
  code: string | null;
  name: string | null;
  account_type: string | null;
  institution_name: string | null;
  masked_account_number: string | null;
  status: string | null;
  beneficiary_name: string | null;
  currency_code: string | null;
  swift_code: string | null;
  iban: string | null;
  bank_name: string | null;
  company_id: string | null;
};

type FundingBatchRow = {
  id: string;
  batch_number: string;
  funding_company_id: string;
  funding_bank_account_id: string | null;
  allocation_date: string;
  period_start: string | null;
  period_end: string | null;
  currency_code: string;
  allocated_amount: number | string | null;
  status: string;
  documentation_status: string | null;
  notes: string | null;
  metadata: {
    used_amount?: number | string | null;
    remaining_amount?: number | string | null;
    [key: string]: unknown;
  } | null;
  created_at: string;
  updated_at: string;
};

type PaymentDistributionRow = {
  id: string;
  distribution_number: string;
  funding_batch_id: string;
  payment_date: string;
  status: string;
  paid_from_company_id: string | null;
  paid_from_bank_account_id: string | null;
  amount: number | string | null;
  payment_currency_code: string;
  funding_currency_code: string | null;
  funding_currency_amount: number | string | null;
  exchange_rate: number | string | null;
  exchange_rate_source: string | null;
  exchange_rate_date: string | null;
  reference_number: string | null;
  recipient_employee_ref_id: string | null;
  recipient_person_name: string | null;
  recipient_confirmation_status: string | null;
  payment_proof_status: string | null;
  notes: string | null;
  metadata: {
    allocation_count?: number | string | null;
    payment_currency_amount?: number | string | null;
    paycheck_currency_coverage_total?: number | string | null;
    funding_currency_amount_used_for_payment?: number | string | null;
    paycheck_currency_code?: string | null;
    [key: string]: unknown;
  } | null;
  created_at: string;
  updated_at: string;
};

type PaymentAllocationRow = {
  id: string;
  distribution_id: string;
  paycheck_request_id: string;
  funding_batch_id: string | null;
  paycheck_id: string | null;
  payroll_payment_id: string | null;
  employee_ref_id: string | null;
  employee_user_id: string | null;
  company_id: string | null;
  funding_company_id: string | null;
  paid_from_bank_account_id: string | null;
  recipient_person_name: string | null;
  allocated_amount: number | string | null;
  currency_code: string | null;
  payment_currency_code: string | null;
  converted_amount: number | string | null;
  funding_currency_code: string | null;
  funding_currency_amount: number | string | null;
  exchange_rate: number | string | null;
  conversion_source: string | null;
  conversion_date: string | null;
  recipient_confirmation_status: string | null;
  created_at: string;
  updated_at: string;
};

type EnrichedRequestRow = PaycheckRequestRow & {
  employeeIdentity: FinanceEmployeeIdentity | null;
  employeeName: string;
  employeeLabel: string;
  employeeReference: string;
  employeeSearchText: string;
  companyName: string;
  payProfileLabel: string;
  periodLabel: string;
  targetAmount: number;
  paidAmountCalculated: number;
  remainingAmountCalculated: number;
  linkedAllocationCount: number;
  nextStepLabel: string;
  nextStepTone: Tone;
};

type EnrichedFundingBatch = FundingBatchRow & {
  recordType: "funding_batch";
  companyName: string;
  bankLabel: string;
  allocatedAmount: number;
  usedAmount: number;
  remainingAmount: number;
  distributionCount: number;
  confirmedDistributionCount: number;
  allocationCount: number;
};

type EnrichedDistribution = PaymentDistributionRow & {
  recordType: "payment_distribution";
  fundingBatchNumber: string;
  companyName: string;
  bankLabel: string;
  allocationCount: number;
  allocatedRequestAmount: number;
  requestCoverageCurrencyCode: string;
  paymentCurrencyAmount: number;
  fundingCurrencyAmountCalculated: number;
};

type ExecutionRecord = EnrichedFundingBatch | EnrichedDistribution;

const mainWorkflowTabs: Array<{
  key: WorkbenchTab;
  label: string;
  description: string;
}> = [
  {
    key: "paycheck_requests",
    label: "Paycheck Requests",
    description: "Finance/Admin monitors submitted paycheck requests and employee-created payroll reimbursement requests.",
  },
  {
    key: "payroll_documents",
    label: "Payroll Documents",
    description: "Tracks missing payroll documents, employee forms, admin signed forms, uploaded proof, and document issues.",
  },
  {
    key: "payroll_review",
    label: "Payroll Review",
    description: "Finance/Admin reviews paycheck requests, approves them for payroll, asks for correction, or rejects them.",
  },
  {
    key: "ready_for_payment",
    label: "Ready for Paycheck Payment",
    description: "Approved paycheck requests ready to be covered by a payroll funding pool and paid through a distribution.",
  },
  {
    key: "employee_confirmation",
    label: "Employee Confirmation",
    description: "Final tracking step: employee confirms payment received, reports not received, or disputes the payment.",
  },
];

const executionTabs: Array<{
  key: WorkbenchTab;
  label: string;
  description: string;
}> = [
  {
    key: "funding_batches",
    label: "Payroll Funding Allocation",
    description: "Reserve payroll money in a confirmed funding pool before distributing payments across paycheck requests.",
  },
  {
    key: "payment_distributions",
    label: "Paycheck Payment Distributions",
    description: "Distribute confirmed payroll funding across approved paycheck requests and track employee confirmation.",
  },
];

const allTabs = [...mainWorkflowTabs, ...executionTabs];

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

function formatLabel(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeCurrencyCode(value: string | null | undefined) {
  return (value || "").trim().toUpperCase();
}

function getCompanyName(company: CompanyRow | null | undefined) {
  if (!company) return "No company selected";
  return company.legal_name || company.name || "Company selected";
}

function getPayProfileLabel(payProfile: PayProfileRow | null | undefined) {
  if (!payProfile) return "No pay profile";

  return [
    payProfile.profile_number || "Pay Profile",
    formatLabel(payProfile.pay_type),
    formatLabel(payProfile.payment_frequency),
    payProfile.currency_code,
  ]
    .filter(Boolean)
    .join(" • ");
}

function getBankLabel(bank: BankAccountRow | null | undefined) {
  if (!bank) return "No bank selected";

  return [
    bank.name || bank.bank_name || bank.institution_name || "Bank Account",
    bank.currency_code,
    bank.masked_account_number,
  ]
    .filter(Boolean)
    .join(" • ");
}

function getRequestPeriodLabel(request: PaycheckRequestRow) {
  return `${formatDate(request.period_start)} → ${formatDate(request.period_end)}`;
}

function getFundingPeriodLabel(batch: FundingBatchRow) {
  if (!batch.period_start && !batch.period_end) return "No payroll period selected";

  return `${formatDate(batch.period_start)} → ${formatDate(batch.period_end)}`;
}

function getRequestTargetAmount(request: PaycheckRequestRow) {
  const explicitNet = toNumber(request.requested_net_amount);
  if (explicitNet > 0) return explicitNet;

  return (
    toNumber(request.requested_gross_amount) +
    toNumber(request.requested_bonus_amount) +
    toNumber(request.requested_reimbursement_amount) -
    toNumber(request.requested_deduction_amount)
  );
}

function getRequestNextStep(request: PaycheckRequestRow): {
  label: string;
  tone: Tone;
} {
  if (request.status === "rejected" || request.review_status === "rejected") {
    return { label: "Request rejected", tone: "rose" };
  }

  if (request.status === "disputed" || request.recipient_confirmation_status === "disputed") {
    return { label: "Payment disputed", tone: "rose" };
  }

  if (
    request.status === "received_confirmed" ||
    request.recipient_confirmation_status === "received_confirmed"
  ) {
    return { label: "Employee confirmed receipt", tone: "emerald" };
  }

  if (request.recipient_confirmation_status === "not_received") {
    return { label: "Employee reported payment not received", tone: "rose" };
  }

  if (
    request.status === "payment_sent" ||
    request.payment_status === "paid" ||
    request.recipient_confirmation_status === "payment_sent" ||
    request.recipient_confirmation_status === "pending_confirmation"
  ) {
    return { label: "Waiting for employee confirmation", tone: "violet" };
  }

  if (request.payment_status === "partially_paid") {
    return { label: "Partially paid; remaining balance open", tone: "amber" };
  }

  if (request.status === "approved_for_payroll" && request.payment_status !== "paid") {
    return { label: "Ready for paycheck payment distribution", tone: "emerald" };
  }

  if (request.status === "needs_correction" || request.review_status === "needs_correction") {
    return { label: "Waiting for employee correction", tone: "amber" };
  }

  if (request.status === "submitted" || request.review_status === "pending_review") {
    return { label: "Finance review needed", tone: "cyan" };
  }

  if (request.status === "draft") {
    return { label: "Draft request not submitted", tone: "slate" };
  }

  return { label: "Review current request status", tone: "slate" };
}

function isWorkflowArchived(request: PaycheckRequestRow) {
  return request.status === "archived";
}

function isWorkflowDeleted(request: PaycheckRequestRow) {
  return request.status === "deleted";
}

function isWorkflowActive(request: PaycheckRequestRow) {
  return !isWorkflowArchived(request) && !isWorkflowDeleted(request);
}

function isExecutionArchived(record: FundingBatchRow | PaymentDistributionRow) {
  return record.status === "archived";
}

function isExecutionDeleted(record: FundingBatchRow | PaymentDistributionRow) {
  return record.status === "deleted";
}

function isExecutionActive(record: FundingBatchRow | PaymentDistributionRow) {
  return !isExecutionArchived(record) && !isExecutionDeleted(record);
}

function buildIdentityMaps(identities: FinanceEmployeeIdentity[]) {
  const byEmployeeRefId = new Map<string, FinanceEmployeeIdentity>();
  const byUserId = new Map<string, FinanceEmployeeIdentity>();

  identities.forEach((identity) => {
    const employeeRefId = String(identity.employee_ref_id || identity.id || "").trim();
    const userId = String(identity.user_id || "").trim();

    if (employeeRefId) byEmployeeRefId.set(employeeRefId, identity);
    if (userId) byUserId.set(userId, identity);
  });

  return { byEmployeeRefId, byUserId };
}

function resolveRequestIdentity(
  request: PaycheckRequestRow,
  identityByEmployeeRefId: Map<string, FinanceEmployeeIdentity>,
  identityByUserId: Map<string, FinanceEmployeeIdentity>,
) {
  if (request.employee_ref_id && identityByEmployeeRefId.has(request.employee_ref_id)) {
    return identityByEmployeeRefId.get(request.employee_ref_id) || null;
  }

  if (request.employee_user_id && identityByUserId.has(request.employee_user_id)) {
    return identityByUserId.get(request.employee_user_id) || null;
  }

  return null;
}

function buildFallbackIdentity(
  request: PaycheckRequestRow,
  employeeMap: Map<string, EmployeeRefRow>,
): FinanceEmployeeIdentity | null {
  const employee = request.employee_ref_id ? employeeMap.get(request.employee_ref_id) : null;

  if (!employee && !request.employee_user_id) return null;

  return {
    employee_ref_id: request.employee_ref_id || null,
    user_id: request.employee_user_id || employee?.user_id || null,
    employee_code: employee?.code || null,
    code: employee?.code || null,
    employee_status: employee?.status || null,
    employee_mark: employee?.mark || null,
    employee_metadata: employee?.metadata || null,
    person_name: null,
    profile_company: employee?.metadata?.company || null,
    profile_job_title:
      employee?.metadata?.job_title || employee?.metadata?.source_role || null,
    profile_member_type: employee?.metadata?.member_type || null,
  };
}

function getToneForBadge(tone: Tone) {
  if (tone === "slate") return "neutral" as const;
  return tone;
}

function PayrollTabButtons({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: typeof mainWorkflowTabs;
  activeTab: WorkbenchTab;
  onTabChange: (tab: WorkbenchTab) => void;
}) {
  return (
    <>
      {tabs.map((tab) => (
        <AixiaButton
          key={tab.key}
          type="button"
          variant={activeTab === tab.key ? "primary" : "secondary"}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
        </AixiaButton>
      ))}
    </>
  );
}

function RequestTable({
  rows,
  mode,
  archiveTab,
  isRunningAction,
  onOpen,
  onArchive,
  onDelete,
  onRestore,
  onHardDelete,
}: {
  rows: EnrichedRequestRow[];
  mode: "active" | "archive";
  archiveTab: ArchiveTab;
  isRunningAction: boolean;
  onOpen: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onHardDelete: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <AixiaEmptyState
        icon={FileText}
        title="No paycheck request records found"
        description="Matching paycheck workflow records will appear here."
      />
    );
  }

  return (
    <AixiaTableShell
      variant={mode === "archive" ? "archive" : "registry"}
      minWidthClassName="min-w-[1660px]"
      maxHeightClassName={mode === "archive" ? "max-h-[620px]" : "max-h-[720px]"}
    >
      <thead className="aixia-table-head">
        <tr>
          <th>Request</th>
          <th>Employee</th>
          <th>Pay Profile</th>
          <th>Net / Paid</th>
          <th>Remaining</th>
          <th>Status</th>
          <th>Review</th>
          <th>Docs</th>
          <th>Funding</th>
          <th>Next Step</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((request) => (
          <tr key={request.id} className="aixia-table-row">
            <AixiaTableTextCell
              width="lg"
              primary={request.request_number || request.reference_number || "Paycheck Request"}
              secondary={request.periodLabel}
            />
            <AixiaEmployeeIdentityCell
              width="xl"
              identity={request.employeeIdentity}
              primary={request.employeeName}
              secondary={request.employeeLabel}
              reference={request.employeeReference || request.employeeSearchText}
            />
            <AixiaTableTextCell
              width="lg"
              primary={request.payProfileLabel}
              secondary={`Pay date ${formatDate(request.requested_pay_date)}`}
            />
            <AixiaTableTextCell
              width="md"
              primary={`${request.requested_currency_code || "USD"} ${formatMoney(
                request.targetAmount,
              )}`}
              secondary={`Paid ${request.requested_currency_code || "USD"} ${formatMoney(
                request.paidAmountCalculated,
              )}`}
            />
            <AixiaTableTextCell
              width="md"
              primary={`${request.requested_currency_code || "USD"} ${formatMoney(
                request.remainingAmountCalculated,
              )}`}
              secondary={`${request.linkedAllocationCount} allocation lines`}
            />
            <AixiaTableBadgeCell>
              <AixiaStatusBadge value={request.status} />
            </AixiaTableBadgeCell>
            <AixiaTableBadgeCell>
              <AixiaStatusBadge value={request.review_status} />
            </AixiaTableBadgeCell>
            <AixiaTableBadgeCell>
              <AixiaStatusBadge value={request.documentation_status || request.signed_form_status} />
            </AixiaTableBadgeCell>
            <AixiaTableBadgeCell>
              <AixiaStatusBadge value={request.funding_status || "not_allocated"} />
            </AixiaTableBadgeCell>
            <AixiaTableBadgeCell width="xl">
              <AixiaBadge tone={getToneForBadge(request.nextStepTone)}>{request.nextStepLabel}</AixiaBadge>
              <AixiaBadge tone="neutral">
                Payment {formatLabel(request.payment_status || "unpaid")}
              </AixiaBadge>
              <AixiaBadge tone="neutral">
                Employee {formatLabel(request.recipient_confirmation_status)}
              </AixiaBadge>
            </AixiaTableBadgeCell>
            <AixiaTableActionsCell>
              <AixiaButton
                type="button"
                variant="primary"
                disabled={isRunningAction}
                onClick={() => onOpen(request.id)}
              >
                <Eye className="h-4 w-4" />
                Open
              </AixiaButton>
              {mode === "active" ? (
                <>
                  <AixiaButton
                    type="button"
                    variant="danger"
                    disabled={isRunningAction}
                    onClick={() => onArchive(request.id)}
                  >
                    <Archive className="h-4 w-4" />
                    Archive
                  </AixiaButton>
                  <AixiaButton
                    type="button"
                    variant="danger"
                    disabled={isRunningAction}
                    onClick={() => onDelete(request.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </AixiaButton>
                </>
              ) : (
                <>
                  <AixiaButton
                    type="button"
                    variant="secondary"
                    disabled={isRunningAction}
                    onClick={() => onRestore(request.id)}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restore
                  </AixiaButton>
                  {archiveTab === "deleted" ? (
                    <AixiaButton
                      type="button"
                      variant="danger"
                      disabled={isRunningAction}
                      onClick={() => onHardDelete(request.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Permanently
                    </AixiaButton>
                  ) : null}
                </>
              )}
            </AixiaTableActionsCell>
          </tr>
        ))}
      </tbody>
    </AixiaTableShell>
  );
}

function ExecutionTable({
  rows,
  mode,
  archiveTab,
  isRunningAction,
  onOpen,
  onArchive,
  onDelete,
  onRestore,
  onHardDelete,
}: {
  rows: ExecutionRecord[];
  mode: "active" | "archive";
  archiveTab: ArchiveTab;
  isRunningAction: boolean;
  onOpen: (record: ExecutionRecord) => void;
  onArchive: (record: ExecutionRecord) => void;
  onDelete: (record: ExecutionRecord) => void;
  onRestore: (record: ExecutionRecord) => void;
  onHardDelete: (record: ExecutionRecord) => void;
}) {
  if (rows.length === 0) {
    return (
      <AixiaEmptyState
        icon={WalletCards}
        title="No payroll payment execution records found"
        description="Funding pools and paycheck payment distributions will appear here."
      />
    );
  }

  return (
    <AixiaTableShell
      variant={mode === "archive" ? "archive" : "registry"}
      minWidthClassName="min-w-[1420px]"
      maxHeightClassName={mode === "archive" ? "max-h-[620px]" : "max-h-[720px]"}
    >
      <thead className="aixia-table-head">
        <tr>
          <th>Record</th>
          <th>Type</th>
          <th>Company / Bank</th>
          <th>Amount</th>
          <th>Balance / Coverage</th>
          <th>Lines</th>
          <th>Status</th>
          <th>Docs / Employee</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((record) => {
          const isBatch = record.recordType === "funding_batch";
          const title = isBatch ? record.batch_number : record.distribution_number;
          const amount = isBatch
            ? record.allocatedAmount
            : record.fundingCurrencyAmountCalculated;
          const currency = isBatch
            ? record.currency_code || "USD"
            : record.funding_currency_code || record.payment_currency_code || "USD";

          return (
            <tr key={`${record.recordType}-${record.id}`} className="aixia-table-row">
              <AixiaTableTextCell
                width="lg"
                primary={title}
                secondary={
                  isBatch
                    ? getFundingPeriodLabel(record)
                    : `${formatDate(record.payment_date)} • ${record.fundingBatchNumber}`
                }
              />
              <AixiaTableBadgeCell>
                <AixiaBadge tone={isBatch ? "violet" : "cyan"}>
                  {isBatch ? "Payroll Funding Pool" : "Paycheck Payment Distribution"}
                </AixiaBadge>
              </AixiaTableBadgeCell>
              <AixiaTableTextCell
                width="lg"
                primary={record.companyName}
                secondary={record.bankLabel}
              />
              <AixiaTableTextCell
                width="md"
                primary={`${currency} ${formatMoney(amount)}`}
                secondary={
                  isBatch
                    ? `Used ${record.currency_code || "USD"} ${formatMoney(record.usedAmount)}`
                    : `Payment ${record.payment_currency_code || "USD"} ${formatMoney(
                        record.paymentCurrencyAmount,
                      )}`
                }
              />
              <AixiaTableTextCell
                width="md"
                primary={
                  isBatch
                    ? `${record.currency_code || "USD"} ${formatMoney(record.remainingAmount)}`
                    : `${record.requestCoverageCurrencyCode} ${formatMoney(
                        record.allocatedRequestAmount,
                      )}`
                }
                secondary={isBatch ? "Remaining" : "Request coverage"}
              />
              <AixiaTableTextCell
                width="sm"
                primary={isBatch ? record.distributionCount : record.allocationCount}
                secondary={isBatch ? `${record.confirmedDistributionCount} confirmed` : "Paycheck lines"}
              />
              <AixiaTableBadgeCell>
                <AixiaStatusBadge value={record.status} />
              </AixiaTableBadgeCell>
              <AixiaTableBadgeCell>
                <AixiaStatusBadge
                  value={isBatch ? record.documentation_status : record.recipient_confirmation_status}
                />
              </AixiaTableBadgeCell>
              <AixiaTableActionsCell>
                <AixiaButton
                  type="button"
                  variant="primary"
                  disabled={isRunningAction}
                  onClick={() => onOpen(record)}
                >
                  <Eye className="h-4 w-4" />
                  Open
                </AixiaButton>
                {mode === "active" ? (
                  <>
                    <AixiaButton
                      type="button"
                      variant="danger"
                      disabled={isRunningAction}
                      onClick={() => onArchive(record)}
                    >
                      <Archive className="h-4 w-4" />
                      Archive
                    </AixiaButton>
                    <AixiaButton
                      type="button"
                      variant="danger"
                      disabled={isRunningAction}
                      onClick={() => onDelete(record)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </AixiaButton>
                  </>
                ) : (
                  <>
                    <AixiaButton
                      type="button"
                      variant="secondary"
                      disabled={isRunningAction}
                      onClick={() => onRestore(record)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore
                    </AixiaButton>
                    {archiveTab === "deleted" ? (
                      <AixiaButton
                        type="button"
                        variant="danger"
                        disabled={isRunningAction}
                        onClick={() => onHardDelete(record)}
                      >
                        <Trash2 className="h-4 w-4" />
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

export default function FinancePayrollControlPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<WorkbenchTab>("paycheck_requests");
  const [requests, setRequests] = useState<PaycheckRequestRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [employeeIdentities, setEmployeeIdentities] = useState<FinanceEmployeeIdentity[]>([]);
  const [payProfiles, setPayProfiles] = useState<PayProfileRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [fundingBatches, setFundingBatches] = useState<FundingBatchRow[]>([]);
  const [paymentDistributions, setPaymentDistributions] = useState<PaymentDistributionRow[]>([]);
  const [paymentAllocations, setPaymentAllocations] = useState<PaymentAllocationRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [archiveScope, setArchiveScope] = useState<ArchiveScope>("workflow");
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("archived");
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const employeeMap = useMemo(() => {
    return new Map(employees.map((employee) => [employee.id, employee]));
  }, [employees]);

  const employeeIdentityMaps = useMemo(() => {
    return buildIdentityMaps(employeeIdentities);
  }, [employeeIdentities]);

  const payProfileMap = useMemo(() => {
    return new Map(payProfiles.map((profile) => [profile.id, profile]));
  }, [payProfiles]);

  const companyMap = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);

  const bankAccountMap = useMemo(() => {
    return new Map(bankAccounts.map((bank) => [bank.id, bank]));
  }, [bankAccounts]);

  const fundingBatchMap = useMemo(() => {
    return new Map(fundingBatches.map((batch) => [batch.id, batch]));
  }, [fundingBatches]);

  const confirmedDistributionIdSet = useMemo(() => {
    return new Set(
      paymentDistributions
        .filter((distribution) => distribution.status === "confirmed")
        .map((distribution) => distribution.id),
    );
  }, [paymentDistributions]);

  const confirmedPaymentAllocations = useMemo(() => {
    return paymentAllocations.filter((allocation) =>
      confirmedDistributionIdSet.has(allocation.distribution_id),
    );
  }, [confirmedDistributionIdSet, paymentAllocations]);

  const allocationsByRequestId = useMemo(() => {
    const map = new Map<string, PaymentAllocationRow[]>();

    paymentAllocations.forEach((allocation) => {
      const current = map.get(allocation.paycheck_request_id) || [];
      current.push(allocation);
      map.set(allocation.paycheck_request_id, current);
    });

    return map;
  }, [paymentAllocations]);

  const allocationsByFundingBatchId = useMemo(() => {
    const map = new Map<string, PaymentAllocationRow[]>();

    paymentAllocations.forEach((allocation) => {
      if (!allocation.funding_batch_id) return;
      const current = map.get(allocation.funding_batch_id) || [];
      current.push(allocation);
      map.set(allocation.funding_batch_id, current);
    });

    return map;
  }, [paymentAllocations]);

  const allocationsByDistributionId = useMemo(() => {
    const map = new Map<string, PaymentAllocationRow[]>();

    paymentAllocations.forEach((allocation) => {
      const current = map.get(allocation.distribution_id) || [];
      current.push(allocation);
      map.set(allocation.distribution_id, current);
    });

    return map;
  }, [paymentAllocations]);

  const distributionsByFundingBatchId = useMemo(() => {
    const map = new Map<string, PaymentDistributionRow[]>();

    paymentDistributions.forEach((distribution) => {
      const current = map.get(distribution.funding_batch_id) || [];
      current.push(distribution);
      map.set(distribution.funding_batch_id, current);
    });

    return map;
  }, [paymentDistributions]);

  const enrichedRequests = useMemo<EnrichedRequestRow[]>(() => {
    return requests.map((request) => {
      const targetAmount = getRequestTargetAmount(request);
      const confirmedAllocationsForRequest = confirmedPaymentAllocations.filter(
        (allocation) => allocation.paycheck_request_id === request.id,
      );
      const allAllocationsForRequest = allocationsByRequestId.get(request.id) || [];
      const paidAmountCalculated =
        toNumber(request.paid_amount) ||
        confirmedAllocationsForRequest.reduce(
          (sum, allocation) => sum + toNumber(allocation.allocated_amount),
          0,
        );
      const remainingAmountCalculated =
        request.remaining_amount !== null && request.remaining_amount !== undefined
          ? toNumber(request.remaining_amount)
          : Math.max(targetAmount - paidAmountCalculated, 0);
      const nextStep = getRequestNextStep({
        ...request,
        paid_amount: paidAmountCalculated,
        remaining_amount: remainingAmountCalculated,
      });
      const viewIdentity = resolveRequestIdentity(
        request,
        employeeIdentityMaps.byEmployeeRefId,
        employeeIdentityMaps.byUserId,
      );
      const fallbackIdentity = buildFallbackIdentity(request, employeeMap);
      const employeeIdentity = viewIdentity || fallbackIdentity;

      return {
        ...request,
        employeeIdentity,
        employeeName: getFinanceEmployeePrimaryName(employeeIdentity, "Employee"),
        employeeLabel: getFinanceEmployeeSecondaryLabel(employeeIdentity),
        employeeReference: getFinanceEmployeeReferenceLabel(employeeIdentity),
        employeeSearchText: getFinanceEmployeeSearchText(employeeIdentity),
        companyName: request.company_id
          ? getCompanyName(companyMap.get(request.company_id))
          : "No company selected",
        payProfileLabel: request.pay_profile_id
          ? getPayProfileLabel(payProfileMap.get(request.pay_profile_id))
          : "No pay profile",
        periodLabel: getRequestPeriodLabel(request),
        targetAmount,
        paidAmountCalculated,
        remainingAmountCalculated,
        linkedAllocationCount: allAllocationsForRequest.length,
        nextStepLabel: nextStep.label,
        nextStepTone: nextStep.tone,
      };
    });
  }, [
    allocationsByRequestId,
    companyMap,
    confirmedPaymentAllocations,
    employeeIdentityMaps.byEmployeeRefId,
    employeeIdentityMaps.byUserId,
    employeeMap,
    payProfileMap,
    requests,
  ]);

  const enrichedFundingBatches = useMemo<EnrichedFundingBatch[]>(() => {
    return fundingBatches.map((batch) => {
      const batchDistributions = distributionsByFundingBatchId.get(batch.id) || [];
      const batchAllocations = allocationsByFundingBatchId.get(batch.id) || [];
      const confirmedBatchDistributions = batchDistributions.filter(
        (distribution) => distribution.status === "confirmed",
      );
      const allocatedAmount = toNumber(batch.allocated_amount);
      const usedAmount =
        toNumber(batch.metadata?.used_amount) ||
        confirmedPaymentAllocations
          .filter((allocation) => allocation.funding_batch_id === batch.id)
          .reduce(
            (sum, allocation) =>
              sum +
              toNumber(
                allocation.funding_currency_amount ||
                  allocation.converted_amount ||
                  allocation.allocated_amount,
              ),
            0,
          );

      return {
        ...batch,
        recordType: "funding_batch",
        companyName: getCompanyName(companyMap.get(batch.funding_company_id)),
        bankLabel: batch.funding_bank_account_id
          ? getBankLabel(bankAccountMap.get(batch.funding_bank_account_id))
          : "No funding bank",
        allocatedAmount,
        usedAmount,
        remainingAmount:
          batch.metadata?.remaining_amount !== null && batch.metadata?.remaining_amount !== undefined
            ? toNumber(batch.metadata.remaining_amount)
            : Math.max(allocatedAmount - usedAmount, 0),
        distributionCount: batchDistributions.length,
        confirmedDistributionCount: confirmedBatchDistributions.length,
        allocationCount: batchAllocations.length,
      };
    });
  }, [
    allocationsByFundingBatchId,
    bankAccountMap,
    companyMap,
    confirmedPaymentAllocations,
    distributionsByFundingBatchId,
    fundingBatches,
  ]);

  const enrichedDistributions = useMemo<EnrichedDistribution[]>(() => {
    return paymentDistributions.map((distribution) => {
      const distributionAllocations = allocationsByDistributionId.get(distribution.id) || [];
      const fundingBatch = fundingBatchMap.get(distribution.funding_batch_id);
      const allocatedRequestAmount = distributionAllocations.reduce(
        (sum, allocation) => sum + toNumber(allocation.allocated_amount),
        0,
      );
      const requestCoverageCurrencyCodes = Array.from(
        new Set(
          distributionAllocations
            .map((allocation) => normalizeCurrencyCode(allocation.currency_code))
            .filter(Boolean),
        ),
      );
      const requestCoverageCurrencyCode =
        requestCoverageCurrencyCodes.length === 1
          ? requestCoverageCurrencyCodes[0]
          : requestCoverageCurrencyCodes.length > 1
            ? "MIXED"
            : normalizeCurrencyCode(distribution.metadata?.paycheck_currency_code) ||
              normalizeCurrencyCode(distribution.payment_currency_code) ||
              "USD";
      const paymentCurrencyAmount =
        toNumber(distribution.metadata?.payment_currency_amount) ||
        distributionAllocations.reduce(
          (sum, allocation) => sum + toNumber(allocation.converted_amount),
          0,
        );
      const fundingCurrencyAmountCalculated =
        toNumber(distribution.funding_currency_amount) ||
        toNumber(distribution.metadata?.funding_currency_amount_used_for_payment) ||
        distributionAllocations.reduce(
          (sum, allocation) =>
            sum +
            toNumber(
              allocation.funding_currency_amount ||
                allocation.converted_amount ||
                allocation.allocated_amount,
            ),
          0,
        );

      return {
        ...distribution,
        recordType: "payment_distribution",
        fundingBatchNumber: fundingBatch?.batch_number || "Funding Pool",
        companyName: distribution.paid_from_company_id
          ? getCompanyName(companyMap.get(distribution.paid_from_company_id))
          : fundingBatch?.funding_company_id
            ? getCompanyName(companyMap.get(fundingBatch.funding_company_id))
            : "No company",
        bankLabel: distribution.paid_from_bank_account_id
          ? getBankLabel(bankAccountMap.get(distribution.paid_from_bank_account_id))
          : fundingBatch?.funding_bank_account_id
            ? getBankLabel(bankAccountMap.get(fundingBatch.funding_bank_account_id))
            : "No bank selected",
        allocationCount:
          Number(distribution.metadata?.allocation_count ?? distributionAllocations.length) || 0,
        allocatedRequestAmount,
        requestCoverageCurrencyCode,
        paymentCurrencyAmount,
        fundingCurrencyAmountCalculated,
      };
    });
  }, [allocationsByDistributionId, bankAccountMap, companyMap, fundingBatchMap, paymentDistributions]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredRequests = useMemo(() => {
    if (!normalizedSearch) return enrichedRequests;

    return enrichedRequests.filter((request) => {
      const content = [
        request.request_number,
        request.reference_number,
        request.employeeName,
        request.employeeLabel,
        request.employeeReference,
        request.employeeSearchText,
        request.companyName,
        request.payProfileLabel,
        request.periodLabel,
        request.requested_currency_code,
        request.status,
        request.review_status,
        request.documentation_status,
        request.signed_form_status,
        request.admin_signed_form_status,
        request.funding_status,
        request.payment_status,
        request.recipient_confirmation_status,
        request.nextStepLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(normalizedSearch);
    });
  }, [enrichedRequests, normalizedSearch]);

  const filteredFundingBatches = useMemo(() => {
    if (!normalizedSearch) return enrichedFundingBatches;

    return enrichedFundingBatches.filter((batch) => {
      const content = [
        batch.batch_number,
        batch.companyName,
        batch.bankLabel,
        batch.currency_code,
        batch.status,
        batch.documentation_status,
        batch.notes,
        getFundingPeriodLabel(batch),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(normalizedSearch);
    });
  }, [enrichedFundingBatches, normalizedSearch]);

  const filteredDistributions = useMemo(() => {
    if (!normalizedSearch) return enrichedDistributions;

    return enrichedDistributions.filter((distribution) => {
      const content = [
        distribution.distribution_number,
        distribution.reference_number,
        distribution.fundingBatchNumber,
        distribution.companyName,
        distribution.bankLabel,
        distribution.payment_currency_code,
        distribution.funding_currency_code,
        distribution.status,
        distribution.recipient_confirmation_status,
        distribution.payment_proof_status,
        distribution.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(normalizedSearch);
    });
  }, [enrichedDistributions, normalizedSearch]);

  const activeRequestRows = useMemo(() => filteredRequests.filter(isWorkflowActive), [filteredRequests]);
  const archivedRequestRows = useMemo(() => filteredRequests.filter(isWorkflowArchived), [filteredRequests]);
  const deletedRequestRows = useMemo(() => filteredRequests.filter(isWorkflowDeleted), [filteredRequests]);
  const activeFundingBatchRows = useMemo(() => filteredFundingBatches.filter(isExecutionActive), [filteredFundingBatches]);
  const archivedFundingBatchRows = useMemo(() => filteredFundingBatches.filter(isExecutionArchived), [filteredFundingBatches]);
  const deletedFundingBatchRows = useMemo(() => filteredFundingBatches.filter(isExecutionDeleted), [filteredFundingBatches]);
  const activeDistributionRows = useMemo(() => filteredDistributions.filter(isExecutionActive), [filteredDistributions]);
  const archivedDistributionRows = useMemo(() => filteredDistributions.filter(isExecutionArchived), [filteredDistributions]);
  const deletedDistributionRows = useMemo(() => filteredDistributions.filter(isExecutionDeleted), [filteredDistributions]);

  const archivedExecutionRows = useMemo<ExecutionRecord[]>(() => {
    return [...archivedFundingBatchRows, ...archivedDistributionRows].sort((a, b) =>
      String(b.updated_at || "").localeCompare(String(a.updated_at || "")),
    );
  }, [archivedFundingBatchRows, archivedDistributionRows]);

  const deletedExecutionRows = useMemo<ExecutionRecord[]>(() => {
    return [...deletedFundingBatchRows, ...deletedDistributionRows].sort((a, b) =>
      String(b.updated_at || "").localeCompare(String(a.updated_at || "")),
    );
  }, [deletedFundingBatchRows, deletedDistributionRows]);

  const paycheckRequestRows = useMemo(() => {
    return activeRequestRows.filter((request) =>
      ["draft", "submitted", "needs_correction"].includes(request.status),
    );
  }, [activeRequestRows]);

  const payrollDocumentRows = useMemo(() => {
    return activeRequestRows.filter(
      (request) =>
        ["missing", "not_uploaded", "uploaded", "linked", "files_and_links", "needs_correction"].includes(
          request.documentation_status || request.signed_form_status || "",
        ) ||
        ["not_uploaded", "uploaded", "linked", "files_and_links"].includes(
          request.admin_signed_form_status || "",
        ),
    );
  }, [activeRequestRows]);

  const payrollReviewRows = useMemo(() => {
    return activeRequestRows.filter(
      (request) =>
        ["submitted", "pending_review", "needs_correction", "approved_for_payroll", "rejected"].includes(
          request.status,
        ) || ["pending_review", "needs_correction", "approved", "rejected"].includes(request.review_status),
    );
  }, [activeRequestRows]);

  const readyForPaymentRows = useMemo(() => {
    return activeRequestRows.filter(
      (request) =>
        request.status === "approved_for_payroll" ||
        request.review_status === "approved" ||
        request.payment_status === "partially_paid",
    );
  }, [activeRequestRows]);

  const employeeConfirmationRows = useMemo(() => {
    return activeRequestRows.filter(
      (request) =>
        ["payment_sent", "received_confirmed", "disputed"].includes(request.status) ||
        ["payment_sent", "received_confirmed", "not_received", "disputed"].includes(
          request.recipient_confirmation_status || "",
        ) ||
        ["paid", "partially_paid"].includes(request.payment_status || ""),
    );
  }, [activeRequestRows]);

  const metrics = useMemo(() => {
    const pendingReview = activeRequestRows.filter(
      (request) => request.status === "submitted" || request.review_status === "pending_review",
    ).length;
    const documentIssues = activeRequestRows.filter(
      (request) =>
        request.documentation_status === "missing" ||
        request.signed_form_status === "needs_correction" ||
        request.admin_signed_form_status === "not_uploaded",
    ).length;
    const confirmationPending = activeRequestRows.filter(
      (request) =>
        request.recipient_confirmation_status === "payment_sent" ||
        request.recipient_confirmation_status === "pending_confirmation",
    ).length;
    const allocatedAmount = activeFundingBatchRows.reduce(
      (sum, batch) => sum + batch.allocatedAmount,
      0,
    );
    const usedAmount = activeFundingBatchRows.reduce((sum, batch) => sum + batch.usedAmount, 0);

    return {
      pendingReview,
      documentIssues,
      readyForPayment: readyForPaymentRows.length,
      confirmationPending,
      activeFundingBatches: activeFundingBatchRows.length,
      activeDistributions: activeDistributionRows.length,
      allocatedAmount,
      usedAmount,
      remainingAmount: allocatedAmount - usedAmount,
      workflowArchived: archivedRequestRows.length,
      workflowDeleted: deletedRequestRows.length,
      executionArchived: archivedExecutionRows.length,
      executionDeleted: deletedExecutionRows.length,
    };
  }, [
    activeDistributionRows.length,
    activeFundingBatchRows,
    activeRequestRows,
    archivedExecutionRows.length,
    archivedRequestRows.length,
    deletedExecutionRows.length,
    deletedRequestRows.length,
    readyForPaymentRows.length,
  ]);

  const activeTabMeta = allTabs.find((tab) => tab.key === activeTab) || allTabs[0];

  const loadPayrollControl = useCallback(
    async (mode: LoadMode = "initial") => {
      if (mode === "initial" && !hasLoadedOnce) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      if (mode === "initial") setPageError(null);

      try {
        const [
          requestsResult,
          employeesResult,
          employeeIdentityResult,
          payProfilesResult,
          companiesResult,
          bankAccountsResult,
          fundingBatchesResult,
          paymentDistributionsResult,
          paymentAllocationsResult,
        ] = await Promise.all([
          supabase
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
                "admin_signed_form_status",
                "submitted_at",
                "reviewed_at",
                "review_notes",
                "correction_notes",
                "rejected_reason",
                "approved_at",
                "linked_payroll_run_id",
                "linked_paycheck_id",
                "linked_payment_id",
                "linked_payment_distribution_id",
                "payment_sent_at",
                "payment_confirmed_at",
                "payment_disputed_at",
                "confirmation_notes",
                "funding_status",
                "payment_status",
                "paid_amount",
                "remaining_amount",
                "notes",
                "metadata",
                "reference_number",
                "created_at",
                "updated_at",
              ].join(", "),
            )
            .order("updated_at", { ascending: false })
            .limit(500),
          supabase
            .from("finance_employee_refs")
            .select("id, user_id, code, status, mark, metadata")
            .order("code", { ascending: true }),
          supabase.from("finance_employee_identity_v").select("*"),
          supabase
            .from("finance_pay_profiles")
            .select(
              "id, profile_number, user_id, pay_type, payment_frequency, base_salary, hourly_rate, default_hours, currency_code, active, status",
            )
            .order("created_at", { ascending: false }),
          supabase
            .from("finance_companies")
            .select("id, name, legal_name")
            .order("name", { ascending: true }),
          supabase
            .from("finance_bank_accounts")
            .select(
              "id, code, name, account_type, institution_name, masked_account_number, status, beneficiary_name, currency_code, swift_code, iban, bank_name, company_id",
            )
            .order("name", { ascending: true }),
          supabase
            .from("finance_paycheck_funding_batches")
            .select(
              [
                "id",
                "batch_number",
                "funding_company_id",
                "funding_bank_account_id",
                "allocation_date",
                "period_start",
                "period_end",
                "currency_code",
                "allocated_amount",
                "status",
                "documentation_status",
                "notes",
                "metadata",
                "created_at",
                "updated_at",
              ].join(", "),
            )
            .order("updated_at", { ascending: false })
            .limit(300),
          supabase
            .from("finance_paycheck_payment_distributions")
            .select(
              [
                "id",
                "distribution_number",
                "funding_batch_id",
                "payment_date",
                "status",
                "paid_from_company_id",
                "paid_from_bank_account_id",
                "amount",
                "payment_currency_code",
                "funding_currency_code",
                "funding_currency_amount",
                "exchange_rate",
                "exchange_rate_source",
                "exchange_rate_date",
                "reference_number",
                "recipient_employee_ref_id",
                "recipient_person_name",
                "recipient_confirmation_status",
                "payment_proof_status",
                "notes",
                "metadata",
                "created_at",
                "updated_at",
              ].join(", "),
            )
            .order("updated_at", { ascending: false })
            .limit(300),
          supabase
            .from("finance_paycheck_payment_allocations")
            .select(
              [
                "id",
                "distribution_id",
                "paycheck_request_id",
                "funding_batch_id",
                "paycheck_id",
                "payroll_payment_id",
                "employee_ref_id",
                "employee_user_id",
                "company_id",
                "funding_company_id",
                "paid_from_bank_account_id",
                "recipient_person_name",
                "allocated_amount",
                "currency_code",
                "payment_currency_code",
                "converted_amount",
                "funding_currency_code",
                "funding_currency_amount",
                "exchange_rate",
                "conversion_source",
                "conversion_date",
                "recipient_confirmation_status",
                "created_at",
                "updated_at",
              ].join(", "),
            )
            .limit(1000),
        ]);

        if (requestsResult.error) throw requestsResult.error;
        if (employeesResult.error) throw employeesResult.error;
        if (employeeIdentityResult.error) throw employeeIdentityResult.error;
        if (payProfilesResult.error) throw payProfilesResult.error;
        if (companiesResult.error) throw companiesResult.error;
        if (bankAccountsResult.error) throw bankAccountsResult.error;
        if (fundingBatchesResult.error) throw fundingBatchesResult.error;
        if (paymentDistributionsResult.error) throw paymentDistributionsResult.error;
        if (paymentAllocationsResult.error) throw paymentAllocationsResult.error;

        setRequests((requestsResult.data || []) as unknown as PaycheckRequestRow[]);
        setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
        setEmployeeIdentities(
          (employeeIdentityResult.data || []) as unknown as FinanceEmployeeIdentity[],
        );
        setPayProfiles((payProfilesResult.data || []) as unknown as PayProfileRow[]);
        setCompanies((companiesResult.data || []) as CompanyRow[]);
        setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[]);
        setFundingBatches((fundingBatchesResult.data || []) as unknown as FundingBatchRow[]);
        setPaymentDistributions(
          (paymentDistributionsResult.data || []) as unknown as PaymentDistributionRow[],
        );
        setPaymentAllocations(
          (paymentAllocationsResult.data || []) as unknown as PaymentAllocationRow[],
        );
        setHasLoadedOnce(true);
      } catch (error) {
        console.error("Failed to load payroll control:", error);
        if (mode === "initial" || !hasLoadedOnce) {
          setPageError(error instanceof Error ? error.message : "Failed to load payroll control.");
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [hasLoadedOnce],
  );

  useEffect(() => {
    void loadPayrollControl("initial");
  }, [loadPayrollControl]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-payroll-control-workbench")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paycheck_requests" },
        () => void loadPayrollControl("silent"),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_employee_identity_v" },
        () => void loadPayrollControl("silent"),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paycheck_funding_batches" },
        () => void loadPayrollControl("silent"),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_paycheck_payment_distributions",
        },
        () => void loadPayrollControl("silent"),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_paycheck_payment_allocations",
        },
        () => void loadPayrollControl("silent"),
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPayrollControl("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadPayrollControl]);

  const runRpcAction = useCallback(
    async (rpcName: string, args: Record<string, string>, successMessage: string) => {
      if (isRunningAction) return;

      setIsRunningAction(true);
      setPageError(null);
      setPageMessage(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) {
          throw new Error("You must be signed in to perform this action.");
        }

        const result = await supabase.rpc(rpcName, {
          ...args,
          p_actor_user_id: user.id,
        });

        if (result.error) throw result.error;

        setPageMessage(successMessage);
        await loadPayrollControl("silent");
      } catch (error) {
        console.error(`Failed to run ${rpcName}:`, error);
        setPageError(error instanceof Error ? error.message : "Action failed.");
      } finally {
        setIsRunningAction(false);
      }
    },
    [isRunningAction, loadPayrollControl],
  );

  const runWorkflowAction = useCallback(
    async (action: "archive" | "delete" | "restore" | "hard_delete", requestId: string) => {
      const rpcMap = {
        archive: "finance_archive_paycheck_request",
        delete: "finance_delete_paycheck_request",
        restore: "finance_restore_paycheck_request",
        hard_delete: "finance_hard_delete_paycheck_request",
      };
      const messageMap = {
        archive: "Paycheck request moved to Workflow Archive.",
        delete: "Paycheck request moved to Deleted Workflow records.",
        restore: "Paycheck request restored.",
        hard_delete: "Paycheck request permanently deleted.",
      };

      await runRpcAction(rpcMap[action], { p_request_id: requestId }, messageMap[action]);
    },
    [runRpcAction],
  );

  const runExecutionAction = useCallback(
    async (action: "archive" | "delete" | "restore" | "hard_delete", record: ExecutionRecord) => {
      const isBatch = record.recordType === "funding_batch";
      const rpcMap = {
        archive: isBatch
          ? "finance_archive_paycheck_funding_batch"
          : "finance_archive_paycheck_payment_distribution",
        delete: isBatch
          ? "finance_delete_paycheck_funding_batch"
          : "finance_delete_paycheck_payment_distribution",
        restore: isBatch
          ? "finance_restore_paycheck_funding_batch"
          : "finance_restore_paycheck_payment_distribution",
        hard_delete: isBatch
          ? "finance_hard_delete_paycheck_funding_batch"
          : "finance_hard_delete_paycheck_payment_distribution",
      };
      const args: Record<string, string> = isBatch
        ? { p_batch_id: record.id }
        : { p_distribution_id: record.id };
      const messageMap = {
        archive: isBatch
          ? "Payroll funding allocation moved to Payment Execution Archive."
          : "Paycheck payment distribution moved to Payment Execution Archive.",
        delete: isBatch
          ? "Payroll funding allocation moved to Deleted Payment Execution records."
          : "Paycheck payment distribution moved to Deleted Payment Execution records.",
        restore: isBatch
          ? "Payroll funding allocation restored."
          : "Paycheck payment distribution restored.",
        hard_delete: isBatch
          ? "Payroll funding allocation permanently deleted."
          : "Paycheck payment distribution permanently deleted.",
      };

      await runRpcAction(rpcMap[action], args, messageMap[action]);
    },
    [runRpcAction],
  );

  const openArchiveModal = useCallback((scope: ArchiveScope) => {
    setArchiveScope(scope);
    setArchiveTab("archived");
    setArchiveModalOpen(true);
  }, []);

  const openRequest = useCallback(
    (requestId: string) => navigate(`/finance/transactions/payroll/review/${requestId}`),
    [navigate],
  );

  const openExecutionRecord = useCallback(
    (record: ExecutionRecord) => {
      const route =
        record.recordType === "funding_batch"
          ? `/finance/transactions/payroll/funding-batches/${record.id}`
          : `/finance/transactions/payroll/${record.id}`;
      navigate(route);
    },
    [navigate],
  );

  const workflowArchiveRows = archiveTab === "archived" ? archivedRequestRows : deletedRequestRows;
  const executionArchiveRows =
    archiveTab === "archived" ? archivedExecutionRows : deletedExecutionRows;

  const activeRows = (() => {
    switch (activeTab) {
      case "paycheck_requests":
        return (
          <RequestTable
            rows={paycheckRequestRows}
            mode="active"
            archiveTab={archiveTab}
            isRunningAction={isRunningAction}
            onOpen={openRequest}
            onArchive={(id) => void runWorkflowAction("archive", id)}
            onDelete={(id) => void runWorkflowAction("delete", id)}
            onRestore={(id) => void runWorkflowAction("restore", id)}
            onHardDelete={(id) => void runWorkflowAction("hard_delete", id)}
          />
        );
      case "payroll_documents":
        return (
          <RequestTable
            rows={payrollDocumentRows}
            mode="active"
            archiveTab={archiveTab}
            isRunningAction={isRunningAction}
            onOpen={openRequest}
            onArchive={(id) => void runWorkflowAction("archive", id)}
            onDelete={(id) => void runWorkflowAction("delete", id)}
            onRestore={(id) => void runWorkflowAction("restore", id)}
            onHardDelete={(id) => void runWorkflowAction("hard_delete", id)}
          />
        );
      case "payroll_review":
        return (
          <RequestTable
            rows={payrollReviewRows}
            mode="active"
            archiveTab={archiveTab}
            isRunningAction={isRunningAction}
            onOpen={openRequest}
            onArchive={(id) => void runWorkflowAction("archive", id)}
            onDelete={(id) => void runWorkflowAction("delete", id)}
            onRestore={(id) => void runWorkflowAction("restore", id)}
            onHardDelete={(id) => void runWorkflowAction("hard_delete", id)}
          />
        );
      case "ready_for_payment":
        return (
          <RequestTable
            rows={readyForPaymentRows}
            mode="active"
            archiveTab={archiveTab}
            isRunningAction={isRunningAction}
            onOpen={openRequest}
            onArchive={(id) => void runWorkflowAction("archive", id)}
            onDelete={(id) => void runWorkflowAction("delete", id)}
            onRestore={(id) => void runWorkflowAction("restore", id)}
            onHardDelete={(id) => void runWorkflowAction("hard_delete", id)}
          />
        );
      case "employee_confirmation":
        return (
          <RequestTable
            rows={employeeConfirmationRows}
            mode="active"
            archiveTab={archiveTab}
            isRunningAction={isRunningAction}
            onOpen={openRequest}
            onArchive={(id) => void runWorkflowAction("archive", id)}
            onDelete={(id) => void runWorkflowAction("delete", id)}
            onRestore={(id) => void runWorkflowAction("restore", id)}
            onHardDelete={(id) => void runWorkflowAction("hard_delete", id)}
          />
        );
      case "funding_batches":
        return (
          <ExecutionTable
            rows={activeFundingBatchRows}
            mode="active"
            archiveTab={archiveTab}
            isRunningAction={isRunningAction}
            onOpen={openExecutionRecord}
            onArchive={(record) => void runExecutionAction("archive", record)}
            onDelete={(record) => void runExecutionAction("delete", record)}
            onRestore={(record) => void runExecutionAction("restore", record)}
            onHardDelete={(record) => void runExecutionAction("hard_delete", record)}
          />
        );
      case "payment_distributions":
      default:
        return (
          <ExecutionTable
            rows={activeDistributionRows}
            mode="active"
            archiveTab={archiveTab}
            isRunningAction={isRunningAction}
            onOpen={openExecutionRecord}
            onArchive={(record) => void runExecutionAction("archive", record)}
            onDelete={(record) => void runExecutionAction("delete", record)}
            onRestore={(record) => void runExecutionAction("restore", record)}
            onHardDelete={(record) => void runExecutionAction("hard_delete", record)}
          />
        );
    }
  })();

  if (isLoading && !hasLoadedOnce) {
    return (
      <AixiaLoadingState
        title="Loading payroll control"
        description="Paycheck workflow, employee identity, funding pools, payment distributions, and archive controls are being loaded."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Transactions"
        parentPath="/finance/transactions"
        badges={[
          { label: "Payroll Control", tone: "cyan" },
          { label: "Main Workflow", tone: "emerald" },
          { label: "Payment Execution Tools", tone: "violet" },
          ...(isRefreshing ? [{ label: "Syncing", tone: "neutral" as const }] : []),
        ]}
        gradientTitle="Payroll"
        title="Paycheck Workflow & Payment Execution"
        description="The payroll equivalent of the operating expense workbench. Track paycheck requests, payroll documents, Finance review, payment readiness, funding pools, payment distributions, and employee confirmation in one control page."
        statusCards={[
          {
            label: "Ready to Pay",
            value: metrics.readyForPayment.toLocaleString(),
            description: "Approved paycheck requests waiting for payroll payment distribution.",
            icon: CheckCircle2,
            tone: "emerald",
          },
          {
            label: "Remaining Funds",
            value: formatMoney(metrics.remainingAmount),
            description: "Active payroll funding pools minus confirmed paycheck distributions.",
            icon: WalletCards,
            tone: "cyan",
          },
        ]}
      />

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Pending Review"
          value={metrics.pendingReview.toLocaleString()}
          description="Submitted paycheck requests waiting for Finance/Admin decision."
          icon={Clock3}
          tone="amber"
        />
        <AixiaMetricCard
          label="Payroll Docs"
          value={metrics.documentIssues.toLocaleString()}
          description="Missing, incomplete, or pending payroll documentation records."
          icon={FileText}
          tone="rose"
        />
        <AixiaMetricCard
          label="Funding Pools"
          value={metrics.activeFundingBatches.toLocaleString()}
          description="Active payroll funding pools available for payment distribution."
          icon={Archive}
          tone="violet"
        />
        <AixiaMetricCard
          label="Employee Pending"
          value={metrics.confirmationPending.toLocaleString()}
          description="Employees waiting to confirm payment received or report a problem."
          icon={ShieldCheck}
          tone="cyan"
        />
      </AixiaMetricGrid>

      <AixiaAccessRule
        title="Payroll Control Access Rule"
        description="Payroll workflow and payment execution records use shared Finance registry, archive, table, action, and employee identity source-of-truth components."
      >
        This page loads finance_employee_refs together with finance_employee_identity_v and displays employees through the global employee identity helper/component. Archive and delete behavior stays split between workflow records and execution records.
      </AixiaAccessRule>

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaSection
        title={activeTabMeta.label}
        description={activeTabMeta.description}
        icon={WalletCards}
        badge={<AixiaBadge tone="cyan">Payroll Workbench</AixiaBadge>}
        actions={
          <AixiaRegistryToolbar
            search={
              <AixiaSearchField
                width="wide"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search workflow or payment execution..."
              />
            }
            secondaryActions={
              <>
                <AixiaButton
                  type="button"
                  variant="danger"
                  onClick={() => openArchiveModal("workflow")}
                >
                  <Archive className="h-4 w-4" />
                  Workflow Archive
                </AixiaButton>
                <AixiaButton
                  type="button"
                  variant="danger"
                  onClick={() => openArchiveModal("execution")}
                >
                  <WalletCards className="h-4 w-4" />
                  Execution Archive
                </AixiaButton>
              </>
            }
            primaryAction={
              <>
                <AixiaButton
                  type="button"
                  variant="primary"
                  onClick={() => navigate("/finance/transactions/payroll/funding-batches/new")}
                >
                  <Archive className="h-4 w-4" />
                  Allocate Payroll Funds
                </AixiaButton>
                <AixiaButton
                  type="button"
                  variant="primary"
                  onClick={() => navigate("/finance/transactions/payroll/new")}
                >
                  <WalletCards className="h-4 w-4" />
                  Distribute Paycheck Payments
                </AixiaButton>
              </>
            }
          />
        }
      >
        <AixiaSection
          title="Main Paycheck Workflow"
          description="Switch between the workflow stages before payment execution."
          icon={FileText}
        >
          <PayrollTabButtons
            tabs={mainWorkflowTabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </AixiaSection>

        <AixiaSection
          title="Payment Execution Tools"
          description="Switch between payroll funding pools and paycheck payment distributions."
          icon={WalletCards}
        >
          <PayrollTabButtons
            tabs={executionTabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </AixiaSection>

        {activeRows}
      </AixiaSection>

      <AixiaArchiveManagerModal
        open={archiveModalOpen}
        title={
          archiveScope === "workflow"
            ? "Paycheck Workflow Archive"
            : "Payment Execution Archive"
        }
        description={
          archiveScope === "workflow"
            ? "Workflow archive contains paycheck request records only."
            : "Payment execution archive contains payroll funding pools and paycheck payment distributions only."
        }
        archivedCount={archiveScope === "workflow" ? metrics.workflowArchived : metrics.executionArchived}
        deletedCount={archiveScope === "workflow" ? metrics.workflowDeleted : metrics.executionDeleted}
        countLabel={archiveScope === "workflow" ? "Workflow Records" : "Execution Records"}
        activeTab={archiveTab}
        onTabChange={setArchiveTab}
        onClose={() => setArchiveModalOpen(false)}
        maxWidthClassName="max-w-[1500px]"
      >
        {archiveScope === "workflow" ? (
          <RequestTable
            rows={workflowArchiveRows}
            mode="archive"
            archiveTab={archiveTab}
            isRunningAction={isRunningAction}
            onOpen={openRequest}
            onArchive={(id) => void runWorkflowAction("archive", id)}
            onDelete={(id) => void runWorkflowAction("delete", id)}
            onRestore={(id) => void runWorkflowAction("restore", id)}
            onHardDelete={(id) => void runWorkflowAction("hard_delete", id)}
          />
        ) : (
          <ExecutionTable
            rows={executionArchiveRows}
            mode="archive"
            archiveTab={archiveTab}
            isRunningAction={isRunningAction}
            onOpen={openExecutionRecord}
            onArchive={(record) => void runExecutionAction("archive", record)}
            onDelete={(record) => void runExecutionAction("delete", record)}
            onRestore={(record) => void runExecutionAction("restore", record)}
            onHardDelete={(record) => void runExecutionAction("hard_delete", record)}
          />
        )}
      </AixiaArchiveManagerModal>
    </AixiaPage>
  );
}
