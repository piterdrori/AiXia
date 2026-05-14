import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CreditCard,
  FileText,
  Link2,
  Receipt,
  Save,
  Upload,
  Wallet,
} from "lucide-react";

import {
  AixiaAlert,
  AixiaBadge,
  AixiaButton,
  AixiaDisplayBlock,
  AixiaDocumentUploadPanel,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaHero,
  AixiaInputField,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaPage,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaTextareaField,
  AixiaValueBlock,
} from "@/components/aixia";
import { convertCurrencyLive } from "@/lib/integrations/frankfurter";
import { supabase } from "@/lib/supabase";

type BillOption = {
  id: string;
  bill_number: string;
  external_document_number: string | null;
  document_type: "vendor_pi" | "vendor_invoice";
  vendor_id: string;
  company_id: string | null;
  purchase_order_id: string | null;
  vendor_quotation_id: string | null;
  issue_date: string;
  due_date: string;
  status: string;
  approval_status: string | null;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  balance_due: number | string | null;
  currency_code: string | null;
  vendor_name?: string | null;
  vendor_legal_name?: string | null;
  vendor_code?: string | null;
  company_name?: string | null;
  company_legal_name?: string | null;
  purchase_order_number?: string | null;
  vendor_quotation_number?: string | null;
};

type VendorOption = {
  id: string;
  code: string | null;
  name: string;
  legal_name: string | null;
  currency_code: string | null;
};

type CompanyOption = {
  id: string;
  name: string;
  legal_name: string | null;
  currency_code: string | null;
};

type PaymentMethodOption = {
  id: string;
  name: string;
};

type BankAccountOption = {
  id: string;
  company_id: string | null;
  company_code: string | null;
  bank_name: string | null;
  institution_name: string | null;
  beneficiary_name: string | null;
  iban: string | null;
  swift_code: string | null;
  account_identifier_type: string | null;
  account_identifier_value: string | null;
  account_number: string | null;
  masked_account_number: string | null;
  currency_code: string | null;
  is_default: boolean | null;
};

type CurrencyOption = {
  id: string;
  currency_code: string;
  currency_name: string;
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(
  value: number | string | null | undefined,
  currency = "USD",
) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
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

function getDocumentTypeLabel(documentType: string | null | undefined) {
  return documentType === "vendor_pi" ? "Vendor PI" : "Vendor Invoice";
}

function getBankIdentifier(bank: BankAccountOption) {
  if (bank.iban) return `IBAN ${bank.iban}`;
  if (bank.swift_code) return `SWIFT ${bank.swift_code}`;

  if (
    bank.account_identifier_type === "swift" &&
    bank.account_identifier_value
  ) {
    return `SWIFT ${bank.account_identifier_value}`;
  }

  if (bank.account_identifier_value) {
    return `Identifier ${bank.account_identifier_value}`;
  }

  if (bank.masked_account_number) return bank.masked_account_number;
  if (bank.account_number) return bank.account_number;

  return "No identifier";
}

function getBankName(bank: BankAccountOption) {
  return bank.bank_name || bank.institution_name || "Bank";
}

function resolveUploadMimeType(file: File) {
  const currentType = file.type?.trim();

  if (currentType && currentType !== "application/octet-stream") {
    return currentType;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default:
      return currentType || "application/octet-stream";
  }
}

async function uploadPaymentMadeProof(
  paymentId: string,
  selectedFile: File,
  userId: string,
) {
  const safeFileName = selectedFile.name.replace(/\s+/g, "-");
  const storagePath = `payments-made/${paymentId}/${Date.now()}-${safeFileName}`;
  const resolvedMimeType = resolveUploadMimeType(selectedFile);

  const { error: uploadError } = await supabase.storage
    .from("finance-payment-made-proofs")
    .upload(storagePath, selectedFile, {
      upsert: false,
      contentType: resolvedMimeType,
    });

  if (uploadError) throw uploadError;

  const { data: fileUploadRow, error: fileUploadError } = await supabase
    .from("file_uploads")
    .insert({
      user_id: userId,
      file_name: selectedFile.name,
      file_path: storagePath,
      file_size: selectedFile.size,
      mime_type: resolvedMimeType,
      entity_type: "finance_payment_made",
    })
    .select("id")
    .single();

  if (fileUploadError) throw fileUploadError;

  const { error: attachmentError } = await supabase
    .from("finance_record_attachments")
    .insert({
      entity_type: "finance_payment_made",
      entity_id: paymentId,
      file_upload_id: fileUploadRow.id,
      uploaded_by: userId,
      notes: "Payment made proof",
      metadata: {
        bucket: "finance-payment-made-proofs",
        uploaded_from: "new_payment_made_page",
      },
    });

  if (attachmentError) throw attachmentError;
}

export default function FinanceNewPaymentMadePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const sourceBillId = searchParams.get("bill_id") || "";

  const [bills, setBills] = useState<BillOption[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>(
    [],
  );
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConvertingExchangeRate, setIsConvertingExchangeRate] =
    useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  const [billId, setBillId] = useState(sourceBillId);
  const [vendorId, setVendorId] = useState("");
  const [paidFromCompanyId, setPaidFromCompanyId] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [amount, setAmount] = useState("");
  const [paymentCurrencyCode, setPaymentCurrencyCode] = useState("");
  const [billCurrencyCode, setBillCurrencyCode] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [convertedAmount, setConvertedAmount] = useState("");
  const [exchangeRateSource, setExchangeRateSource] = useState(
    "Frankfurter live API",
  );
  const [exchangeRateDate, setExchangeRateDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paidFromBankAccountId, setPaidFromBankAccountId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const selectedBill = useMemo(
    () => bills.find((bill) => bill.id === billId) ?? null,
    [billId, bills],
  );

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === vendorId) ?? null,
    [vendorId, vendors],
  );

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === paidFromCompanyId) ?? null,
    [companies, paidFromCompanyId],
  );

  const filteredBankAccounts = useMemo(() => {
    if (!paidFromCompanyId) return [];

    return bankAccounts.filter((bank) => bank.company_id === paidFromCompanyId);
  }, [bankAccounts, paidFromCompanyId]);

  const selectedBankAccount = useMemo(
    () =>
      filteredBankAccounts.find((bank) => bank.id === paidFromBankAccountId) ??
      null,
    [filteredBankAccounts, paidFromBankAccountId],
  );

  useEffect(() => {
    async function loadLookups() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [
          billsResult,
          vendorsResult,
          companiesResult,
          paymentMethodsResult,
          bankAccountsResult,
          currenciesResult,
        ] = await Promise.all([
          supabase
            .from("finance_bills_received")
            .select(
              [
                "id",
                "bill_number",
                "external_document_number",
                "document_type",
                "vendor_id",
                "company_id",
                "purchase_order_id",
                "vendor_quotation_id",
                "issue_date",
                "due_date",
                "status",
                "approval_status",
                "total_amount",
                "paid_amount",
                "balance_due",
                "currency_code",
                "finance_vendors(name, legal_name, code)",
                "finance_companies(name, legal_name)",
                "finance_purchase_orders(purchase_order_number)",
                "finance_vendor_quotations(vendor_quotation_number)",
              ].join(", "),
            )
            .eq("approval_status", "approved")
            .in("status", ["open", "partially_paid", "overdue"])
            .gt("balance_due", 0)
            .order("due_date", { ascending: true }),
          supabase
            .from("finance_vendors")
            .select("id, code, name, legal_name, currency_code")
            .order("name", { ascending: true }),
          supabase
            .from("finance_companies")
            .select("id, name, legal_name, currency_code")
            .eq("status", "active")
            .order("name", { ascending: true }),
          supabase
            .from("finance_payment_methods")
            .select("id, name")
            .eq("status", "active")
            .order("name", { ascending: true }),
          supabase
            .from("finance_bank_accounts")
            .select(
              [
                "id",
                "company_id",
                "company_code",
                "bank_name",
                "institution_name",
                "beneficiary_name",
                "iban",
                "swift_code",
                "account_identifier_type",
                "account_identifier_value",
                "account_number",
                "masked_account_number",
                "currency_code",
                "is_default",
              ].join(", "),
            )
            .order("is_default", { ascending: false })
            .order("bank_name", { ascending: true }),
          supabase
            .from("finance_currencies")
            .select("id, currency_code, currency_name")
            .eq("status", "active")
            .order("currency_code", { ascending: true }),
        ]);

        if (billsResult.error) throw billsResult.error;
        if (vendorsResult.error) throw vendorsResult.error;
        if (companiesResult.error) throw companiesResult.error;
        if (paymentMethodsResult.error) throw paymentMethodsResult.error;
        if (bankAccountsResult.error) throw bankAccountsResult.error;
        if (currenciesResult.error) throw currenciesResult.error;

        const mappedBills = ((billsResult.data || []) as unknown[]).map(
          (record) => {
            const row = record as BillOption & {
              finance_vendors?: {
                name?: string | null;
                legal_name?: string | null;
                code?: string | null;
              } | null;
              finance_companies?: {
                name?: string | null;
                legal_name?: string | null;
              } | null;
              finance_purchase_orders?: {
                purchase_order_number?: string | null;
              } | null;
              finance_vendor_quotations?: {
                vendor_quotation_number?: string | null;
              } | null;
            };

            return {
              ...row,
              vendor_name: row.finance_vendors?.name ?? null,
              vendor_legal_name: row.finance_vendors?.legal_name ?? null,
              vendor_code: row.finance_vendors?.code ?? null,
              company_name: row.finance_companies?.name ?? null,
              company_legal_name: row.finance_companies?.legal_name ?? null,
              purchase_order_number:
                row.finance_purchase_orders?.purchase_order_number ?? null,
              vendor_quotation_number:
                row.finance_vendor_quotations?.vendor_quotation_number ?? null,
            };
          },
        );

        setBills(mappedBills);
        setVendors((vendorsResult.data || []) as unknown as VendorOption[]);
        setCompanies(
          (companiesResult.data || []) as unknown as CompanyOption[],
        );
        setPaymentMethods(
          (paymentMethodsResult.data || []) as unknown as PaymentMethodOption[],
        );
        setBankAccounts(
          (bankAccountsResult.data || []) as unknown as BankAccountOption[],
        );
        setCurrencies(
          (currenciesResult.data || []) as unknown as CurrencyOption[],
        );
      } catch (error) {
        console.error("Failed to load payment made form data:", error);
        setErrorMessage("Failed to load payment made form data.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadLookups();
  }, []);

  useEffect(() => {
    if (!selectedBill) return;

    const resolvedBillCurrency =
      selectedBill.currency_code || selectedVendor?.currency_code || "USD";

    setVendorId(selectedBill.vendor_id || "");
    setPaidFromCompanyId(selectedBill.company_id || "");
    setPaidFromBankAccountId("");
    setAmount(String(selectedBill.balance_due ?? ""));
    setBillCurrencyCode(resolvedBillCurrency);
    setPaymentCurrencyCode(resolvedBillCurrency);
    setReferenceNumber(
      (current) => current || selectedBill.external_document_number || "",
    );
  }, [selectedBill, selectedVendor?.currency_code]);

  useEffect(() => {
    const rawAmount = toNumber(amount);

    if (
      !rawAmount ||
      rawAmount <= 0 ||
      !paymentCurrencyCode ||
      !billCurrencyCode
    ) {
      setConvertedAmount("");
      setExchangeRate("1");
      setExchangeRateSource("Frankfurter live API");
      setExchangeRateDate(new Date().toISOString().slice(0, 10));
      return;
    }

    let isCancelled = false;

    async function convertPaymentAmount() {
      try {
        setIsConvertingExchangeRate(true);

        const result = await convertCurrencyLive(
          rawAmount,
          paymentCurrencyCode,
          billCurrencyCode,
        );

        if (isCancelled) return;

        setExchangeRate(String(result.rate));
        setConvertedAmount(String(result.convertedAmount));
        setExchangeRateSource("Frankfurter live API");
        setExchangeRateDate(result.date);
      } catch (error) {
        if (isCancelled) return;

        console.error("Failed to convert payment currency:", error);
        setConvertedAmount(String(rawAmount));
        setExchangeRate(paymentCurrencyCode === billCurrencyCode ? "1" : "");
        setExchangeRateSource("Frankfurter live API");
        setExchangeRateDate(new Date().toISOString().slice(0, 10));
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to convert payment currency.",
        );
      } finally {
        if (!isCancelled) {
          setIsConvertingExchangeRate(false);
        }
      }
    }

    void convertPaymentAmount();

    return () => {
      isCancelled = true;
    };
  }, [amount, paymentCurrencyCode, billCurrencyCode]);

  const validateForm = useCallback(() => {
    if (!billId) return "Select an approved vendor PI / invoice.";
    if (!vendorId) return "Vendor is required.";
    if (!paidFromCompanyId) return "Paid from company is required.";
    if (!paymentDate) return "Select payment date.";
    if (!amount || toNumber(amount) <= 0)
      return "Payment amount must be above 0.";
    if (!paymentCurrencyCode) return "Select payment currency.";
    if (!billCurrencyCode) return "Select bill currency.";
    if (!exchangeRate || toNumber(exchangeRate) <= 0) {
      return "Live exchange rate is required.";
    }
    if (!convertedAmount || toNumber(convertedAmount) <= 0) {
      return "Effective bill amount is required.";
    }
    if (!paymentMethodId) return "Select payment method.";
    if (!selectedFile) return "Upload payment proof.";

    if (
      selectedBill &&
      toNumber(convertedAmount) > toNumber(selectedBill.balance_due)
    ) {
      return "Converted payment amount cannot exceed bill balance due.";
    }

    return "";
  }, [
    amount,
    billCurrencyCode,
    billId,
    convertedAmount,
    exchangeRate,
    paidFromCompanyId,
    paymentCurrencyCode,
    paymentDate,
    paymentMethodId,
    selectedBill,
    selectedFile,
    vendorId,
  ]);

  const handleSave = useCallback(async () => {
    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");
      setUploadMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const { data: payment, error: paymentError } = await supabase
        .from("finance_payments_made")
        .insert({
          bill_id: billId,
          vendor_id: vendorId,
          purchase_order_id: selectedBill?.purchase_order_id || null,
          vendor_quotation_id: selectedBill?.vendor_quotation_id || null,
          amount: toNumber(amount),
          payment_date: paymentDate,
          payment_method_id: paymentMethodId || null,
          reference_number: referenceNumber.trim() || null,
          status: "draft",
          notes: notes.trim() || null,
          payment_currency_code: paymentCurrencyCode,
          bill_currency_code: billCurrencyCode,
          exchange_rate: toNumber(exchangeRate),
          converted_amount: toNumber(convertedAmount),
          exchange_rate_source: exchangeRateSource || "Frankfurter live API",
          exchange_rate_date:
            exchangeRateDate || new Date().toISOString().slice(0, 10),
          paid_from_company_id: paidFromCompanyId,
          paid_from_bank_account_id: paidFromBankAccountId || null,
          metadata: {
            source: "new_payment_made_page",
            expected_flow:
              "vendor_quotation_to_purchase_order_to_vendor_bill_to_payment_made",
            source_bill_number: selectedBill?.bill_number || null,
            source_vendor_document_number:
              selectedBill?.external_document_number || null,
            paid_from_company_id: paidFromCompanyId,
            paid_from_company_name:
              selectedCompany?.legal_name || selectedCompany?.name || null,
            exchange_rate_provider: "Frankfurter live API",
          },
          created_by: user.id,
          updated_by: user.id,
        })
        .select("id")
        .single();

      if (paymentError) throw paymentError;

      const paymentId = (payment as { id: string }).id;

      await uploadPaymentMadeProof(paymentId, selectedFile!, user.id);

      navigate(`/finance/transactions/payments-made/${paymentId}`);
    } catch (error) {
      console.error("Failed to save payment made:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save payment made.",
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    amount,
    billCurrencyCode,
    billId,
    convertedAmount,
    exchangeRate,
    exchangeRateDate,
    exchangeRateSource,
    navigate,
    notes,
    paidFromBankAccountId,
    paidFromCompanyId,
    paymentCurrencyCode,
    paymentDate,
    paymentMethodId,
    referenceNumber,
    selectedBill,
    selectedCompany?.legal_name,
    selectedCompany?.name,
    selectedFile,
    validateForm,
    vendorId,
  ]);

  const handleDocumentPanelUpload = useCallback(() => {
    if (!selectedFile) {
      setErrorMessage("Upload payment proof.");
      setUploadMessage("");
      return;
    }

    setErrorMessage("");
    setUploadMessage(
      "Payment proof selected. It will be uploaded when the payment draft is saved.",
    );
  }, [selectedFile]);

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading payment made form"
        description="Approved bills, vendors, companies, currencies, payment methods, and bank accounts are being loaded."
      />
    );
  }

  const remainingAfterDraft =
    selectedBill && convertedAmount
      ? Math.max(
          toNumber(selectedBill.balance_due) - toNumber(convertedAmount),
          0,
        )
      : 0;

  const selectedBillLabel = selectedBill
    ? `${selectedBill.bill_number} · ${getDocumentTypeLabel(selectedBill.document_type)}`
    : "No payable selected";

  const vendorLabel =
    selectedVendor?.legal_name || selectedVendor?.name || "Not selected";

  const companyLabel =
    selectedCompany?.legal_name ||
    selectedCompany?.name ||
    selectedBill?.company_legal_name ||
    selectedBill?.company_name ||
    "Not selected";

  const effectiveAmountLabel = formatMoney(
    convertedAmount || amount,
    billCurrencyCode || "USD",
  );

  const paymentAmountLabel = formatMoney(amount, paymentCurrencyCode || "USD");

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Payments Made"
        parentPath="/finance/transactions/payments-made"
        badges={[
          { label: "New Payment Made", tone: "emerald" },
          { label: "Step 04", tone: "cyan" },
          ...(isConvertingExchangeRate
            ? [{ label: "Converting", tone: "violet" as const }]
            : []),
        ]}
        gradientTitle="Register"
        title="Payment Made"
        description="Create an outgoing payment against an approved vendor PI / invoice. Currency conversion is calculated automatically using the Frankfurter live API and the payment is saved as draft first."
        statusCards={[
          {
            label: "Paid To / Vendor",
            value: vendorLabel,
            description: selectedVendor?.code || "Select approved vendor bill.",
            icon: Receipt,
            tone: "emerald",
          },
          {
            label: "Paid From / AiXia Company",
            value: companyLabel,
            description: selectedBill?.purchase_order_number
              ? `From ${selectedBill.purchase_order_number}`
              : "Loaded from selected vendor document.",
            icon: Wallet,
            tone: "cyan",
          },
          {
            label: "Effective Bill Amount",
            value: effectiveAmountLabel,
            description: `Paid: ${paymentAmountLabel}`,
            icon: CreditCard,
            tone: "violet",
          },
        ]}
        actions={
          <>
            <AixiaButton
              type="button"
              variant="primary"
              onClick={() => void handleSave()}
              disabled={isSaving || isConvertingExchangeRate}
            >
              <Save className="h-4 w-4" />
              {isSaving
                ? "Saving..."
                : isConvertingExchangeRate
                  ? "Converting..."
                  : "Save Payment Draft"}
            </AixiaButton>
          </>
        }
      />

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Payment Amount"
          value={paymentAmountLabel}
          description="Actual outgoing payment currency."
          icon={CreditCard}
          tone="emerald"
        />
        <AixiaMetricCard
          label="Effective Bill Amount"
          value={effectiveAmountLabel}
          description="Amount applied to the vendor bill."
          icon={Receipt}
          tone="cyan"
        />
        <AixiaMetricCard
          label="Exchange Rate"
          value={toNumber(exchangeRate || 1)}
          description={`${paymentCurrencyCode || "—"} to ${billCurrencyCode || "—"}`}
          icon={Wallet}
          tone="violet"
        />
        <AixiaMetricCard
          label="Payment Proof"
          value={selectedFile ? "Selected" : "Required"}
          description="Proof is uploaded after the draft record is created."
          icon={Upload}
          tone={selectedFile ? "emerald" : "rose"}
        />
      </AixiaMetricGrid>

      {errorMessage ? (
        <AixiaAlert tone="error">{errorMessage}</AixiaAlert>
      ) : null}

      {uploadMessage ? (
        <AixiaAlert tone="success">{uploadMessage}</AixiaAlert>
      ) : null}

      <AixiaSmartLayout
        sidebar="normal"
        balance="main"
        bottomSpan="never"
        main={
          <>
            <AixiaSection
              title="Source Vendor Document"
              description="Select an approved vendor PI / invoice with open balance."
              icon={Link2}
            >
              <AixiaFormGrid columns="one">
                <AixiaFormField>
                  <AixiaFieldLabel
                    label="Approved Vendor PI / Invoice"
                    required
                  />
                  <AixiaSelectField
                    value={billId}
                    onChange={(event) => setBillId(event.target.value)}
                  >
                    <option value="">Select approved vendor document</option>
                    {bills.map((bill) => (
                      <option key={bill.id} value={bill.id}>
                        {bill.bill_number} —{" "}
                        {getDocumentTypeLabel(bill.document_type)} —{" "}
                        {bill.vendor_legal_name || bill.vendor_name || "Vendor"}{" "}
                        — Balance{" "}
                        {formatMoney(
                          bill.balance_due,
                          bill.currency_code || "USD",
                        )}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                {selectedBill ? (
                  <AixiaFormFullWidth>
                    <AixiaValueBlock
                      label="Selected Payable"
                      value={selectedBillLabel}
                      detail={`Vendor Ref: ${
                        selectedBill.external_document_number || "—"
                      } · Issued To: ${
                        selectedBill.company_legal_name ||
                        selectedBill.company_name ||
                        selectedCompany?.legal_name ||
                        selectedCompany?.name ||
                        "Company"
                      } · Due: ${formatDate(selectedBill.due_date)} · Balance: ${formatMoney(
                        selectedBill.balance_due,
                        billCurrencyCode || "USD",
                      )}`}
                    />
                  </AixiaFormFullWidth>
                ) : null}
              </AixiaFormGrid>
            </AixiaSection>

            <AixiaSection
              title="Payment Details"
              description="Amount, payment method, live currency conversion, and bank source."
              icon={CreditCard}
            >
              <AixiaFormGrid columns="two">
                <AixiaFormField>
                  <AixiaFieldLabel label="Payment Date" required />
                  <AixiaInputField
                    type="date"
                    value={paymentDate}
                    onChange={(event) => setPaymentDate(event.target.value)}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Amount Paid" required />
                  <AixiaInputField
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Payment Currency" required />
                  <AixiaSelectField
                    value={paymentCurrencyCode}
                    onChange={(event) =>
                      setPaymentCurrencyCode(event.target.value)
                    }
                  >
                    <option value="">Select currency</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.currency_code}>
                        {currency.currency_code} — {currency.currency_name}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Bill Currency" required />
                  <AixiaSelectField
                    value={billCurrencyCode}
                    onChange={(event) =>
                      setBillCurrencyCode(event.target.value)
                    }
                  >
                    <option value="">Select bill currency</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.currency_code}>
                        {currency.currency_code} — {currency.currency_name}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaDisplayBlock
                  label="Exchange Rate"
                  value={
                    isConvertingExchangeRate
                      ? "Converting..."
                      : toNumber(exchangeRate || 1)
                  }
                />

                <AixiaDisplayBlock
                  label="Effective Bill Amount"
                  value={
                    isConvertingExchangeRate
                      ? "Converting..."
                      : formatMoney(
                          convertedAmount || amount,
                          billCurrencyCode || "USD",
                        )
                  }
                />

                <AixiaDisplayBlock
                  label="Exchange Rate Source"
                  value={exchangeRateSource}
                />

                <AixiaDisplayBlock
                  label="Exchange Rate Date"
                  value={exchangeRateDate || "—"}
                />

                <AixiaFormField>
                  <AixiaFieldLabel label="Payment Method" required />
                  <AixiaSelectField
                    value={paymentMethodId}
                    onChange={(event) => setPaymentMethodId(event.target.value)}
                  >
                    <option value="">Select payment method</option>
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Paid From Bank Account" />
                  <AixiaSelectField
                    value={paidFromBankAccountId}
                    onChange={(event) =>
                      setPaidFromBankAccountId(event.target.value)
                    }
                  >
                    <option value="">Select company bank account</option>
                    {filteredBankAccounts.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {getBankName(bank)} — {getBankIdentifier(bank)}
                        {bank.currency_code ? ` — ${bank.currency_code}` : ""}
                      </option>
                    ))}
                  </AixiaSelectField>
                </AixiaFormField>

                <AixiaFormField>
                  <AixiaFieldLabel label="Reference Number" />
                  <AixiaInputField
                    value={referenceNumber}
                    onChange={(event) => setReferenceNumber(event.target.value)}
                    placeholder="Bank transfer / receipt reference"
                  />
                </AixiaFormField>

                <AixiaFormFullWidth>
                  <AixiaFieldLabel label="Notes" />
                  <AixiaTextareaField
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={4}
                  />
                </AixiaFormFullWidth>
              </AixiaFormGrid>
            </AixiaSection>
          </>
        }
        side={
          <>
            <AixiaSection
              title="Payment Proof"
              description="Required. Store the transfer proof or payment receipt."
              icon={Upload}
              badge={
                <AixiaBadge tone={selectedFile ? "emerald" : "rose"}>
                  {selectedFile ? "Selected" : "Required"}
                </AixiaBadge>
              }
            >
              <AixiaDocumentUploadPanel
                selectedFile={selectedFile}
                required
                uploading={isSaving}
                dropTitle="Drop payment proof here"
                dropDescription="Select the receipt or transfer proof. It will upload when the payment draft is saved."
                uploadLabel="Mark Proof Ready"
                uploadingLabel="Saving..."
                selectedFileLabel="Payment proof selected"
                emptyTitle="Payment proof required"
                emptyDescription="Attach the payment proof before saving the payment made draft."
                requiredMessage="Payment proof is required before the payment made draft can be saved."
                onFileSelect={(file) => {
                  setSelectedFile(file);
                  setUploadMessage("");
                }}
                onRemoveSelectedFile={() => {
                  setSelectedFile(null);
                  setUploadMessage("");
                }}
                onUpload={handleDocumentPanelUpload}
              />
            </AixiaSection>

            <AixiaSection title="Payment Summary" icon={Receipt}>
              <AixiaValueBlock
                label="Payment Amount"
                value={formatMoney(amount, paymentCurrencyCode || "USD")}
              />
              <AixiaValueBlock
                label="Effective Bill Amount"
                value={formatMoney(convertedAmount, billCurrencyCode || "USD")}
              />
              {selectedBill ? (
                <AixiaValueBlock
                  label="Remaining After Draft"
                  value={formatMoney(
                    remainingAfterDraft,
                    billCurrencyCode || "USD",
                  )}
                />
              ) : null}
              {selectedBankAccount ? (
                <AixiaAlert tone="info">
                  Paid from: {getBankName(selectedBankAccount)} ·{" "}
                  {getBankIdentifier(selectedBankAccount)}
                </AixiaAlert>
              ) : null}
              <AixiaAlert tone="info">
                Exchange: {paymentCurrencyCode || "—"} →{" "}
                {billCurrencyCode || "—"} · Source: {exchangeRateSource} · Date:{" "}
                {exchangeRateDate || "—"}
              </AixiaAlert>
              <AixiaAlert tone="success">
                This payment is saved as draft. Confirm from the ID page after
                checking proof and balance.
              </AixiaAlert>
            </AixiaSection>

            <AixiaSection title="Reverse Flow Position" icon={FileText}>
              <AixiaAlert tone="info">
                Vendor PI / invoice is approved. Payment made draft is created
                with proof. Exchange rate is calculated automatically. Payment
                is confirmed from the ID page. Bill balance updates
                automatically.
              </AixiaAlert>
            </AixiaSection>
          </>
        }
      />
    </AixiaPage>
  );
}
