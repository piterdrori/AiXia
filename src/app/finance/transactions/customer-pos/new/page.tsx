"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Save,
  Upload,
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

type CustomerPoStatus = "draft" | "received";

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

function makeAddressSnapshot(row: ClientOption | CompanyOption | null | undefined) {
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

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export default function FinanceNewCustomerPoPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [quotations, setQuotations] = useState<QuotationOption[]>([]);

  const [form, setForm] = useState<CustomerPoFormState>(EMPTY_FORM);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isLoadingLookups, setIsLoadingLookups] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const loadLookups = useCallback(async () => {
    setIsLoadingLookups(true);
    setError("");

    try {
      const [
        clientsResult,
        companiesResult,
        currenciesResult,
        projectsResult,
        tasksResult,
        quotationsResult,
      ] = await Promise.all([
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
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (currenciesResult.error) throw currenciesResult.error;
      if (projectsResult.error) throw projectsResult.error;
      if (tasksResult.error) throw tasksResult.error;
      if (quotationsResult.error) throw quotationsResult.error;

      setClients((clientsResult.data || []) as ClientOption[]);
      setCompanies((companiesResult.data || []) as CompanyOption[]);
      setCurrencies((currenciesResult.data || []) as CurrencyOption[]);
      setProjects((projectsResult.data || []) as ProjectOption[]);
      setTasks((tasksResult.data || []) as TaskOption[]);
      setQuotations((quotationsResult.data || []) as QuotationOption[]);
    } catch (err) {
      console.error(err);
      setError("Failed to load Customer PO lookup data.");
    } finally {
      setIsLoadingLookups(false);
    }
  }, []);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

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

  function handleDropFile(fileList: FileList | null) {
    const file = fileList?.[0] || null;
    if (!file) return;
    setSelectedFile(file);
    setError("");
  }

  async function uploadCustomerPoFile(poId: string, file: File, userId: string) {
    const safeFileName = file.name.replace(/\s+/g, "-");
    const storagePath = `customer-po/${poId}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("finance-customer-po-documents")
      .upload(storagePath, file, {
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: fileUploadRow, error: fileUploadError } = await supabase
      .from("file_uploads")
      .insert({
        user_id: userId,
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type || null,
        entity_type: "finance_client_purchase_order",
      })
      .select("id")
      .single();

    if (fileUploadError) throw fileUploadError;

    const { error: attachmentError } = await supabase
      .from("finance_record_attachments")
      .insert({
        entity_type: "finance_client_purchase_order",
        entity_id: poId,
        file_upload_id: fileUploadRow.id,
        uploaded_by: userId,
        notes: "Customer PO document upload",
        metadata: {
          bucket: "finance-customer-po-documents",
        },
      });

    if (attachmentError) throw attachmentError;
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

    if (!selectedFile) {
      setError("Customer PO document is required.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const userId = await getCurrentUserId();

      if (!userId) {
        throw new Error("User not authenticated.");
      }

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
          source: "customer_po_new_page",
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

      const { data: createdPo, error: insertError } = await supabase
        .from("finance_client_purchase_orders")
        .insert(payload)
        .select("id")
        .single();

      if (insertError) throw insertError;

      await uploadCustomerPoFile(createdPo.id, selectedFile, userId);

      navigate(`/finance/transactions/customer-pos/${createdPo.id}`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to create Customer PO."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/customer-pos")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Customer POs
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-stretch">
              <div>
                <Badge className="inline-flex w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                  New Customer PO
                </Badge>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Create Customer PO
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Create the customer purchase order record, upload the customer PO document,
                  and link it to the customer quotation when available.
                </p>
              </div>

              <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Required File
                    </p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                      PO document
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                    <Upload className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  The Customer PO record cannot be created without the customer document.
                </p>
              </div>
            </div>
          </div>
        </header>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_420px]">
          <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <CardHeader className="border-b border-white/10 px-5 py-4">
              <CardTitle className="text-white">Customer PO Details</CardTitle>
              <CardDescription className="text-white/45">
                Client first. Linked quotations are filtered by the selected client. Quotation values auto-fill but remain editable.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
              <label className="space-y-2">
                <div className="text-sm text-white/70">Client</div>
                <select
                  value={form.client_id}
                  onChange={(event) => handleClientChange(event.target.value)}
                  disabled={isLoadingLookups}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none disabled:opacity-45"
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
                  disabled={!form.client_id || isLoadingLookups}
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
                  disabled={isLoadingLookups}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none disabled:opacity-45"
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
                  disabled={isLoadingLookups}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none disabled:opacity-45"
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
                  disabled={isLoadingLookups}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none disabled:opacity-45"
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
                  disabled={isLoadingLookups}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none disabled:opacity-45"
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
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <CardTitle className="text-white">Customer PO Document</CardTitle>
                <CardDescription className="text-white/45">
                  Drag and drop the customer PO file here. A document is required.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 p-5">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(event) => handleDropFile(event.target.files)}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsDraggingFile(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsDraggingFile(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsDraggingFile(false);
                    handleDropFile(event.dataTransfer.files);
                  }}
                  className={`flex min-h-[220px] w-full flex-col items-center justify-center rounded-[26px] border border-dashed px-6 py-8 text-center transition ${
                    isDraggingFile
                      ? "border-cyan-300 bg-cyan-500/10"
                      : "border-white/15 bg-black/20 hover:border-cyan-400/30 hover:bg-cyan-500/5"
                  }`}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                    <Upload className="h-6 w-6" />
                  </div>

                  <div className="mt-4 text-sm font-semibold text-white">
                    Drop Customer PO file here
                  </div>
                  <div className="mt-2 text-xs leading-5 text-slate-500">
                    PDF, image, Word, or Excel. Click to browse.
                  </div>
                </button>

                {selectedFile ? (
                  <div className="rounded-[20px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-emerald-100">
                          {selectedFile.name}
                        </div>
                        <div className="mt-1 text-xs text-emerald-200/70">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => setSelectedFile(null)}
                        className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}

                <Button
                  onClick={() => void handleCreateCustomerPo()}
                  disabled={isSaving || isLoadingLookups}
                  className="h-11 w-full rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Creating..." : "Create Customer PO"}
                </Button>

                {error ? (
                  <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {error}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <CardTitle className="text-white">Creation Rules</CardTitle>
                <CardDescription className="text-white/45">
                  Locked Customer PO behavior.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5 text-sm leading-6 text-slate-400">
                <div>• Internal CPO No. is generated automatically.</div>
                <div>• Customer PO No. comes from the customer document.</div>
                <div>• Linked quotation is filtered by selected client.</div>
                <div>• Quotation fields auto-fill but remain editable.</div>
                <div>• Customer PO document is required at creation.</div>
                <div>• Verification is controlled from the detail page.</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
