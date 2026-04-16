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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'issued': return { bg: '#000000', color: '#ffffff', border: 'none' };
      case 'paid': return { bg: '#10b981', color: '#ffffff', border: 'none' };
      case 'draft': return { bg: 'transparent', color: '#6b7280', border: '1pt solid #6b7280' };
      case 'canceled': return { bg: '#ef4444', color: '#ffffff', border: 'none' };
      case 'void': return { bg: '#6b7280', color: '#ffffff', border: 'none' };
      default: return { bg: '#f3f4f6', color: '#374151', border: 'none' };
    }
  };

  const docStatus = getStatusStyle(invoice?.status);
  const payStatus = getStatusStyle(invoice?.payment_status);

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
          
          .invoice-tech-container,
          .invoice-tech-container * {
            visibility: visible !important;
          }
          
          .invoice-tech-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
        }
        
        @media screen {
          .invoice-tech-container {
            display: none !important;
          }
        }
      `}</style>

      <div className="invoice-tech-container">
        <div
          style={{
            width: "210mm",
            minHeight: "297mm",
            background: "#ffffff",
            color: "#111827",
            fontFamily: 'Inter, "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Tech Header - Asymmetric with geometric accent */}
          <div
            style={{
              background: "#000000",
              color: "#ffffff",
              padding: "20mm 20mm 32mm 20mm",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Subtle tech grid pattern overlay */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0.03,
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.1) 1pt, transparent 1pt),
                  linear-gradient(90deg, rgba(255,255,255,0.1) 1pt, transparent 1pt)
                `,
                backgroundSize: "10mm 10mm",
              }}
            />

            {/* Geometric curve at bottom */}
            <div
              style={{
                position: "absolute",
                bottom: "-1px",
                left: 0,
                right: 0,
                height: "16mm",
                background: "#ffffff",
                clipPath: "ellipse(70% 100% at 30% 100%)",
              }}
            />

            <div style={{ position: "relative", zIndex: 2 }}>
              {/* Top Row: Logo left, Status right */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "12mm",
                }}
              >
                {/* Logo */}
                <div style={{ display: "flex", alignItems: "center", gap: "3mm" }}>
                  <img
                    src="https://leoilrrnwlquunsbulok.supabase.co/storage/v1/object/public/Branding/aixia-logo.png"
                    alt="AiXia"
                    style={{
                      height: "10mm",
                      width: "auto",
                      objectFit: "contain",
                      filter: "brightness(0) invert(1)", // White logo
                    }}
                  />
                  <div
                    style={{
                      fontSize: "11pt",
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      opacity: 0.9,
                    }}
                  >
                    AiXia
                  </div>
                </div>

                {/* Status Pills */}
                <div style={{ display: "flex", gap: "2mm" }}>
                  <span
                    style={{
                      background: docStatus.bg,
                      color: docStatus.color,
                      border: docStatus.border,
                      padding: "1.5mm 3mm",
                      borderRadius: "4mm",
                      fontSize: "7pt",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {invoice?.status || "Draft"}
                  </span>
                  <span
                    style={{
                      background: payStatus.bg,
                      color: payStatus.color,
                      border: payStatus.border,
                      padding: "1.5mm 3mm",
                      borderRadius: "4mm",
                      fontSize: "7pt",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {invoice?.payment_status === 'paid' ? 'Paid' : 
                     invoice?.payment_status === 'partial' ? 'Partial' : 'Unpaid'}
                  </span>
                </div>
              </div>

              {/* Main Header Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 70mm",
                  gap: "15mm",
                  alignItems: "end",
                }}
              >
                {/* Left: From address */}
                <div>
                  <div
                    style={{
                      fontSize: "7pt",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      opacity: 0.5,
                      marginBottom: "2mm",
                      fontWeight: 500,
                    }}
                  >
                    From
                  </div>
                  <div
                    style={{
                      fontSize: "15pt",
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      marginBottom: "3mm",
                      lineHeight: 1.2,
                    }}
                  >
                    {invoice?.company_name_snapshot || "AiXia Technologies"}
                  </div>
                  <div
                    style={{
                      fontSize: "8.5pt",
                      lineHeight: 1.7,
                      opacity: 0.8,
                      maxWidth: "80mm",
                    }}
                  >
                    {invoice?.company_address_snapshot && (
                      <div>{invoice.company_address_snapshot}</div>
                    )}
                    <div style={{ marginTop: "2mm", display: "flex", gap: "3mm", flexWrap: "wrap" }}>
                      {invoice?.company_email_snapshot && (
                        <span>{invoice.company_email_snapshot}</span>
                      )}
                      {invoice?.company_phone_snapshot && (
                        <span>{invoice.company_phone_snapshot}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Invoice Details */}
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "32pt",
                      fontWeight: 200,
                      letterSpacing: "0.08em",
                      marginBottom: "6mm",
                      textTransform: "uppercase",
                      lineHeight: 1,
                    }}
                  >
                    Invoice
                  </div>
                  
                  <div
                    style={{
                      display: "grid",
                      gap: "1.5mm",
                      fontSize: "9pt",
                      textAlign: "right",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "3mm" }}>
                      <span style={{ opacity: 0.6 }}>Invoice No.</span>
                      <span style={{ fontFamily: "monospace", fontWeight: 600, letterSpacing: "0.05em" }}>
                        {invoice?.invoice_number || "—"}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "3mm" }}>
                      <span style={{ opacity: 0.6 }}>Issue Date</span>
                      <span style={{ fontWeight: 500 }}>
                        {formatFinanceDate(invoice?.issue_date)}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "3mm" }}>
                      <span style={{ opacity: 0.6 }}>Due Date</span>
                      <span style={{ 
                        fontWeight: 600,
                        color: invoice?.payment_status !== 'paid' && new Date(invoice?.due_date) < new Date() ? "#fca5a5" : "inherit"
                      }}>
                        {formatFinanceDate(invoice?.due_date)}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "3mm" }}>
                      <span style={{ opacity: 0.6 }}>Currency</span>
                      <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{currency}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div style={{ padding: "0 20mm 20mm 20mm", flex: 1, display: "flex", flexDirection: "column" }}>
            
            {/* Bill To & Project Info Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20mm",
                marginBottom: "10mm",
                paddingBottom: "8mm",
                borderBottom: "1pt solid #e5e7eb",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "7pt",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "#9ca3af",
                    marginBottom: "2mm",
                  }}
                >
                  Bill To
                </div>
                <div
                  style={{
                    fontSize: "14pt",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "2mm",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {invoice?.client_name_snapshot || "Client Name"}
                </div>
                <div
                  style={{
                    fontSize: "9pt",
                    lineHeight: 1.6,
                    color: "#4b5563",
                  }}
                >
                  <div>{invoice?.billing_address_snapshot || "—"}</div>
                  <div style={{ marginTop: "2mm" }}>
                    {invoice?.client_email_snapshot && (
                      <div>{invoice.client_email_snapshot}</div>
                    )}
                    {invoice?.client_phone_snapshot && (
                      <div style={{ marginTop: "0.5mm", color: "#6b7280" }}>{invoice.client_phone_snapshot}</div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    display: "inline-grid",
                    gap: "2mm 8mm",
                    gridTemplateColumns: "auto auto",
                    fontSize: "8.5pt",
                    textAlign: "left",
                  }}
                >
                  {project?.name && (
                    <>
                      <span style={{ color: "#9ca3af", fontWeight: 500 }}>Project</span>
                      <span style={{ fontWeight: 600, color: "#111827" }}>{project.name}</span>
                    </>
                  )}
                  {task?.title && (
                    <>
                      <span style={{ color: "#9ca3af", fontWeight: 500 }}>Task</span>
                      <span style={{ fontWeight: 600, color: "#111827" }}>{task.title}</span>
                    </>
                  )}
                  {invoice?.payment_terms_snapshot && (
                    <>
                      <span style={{ color: "#9ca3af", fontWeight: 500 }}>Payment Terms</span>
                      <span style={{ fontWeight: 500 }}>{invoice.payment_terms_snapshot}</span>
                    </>
                  )}
                  {invoice?.shipping_term_id && (
                    <>
                      <span style={{ color: "#9ca3af", fontWeight: 500 }}>Shipping</span>
                      <span style={{ fontWeight: 500 }}>{invoice.shipping_term_id}</span>
                    </>
                  )}
                  {invoice?.posted_to_ledger && (
                    <>
                      <span style={{ color: "#9ca3af", fontWeight: 500 }}>Posted to Ledger</span>
                      <span style={{ fontWeight: 500 }}>{formatFinanceDate(invoice.issued_at)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items - Tech Table */}
            <div style={{ marginBottom: "10mm", flex: 1 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "9pt",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "4mm 2mm 4mm 0",
                        borderBottom: "2pt solid #111827",
                        fontWeight: 600,
                        fontSize: "7.5pt",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#6b7280",
                        width: "6mm",
                      }}
                    >
                      #
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "4mm 2mm",
                        borderBottom: "2pt solid #111827",
                        fontWeight: 600,
                        fontSize: "7.5pt",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#6b7280",
                      }}
                    >
                      Item & Description
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "4mm 2mm",
                        borderBottom: "2pt solid #111827",
                        fontWeight: 600,
                        fontSize: "7.5pt",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#6b7280",
                        width: "18mm",
                      }}
                    >
                      Qty
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "4mm 2mm",
                        borderBottom: "2pt solid #111827",
                        fontWeight: 600,
                        fontSize: "7.5pt",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#6b7280",
                        width: "22mm",
                      }}
                    >
                      Unit Price
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "4mm 2mm",
                        borderBottom: "2pt solid #111827",
                        fontWeight: 600,
                        fontSize: "7.5pt",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#6b7280",
                        width: "18mm",
                      }}
                    >
                      Discount
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "4mm 0 4mm 2mm",
                        borderBottom: "2pt solid #111827",
                        fontWeight: 600,
                        fontSize: "7.5pt",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#6b7280",
                        width: "24mm",
                      }}
                    >
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr key={item.id || index} style={{ pageBreakInside: "avoid" }}>
                      <td
                        style={{
                          padding: "4mm 2mm 4mm 0",
                          borderBottom: "0.5pt solid #f3f4f6",
                          color: "#9ca3af",
                          verticalAlign: "top",
                          fontFamily: "monospace",
                          fontSize: "8pt",
                        }}
                      >
                        {index + 1}
                      </td>
                      <td
                        style={{
                          padding: "4mm 2mm",
                          borderBottom: "0.5pt solid #f3f4f6",
                          verticalAlign: "top",
                        }}
                      >
                        <div style={{ fontWeight: 600, color: "#111827", marginBottom: "0.5mm" }}>
                          {item.description || "—"}
                        </div>
                        <div
                          style={{
                            fontSize: "7.5pt",
                            color: "#9ca3af",
                            display: "flex",
                            gap: "2mm",
                            flexWrap: "wrap",
                          }}
                        >
                          {item.unit_of_measure_id && (
                            <span>UOM: {item.unit_of_measure_id}</span>
                          )}
                          {item.tax_code_id && item.unit_of_measure_id && (
                            <span>•</span>
                          )}
                          {item.tax_code_id && (
                            <span>Tax: {item.tax_code_id}</span>
                          )}
                          {item.revenue_category_id && (item.tax_code_id || item.unit_of_measure_id) && (
                            <span>•</span>
                          )}
                          {item.revenue_category_id && (
                            <span>Rev: {item.revenue_category_id}</span>
                          )}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "4mm 2mm",
                          borderBottom: "0.5pt solid #f3f4f6",
                          textAlign: "right",
                          verticalAlign: "top",
                          fontFamily: "monospace",
                          fontSize: "8.5pt",
                          color: "#374151",
                        }}
                      >
                        {item.quantity}
                      </td>
                      <td
                        style={{
                          padding: "4mm 2mm",
                          borderBottom: "0.5pt solid #f3f4f6",
                          textAlign: "right",
                          verticalAlign: "top",
                          fontFamily: "monospace",
                          fontSize: "8.5pt",
                          color: "#374151",
                        }}
                      >
                        {formatFinanceMoney(item.unitPrice || item.unit_price, currency)}
                      </td>
                      <td
                        style={{
                          padding: "4mm 2mm",
                          borderBottom: "0.5pt solid #f3f4f6",
                          textAlign: "right",
                          verticalAlign: "top",
                          fontFamily: "monospace",
                          fontSize: "8.5pt",
                          color: item.discount ? "#dc2626" : "#9ca3af",
                        }}
                      >
                        {item.discount ? formatFinanceMoney(item.discount, currency) : "—"}
                      </td>
                      <td
                        style={{
                          padding: "4mm 0 4mm 2mm",
                          borderBottom: "0.5pt solid #f3f4f6",
                          textAlign: "right",
                          verticalAlign: "top",
                          fontWeight: 600,
                          fontFamily: "monospace",
                          fontSize: "9pt",
                          color: "#111827",
                        }}
                      >
                        {formatFinanceMoney(item.lineTotal || (item.quantity * (item.unitPrice || item.unit_price) - (item.discount || 0)), currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Section: Bank Details & Summary */}
            <div style={{ marginTop: "auto" }}>
              
              {/* Payment Info Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 75mm",
                  gap: "15mm",
                  marginBottom: "8mm",
                  paddingTop: "6mm",
                  borderTop: "1pt solid #e5e7eb",
                }}
              >
                {/* Left: Bank Details & Notes */}
                <div>
                  {/* Bank Transfer Details - Tech Style */}
                  {bankInfo && (
                    <div style={{ marginBottom: "8mm" }}>
                      <div
                        style={{
                          fontSize: "7.5pt",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color: "#111827",
                          marginBottom: "3mm",
                          display: "flex",
                          alignItems: "center",
                          gap: "2mm",
                        }}
                      >
                        <span style={{ width: "2mm", height: "2mm", background: "#10b981", borderRadius: "50%" }}></span>
                        Bank Transfer Details
                      </div>
                      
                      <div
                        style={{
                          background: "#f9fafb",
                          border: "1pt solid #e5e7eb",
                          borderRadius: "2mm",
                          padding: "4mm",
                          fontSize: "8.5pt",
                        }}
                      >
                        <div style={{ display: "grid", gap: "2.5mm" }}>
                          {bankInfo.beneficiary && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5mm" }}>
                              <span style={{ fontSize: "7pt", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Beneficiary</span>
                              <span style={{ fontWeight: 600, color: "#111827" }}>{bankInfo.beneficiary}</span>
                            </div>
                          )}
                          
                                                   <div style={{ display: "grid", gap: "3mm" }}>
                            {bankInfo.bank && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.5mm" }}>
                                <span style={{ fontSize: "7pt", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Beneficiary Bank Name
                                </span>
                                <span style={{ fontWeight: 500, color: "#374151" }}>
                                  {bankInfo.bank}
                                </span>
                              </div>
                            )}

                            {bankInfo.bankAddress && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.5mm" }}>
                                <span style={{ fontSize: "7pt", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Beneficiary Bank Address
                                </span>
                                <span style={{ fontWeight: 500, color: "#374151", lineHeight: 1.5 }}>
                                  {bankInfo.bankAddress}
                                </span>
                              </div>
                            )}

                            {bankInfo.accountNumber && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.5mm" }}>
                                <span style={{ fontSize: "7pt", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Bank Account
                                </span>
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    fontWeight: 600,
                                    fontSize: "8pt",
                                    color: "#111827",
                                    letterSpacing: "0.03em",
                                    background: "#ffffff",
                                    padding: "1mm 2mm",
                                    border: "1pt solid #d1d5db",
                                    borderRadius: "1mm",
                                  }}
                                >
                                  {bankInfo.accountNumber}
                                </span>
                              </div>
                            )}

                            {bankInfo.swift && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.5mm" }}>
                                <span style={{ fontSize: "7pt", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  SWIFT Code
                                </span>
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    fontWeight: 600,
                                    fontSize: "8pt",
                                    color: "#111827",
                                    letterSpacing: "0.05em",
                                    background: "#ffffff",
                                    padding: "1mm 2mm",
                                    border: "1pt solid #d1d5db",
                                    borderRadius: "1mm",
                                  }}
                                >
                                  {bankInfo.swift}
                                </span>
                              </div>
                            )}

                            {bankInfo.iban && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.5mm" }}>
                                <span style={{ fontSize: "7pt", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  IBAN
                                </span>
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    fontWeight: 600,
                                    fontSize: "8pt",
                                    color: "#111827",
                                    letterSpacing: "0.02em",
                                    background: "#ffffff",
                                    padding: "1mm 2mm",
                                    border: "1pt solid #d1d5db",
                                    borderRadius: "1mm",
                                  }}
                                >
                                  {bankInfo.iban}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {currency && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5mm", marginTop: "1mm" }}>
                              <span style={{ fontSize: "7pt", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Currency</span>
                              <span style={{ fontWeight: 600, color: "#111827" }}>{currency}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {invoice?.notes && (
                    <div>
                      <div
                        style={{
                          fontSize: "7.5pt",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color: "#6b7280",
                          marginBottom: "2mm",
                        }}
                      >
                        Notes
                      </div>
                      <div
                        style={{
                          fontSize: "8.5pt",
                          color: "#4b5563",
                          lineHeight: 1.6,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {invoice.notes}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Financial Summary */}
                <div>
                  <div
                    style={{
                      background: "#f9fafb",
                      borderRadius: "3mm",
                      padding: "5mm",
                      border: "1pt solid #e5e7eb",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "2.5mm",
                        fontSize: "9pt",
                        color: "#6b7280",
                      }}
                    >
                      <span>Subtotal</span>
                      <span style={{ fontFamily: "monospace", fontWeight: 500, color: "#374151" }}>
                        {formatFinanceMoney(financialSummary?.subtotal || 0, currency)}
                      </span>
                    </div>

                    {(financialSummary?.discount || 0) > 0 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "2.5mm",
                          fontSize: "9pt",
                          color: "#dc2626",
                        }}
                      >
                        <span>Discount</span>
                        <span style={{ fontFamily: "monospace", fontWeight: 500 }}>
                          -{formatFinanceMoney(financialSummary.discount, currency)}
                        </span>
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "2.5mm",
                        fontSize: "9pt",
                        color: "#6b7280",
                      }}
                    >
                      <span>Tax</span>
                      <span style={{ fontFamily: "monospace", fontWeight: 500, color: "#374151" }}>
                        {formatFinanceMoney(financialSummary?.tax || 0, currency)}
                      </span>
                    </div>

                    <div
                      style={{
                        height: "1pt",
                        background: "#d1d5db",
                        margin: "3mm 0",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "3mm",
                        fontSize: "12pt",
                        fontWeight: 700,
                        color: "#111827",
                      }}
                    >
                      <span>Total</span>
                      <span style={{ fontFamily: "monospace" }}>
                        {formatFinanceMoney(financialSummary?.total || 0, currency)}
                      </span>
                    </div>

                    {(financialSummary?.paid || 0) > 0 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "2.5mm",
                          fontSize: "9pt",
                          color: "#10b981",
                          padding: "1.5mm 0",
                        }}
                      >
                        <span>Paid to Date</span>
                        <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                          -{formatFinanceMoney(financialSummary.paid, currency)}
                        </span>
                      </div>
                    )}

                    {/* Balance Due - Tech Accent */}
                    <div
                      style={{
                        background: "#000000",
                        color: "#ffffff",
                        padding: "3.5mm 4mm",
                        borderRadius: "2mm",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "2mm",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "7.5pt",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            opacity: 0.8,
                            marginBottom: "0.5mm",
                          }}
                        >
                          Balance Due
                        </div>
                        {invoice?.due_date && (
                          <div style={{ fontSize: "7pt", opacity: 0.6 }}>
                            Due {formatFinanceDate(invoice.due_date)}
                          </div>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: "14pt",
                          fontWeight: 700,
                          fontFamily: "monospace",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {formatFinanceMoney(financialSummary?.balance || financialSummary?.total || 0, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              {payments && payments.length > 0 && (
                <div style={{ marginBottom: "8mm" }}>
                  <div
                    style={{
                      fontSize: "7.5pt",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "#6b7280",
                      marginBottom: "3mm",
                      paddingBottom: "2mm",
                      borderBottom: "1pt solid #e5e7eb",
                    }}
                  >
                    Payment History
                  </div>
                  <div style={{ display: "grid", gap: "1.5mm" }}>
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "2.5mm 0",
                          fontSize: "9pt",
                          borderBottom: "0.5pt solid #f3f4f6",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "3mm" }}>
                          <div
                            style={{
                              width: "2mm",
                              height: "2mm",
                              background: "#10b981",
                              borderRadius: "50%",
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, color: "#111827" }}>
                              {payment.reference_number || "Payment Received"}
                            </div>
                            <div style={{ fontSize: "7.5pt", color: "#9ca3af", marginTop: "0.5mm" }}>
                              {formatFinanceDate(payment.payment_date)}
                            </div>
                          </div>
                        </div>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: "#10b981",
                            fontSize: "9.5pt",
                          }}
                        >
                          {formatFinanceMoney(payment.amount, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div
                style={{
                  paddingTop: "6mm",
                  borderTop: "1pt solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "8pt",
                  color: "#9ca3af",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "#111827", marginBottom: "1mm", fontSize: "9pt" }}>
                    Thank you for your business
                  </div>
                  <div style={{ fontSize: "7.5pt", maxWidth: "100mm" }}>
                    {invoice?.metadata?.preferred_payment_method_id ? (
                      <span>Preferred payment method: {invoice.metadata.preferred_payment_method_id}</span>
                    ) : (
                      <span>Questions? Contact us at {invoice?.company_email_snapshot || "support@aixia.tech"}</span>
                    )}
                  </div>
                </div>
                
                <div style={{ textAlign: "right", fontSize: "7.5pt" }}>
                  <div style={{ fontFamily: "monospace", opacity: 0.7 }}>
                    {invoice?.invoice_number}
                  </div>
                  <div style={{ marginTop: "1mm" }}>
                    Page 1 of 1
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
