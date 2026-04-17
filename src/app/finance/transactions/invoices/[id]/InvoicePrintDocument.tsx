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
  const fillerRows = Math.max(0, 3 - visibleRows.length);

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
            background: "#fafafa",
            color: "#1a1a2e",
            fontFamily:
              '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            position: "relative",
            overflow: "visible",
          }}
        >
          {/* Premium Header Background with subtle gradient */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: "85mm",
              background: "linear-gradient(145deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
              zIndex: 0,
            }}
          />

          {/* Decorative accent line */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "85mm",
              height: "1.5mm",
              background: "linear-gradient(90deg, #c9a227 0%, #d4af37 50%, #c9a227 100%)",
              zIndex: 1,
            }}
          />

          <div style={{ position: "relative", zIndex: 2, padding: "10mm 16mm 12mm 16mm" }}>
            {/* Top header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.05fr 0.95fr",
                gap: "12mm",
                alignItems: "start",
                color: "#ffffff",
                minHeight: "75mm",
              }}
            >
              <div>
                <img
                  src="https://leoilrrnwlquunsbulok.supabase.co/storage/v1/object/public/Branding/aixia-logo.png"
                  alt="AiXia"
                  style={{
                    height: "38mm",
                    width: "auto",
                    filter: "brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                    marginTop: "-5mm",
                    marginBottom: "2mm",
                  }}
                />

                <div
                  style={{
                    maxWidth: "88mm",
                    fontSize: "8.5pt",
                    lineHeight: 1.45,
                    paddingTop: "0mm",
                    marginTop: "-3mm",
                    color: "rgba(255,255,255,0.92)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "11pt",
                      marginBottom: "1.2mm",
                      letterSpacing: "0.02em",
                      color: "#ffffff",
                    }}
                  >
                    {invoice?.company_name_snapshot || "—"}
                  </div>
                  {invoice?.company_contact_person_snapshot ? (
                    <div style={{ opacity: 0.9 }}>{invoice.company_contact_person_snapshot}</div>
                  ) : null}
                  {invoice?.company_phone_snapshot ? (
                    <div style={{ opacity: 0.9 }}>{invoice.company_phone_snapshot}</div>
                  ) : null}
                  {invoice?.company_email_snapshot ? (
                    <div style={{ opacity: 0.9 }}>{invoice.company_email_snapshot}</div>
                  ) : null}
                  {invoice?.company_address_snapshot ? (
                    <div
                      style={{
                        marginTop: "1mm",
                        lineHeight: 1.4,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        maxWidth: "88mm",
                        fontSize: "8pt",
                        opacity: 0.85,
                      }}
                    >
                      {invoice.company_address_snapshot}
                    </div>
                  ) : null}
                </div>
              </div>

              <div style={{ paddingTop: "3mm", textAlign: "left" }}>
                <div
                  style={{
                    fontSize: "32pt",
                    fontWeight: 200,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: "5mm",
                    lineHeight: 1,
                    color: "#ffffff",
                    textShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  }}
                >
                  Invoice
                </div>

                <div style={{ fontSize: "9.5pt", lineHeight: 2 }}>
                  <div style={{ display: "flex", gap: "5mm" }}>
                    <span style={{ width: "28mm", opacity: 0.65, fontWeight: 400 }}>Invoice No</span>
                    <span style={{ fontWeight: 600, letterSpacing: "0.02em" }}>{invoice?.invoice_number || "—"}</span>
                  </div>
                  <div style={{ display: "flex", gap: "5mm" }}>
                    <span style={{ width: "28mm", opacity: 0.65, fontWeight: 400 }}>Issue Date</span>
                    <span style={{ fontWeight: 500 }}>{formatFinanceDate(invoice?.issue_date)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "5mm" }}>
                    <span style={{ width: "28mm", opacity: 0.65, fontWeight: 400 }}>Due Date</span>
                    <span style={{ fontWeight: 500 }}>{formatFinanceDate(invoice?.due_date)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To - Premium Card */}
            <div style={{ marginTop: "4mm", marginBottom: "8mm" }}>
              <div
                style={{
                  background: "#ffffff",
                  border: "none",
                  borderRadius: "3mm",
                  padding: "5mm 6mm",
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  style={{
                    fontSize: "7pt",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    color: "#c9a227",
                    fontWeight: 700,
                    marginBottom: "2mm",
                  }}
                >
                  Bill To
                </div>
                <div style={{ fontWeight: 600, fontSize: "12pt", marginBottom: "1.2mm", color: "#1a1a2e" }}>
                  {invoice?.client_name_snapshot || "—"}
                </div>
                {invoice?.client_contact_person_snapshot ? (
                  <div style={{ fontSize: "8.5pt", color: "#4a4a5a", marginBottom: "0.8mm" }}>
                    {invoice.client_contact_person_snapshot}
                  </div>
                ) : null}
                {invoice?.client_email_snapshot || invoice?.client_phone_snapshot ? (
                  <div style={{ fontSize: "8.2pt", color: "#5a5a6a", marginBottom: "0.8mm" }}>
                    {[invoice?.client_email_snapshot, invoice?.client_phone_snapshot]
                      .filter(Boolean)
                      .join(" • ")}
                  </div>
                ) : null}
                <div style={{ fontSize: "8.5pt", color: "#4a4a5a", lineHeight: 1.6 }}>
                  {invoice?.billing_address_snapshot || "—"}
                </div>
              </div>
            </div>

            {/* Premium Table */}
            <div style={{ marginBottom: "10mm" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: 0,
                  tableLayout: "fixed",
                  fontSize: "8.5pt",
                  borderRadius: "2mm",
                  overflow: "hidden",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                <thead>
                  <tr style={{ 
                    background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)", 
                    color: "#ffffff" 
                  }}>
                    <th
                      style={{
                        width: "9%",
                        textAlign: "center",
                        padding: "3.5mm 2mm",
                        fontWeight: 600,
                        fontSize: "8pt",
                        letterSpacing: "0.03em",
                        borderBottom: "2px solid #c9a227",
                      }}
                    >
                      No
                    </th>
                    <th
                      style={{
                        width: "49%",
                        textAlign: "left",
                        padding: "3.5mm 3mm",
                        fontWeight: 600,
                        fontSize: "8pt",
                        letterSpacing: "0.03em",
                        borderBottom: "2px solid #c9a227",
                      }}
                    >
                      Item Description
                    </th>
                    <th
                      style={{
                        width: "15%",
                        textAlign: "right",
                        padding: "3.5mm 2mm",
                        fontWeight: 600,
                        fontSize: "8pt",
                        letterSpacing: "0.03em",
                        borderBottom: "2px solid #c9a227",
                      }}
                    >
                      Unit Price
                    </th>
                    <th
                      style={{
                        width: "12%",
                        textAlign: "right",
                        padding: "3.5mm 2mm",
                        fontWeight: 600,
                        fontSize: "8pt",
                        letterSpacing: "0.03em",
                        borderBottom: "2px solid #c9a227",
                      }}
                    >
                      Qty
                    </th>
                    <th
                      style={{
                        width: "15%",
                        textAlign: "right",
                        padding: "3.5mm 2mm",
                        fontWeight: 600,
                        fontSize: "8pt",
                        letterSpacing: "0.03em",
                        borderBottom: "2px solid #c9a227",
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
                      <tr 
                        key={item.id || index} 
                        style={{ 
                          background: index % 2 === 0 ? "#ffffff" : "#fafbfc",
                          borderBottom: "0.5pt solid #e8e8ec",
                        }}
                      >
                        <td style={{ padding: "3mm 2mm", textAlign: "center", color: "#6a6a7a" }}>{index + 1}</td>
                        <td style={{ padding: "3mm 3mm", verticalAlign: "top" }}>
                          <div style={{ fontWeight: 500, color: "#1a1a2e" }}>{item.description || "—"}</div>
                        </td>
                        <td
                          style={{
                            padding: "3mm 2mm",
                            textAlign: "right",
                            fontFamily: '"SF Mono", "Monaco", "Inconsolata", monospace',
                            color: "#4a4a5a",
                          }}
                        >
                          {formatFinanceMoney(unitPrice, currency)}
                        </td>
                        <td
                          style={{
                            padding: "3mm 2mm",
                            textAlign: "right",
                            fontFamily: '"SF Mono", "Monaco", "Inconsolata", monospace',
                            color: "#4a4a5a",
                          }}
                        >
                          {quantity}
                        </td>
                        <td
                          style={{
                            padding: "3mm 2mm",
                            textAlign: "right",
                            fontFamily: '"SF Mono", "Monaco", "Inconsolata", monospace',
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
                    <tr 
                      key={`filler-${index}`} 
                      style={{ 
                        background: (visibleRows.length + index) % 2 === 0 ? "#ffffff" : "#fafbfc",
                        borderBottom: "0.5pt solid #e8e8ec",
                      }}
                    >
                      <td style={{ height: "7.5mm", padding: "0 2mm" }} />
                      <td style={{ height: "7.5mm", padding: "0 3mm" }} />
                      <td style={{ height: "7.5mm", padding: "0 2mm" }} />
                      <td style={{ height: "7.5mm", padding: "0 2mm" }} />
                      <td style={{ height: "7.5mm", padding: "0 2mm" }} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom content */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.12fr 0.88fr",
                gap: "16mm",
                alignItems: "start",
                marginTop: "0mm",
              }}
            >
              <div style={{ fontSize: "8.2pt", color: "#4a4a5a" }}>
                <div
                  style={{
                    background: "#ffffff",
                    paddingTop: "2mm",
                    paddingRight: "2mm",
                    borderRadius: "2mm",
                  }}
                >
                  <div style={{ marginBottom: "5mm" }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "9pt",
                        color: "#1a1a2e",
                        marginBottom: "2mm",
                        letterSpacing: "0.02em",
                        display: "flex",
                        alignItems: "center",
                        gap: "2mm",
                      }}
                    >
                      <span style={{ 
                        width: "6px", 
                        height: "6px", 
                        background: "#c9a227", 
                        borderRadius: "50%",
                        display: "inline-block",
                      }} />
                      Payment and Shipping Terms
                    </div>
                    <div style={{ lineHeight: 1.75, paddingLeft: "3mm" }}>
                      <div>
                        <span style={{ color: "#7a7a8a" }}>Payment Terms: </span>
                        <span style={{ fontWeight: 500, color: "#2a2a3a" }}>{paymentTerms}</span>
                      </div>
                      <div>
                        <span style={{ color: "#7a7a8a" }}>Shipping Terms: </span>
                        <span style={{ fontWeight: 500, color: "#2a2a3a" }}>{shippingTerms}</span>
                      </div>
                      <div>
                        <span style={{ color: "#7a7a8a" }}>Currency: </span>
                        <span style={{ fontWeight: 500, color: "#2a2a3a" }}>{currency}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: "8mm" }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "9pt",
                        color: "#1a1a2e",
                        marginBottom: "2mm",
                        letterSpacing: "0.02em",
                        display: "flex",
                        alignItems: "center",
                        gap: "2mm",
                      }}
                    >
                      <span style={{ 
                        width: "6px", 
                        height: "6px", 
                        background: "#c9a227", 
                        borderRadius: "50%",
                        display: "inline-block",
                      }} />
                      Bank Details
                    </div>

                    {bankInfo ? (
                      <div style={{ lineHeight: 1.7, paddingLeft: "3mm" }}>
                        {bankInfo.beneficiary ? (
                          <div>
                            <span style={{ color: "#7a7a8a" }}>Beneficiary: </span>
                            <span style={{ fontWeight: 600, color: "#2a2a3a" }}>{bankInfo.beneficiary}</span>
                          </div>
                        ) : null}
                        {bankInfo.bank ? (
                          <div>
                            <span style={{ color: "#7a7a8a" }}>Beneficiary Bank Name: </span>
                            <span style={{ color: "#3a3a4a" }}>{bankInfo.bank}</span>
                          </div>
                        ) : null}
                        {bankInfo.bankAddress ? (
                          <div>
                            <span style={{ color: "#7a7a8a" }}>Beneficiary Bank Address: </span>
                            <span style={{ color: "#3a3a4a" }}>{bankInfo.bankAddress}</span>
                          </div>
                        ) : null}
                        {bankInfo.accountNumber ? (
                          <div>
                            <span style={{ color: "#7a7a8a" }}>Bank Account: </span>
                            <span style={{ fontFamily: '"SF Mono", monospace', fontWeight: 600, color: "#2a2a3a" }}>
                              {bankInfo.accountNumber}
                            </span>
                          </div>
                        ) : null}
                        {bankInfo.swift ? (
                          <div>
                            <span style={{ color: "#7a7a8a" }}>SWIFT Code: </span>
                            <span style={{ fontFamily: '"SF Mono", monospace', fontWeight: 600, color: "#2a2a3a" }}>
                              {bankInfo.swift}
                            </span>
                          </div>
                        ) : null}
                        {bankInfo.iban ? (
                          <div>
                            <span style={{ color: "#7a7a8a" }}>IBAN: </span>
                            <span style={{ fontFamily: '"SF Mono", monospace', fontWeight: 600, color: "#2a2a3a" }}>
                              {bankInfo.iban}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div style={{ color: "#7a7a8a", paddingLeft: "3mm" }}>No bank details available.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Premium Totals and Signature */}
              <div>
                <div
                  style={{
                    background: "#ffffff",
                    padding: "3mm 0 0 8mm",
                    borderRadius: "2mm",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "2.5mm",
                      fontSize: "9pt",
                      color: "#5a5a6a",
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>Subtotal</span>
                    <span style={{ fontFamily: '"SF Mono", monospace', fontWeight: 500 }}>
                      {formatFinanceMoney(financialSummary?.subtotal || 0, currency)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "2.5mm",
                      fontSize: "9pt",
                      color: "#5a5a6a",
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>Tax / VAT</span>
                    <span style={{ fontFamily: '"SF Mono", monospace', fontWeight: 500 }}>
                      {formatFinanceMoney(financialSummary?.tax || 0, currency)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "2.5mm",
                      fontSize: "9pt",
                      color: "#5a5a6a",
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>Discount</span>
                    <span style={{ fontFamily: '"SF Mono", monospace', fontWeight: 500 }}>
                      {formatFinanceMoney(financialSummary?.discount || 0, currency)}
                    </span>
                  </div>

                  <div
                    style={{
                      background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)",
                      color: "#ffffff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "3.5mm 4mm",
                      marginTop: "3mm",
                      borderRadius: "2mm",
                      boxShadow: "0 4px 12px rgba(26,26,46,0.25)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10pt",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Grand Total
                    </span>
                    <span
                      style={{
                        fontFamily: '"SF Mono", monospace',
                        fontSize: "12pt",
                        fontWeight: 700,
                        color: "#c9a227",
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
                        marginTop: "3mm",
                        fontSize: "8.8pt",
                        color: "#4a9b4a",
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>Paid</span>
                      <span style={{ fontFamily: '"SF Mono", monospace', fontWeight: 600 }}>
                        {formatFinanceMoney(financialSummary?.paid || 0, currency)}
                      </span>
                    </div>
                  ) : null}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "3mm",
                      fontSize: "9.5pt",
                      fontWeight: 600,
                      color: "#1a1a2e",
                      padding: "2mm 0",
                      borderTop: "1px dashed #d0d0d8",
                    }}
                  >
                    <span>Balance Due</span>
                    <span style={{ fontFamily: '"SF Mono", monospace', color: "#c44b4b" }}>
                      {formatFinanceMoney(financialSummary?.balance || 0, currency)}
                    </span>
                  </div>

                  {/* Premium Signature */}
                  <div
                    style={{
                      marginTop: "8mm",
                      textAlign: "center",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        borderBottom: "1px solid #d0d0d8",
                        height: "14mm",
                        marginBottom: "2mm",
                        background: "linear-gradient(to bottom, transparent 90%, #f0f0f4 100%)",
                      }}
                    />
                    <div style={{ fontSize: "7.5pt", color: "#7a7a8a", letterSpacing: "0.05em", textTransform: "uppercase" }}>Authorized Signature</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Footer */}
            <div
              style={{
                marginTop: "3mm",
                paddingTop: "4mm",
                borderTop: "1px solid #e0e0e8",
                background: "#ffffff",
                borderRadius: "2mm",
                padding: "4mm 5mm",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "8.5pt",
                  color: "#1a1a2e",
                  marginBottom: "2.5mm",
                  letterSpacing: "0.02em",
                  display: "flex",
                  alignItems: "center",
                  gap: "2mm",
                }}
              >
                <span style={{ 
                  width: "5px", 
                  height: "5px", 
                  background: "#c9a227", 
                  borderRadius: "50%",
                  display: "inline-block",
                }} />
                Terms and Conditions
              </div>

              <div
                style={{
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  fontSize: "7.2pt",
                  color: "#5a5a6a",
                  marginBottom: "4mm",
                  paddingLeft: "3mm",
                }}
              >
                {termsAndConditions}
              </div>

              {/* Payment History */}
              {payments?.length > 0 ? (
                <div
                  style={{
                    marginTop: "3mm",
                    textAlign: "right",
                    fontSize: "7pt",
                    color: "#7a7a8a",
                    lineHeight: 1.6,
                    padding: "2mm 3mm",
                    background: "#f8f8fa",
                    borderRadius: "1.5mm",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: "1mm", color: "#5a5a6a" }}>Payment History</div>
                  {payments.map((payment: any, index: number) => (
                    <div key={payment.id || index}>
                      {formatFinanceDate(payment.payment_date)} ·{" "}
                      <span style={{ fontWeight: 500, color: "#4a9b4a" }}>
                        {formatFinanceMoney(payment.amount, currency)}
                      </span>
                      {payment.reference_number
                        ? ` · ${payment.reference_number}`
                        : ""}
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Premium Thank You */}
              <div
                style={{
                  textAlign: "center",
                  fontSize: "10pt",
                  fontWeight: 500,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "#1a1a2e",
                  marginTop: "5mm",
                  padding: "3mm 0",
                  borderTop: "1px solid #f0f0f4",
                }}
              >
                <span style={{ color: "#c9a227" }}>✦</span> Thank You For Your Business <span style={{ color: "#c9a227" }}>✦</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
