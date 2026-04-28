"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  CheckCircle,
  Eye,
  FileText,
  Link2,
  Paperclip,
  RotateCcw,
  Save,
  SquarePen,
  Trash2,
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

type QuotationOption = {
  id: string;
  quotation_number: string | null;
  status: string | null;
  total_amount: number | string | null;
  currency_code: string | null;
};

type ProformaOption = {
  id: string;
  proforma_number: string | null;
  status: string | null;
  total_amount: number | string | null;
  currency_code: string | null;
};

type CustomerPoAttachment = {
  id: string;
  entity_id: string;
  created_at: string | null;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
};

type CustomerPoLineItem = {
  id: string;
  client_po_id: string;
  item_id: string | null;
  description: string;
  quantity: number | string | null;
  unit_price: number | string | null;
  discount: number | string | null;
  line_total: number | string | null;
  sort_order: number | null;
  unit_of_measure_id: string | null;
  tax_code_id: string | null;
  revenue_category_id: string | null;
  project_id: string | null;
  task_id: string | null;
  status: string;
  notes: string | null;
  item?: {
    name: string | null;
  } | null;
  finance_units_of_measure?: {
    code: string | null;
    name: string | null;
  } | null;
  finance_tax_codes?: {
    code: string | null;
    name: string | null;
    rate_percent: number | string | null;
  } | null;
  finance_revenue_categories?: {
    code: string | null;
    name: string | null;
  } | null;
};

type CustomerPoEditDraft = {
  external_po_number: string;
  po_date: string;
  received_date: string;
  total_amount: string;
  notes: string;
};

type LineItemSortKey =
  | "line"
  | "description"
  | "item"
  | "quantity"
  | "unit_price"
  | "discount"
  | "tax"
  | "revenue"
  | "line_total";

type SortDirection = "asc" | "desc";

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(
  value: number | string | null | undefined,
  currencyCode = "USD"
) {
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

function getDateInputValue(value: string | null | undefined) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().slice(0, 10);
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
      return "border-slate-400/20 bg-white/[0.06] text-slate-300";
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

function compareValues(a: string | number, b: string | number) {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function getLineItemSortValue(line: CustomerPoLineItem, key: LineItemSortKey) {
  switch (key) {
    case "line":
      return line.sort_order ?? 0;
    case "description":
      return line.description || "";
    case "item":
      return line.item?.name || "";
    case "quantity":
      return toNumber(line.quantity);
    case "unit_price":
      return toNumber(line.unit_price);
    case "discount":
      return toNumber(line.discount);
    case "tax":
      return (
        line.finance_tax_codes?.name ||
        line.finance_tax_codes?.code ||
        String(line.finance_tax_codes?.rate_percent ?? "")
      );
    case "revenue":
      return (
        line.finance_revenue_categories?.name ||
        line.finance_revenue_categories?.code ||
        ""
      );
    case "line_total":
      return toNumber(line.line_total);
    default:
      return "";
  }
}

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export default function FinanceCustomerPoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [customerPo, setCustomerPo] = useState<CustomerPoRow | null>(null);
  const [quotation, setQuotation] = useState<QuotationOption | null>(null);
  const [proforma, setProforma] = useState<ProformaOption | null>(null);
  const [attachments, setAttachments] = useState<CustomerPoAttachment[]>([]);
  const [lineItems, setLineItems] = useState<CustomerPoLineItem[]>([]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editDraft, setEditDraft] = useState<CustomerPoEditDraft>({
    external_po_number: "",
    po_date: "",
    received_date: "",
    total_amount: "",
    notes: "",
  });

  const [lineSortKey, setLineSortKey] = useState<LineItemSortKey>("line");
  const [lineSortDirection, setLineSortDirection] =
    useState<SortDirection>("asc");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const loadCustomerPo = useCallback(async () => {
    if (!id) return;

    setIsLoading((current) => current || !customerPo);
    setError("");

    try {
      const { data: poData, error: poError } = await supabase
        .from("finance_client_purchase_orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (poError) throw poError;

      const typedPo = (poData || null) as CustomerPoRow | null;
      setCustomerPo(typedPo);

      if (typedPo) {
        setEditDraft({
          external_po_number: typedPo.external_po_number || "",
          po_date: getDateInputValue(typedPo.po_date),
          received_date: getDateInputValue(typedPo.received_at),
          total_amount:
            typedPo.total_amount !== null && typedPo.total_amount !== undefined
              ? String(typedPo.total_amount)
              : "",
          notes: typedPo.notes || "",
        });
      }

      if (typedPo?.quotation_id) {
        const { data: quotationData, error: quotationError } = await supabase
          .from("finance_quotations")
          .select("id, quotation_number, status, total_amount, currency_code")
          .eq("id", typedPo.quotation_id)
          .maybeSingle();

        if (quotationError) throw quotationError;
        setQuotation((quotationData || null) as QuotationOption | null);
      } else {
        setQuotation(null);
      }

      if (typedPo?.proforma_invoice_id) {
        const { data: proformaData, error: proformaError } = await supabase
          .from("finance_proforma_invoices")
          .select("id, proforma_number, status, total_amount, currency_code")
          .eq("id", typedPo.proforma_invoice_id)
          .maybeSingle();

        if (proformaError) throw proformaError;
        setProforma((proformaData || null) as ProformaOption | null);
      } else {
        setProforma(null);
      }

          const { data: attachmentData, error: attachmentError } = await supabase
        .from("finance_record_attachments")
        .select(`
          id,
          entity_id,
          created_at,
          file_uploads (
            file_name,
            file_path,
            file_size,
            mime_type
          )
        `)
        .eq("entity_type", "finance_client_purchase_order")
        .eq("entity_id", id)
        .order("created_at", { ascending: false });

      if (attachmentError) throw attachmentError;

      const mappedAttachments = ((attachmentData || []) as any[]).map(
        (row) => ({
          id: row.id,
          entity_id: String(row.entity_id || ""),
          created_at: row.created_at || null,
          file_name: row.file_uploads?.file_name || null,
          file_path: row.file_uploads?.file_path || null,
          file_size: row.file_uploads?.file_size || null,
          mime_type: row.file_uploads?.mime_type || null,
        })
      );

      setAttachments(mappedAttachments);

      const { data: lineItemData, error: lineItemError } = await supabase
        .from("finance_client_purchase_order_line_items")
        .select(`
          id,
          client_po_id,
          item_id,
          description,
          quantity,
          unit_price,
          discount,
          line_total,
          sort_order,
          unit_of_measure_id,
          tax_code_id,
          revenue_category_id,
          project_id,
          task_id,
          status,
          notes,
          item:finance_items (
            name
          ),
          finance_units_of_measure (
            code,
            name
          ),
          finance_tax_codes (
            code,
            name,
            rate_percent
          ),
          finance_revenue_categories (
            code,
            name
          )
        `)
        .eq("client_po_id", id)
        .neq("status", "deleted")
        .order("sort_order", { ascending: true });

      if (lineItemError) throw lineItemError;

      setLineItems((lineItemData || []) as unknown as CustomerPoLineItem[]);
    } catch (err) {
      console.error(err);
      setError("Failed to load Customer PO.");
    } finally {
      setIsLoading(false);
    }
  }, [customerPo, id]);

  useEffect(() => {
    void loadCustomerPo();
  }, [loadCustomerPo]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`finance-customer-po-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_client_purchase_orders",
          filter: `id=eq.${id}`,
        },
        () => void loadCustomerPo()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_record_attachments",
          filter: `entity_id=eq.${id}`,
        },
        () => void loadCustomerPo()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_client_purchase_order_line_items",
          filter: `client_po_id=eq.${id}`,
        },
        () => void loadCustomerPo()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadCustomerPo();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [id, loadCustomerPo]);

  const hasCustomerPoFile = attachments.length > 0;

  const sortedLineItems = useMemo(() => {
    return [...lineItems].sort((first, second) => {
      const firstValue = getLineItemSortValue(first, lineSortKey);
      const secondValue = getLineItemSortValue(second, lineSortKey);
      const directionMultiplier = lineSortDirection === "asc" ? 1 : -1;

      return compareValues(firstValue, secondValue) * directionMultiplier;
    });
  }, [lineItems, lineSortDirection, lineSortKey]);

  const lineSubtotal = lineItems.reduce(
    (sum, line) => sum + toNumber(line.quantity) * toNumber(line.unit_price),
    0
  );

  const lineDiscount = lineItems.reduce(
    (sum, line) => sum + toNumber(line.discount),
    0
  );

  const lineTotal = lineItems.reduce(
    (sum, line) => sum + toNumber(line.line_total),
    0
  );

  const lineTax = Math.max(lineTotal - (lineSubtotal - lineDiscount), 0);

  const canEditDetails =
    customerPo?.status !== "archived" &&
    customerPo?.status !== "deleted" &&
    customerPo?.status !== "linked_to_pi";

  function handleLineSort(nextKey: LineItemSortKey) {
    if (lineSortKey === nextKey) {
      setLineSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setLineSortKey(nextKey);
    setLineSortDirection(nextKey === "line" ? "asc" : "desc");
  }

  function getLineSortIndicator(key: LineItemSortKey) {
    if (lineSortKey !== key) return "↕";
    return lineSortDirection === "asc" ? "↑" : "↓";
  }

  function resetEditDraft() {
    if (!customerPo) return;

    setEditDraft({
      external_po_number: customerPo.external_po_number || "",
      po_date: getDateInputValue(customerPo.po_date),
      received_date: getDateInputValue(customerPo.received_at),
      total_amount:
        customerPo.total_amount !== null && customerPo.total_amount !== undefined
          ? String(customerPo.total_amount)
          : "",
      notes: customerPo.notes || "",
    });
  }

  function handleDropFile(fileList: FileList | null) {
    const file = fileList?.[0] || null;
    if (!file) return;
    setSelectedFile(file);
    setError("");
  }

  async function handleUploadCustomerPoFile() {
    if (!customerPo?.id || !selectedFile) {
      setError("Select a Customer PO file first.");
      return;
    }

    try {
      setIsUploading(true);
      setError("");

      const userId = await getCurrentUserId();

      if (!userId) {
        throw new Error("User not authenticated.");
      }

      const safeFileName = selectedFile.name.replace(/\s+/g, "-");
      const storagePath = `customer-po/${customerPo.id}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("finance-customer-po-documents")
        .upload(storagePath, selectedFile, {
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: fileUploadRow, error: fileUploadError } = await supabase
        .from("file_uploads")
        .insert({
          user_id: userId,
          file_name: selectedFile.name,
          file_path: storagePath,
          file_size: selectedFile.size,
          mime_type: selectedFile.type || "application/octet-stream",
          entity_type: "finance_client_purchase_order",
        })
        .select("id")
        .single();

      if (fileUploadError) throw fileUploadError;

      const { error: attachmentError } = await supabase
        .from("finance_record_attachments")
        .insert({
          entity_type: "finance_client_purchase_order",
          entity_id: customerPo.id,
          file_upload_id: fileUploadRow.id,
          uploaded_by: userId,
          notes: "Customer PO document upload",
          metadata: {
            bucket: "finance-customer-po-documents",
          },
        });

      if (attachmentError) throw attachmentError;

      setSelectedFile(null);
      await loadCustomerPo();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to upload Customer PO document."
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleOpenCustomerPoFile(attachment: CustomerPoAttachment) {
    if (!attachment.file_path) {
      setError("Customer PO file path is missing.");
      return;
    }

    const { data, error: signedUrlError } = await supabase.storage
      .from("finance-customer-po-documents")
      .createSignedUrl(attachment.file_path, 60);

    if (signedUrlError) {
      console.error(signedUrlError);
      setError("Failed to open Customer PO document.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function updateCustomerPoStatus(status: CustomerPoStatus) {
    if (!customerPo) return;

    if (status === "verified" && !hasCustomerPoFile) {
      setError("Customer PO document must be uploaded before verification.");
      return;
    }

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
        .eq("id", customerPo.id);

      if (updateError) throw updateError;

      await loadCustomerPo();

      if (status === "archived" || status === "deleted") {
        navigate("/finance/transactions/customer-pos");
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to update Customer PO."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleOpenNewProformaInvoiceFromCustomerPo() {
    if (!customerPo) return;

    if (customerPo.status !== "received") {
      setError(
        "Customer PO must be marked as received before creating a proforma invoice."
      );
      return;
    }

    if (!hasCustomerPoFile) {
      setError(
        "Customer PO document must be uploaded before creating a proforma invoice."
      );
      return;
    }

    if (customerPo.proforma_invoice_id) {
      navigate(
        `/finance/transactions/proforma-invoices/${customerPo.proforma_invoice_id}`
      );
      return;
    }

    navigate(
      `/finance/transactions/proforma-invoices/new?client_po_id=${customerPo.id}`
    );
  }

  async function handleSaveDetailsEdit() {
    if (!customerPo) return;

    if (!editDraft.external_po_number.trim()) {
      setError("Customer PO No. is required.");
      return;
    }

    if (!editDraft.total_amount || Number(editDraft.total_amount) <= 0) {
      setError("Total amount must be greater than 0.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const userId = await getCurrentUserId();

      const { error: updateError } = await supabase
        .from("finance_client_purchase_orders")
        .update({
          external_po_number: editDraft.external_po_number.trim(),
          reference_number: editDraft.external_po_number.trim(),
          po_date: editDraft.po_date || null,
          received_at: editDraft.received_date
            ? new Date(`${editDraft.received_date}T00:00:00`).toISOString()
            : null,
          total_amount: Number(editDraft.total_amount),
          notes: editDraft.notes.trim() || null,
          updated_by: userId,
        })
        .eq("id", customerPo.id)
        .not("status", "in", "(archived,deleted,linked_to_pi)");

      if (updateError) throw updateError;

      setIsEditingDetails(false);
      await loadCustomerPo();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to update Customer PO details."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRestore() {
    if (!customerPo) return;

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
        .eq("id", customerPo.id);

      if (restoreError) throw restoreError;

      await loadCustomerPo();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to restore Customer PO."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleHardDelete() {
    if (!customerPo) return;

    const confirmed = window.confirm(
      `Permanently delete ${customerPo.client_po_number || "this Customer PO"}?`
    );

    if (!confirmed) return;

    try {
      setIsSaving(true);
      setError("");

      const { error: deleteError } = await supabase
        .from("finance_client_purchase_orders")
        .delete()
        .eq("id", customerPo.id)
        .eq("status", "deleted");

      if (deleteError) throw deleteError;

      navigate("/finance/transactions/customer-pos");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to permanently delete Customer PO."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const activeSectionClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";

  const summaryBlockClass =
    "rounded-[24px] border border-white/10 bg-black/20 p-4";

  const fieldShellClass =
    "mt-2 h-10 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-slate-400">
            Loading Customer PO...
          </div>
        </div>
      </div>
    );
  }

  if (!customerPo) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-slate-400">
            Customer PO not found.
          </div>
        </div>
      </div>
    );
  }

  const currencyCode = customerPo.currency_code || "USD";

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

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
              <div>
                <Badge className="inline-flex w-fit rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200 shadow-none">
                  Customer Commitment
                </Badge>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                    {customerPo.client_po_number || "Customer PO"}
                  </h1>

                  <Badge
                    className={`rounded-full border px-3 py-1 text-xs shadow-none ${getStatusBadgeClasses(
                      customerPo.status
                    )}`}
                  >
                    {getStatusLabel(customerPo.status)}
                  </Badge>

                  <Badge
                    className={`rounded-full border px-3 py-1 text-xs shadow-none ${
                      hasCustomerPoFile
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                        : "border-rose-400/20 bg-rose-500/10 text-rose-200"
                    }`}
                  >
                    {hasCustomerPoFile ? "Document uploaded" : "Document required"}
                  </Badge>
                </div>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Customer PO received from the client. Create the proforma
                  invoice after the PO is marked as received and the customer
                  document is uploaded.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200 shadow-none">
                    Customer PO No. {customerPo.external_po_number || "—"}
                  </Badge>
                  <Badge className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200 shadow-none">
                    {formatMoney(customerPo.total_amount, currencyCode)}
                  </Badge>
                  <Badge className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300 shadow-none">
                    Auto-refresh enabled
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Linked Quotation
                      </p>
                      <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                        {quotation?.quotation_number || "—"}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                      <Link2 className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Source commercial offer linked to this Customer PO.
                  </p>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Linked PI
                      </p>
                      <p className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                        {proforma?.proforma_number || "—"}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
                      <FileText className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Proforma invoice generated or linked after verification.
                  </p>
                </div>
              </div>
            </div>

                        <div className="mt-6 flex flex-wrap gap-3">
              {customerPo.status === "draft" ? (
                <Button
                  onClick={() => void updateCustomerPoStatus("received")}
                  disabled={isSaving}
                  className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Received
                </Button>
              ) : null}

              {customerPo.status === "received" && !customerPo.proforma_invoice_id ? (
                <Button
                  onClick={() => handleOpenNewProformaInvoiceFromCustomerPo()}
                  disabled={isSaving || !hasCustomerPoFile}
                  title={
                    hasCustomerPoFile
                      ? "Create Proforma Invoice"
                      : "Upload Customer PO document before creating a proforma invoice"
                  }
                  className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Create Proforma Invoice
                </Button>
              ) : null}

              {customerPo.proforma_invoice_id ? (
                <Button
                  onClick={() =>
                    navigate(
                      `/finance/transactions/proforma-invoices/${customerPo.proforma_invoice_id}`
                    )
                  }
                  className="h-11 rounded-2xl border border-violet-400/20 bg-violet-500 px-4 font-semibold text-white hover:bg-violet-400"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Open Proforma Invoice
                </Button>
              ) : null}

              {customerPo.status === "archived" || customerPo.status === "deleted" ? (
                <Button
                  variant="outline"
                  onClick={() => void handleRestore()}
                  disabled={isSaving}
                  className="h-11 rounded-2xl border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-200 hover:bg-emerald-500/20"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </Button>
              ) : null}

              {customerPo.status !== "archived" && customerPo.status !== "deleted" ? (
                <Button
                  variant="outline"
                  onClick={() => void updateCustomerPoStatus("archived")}
                  disabled={isSaving}
                  className="h-11 rounded-2xl border-amber-400/20 bg-amber-500/10 px-4 text-amber-200 hover:bg-amber-500/20"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </Button>
              ) : null}

              {customerPo.status !== "deleted" ? (
                <Button
                  variant="outline"
                  onClick={() => void updateCustomerPoStatus("deleted")}
                  disabled={isSaving}
                  className="h-11 rounded-2xl border-rose-400/20 bg-rose-500/10 px-4 text-rose-200 hover:bg-rose-500/20"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              ) : null}

              {customerPo.status === "deleted" ? (
                <Button
                  variant="outline"
                  onClick={() => void handleHardDelete()}
                  disabled={isSaving}
                  className="h-11 rounded-2xl border-rose-500/30 bg-rose-500/10 px-4 text-rose-200 hover:bg-rose-500/20"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Hard Delete
                </Button>
              ) : null}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_420px]">
          <div className="space-y-6">
            <Card className={activeSectionClass}>
              <CardHeader className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Document Overview
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs text-slate-500">
                        Customer PO commercial details and source links.
                      </CardDescription>
                    </div>
                  </div>
                </div>

                {canEditDetails ? (
                  <div className="flex items-center gap-2">
                    {isEditingDetails ? (
                      <>
                        <Button
                          onClick={() => void handleSaveDetailsEdit()}
                          disabled={isSaving}
                          className="h-9 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-3 font-semibold text-slate-950 hover:bg-cyan-400"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isSaving ? "Saving..." : "Save"}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditingDetails(false);
                            resetEditDraft();
                          }}
                          className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setIsEditingDetails(true)}
                        className="h-9 rounded-2xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]"
                      >
                        <SquarePen className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    )}
                  </div>
                ) : null}
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
                <div className={summaryBlockClass}>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Internal CPO No.
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {customerPo.client_po_number || "Pending"}
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Customer PO No.
                  </div>
                  {isEditingDetails ? (
                    <input
                      value={editDraft.external_po_number}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          external_po_number: event.target.value,
                        }))
                      }
                      className={fieldShellClass}
                    />
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {customerPo.external_po_number || "—"}
                    </div>
                  )}
                </div>

                <div className={summaryBlockClass}>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Status
                  </div>
                  <div className="mt-2">
                    <Badge
                      className={`rounded-full border px-3 py-1 text-xs shadow-none ${getStatusBadgeClasses(
                        customerPo.status
                      )}`}
                    >
                      {getStatusLabel(customerPo.status)}
                    </Badge>
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Client
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {customerPo.client_name_snapshot || "—"}
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Company
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {customerPo.company_name_snapshot || "—"}
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    PO Date
                  </div>
                  {isEditingDetails ? (
                    <input
                      type="date"
                      value={editDraft.po_date}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          po_date: event.target.value,
                        }))
                      }
                      className={fieldShellClass}
                    />
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatDate(customerPo.po_date)}
                    </div>
                  )}
                </div>

                <div className={summaryBlockClass}>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Received
                  </div>
                  {isEditingDetails ? (
                    <input
                      type="date"
                      value={editDraft.received_date}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          received_date: event.target.value,
                        }))
                      }
                      className={fieldShellClass}
                    />
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatDate(customerPo.received_at)}
                    </div>
                  )}
                </div>

                <div className={summaryBlockClass}>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Verified
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatDate(customerPo.verified_at)}
                  </div>
                </div>

                <div className={summaryBlockClass}>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Total
                  </div>
                  {isEditingDetails ? (
                    <input
                      type="number"
                      value={editDraft.total_amount}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          total_amount: event.target.value,
                        }))
                      }
                      className={fieldShellClass}
                    />
                  ) : (
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatMoney(customerPo.total_amount, currencyCode)}
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:col-span-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Notes
                  </div>
                  {isEditingDetails ? (
                    <textarea
                      value={editDraft.notes}
                      onChange={(event) =>
                        setEditDraft((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      rows={4}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30"
                    />
                  ) : (
                    <div className="mt-2 text-sm leading-6 text-slate-300">
                      {customerPo.notes || "—"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

                        <Card className={activeSectionClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Customer PO Line Items
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Item-level details saved against this customer purchase
                      order. Header sorting is frontend-only.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <div className="max-h-[720px] overflow-y-auto">
                    <table className="w-full min-w-[1240px] border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-black/20 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          {[
                            ["line", "Line"],
                            ["description", "Description"],
                            ["item", "Item"],
                            ["quantity", "Qty"],
                            ["unit_price", "Unit Price"],
                            ["discount", "Discount"],
                            ["tax", "Tax"],
                            ["revenue", "Revenue"],
                            ["line_total", "Line Total"],
                          ].map(([key, label]) => (
                            <th
                              key={key}
                              className={`sticky top-0 z-10 bg-black/80 px-5 py-4 font-semibold ${
                                key === "quantity" ||
                                key === "unit_price" ||
                                key === "discount" ||
                                key === "line_total"
                                  ? "text-right"
                                  : ""
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handleLineSort(key as LineItemSortKey)
                                }
                                className={`inline-flex items-center gap-2 transition hover:text-white ${
                                  key === "quantity" ||
                                  key === "unit_price" ||
                                  key === "discount" ||
                                  key === "line_total"
                                    ? "ml-auto"
                                    : ""
                                }`}
                              >
                                {label}
                                <span className="text-[10px] text-slate-600">
                                  {getLineSortIndicator(
                                    key as LineItemSortKey
                                  )}
                                </span>
                              </button>
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-white/5">
                        {sortedLineItems.length === 0 ? (
                          <tr>
                            <td
                              colSpan={9}
                              className="px-5 py-14 text-center text-sm text-slate-500"
                            >
                              No Customer PO line items found.
                            </td>
                          </tr>
                        ) : (
                          sortedLineItems.map((line, index) => (
                            <tr
                              key={line.id}
                              className="text-sm text-slate-300 transition hover:bg-white/[0.035]"
                            >
                              <td className="px-5 py-4 font-semibold text-white">
                                {line.sort_order ?? index + 1}
                              </td>

                              <td className="px-5 py-4">
                                <div className="max-w-[360px] truncate font-medium text-white">
                                  {line.description || "Untitled line"}
                                </div>
                                {line.notes ? (
                                  <div className="mt-1 max-w-[360px] truncate text-xs text-slate-500">
                                    {line.notes}
                                  </div>
                                ) : null}
                              </td>

                              <td className="px-5 py-4">
                                {line.item?.name || "—"}
                              </td>

                              <td className="px-5 py-4 text-right font-semibold text-white">
                                {toNumber(line.quantity)}
                              </td>

                              <td className="px-5 py-4 text-right font-semibold text-white">
                                {formatMoney(line.unit_price, currencyCode)}
                              </td>

                              <td className="px-5 py-4 text-right font-semibold text-white">
                                {formatMoney(line.discount, currencyCode)}
                              </td>

                              <td className="px-5 py-4">
                                {line.finance_tax_codes?.name ||
                                  line.finance_tax_codes?.code ||
                                  "—"}
                              </td>

                              <td className="px-5 py-4">
                                {line.finance_revenue_categories?.name ||
                                  line.finance_revenue_categories?.code ||
                                  "—"}
                              </td>

                              <td className="px-5 py-4 text-right font-semibold text-white">
                                {formatMoney(line.line_total, currencyCode)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className={summaryBlockClass}>
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Subtotal
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {formatMoney(lineSubtotal, currencyCode)}
                </div>
              </div>

              <div className={summaryBlockClass}>
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Discount
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {formatMoney(lineDiscount, currencyCode)}
                </div>
              </div>

              <div className={summaryBlockClass}>
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Tax
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {formatMoney(lineTax, currencyCode)}
                </div>
              </div>

              <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-500/10 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/60">
                  Total
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {formatMoney(lineTotal, currencyCode)}
                </div>
              </div>
            </div>

            <Card className={activeSectionClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-violet-400/15 bg-violet-500/10 p-3 text-violet-200">
                    <Link2 className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Linked Documents
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Source quotation and downstream proforma invoice.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <div className={summaryBlockClass}>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Linked Quotation
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {quotation?.quotation_number || "—"}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {quotation
                      ? `${quotation.status || "—"} · ${formatMoney(
                          quotation.total_amount,
                          quotation.currency_code || currencyCode
                        )}`
                      : "No quotation linked."}
                  </div>
                  {quotation ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(
                          `/finance/transactions/quotations/${quotation.id}`
                        )
                      }
                      className="mt-4 h-9 rounded-2xl border-cyan-400/20 bg-cyan-500/10 px-3 text-cyan-200 hover:bg-cyan-500/20"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Open
                    </Button>
                  ) : null}
                </div>

                <div className={summaryBlockClass}>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Linked Proforma Invoice
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {proforma?.proforma_number || "—"}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {proforma
                      ? `${proforma.status || "—"} · ${formatMoney(
                          proforma.total_amount,
                          proforma.currency_code || currencyCode
                        )}`
                      : "No proforma invoice linked yet."}
                  </div>
                  {proforma ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(
                          `/finance/transactions/proforma-invoices/${proforma.id}`
                        )
                      }
                      className="mt-4 h-9 rounded-2xl border-violet-400/20 bg-violet-500/10 px-3 text-violet-200 hover:bg-violet-500/20"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Open
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>

                    <div className="space-y-6">
            <Card className={activeSectionClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                    <Paperclip className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Customer PO Document
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Upload or view the customer purchase order document.
                    </CardDescription>
                  </div>
                </div>
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
                  className={`flex min-h-[190px] w-full flex-col items-center justify-center rounded-[26px] border border-dashed px-6 py-8 text-center transition ${
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
                  onClick={() => void handleUploadCustomerPoFile()}
                  disabled={!selectedFile || isUploading}
                  className="h-11 w-full rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-40"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isUploading ? "Uploading..." : "Upload Document"}
                </Button>

                <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                  {attachments.length === 0 ? (
                    <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-200">
                      No Customer PO document uploaded. Verification is blocked.
                    </div>
                  ) : (
                    attachments.map((attachment) => (
                      <button
                        key={attachment.id}
                        type="button"
                        onClick={() => void handleOpenCustomerPoFile(attachment)}
                        className="flex w-full items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:bg-white/[0.045]"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Paperclip className="h-4 w-4 text-cyan-200" />
                            <span className="truncate">
                              {attachment.file_name || "Customer PO document"}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-white/45">
                            {formatDate(attachment.created_at)}
                          </div>
                        </div>

                        <ArrowRight className="h-4 w-4 shrink-0 text-white/35" />
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className={activeSectionClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-3 text-emerald-200">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Verification Rules
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Locked Customer PO workflow.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 p-5 text-sm leading-6 text-slate-400">
                <div>• Customer PO file is required before creating a proforma invoice.</div>
                <div>• Draft records must be marked as received first.</div>
                <div>• Create Proforma Invoice is available after received status and file upload.</div>
                <div>• Archive keeps the record recoverable.</div>
                <div>• Delete moves the record to deleted state.</div>
                <div>• Hard delete is only available from deleted state.</div>
              </CardContent>
            </Card>

            {error ? (
              <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
