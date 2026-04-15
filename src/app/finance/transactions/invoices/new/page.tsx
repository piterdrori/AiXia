import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

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

type ClientOption = {
  id: string;
  name: string;
  legal_name: string | null;
  company_email: string | null;
  personnel_email: string | null;
  company_phone: string | null;
  personnel_phone: string | null;
  currency_code: string | null;
  payment_terms_days: number | null;
  payment_terms_id: string | null;
};

type CompanyOption = {
  id: string;
  name: string;
  legal_name: string | null;
  company_email: string | null;
  personnel_email: string | null;
  company_phone: string | null;
  personnel_phone: string | null;
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

type InvoiceItemRow = {
  localId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
};

function createRow(): InvoiceItemRow {
  return {
    localId: crypto.randomUUID(),
    description: "",
    quantity: "1",
    unitPrice: "0",
    discount: "0",
  };
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number, currencyCode = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function buildDraftInvoiceNumber() {
  return `INV-DRAFT-${Date.now()}`;
}

export default function FinanceNewInvoicePage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);

  const [clientId, setClientId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");

  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState("");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<InvoiceItemRow[]>([createRow()]);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId) ?? null,
    [clientId, clients]
  );

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === companyId) ?? null,
    [companies, companyId]
  );

  const filteredTasks = useMemo(() => {
    if (!projectId) {
      return tasks;
    }

    return tasks.filter((task) => task.project_id === projectId);
  }, [projectId, tasks]);

  useEffect(() => {
    if (!selectedClient) {
      return;
    }

    setCurrencyCode(selectedClient.currency_code || "USD");

    if (!dueDate) {
      const days = selectedClient.payment_terms_days ?? 14;
      const base = new Date(issueDate || new Date().toISOString().slice(0, 10));
      base.setDate(base.getDate() + days);
      setDueDate(base.toISOString().slice(0, 10));
    }
  }, [dueDate, issueDate, selectedClient]);

  useEffect(() => {
    if (!projectId) {
      setTaskId("");
      return;
    }

    const matchingTaskStillValid = filteredTasks.some((task) => task.id === taskId);

    if (!matchingTaskStillValid) {
      setTaskId("");
    }
  }, [filteredTasks, projectId, taskId]);

  const loadFormData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [clientsResult, companiesResult, projectsResult, tasksResult] =
        await Promise.all([
          supabase
            .from("finance_clients")
            .select(
              "id, name, legal_name, company_email, personnel_email, company_phone, personnel_phone, currency_code, payment_terms_days, payment_terms_id"
            )
            .eq("status", "active")
            .order("name", { ascending: true }),

          supabase
            .from("finance_companies")
            .select(
              "id, name, legal_name, company_email, personnel_email, company_phone, personnel_phone"
            )
            .eq("status", "active")
            .order("name", { ascending: true }),

          supabase
            .from("projects")
            .select("id, name")
            .order("name", { ascending: true }),

          supabase
            .from("tasks")
            .select("id, title, project_id")
            .order("created_at", { ascending: false }),
        ]);

      if (clientsResult.error) throw clientsResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (projectsResult.error) throw projectsResult.error;
      if (tasksResult.error) throw tasksResult.error;

      setClients((clientsResult.data || []) as ClientOption[]);
      setCompanies((companiesResult.data || []) as CompanyOption[]);
      setProjects((projectsResult.data || []) as ProjectOption[]);
      setTasks((tasksResult.data || []) as TaskOption[]);

      if (!companyId && (companiesResult.data || []).length === 1) {
        setCompanyId(companiesResult.data![0].id);
      }
    } catch (error) {
      console.error("Failed to load invoice form data:", error);
      setErrorMessage("Failed to load invoice form data.");
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadFormData();
  }, [loadFormData]);

  const totals = useMemo(() => {
    const subtotal = rows.reduce(
      (sum, row) => sum + toNumber(row.quantity) * toNumber(row.unitPrice),
      0
    );

    const discount = rows.reduce((sum, row) => sum + toNumber(row.discount), 0);
    const tax = 0;
    const total = Math.max(subtotal - discount + tax, 0);

    return {
      subtotal,
      discount,
      tax,
      total,
    };
  }, [rows]);

  const updateRow = useCallback(
    (localId: string, field: keyof InvoiceItemRow, value: string) => {
      setRows((current) =>
        current.map((row) =>
          row.localId === localId ? { ...row, [field]: value } : row
        )
      );
    },
    []
  );

  const addRow = useCallback(() => {
    setRows((current) => [...current, createRow()]);
  }, []);

  const removeRow = useCallback((localId: string) => {
    setRows((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((row) => row.localId !== localId);
    });
  }, []);

  const handleSaveDraft = useCallback(async () => {
    setErrorMessage("");

    if (!clientId) {
      setErrorMessage("Select a client.");
      return;
    }

    if (!companyId) {
      setErrorMessage("Select an issuing company.");
      return;
    }

    const validRows = rows.filter(
      (row) =>
        row.description.trim() &&
        toNumber(row.quantity) > 0 &&
        toNumber(row.unitPrice) >= 0
    );

    if (validRows.length === 0) {
      setErrorMessage("Add at least one valid line item.");
      return;
    }

    setIsSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const { data: createdInvoice, error: invoiceError } = await supabase
        .from("finance_invoices_issued")
        .insert({
          invoice_number: buildDraftInvoiceNumber(),
          client_id: clientId,
          company_id: companyId,
          project_id: projectId || null,
          task_id: taskId || null,
          issue_date: issueDate,
          due_date: dueDate || issueDate,
          status: "draft",
          approval_status: null,
          payment_status: "unpaid",
          subtotal: 0,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: 0,
          paid_amount: 0,
          balance_due: 0,
          notes: notes || null,
          currency_code: currencyCode || "USD",
          exchange_rate: 1,
          posted_to_ledger: false,
          metadata: {
            creation_mode: "manual_draft",
          },
          created_by: user.id,
          updated_by: user.id,
        })
        .select("id")
        .single();

      if (invoiceError) throw invoiceError;
      if (!createdInvoice?.id) throw new Error("Invoice was not created");

      const linePayload = validRows.map((row, index) => ({
        invoice_id: createdInvoice.id,
        description: row.description.trim(),
        quantity: toNumber(row.quantity),
        unit_price: toNumber(row.unitPrice),
        discount: toNumber(row.discount),
        sort_order: index + 1,
        status: "active",
        posted_to_ledger: false,
        metadata: {},
        created_by: user.id,
        updated_by: user.id,
      }));

      const { error: lineError } = await supabase
        .from("finance_invoice_issued_line_items")
        .insert(linePayload);

      if (lineError) throw lineError;

      navigate(`/finance/transactions/invoices/${createdInvoice.id}`);
    } catch (error) {
      console.error("Failed to save invoice draft:", error);
      setErrorMessage("Failed to save invoice draft.");
    } finally {
      setIsSaving(false);
    }
  }, [
    clientId,
    companyId,
    currencyCode,
    dueDate,
    issueDate,
    navigate,
    notes,
    projectId,
    rows,
    taskId,
  ]);

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
                    New invoice draft
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    Create Invoice Draft
                  </h1>
                  <div className="text-sm text-white/45">
                    Build a draft from master data, save it, then issue it later
                    from the invoice detail page.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 xl:justify-end">
                <Button
                  variant="outline"
                  onClick={() => navigate("/finance/transactions/invoices")}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                <Button
                  variant="outline"
                  onClick={() => void loadFormData()}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Sources
                </Button>

                <Button
                  onClick={() => void handleSaveDraft()}
                  disabled={isSaving || isLoading}
                  className="h-11 rounded-2xl px-4"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Draft"}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <CardTitle className="text-white">Invoice Header</CardTitle>
                <CardDescription className="text-white/45">
                  Select the commercial and operational sources for the invoice.
                </CardDescription>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <label className="space-y-2">
                  <div className="text-sm text-white/70">Issuing Company</div>
                  <select
                    value={companyId}
                    onChange={(event) => setCompanyId(event.target.value)}
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
                  <div className="text-sm text-white/70">Client</div>
                  <select
                    value={clientId}
                    onChange={(event) => setClientId(event.target.value)}
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
                  <div className="text-sm text-white/70">Project</div>
                  <select
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
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
                    value={taskId}
                    onChange={(event) => setTaskId(event.target.value)}
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
                  <div className="text-sm text-white/70">Issue Date</div>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(event) => setIssueDate(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-sm text-white/70">Due Date</div>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-sm text-white/70">Currency</div>
                  <input
                    value={currencyCode}
                    onChange={(event) =>
                      setCurrencyCode(event.target.value.toUpperCase())
                    }
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                  />
                </label>

                <div className="space-y-2">
                  <div className="text-sm text-white/70">Client Email</div>
                  <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/70">
                    {selectedClient?.company_email ||
                      selectedClient?.personnel_email ||
                      "—"}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-white/70">Client Phone</div>
                  <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/70">
                    {selectedClient?.company_phone ||
                      selectedClient?.personnel_phone ||
                      "—"}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-white/70">Company Email</div>
                  <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/70">
                    {selectedCompany?.company_email ||
                      selectedCompany?.personnel_email ||
                      "—"}
                  </div>
                </div>

                <label className="space-y-2 md:col-span-2">
                  <div className="text-sm text-white/70">Notes</div>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                  />
                </label>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-white">Line Items</CardTitle>
                    <CardDescription className="text-white/45">
                      Add the commercial lines that will form the invoice total.
                    </CardDescription>
                  </div>

                  <Button onClick={addRow} className="h-10 rounded-2xl px-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Row
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 p-5">
                {rows.map((row, index) => {
                  const rowTotal = Math.max(
                    toNumber(row.quantity) * toNumber(row.unitPrice) -
                      toNumber(row.discount),
                    0
                  );

                  return (
                    <div
                      key={row.localId}
                      className="rounded-[22px] border border-white/8 bg-black/15 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div className="text-sm font-medium text-white">
                          Line {index + 1}
                        </div>

                        <Button
                          variant="outline"
                          onClick={() => removeRow(row.localId)}
                          disabled={rows.length === 1}
                          className="h-9 rounded-2xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <label className="space-y-2 md:col-span-5">
                          <div className="text-sm text-white/70">Description</div>
                          <input
                            value={row.description}
                            onChange={(event) =>
                              updateRow(
                                row.localId,
                                "description",
                                event.target.value
                              )
                            }
                            className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                          />
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <div className="text-sm text-white/70">Qty</div>
                          <input
                            value={row.quantity}
                            onChange={(event) =>
                              updateRow(row.localId, "quantity", event.target.value)
                            }
                            className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                          />
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <div className="text-sm text-white/70">Unit Price</div>
                          <input
                            value={row.unitPrice}
                            onChange={(event) =>
                              updateRow(row.localId, "unitPrice", event.target.value)
                            }
                            className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                          />
                        </label>

                        <label className="space-y-2 md:col-span-1">
                          <div className="text-sm text-white/70">Discount</div>
                          <input
                            value={row.discount}
                            onChange={(event) =>
                              updateRow(row.localId, "discount", event.target.value)
                            }
                            className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                          />
                        </label>

                        <div className="space-y-2 md:col-span-2">
                          <div className="text-sm text-white/70">Line Total</div>
                          <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white/80">
                            {formatMoney(rowTotal, currencyCode)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <CardTitle className="text-white">Draft Summary</CardTitle>
                <CardDescription className="text-white/45">
                  Preview totals before saving the invoice draft.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Issuing Company
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {selectedCompany?.legal_name || selectedCompany?.name || "—"}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Client
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {selectedClient?.legal_name || selectedClient?.name || "—"}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Subtotal
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {formatMoney(totals.subtotal, currencyCode)}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Discount
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {formatMoney(totals.discount, currencyCode)}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Tax
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {formatMoney(totals.tax, currencyCode)}
                  </div>
                </div>

                <div className="rounded-[20px] border border-cyan-400/15 bg-cyan-500/10 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                    Total
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {formatMoney(totals.total, currencyCode)}
                  </div>
                </div>

                {errorMessage ? (
                  <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {errorMessage}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 pb-4">
                <CardTitle className="text-white">Locked Behavior</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 p-5 text-sm text-white/55">
                <div>• This page creates a draft only.</div>
                <div>• Real invoice number is finalized on issue.</div>
                <div>• Issue action happens later from the detail page.</div>
                <div>• Master data supplies the source values.</div>
                <div>• Invoice snapshot is frozen when issued.</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-8 text-sm text-white/50">
            Loading invoice sources...
          </div>
        ) : null}
      </div>
    </div>
  );
}
