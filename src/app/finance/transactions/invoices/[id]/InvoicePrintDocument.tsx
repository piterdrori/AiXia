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
        accountNumber: "",
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
          @page { size: A4; margin: 0; }
          html, body { background: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          .invoice-premium-container, .invoice-premium-container * { visibility: visible !important; }
          .invoice-premium-container {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 210mm !important; height: 297mm !important;
            background: #ffffff !important; margin: 0 !important; padding: 0 !important;
            overflow: hidden !important;
          }
        }
        @media screen { .invoice-premium-container { display: none !important; } }
      `}</style>

      <div className="invoice-premium-container">
        <div style={{
          width: "210mm", height: "297mm", background: "#ffffff", color: "#0f172a",
          fontFamily: 'Inter, "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
          position: "relative", display: "flex", flexDirection: "column",
          padding: "10mm 12mm 10mm 12mm", boxSizing: "border-box",
        }}>
          {/* Premium Gradient Header */}
          <div style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)",
            color: "#ffffff", padding: "6mm 8mm", margin: "-10mm -12mm 4mm -12mm",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            position: "relative", overflow: "hidden",
          }}>
            {/* Subtle glow effect */}
            <div style={{
              position: "absolute", top: "-50%", right: "-20%", width: "60%", height: "200%",
              background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)",
            }} />
            
            <img
              src="https://leoilrrnwlquunsbulok.supabase.co/storage/v1/object/public/Branding/aixia-logo.png"
              alt="AiXia" style={{ height: "7mm", filter: "brightness(0) invert(1)", position: "relative", zIndex: 1 }}
            />
            
            <div style={{ textAlign: "right", position: "relative", zIndex: 1 }}>
              <div style={{
                fontSize: "18pt", fontWeight: 200, letterSpacing: "0.15em", textTransform: "uppercase",
                background: "linear-gradient(to right, #ffffff, #c7d2fe)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                Invoice
              </div>
              <div style={{ fontSize: "7.5pt", opacity: 0.9, fontFamily: "monospace", marginTop: "1mm" }}>
                {invoice?.invoice_number}
              </div>
            </div>
          </div>

          {/* Compact 3-Column Info Grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 70mm", gap: "3mm", marginBottom: "3mm", fontSize: "7.5pt",
          }}>
            {/* From */}
            <div>
              <div style={{ fontSize: "6pt", textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", marginBottom: "1mm", fontWeight: 700 }}>
                From
              </div>
              <div style={{ fontWeight: 700, fontSize: "9pt", color: "#0f172a", marginBottom: "0.5mm", lineHeight: 1.2 }}>
                {invoice?.company_name_snapshot || "AiXia Technologies"}
              </div>
              <div style={{ color: "#475569", lineHeight: 1.35, fontSize: "7pt" }}>
                {invoice?.company_address_snapshot && <div>{invoice.company_address_snapshot}</div>}
                <div>{invoice?.company_email_snapshot} {invoice?.company_phone_snapshot && `• ${invoice.company_phone_snapshot}`}</div>
              </div>
            </div>

            {/* Bill To */}
            <div>
              <div style={{ fontSize: "6pt", textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", marginBottom: "1mm", fontWeight: 700 }}>
                Bill To
              </div>
              <div style={{ fontWeight: 700, fontSize: "9pt", color: "#0f172a", marginBottom: "0.5mm", lineHeight: 1.2 }}>
                {invoice?.client_name_snapshot || "Client"}
              </div>
              <div style={{ color: "#475569", lineHeight: 1.35, fontSize: "7pt" }}>
                {invoice?.billing_address_snapshot && <div>{invoice.billing_address_snapshot}</div>}
                <div>{invoice?.client_email_snapshot} {invoice?.client_phone_snapshot && `• ${invoice.client_phone_snapshot}`}</div>
              </div>
            </div>

            {/* Meta & Status */}
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "0.5mm 2mm", justifyContent: "end", fontSize: "7pt" }}>
                <span style={{ color: "#64748b" }}>Issue</span>
                <span style={{ fontWeight: 600 }}>{formatFinanceDate(invoice?.issue_date)}</span>
                <span style={{ color: "#64748b" }}>Due</span>
                <span style={{ fontWeight: 700, color: new Date(invoice?.due_date) < new Date() && invoice?.payment_status !== 'paid' ? "#dc2626" : "#0f172a" }}>
                  {formatFinanceDate(invoice?.due_date)}
                </span>
                <span style={{ color: "#64748b" }}>Currency</span>
                <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{currency}</span>
                {project?.name && <><span style={{ color: "#64748b" }}>Project</span><span>{project.name}</span></>}
                {task?.title && <><span style={{ color: "#64748b" }}>Task</span><span>{task.title}</span></>}
                {invoice?.payment_terms_snapshot && <><span style={{ color: "#64748b" }}>Terms</span><span>{invoice.payment_terms_snapshot}</span></>}
              </div>
              
              <div style={{ display: "flex", gap: "1.5mm", justifyContent: "flex-end", marginTop: "2mm" }}>
                <span style={{
                  background: invoice?.status === 'draft' ? '#f1f5f9' : invoice?.status === 'paid' ? '#dcfce7' : '#0f172a',
                  color: invoice?.status === 'draft' ? '#64748b' : invoice?.status === 'paid' ? '#166534' : '#ffffff',
                  padding: "1mm 2mm", borderRadius: "1mm", fontSize: "6pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em"
                }}>
                  {invoice?.status}
                </span>
                <span style={{
                  background: invoice?.payment_status === 'paid' ? '#dcfce7' : invoice?.payment_status === 'partial' ? '#fef3c7' : '#fee2e2',
                  color: invoice?.payment_status === 'paid' ? '#166534' : invoice?.payment_status === 'partial' ? '#92400e' : '#991b1b',
                  padding: "1mm 2mm", borderRadius: "1mm", fontSize: "6pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em"
                }}>
                  {invoice?.payment_status}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items - Ultra Compact Table */}
          <div style={{ flex: 1, marginBottom: "2mm" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "7.5pt" }}>
              <thead>
                <tr style={{ background: "linear-gradient(to right, #f8fafc, #f1f5f9)" }}>
                  <th style={{ textAlign: "left", padding: "2mm 1.5mm", borderBottom: "1.5pt solid #0f172a", fontWeight: 700, fontSize: "6pt", textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569", width: "4mm" }}>#</th>
                  <th style={{ textAlign: "left", padding: "2mm 1.5mm", borderBottom: "1.5pt solid #0f172a", fontWeight: 700, fontSize: "6pt", textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569" }}>Description</th>
                  <th style={{ textAlign: "right", padding: "2mm 1.5mm", borderBottom: "1.5pt solid #0f172a", fontWeight: 700, fontSize: "6pt", textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569", width: "10mm" }}>Qty</th>
                  <th style={{ textAlign: "right", padding: "2mm 1.5mm", borderBottom: "1.5pt solid #0f172a", fontWeight: 700, fontSize: "6pt", textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569", width: "16mm" }}>Price</th>
                  <th style={{ textAlign: "right", padding: "2mm 0 2mm 1.5mm", borderBottom: "1.5pt solid #0f172a", fontWeight: 700, fontSize: "6pt", textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569", width: "16mm" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={item.id || index}>
                    <td style={{ padding: "1.5mm", borderBottom: "0.5pt solid #e2e8f0", color: "#94a3b8", fontFamily: "monospace", fontSize: "7pt" }}>{index + 1}</td>
                    <td style={{ padding: "1.5mm", borderBottom: "0.5pt solid #e2e8f0", verticalAlign: "top" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "7.5pt", lineHeight: 1.2 }}>{item.description || "—"}</div>
                      <div style={{ fontSize: "6pt", color: "#94a3b8", marginTop: "0.3mm" }}>
                        {[item.unit_of_measure_id, item.tax_code_id, item.revenue_category_id].filter(Boolean).join(" • ")}
                      </div>
                    </td>
                    <td style={{ padding: "1.5mm", borderBottom: "0.5pt solid #e2e8f0", textAlign: "right", fontFamily: "monospace", color: "#334155", fontSize: "7.5pt" }}>{item.quantity}</td>
                    <td style={{ padding: "1.5mm", borderBottom: "0.5pt solid #e2e8f0", textAlign: "right", fontFamily: "monospace", color: "#334155", fontSize: "7.5pt" }}>
                      {formatFinanceMoney(item.unitPrice || item.unit_price, currency)}
                    </td>
                    <td style={{ padding: "1.5mm 0 1.5mm 1.5mm", borderBottom: "0.5pt solid #e2e8f0", textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: "#0f172a", fontSize: "8pt" }}>
                      {formatFinanceMoney((item.lineTotal || (item.quantity * (item.unitPrice || item.unit_price))) - (item.discount || 0), currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Section: ALL Bank Details (3 columns) + Totals */}
          <div style={{
            display: "grid", gridTemplateColumns: "1.2fr 0.8fr 60mm", gap: "4mm",
            borderTop: "1.5pt solid #0f172a", paddingTop: "3mm", marginBottom: "2mm"
          }}>
            
            {/* Bank Details - All 7 Fields in Compact 2-Column Grid */}
            <div style={{ fontSize: "6.5pt", lineHeight: 1.3 }}>
              <div style={{
                fontSize: "6.5pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#0f172a",
                marginBottom: "2mm", display: "flex", alignItems: "center", gap: "1mm"
              }}>
                <span style={{ width: "1.5mm", height: "1.5mm", background: "linear-gradient(135deg, #10b981, #059669)", borderRadius: "50%" }}></span>
                Payment Instructions
              </div>
              
              {bankInfo ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5mm 3mm" }}>
                  {/* Row 1: Beneficiary | Bank Name */}
                  {bankInfo.beneficiary && (
                    <div>
                      <div style={{ color: "#64748b", fontSize: "5.5pt", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3mm" }}>Beneficiary</div>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "6.5pt" }}>{bankInfo.beneficiary}</div>
                    </div>
                  )}
                  {bankInfo.bank && (
                    <div>
                      <div style={{ color: "#64748b", fontSize: "5.5pt", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3mm" }}>Bank Name</div>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "6.5pt" }}>{bankInfo.bank}</div>
                    </div>
                  )}
                  
                  {/* Row 2: Bank Address (full width if exists) */}
                  {bankInfo.bankAddress && (
                    <div style={{ gridColumn: "span 2" }}>
                      <div style={{ color: "#64748b", fontSize: "5.5pt", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3mm" }}>Bank Address</div>
                      <div style={{ fontWeight: 500, color: "#334155", fontSize: "6.5pt", lineHeight: 1.3 }}>{bankInfo.bankAddress}</div>
                    </div>
                  )}
                  
                  {/* Row 3: Account Number | SWIFT */}
                  {bankInfo.accountNumber && (
                    <div>
                      <div style={{ color: "#64748b", fontSize: "5.5pt", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3mm" }}>Account Number</div>
                      <div style={{
                        fontFamily: "monospace", fontWeight: 600, color: "#0f172a", fontSize: "7pt",
                        background: "#f1f5f9", padding: "0.5mm 1mm", border: "0.5pt solid #d1d5db", borderRadius: "0.5mm",
                        letterSpacing: "0.02em"
                      }}>
                        {bankInfo.accountNumber}
                      </div>
                    </div>
                  )}
                  {bankInfo.swift && (
                    <div>
                      <div style={{ color: "#64748b", fontSize: "5.5pt", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3mm" }}>SWIFT Code</div>
                      <div style={{
                        fontFamily: "monospace", fontWeight: 600, color: "#0f172a", fontSize: "7pt",
                        background: "#f1f5f9", padding: "0.5mm 1mm", border: "0.5pt solid #d1d5db", borderRadius: "0.5mm",
                        letterSpacing: "0.05em"
                      }}>
                        {bankInfo.swift}
                      </div>
                    </div>
                  )}
                  
                  {/* Row 4: IBAN (full width) | Currency */}
                  {bankInfo.iban && (
                    <div style={{ gridColumn: "span 2" }}>
                      <div style={{ color: "#64748b", fontSize: "5.5pt", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3mm" }}>IBAN</div>
                      <div style={{
                        fontFamily: "monospace", fontWeight: 600, color: "#0f172a", fontSize: "7pt",
                        background: "#f1f5f9", padding: "0.5mm 1mm", border: "0.5pt solid #d1d5db", borderRadius: "0.5mm",
                        letterSpacing: "0.02em", display: "inline-block"
                      }}>
                        {bankInfo.iban}
                      </div>
                    </div>
                  )}
                  {bankInfo.currency && (
                    <div>
                      <div style={{ color: "#64748b", fontSize: "5.5pt", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3mm" }}>Currency</div>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "6.5pt" }}>{bankInfo.currency}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: "#64748b", fontSize: "6.5pt" }}>No bank details available</div>
              )}
            </div>

            {/* Notes Column */}
            <div style={{ fontSize: "6.5pt", lineHeight: 1.3 }}>
              {invoice?.notes && (
                <>
                  <div style={{ fontSize: "6.5pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", marginBottom: "1.5mm" }}>
                    Notes
                  </div>
                  <div style={{ color: "#475569", whiteSpace: "pre-wrap" }}>{invoice.notes}</div>
                </>
              )}
            </div>

            {/* Financial Summary - Premium Gradient Box */}
            <div>
              <div style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
                color: "#ffffff", padding: "3mm", borderRadius: "2mm",
                boxShadow: "0 2mm 4mm rgba(0,0,0,0.15)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1mm", fontSize: "6.5pt", opacity: 0.9 }}>
                  <span>Subtotal</span>
                  <span style={{ fontFamily: "monospace" }}>{formatFinanceMoney(financialSummary?.subtotal || 0, currency)}</span>
                </div>
                
                {(financialSummary?.discount || 0) > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1mm", fontSize: "6.5pt", opacity: 0.9 }}>
                    <span>Discount</span>
                    <span style={{ fontFamily: "monospace" }}>-{formatFinanceMoney(financialSummary.discount, currency)}</span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1mm", fontSize: "6.5pt", opacity: 0.9 }}>
                  <span>Tax</span>
                  <span style={{ fontFamily: "monospace" }}>{formatFinanceMoney(financialSummary?.tax || 0, currency)}</span>
                </div>

                {(financialSummary?.paid || 0) > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1mm", fontSize: "6.5pt", color: "#86efac" }}>
                    <span>Paid</span>
                    <span style={{ fontFamily: "monospace" }}>-{formatFinanceMoney(financialSummary.paid, currency)}</span>
                  </div>
                )}

                <div style={{ height: "0.5pt", background: "rgba(255,255,255,0.2)", margin: "1.5mm 0" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <div style={{ fontSize: "6pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.8 }}>Balance Due</div>
                    {invoice?.due_date && <div style={{ fontSize: "5.5pt", opacity: 0.6 }}>Due {formatFinanceDate(invoice.due_date)}</div>}
                  </div>
                  <span style={{ fontSize: "12pt", fontWeight: 700, fontFamily: "monospace", letterSpacing: "-0.02em" }}>
                    {formatFinanceMoney(financialSummary?.balance || financialSummary?.total || 0, currency)}
                  </span>
                </div>
              </div>

              {/* Payment History - Mini */}
              {payments && payments.length > 0 && (
                <div style={{ marginTop: "1.5mm", padding: "1.5mm", background: "#f8fafc", borderRadius: "1mm", border: "0.5pt solid #e2e8f0" }}>
                  <div style={{ fontSize: "5.5pt", textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: "1mm", fontWeight: 700 }}>
                    Payments ({payments.length})
                  </div>
                  {payments.slice(0, 2).map((payment) => (
                    <div key={payment.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "6pt", marginBottom: "0.3mm" }}>
                      <span style={{ color: "#059669" }}>✓ {formatFinanceDate(payment.payment_date)}</span>
                      <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{formatFinanceMoney(payment.amount, currency)}</span>
                    </div>
                  ))}
                  {payments.length > 2 && <div style={{ fontSize: "5.5pt", color: "#64748b" }}>+{payments.length - 2} more</div>}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: "auto", paddingTop: "2mm", borderTop: "0.5pt solid #e2e8f0",
            display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "6pt", color: "#94a3b8"
          }}>
            <div style={{ fontWeight: 600, color: "#0f172a" }}>Thank you for your business</div>
            <div style={{ fontFamily: "monospace" }}>{invoice?.invoice_number} • Page 1 of 1</div>
          </div>
        </div>
      </div>
    </>
  );
}
