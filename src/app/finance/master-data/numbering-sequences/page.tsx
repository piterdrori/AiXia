import { useCallback, useEffect, useMemo, useState } from "react";
import { Hash, ShieldCheck } from "lucide-react";

import {
  AixiaAccessDeniedState,
  AixiaAccessRule,
  AixiaBadge,
  AixiaEmptyState,
  AixiaHero,
  AixiaLoadingState,
  FinancePage,
  AixiaRegistryToolbar,
  AixiaSearchField,
  AixiaSection,
  AixiaStatusBadge,
  AixiaTableShell,
  AixiaTableTextCell,
} from "@/components/aixia";
import {
  fetchFinanceEffectivePermissions,
  resolveFinancePagePermissionState,
  type FinanceLoadMode,
} from "@/lib/finance/pageAccess";
import type { Permission, Role } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

type LoadMode = FinanceLoadMode;

type ProfilePermissionRow = {
  role: Role | null;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type NumberingSequenceRow = {
  id: string;
  document_type: string;
  prefix: string | null;
  next_number: number | null;
  padding_length: number | null;
  suffix: string | null;
  status: string | null;
  updated_at: string | null;
};

type PlaceholderSequenceRow = {
  document_type: string;
  label: string;
  prefix: string;
  next_number: string;
  status: string;
};

const PAGE_ACCESS_CONFIG = {
  sectionKey: "masterData",
  adminPermissions: ["manageFinanceMasterData"],
  readPermissions: ["accessFinance", "viewFinance", "manageFinanceMasterData"],
  createPermissions: ["createFinanceRecords", "manageFinanceMasterData"],
  updatePermissions: ["editFinanceRecords", "manageFinanceMasterData"],
  deleteArchivePermissions: ["archiveFinanceRecords", "manageFinanceMasterData"],
} as const;

const PLACEHOLDER_DOCUMENT_TYPES: PlaceholderSequenceRow[] = [
  { document_type: "quotation", label: "Quotation", prefix: "QT-", next_number: "—", status: "placeholder" },
  { document_type: "customer_po", label: "Customer PO", prefix: "CPO-", next_number: "—", status: "placeholder" },
  { document_type: "proforma_invoice", label: "Proforma Invoice", prefix: "PFI-", next_number: "—", status: "placeholder" },
  { document_type: "invoice", label: "Invoice", prefix: "INV-", next_number: "—", status: "placeholder" },
  { document_type: "payment_received", label: "Payment Received", prefix: "PR-", next_number: "—", status: "placeholder" },
  { document_type: "vendor_quotation", label: "Vendor Quotation", prefix: "VQ-", next_number: "—", status: "placeholder" },
  { document_type: "purchase_order", label: "Purchase Order", prefix: "PO-", next_number: "—", status: "placeholder" },
  { document_type: "bill", label: "Bill / Vendor PI", prefix: "BILL-", next_number: "—", status: "placeholder" },
  { document_type: "payment_made", label: "Payment Made", prefix: "PM-", next_number: "—", status: "placeholder" },
  { document_type: "expense", label: "Expense", prefix: "EXP-", next_number: "—", status: "placeholder" },
  { document_type: "payroll", label: "Payroll", prefix: "PAY-", next_number: "—", status: "placeholder" },
];

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

export default function FinanceNumberingSequencesPage() {
  const [profileRole, setProfileRole] = useState<Role | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Partial<Record<Permission, boolean>> | null>(null);
  const [rows, setRows] = useState<NumberingSequenceRow[]>([]);
  const [usesBackendTable, setUsesBackendTable] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [, setBackgroundRefreshing] = useState(false);

  const permissionState = useMemo(() => {
    return resolveFinancePagePermissionState({
      profileRole,
      permissions: effectivePermissions,
      config: PAGE_ACCESS_CONFIG,
    });
  }, [effectivePermissions, profileRole]);

  const loadPermissions = useCallback(async (mode: LoadMode = "initial") => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) return;

    const profileResult = await supabase
      .from("profiles")
      .select("role, permissions")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileResult.error) {
      if (mode === "initial") {
        setProfileRole(null);
        setEffectivePermissions(null);
      }
      return;
    }

    const typedProfile = (profileResult.data || null) as ProfilePermissionRow | null;
    const permissions = await fetchFinanceEffectivePermissions(
      user.id,
      mode,
      "NumberingSequences",
    );

    if (typedProfile?.role) setProfileRole(typedProfile.role);
    if (permissions) setEffectivePermissions(permissions);
  }, []);

  const loadRows = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoading(true);
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const result = await supabase
        .from("finance_document_number_sequences")
        .select(
          "id, document_type, prefix, next_number, padding_length, suffix, status, updated_at",
        )
        .order("document_type", { ascending: true });

      if (result.error) {
        setUsesBackendTable(false);
        setRows([]);
        return;
      }

      setUsesBackendTable(true);
      setRows((result.data || []) as NumberingSequenceRow[]);
    } catch {
      setUsesBackendTable(false);
      if (mode === "initial") {
        setRows([]);
      }
    } finally {
      if (mode === "initial") {
        setIsLoading(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  const loadPage = useCallback(
    async (mode: LoadMode = "initial") => {
      await Promise.all([loadPermissions(mode), loadRows(mode)]);
    },
    [loadPermissions, loadRows],
  );

  useEffect(() => {
    void loadPage("initial");
  }, [loadPage]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-numbering-sequences-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_document_number_sequences" },
        () => void loadRows("silent"),
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPage("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadPage, loadRows]);

  const displayRows = useMemo(() => {
    if (usesBackendTable && rows.length > 0) {
      return rows.map((row) => ({
        key: row.id,
        documentType: row.document_type,
        label: row.document_type,
        prefix: row.prefix || "—",
        nextNumber: row.next_number?.toLocaleString() || "—",
        status: row.status || "active",
        updatedAt: row.updated_at,
      }));
    }

    return PLACEHOLDER_DOCUMENT_TYPES.map((row) => ({
      key: row.document_type,
      documentType: row.document_type,
      label: row.label,
      prefix: row.prefix,
      nextNumber: row.next_number,
      status: row.status,
      updatedAt: null as string | null,
    }));
  }, [rows, usesBackendTable]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return displayRows;

    return displayRows.filter((row) => {
      return [row.label, row.documentType, row.prefix, row.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [displayRows, search]);

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading Numbering Sequences"
/>
    );
  }

  if (!permissionState.canRead) {
    return (
      <AixiaAccessDeniedState
        title="No numbering-sequence access"
/>
    );
  }

  return (
    <FinancePage className="aixia-finance-page">
      <AixiaHero
        className="shrink-0 space-y-4"
        surface="command"
        parentLabel="Master Data"
        parentPath="/finance/master-data"
        gradientTitle="Numbering"
        title="Sequences"
        subtitle="Finance Document Registry"
/>

      <div className="aixia-command-scroll">
<AixiaAccessRule
        title="Registry rule"
        description="Finance document numbering sequences control how transaction and master-data records receive their official numbers."
        icon={ShieldCheck}
      >
        {usesBackendTable
          ? "Live rows are read from finance_document_number_sequences."
          : "Backend numbering table is not available yet. Showing configured finance document types with placeholder next numbers."}
      </AixiaAccessRule>

      <AixiaSection
        title="Document Numbering Registry"
icon={Hash}
      >
        <AixiaRegistryToolbar
          search={
            <AixiaSearchField
              width="wide"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search document types..."
            />
          }
          secondaryActions={
            !usesBackendTable ? (
              <AixiaBadge tone="amber">Placeholder mode</AixiaBadge>
            ) : null
          }
        />

        {filteredRows.length === 0 ? (
          <AixiaEmptyState
            icon={Hash}
            title="No matching document types"
            description="Adjust the search filter or wait for numbering sequences to load."
          />
        ) : (
          <AixiaTableShell>
            <table>
              <thead>
                <tr>
                  <th>Document Type</th>
                  <th>Prefix</th>
                  <th>Next Number</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.key}>
                    <AixiaTableTextCell primary={row.label} secondary={row.documentType} />
                    <AixiaTableTextCell primary={row.prefix} />
                    <AixiaTableTextCell primary={row.nextNumber} />
                    <td>
                      <AixiaStatusBadge value={row.status} />
                    </td>
                    <AixiaTableTextCell primary={formatDateLabel(row.updatedAt)} />
                  </tr>
                ))}
              </tbody>
            </table>
          </AixiaTableShell>
        )}
      </AixiaSection>
      </div>
    </FinancePage>
  );
}
