import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  formatFinanceDate,
  formatFinanceMoney,
  getIssuedInvoiceById,
  getIssuedInvoicePaymentStatusLabel,
  getIssuedInvoiceStatusLabel,
} from "@/lib/finance/invoicesIssued";

type PaymentRow = {
  id: string;
  amount: number;
  payment_date: string;
  status: string;
  reference_number: string | null;
};

export default function FinanceInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isIssuing, setIsIssuing] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [error, setError] = useState("");

  const loadInvoice = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);

    try {
      const { invoice, lineItems } = await getIssuedInvoiceById(id);

      const { data: paymentsData } = await supabase
        .from("finance_payments_received")
        .select("id, amount, payment_date, status, reference_number")
        .eq("invoice_id", id)
        .eq("status", "confirmed")
        .order("payment_date", { ascending: true });

      setInvoice(invoice);
      setLineItems(lineItems || []);
      setPayments((paymentsData || []) as PaymentRow[]);
    } catch (err) {
      console.error(err);
      setError("Failed to load invoice.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadInvoice();
  }, [loadInvoice]);

  const handleIssue = useCallback(async () => {
    if (!invoice || !id) return;

    setIsIssuing(true);
    setError("");

    try {
      const { error } = await supabase.rpc("finance_issue_invoice_issued", {
        target_invoice_id: id,
      });

      if (error) throw error;

      await loadInvoice();
    } catch (err) {
      console.error(err);
      setError("Failed to issue invoice.");
    } finally {
      setIsIssuing(false);
    }
  }, [id, invoice, loadInvoice]);

  const totals = useMemo(() => {
    if (!invoice) return null;

    return {
      subtotal: Number(invoice.subtotal || 0),
      discount: Number(invoice.discount_amount || 0),
      tax: Number(invoice.tax_amount || 0),
      total: Number(invoice.total_amount || 0),
      paid: Number(invoice.paid_amount || 0),
      balance: Number(invoice.balance_due || 0),
    };
  }, [invoice]);

  if (isLoading) {
    return (
      <div className="p-6 text-white/50">Loading invoice...</div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6 text-white/50">Invoice not found.</div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-6 py-4 text-white">
      <div className="mx-auto w-full max-w-[1400px] space-y-6">
        
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/finance/transactions/invoices")}
              className="border-white/10 bg-white/5"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <div>
              <div className="text-xl font-semibold">
                {invoice.invoice_number}
              </div>
              <div className="text-sm text-white/50">
                {invoice.client_name_snapshot || "Client"}
              </div>
            </div>

            <Badge className="ml-3">
              {getIssuedInvoiceStatusLabel(invoice.status)}
            </Badge>

            <Badge className="ml-2">
              {getIssuedInvoicePaymentStatusLabel(
                invoice.payment_status
              )}
            </Badge>
          </div>

          <div className="flex gap-2">
            {invoice.status === "draft" && (
              <Button
                onClick={handleIssue}
                disabled={isIssuing}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {isIssuing ? "Issuing..." : "Issue Invoice"}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={loadInvoice}
              className="border-white/10 bg-white/5"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* META */}
        <Card className="bg-white/[0.04] border-white/10">
          <CardHeader>
            <CardTitle>Invoice Info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-white/40">Issue Date</div>
              <div>{formatFinanceDate(invoice.issue_date)}</div>
            </div>
            <div>
              <div className="text-white/40">Due Date</div>
              <div>{formatFinanceDate(invoice.due_date)}</div>
            </div>
            <div>
              <div className="text-white/40">Currency</div>
              <div>{invoice.currency_code || "USD"}</div>
            </div>
          </CardContent>
        </Card>

        {/* LINE ITEMS */}
        <Card className="bg-white/[0.04] border-white/10">
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lineItems.map((row, i) => (
              <div
                key={row.id}
                className="flex justify-between border-b border-white/10 py-2 text-sm"
              >
                <div>
                  {i + 1}. {row.description}
                </div>
                <div>
                  {formatFinanceMoney(
                    row.line_total,
                    invoice.currency_code
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* TOTALS */}
        <Card className="bg-white/[0.04] border-white/10">
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatFinanceMoney(totals?.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount</span>
              <span>{formatFinanceMoney(totals?.discount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total</span>
              <span>{formatFinanceMoney(totals?.total)}</span>
            </div>
            <div className="flex justify-between">
              <span>Paid</span>
              <span>{formatFinanceMoney(totals?.paid)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Balance</span>
              <span>{formatFinanceMoney(totals?.balance)}</span>
            </div>
          </CardContent>
        </Card>

        {/* PAYMENTS */}
        <Card className="bg-white/[0.04] border-white/10">
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {payments.length === 0 && (
              <div className="text-white/40">No payments</div>
            )}

            {payments.map((p) => (
              <div
                key={p.id}
                className="flex justify-between border-b border-white/10 py-2"
              >
                <div>
                  {formatFinanceDate(p.payment_date)}
                </div>
                <div>
                  {formatFinanceMoney(p.amount)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {error && (
          <div className="text-red-400 text-sm">{error}</div>
        )}
      </div>
    </div>
  );
}
