import {
  formatFinanceDate,
  formatFinanceMoney,
} from "@/lib/finance/invoicesIssued";

type PaymentRecord = {
  id?: string;
  reference_number?: string | null;
  payment_date?: string | null;
  status?: string | null;
  amount?: number | string | null;
  converted_amount?: number | string | null;
  payment_currency_code?: string | null;
  invoice_currency_code?: string | null;
  exchange_rate?: number | string | null;
  exchange_rate_source?: string | null;
  exchange_rate_date?: string | null;
  notes?: string | null;
  payment_method_name?: string | null;
  company_name_snapshot?: string | null;
  company_contact_person_snapshot?: string | null;
  company_email_snapshot?: string | null;
  company_phone_snapshot?: string | null;
  company_address_snapshot?: string | null;
  client_name_snapshot?: string | null;
  client_contact_person_snapshot?: string | null;
  client_email_snapshot?: string | null;
  client_phone_snapshot?: string | null;
  billing_address_snapshot?: string | null;
};

type InvoiceRecord = {
  invoice_number?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  total_amount?: number | string | null;
  paid_amount?: number | string | null;
  balance_due?: number | string | null;
  currency_code?: string | null;
  status?: string | null;
  payment_status?: string | null;
  payment_terms_id?: string | null;
  payment_terms_snapshot?: string | null;
  payment_terms_document_text?: string | null;
  terms_and_conditions_snapshot?: string | null;
  counterparty_name_snapshot?: string | null;
  client_name_snapshot?: string | null;
  client_contact_person_snapshot?: string | null;
  client_email_snapshot?: string | null;
  client_phone_snapshot?: string | null;
  billing_address_snapshot?: string | null;
  company_name_snapshot?: string | null;
  company_contact_person_snapshot?: string | null;
  company_email_snapshot?: string | null;
  company_phone_snapshot?: string | null;
  company_address_snapshot?: string | null;
};

type Props = {
  payment: PaymentRecord | null;
  invoiceLink?: InvoiceRecord | null;
  hasProof?: boolean;
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPaymentStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "draft":
      return "Draft";
    case "cancelled":
      return "Cancelled";
    case "deleted":
      return "Deleted";
    case "archived":
      return "Archived";
    default:
      return status || "—";
  }
}

function getInvoiceStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "paid":
      return "Paid";
    case "partially_paid":
      return "Partially Paid";
    case "issued":
      return "Issued";
    case "overdue":
      return "Overdue";
    case "draft":
      return "Draft";
    case "cancelled":
      return "Cancelled";
    case "archived":
      return "Archived";
    case "deleted":
      return "Deleted";
    default:
      return status || "—";
  }
}

function joinParts(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" · ") || "—";
}

export default function PaymentReceivedPrintDocument({
  payment,
  invoiceLink,
  hasProof = false,
}: Props) {
  if (!payment) return null;

  const paymentCurrency = payment.payment_currency_code || "USD";
  const invoiceCurrency =
    payment.invoice_currency_code || invoiceLink?.currency_code || "USD";

  const companyName =
    payment.company_name_snapshot || invoiceLink?.company_name_snapshot || "—";

  const companyContact =
    payment.company_contact_person_snapshot ||
    invoiceLink?.company_contact_person_snapshot ||
    "";

  const companyEmail =
    payment.company_email_snapshot || invoiceLink?.company_email_snapshot || "";

  const companyPhone =
    payment.company_phone_snapshot || invoiceLink?.company_phone_snapshot || "";

  const companyAddress =
    payment.company_address_snapshot ||
    invoiceLink?.company_address_snapshot ||
    "";

  const counterpartyName =
    invoiceLink?.counterparty_name_snapshot ||
    payment.client_name_snapshot ||
    invoiceLink?.client_name_snapshot ||
    "—";

  const counterpartyContact =
    invoiceLink?.client_contact_person_snapshot ||
    payment.client_contact_person_snapshot ||
    "";

  const counterpartyEmail =
    invoiceLink?.client_email_snapshot || payment.client_email_snapshot || "";

  const counterpartyPhone =
    invoiceLink?.client_phone_snapshot || payment.client_phone_snapshot || "";

  const billingAddress =
    payment.billing_address_snapshot ||
    invoiceLink?.billing_address_snapshot ||
    "";

  const receiptNumber = payment.reference_number || payment.id || "Draft";
  const paymentTerms = invoiceLink?.payment_terms_snapshot || "—";
  const paymentTermsText =
    invoiceLink?.payment_terms_document_text ||
    invoiceLink?.terms_and_conditions_snapshot ||
    "";

  const invoicePaidAfter = toNumber(invoiceLink?.paid_amount);
  const thisPaymentAmount = toNumber(
    payment.converted_amount ?? payment.amount,
  );
  const paidBeforeThisPayment = Math.max(
    invoicePaidAfter - thisPaymentAmount,
    0,
  );

  return (
    <>
      <style>{`
        @media screen {
          .payment-receipt-print-sheet { display: none; }
        }

        @media print {
          @page { size: A4; margin: 0; }

          html, body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body * { visibility: hidden !important; }

          .payment-receipt-print-sheet,
          .payment-receipt-print-sheet * {
            visibility: visible !important;
          }

          .payment-receipt-print-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 16mm !important;
            background: #ffffff !important;
            color: #111827 !important;
          }

          .payment-receipt-print-header,
          .payment-receipt-print-row,
          .payment-receipt-print-two-column {
            display: flex !important;
            justify-content: space-between !important;
            gap: 8mm !important;
          }

          .payment-receipt-print-title {
            margin: 0 !important;
            color: #111827 !important;
          }

          .payment-receipt-print-subtitle,
          .payment-receipt-print-label,
          .payment-receipt-print-note {
            color: #6b7280 !important;
          }

          .payment-receipt-print-value {
            margin-top: 2mm !important;
            color: #111827 !important;
          }

          .payment-receipt-print-muted {
            margin-top: 1mm !important;
            color: #4b5563 !important;
          }

          .payment-receipt-print-section {
            margin-top: 9mm !important;
            border: 1px solid #e5e7eb !important;
            border-radius: 5mm !important;
            padding: 5mm !important;
            break-inside: avoid !important;
          }

          .payment-receipt-print-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 4mm !important;
          }

          .payment-receipt-print-box {
            border: 1px solid #e5e7eb !important;
            border-radius: 4mm !important;
            padding: 4mm !important;
            background: #f9fafb !important;
          }

          .payment-receipt-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 4mm !important;
          }

          .payment-receipt-print-table th,
          .payment-receipt-print-table td {
            border-bottom: 1px solid #e5e7eb !important;
            padding: 3mm 2mm !important;
            text-align: left !important;
          }

          .payment-receipt-print-table th {
            color: #6b7280 !important;
          }
        }
      `}</style>

      <article className="payment-receipt-print-sheet">
        <header className="payment-receipt-print-header">
          <div>
            <p className="payment-receipt-print-label">Payment Receipt</p>
            <h1 className="payment-receipt-print-title">{receiptNumber}</h1>
            <p className="payment-receipt-print-subtitle">
              Receipt Date: {formatFinanceDate(payment.payment_date || null)}
            </p>
          </div>

          <div>
            <p className="payment-receipt-print-label">Status</p>
            <p className="payment-receipt-print-value">
              {getPaymentStatusLabel(payment.status)}
            </p>
            <p className="payment-receipt-print-muted">
              Proof: {hasProof ? "Uploaded" : "Not uploaded"}
            </p>
          </div>
        </header>

        <section className="payment-receipt-print-section">
          <div className="payment-receipt-print-two-column">
            <div>
              <p className="payment-receipt-print-label">Received By</p>
              <p className="payment-receipt-print-value">{companyName}</p>
              <p className="payment-receipt-print-muted">
                {joinParts([companyContact, companyEmail, companyPhone])}
              </p>
              <p className="payment-receipt-print-muted">
                {companyAddress || "—"}
              </p>
            </div>

            <div>
              <p className="payment-receipt-print-label">Received From</p>
              <p className="payment-receipt-print-value">{counterpartyName}</p>
              <p className="payment-receipt-print-muted">
                {joinParts([
                  counterpartyContact,
                  counterpartyEmail,
                  counterpartyPhone,
                ])}
              </p>
              <p className="payment-receipt-print-muted">
                {billingAddress || "—"}
              </p>
            </div>
          </div>
        </section>

        <section className="payment-receipt-print-section">
          <div className="payment-receipt-print-grid">
            <div className="payment-receipt-print-box">
              <p className="payment-receipt-print-label">Payment Amount</p>
              <p className="payment-receipt-print-value">
                {formatFinanceMoney(payment.amount, paymentCurrency)}
              </p>
            </div>

            <div className="payment-receipt-print-box">
              <p className="payment-receipt-print-label">Converted Amount</p>
              <p className="payment-receipt-print-value">
                {formatFinanceMoney(payment.converted_amount, invoiceCurrency)}
              </p>
            </div>

            <div className="payment-receipt-print-box">
              <p className="payment-receipt-print-label">Exchange Rate</p>
              <p className="payment-receipt-print-value">
                {payment.exchange_rate ?? "—"}
              </p>
            </div>
          </div>

          <table className="payment-receipt-print-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Invoice Status</th>
                <th>Paid Before</th>
                <th>This Payment</th>
                <th>Balance After</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{invoiceLink?.invoice_number || "—"}</td>
                <td>{getInvoiceStatusLabel(invoiceLink?.status)}</td>
                <td>
                  {formatFinanceMoney(paidBeforeThisPayment, invoiceCurrency)}
                </td>
                <td>
                  {formatFinanceMoney(thisPaymentAmount, invoiceCurrency)}
                </td>
                <td>
                  {formatFinanceMoney(
                    invoiceLink?.balance_due,
                    invoiceCurrency,
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="payment-receipt-print-section">
          <div className="payment-receipt-print-grid">
            <div className="payment-receipt-print-box">
              <p className="payment-receipt-print-label">Payment Method</p>
              <p className="payment-receipt-print-value">
                {payment.payment_method_name || "—"}
              </p>
            </div>

            <div className="payment-receipt-print-box">
              <p className="payment-receipt-print-label">FX Source</p>
              <p className="payment-receipt-print-value">
                {payment.exchange_rate_source || "—"}
              </p>
            </div>

            <div className="payment-receipt-print-box">
              <p className="payment-receipt-print-label">FX Date</p>
              <p className="payment-receipt-print-value">
                {formatFinanceDate(payment.exchange_rate_date || null)}
              </p>
            </div>
          </div>
        </section>

        <section className="payment-receipt-print-section">
          <p className="payment-receipt-print-label">Payment Terms</p>
          <p className="payment-receipt-print-value">{paymentTerms}</p>
          {paymentTermsText ? (
            <p className="payment-receipt-print-muted">{paymentTermsText}</p>
          ) : null}
        </section>

        {payment.notes ? (
          <section className="payment-receipt-print-section">
            <p className="payment-receipt-print-label">Notes</p>
            <p className="payment-receipt-print-muted">{payment.notes}</p>
          </section>
        ) : null}

        <section className="payment-receipt-print-section">
          <p className="payment-receipt-print-note">
            This document confirms that the payment listed above was received
            and recorded against the referenced invoice. It is intended as a
            payment receipt and settlement reference only. This document is not
            an invoice, not a tax invoice, and not an official bank statement.
          </p>
        </section>
      </article>
    </>
  );
}
