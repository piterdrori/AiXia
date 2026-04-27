import { formatFinanceDate, formatFinanceMoney } from "@/lib/finance/invoicesIssued";

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
    payment.company_name_snapshot ||
    invoiceLink?.company_name_snapshot ||
    "";

  const companyContact =
    payment.company_contact_person_snapshot ||
    invoiceLink?.company_contact_person_snapshot ||
    "";

  const companyEmail =
    payment.company_email_snapshot ||
    invoiceLink?.company_email_snapshot ||
    "";

  const companyPhone =
    payment.company_phone_snapshot ||
    invoiceLink?.company_phone_snapshot ||
    "";

  const companyAddress =
    payment.company_address_snapshot ||
    invoiceLink?.company_address_snapshot ||
    "";

  const counterpartyName =
    invoiceLink?.counterparty_name_snapshot ||
    payment.client_name_snapshot ||
    invoiceLink?.client_name_snapshot ||
    "";

  const counterpartyContact =
    invoiceLink?.client_contact_person_snapshot ||
    payment.client_contact_person_snapshot ||
    "";

  const counterpartyEmail =
    invoiceLink?.client_email_snapshot ||
    payment.client_email_snapshot ||
    "";

  const counterpartyPhone =
    invoiceLink?.client_phone_snapshot ||
    payment.client_phone_snapshot ||
    "";

  const billingAddress =
    payment.billing_address_snapshot ||
    invoiceLink?.billing_address_snapshot ||
    "";

  const receiptNumber = payment.reference_number || payment.id || "Draft";
  const receiptDate = payment.payment_date || null;
  const paymentDate = payment.payment_date || null;

  const paymentTerms = invoiceLink?.payment_terms_snapshot || "—";
  const paymentTermsText =
    invoiceLink?.payment_terms_document_text ||
    invoiceLink?.terms_and_conditions_snapshot ||
    "";

  const invoiceTotal = toNumber(invoiceLink?.total_amount);
  const invoicePaidAfter = toNumber(invoiceLink?.paid_amount);
  const thisPaymentAmount = toNumber(payment.converted_amount ?? payment.amount);
  const paidBeforeThisPayment = Math.max(invoicePaidAfter - thisPaymentAmount, 0);
  const balanceAfterPayment = toNumber(invoiceLink?.balance_due);

  const remarkText =
    "This document confirms that the payment listed above was received and recorded against the referenced invoice. It is intended as a payment receipt and settlement reference only. This document is not an invoice, not a tax invoice, and not an official bank statement.";

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }

          html, body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body * {
            visibility: hidden !important;
          }

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
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
        }

        @media screen {
          .payment-receipt-print-sheet {
            display: none !important;
          }
        }
      `}</style>

      <div className="payment-receipt-print-sheet">
        <div
          style={{
            width: "210mm",
            minHeight: "297mm",
            background: "#ffffff",
            color: "#111827",
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            position: "relative",
            overflow: "visible",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: "78mm",
              background: "linear-gradient(135deg, #232323 0%, #1b1b1b 100%)",
              zIndex: 0,
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 2,
              padding: "9mm 14mm 10mm 14mm",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.05fr 0.95fr",
                gap: "10mm",
                alignItems: "start",
                color: "#ffffff",
                minHeight: "72mm",
              }}
            >
              <div>
                <img
                  src="https://leoilrrnwlquunsbulok.supabase.co/storage/v1/object/public/Branding/aixia-logo.png"
                  alt="AiXia"
                  style={{
                    height: "40mm",
                    width: "auto",
                    filter: "brightness(0) invert(1)",
                    marginTop: "-7mm",
                    marginBottom: "0.5mm",
                  }}
                />

                <div
                  style={{
                    maxWidth: "84mm",
                    fontSize: "8.3pt",
                    lineHeight: 1.38,
                    paddingTop: "0mm",
                    marginTop: "-5mm",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "10.5pt",
                      marginBottom: "0.8mm",
                    }}
                  >
                    {companyName}
                  </div>

                  {companyContact ? <div>{companyContact}</div> : null}
                  {companyPhone ? <div>{companyPhone}</div> : null}
                  {companyEmail ? <div>{companyEmail}</div> : null}

                  {companyAddress ? (
                    <div
                      style={{
                        marginTop: "0.5mm",
                        lineHeight: 1.32,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        maxWidth: "84mm",
                        fontSize: "7.9pt",
                      }}
                    >
                      {companyAddress}
                    </div>
                  ) : null}
                </div>
              </div>

              <div style={{ paddingTop: "2mm", textAlign: "left" }}>
                <div
                  style={{
                    fontSize: "31pt",
                    fontWeight: 300,
                    letterSpacing: "0.09em",
                    textTransform: "uppercase",
                    marginBottom: "6mm",
                    lineHeight: 1,
                  }}
                >
                  Payment Receipt
                </div>

                <div style={{ fontSize: "10pt", lineHeight: 1.95 }}>
                  <div style={{ display: "flex", gap: "4mm" }}>
                    <span style={{ width: "26mm", opacity: 0.78 }}>
                      Receipt No
                    </span>
                    <span style={{ fontWeight: 700 }}>{receiptNumber}</span>
                  </div>

                  <div style={{ display: "flex", gap: "4mm" }}>
                    <span style={{ width: "26mm", opacity: 0.78 }}>
                      Receipt Date
                    </span>
                    <span>{formatFinanceDate(receiptDate)}</span>
                  </div>

                  <div style={{ display: "flex", gap: "4mm" }}>
                    <span style={{ width: "26mm", opacity: 0.78 }}>
                      Payment Date
                    </span>
                    <span>{formatFinanceDate(paymentDate)}</span>
                  </div>

                  <div style={{ display: "flex", gap: "4mm" }}>
                    <span style={{ width: "26mm", opacity: 0.78 }}>Status</span>
                    <span>{getPaymentStatusLabel(payment.status)}</span>
                  </div>
                </div>
              </div>
            </div>

                        <div style={{ marginTop: "5mm", marginBottom: "7mm" }}>
              <div
                style={{
                  background: "#ffffff",
                  border: "0.5pt solid #e5e7eb",
                  borderRadius: "2mm",
                  padding: "4mm 5mm",
                  display: "grid",
                  gridTemplateColumns: "1fr",
                }}
              >
                <div
                  style={{
                    fontSize: "7.2pt",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#6b7280",
                    fontWeight: 700,
                    marginBottom: "1.5mm",
                  }}
                >
                  Recipient
                </div>

                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "11pt",
                    marginBottom: "1mm",
                  }}
                >
                  {counterpartyName}
                </div>

                {counterpartyContact ? (
                  <div
                    style={{
                      fontSize: "8.3pt",
                      color: "#4b5563",
                      marginBottom: "0.8mm",
                    }}
                  >
                    {counterpartyContact}
                  </div>
                ) : null}

                {counterpartyEmail || counterpartyPhone ? (
                  <div
                    style={{
                      fontSize: "8.1pt",
                      color: "#4b5563",
                      marginBottom: "0.8mm",
                    }}
                  >
                    {[counterpartyEmail, counterpartyPhone]
                      .filter(Boolean)
                      .join(" • ")}
                  </div>
                ) : null}

                <div
                  style={{
                    fontSize: "8.3pt",
                    color: "#4b5563",
                    lineHeight: 1.55,
                  }}
                >
                  {billingAddress}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "8mm" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                  fontSize: "8.5pt",
                }}
              >
                <thead>
                  <tr style={{ background: "#232323", color: "#ffffff" }}>
                    <th
                      style={{
                        width: "24%",
                        textAlign: "left",
                        padding: "3mm 3mm",
                        fontWeight: 700,
                      }}
                    >
                      Applied To Invoice
                    </th>
                    <th
                      style={{
                        width: "19%",
                        textAlign: "right",
                        padding: "3mm 2mm",
                        fontWeight: 700,
                      }}
                    >
                      Invoice Total
                    </th>
                    <th
                      style={{
                        width: "19%",
                        textAlign: "right",
                        padding: "3mm 2mm",
                        fontWeight: 700,
                      }}
                    >
                      Paid Before
                    </th>
                    <th
                      style={{
                        width: "19%",
                        textAlign: "right",
                        padding: "3mm 2mm",
                        fontWeight: 700,
                      }}
                    >
                      This Payment
                    </th>
                    <th
                      style={{
                        width: "19%",
                        textAlign: "right",
                        padding: "3mm 2mm",
                        fontWeight: 700,
                      }}
                    >
                      Balance After
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr style={{ borderBottom: "0.5pt solid #d1d5db" }}>
                    <td style={{ padding: "4mm 3mm", verticalAlign: "top" }}>
                      <div style={{ fontWeight: 700 }}>
                        {invoiceLink?.invoice_number || "No linked invoice"}
                      </div>

                      <div
                        style={{
                          marginTop: "1mm",
                          color: "#6b7280",
                          fontSize: "7.5pt",
                          lineHeight: 1.5,
                        }}
                      >
                        <div>Status: {getInvoiceStatusLabel(invoiceLink?.status)}</div>
                        <div>
                          Issue Date:{" "}
                          {formatFinanceDate(invoiceLink?.issue_date || null)}
                        </div>
                        <div>
                          Due Date: {formatFinanceDate(invoiceLink?.due_date || null)}
                        </div>
                        <div>Payment Terms: {paymentTerms}</div>
                      </div>
                    </td>

                    <td
                      style={{
                        padding: "4mm 2mm",
                        textAlign: "right",
                        fontFamily: "monospace",
                      }}
                    >
                      {formatFinanceMoney(invoiceTotal, invoiceCurrency)}
                    </td>

                    <td
                      style={{
                        padding: "4mm 2mm",
                        textAlign: "right",
                        fontFamily: "monospace",
                      }}
                    >
                      {formatFinanceMoney(paidBeforeThisPayment, invoiceCurrency)}
                    </td>

                    <td
                      style={{
                        padding: "4mm 2mm",
                        textAlign: "right",
                        fontFamily: "monospace",
                        fontWeight: 700,
                      }}
                    >
                      {formatFinanceMoney(thisPaymentAmount, invoiceCurrency)}
                    </td>

                    <td
                      style={{
                        padding: "4mm 2mm",
                        textAlign: "right",
                        fontFamily: "monospace",
                        fontWeight: 700,
                      }}
                    >
                      {formatFinanceMoney(balanceAfterPayment, invoiceCurrency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.12fr 0.88fr",
                gap: "14mm",
                alignItems: "start",
                marginTop: "0mm",
              }}
            >
              <div style={{ fontSize: "8pt", color: "#374151" }}>
                <div
                  style={{
                    background: "#ffffff",
                    paddingTop: "2mm",
                    paddingRight: "1mm",
                  }}
                >
                  <div style={{ marginBottom: "4mm" }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "9pt",
                        color: "#111827",
                        marginBottom: "1.5mm",
                      }}
                    >
                      Payment Details
                    </div>

                    <div style={{ lineHeight: 1.7 }}>
                      <div>
                        <span style={{ color: "#6b7280" }}>Reference Number: </span>
                        <span style={{ fontWeight: 500 }}>
                          {payment.reference_number || ""}
                        </span>
                      </div>

                      <div>
                        <span style={{ color: "#6b7280" }}>Payment Method: </span>
                        <span style={{ fontWeight: 500 }}>
                          {payment.payment_method_name || ""}
                        </span>
                      </div>

                      <div>
                        <span style={{ color: "#6b7280" }}>Payment Currency: </span>
                        <span style={{ fontWeight: 500 }}>{paymentCurrency}</span>
                      </div>

                      <div>
                        <span style={{ color: "#6b7280" }}>Invoice Currency: </span>
                        <span style={{ fontWeight: 500 }}>{invoiceCurrency}</span>
                      </div>

                      {payment.exchange_rate ? (
                        <div>
                          <span style={{ color: "#6b7280" }}>Exchange Rate: </span>
                          <span style={{ fontWeight: 500 }}>
                            {payment.exchange_rate}
                          </span>
                        </div>
                      ) : null}

                      {payment.exchange_rate_source ? (
                        <div>
                          <span style={{ color: "#6b7280" }}>FX Source: </span>
                          <span style={{ fontWeight: 500 }}>
                            {payment.exchange_rate_source}
                          </span>
                        </div>
                      ) : null}

                      <div>
                        <span style={{ color: "#6b7280" }}>FX Date: </span>
                        <span style={{ fontWeight: 500 }}>
                          {formatFinanceDate(payment.exchange_rate_date)}
                        </span>
                      </div>

                      <div>
                        <span style={{ color: "#6b7280" }}>Proof Uploaded: </span>
                        <span style={{ fontWeight: 500 }}>
                          {hasProof ? "Yes" : "No"}
                        </span>
                      </div>

                      <div style={{ marginTop: "2mm" }}>
                        <span style={{ color: "#6b7280" }}>
                          Linked Invoice Payment Terms:{" "}
                        </span>
                        <span style={{ fontWeight: 500 }}>{paymentTerms}</span>
                      </div>

                      {paymentTermsText ? (
                        <div
                          style={{
                            marginTop: "1mm",
                            lineHeight: 1.55,
                            whiteSpace: "pre-wrap",
                            color: "#374151",
                          }}
                        >
                          {paymentTermsText}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div
                  style={{
                    background: "#ffffff",
                    padding: "2mm 0 0 6mm",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "2mm",
                      fontSize: "9pt",
                    }}
                  >
                    <span>AMOUNT RECEIVED</span>
                    <span style={{ fontFamily: "monospace" }}>
                      {formatFinanceMoney(payment.amount || 0, paymentCurrency)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "2mm",
                      fontSize: "9pt",
                    }}
                  >
                    <span>CONVERTED AMOUNT</span>
                    <span style={{ fontFamily: "monospace" }}>
                      {formatFinanceMoney(payment.converted_amount || 0, invoiceCurrency)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "2mm",
                      fontSize: "9pt",
                    }}
                  >
                    <span>PAID BEFORE</span>
                    <span style={{ fontFamily: "monospace" }}>
                      {formatFinanceMoney(paidBeforeThisPayment, invoiceCurrency)}
                    </span>
                  </div>

                  <div
                    style={{
                      background: "#232323",
                      color: "#ffffff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "3mm 3mm",
                      marginTop: "2.5mm",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10pt",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      Balance After
                    </span>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: "11pt",
                        fontWeight: 700,
                      }}
                    >
                      {formatFinanceMoney(balanceAfterPayment, invoiceCurrency)}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: "6mm",
                      textAlign: "center",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        borderBottom: "0.5pt dashed #6b7280",
                        height: "12mm",
                        marginBottom: "1.5mm",
                      }}
                    />
                    <div style={{ fontSize: "8pt", color: "#374151" }}>
                      Authorized Signature
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "1mm",
                paddingTop: "2mm",
                borderTop: "0.5pt solid #e5e7eb",
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "9pt",
                  color: "#111827",
                  marginBottom: "2mm",
                }}
              >
                Document Remark
              </div>

              <div
                style={{
                  lineHeight: 1.45,
                  whiteSpace: "pre-wrap",
                  fontSize: "7pt",
                  color: "#374151",
                  marginBottom: "3mm",
                }}
              >
                {remarkText}
              </div>

              <div
                style={{
                  textAlign: "center",
                  fontSize: "10pt",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#111827",
                  marginTop: "3mm",
                }}
              >
                Thank You For Your Business
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
