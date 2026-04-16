import { formatFinanceDate, formatFinanceMoney } from "@/lib/finance/invoicesIssued";

type Props = {
  invoice: any;
  lineItems: any[];
  financialSummary: any;
};

export default function InvoicePrintDocument({
  invoice,
  lineItems,
  financialSummary,
}: Props) {
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
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 210mm !important;
              min-height: 297mm !important;
              background: #ffffff !important;
              z-index: 999999 !important;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }

          @media screen {
            .invoice-print-sheet {
              display: none !important;
            }
          }
        `}
      </style>

      <div className="invoice-print-sheet">
        <div
          style={{
            width: "210mm",
            minHeight: "297mm",
            background: "#ffffff",
            color: "#111111",
            fontFamily:
              'Inter, Arial, Helvetica, sans-serif',
          }}
        >
          <div
            style={{
              background: "#1f1f1f",
              color: "#ffffff",
              padding: "18mm 16mm 20mm 16mm",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "12mm",
              }}
            >
              <div style={{ maxWidth: "90mm" }}>
                <img
                  src="https://leoilrrnwlquunsbulok.supabase.co/storage/v1/object/public/Branding/aixia-logo.png"
                  alt="AiXia Logo"
                  style={{
                    height: "12mm",
                    width: "auto",
                    objectFit: "contain",
                    filter: "brightness(0) invert(1)",
                    marginBottom: "4mm",
                  }}
                />

                <div style={{ fontSize: "8.5pt", lineHeight: 1.6, opacity: 0.92 }}>
                  <div>{invoice.company_name_snapshot || "—"}</div>
                  <div>{invoice.company_address_snapshot || "—"}</div>
                  <div>{invoice.company_email_snapshot || "—"}</div>
                  <div>{invoice.company_phone_snapshot || "—"}</div>
                </div>
              </div>

              <div style={{ textAlign: "right", minWidth: "55mm" }}>
                <div
                  style={{
                    fontSize: "21pt",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    marginBottom: "4mm",
                  }}
                >
                  INVOICE
                </div>

                <div style={{ fontSize: "8.5pt", lineHeight: 1.8, opacity: 0.92 }}>
                  <div>
                    Invoice No:&nbsp;
                    <strong>{invoice.invoice_number}</strong>
                  </div>
                  <div>
                    Issue Date:&nbsp;
                    <strong>{formatFinanceDate(invoice.issue_date)}</strong>
                  </div>
                  <div>
                    Due Date:&nbsp;
                    <strong>{formatFinanceDate(invoice.due_date)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: "12mm 16mm 16mm 16mm" }}>
            <div style={{ marginBottom: "8mm" }}>
              <div
                style={{
                  fontSize: "8pt",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#555555",
                  marginBottom: "2mm",
                }}
              >
                Bill To
              </div>

              <div style={{ fontSize: "9pt", lineHeight: 1.7 }}>
                <div style={{ fontWeight: 700 }}>
                  {invoice.client_name_snapshot || "—"}
                </div>
                <div>{invoice.billing_address_snapshot || "—"}</div>
                <div>{invoice.client_email_snapshot || "—"}</div>
                <div>{invoice.client_phone_snapshot || "—"}</div>
              </div>
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "10mm",
                fontSize: "8.5pt",
              }}
            >
              <thead>
                <tr style={{ background: "#222222", color: "#ffffff" }}>
                  <th style={{ textAlign: "left", padding: "3.2mm", width: "10mm" }}>
                    No
                  </th>
                  <th style={{ textAlign: "left", padding: "3.2mm" }}>
                    Item Description
                  </th>
                  <th style={{ textAlign: "right", padding: "3.2mm", width: "28mm" }}>
                    Unit Price
                  </th>
                  <th style={{ textAlign: "right", padding: "3.2mm", width: "22mm" }}>
                    Quantity
                  </th>
                  <th style={{ textAlign: "right", padding: "3.2mm", width: "28mm" }}>
                    Value
                  </th>
                </tr>
              </thead>

              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={item.id}>
                    <td
                      style={{
                        border: "1px solid #bdbdbd",
                        padding: "3.2mm",
                        verticalAlign: "top",
                      }}
                    >
                      {index + 1}
                    </td>
                    <td
                      style={{
                        border: "1px solid #bdbdbd",
                        padding: "3.2mm",
                        verticalAlign: "top",
                      }}
                    >
                      {item.description || "—"}
                    </td>
                    <td
                      style={{
                        border: "1px solid #bdbdbd",
                        padding: "3.2mm",
                        textAlign: "right",
                        verticalAlign: "top",
                      }}
                    >
                      {formatFinanceMoney(item.unitPrice, invoice.currency_code || "USD")}
                    </td>
                    <td
                      style={{
                        border: "1px solid #bdbdbd",
                        padding: "3.2mm",
                        textAlign: "right",
                        verticalAlign: "top",
                      }}
                    >
                      {item.quantity}
                    </td>
                    <td
                      style={{
                        border: "1px solid #bdbdbd",
                        padding: "3.2mm",
                        textAlign: "right",
                        verticalAlign: "top",
                        fontWeight: 600,
                      }}
                    >
                      {formatFinanceMoney(item.lineTotal, invoice.currency_code || "USD")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 58mm",
                gap: "10mm",
                alignItems: "start",
              }}
            >
              <div style={{ fontSize: "8.5pt", color: "#444444", lineHeight: 1.7 }}>
                <div style={{ marginBottom: "4mm" }}>
                  <strong>Payment Terms</strong>
                  <br />
                  {invoice.payment_terms_snapshot || "—"}
                </div>

                <div style={{ marginBottom: "4mm" }}>
                  <strong>Bank Details</strong>
                  <br />
                  {invoice.bank_details_snapshot || "—"}
                </div>

                <div>
                  <strong>Notes</strong>
                  <br />
                  {invoice.notes || "—"}
                </div>
              </div>

              <div style={{ fontSize: "8.5pt" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "2mm",
                  }}
                >
                  <span>SUB TOTAL</span>
                  <strong>
                    {formatFinanceMoney(
                      financialSummary?.subtotal ?? 0,
                      invoice.currency_code || "USD"
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "2mm",
                  }}
                >
                  <span>TAX</span>
                  <strong>
                    {formatFinanceMoney(
                      financialSummary?.tax ?? 0,
                      invoice.currency_code || "USD"
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "3mm",
                  }}
                >
                  <span>DISCOUNT</span>
                  <strong>
                    {formatFinanceMoney(
                      financialSummary?.discount ?? 0,
                      invoice.currency_code || "USD"
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    background: "#222222",
                    color: "#ffffff",
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "2.5mm 3mm",
                    fontWeight: 700,
                  }}
                >
                  <span>GRAND TOTAL</span>
                  <span>
                    {formatFinanceMoney(
                      financialSummary?.total ?? 0,
                      invoice.currency_code || "USD"
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "16mm",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <div style={{ fontSize: "10pt", fontWeight: 700 }}>
                THANK YOU FOR YOUR BUSINESS
              </div>

              <div style={{ width: "55mm", textAlign: "center" }}>
                <div
                  style={{
                    borderBottom: "1px dashed #777777",
                    marginBottom: "2mm",
                    height: "10mm",
                  }}
                />
                <div style={{ fontSize: "7.5pt" }}>Signature</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
