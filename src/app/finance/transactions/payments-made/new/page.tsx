import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CreditCard,
  FileText,
  Link2,
  Save,
  Upload,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type BillOption = {
  id: string;
  bill_number: string;
  external_document_number: string | null;
  document_type: "vendor_pi" | "vendor_invoice";
  vendor_id: string;
  purchase_order_id: string | null;
  vendor_quotation_id: string | null;
  issue_date: string;
  due_date: string;
  status: string;
  approval_status: string | null;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  balance_due: number | string | null;
  vendor_name?: string | null;
  vendor_legal_name?: string | null;
  vendor_code?: string | null;
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

type PaymentMethodOption = {
  id: string;
  name: string;
};

type BankAccountOption = {
  id: string;
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

function formatMoney(value: number | string | null | undefined, currency = "USD") {
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

  if (bank.account_identifier_type === "swift" && bank.account_identifier_value) {
    return `SWIFT ${bank.account_identifier_value}`;
  }

  if (bank.account_identifier_value) {
    return `Identifier ${bank.account_identifier_value}`;
  }

  if (bank.masked_account_number) return bank.masked_account_number;
  if (bank.account_number) return bank.account_number;

  return "No identifier";
}

async function uploadPaymentMadeProof(
  paymentId: string,
  selectedFile: File,
  userId: string
) {
  const safeFileName = selectedFile.name.replace(/\s+/g, "-");
  const storagePath = `payments-made/${paymentId}/${Date.now()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("finance-payment-made-proofs")
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
      mime_type: selectedFile.type || null,
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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [billId, setBillId] = useState(sourceBillId);
  const [vendorId, setVendorId] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [amount, setAmount] = useState("");
  const [paymentCurrencyCode, setPaymentCurrencyCode] = useState("");
  const [billCurrencyCode, setBillCurrencyCode] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [convertedAmount, setConvertedAmount] = useState("");
  const [exchangeRateSource, setExchangeRateSource] = useState("");
  const [exchangeRateDate, setExchangeRateDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paidFromBankAccountId, setPaidFromBankAccountId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const selectedBill = useMemo(
    () => bills.find((bill) => bill.id === billId) ?? null,
    [billId, bills]
  );

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === vendorId) ?? null,
    [vendorId, vendors]
  );

  const selectedBankAccount = useMemo(
    () => bankAccounts.find((bank) => bank.id === paidFromBankAccountId) ?? null,
    [bankAccounts, paidFromBankAccountId]
  );

  useEffect(() => {
    async function loadLookups() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [
          billsResult,
          vendorsResult,
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
                "purchase_order_id",
                "vendor_quotation_id",
                "issue_date",
                "due_date",
                "status",
                "approval_status",
                "total_amount",
                "paid_amount",
                "balance_due",
                "finance_vendors(name, legal_name, code)",
                "finance_purchase_orders(purchase_order_number)",
                "finance_vendor_quotations(vendor_quotation_number)",
              ].join(", ")
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
            .from("finance_payment_methods")
            .select("id, name")
            .eq("status", "active")
            .order("name", { ascending: true }),
          supabase
            .from("finance_bank_accounts")
            .select(
              [
                "id",
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
              ].join(", ")
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
              purchase_order_number:
                row.finance_purchase_orders?.purchase_order_number ?? null,
              vendor_quotation_number:
                row.finance_vendor_quotations?.vendor_quotation_number ?? null,
            };
          }
        );

        setBills(mappedBills);
        setVendors((vendorsResult.data || []) as unknown as VendorOption[]);
        setPaymentMethods(
          (paymentMethodsResult.data || []) as unknown as PaymentMethodOption[]
        );
        setBankAccounts(
          (bankAccountsResult.data || []) as unknown as BankAccountOption[]
        );
        setCurrencies(
          (currenciesResult.data || []) as unknown as CurrencyOption[]
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

    setVendorId(selectedBill.vendor_id || "");
    setAmount(String(selectedBill.balance_due ?? ""));
    setConvertedAmount(String(selectedBill.balance_due ?? ""));
    setBillCurrencyCode(selectedVendor?.currency_code || "USD");
    setPaymentCurrencyCode(selectedVendor?.currency_code || "USD");
    setReferenceNumber((current) => current || selectedBill.external_document_number || "");
  }, [selectedBill, selectedVendor?.currency_code]);

  useEffect(() => {
    const rawAmount = toNumber(amount);
    const rawExchangeRate = toNumber(exchangeRate) || 1;
    const calculated = Math.round(rawAmount * rawExchangeRate * 100) / 100;

    setConvertedAmount(String(calculated));
  }, [amount, exchangeRate]);

  const validateForm = useCallback(() => {
    if (!billId) return "Select an approved vendor PI / invoice.";
    if (!vendorId) return "Vendor is required.";
    if (!paymentDate) return "Select payment date.";
    if (!amount || toNumber(amount) <= 0) return "Payment amount must be above 0.";
    if (!paymentCurrencyCode) return "Select payment currency.";
    if (!billCurrencyCode) return "Select bill currency.";
    if (!exchangeRate || toNumber(exchangeRate) <= 0) {
      return "Exchange rate must be above 0.";
    }
    if (!paymentMethodId) return "Select payment method.";
    if (!selectedFile) return "Upload payment proof.";

    if (selectedBill && toNumber(convertedAmount) > toNumber(selectedBill.balance_due)) {
      return "Converted payment amount cannot exceed bill balance due.";
    }

    return "";
  }, [
    amount,
    billCurrencyCode,
    billId,
    convertedAmount,
    exchangeRate,
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
          exchange_rate_source: exchangeRateSource.trim() || null,
          exchange_rate_date: exchangeRateDate || null,
          paid_from_bank_account_id: paidFromBankAccountId || null,
          metadata: {
            source: "new_payment_made_page",
            expected_flow:
              "vendor_quotation_to_purchase_order_to_vendor_bill_to_payment_made",
            source_bill_number: selectedBill?.bill_number || null,
            source_vendor_document_number:
              selectedBill?.external_document_number || null,
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
        error instanceof Error ? error.message : "Failed to save payment made."
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
    paymentCurrencyCode,
    paymentDate,
    paymentMethodId,
    referenceNumber,
    selectedBill,
    selectedFile,
    validateForm,
    vendorId,
  ]);

  const fieldClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-emerald-400/30 focus:bg-black/30";
  const labelClass = "text-sm font-medium text-slate-300";
  const sectionCardClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl";
  const readOnlyBoxClass =
    "min-h-[44px] rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-sm text-slate-400 backdrop-blur-xl">
            Loading payment made form...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions/payments-made")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Payments Made
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="w-fit rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200 shadow-none">
                    New Payment Made
                  </Badge>

                  <Badge className="w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Step 04
                  </Badge>
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Register Payment Made
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Create an outgoing payment against an approved vendor PI /
                  invoice. The payment is saved as draft first and confirmed
                  from the ID page after verification.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                    className="h-11 rounded-2xl border border-emerald-400/20 bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Payment Draft"}
                  </Button>

                  {errorMessage ? (
                    <div className="flex min-h-11 items-center rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 text-sm text-rose-200">
                      {errorMessage}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Vendor
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {selectedVendor?.legal_name ||
                      selectedVendor?.name ||
                      "Not selected"}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    {selectedVendor?.code || "Select approved vendor bill."}
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Payment Amount
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {formatMoney(
                      convertedAmount || amount,
                      billCurrencyCode || paymentCurrencyCode || "USD"
                    )}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Saved as draft before confirmation.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
          <div className="space-y-6">
            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                    <Link2 className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Source Vendor Document
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Select an approved vendor PI / invoice with open balance.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5">
                <label className="space-y-2">
                  <div className={labelClass}>Approved Vendor PI / Invoice</div>
                  <select
                    value={billId}
                    onChange={(event) => setBillId(event.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Select approved vendor document</option>
                    {bills.map((bill) => (
                      <option key={bill.id} value={bill.id}>
                        {bill.bill_number} — {getDocumentTypeLabel(bill.document_type)} —{" "}
                        {bill.vendor_legal_name || bill.vendor_name || "Vendor"} — Balance{" "}
                        {formatMoney(
                          bill.balance_due,
                          selectedVendor?.currency_code || "USD"
                        )}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedBill ? (
                  <div className="rounded-[22px] border border-cyan-400/15 bg-cyan-500/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/70">
                      Selected Payable
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {selectedBill.bill_number}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">
                      Vendor Ref:{" "}
                      {selectedBill.external_document_number || "—"} · Due:{" "}
                      {formatDate(selectedBill.due_date)} · Balance:{" "}
                      {formatMoney(
                        selectedBill.balance_due,
                        billCurrencyCode || selectedVendor?.currency_code || "USD"
                      )}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-3 text-emerald-200">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Payment Details
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Amount, payment method, currency, and bank source.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                <label className="space-y-2">
                  <div className={labelClass}>Payment Date</div>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(event) => setPaymentDate(event.target.value)}
                    className={fieldClass}
                  />
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Amount Paid</div>
                  <input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className={fieldClass}
                  />
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Payment Currency</div>
                  <select
                    value={paymentCurrencyCode}
                    onChange={(event) => setPaymentCurrencyCode(event.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Select currency</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.currency_code}>
                        {currency.currency_code} — {currency.currency_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Bill Currency</div>
                  <select
                    value={billCurrencyCode}
                    onChange={(event) => setBillCurrencyCode(event.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Select bill currency</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.currency_code}>
                        {currency.currency_code} — {currency.currency_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Exchange Rate</div>
                  <input
                    value={exchangeRate}
                    onChange={(event) => setExchangeRate(event.target.value)}
                    className={fieldClass}
                  />
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Converted / Effective Amount</div>
                  <input
                    value={convertedAmount}
                    onChange={(event) => setConvertedAmount(event.target.value)}
                    className={fieldClass}
                  />
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Exchange Rate Source</div>
                  <input
                    value={exchangeRateSource}
                    onChange={(event) => setExchangeRateSource(event.target.value)}
                    placeholder="Bank / Wise / manual"
                    className={fieldClass}
                  />
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Exchange Rate Date</div>
                  <input
                    type="date"
                    value={exchangeRateDate}
                    onChange={(event) => setExchangeRateDate(event.target.value)}
                    className={fieldClass}
                  />
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Payment Method</div>
                  <select
                    value={paymentMethodId}
                    onChange={(event) => setPaymentMethodId(event.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Select payment method</option>
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Paid From Bank Account</div>
                  <select
                    value={paidFromBankAccountId}
                    onChange={(event) =>
                      setPaidFromBankAccountId(event.target.value)
                    }
                    className={fieldClass}
                  >
                    <option value="">Select company bank account</option>
                    {bankAccounts.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.bank_name || bank.institution_name || "Bank"} —{" "}
                        {getBankIdentifier(bank)}
                        {bank.currency_code ? ` — ${bank.currency_code}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <div className={labelClass}>Reference Number</div>
                  <input
                    value={referenceNumber}
                    onChange={(event) => setReferenceNumber(event.target.value)}
                    placeholder="Bank transfer / receipt reference"
                    className={fieldClass}
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <div className={labelClass}>Notes</div>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/30 focus:bg-black/30"
                  />
                </label>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-3 text-emerald-200">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Payment Proof
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      Required. Store the transfer proof / payment receipt.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 p-5">
                <input
                  type="file"
                  onChange={(event) =>
                    setSelectedFile(event.target.files?.[0] || null)
                  }
                  className="block w-full text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white hover:file:bg-white/20"
                />

                {selectedFile ? (
                  <div className="rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    Selected file: {selectedFile.name}
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    Payment proof is required.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Payment Summary
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Payment Amount
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatMoney(amount, paymentCurrencyCode || "USD")}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Effective Bill Amount
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {formatMoney(convertedAmount, billCurrencyCode || "USD")}
                  </div>
                </div>

                {selectedBill ? (
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Remaining After Draft
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {formatMoney(
                        Math.max(
                          toNumber(selectedBill.balance_due) -
                            toNumber(convertedAmount),
                          0
                        ),
                        billCurrencyCode || "USD"
                      )}
                    </div>
                  </div>
                ) : null}

                {selectedBankAccount ? (
                  <div className="rounded-[20px] border border-cyan-400/15 bg-cyan-500/10 px-4 py-3 text-sm leading-6 text-cyan-100">
                    Paid from:{" "}
                    {selectedBankAccount.bank_name ||
                      selectedBankAccount.institution_name ||
                      "Bank"}{" "}
                    · {getBankIdentifier(selectedBankAccount)}
                  </div>
                ) : null}

                <div className="rounded-[20px] border border-emerald-400/15 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-100">
                  This payment is saved as draft. Confirm from the ID page after
                  checking proof and balance.
                </div>

                {errorMessage ? (
                  <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {errorMessage}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className={sectionCardClass}>
              <CardHeader className="border-b border-white/10 px-5 py-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Reverse Flow Position
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-2 p-5 text-sm leading-6 text-slate-400">
                <div>• Vendor PI / invoice is approved.</div>
                <div>• Payment made draft is created with proof.</div>
                <div>• Payment is confirmed from the ID page.</div>
                <div>• Confirmed payment updates paid amount.</div>
                <div>• Bill balance updates automatically.</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
