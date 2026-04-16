import { formatFinanceDate, formatFinanceMoney } from "@/lib/finance/invoicesIssued";

type InvoicePrintRecord = {
  invoice_number: string;
  status: "draft" | "issued" | "void" | "canceled";
  company_name_snapshot: string | null;
  company_address_snapshot: string | null;
  company_email_snapshot: string | null;
  company_phone_snapshot: string | null;
  client_name_snapshot: string | null;
  billing_address_snapshot: string | null;
  client_email_snapshot: string | null;
  client_phone_snapshot: string | null;
  payment_terms_snapshot: string | null;
  bank_details_snapshot: string | null;
  currency_code: string | null;
  issue_date: string;
  due_date: string;
  issued_at: string | null;
  notes: string | null;
};

type InvoicePrintLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
};

type InvoicePrintSummary = {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
};

type Props = {
  invoice: InvoicePrintRecord;
  lineItems: InvoicePrintLineItem[];
  financialSummary: InvoicePrintSummary | null;
};

const LOGO_URL =
  "https://leoilrrnwlquunsbulok.supabase.co/storage/v1/object/public/Branding/aixia-logo.png";

function getInvoiceStatusLabel(status: InvoicePrintRecord["status"]) {
  if (status === "issued") return "Issued";
  if (status === "draft") return "Draft";
  if (status === "void") return "Void";
  if (status === "canceled") return "Canceled";
  return status;
}

export default function InvoicePrintDocument({
  invoice,
  lineItems,
  financialSummary,
}: Props) {
  const printableCurrency = invoice.currency_code || "USD";
  const printableIssueDate = invoice.issued_at || invoice.issue_date || null;
  const printableDueDate = invoice.due_date || null;

  const companyName = invoice.company_name_snapshot || "AiXia";
  const companyAddress = invoice.company_address_snapshot || "—";
  const companyEmail = invoice.company_email_snapshot || "—";
  const companyPhone = invoice.company_phone_snapshot || "—";

  const clientName = invoice.client_name_snapshot || "Client";
  const clientAddress = invoice.billing_address_snapshot || "—";
  const clientEmail = invoice.client_email_snapshot || "—";
  const clientPhone = invoice.client_phone_snapshot || "—";

  const paymentTerms = invoice.payment_terms_snapshot || "—";
  const bankDetails = invoice.bank_details_snapshot || "—";

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 0;
            }

            html,
            body {
              background: #ffffff !important;
            }

            body * {
              visibility: hidden !important;
            }

            .invoice-print-sheet,
            .invoice-print-sheet * {
              visibility: visible !important;
            }

            .invoice-print-sheet {
              position: absolute;
              left: 0;
              top: 0;
              width: 210mm;
              min-height: 297mm;
              background: #ffffff !important;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }

          @media screen {
            .invoice-print-sheet {
              display: none;
            }
          }
        `}
      </style>

      <div className="invoice-print-sheet">
        <div
          style={{
            width: "210mm",
            minHeight: "297mm",
            background: "#f8fafc",
            color: "#0f172a",
            fontFamily:
              'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              background:
                "linear-gradient(135deg, #0f172a 0%, #1e293b 34%, #1d4ed8 68%, #06b6d4 100%)",
              color: "#ffffff",
              padding: "18mm 16mm 20mm 16mm",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at top left, rgba(255,255,255,0.16), transparent 30%), radial-gradient(circle at top right, rgba(255,255,255,0.10), transparent 22%), radial-gradient(circle at bottom center, rgba(15,23,42,0.35), transparent 48%)",
              }}
            />

            <div
              style={{
                position: "relative",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "12mm",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "5mm" }}>
                <img
                  src={LOGO_URL}
                  alt="AiXia Logo"
                  style={{
                    height: "13mm",
                    width: "auto",
                    objectFit: "contain",
                    filter: "brightness(0) invert(1)",
                  }}
                />

                <div>
                  <div
                    style={{
                      fontSize: "13pt",
                      fontWeight: 700,
                      lineHeight: 1.1,
                    }}
                  >
                    {companyName}
                  </div>
                  <div
                    style={{
                      marginTop: "1mm",
                      fontSize: "7.5pt",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      opacity: 0.82,
                    }}
                  >
                    Official invoice document
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: "20pt",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                  }}
                >
                  INVOICE
                </div>
                <div
                  style={{
                    marginTop: "2mm",
                    fontSize: "8pt",
                    opacity: 0.82,
                  }}
                >
                  {getInvoiceStatusLabel(invoice.status)}
                </div>
              </div>
            </div>

            <div
              style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: "1fr 62mm",
                gap: "12mm",
                marginTop: "12mm",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "7pt",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    opacity: 0.78,
                  }}
                >
                  Bill to
                </div>

                <div
                  style={{
                    marginTop: "3mm",
                    fontSize: "12pt",
                    fontWeight: 700,
                  }}
                >
                  {clientName}
                </div>

                <div
                  style={{
                    marginTop: "2mm",
                    fontSize: "8.5pt",
                    lineHeight: 1.65,
                    opacity: 0.92,
                  }}
                >
                  <div>{clientAddress}</div>
                  <div>{clientEmail}</div>
                  <div>{clientPhone}</div>
                </div>
              </div>

              <div
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: "5mm",
                  background: "rgba(255,255,255,0.08)",
                  padding: "4mm 4.5mm",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "4mm",
                    fontSize: "8pt",
                    marginBottom: "2mm",
                  }}
                >
                  <span style={{ opacity: 0.78 }}>Invoice No</span>
                  <strong>{invoice.invoice_number}</strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "4mm",
                    fontSize: "8pt",
                    marginBottom: "2mm",
                  }}
                >
                  <span style={{ opacity: 0.78 }}>Issue Date</span>
                  <strong>{formatFinanceDate(printableIssueDate)}</strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "4mm",
                    fontSize: "8pt",
                    marginBottom: "2mm",
                  }}
                >
                  <span style={{ opacity: 0.78 }}>Due Date</span>
                  <strong>{formatFinanceDate(printableDueDate)}</strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "4mm",
                    fontSize: "8pt",
                  }}
                >
                  <span style={{ opacity: 0.78 }}>Currency</span>
                  <strong>{printableCurrency}</strong>
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: "10mm 16mm 14mm 16mm" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8mm",
                marginBottom: "9mm",
              }}
            >
              <div
                style={{
                  border: "1px solid #dbeafe",
                  borderRadius: "5mm",
                  background: "#ffffff",
                  padding: "4.5mm",
                }}
              >
                <div
                  style={{
                    fontSize: "7pt",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#2563eb",
                    marginBottom: "2.5mm",
                  }}
                >
                  From
                </div>

                <div style={{ fontSize: "8.5pt", lineHeight: 1.65 }}>
                  <div style={{ fontWeight: 700, fontSize: "10pt" }}>{companyName}</div>
                  <div>{companyAddress}</div>
                  <div>{companyEmail}</div>
                  <div>{companyPhone}</div>
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #dbeafe",
                  borderRadius: "5mm",
                  background: "#ffffff",
                  padding: "4.5mm",
                }}
              >
                <div
                  style={{
                    fontSize: "7pt",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#2563eb",
                    marginBottom: "2.5mm",
                  }}
                >
                  Payment terms
                </div>

                <div style={{ fontSize: "8.5pt", lineHeight: 1.65 }}>
                  <div>{paymentTerms}</div>
                  <div style={{ marginTop: "3mm", fontWeight: 700 }}>Bank details</div>
                  <div>{bankDetails}</div>
                </div>
              </div>
            </div>

            <div
              style={{
                overflow: "hidden",
                border: "1px solid #cbd5e1",
                borderRadius: "5mm",
                background: "#ffffff",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "8.5pt",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background:
                        "linear-gradient(135deg, #dbeafe 0%, #e0f2fe 45%, #ede9fe 100%)",
                    }}
                  >
                    <th
                      style={{
                        textAlign: "left",
                        padding: "4mm",
                        color: "#0f172a",
                        fontWeight: 700,
                        borderBottom: "1px solid #cbd5e1",
                      }}
                    >
                      Description
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "4mm",
                        color: "#0f172a",
                        fontWeight: 700,
                        borderBottom: "1px solid #cbd5e1",
                      }}
                    >
                      Qty
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "4mm",
                        color: "#0f172a",
                        fontWeight: 700,
                        borderBottom: "1px solid #cbd5e1",
                      }}
                    >
                      Unit Price
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "4mm",
                        color: "#0f172a",
                        fontWeight: 700,
                        borderBottom: "1px solid #cbd5e1",
                      }}
                    >
                      Discount
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "4mm",
                        color: "#0f172a",
                        fontWeight: 700,
                        borderBottom: "1px solid #cbd5e1",
                      }}
                    >
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {lineItems.map((row, index) => (
                    <tr
                      key={row.id}
                      style={{
                        background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                      }}
                    >
                      <td
                        style={{
                          padding: "4mm",
                          borderBottom: "1px solid #e5e7eb",
                          color: "#111827",
                        }}
                      >
                        {row.description}
                      </td>
                      <td
                        style={{
                          padding: "4mm",
                          borderBottom: "1px solid #e5e7eb",
                          textAlign: "right",
                          color: "#111827",
                        }}
                      >
                        {row.quantity}
                      </td>
                      <td
                        style={{
                          padding: "4mm",
                          borderBottom: "1px solid #e5e7eb",
                          textAlign: "right",
                          color: "#111827",
                        }}
                      >
                        {formatFinanceMoney(row.unitPrice, printableCurrency)}
                      </td>
                      <td
                        style={{
                          padding: "4mm",
                          borderBottom: "1px solid #e5e7eb",
                          textAlign: "right",
                          color: "#111827",
                        }}
                      >
                        {formatFinanceMoney(row.discount, printableCurrency)}
                      </td>
                      <td
                        style={{
                          padding: "4mm",
                          borderBottom: "1px solid #e5e7eb",
                          textAlign: "right",
                          color: "#111827",
                          fontWeight: 600,
                        }}
                      >
                        {formatFinanceMoney(row.lineTotal, printableCurrency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 70mm",
                gap: "10mm",
                alignItems: "start",
                marginTop: "9mm",
              }}
            >
              <div
                style={{
                  border: "1px solid #dbeafe",
                  borderRadius: "5mm",
                  background: "#ffffff",
                  padding: "4.5mm",
                  minHeight: "40mm",
                }}
              >
                <div
                  style={{
                    fontSize: "7pt",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#2563eb",
                    marginBottom: "2.5mm",
                  }}
                >
                  Notes
                </div>

                <div style={{ fontSize: "8.5pt", lineHeight: 1.7, color: "#334155" }}>
                  {invoice.notes || "—"}
                </div>
              </div>

              <div
                style={{
                  borderRadius: "5mm",
                  background:
                    "linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)",
                  border: "1px solid #cbd5e1",
                  padding: "4.5mm",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "4mm",
                    fontSize: "8.5pt",
                    marginBottom: "2.5mm",
                  }}
                >
                  <span>Subtotal</span>
                  <strong>
                    {formatFinanceMoney(
                      financialSummary?.subtotal ?? 0,
                      printableCurrency
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "4mm",
                    fontSize: "8.5pt",
                    marginBottom: "2.5mm",
                  }}
                >
                  <span>Discount</span>
                  <strong>
                    {formatFinanceMoney(
                      financialSummary?.discount ?? 0,
                      printableCurrency
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "4mm",
                    fontSize: "8.5pt",
                    marginBottom: "2.5mm",
                  }}
                >
                  <span>Tax</span>
                  <strong>
                    {formatFinanceMoney(
                      financialSummary?.tax ?? 0,
                      printableCurrency
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "4mm",
                    fontSize: "10pt",
                    marginTop: "4mm",
                    paddingTop: "3mm",
                    borderTop: "2px solid #1e293b",
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  <span>Total</span>
                  <span>
                    {formatFinanceMoney(
                      financialSummary?.total ?? 0,
                      printableCurrency
                    )}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "4mm",
                    fontSize: "8.5pt",
                    marginTop: "3mm",
                  }}
                >
                  <span>Paid</span>
                  <strong>
                    {formatFinanceMoney(
                      financialSummary?.paid ?? 0,
                      printableCurrency
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "4mm",
                    fontSize: "9pt",
                    marginTop: "2mm",
                    fontWeight: 700,
                    color: "#b45309",
                  }}
                >
                  <span>Balance Due</span>
                  <span>
                    {formatFinanceMoney(
                      financialSummary?.balance ?? 0,
                      printableCurrency
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                gap: "10mm",
                marginTop: "16mm",
              }}
            >
              <div style={{ fontSize: "7.5pt", color: "#64748b" }}>
                Thank you for your business.
              </div>

              <div style={{ width: "52mm", textAlign: "center" }}>
                <div
                  style={{
                    borderBottom: "1px solid #94a3b8",
                    height: "14mm",
                    marginBottom: "2mm",
                  }}
                />
                <div style={{ fontSize: "7.5pt", color: "#64748b" }}>
                  Authorized signature
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
