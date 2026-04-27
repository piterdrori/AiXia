"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  CheckCircle,
  FileText,
  Link2,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CustomerPoStatus =
  | "draft"
  | "received"
  | "verified"
  | "linked_to_pi"
  | "closed"
  | "canceled"
  | "archived"
  | "deleted";

type CustomerPoRow = {
  id: string;
  client_po_number: string | null;
  external_po_number: string | null;
  quotation_id: string | null;
  proforma_invoice_id: string | null;
  client_id: string | null;
  company_id: string | null;
  po_date: string | null;
  received_at: string | null;
  verified_at: string | null;
  linked_to_pi_at: string | null;
  closed_at: string | null;
  canceled_at: string | null;
  archived_at: string | null;
  status: CustomerPoStatus;
  currency_id: string | null;
  currency_code: string | null;
  total_amount: number | string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  document_version: number;
  project_id: string | null;
  task_id: string | null;
  reference_number: string | null;
  posted_to_ledger: boolean;
  company_name_snapshot: string | null;
  company_legal_name_snapshot: string | null;
  company_contact_person_snapshot: string | null;
  company_email_snapshot: string | null;
  company_phone_snapshot: string | null;
  company_address_snapshot: string | null;
  client_name_snapshot: string | null;
  client_legal_name_snapshot: string | null;
  client_contact_person_snapshot: string | null;
  client_email_snapshot: string | null;
  client_phone_snapshot: string | null;
  billing_address_snapshot: string | null;
  shipping_address_snapshot: string | null;
  counterparty_type: string | null;
  counterparty_company_id: string | null;
  is_intercompany: boolean;
  counterparty_name_snapshot: string | null;
  counterparty_legal_name_snapshot: string | null;
  counterparty_contact_person_snapshot: string | null;
  counterparty_email_snapshot: string | null;
  counterparty_phone_snapshot: string | null;
};

type ClientOption = {
  id: string;
  name: string;
  legal_name: string | null;
  contact_person: string | null;
  company_email: string | null;
  personnel_email: string | null;
  company_phone: string | null;
  personnel_phone: string | null;
  country: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
};

type CompanyOption = {
  id: string;
  name: string;
  legal_name: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
};

type CurrencyOption = {
  id: string;
  currency_code: string;
  currency_name: string | null;
};

type ProjectOption = {
  id: string;
  name: string;
};

type TaskOption = {
  id: string;
  title: string;
  project_id: string | null;
};

type QuotationOption = {
  id: string;
  quotation_number: string | null;
  client_id: string | null;
  company_id: string | null;
  currency_id: string | null;
  currency_code: string | null;
  total_amount: number | string | null;
  project_id: string | null;
  task_id: string | null;
  status: string | null;
};

type ProformaOption = {
  id: string;
  proforma_number: string | null;
  status: string | null;
};

type CustomerPoFormState = {
  client_id: string;
  quotation_id: string;
  external_po_number: string;
  company_id: string;
  po_date: string;
  received_date: string;
  currency_id: string;
  currency_code: string;
  total_amount: string;
  project_id: string;
  task_id: string;
  notes: string;
  status: CustomerPoStatus;
};

const EMPTY_FORM: CustomerPoFormState = {
  client_id: "",
  quotation_id: "",
  external_po_number: "",
  company_id: "",
  po_date: new Date().toISOString().slice(0, 10),
  received_date: new Date().toISOString().slice(0, 10),
  currency_id: "",
  currency_code: "",
  total_amount: "",
  project_id: "",
  task_id: "",
  notes: "",
  status: "received",
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number | string | null | undefined, currencyCode = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function makeAddressSnapshot(
  row:
    | ClientOption
    | CompanyOption
    | null
    | undefined
) {
  if (!row) return null;

  return [
    row.address_line_1,
    row.address_line_2,
    row.city,
    row.state_province,
    row.postal_code,
    row.country,
  ]
    .filter(Boolean)
    .join(", ") || null;
}

function getStatusLabel(status: CustomerPoStatus) {
  switch (status) {
    case "draft":
      return "Draft";
    case "received":
      return "Received";
    case "verified":
      return "Verified";
    case "linked_to_pi":
      return "Linked to PI";
    case "closed":
      return "Closed";
    case "canceled":
      return "Canceled";
    case "archived":
      return "Archived";
    case "deleted":
      return "Deleted";
    default:
      return status;
  }
}

function getStatusBadgeClasses(status: CustomerPoStatus) {
  switch (status) {
    case "draft":
      return "border-white/10 bg-white/10 text-white/75";
    case "received":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "verified":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "linked_to_pi":
      return "border-violet-400/20 bg-violet-500/10 text-violet-200";
    case "closed":
      return "border-slate-400/20 bg-slate-500/10 text-slate-200";
    case "canceled":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "archived":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "deleted":
      return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    default:
      return "border-white/10 bg-white/10 text-white/75";
  }
}

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export default function FinanceCustomerPosPage() {
  const navigate = useNavigate();

  const [customerPos, setCustomerPos] = useState<CustomerPoRow[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [quotations, setQuotations] = useState<QuotationOption[]>([]);
  const [proformas, setProformas] = useState<ProformaOption[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [showArchivePanel, setShowArchivePanel] = useState(false);
  const [archiveTab, setArchiveTab] = useState<"archived" | "deleted">("archived");
  const [form, setForm] = useState<CustomerPoFormState>(EMPTY_FORM);
  const [error, setError] = useState("");


  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [
        customerPosResult,
        clientsResult,
        companiesResult,
        currenciesResult,
        projectsResult,
        tasksResult,
        quotationsResult,
        proformasResult,
      ] = await Promise.all([
        supabase
          .from("finance_client_purchase_orders")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("finance_clients")
          .select(
            "id, name, legal_name, contact_person, company_email, personnel_email, company_phone, personnel_phone, country, city, state_province, postal_code, address_line_1, address_line_2"
          )
          .eq("status", "active")
          .order("name", { ascending: true }),
        supabase
          .from("finance_companies")
          .select(
            "id, name, legal_name, contact_person, email, phone, country, city, state_province, postal_code, address_line_1, address_line_2"
          )
          .eq("status", "active")
          .order("name", { ascending: true }),
        supabase
          .from("finance_currencies")
          .select("id, currency_code, currency_name")
          .eq("status", "active")
          .order("currency_code", { ascending: true }),
        supabase.from("projects").select("id, name").order("name", { ascending: true }),
        supabase
          .from("tasks")
          .select("id, title, project_id")
          .order("created_at", { ascending: false }),
        supabase
          .from("finance_quotations")
          .select(
            "id, quotation_number, client_id, company_id, currency_id, currency_code, total_amount, project_id, task_id, status"
          )
          .not("status", "in", "(archived,deleted)")
          .order("created_at", { ascending: false }),
        supabase
          .from("finance_proforma_invoices")
          .select("id, proforma_number, status")
          .not("status", "in", "(archived,deleted)")
          .order("created_at", { ascending: false }),
      ]);

      if (customerPosResult.error) throw customerPosResult.error;
      if (clientsResult.error) throw clientsResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (currenciesResult.error) throw currenciesResult.error;
      if (projectsResult.error) throw projectsResult.error;
      if (tasksResult.error) throw tasksResult.error;
      if (quotationsResult.error) throw quotationsResult.error;
      if (proformasResult.error) throw proformasResult.error;

      setCustomerPos((customerPosResult.data || []) as CustomerPoRow[]);
      setClients((clientsResult.data || []) as ClientOption[]);
      setCompanies((companiesResult.data || []) as CompanyOption[]);
      setCurrencies((currenciesResult.data || []) as CurrencyOption[]);
      setProjects((projectsResult.data || []) as ProjectOption[]);
      setTasks((tasksResult.data || []) as TaskOption[]);
      setQuotations((quotationsResult.data || []) as QuotationOption[]);
      setProformas((proformasResult.data || []) as ProformaOption[]);
    } catch (err) {
      console.error(err);
      setError("Failed to load customer purchase orders.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-customer-pos")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_client_purchase_orders",
        },
        () => void loadData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_quotations",
        },
        () => void loadData()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadData();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const activeCustomerPos = useMemo(
    () =>
      customerPos.filter(
        (row) => row.status !== "archived" && row.status !== "deleted"
      ),
    [customerPos]
  );

  const archivedCustomerPos = useMemo(
    () => customerPos.filter((row) => row.status === "archived"),
    [customerPos]
  );

  const deletedCustomerPos = useMemo(
    () => customerPos.filter((row) => row.status === "deleted"),
    [customerPos]
  );

  const filteredQuotations = useMemo(() => {
    if (!form.client_id) return [];
    return quotations.filter((quotation) => quotation.client_id === form.client_id);
  }, [form.client_id, quotations]);

  const filteredTasks = useMemo(() => {
    if (!form.project_id) return tasks;
    return tasks.filter((task) => task.project_id === form.project_id);
  }, [form.project_id, tasks]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === form.client_id) || null,
    [clients, form.client_id]
  );

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === form.company_id) || null,
    [companies, form.company_id]
  );

  const selectedQuotation = useMemo(
    () => quotations.find((quotation) => quotation.id === form.quotation_id) || null,
    [form.quotation_id, quotations]
  );

  const selectedCurrency = useMemo(
    () => currencies.find((currency) => currency.id === form.currency_id) || null,
    [currencies, form.currency_id]
  );

  const metrics = useMemo(() => {
    const awaitingPi = activeCustomerPos.filter(
      (row) => row.status === "received" || row.status === "verified"
    ).length;

    return {
      total: activeCustomerPos.length,
      received: activeCustomerPos.filter((row) => row.status === "received").length,
      verified: activeCustomerPos.filter((row) => row.status === "verified").length,
      awaitingPi,
      linkedToPi: activeCustomerPos.filter((row) => row.status === "linked_to_pi")
        .length,
    };
  }, [activeCustomerPos]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setError("");
  }

  function handleClientChange(clientId: string) {
    setForm((current) => ({
      ...current,
      client_id: clientId,
      quotation_id: "",
      company_id: "",
      currency_id: "",
      currency_code: "",
      total_amount: "",
      project_id: "",
      task_id: "",
    }));
  }

  function handleQuotationChange(quotationId: string) {
    const quotation = quotations.find((entry) => entry.id === quotationId);

    if (!quotation) {
      setForm((current) => ({
        ...current,
        quotation_id: "",
      }));
      return;
    }

    const matchedCurrency = currencies.find(
      (currency) =>
        currency.id === quotation.currency_id ||
        currency.currency_code === quotation.currency_code
    );

    setForm((current) => ({
      ...current,
      quotation_id: quotation.id,
      company_id: quotation.company_id || current.company_id,
      currency_id: matchedCurrency?.id || current.currency_id,
      currency_code:
        matchedCurrency?.currency_code ||
        quotation.currency_code ||
        current.currency_code,
      total_amount:
        quotation.total_amount !== null && quotation.total_amount !== undefined
          ? String(quotation.total_amount)
          : current.total_amount,
      project_id: quotation.project_id || current.project_id,
      task_id: quotation.task_id || current.task_id,
    }));
  }

  function handleCurrencyChange(currencyId: string) {
    const currency = currencies.find((entry) => entry.id === currencyId);

    setForm((current) => ({
      ...current,
      currency_id: currencyId,
      currency_code: currency?.currency_code || "",
    }));
  }

  async function handleCreateCustomerPo() {
    if (!form.client_id) {
      setError("Client is required.");
      return;
    }

    if (!form.external_po_number.trim()) {
      setError("Customer PO No. is required.");
      return;
    }

    if (!form.company_id) {
      setError("Company is required.");
      return;
    }

    if (!form.currency_code) {
      setError("Currency is required.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const userId = await getCurrentUserId();

      const payload = {
        external_po_number: form.external_po_number.trim(),
        quotation_id: form.quotation_id || null,
        proforma_invoice_id: null,
        client_id: form.client_id || null,
        company_id: form.company_id || null,
        po_date: form.po_date || null,
        received_at: form.received_date
          ? new Date(`${form.received_date}T00:00:00`).toISOString()
          : new Date().toISOString(),
        status: form.status,
        currency_id: form.currency_id || null,
        currency_code: form.currency_code || selectedCurrency?.currency_code || null,
        total_amount: form.total_amount ? Number(form.total_amount) : 0,
        notes: form.notes.trim() || null,
        metadata: {
          source: "customer_po_page",
          quotation_number: selectedQuotation?.quotation_number || null,
        },
        created_by: userId,
        updated_by: userId,
        project_id: form.project_id || null,
        task_id: form.task_id || null,
        reference_number: form.external_po_number.trim() || null,
        posted_to_ledger: false,
        company_name_snapshot: selectedCompany?.legal_name || selectedCompany?.name || null,
        company_legal_name_snapshot: selectedCompany?.legal_name || null,
        company_contact_person_snapshot: selectedCompany?.contact_person || null,
        company_email_snapshot: selectedCompany?.email || null,
        company_phone_snapshot: selectedCompany?.phone || null,
        company_address_snapshot: makeAddressSnapshot(selectedCompany),
        client_name_snapshot: selectedClient?.legal_name || selectedClient?.name || null,
        client_legal_name_snapshot: selectedClient?.legal_name || null,
        client_contact_person_snapshot: selectedClient?.contact_person || null,
        client_email_snapshot:
          selectedClient?.company_email || selectedClient?.personnel_email || null,
        client_phone_snapshot:
          selectedClient?.company_phone || selectedClient?.personnel_phone || null,
        billing_address_snapshot: makeAddressSnapshot(selectedClient),
        shipping_address_snapshot: makeAddressSnapshot(selectedClient),
        counterparty_type: "client",
        counterparty_company_id: null,
        is_intercompany: false,
        counterparty_name_snapshot:
          selectedClient?.legal_name || selectedClient?.name || null,
        counterparty_legal_name_snapshot: selectedClient?.legal_name || null,
        counterparty_contact_person_snapshot: selectedClient?.contact_person || null,
        counterparty_email_snapshot:
          selectedClient?.company_email || selectedClient?.personnel_email || null,
        counterparty_phone_snapshot:
          selectedClient?.company_phone || selectedClient?.personnel_phone || null,
      };

      const { error: insertError } = await supabase
        .from("finance_client_purchase_orders")
        .insert(payload);

      if (insertError) throw insertError;

      resetForm();
      setShowCreatePanel(false);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to create customer PO."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function updateCustomerPoStatus(
    row: CustomerPoRow,
    status: CustomerPoStatus
  ) {
    try {
      setIsSaving(true);
      setError("");

      const userId = await getCurrentUserId();

      const timestampPatch: Partial<CustomerPoRow> = {};

      if (status === "verified") timestampPatch.verified_at = new Date().toISOString();
      if (status === "closed") timestampPatch.closed_at = new Date().toISOString();
      if (status === "canceled") timestampPatch.canceled_at = new Date().toISOString();
      if (status === "archived" || status === "deleted") {
        timestampPatch.archived_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from("finance_client_purchase_orders")
        .update({
          status,
          ...timestampPatch,
          updated_by: userId,
        })
        .eq("id", row.id);

      if (updateError) throw updateError;

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to update customer PO."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRestore(row: CustomerPoRow) {
    try {
      setIsSaving(true);
      setError("");

      const userId = await getCurrentUserId();

      const { error: restoreError } = await supabase
        .from("finance_client_purchase_orders")
        .update({
          status: "received",
          archived_at: null,
          updated_by: userId,
        })
        .eq("id", row.id);

      if (restoreError) throw restoreError;

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to restore customer PO."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleHardDelete(row: CustomerPoRow) {
    const confirmed = window.confirm(
      `Permanently delete ${row.client_po_number || "this customer PO"}?`
    );

    if (!confirmed) return;

    try {
      setIsSaving(true);
      setError("");

      const { error: deleteError } = await supabase
        .from("finance_client_purchase_orders")
        .delete()
        .eq("id", row.id)
        .eq("status", "deleted");

      if (deleteError) throw deleteError;

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to permanently delete customer PO."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const archiveRows = archiveTab === "archived" ? archivedCustomerPos : deletedCustomerPos;

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Transactions
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-stretch">
              <div>
                <Badge className="inline-flex w-fit rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200 shadow-none">
                  Incoming Flow
                </Badge>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Customer POs
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Customer purchase orders received from clients after quotation approval and before proforma invoice creation.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200 shadow-none">
                    Client-first quotation filtering
                  </Badge>
                  <Badge className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200 shadow-none">
                    Auto-fill with manual override
                  </Badge>
                  <Badge className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300 shadow-none">
                    Auto-refresh
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Active Customer POs
                      </p>
                      <p className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">
                        {isLoading ? "—" : metrics.total}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                      <FileText className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Active customer commitments excluding archived and deleted records.
                  </p>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Awaiting PI
                      </p>
                      <p className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">
                        {isLoading ? "—" : metrics.awaitingPi}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                      <Link2 className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Received or verified customer POs not yet linked to a proforma invoice.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  resetForm();
                  setShowCreatePanel(true);
                }}
                className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 font-semibold text-slate-950 hover:bg-cyan-400"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Customer PO
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowArchivePanel((current) => !current)}
                className="h-11 rounded-2xl border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/[0.08]"
              >
                <Archive className="mr-2 h-4 w-4" />
                {showArchivePanel ? "Close Archive" : "Open Archive"}
              </Button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["Total", metrics.total, "All active records"],
            ["Received", metrics.received, "Customer PO received"],
            ["Verified", metrics.verified, "Validated for next step"],
            ["Awaiting PI", metrics.awaitingPi, "Ready for proforma"],
            ["Linked to PI", metrics.linkedToPi, "Already connected"],
          ].map(([title, value, subtitle]) => (
            <div
              key={String(title)}
              className="min-h-[156px] rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                {title}
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">
                {isLoading ? "—" : value}
              </div>
              <div className="mt-4 text-sm leading-6 text-slate-400">
                {subtitle}
              </div>
            </div>
          ))}
        </section>

        {showCreatePanel ? (
          <Card className="overflow-hidden rounded-[30px] border border-cyan-400/20 bg-white/[0.045] backdrop-blur-xl">
            <CardHeader className="border-b border-white/10 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-white">Create Customer PO</CardTitle>
                  <CardDescription className="text-white/45">
                    Select a client first. Linked quotations are filtered by that client. Quotation data auto-fills but remains editable.
                  </CardDescription>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setShowCreatePanel(false);
                  }}
                  className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
              <label className="space-y-2">
                <div className="text-sm text-white/70">Client</div>
                <select
                  value={form.client_id}
                  onChange={(event) => handleClientChange(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                >
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.legal_name || client.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <div className="text-sm text-white/70">Linked Quotation</div>
                <select
                  value={form.quotation_id}
                  onChange={(event) => handleQuotationChange(event.target.value)}
                  disabled={!form.client_id}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none disabled:opacity-45"
                >
                  <option value="">
                    {form.client_id ? "No linked quotation" : "Select client first"}
                  </option>
                  {filteredQuotations.map((quotation) => (
                    <option key={quotation.id} value={quotation.id}>
                      {quotation.quotation_number || "Quotation"} —{" "}
                      {formatMoney(quotation.total_amount, quotation.currency_code || "USD")}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <div className="text-sm text-white/70">Customer PO No.</div>
                <input
                  value={form.external_po_number}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      external_po_number: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                  placeholder="Customer document number"
                />
              </label>

              <label className="space-y-2">
                <div className="text-sm text-white/70">Company</div>
                <select
                  value={form.company_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      company_id: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                >
                  <option value="">Select company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.legal_name || company.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <div className="text-sm text-white/70">PO Date</div>
                <input
                  type="date"
                  value={form.po_date}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      po_date: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                />
              </label>

              <label className="space-y-2">
                <div className="text-sm text-white/70">Received Date</div>
                <input
                  type="date"
                  value={form.received_date}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      received_date: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                />
              </label>

              <label className="space-y-2">
                <div className="text-sm text-white/70">Currency</div>
                <select
                  value={form.currency_id}
                  onChange={(event) => handleCurrencyChange(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                >
                  <option value="">Select currency</option>
                  {currencies.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.currency_code} — {currency.currency_name || ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <div className="text-sm text-white/70">Total Amount</div>
                <input
                  type="number"
                  value={form.total_amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      total_amount: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                  placeholder="0.00"
                />
              </label>

              <label className="space-y-2">
                <div className="text-sm text-white/70">Project</div>
                <select
                  value={form.project_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      project_id: event.target.value,
                      task_id: "",
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <div className="text-sm text-white/70">Task</div>
                <select
                  value={form.task_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      task_id: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                >
                  <option value="">No task</option>
                  {filteredTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <div className="text-sm text-white/70">Initial Status</div>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as CustomerPoStatus,
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                >
                  <option value="received">Received</option>
                  <option value="draft">Draft</option>
                </select>
              </label>

              <div className="md:col-span-3">
                <div className="text-sm text-white/70">Notes</div>
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-3 md:col-span-3">
                <Button
                  onClick={() => void handleCreateCustomerPo()}
                  disabled={isSaving}
                  className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  {isSaving ? "Creating..." : "Create Customer PO"}
                </Button>

                <Button
                  variant="outline"
                  onClick={resetForm}
                  disabled={isSaving}
                  className="h-11 rounded-2xl border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/[0.08]"
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
          <CardHeader className="border-b border-white/10 px-5 py-4">
            <CardTitle className="text-white">Customer PO Records</CardTitle>
            <CardDescription className="text-white/45">
              Internal CPO No. is generated automatically. Customer PO No. comes from the customer document.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-black/20 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-5 py-4 font-semibold">Internal CPO No.</th>
                    <th className="px-5 py-4 font-semibold">Customer PO No.</th>
                    <th className="px-5 py-4 font-semibold">Client</th>
                    <th className="px-5 py-4 font-semibold">Linked Quotation</th>
                    <th className="px-5 py-4 font-semibold">Linked PI</th>
                    <th className="px-5 py-4 font-semibold">PO Date</th>
                    <th className="px-5 py-4 text-right font-semibold">Total</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {activeCustomerPos.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-14 text-center text-sm text-slate-500">
                        No active customer POs found.
                      </td>
                    </tr>
                  ) : (
                    activeCustomerPos.map((row) => {
                      const quotation = quotations.find((entry) => entry.id === row.quotation_id);
                      const proforma = proformas.find((entry) => entry.id === row.proforma_invoice_id);

                      return (
                        <tr key={row.id} className="text-sm text-slate-300 transition hover:bg-white/[0.035]">
                          <td className="px-5 py-4 font-semibold text-white">
                            {row.client_po_number || "Pending"}
                          </td>
                          <td className="px-5 py-4 text-slate-300">
                            {row.external_po_number || "—"}
                          </td>
                          <td className="px-5 py-4">
                            {row.client_name_snapshot || "—"}
                          </td>
                          <td className="px-5 py-4">
                            {quotation?.quotation_number || "—"}
                          </td>
                          <td className="px-5 py-4">
                            {proforma?.proforma_number || "—"}
                          </td>
                          <td className="px-5 py-4">
                            {formatDate(row.po_date)}
                          </td>
                          <td className="px-5 py-4 text-right font-semibold text-white">
                            {formatMoney(row.total_amount, row.currency_code || "USD")}
                          </td>
                          <td className="px-5 py-4">
                            <Badge className={`rounded-full border px-3 py-1 text-xs shadow-none ${getStatusBadgeClasses(row.status)}`}>
                              {getStatusLabel(row.status)}
                            </Badge>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              {row.status === "received" ? (
                                <Button
                                  variant="outline"
                                  onClick={() => void updateCustomerPoStatus(row, "verified")}
                                  disabled={isSaving}
                                  className="h-9 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-3 text-emerald-200 hover:bg-emerald-500/20"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              ) : null}

                              <Button
                                variant="outline"
                                onClick={() => void updateCustomerPoStatus(row, "archived")}
                                disabled={isSaving}
                                className="h-9 rounded-2xl border-amber-400/20 bg-amber-500/10 px-3 text-amber-200 hover:bg-amber-500/20"
                              >
                                <Archive className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="outline"
                                onClick={() => void updateCustomerPoStatus(row, "deleted")}
                                disabled={isSaving}
                                className="h-9 rounded-2xl border-rose-400/20 bg-rose-500/10 px-3 text-rose-200 hover:bg-rose-500/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {showArchivePanel ? (
          <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <CardHeader className="border-b border-white/10 px-5 py-4">
              <CardTitle className="text-white">Archive</CardTitle>
              <CardDescription className="text-white/45">
                Archived records can be restored. Deleted records can be restored or permanently deleted.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-5">
              <div className="flex gap-2">
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

              <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
                {archiveRows.length === 0 ? (
                  <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-white/45">
                    No {archiveTab} customer POs.
                  </div>
                ) : (
                  archiveRows.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold text-white">
                            {row.client_po_number || "Customer PO"} ·{" "}
                            {row.external_po_number || "No customer number"}
                          </div>
                          <div className="mt-1 text-xs text-white/45">
                            {row.client_name_snapshot || "—"} · {formatDate(row.updated_at)}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => void handleRestore(row)}
                            disabled={isSaving}
                            className="h-9 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-3 text-emerald-200 hover:bg-emerald-500/20"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>

                          {archiveTab === "deleted" ? (
                            <Button
                              variant="outline"
                              onClick={() => void handleHardDelete(row)}
                              disabled={isSaving}
                              className="h-9 rounded-2xl border-rose-400/20 bg-rose-500/10 px-3 text-rose-200 hover:bg-rose-500/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
