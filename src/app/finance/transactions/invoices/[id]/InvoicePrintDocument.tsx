import { formatFinanceDate, formatFinanceMoney } from "@/lib/finance/invoicesIssued";

type Props = {
  invoice: any;
  lineItems: any[];
  financialSummary: any;
  payments?: any[];
  project?: any;
  task?: any;
};

export default function InvoicePrintDocument({
  invoice,
  lineItems,
  financialSummary,
  payments = [],
  project,
  task,
}: Props) {
  const currency = invoice?.currency_code || "USD";
  
  const parseBankDetails = (details: string) => {
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
      const parts = details.split("|").map((s) => s.trim());
      return {
        beneficiary: parts[0] || "",
        bank: parts[1] || "",
        bankAddress: "",
        accountNumber: parts[2] || "",
        iban: parts[2] || "",
        swift: parts[3] || "",
        currency: "",
      };
    }
  };

  const bankInfo = parseBankDetails(invoice?.bank_details_snapshot);

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          
          html, body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          body * {
            visibility: hidden !important;
          }
          
          .invoice-premium-container,
          .invoice-premium-container * {
            visibility: visible !important;
          }
          
          .invoice-premium-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
        }
        
        @media screen {
          .invoice-premium-container {
            display: none !important;
          }
        }
      `}</style>

      <div className="invoice-premium-container">
        <div
          style={{
            width: "210mm",
            height: "297mm",
            background: "#ffffff",
            color: "#0f172a",
            fontFamily: 'Inter, "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
            position: "relative",
            display: "flex",
            flexDirection: "column",
            padding: "12mm 14mm 12mm 14mm",
            boxSizing: "border-box",
          }}
        >
          {/* Premium Gradient Header - Compact */}
          <div
            style={{
              background: "linear-gradient(135deg, #000000 0%, #1e1b4b 50%, #312e81 100%)",
              color: "#ffffff",
              padding: "8mm 10mm",
              margin: "-12mm -14mm 6mm -14mm",
              position: "relative",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {/* Logo Only - No Text Duplicate */}
            <img
              src="https://leoilrrnwlquunsbulok.supabase.co/storage/v1/object/public/Branding/aixia-logo.png"
              alt="AiXia"
              style={{
                height: "8mm",
                width: "auto",
                objectFit: "contain",
                filter: "brightness(0) invert(1) drop-shadow(0 0 4mm rgba(255,255,255,0.3))",
              }}
            />

            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "20pt",
                  fontWeight: 200,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  marginBottom: "1mm",
                  background: "linear-gradient(to right, #ffffff, #c7d2fe)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Invoice
              </div>
              <div style={{ fontSize: "8pt", opacity: 0.9, fontFamily: "monospace", letterSpacing: "0.05em" }}>
                {invoice?.invoice_number}
              </div>
            </div>
          </div>

          {/* Compact Info Grid - Side by Side */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 80mm",
              gap: "4mm",
              marginBottom: "4mm",
              fontSize: "8pt",
            }}
          >
            {/* From */}
            <div>
              <div style={{ fontSize: "6.5pt", textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", marginBottom: "1mm", fontWeight: 600 }}>
                From
              </div>
              <div style={{ fontWeight: 700, fontSize: "9.5pt", color: "#0f172a", marginBottom: "0.5mm" }}>
                {invoice?.company_name_snapshot || "AiXia Technologies"}
              </div>
              <div style={{ color: "#475569", lineHeight: 1.4, fontSize: "7.5pt" }}>
                {invoice?.company_address_snapshot && <div>{invoice.company_address_snapshot}</div>}
                <div>{invoice?.company_email_snapshot} {invoice?.company_phone_snapshot && `• ${invoice.company_phone_snapshot}`}</div>
              </div>
            </div>

            {/* Bill To */}
            <div>
              <div style={{ fontSize: "6.5pt", textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", marginBottom: "1mm", fontWeight: 600 }}>
                Bill To
              </div>
              <div style={{ fontWeight: 700, fontSize: "9.5pt", color: "#0f172a", marginBottom: "0.5mm" }}>
                {invoice?.client_name_snapshot || "Client"}
              </div>
              <div style={{ color: "#475569", lineHeight: 1.4, fontSize: "7.5pt" }}>
                {invoice?.billing_address_snapshot && <div>{invoice.billing_address_snapshot}</div>}
                <div>{invoice?.client_email_snapshot} {invoice?.client_phone_snapshot && `• ${invoice.client_phone_snapshot}`}</div>
              </div>
            </div>

            {/* Meta Data - Compact */}
            <div style={{ textAlign: "right", fontSize: "7.5pt" }}>
              <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "1mm 3mm", justifyContent: "end" }}>
                <span style={{ color: "#64748b" }}>Issue Date</span>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>{formatFinanceDate(invoice?.issue_date)}</span>
                
                <span style={{ color: "#64748b" }}>Due Date</span>
                <span style={{ fontWeight: 700, color: invoice?.payment_status !== 'paid' && new Date(invoice?.due_date) < new Date() ? "#dc2626" : "#0f172a" }}>
                  {formatFinanceDate(invoice?.due_date)}
                </span>
                
                <span style={{ color: "#64748b" }}>Currency</span>
                <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{currency}</span>
                
                {invoice?.payment_terms_snapshot && (
                  <>
                    <span style={{ color: "#64748b" }}>Terms</span>
                    <span>{invoice.payment_terms_snapshot}</span>
                  </>
                )}
                {project?.name && (
                  <>
                    <span style={{ color: "#64748b" }}>Project</span>
                    <span style={{ fontWeight: 500 }}>{project.name}</span>
                  </>
                )}
              </div>

              {/* Status Pills - Inline */}
              <div style={{ display: "flex", gap: "1.5mm", justifyContent: "flex-end", marginTop: "2mm" }}>
                <span style={{ background: invoice?.status === 'draft' ? '#f1f5f9' : invoice?.status === 'paid' ? '#dcfce7' : '#0f172a', color: invoice?.status === 'draft' ? '#64748b' : invoice?.status === 'paid' ? '#166534' : '#ffffff', padding: "1mm 2.5mm", borderRadius: "1mm", fontSize: "6.5pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {invoice?.status}
                </span>
                <span style={{ background: invoice?.payment_status === 'paid' ? '#dcfce7' : invoice?.payment_status === 'partial' ? '#fef3c7' : '#fee2e2', color: invoice?.payment_status === 'paid' ? '#166534' : invoice?.payment_status === 'partial' ? '#92400e' : '#991b1b', padding: "1mm 2.5mm", borderRadius: "1mm", fontSize: "6.5pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {invoice?.payment_status}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items - Ultra Compact for 10 items */}
          <div style={{ flex: 1, marginBottom: "4mm" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8pt" }}>
              <thead>
                <tr style={{ background: "linear-gradient(to right, #f8fafc, #f1f5f9)" }}>
                  <th style={{ textAlign: "left", padding: "2.5mm 2mm", borderBottom: "1.5pt solid #0f172a", fontWeight: 700, fontSize: "6.5pt", textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569", width: "4mm" }}>#</th>
                  <th style={{ textAlign: "left", padding: "2.5mm 2mm", borderBottom: "1.5pt solid #0f172a", fontWeight: 700, fontSize: "6.5pt", textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569" }}>Description</th>
                  <th style={{ textAlign: "right", padding: "2.5mm 2mm", borderBottom: "1.5pt solid #0f172a", fontWeight: 700, fontSize: "6.5pt", textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569", width: "12mm" }}>Qty</th>
                  <th style={{ textAlign: "right", padding: "2.5mm 2mm", borderBottom: "1.5pt solid #0f172a", fontWeight: 700, fontSize: "6.5pt", textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569", width: "18mm" }}>Price</th>
                  <th style={{ textAlign: "right", padding: "2.5mm 2mm", borderBottom: "1.5pt solid #0f172a", fontWeight: 700, fontSize: "6.5pt", textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569", width: "18mm" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={item.id || index} style={{ pageBreakInside: "avoid" }}>
                    <td style={{ padding: "2mm 2mm", borderBottom: "0.5pt solid #e2e8f0", color: "#94a3b8", fontFamily: "monospace", fontSize: "7.5pt" }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: "2mm 2mm", borderBottom: "0.5pt solid #e2e8f0", verticalAlign: "top" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "8pt", lineHeight: 1.3 }}>
                        {item.description || "—"}
                      </div>
                      <div style={{ fontSize: "6.5pt", color: "#94a3b8", marginTop: "0.3mm" }}>
                        {[item.unit_of_measure_id, item.tax_code_id, item.revenue_category_id].filter(Boolean).join(" • ")}
                      </div>
                    </td>
                    <td style={{ padding: "2mm 2mm", borderBottom: "0.5pt solid #e2e8f0", textAlign: "right", fontFamily: "monospace", color: "#334155", fontSize: "8pt" }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: "2mm 2mm", borderBottom: "0.5pt solid #e2e8f0", textAlign: "right", fontFamily: "monospace", color: "#334155", fontSize: "8pt" }}>
                      {formatFinanceMoney(item.unitPrice || item.unit_price, currency)}
                    </td>
                    <td style={{ padding: "2mm 2mm", borderBottom: "0.5pt solid #e2e8f0", textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: "#0f172a", fontSize: "8.5pt" }}>
                      {formatFinanceMoney((item.lineTotal || (item.quantity * (item.unitPrice || item.unit_price))) - (item.discount || 0), currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Grid - Bank Details Left, Totals Right */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 65mm", gap: "8mm", borderTop: "1.5pt solid #0f172a", paddingTop: "4mm" }}>
            
            {/* Bank Details - Compact 2-Column */}
            <div>
              <div style={{ fontSize: "7pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#0f172a", marginBottom: "2mm", display: "flex", alignItems: "center", gap: "1.5mm" }}>
                <span style={{ width: "1.5mm", height: "1.5mm", background: "linear-gradient(135deg, #10b981, #059669)", borderRadius: "50%" }}></span>
                Payment Instructions
              </div>
              
              {bankInfo && (bankInfo.beneficiary || bankInfo.bank) ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2mm 4mm", fontSize: "7pt", lineHeight: 1.4 }}>
                  {bankInfo.beneficiary && (
                    <div>
                      <div style={{ color: "#64748b", fontSize: "6pt", textTransform: "uppercase", letterSpacing: "0.05em" }}>Beneficiary</div>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{bankInfo.beneficiary}</div>
                    </div>
                  )}
                  {bankInfo.bank && (
                    <div>
                      <div style={{ color: "#64748b", fontSize: "6pt", textTransform: "uppercase", letterSpacing: "0.05em" }}>Bank</div>
                      <div style={{ fontWeight: 500, color: "#334155" }}>{bankInfo.bank}</div>
                    </div>
                  )}
                  {bankInfo.accountNumber && (
                    <div>
                      <div style={{ color: "#64748b", fontSize: "6pt", textTransform: "uppercase", letterSpacing: "0.05em" }}>Account</div>
                      <div style={{ fontFamily: "monospace", fontWeight: 600, color: "#0f172a", background: "#f1f5f9", padding: "0.5mm 1.5mm", borderRadius: "0.5mm", fontSize: "7.5pt", letterSpacing: "0.02em" }}>{bankInfo.accountNumber}</div>
                    </div>
                  )}
                  {bankInfo.swift && (
                    <div>
                      <div style={{ color: "#64748b", fontSize: "6pt", textTransform: "uppercase", letterSpacing: "0.05em" }}>SWIFT</div>
                      <div style={{ fontFamily: "monospace", fontWeight: 600, color: "#0f172a", background: "#f1f5f9", padding: "0.5mm 1.5mm", borderRadius: "0.5mm", fontSize: "7.5pt", letterSpacing: "0.02em" }}>{bankInfo.swift}</div>
                    </div>
                  )}
                  {bankInfo.iban && (
                    <div style={{ gridColumn: "span 2" }}>
                      <div style={{ color: "#64748b", fontSize: "6pt", textTransform: "uppercase", letterSpacing: "0.05em" }}>IBAN</div>
                      <div style={{ fontFamily: "monospace", fontWeight: 600, color: "#0f172a", background: "#f1f5f9", padding: "0.5mm 1.5mm", borderRadius: "0.5mm", fontSize: "7.5pt", letterSpacing: "0.02em" }}>{bankInfo.iban}</div>
                    </div>
                  )}
                  {currency && (
                    <div>
                      <div style={{ color: "#64748b", fontSize: "6pt", textTransform: "uppercase", letterSpacing: "0.05em" }}>Currency</div>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{currency}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: "7.5pt", color: "#64748b" }}>Contact accounts payable for wire instructions</div>
              )}

              {invoice?.notes && (
                <div style={{ marginTop: "3mm", paddingTop: "2mm", borderTop: "0.5pt solid #e2e8f0" }}>
                  <div style={{ fontSize: "6.5pt", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1mm" }}>Notes</div>
                  <div style={{ fontSize: "7pt", color: "#475569", lineHeight: 1.4 }}>{invoice.notes}</div>
                </div>
              )}
            </div>

            {/* Totals - Premium Gradient Box */}
            <div>
              <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", color: "#ffffff", padding: "4mm", borderRadius: "2mm", boxShadow: "0 4mm 8mm rgba(0,0,0,0.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5mm", fontSize: "7.5pt", opacity: 0.9 }}>
                  <span>Subtotal</span>
                  <span style={{ fontFamily: "monospace" }}>{formatFinanceMoney(financialSummary?.subtotal || 0, currency)}</span>
                </div>
                
                {(financialSummary?.discount || 0) > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5mm", fontSize: "7.5pt", opacity: 0.9 }}>
                    <span>Discount</span>
                    <span style={{ fontFamily: "monospace" }}>-{formatFinanceMoney(financialSummary.discount, currency)}</span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5mm", fontSize: "7.5pt", opacity: 0.9 }}>
                  <span>Tax</span>
                  <span style={{ fontFamily: "monospace" }}>{formatFinanceMoney(financialSummary?.tax || 0, currency)}</span>
                </div>

                {(financialSummary?.paid || 0) > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5mm", fontSize: "7.5pt", color: "#86efac" }}>
                    <span>Paid</span>
                    <span style={{ fontFamily: "monospace" }}>-{formatFinanceMoney(financialSummary.paid, currency)}</span>
                  </div>
                )}

                <div style={{ height: "0.5pt", background: "rgba(255,255,255,0.2)", margin: "2mm 0" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <div style={{ fontSize: "7pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.8 }}>Balance Due</div>
                    {invoice?.due_date && <div style={{ fontSize: "6.5pt", opacity: 0.6, marginTop: "0.5mm" }}>Due {formatFinanceDate(invoice.due_date)}</div>}
                  </div>
                  <span style={{ fontSize: "14pt", fontWeight: 700, fontFamily: "monospace", letterSpacing: "-0.02em" }}>
                    {formatFinanceMoney(financialSummary?.balance || financialSummary?.total || 0, currency)}
                  </span>
                </div>
              </div>

              {/* Payment History Mini */}
              {payments && payments.length > 0 && (
                <div style={{ marginTop: "2mm", padding: "2mm", background: "#f8fafc", borderRadius: "1.5mm", border: "0.5pt solid #e2e8f0" }}>
                  <div style={{ fontSize: "6pt", textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: "1mm", fontWeight: 600 }}>Payment History</div>
                  {payments.slice(0, 2).map((payment) => (
                    <div key={payment.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "7pt", marginBottom: "0.5mm" }}>
                      <span style={{ color: "#059669" }}>✓ {formatFinanceDate(payment.payment_date)}</span>
                      <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{formatFinanceMoney(payment.amount, currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer - Compact */}
          <div style={{ marginTop: "auto", paddingTop: "3mm", borderTop: "0.5pt solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "6.5pt", color: "#94a3b8" }}>
            <div style={{ fontWeight: 600, color: "#0f172a" }}>Thank you for your business</div>
            <div style={{ fontFamily: "monospace" }}>{invoice?.invoice_number} • Page 1 of 1</div>
          </div>
        </div>
      </div>
    </>
  );
}
