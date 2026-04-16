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
          @page { size: A4; margin: 0; }
          html, body { background: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          .invoice-ref-container, .invoice-ref-container * { visibility: visible !important; }
          .invoice-ref-container {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 210mm !important; height: 297mm !important; background: #ffffff !important;
            margin: 0 !important; padding: 0 !important; overflow: hidden !important;
          }
        }
        @media screen { .invoice-ref-container { display: none !important; } }
      `}</style>

      <div className="invoice-ref-container">
        <div style={{
          width: "210mm", height: "297mm", background: "#ffffff", color: "#1f2937",
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          position: "relative", overflow: "hidden",
        }}>
          {/* Header Background with Curve - Exactly like reference */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "85mm",
            background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
            clipPath: "ellipse(120% 100% at 50% 0%)",
            zIndex: 0,
          }} />

          {/* Header Content */}
          <div style={{ position: "relative", zIndex: 1, padding: "8mm 15mm 0 15mm", color: "#ffffff" }}>
            
            {/* Top Row: Logo Left, Title Right */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6mm" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "3mm" }}>
                <img
                  src="https://leoilrrnwlquunsbulok.supabase.co/storage/v1/object/public/Branding/aixia-logo.png"
                  alt="AiXia"
                  style={{ height: "8mm", width: "auto", filter: "brightness(0) invert(1)" }}
                />
                <span style={{ fontSize: "12pt", fontWeight: 700, letterSpacing: "0.05em" }}>AiXia</span>
              </div>
              
              <div style={{ 
                fontSize: "28pt", fontWeight: 300, letterSpacing: "0.1em", 
                textTransform: "uppercase", marginTop: "2mm"
              }}>
                Invoice
              </div>
            </div>

            {/* Header Info Grid - Company Left, Invoice Meta Right */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8mm" }}>
              {/* Company Info */}
              <div style={{ maxWidth: "70mm" }}>
                <div style={{ fontSize: "7.5pt", lineHeight: 1.6, opacity: 0.9 }}>
                  <div style={{ fontWeight: 600, fontSize: "9pt", marginBottom: "1mm" }}>
                    {invoice?.company_name_snapshot || "AiXia Technologies"}
                  </div>
                  <div>{invoice?.company_address_snapshot || ""}</div>
                  <div style={{ marginTop: "1mm" }}>
                    {invoice?.company_phone_snapshot && <div>📞 {invoice.company_phone_snapshot}</div>}
                    {invoice?.company_email_snapshot && <div>✉ {invoice.company_email_snapshot}</div>}
                  </div>
                </div>
              </div>

              {/* Invoice Meta - Right aligned */}
              <div style={{ textAlign: "right", fontSize: "8.5pt", lineHeight: 1.8 }}>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "3mm" }}>
                  <span style={{ opacity: 0.7 }}>Invoice No :</span>
                  <span style={{ fontWeight: 600 }}>{invoice?.invoice_number || "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "3mm" }}>
                  <span style={{ opacity: 0.7 }}>Issue Date :</span>
                  <span>{formatFinanceDate(invoice?.issue_date)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "3mm" }}>
                  <span style={{ opacity: 0.7 }}>Due Date :</span>
                  <span style={{ color: new Date(invoice?.due_date) < new Date() && invoice?.payment_status !== 'paid' ? "#fca5a5" : "inherit" }}>
                    {formatFinanceDate(invoice?.due_date)}
                  </span>
                </div>
                {invoice?.posted_to_ledger && (
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "3mm", fontSize: "7.5pt", opacity: 0.8, marginTop: "1mm" }}>
                    <span>Posted to Ledger</span>
                    <span>{formatFinanceDate(invoice?.issued_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Badges Below Header */}
            <div style={{ display: "flex", gap: "2mm", marginBottom: "4mm" }}>
              <span style={{
                background: invoice?.status === 'draft' ? 'rgba(255,255,255,0.2)' : invoice?.status === 'paid' ? '#10b981' : 'rgba(255,255,255,0.9)',
                color: invoice?.status === 'draft' || invoice?.status === 'paid' ? '#ffffff' : '#1f2937',
                padding: "1mm 2.5mm", borderRadius: "1mm", fontSize: "7pt", fontWeight: 700, textTransform: "uppercase"
              }}>
                {invoice?.status}
              </span>
              <span style={{
                background: invoice?.payment_status === 'paid' ? '#10b981' : invoice?.payment_status === 'partial' ? '#f59e0b' : 'rgba(239,68,68,0.9)',
                color: '#ffffff', padding: "1mm 2.5mm", borderRadius: "1mm", fontSize: "7pt", fontWeight: 700, textTransform: "uppercase"
              }}>
                {invoice?.payment_status}
              </span>
            </div>
          </div>

          {/* Bill To Section - Below curve */}
          <div style={{ padding: "0 15mm", marginTop: "2mm", marginBottom: "4mm" }}>
            <div style={{ 
              background: "#f9fafb", padding: "4mm 5mm", borderRadius: "2mm", 
              border: "0.5pt solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div>
                <div style={{ fontSize: "7pt", textTransform: "uppercase", letterSpacing: "0.1em", color: "#6b7280", marginBottom: "1mm", fontWeight: 700 }}>
                  Bill To
                </div>
                <div style={{ fontWeight: 700, fontSize: "11pt", color: "#111827", marginBottom: "1mm" }}>
                  {invoice?.client_name_snapshot || "Client Name"}
                </div>
                <div style={{ fontSize: "8pt", color: "#4b5563", lineHeight: 1.5 }}>
                  {invoice?.billing_address_snapshot || ""}
                </div>
                <div style={{ fontSize: "8pt", color: "#6b7280", marginTop: "1mm" }}>
                  {invoice?.client_email_snapshot} {invoice?.client_phone_snapshot && `• ${invoice.client_phone_snapshot}`}
                </div>
              </div>
              
              {/* Project/Task Context */}
              {(project?.name || task?.title || invoice?.payment_terms_snapshot) && (
                <div style={{ textAlign: "right", fontSize: "8pt" }}>
                  {project?.name && (
                    <div style={{ marginBottom: "1mm" }}>
                      <span style={{ color: "#9ca3af" }}>Project: </span>
                      <span style={{ fontWeight: 600 }}>{project.name}</span>
                    </div>
                  )}
                  {task?.title && (
                    <div style={{ marginBottom: "1mm" }}>
                      <span style={{ color: "#9ca3af" }}>Task: </span>
                      <span style={{ fontWeight: 600 }}>{task.title}</span>
                    </div>
                  )}
                  {invoice?.payment_terms_snapshot && (
                    <div>
                      <span style={{ color: "#9ca3af" }}>Terms: </span>
                      <span>{invoice.payment_terms_snapshot}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table - Dark header like reference */}
          <div style={{ padding: "0 15mm", marginBottom: "4mm" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.5pt" }}>
              <thead>
                <tr style={{ background: "#1f2937", color: "#ffffff" }}>
                  <th style={{ textAlign: "center", padding: "3mm 2mm", fontWeight: 600, fontSize: "7.5pt", width: "8mm" }}>No</th>
                  <th style={{ textAlign: "left", padding: "3mm 2mm", fontWeight: 600, fontSize: "7.5pt" }}>Item Description</th>
                  <th style={{ textAlign: "right", padding: "3mm 2mm", fontWeight: 600, fontSize: "7.5pt", width: "20mm" }}>Unit Price</th>
                  <th style={{ textAlign: "right", padding: "3mm 2mm", fontWeight: 600, fontSize: "7.5pt", width: "15mm" }}>Qty</th>
                  <th style={{ textAlign: "right", padding: "3mm 2mm", fontWeight: 600, fontSize: "7.5pt", width: "20mm" }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={item.id || index} style={{ borderBottom: "0.5pt solid #e5e7eb" }}>
                    <td style={{ padding: "2.5mm 2mm", textAlign: "center", color: "#6b7280", fontSize: "8pt" }}>{index + 1}</td>
                    <td style={{ padding: "2.5mm 2mm", verticalAlign: "top" }}>
                      <div style={{ fontWeight: 500, color: "#111827" }}>{item.description || "—"}</div>
                      {(item.unit_of_measure_id || item.tax_code_id || item.revenue_category_id) && (
                        <div style={{ fontSize: "6.5pt", color: "#9ca3af", marginTop: "0.5mm" }}>
                          {[item.unit_of_measure_id, item.tax_code_id, item.revenue_category_id].filter(Boolean).join(" • ")}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "2.5mm 2mm", textAlign: "right", fontFamily: "monospace", color: "#374151" }}>
                      {formatFinanceMoney(item.unitPrice || item.unit_price, currency)}
                    </td>
                    <td style={{ padding: "2.5mm 2mm", textAlign: "right", fontFamily: "monospace", color: "#374151" }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: "2.5mm 2mm", textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: "#111827" }}>
                      {formatFinanceMoney((item.lineTotal || (item.quantity * (item.unitPrice || item.unit_price))) - (item.discount || 0)), currency)}
                    </td>
                  </tr>
                ))}
                {/* Empty rows to maintain table height if less than 10 items */}
                {lineItems.length < 10 && Array(10 - lineItems.length).fill(0).map((_, i) => (
                  <tr key={`empty-${i}`} style={{ borderBottom: "0.5pt solid #e5e7eb", height: "8mm" }}>
                    <td style={{ padding: "2.5mm 2mm" }}>&nbsp;</td>
                    <td style={{ padding: "2.5mm 2mm" }}>&nbsp;</td>
                    <td style={{ padding: "2.5mm 2mm" }}>&nbsp;</td>
                    <td style={{ padding: "2.5mm 2mm" }}>&nbsp;</td>
                    <td style={{ padding: "2.5mm 2mm" }}>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Section - Bank Left, Totals Right */}
          <div style={{ padding: "0 15mm", display: "flex", gap: "10mm", marginBottom: "4mm" }}>
            
            {/* Left: ALL Bank Details + Payment Method */}
            <div style={{ flex: 1, fontSize: "7.5pt", lineHeight: 1.4 }}>
              <div style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#111827", marginBottom: "2mm", fontSize: "8pt" }}>
                Bank Transfer Details
              </div>
              
              {bankInfo ? (
                <div style={{ display: "grid", gap: "1.5mm" }}>
                  {/* Beneficiary */}
                  {bankInfo.beneficiary && (
                    <div>
                      <span style={{ color: "#6b7280" }}>Beneficiary: </span>
                      <span style={{ fontWeight: 600 }}>{bankInfo.beneficiary}</span>
                    </div>
                  )}
                  
                  {/* Bank Name */}
                  {bankInfo.bank && (
                    <div>
                      <span style={{ color: "#6b7280" }}>Bank Name: </span>
                      <span style={{ fontWeight: 500 }}>{bankInfo.bank}</span>
                    </div>
                  )}
                  
                  {/* Bank Address */}
                  {bankInfo.bankAddress && (
                    <div>
                      <span style={{ color: "#6b7280" }}>Bank Address: </span>
                      <span style={{ fontWeight: 500 }}>{bankInfo.bankAddress}</span>
                    </div>
                  )}
                  
                  {/* Account & SWIFT in one row if both exist */}
                  <div style={{ display: "flex", gap: "4mm", flexWrap: "wrap" }}>
                    {bankInfo.accountNumber && (
                      <div>
                        <span style={{ color: "#6b7280" }}>Account: </span>
                        <span style={{ fontFamily: "monospace", fontWeight: 600, background: "#f3f4f6", padding: "0.5mm 1mm", borderRadius: "0.5mm" }}>
                          {bankInfo.accountNumber}
                        </span>
                      </div>
                    )}
                    {bankInfo.swift && (
                      <div>
                        <span style={{ color: "#6b7280" }}>SWIFT: </span>
                        <span style={{ fontFamily: "monospace", fontWeight: 600, background: "#f3f4f6", padding: "0.5mm 1mm", borderRadius: "0.5mm" }}>
                          {bankInfo.swift}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* IBAN */}
                  {bankInfo.iban && (
                    <div>
                      <span style={{ color: "#6b7280" }}>IBAN: </span>
                      <span style={{ fontFamily: "monospace", fontWeight: 600, background: "#f3f4f6", padding: "0.5mm 1mm", borderRadius: "0.5mm" }}>
                        {bankInfo.iban}
                      </span>
                    </div>
                  )}
                  
                  {/* Currency */}
                  {bankInfo.currency && (
                    <div>
                      <span style={{ color: "#6b7280" }}>Currency: </span>
                      <span style={{ fontWeight: 600 }}>{bankInfo.currency}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: "#6b7280" }}>No bank details available</div>
              )}

              {/* Payment Method */}
              {invoice?.metadata?.preferred_payment_method_id && (
                <div style={{ marginTop: "3mm", paddingTop: "2mm", borderTop: "0.5pt solid #e5e7eb" }}>
                  <span style={{ color: "#6b7280" }}>Preferred Method: </span>
                  <span style={{ fontWeight: 500 }}>{invoice.metadata.preferred_payment_method_id}</span>
                </div>
              )}

              {/* Shipping Terms */}
              {invoice?.shipping_term_id && (
                <div style={{ marginTop: "1.5mm" }}>
                  <span style={{ color: "#6b7280" }}>Shipping: </span>
                  <span style={{ fontWeight: 500 }}>{invoice.shipping_term_id}</span>
                </div>
              )}

              {/* Notes */}
              {invoice?.notes && (
                <div style={{ marginTop: "3mm", paddingTop: "2mm", borderTop: "0.5pt solid #e5e7eb" }}>
                  <div style={{ fontWeight: 600, color: "#111827", marginBottom: "1mm" }}>Notes:</div>
                  <div style={{ color: "#4b5563", whiteSpace: "pre-wrap", fontSize: "7pt" }}>{invoice.notes}</div>
                </div>
              )}
            </div>

            {/* Right: Totals - Like reference image */}
            <div style={{ width: "65mm" }}>
              <div style={{ marginBottom: "2mm" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5mm", fontSize: "8.5pt", color: "#4b5563" }}>
                  <span>SUB TOTAL</span>
                  <span style={{ fontFamily: "monospace" }}>{formatFinanceMoney(financialSummary?.subtotal || 0, currency)}</span>
                </div>
                {(financialSummary?.discount || 0) > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5mm", fontSize: "8.5pt", color: "#ef4444" }}>
                    <span>DISCOUNT</span>
                    <span style={{ fontFamily: "monospace" }}>-{formatFinanceMoney(financialSummary.discount, currency)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5mm", fontSize: "8.5pt", color: "#4b5563" }}>
                  <span>TAX / VAT</span>
                  <span style={{ fontFamily: "monospace" }}>{formatFinanceMoney(financialSummary?.tax || 0, currency)}</span>
                </div>
                
                {/* Grand Total - Dark bar like reference */}
                <div style={{ 
                  background: "#1f2937", color: "#ffffff", 
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "2.5mm 3mm", marginTop: "2mm"
                }}>
                  <span style={{ fontSize: "9pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Grand Total</span>
                  <span style={{ fontFamily: "monospace", fontSize: "11pt", fontWeight: 700 }}>
                    {formatFinanceMoney(financialSummary?.total || 0, currency)}
                  </span>
                </div>

                {/* Balance Due if different from total */}
                {(financialSummary?.paid || 0) > 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5mm", fontSize: "8pt", color: "#10b981" }}>
                      <span>PAID TO DATE</span>
                      <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{formatFinanceMoney(financialSummary.paid, currency)}</span>
                    </div>
                    <div style={{ 
                      display: "flex", justifyContent: "space-between", marginTop: "1.5mm",
                      padding: "2mm 3mm", background: "#fee2e2", border: "0.5pt solid #fca5a5", borderRadius: "1mm"
                    }}>
                      <span style={{ fontSize: "8pt", fontWeight: 700, color: "#991b1b", textTransform: "uppercase" }}>Balance Due</span>
                      <span style={{ fontFamily: "monospace", fontSize: "10pt", fontWeight: 700, color: "#991b1b" }}>
                        {formatFinanceMoney(financialSummary?.balance || 0, currency)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Signature Line - Like reference */}
              <div style={{ marginTop: "4mm", textAlign: "center" }}>
                <div style={{ borderBottom: "0.5pt dashed #9ca3af", marginBottom: "1mm", height: "8mm" }}></div>
                <div style={{ fontSize: "7pt", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Authorized Signature</div>
              </div>
            </div>
          </div>

          {/* Payment History - Compact row if exists */}
          {payments && payments.length > 0 && (
            <div style={{ padding: "0 15mm", marginBottom: "4mm" }}>
              <div style={{ 
                background: "#f0fdf4", border: "0.5pt solid #86efac", borderRadius: "1.5mm",
                padding: "2mm 3mm", fontSize: "7.5pt", display: "flex", alignItems: "center", gap: "2mm", flexWrap: "wrap"
              }}>
                <span style={{ fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>Payment History:</span>
                {payments.map((payment, idx) => (
                  <span key={payment.id} style={{ color: "#374151" }}>
                    ✓ {formatFinanceMoney(payment.amount, currency)} on {formatFinanceDate(payment.payment_date)}
                    {payment.reference_number && ` (Ref: ${payment.reference_number})`}
                    {idx < payments.length - 1 && " • "}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ 
            position: "absolute", bottom: "8mm", left: "15mm", right: "15mm",
            textAlign: "center", fontSize: "9pt", fontWeight: 700, 
            color: "#111827", textTransform: "uppercase", letterSpacing: "0.1em"
          }}>
            Thank You For Your Business
          </div>
        </div>
      </div>
    </>
  );
}
