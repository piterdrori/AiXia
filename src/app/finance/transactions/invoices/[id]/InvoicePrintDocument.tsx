import { formatFinanceDate, formatFinanceMoney } from "@/lib/finance/invoicesIssued";

type Props = {
  invoice: any;
  lineItems: any[];
  financialSummary: any;
  payments?: any[];
  project?: any;
  task?: any;
};

const DEFAULT_TERMS =
  "Payment is due according to the agreed payment terms stated on this invoice. Goods remain subject to the agreed shipping terms. Any bank charges are the responsibility of the payer unless otherwise agreed in writing. Please reference the invoice number with your payment. Late payments may result in delays, additional charges, or suspension of further deliveries or services.";

function parseBankDetails(details: string | null | undefined) {
  if (!details) return null;

  try {
    const parsed = JSON.parse(details);
    return {
      beneficiary: parsed?.beneficiary_name || "",
      bank: parsed?.bank_name || "",
      bankAddress: parsed?.bank_address || "",
      accountNumber: parsed?.account_number || "",
      iban: parsed?.iban || "",
      swift: parsed?.swift_code || "",
      currency: parsed?.currency_code || "",
    };
  } catch {
    const parts = String(details)
      .split("|")
      .map((s) => s.trim());

    return {
      beneficiary: parts[0] || "",
      bank: parts[1] || "",
      bankAddress: "",
      accountNumber: "",
      iban: parts[2] || "",
      swift: parts[3] || "",
      currency: "",
    };
  }
}

export default function InvoicePrintDocument({
  invoice,
  lineItems,
  financialSummary,
  payments = [],
}: Props) {
  const currency = invoice?.currency_code || "USD";
  const bankInfo = parseBankDetails(invoice?.bank_details_snapshot);

  const paymentTerms = invoice?.payment_terms_snapshot || "—";
    const shippingTerms =
    invoice?.shipping_terms_snapshot &&
    !invoice.shipping_terms_snapshot.match(/^[0-9a-f-]{36}$/i)
      ? invoice.shipping_terms_snapshot
      : invoice?.shipping_term_label ||
        invoice?.shipping_term_name ||
        "Not specified";
  const termsAndConditions =
    invoice?.terms_and_conditions_snapshot || DEFAULT_TERMS;

  const rows = Array.isArray(lineItems) ? lineItems : [];
  const visibleRows = rows.slice(0, 8);
  const fillerRows = Math.max(0, 5 - visibleRows.length);

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
          body * { visibility: hidden !important; }
          .invoice-print-sheet, .invoice-print-sheet * { visibility: visible !important; }
          .invoice-print-sheet {
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
          .invoice-print-sheet {
            display: none !important;
          }
        }
      `}</style>

      <div className="invoice-print-sheet">
        <div
          style={{
            width: "210mm",
            minHeight: "297mm",
            background: "#ffffff",
            color: "#1a1a2e",
            fontFamily:
              '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            position: "relative",
            overflow: "visible",
          }}
        >
          {/* Tech Header Background */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: "70mm",
              background: "linear-gradient(135deg, #0d1b2a 0%, #1b263b 100%)",
              zIndex: 0,
            }}
          />

          {/* Tech accent line - cyan */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "70mm",
              height: "1mm",
              background: "#00d4ff",
              zIndex: 1,
            }}
          />

          <div style={{ position: "relative", zIndex: 2, padding: "8mm 12mm 10mm 12mm" }}>
            {/* Top header - compact */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8mm",
                alignItems: "start",
                color: "#ffffff",
                minHeight: "62mm",
              }}
            >
              <div>
                <img
                  src="https://leoilrrnwlquunsbulok.supabase.co/storage/v1/object/public/Branding/aixia-logo.png"
                  alt="AiXia"
                  style={{
                    height: "32mm",
                    width: "auto",
                    filter: "brightness(0) invert(1)",
                    marginTop: "-4mm",
                    marginBottom: "1mm",
                  }}
                />

                <div
                  style={{
                    maxWidth: "80mm",
                    fontSize: "8pt",
                    lineHeight: 1.4,
                    marginTop: "-2mm",
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "10pt",
                      marginBottom: "0.8mm",
                      color: "#ffffff",
                    }}
                  >
                    {invoice?.company_name_snapshot || "—"}
                  </div>
                  {invoice?.company_contact_person_snapshot ? (
                    <div>{invoice.company_contact_person_snapshot}</div>
                  ) : null}
                  {invoice?.company_phone_snapshot ? (
                    <div>{invoice.company_phone_snapshot}</div>
                  ) : null}
                  {invoice?.company_email_snapshot ? (
                    <div>{invoice.company_email_snapshot}</div>
                  ) : null}
                  {invoice?.company_address_snapshot ? (
                    <div
                      style={{
                        marginTop: "0.5mm",
                        lineHeight: 1.35,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        maxWidth: "80mm",
                        fontSize: "7.5pt",
                        opacity: 0.9,
                      }}
                    >
                      {invoice.company_address_snapshot}
                    </div>
                  ) : null}
                </div>
              </div>

              <div style={{ paddingTop: "2mm", textAlign: "left" }}>
                <div
                  style={{
                    fontSize: "28pt",
                    fontWeight: 300,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: "4mm",
                    lineHeight: 1,
                    color: "#ffffff",
                  }}
                >
                  Invoice
                </div>

                <div style={{ fontSize: "9pt", lineHeight: 1.8 }}>
                  <div style={{ display: "flex", gap: "4mm" }}>
                    <span style={{ width: "24mm", opacity: 0.6 }}>Invoice No</span>
                    <span style={{ fontWeight: 600 }}>{invoice?.invoice_number || "—"}</span>
                  </div>
                  <div style={{ display: "flex", gap: "4mm" }}>
                    <span style={{ width: "24mm", opacity: 0.6 }}>Issue Date</span>
                    <span>{formatFinanceDate(invoice?.issue_date)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "4mm" }}>
                    <span style={{ width: "24mm", opacity: 0.6 }}>Due Date</span>
                    <span>{formatFinanceDate(invoice?.due_date)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To - slim card */}
            <div style={{ marginTop: "3mm", marginBottom: "6mm" }}>
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "2mm",
                  padding: "3mm 4mm",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  style={{
                    fontSize: "6.5pt",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "#00a8cc",
                    fontWeight: 600,
                    marginBottom: "1mm",
                  }}
                >
                  Bill To
                </div>
                <div style={{ fontWeight: 600, fontSize: "10pt", marginBottom: "0.5mm", color: "#1a1a2e" }}>
                  {invoice?.client_name_snapshot || "—"}
                </div>
                {invoice?.client_contact_person_snapshot ? (
                  <div style={{ fontSize: "8pt", color: "#4a5568", marginBottom: "0.5mm" }}>
                    {invoice.client_contact_person_snapshot}
                  </div>
                ) : null}
                {invoice?.client_email_snapshot || invoice?.client_phone_snapshot ? (
                  <div style={{ fontSize: "7.5pt", color: "#64748b", marginBottom: "0.5mm" }}>
                    {[invoice?.client_email_snapshot, invoice?.client_phone_snapshot]
                      .filter(Boolean)
                      .join(" • ")}
                  </div>
                ) : null}
                <div style={{ fontSize: "8pt", color: "#4a5568", lineHeight: 1.4 }}>
                  {invoice?.billing_address_snapshot || "—"}
                </div>
              </div>
            </div>

            {/* Table - compact */}
            <div style={{ marginBottom: "6mm" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                  fontSize: "8pt",
                }}
              >
                <thead>
                  <tr style={{ background: "#1b263b", color: "#ffffff" }}>
                    <th
                      style={{
                        width: "8%",
                        textAlign: "center",
                        padding: "2.5mm 1.5mm",
                        fontWeight: 600,
                        fontSize: "7.5pt",
                        borderBottom: "2px solid #00d4ff",
                      }}
                    >
                      No
                    </th>
                    <th
                      style={{
                        width: "52%",
                        textAlign: "left",
                        padding: "2.5mm 2mm",
                        fontWeight: 600,
                        fontSize: "7.5pt",
                        borderBottom: "2px solid #00d4ff",
                      }}
                    >
                      Item Description
                    </th>
                    <th
                      style={{
                        width: "14%",
                        textAlign: "right",
                        padding: "2.5mm 1.5mm",
                        fontWeight: 600,
                        fontSize: "7.5pt",
                        borderBottom: "2px solid #00d4ff",
                      }}
                    >
                      Unit Price
                    </th>
                    <th
                      style={{
                        width: "10%",
                        textAlign: "right",
                        padding: "2.5mm 1.5mm",
                        fontWeight: 600,
                        fontSize: "7.5pt",
                        borderBottom: "2px solid #00d4ff",
                      }}
                    >
                      Qty
                    </th>
                    <th
                      style={{
                        width: "16%",
                        textAlign: "right",
                        padding: "2.5mm 1.5mm",
                        fontWeight: 600,
                        fontSize: "7.5pt",
                        borderBottom: "2px solid #00d4ff",
                      }}
                    >
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((item, index) => {
                    const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
                    const quantity = Number(item.quantity ?? 0);
                    const discount = Number(item.discount ?? 0);
                    const value =
                      item.lineTotal ??
                      item.line_total ??
                      Math.max(quantity * unitPrice - discount, 0);

                    return (
                      <tr key={item.id || index} style={{ borderBottom: "0.5pt solid #e2e8f0" }}>
                        <td style={{ padding: "2.5mm 1.5mm", textAlign: "center", color: "#64748b" }}>{index + 1}</td>
                        <td style={{ padding: "2.5mm 2mm", verticalAlign: "top" }}>
                          <div style={{ fontWeight: 500, color: "#1a1a2e" }}>{item.description || "—"}</div>
                        </td>
                        <td
                          style={{
                            padding: "2.5mm 1.5mm",
                            textAlign: "right",
                            fontFamily: '"SF Mono", monospace',
                            color: "#475569",
                          }}
                        >
                          {formatFinanceMoney(unitPrice, currency)}
                        </td>
                        <td
                          style={{
                            padding: "2.5mm 1.5mm",
                            textAlign: "right",
                            fontFamily: '"SF Mono", monospace',
                            color: "#475569",
                          }}
                        >
                          {quantity}
                        </td>
                        <td
                          style={{
                            padding: "2.5mm 1.5mm",
                            textAlign: "right",
                            fontFamily: '"SF Mono", monospace',
                            fontWeight: 600,
                            color: "#1a1a2e",
                          }}
                        >
                          {formatFinanceMoney(value, currency)}
                        </td>
                      </tr>
                    );
                  })}

                  {Array.from({ length: fillerRows }).map((_, index) => (
                    <tr key={`filler-${index}`} style={{ borderBottom: "0.5pt solid #e2e8f0" }}>
                      <td style={{ height: "6.5mm", padding: "0 1.5mm" }} />
                      <td style={{ height: "6.5mm", padding: "0 2mm" }} />
                      <td style={{ height: "6.5mm", padding: "0 1.5mm" }} />
                      <td style={{ height: "6.5mm", padding: "0 1.5mm" }} />
                      <td style={{ height: "6.5mm", padding: "0 1.5mm" }} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom content - adjusted grid to prevent overflow */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.15fr 0.85fr",
                gap: "8mm",
                alignItems: "start",
              }}
            >
              {/* Left Column - Terms & Bank */}
              <div style={{ fontSize: "7.5pt", color: "#475569" }}>
                <div style={{ marginBottom: "4mm" }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "8pt",
                      color: "#1a1a2e",
                      marginBottom: "1.5mm",
                      display: "flex",
                      alignItems: "center",
                      gap: "1.5mm",
                    }}
                  >
                    <span style={{ width: "4px", height: "4px", background: "#00a8cc", borderRadius: "50%" }} />
                    Payment and Shipping Terms
                  </div>
                  <div style={{ lineHeight: 1.6, paddingLeft: "2.5mm" }}>
                    <div>
                      <span style={{ color: "#94a3b8" }}>Payment Terms: </span>
                      <span style={{ fontWeight: 500, color: "#334155" }}>{paymentTerms}</span>
                    </div>
                    <div>
                      <span style={{ color: "#94a3b8" }}>Shipping Terms: </span>
                      <span style={{ fontWeight: 500, color: "#334155" }}>{shippingTerms}</span>
                    </div>
                    <div>
                      <span style={{ color: "#94a3b8" }}>Currency: </span>
                      <span style={{ fontWeight: 500, color: "#334155" }}>{currency}</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: "4mm" }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "8pt",
                      color: "#1a1a2e",
                      marginBottom: "1.5mm",
                      display: "flex",
                      alignItems: "center",
                      gap: "1.5mm",
                    }}
                  >
                    <span style={{ width: "4px", height: "4px", background: "#00a8cc", borderRadius: "50%" }} />
                    Bank Details
                  </div>

                  {bankInfo ? (
                    <div style={{ lineHeight: 1.55, paddingLeft: "2.5mm" }}>
                      {bankInfo.beneficiary ? (
                        <div>
                          <span style={{ color: "#94a3b8" }}>Beneficiary: </span>
                          <span style={{ fontWeight: 600, color: "#334155" }}>{bankInfo.beneficiary}</span>
                        </div>
                      ) : null}
                      {bankInfo.bank ? (
                        <div>
                          <span style={{ color: "#94a3b8" }}>Bank: </span>
                          <span style={{ color: "#475569" }}>{bankInfo.bank}</span>
                        </div>
                      ) : null}
                      {bankInfo.bankAddress ? (
                        <div>
                          <span style={{ color: "#94a3b8" }}>Address: </span>
                          <span style={{ color: "#475569" }}>{bankInfo.bankAddress}</span>
                        </div>
                      ) : null}
                      {bankInfo.accountNumber ? (
                        <div>
                          <span style={{ color: "#94a3b8" }}>Account: </span>
                          <span style={{ fontFamily: '"SF Mono", monospace', fontWeight: 600, color: "#334155" }}>
                            {bankInfo.accountNumber}
                          </span>
                        </div>
                      ) : null}
                      {bankInfo.swift ? (
                        <div>
                          <span style={{ color: "#94a3b8" }}>SWIFT: </span>
                          <span style={{ fontFamily: '"SF Mono", monospace', fontWeight: 600, color: "#334155" }}>
                            {bankInfo.swift}
                          </span>
                        </div>
                      ) : null}
                      {bankInfo.iban ? (
                        <div>
                          <span style={{ color: "#94a3b8" }}>IBAN: </span>
                          <span style={{ fontFamily: '"SF Mono", monospace', fontWeight: 600, color: "#334155" }}>
                            {bankInfo.iban}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div style={{ color: "#94a3b8", paddingLeft: "2.5mm" }}>No bank details available.</div>
                  )}
                </div>
              </div>

              {/* Right Column - Slim Totals */}
              <div>
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "3mm",
                    borderRadius: "2mm",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "1.5mm",
                      fontSize: "8pt",
                      color: "#64748b",
                    }}
                  >
                    <span>Subtotal</span>
                    <span style={{ fontFamily: '"SF Mono", monospace' }}>
                      {formatFinanceMoney(financialSummary?.subtotal || 0, currency)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "1.5mm",
                      fontSize: "8pt",
                      color: "#64748b",
                    }}
                  >
                    <span>Tax / VAT</span>
                    <span style={{ fontFamily: '"SF Mono", monospace' }}>
                      {formatFinanceMoney(financialSummary?.tax || 0, currency)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "2mm",
                      fontSize: "8pt",
                      color: "#64748b",
                    }}
                  >
                    <span>Discount</span>
                    <span style={{ fontFamily: '"SF Mono", monospace' }}>
                      {formatFinanceMoney(financialSummary?.discount || 0, currency)}
                    </span>
                  </div>

                  {/* Total - slim version */}
                  <div
                    style={{
                      background: "#1b263b",
                      color: "#ffffff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "2.5mm 3mm",
                      borderRadius: "1.5mm",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "9pt",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Total
                    </span>
                    <span
                      style={{
                        fontFamily: '"SF Mono", monospace',
                        fontSize: "10pt",
                        fontWeight: 700,
                        color: "#00d4ff",
                      }}
                    >
                      {formatFinanceMoney(financialSummary?.total || 0, currency)}
                    </span>
                  </div>

                  {(financialSummary?.paid || 0) > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: "2mm",
                        fontSize: "7.5pt",
                        color: "#22c55e",
                      }}
                    >
                      <span>Paid</span>
                      <span style={{ fontFamily: '"SF Mono", monospace', fontWeight: 600 }}>
                        {formatFinanceMoney(financialSummary?.paid || 0, currency)}
                      </span>
                    </div>
                  ) : null}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "2mm",
                      paddingTop: "2mm",
                      borderTop: "1px dashed #cbd5e1",
                      fontSize: "8.5pt",
                      fontWeight: 600,
                      color: "#1a1a2e",
                    }}
                  >
                    <span>Balance Due</span>
                    <span style={{ fontFamily: '"SF Mono", monospace', color: "#dc2626" }}>
                      {formatFinanceMoney(financialSummary?.balance || 0, currency)}
                    </span>
                  </div>

                  {/* Signature - compact */}
                  <div
                    style={{
                      marginTop: "5mm",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        borderBottom: "1px solid #cbd5e1",
                        height: "10mm",
                        marginBottom: "1mm",
                      }}
                    />
                    <div style={{ fontSize: "6.5pt", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Signature</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - compact */}
            <div
              style={{
                marginTop: "4mm",
                paddingTop: "3mm",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "8pt",
                  color: "#1a1a2e",
                  marginBottom: "1.5mm",
                  display: "flex",
                  alignItems: "center",
                  gap: "1.5mm",
                }}
              >
                <span style={{ width: "4px", height: "4px", background: "#00a8cc", borderRadius: "50%" }} />
                Terms and Conditions
              </div>

              <div
                style={{
                  lineHeight: 1.45,
                  whiteSpace: "pre-wrap",
                  fontSize: "6.8pt",
                  color: "#64748b",
                  marginBottom: "3mm",
                  paddingLeft: "2.5mm",
                }}
              >
                {termsAndConditions}
              </div>

              {/* Payment History */}
              {payments?.length > 0 ? (
                <div
                  style={{
                    marginTop: "2mm",
                    textAlign: "right",
                    fontSize: "6.5pt",
                    color: "#64748b",
                    lineHeight: 1.5,
                  }}
                >
                  {payments.map((payment: any, index: number) => (
                    <div key={payment.id || index}>
                      {formatFinanceDate(payment.payment_date)} ·{" "}
                      <span style={{ fontWeight: 500, color: "#22c55e" }}>
                        {formatFinanceMoney(payment.amount, currency)}
                      </span>
                      {payment.reference_number
                        ? ` · ${payment.reference_number}`
                        : ""}
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Thank You */}
              <div
                style={{
                  textAlign: "center",
                  fontSize: "9pt",
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#1a1a2e",
                  marginTop: "4mm",
                  paddingTop: "3mm",
                  borderTop: "1px solid #f1f5f9",
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
