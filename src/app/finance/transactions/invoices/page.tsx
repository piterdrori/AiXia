import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Wallet,
  MoreVertical,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

import {
  formatFinanceDate,
  formatFinanceMoney,
  getInvoiceDisplayState,
  getInvoicePostingStatus,
  getIssuedInvoicePaymentStatusLabel,
  getIssuedInvoiceStatusLabel,
  getIssuedInvoicesArchiveList,
  getIssuedInvoicesList,
  isInvoiceOverdue,
  type FinanceIssuedInvoiceListRow,
  type InvoicePostingStatus,
} from "@/lib/finance/invoicesIssued";

import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type InvoiceMetricCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Wallet;
  tone: "blue" | "emerald" | "amber" | "rose";
};

function getToneClasses(tone: InvoiceMetricCard["tone"]) {
  switch (tone) {
    case "emerald":
      return {
        glow: "from-emerald-500/20 via-emerald-400/10 to-transparent",
        iconWrap:
          "border-emerald-400/20 bg-emerald-500/10 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.18)]",
        accent: "bg-emerald-400",
      };
    case "amber":
      return {
        glow: "from-amber-500/20 via-amber-400/10 to-transparent",
        iconWrap:
          "border-amber-400/20 bg-amber-500/10 text-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.18)]",
        accent: "bg-amber-400",
      };
    case "rose":
      return {
        glow: "from-rose-500/20 via-rose-400/10 to-transparent",
        iconWrap:
          "border-rose-400/20 bg-rose-500/10 text-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.18)]",
        accent: "bg-rose-400",
      };
    case "blue":
    default:
      return {
        glow: "from-sky-500/20 via-sky-400/10 to-transparent",
        iconWrap:
          "border-sky-400/20 bg-sky-500/10 text-sky-300 shadow-[0_0_30px_rgba(56,189,248,0.18)]",
        accent: "bg-sky-400",
      };
  }
}

function MetricCard({ metric }: { metric: InvoiceMetricCard }) {
  const tone = getToneClasses(metric.tone);
  const Icon = metric.icon;

  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.glow}`}
      />
      <div className="relative flex h-full flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">
              {metric.title}
            </div>
            <div className="text-3xl font-semibold tracking-tight text-white">
              {metric.value}
            </div>
          </div>

          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${tone.iconWrap}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="text-sm text-white/55">{metric.subtitle}</div>
          <div className={`h-2 w-2 rounded-full ${tone.accent}`} />
        </div>
      </div>
    </div>
  );
}

function getDocumentStatusBadgeClasses(status: string) {
  switch (status) {
    case "draft":
      return "border-white/10 bg-white/10 text-white/75";

    case "issued":
      return "border-sky-400/20 bg-sky-500/10 text-sky-200";

    case "partially_paid":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";

    case "paid":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";

    case "overdue":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";

    case "cancelled":
      return "border-gray-400/20 bg-gray-500/10 text-gray-200";

    case "archived":
  return "border-white/20 bg-white/5 text-white/60";

   case "deleted":
  return "border-rose-500/30 bg-rose-500/10 text-rose-300";

    default:
      return "border-white/10 bg-white/10 text-white/75";
  }
}

function getPaymentStatusBadgeClasses(
  status: FinanceIssuedInvoiceListRow["payment_status"]
) {
  switch (status) {
    case "paid":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "partial":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "unpaid":
    default:
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
  }
}

function getPostingStatusBadgeClasses(status: InvoicePostingStatus) {
  if (status === "posted") {
    return "border-violet-400/20 bg-violet-500/10 text-violet-200";
  }

  return "border-white/10 bg-white/10 text-white/75";
}

function getPostingStatusLabel(status: InvoicePostingStatus) {
  return status === "posted" ? "Posted" : "Not posted";
}

function getOverdueBadgeClasses() {
  return "border-rose-400/20 bg-rose-500/10 text-rose-200";
}

export default function FinanceInvoicesPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [invoices, setInvoices] = useState<FinanceIssuedInvoiceListRow[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);

  const [openMenuInvoiceId, setOpenMenuInvoiceId] = useState<string | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<"archived" | "deleted">("archived");
  const [archivedInvoices, setArchivedInvoices] = useState<FinanceIssuedInvoiceListRow[]>([]);
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);


  const loadPermissions = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("role, permissions")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load invoice permissions:", error);
      return;
    }

    if (data) {
      const typed = data as ProfilePermissionRow;
      setRole(typed.role);
      setPermissionOverrides(typed.permissions || null);
    }
  }, []);

  const loadInvoices = useCallback(async (refreshMode = false) => {
    if (refreshMode) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const rows = await getIssuedInvoicesList();
      setInvoices(rows);
    } catch (error) {
      console.error("Failed to load issued invoices:", error);
      setInvoices([]);
    } finally {
      if (refreshMode) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  const loadArchivedInvoices = useCallback(async () => {
  setIsArchiveLoading(true);

  try {
    const rows = await getIssuedInvoicesArchiveList();
    setArchivedInvoices(rows);
  } catch (error) {
    console.error("Failed to load archived invoices:", error);
    setArchivedInvoices([]);
  } finally {
    setIsArchiveLoading(false);
  }
}, []);

  useEffect(() => {
    void Promise.all([loadPermissions(), loadInvoices()]);
  }, [loadInvoices, loadPermissions]);

 useEffect(() => {
  function handleDocumentClick(event: MouseEvent) {
    if (!actionsMenuRef.current) return;

    if (!actionsMenuRef.current.contains(event.target as Node)) {
      setOpenMenuInvoiceId(null);
    }
  }

  document.addEventListener("mousedown", handleDocumentClick);

  return () => {
    document.removeEventListener("mousedown", handleDocumentClick);
  };
}, []);
  
 
  useEffect(() => {
  if (!isArchiveModalOpen) return;
  void loadArchivedInvoices();
}, [isArchiveModalOpen, loadArchivedInvoices]);
  
  useEffect(() => {
    const channel = supabase
      .channel("finance-issued-invoices-list")
           .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_invoices_issued" },
        () => {
          void loadInvoices(true);
          if (isArchiveModalOpen) {
            void loadArchivedInvoices();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payments_received" },
        () => void loadInvoices(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isArchiveModalOpen, loadArchivedInvoices, loadInvoices]);

   const canCreateInvoices = useMemo(() => {
    if (!role) return false;
    const permissions = getEffectivePermissions(role, permissionOverrides);
    return !!permissions?.createInvoices;
  }, [permissionOverrides, role]);

     const handleArchive = async (id: string) => {
    const { error } = await supabase.rpc("finance_archive_invoice_issued", {
      p_invoice_id: id,
    });

    if (error) {
      throw error;
    }

    setOpenMenuInvoiceId(null);
    await Promise.all([
      loadInvoices(true),
      isArchiveModalOpen ? loadArchivedInvoices() : Promise.resolve(),
    ]);
  };

const handleDelete = async (id: string) => {
  const { error } = await supabase.rpc("finance_delete_invoice_issued", {
    p_invoice_id: id,
  });

  if (error) {
    throw error;
  }

  setOpenMenuInvoiceId(null);
  await Promise.all([
    loadInvoices(true),
    isArchiveModalOpen ? loadArchivedInvoices() : Promise.resolve(),
  ]);
};

    const handleRestore = async (id: string) => {
    const { error } = await supabase.rpc("finance_restore_invoice_issued", {
      p_invoice_id: id,
    });

    if (error) {
      throw error;
    }

    await Promise.all([loadInvoices(true), loadArchivedInvoices()]);
  };
    const handleHardDelete = async (id: string) => {
       const { error } = await supabase.rpc("finance_hard_delete_invoice_issued", {
      p_invoice_id: id,
    });

    if (error) {
      throw error;
    }

    await Promise.all([loadInvoices(true), loadArchivedInvoices()]);
  };

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return invoices;
    }

   return invoices.filter((invoice) => {
      const postingStatus = getInvoicePostingStatus(invoice as any);
      const overdue = isInvoiceOverdue(invoice as any);

      return (
        (invoice.invoice_number || "").toLowerCase().includes(normalizedSearch) ||
        (invoice.client_name || "").toLowerCase().includes(normalizedSearch) ||
        (invoice.status || "").toLowerCase().includes(normalizedSearch) ||
        (invoice.payment_status || "").toLowerCase().includes(normalizedSearch) ||
        postingStatus.toLowerCase().includes(normalizedSearch) ||
        (overdue ? "overdue".includes(normalizedSearch) : false)
      );
    });
  }, [invoices, search]);

 const visibleArchivedInvoices = useMemo(() => {
  return archivedInvoices.filter(
    (invoice) => String(invoice.status) === archiveTab
  );
}, [archivedInvoices, archiveTab]);
  
  const metricCards = useMemo<InvoiceMetricCard[]>(() => {
    const totalInvoices = invoices.length;
    const draftInvoices = invoices.filter((row) => row.status === "draft").length;
    const unpaidInvoices = invoices.filter(
      (row) => row.payment_status === "unpaid"
    );
    const partialInvoices = invoices.filter(
      (row) => row.payment_status === "partial"
    );
   const receivablesOpen = invoices.filter((row) => row.status !== "archived" && row.status !== "deleted").reduce(
      (sum, row) => sum + Number(row.balance_due ?? 0),
      0
    );

    return [
      {
        key: "total",
        title: "Invoices",
        value: totalInvoices.toLocaleString(),
        subtitle: "Outbound invoice records",
        icon: FileText,
        tone: "blue",
      },
      {
        key: "drafts",
        title: "Drafts",
        value: draftInvoices.toLocaleString(),
        subtitle: "Invoices not yet issued",
        icon: Receipt,
        tone: "amber",
      },
      {
        key: "open",
        title: "Open Receivables",
        value: formatFinanceMoney(receivablesOpen, invoices[0]?.currency_code || "USD"),
        subtitle: `${unpaidInvoices.length + partialInvoices.length} invoices with balance`,
        icon: Wallet,
        tone: "emerald",
      },
      {
        key: "paid",
        title: "Paid Invoices",
        value: invoices
          .filter((row) => row.payment_status === "paid")
          .length.toLocaleString(),
        subtitle: "Fully collected invoices",
        icon: Receipt,
        tone: "rose",
      },
    ];
  }, [invoices]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 pb-8 pt-2 sm:px-6 xl:px-8">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6 xl:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_35%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_24%)]" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white/70 shadow-none">
                    Receivables
                  </Badge>

                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Issued invoices
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-black/20 text-white shadow-[0_0_30px_rgba(255,255,255,0.08)]">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div>
                      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                        Invoices
                      </h1>
                      <div className="mt-1 text-sm text-white/45">
                        Final outbound invoices issued by your company to clients.
                      </div>
                    </div>
                  </div>

                  <p className="max-w-2xl text-sm leading-7 text-white/55 sm:text-[15px]">
                    This module controls stored, issued, and payment-tracked receivable
                    documents. Master data provides the source selection, while the
                    invoice stores the commercial and financial snapshot at issuance time.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 xl:justify-end">
                <Button
                  variant="outline"
                  onClick={() => navigate("/finance/transactions")}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                <Button
                  variant="outline"
                  onClick={() => void loadInvoices(true)}
                  disabled={isRefreshing}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10 disabled:opacity-60"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>

                {canCreateInvoices ? (
                  <Button
                    onClick={() => navigate("/finance/transactions/invoices/new")}
                    className="h-11 rounded-2xl px-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Invoice
                  </Button>
                ) : null}

                <Button
  variant="outline"
  onClick={() => {
    setArchiveTab("archived");
    setIsArchiveModalOpen(true);
  }}
  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
>
  Archive
</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((metric) => (
                <MetricCard key={metric.key} metric={metric} />
              ))}
            </div>
          </div>
        </section>

        <section>
          <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <CardHeader className="border-b border-white/8 pb-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <Badge className="w-fit rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/65 shadow-none">
                    Invoice Registry
                  </Badge>

                  <CardTitle className="text-white">
                    Issued Invoices List
                  </CardTitle>

                  <CardDescription className="max-w-2xl text-white/45">
                    Search and open invoice records, review document status, payment
                    status, client, dates, and remaining balance.
                  </CardDescription>
                </div>

                <div className="relative w-full max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search invoice number, client, or status"
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400/30"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 xl:p-6">
              {isLoading ? (
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-8 text-sm text-white/50">
                  Loading invoices...
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-8 text-sm text-white/50">
                  No invoices found.
                </div>
              ) : (
                <div className="space-y-3">
                 {filteredInvoices.map((invoice) => {
                    const displayState = getInvoiceDisplayState(invoice as any);

                    return (
                      <button
                        key={invoice.id}
                        type="button"
                        onClick={() =>
                          navigate(`/finance/transactions/invoices/${invoice.id}`)
                        }
                        className="group flex w-full items-start justify-between gap-4 rounded-[22px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.07]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-semibold text-white">
                              {invoice.invoice_number || "Draft"}
                            </div>

                            <Badge
                              className={`rounded-full border px-2.5 py-1 text-[11px] shadow-none ${getDocumentStatusBadgeClasses(
                                invoice.status
                              )}`}
                            >
                              {getIssuedInvoiceStatusLabel(invoice.status)}
                            </Badge>

                           {invoice.status !== "deleted" ? (
  <Badge
    className={`rounded-full border px-2.5 py-1 text-[11px] shadow-none ${getPaymentStatusBadgeClasses(
      invoice.payment_status
    )}`}
  >
    {getIssuedInvoicePaymentStatusLabel(invoice.payment_status)}
  </Badge>
) : null}

                            <Badge
                              className={`rounded-full border px-2.5 py-1 text-[11px] shadow-none ${getPostingStatusBadgeClasses(
                                displayState.postingStatus
                              )}`}
                            >
                              {getPostingStatusLabel(displayState.postingStatus)}
                            </Badge>

                            {displayState.isOverdue ? (
                              <Badge
                                className={`rounded-full border px-2.5 py-1 text-[11px] shadow-none ${getOverdueBadgeClasses()}`}
                              >
                                Overdue
                              </Badge>
                            ) : null}
                          </div>

                          <div className="mt-2 text-sm text-white/70">
                            {invoice.client_name}
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-white/45 md:grid-cols-5">
                            <div>Issued: {formatFinanceDate(invoice.issue_date)}</div>
                            <div>Due: {formatFinanceDate(invoice.due_date)}</div>
                            <div>
                              Total:{" "}
                              {formatFinanceMoney(
                                invoice.total_amount,
                                invoice.currency_code ?? "USD"
                              )}
                            </div>
                            <div>
                              Paid:{" "}
                              {formatFinanceMoney(
                                invoice.paid_amount,
                                invoice.currency_code ?? "USD"
                              )}
                            </div>
                            <div>
                              Balance:{" "}
                              {formatFinanceMoney(
                                invoice.balance_due,
                                invoice.currency_code ?? "USD"
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 pl-2">
  <div className="hidden text-xs text-white/30 transition-colors duration-200 group-hover:text-white/55 sm:block">
    {formatFinanceDate(invoice.created_at)}
  </div>

 {/* ACTION MENU */}
<div
  className="relative"
  ref={openMenuInvoiceId === invoice.id ? actionsMenuRef : null}
>
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      setOpenMenuInvoiceId((current) =>
        current === invoice.id ? null : invoice.id
      );
    }}
    className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
  >
    <MoreVertical className="h-4 w-4" />
  </button>

  {openMenuInvoiceId === invoice.id ? (
    <div className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl shadow-xl">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpenMenuInvoiceId(null);
          navigate(`/finance/transactions/invoices/${invoice.id}`);
        }}
        className="w-full px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10"
      >
        Edit
      </button>

      {invoice.status !== "archived" && invoice.status !== "deleted" ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void handleArchive(invoice.id);
          }}
          className="w-full px-3 py-2 text-left text-sm text-amber-300 hover:bg-white/10"
        >
          Archive
        </button>
      ) : null}

      {invoice.status !== "deleted" ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void handleDelete(invoice.id);
          }}
          className="w-full px-3 py-2 text-left text-sm text-rose-400 hover:bg-white/10"
        >
          Delete
        </button>
      ) : null}
    </div>
  ) : null}
</div>

<ArrowRight className="h-4 w-4 text-white/30 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-white/70" />
</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
           {isArchiveModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#0b0f1a]/95 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
              <div>
                <div className="text-lg font-semibold text-white">Archive</div>
                <div className="mt-1 text-sm text-white/45">
                  Archived and deleted invoices removed from the active registry.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="flex items-center gap-2 border-b border-white/8 px-6 py-4">
              <button
                type="button"
                onClick={() => setArchiveTab("archived")}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  archiveTab === "archived"
                    ? "bg-white/10 text-white"
                    : "text-white/55 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                Archived
              </button>

              <button
                type="button"
                onClick={() => setArchiveTab("deleted")}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  archiveTab === "deleted"
                    ? "bg-rose-500/15 text-rose-200"
                    : "text-white/55 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                Deleted
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              {isArchiveLoading ? (
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-8 text-sm text-white/50">
                  Loading archive...
                </div>
              ) : visibleArchivedInvoices.length === 0 ? (
                <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-8 text-sm text-white/50">
                  No {archiveTab} invoices found.
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleArchivedInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-start justify-between gap-4 rounded-[22px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] px-4 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-base font-semibold text-white">
                            {invoice.invoice_number || "Draft"}
                          </div>

                          <Badge className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] text-white/75 shadow-none">
                            {getIssuedInvoiceStatusLabel(invoice.status)}
                          </Badge>

                          {invoice.status !== "deleted" ? (
  <Badge
    className={`rounded-full border px-2.5 py-1 text-[11px] shadow-none ${getPaymentStatusBadgeClasses(
      invoice.payment_status
    )}`}
  >
    {getIssuedInvoicePaymentStatusLabel(invoice.payment_status)}
  </Badge>
) : null}
                        </div>

                        <div className="mt-2 text-sm text-white/70">
                          {invoice.client_name}
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-white/45 md:grid-cols-4">
                          <div>Issued: {formatFinanceDate(invoice.issue_date)}</div>
                          <div>Due: {formatFinanceDate(invoice.due_date)}</div>
                          <div>
                            Total:{" "}
                            {formatFinanceMoney(
                              invoice.total_amount,
                              invoice.currency_code ?? "USD"
                            )}
                          </div>
                          <div>
                            Balance:{" "}
                            {formatFinanceMoney(
                              invoice.balance_due,
                              invoice.currency_code ?? "USD"
                            )}
                          </div>
                        </div>
                      </div>

                                          <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/finance/transactions/invoices/${invoice.id}`)
                          }
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                        >
                          Open
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleRestore(invoice.id)}
                          className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/20"
                        >
                          Restore
                        </button>

                        {archiveTab === "deleted" ? (
                          <button
                            type="button"
                            onClick={() => void handleHardDelete(invoice.id)}
                            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/20"
                          >
                            Hard Delete
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}
