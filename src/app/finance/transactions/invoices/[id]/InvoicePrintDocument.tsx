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
  
  // Helper to get status color classes for print (grayscale for professional look)
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'issued': return { bg: '#0f0f0f', color: '#ffffff' };
      case 'paid': return { bg: '#1a1a1a', color: '#ffffff' };
      case 'draft': return { bg: '#e5e5e5', color: '#1a1a1a' };
      case 'canceled': return { bg: '#d4d4d4', color: '#404040' };
      case 'void': return { bg: '#737373', color: '#ffffff' };
      default: return { bg: '#f5f5f5', color: '#404040' };
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
          
          .invoice-print-container,
          .invoice-print-container * {
            visibility: visible !important;
          }
          
          .invoice-print-container {
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
          .invoice-print-container {
            display: none !important;
          }
        }
      `}</style>

      <div className="invoice-print-container">
        <div
          style={{
            width: "210mm",
            minHeight: "297mm",
            background: "#ffffff",
            color: "#0f0f0f",
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Header Section with Curved Bottom */}
          <div
            style={{
              background: "#0a0a0a",
              color: "#ffffff",
              padding: "18mm 20mm 28mm 20mm",
              position: "relative",
            }}
          >
            {/* Decorative curved separator at bottom */}
            <div
              style={{
                position: "absolute",
                bottom: "-1px",
                left: 0,
                right: 0,
                height: "12mm",
                background: "#ffffff",
                clipPath: "ellipse(60% 100% at 50% 100%)",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "10mm",
              }}
            >
              {/* Left: Company Identity */}
              <div style={{ maxWidth: "85mm" }}>
                <div
                  style={{
                    fontSize: "9pt",
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    marginBottom: "2mm",
                    opacity: 0.6,
                  }}
                >
                  From
                </div>
                
                <div
                  style={{
                    fontSize: "16pt",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    marginBottom: "4mm",
                    lineHeight: 1.2,
                  }}
                >
                  {invoice?.company_name_snapshot || "Company Name"}
                </div>

                <div
                  style={{
                    fontSize: "8.5pt",
                    lineHeight: 1.6,
                    opacity: 0.85,
                    maxWidth: "70mm",
                  }}
                >
                  {invoice?.company_address_snapshot && (
                    <div style={{ marginBottom: "1mm" }}>{invoice.company_address_snapshot}</div>
                  )}
                  <div style={{ marginTop: "2mm" }}>
                    {invoice?.company_email_snapshot && (
                      <span>{invoice.company_email_snapshot}</span>
                    )}
                    {invoice?.company_email_snapshot && invoice?.company_phone_snapshot && (
                      <span style={{ margin: "0 2mm" }}>•</span>
                    )}
                    {invoice?.company_phone_snapshot && (
                      <span>{invoice.company_phone_snapshot}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Invoice Title & Meta */}
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: "28pt",
                    fontWeight: 200,
                    letterSpacing: "0.15em",
                    marginBottom: "6mm",
                    textTransform: "uppercase",
                  }}
                >
                  Invoice
                </div>

                {/* Status Badges */}
                <div
                  style={{
                    display: "flex",
                    gap: "2mm",
                    justifyContent: "flex-end",
                    marginBottom: "4mm",
                  }}
                >
                  <span
                    style={{
                      background: docStatus.bg,
                      color: docStatus.color,
                      padding: "1.5mm 3mm",
                      borderRadius: "2mm",
                      fontSize: "7.5pt",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {invoice?.status || "Draft"}
                  </span>
                  <span
                    style={{
                      background: payStatus.bg,
                      color: payStatus.color,
                      padding: "1.5mm 3mm",
                      borderRadius: "2mm",
                      fontSize: "7.5pt",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {invoice?.payment_status === 'paid' ? 'Paid' : 
                     invoice?.payment_status === 'partial' ? 'Partial' : 'Unpaid'}
                  </span>
                  {invoice?.posted_to_ledger && (
                    <span
                      style={{
                        background: "#f0f0f0",
                        color: "#0a0a0a",
                        padding: "1.5mm 3mm",
                        borderRadius: "2mm",
                        fontSize: "7.5pt",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Posted
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: "9pt",
                    lineHeight: 1.8,
                    opacity: 0.9,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "2mm" }}>
                    <span style={{ opacity: 0.6 }}>Invoice No.</span>
                    <span style={{ fontWeight: 600, fontFamily: "monospace", letterSpacing: "0.05em" }}>
                      {invoice?.invoice_number || "—"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "2mm" }}>
                    <span style={{ opacity: 0.6 }}>Issue Date</span>
                    <span style={{ fontWeight: 500 }}>
                      {formatFinanceDate(invoice?.issue_date)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "2mm" }}>
                    <span style={{ opacity: 0.6 }}>Due Date</span>
                    <span style={{ 
                      fontWeight: 600,
                      color: invoice?.payment_status !== 'paid' && new Date(invoice?.due_date) < new Date() ? "#dc2626" : "inherit"
                    }}>
                      {formatFinanceDate(invoice?.due_date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Body */}
          <div style={{ padding: "8mm 20mm 20mm 20mm" }}>
            
            {/* Bill To Section */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15mm",
                marginBottom: "10mm",
                paddingBottom: "8mm",
                borderBottom: "0.5pt solid #e5e5e5",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "7.5pt",
                    fontWeight: 600,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "#737373",
                    marginBottom: "2mm",
                  }}
                >
                  Bill To
                </div>
                <div
                  style={{
                    fontSize: "13pt",
                    fontWeight: 600,
                    color: "#0a0a0a",
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
                    color: "#525252",
                  }}
                >
                  <div>{invoice?.billing_address_snapshot || "—"}</div>
                  <div style={{ marginTop: "2mm" }}>
                    {invoice?.client_email_snapshot && (
                      <div>{invoice.client_email_snapshot}</div>
                    )}
                    {invoice?.client_phone_snapshot && (
                      <div style={{ marginTop: "0.5mm" }}>{invoice.client_phone_snapshot}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Context Information */}
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    display: "inline-grid",
                    gap: "2mm 6mm",
                    gridTemplateColumns: "auto auto",
                    fontSize: "8.5pt",
                    textAlign: "left",
                  }}
                >
                  {project?.name && (
                    <>
                      <span style={{ color: "#737373" }}>Project</span>
                      <span style={{ fontWeight: 500, color: "#0a0a0a" }}>{project.name}</span>
                    </>
                  )}
                  {task?.title && (
                    <>
                      <span style={{ color: "#737373" }}>Task</span>
                      <span style={{ fontWeight: 500, color: "#0a0a0a" }}>{task.title}</span>
                    </>
                  )}
                  <span style={{ color: "#737373" }}>Currency</span>
                  <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{currency}</span>
                  {invoice?.payment_terms_snapshot && (
                    <>
                      <span style={{ color: "#737373" }}>Terms</span>
                      <span style={{ fontWeight: 500 }}>{invoice.payment_terms_snapshot}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div style={{ marginBottom: "10mm" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "8.5pt",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "3mm 2mm",
                        borderBottom: "1.5pt solid #0a0a0a",
                        fontWeight: 600,
                        fontSize: "7.5pt",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#525252",
                        width: "8mm",
                      }}
                    >
                      #
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "3mm 2mm",
                        borderBottom: "1.5pt solid #0a0a0a",
                        fontWeight: 600,
                        fontSize: "7.5pt",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#525252",
                      }}
                    >
                      Description
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "3mm 2mm",
                        borderBottom: "1.5pt solid #0a0a0a",
                        fontWeight: 600,
                        fontSize: "7.5pt",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#525252",
                        width: "20mm",
                      }}
                    >
                      Qty
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "3mm 2mm",
                        borderBottom: "1.5pt solid #0a0a0a",
                        fontWeight: 600,
                        fontSize: "7.5pt",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#525252",
                        width: "25mm",
                      }}
                    >
                      Unit Price
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "3mm 2mm",
                        borderBottom: "1.5pt solid #0a0a0a",
                        fontWeight: 600,
                        fontSize: "7.5pt",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#525252",
                        width: "20mm",
                      }}
                    >
                      Discount
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "3mm 2mm",
                        borderBottom: "1.5pt solid #0a0a0a",
                        fontWeight: 600,
                        fontSize: "7.5pt",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#525252",
                        width: "22mm",
                      }}
                    >
                      Line Total
                      </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr key={item.id || index}>
                      <td
                        style={{
                          padding: "3.5mm 2mm",
                          borderBottom: "0.5pt solid #e5e5e5",
                          color: "#737373",
                          verticalAlign: "top",
                        }}
                      >
                        {index + 1}
                      </td>
                      <td
                        style={{
                          padding: "3.5mm 2mm",
                          borderBottom: "0.5pt solid #e5e5e5",
                          verticalAlign: "top",
                        }}
                      >
                        <div style={{ fontWeight: 500, color: "#0a0a0a", marginBottom: "0.5mm" }}>
                          {item.description || "—"}
                        </div>
                        {(item.unit_of_measure_id || item.tax_code_id || item.revenue_category_id) && (
                          <div
                            style={{
                              fontSize: "7.5pt",
                              color: "#737373",
                              marginTop: "1mm",
                              display: "flex",
                              gap: "2mm",
                              flexWrap: "wrap",
                            }}
                          >
                            {item.unit_of_measure_id && (
                              <span>UOM: {item.unit_of_measure_id}</span>
                            )}
                            {item.tax_code_id && (
                              <span>• Tax: {item.tax_code_id}</span>
                            )}
                            {item.revenue_category_id && (
                              <span>• Rev: {item.revenue_category_id}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "3.5mm 2mm",
                          borderBottom: "0.5pt solid #e5e5e5",
                          textAlign: "right",
                          verticalAlign: "top",
                          fontFamily: "monospace",
                        }}
                      >
                        {item.quantity}
                      </td>
                      <td
                        style={{
                          padding: "3.5mm 2mm",
                          borderBottom: "0.5pt solid #e5e5e5",
                          textAlign: "right",
                          verticalAlign: "top",
                          fontFamily: "monospace",
                        }}
                      >
                        {formatFinanceMoney(item.unitPrice || item.unit_price, currency)}
                      </td>
                      <td
                        style={{
                          padding: "3.5mm 2mm",
                          borderBottom: "0.5pt solid #e5e5e5",
                          textAlign: "right",
                          verticalAlign: "top",
                          fontFamily: "monospace",
                          color: item.discount ? "#dc2626" : "inherit",
                        }}
                      >
                        {item.discount ? formatFinanceMoney(item.discount, currency) : "—"}
                      </td>
                      <td
                        style={{
                          padding: "3.5mm 2mm",
                          borderBottom: "0.5pt solid #e5e5e5",
                          textAlign: "right",
                          verticalAlign: "top",
                          fontWeight: 600,
                          fontFamily: "monospace",
                        }}
                      >
                        {formatFinanceMoney(item.lineTotal || (item.quantity * item.unitPrice), currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Grid: Summary + Details */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 70mm",
                gap: "15mm",
                alignItems: "start",
                marginBottom: "8mm",
              }}
            >
              {/* Left: Additional Details */}
              <div style={{ fontSize: "8.5pt", lineHeight: 1.6 }}>
                {/* Bank Details */}
                {invoice?.bank_details_snapshot && (
                  <div style={{ marginBottom: "6mm" }}>
                    <div
                      style={{
                        fontSize: "7.5pt",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#737373",
                        marginBottom: "1mm",
                      }}
                    >
                      Bank Details
                    </div>
                    <div style={{ color: "#0a0a0a", fontWeight: 500 }}>
                      {invoice.bank_details_snapshot}
                    </div>
                  </div>
                )}

                {/* Shipping Terms */}
                {invoice?.shipping_term_id && (
                  <div style={{ marginBottom: "6mm" }}>
                    <div
                      style={{
                        fontSize: "7.5pt",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#737373",
                        marginBottom: "1mm",
                      }}
                    >
                      Shipping Terms
                    </div>
                    <div style={{ color: "#0a0a0a" }}>{invoice.shipping_term_id}</div>
                  </div>
                )}

                {/* Notes */}
                {invoice?.notes && (
                  <div>
                    <div
                      style={{
                        fontSize: "7.5pt",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#737373",
                        marginBottom: "1mm",
                      }}
                    >
                      Notes
                    </div>
                    <div
                      style={{
                        color: "#525252",
                        whiteSpace: "pre-wrap",
                        maxWidth: "90mm",
                      }}
                    >
                      {invoice.notes}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Financial Summary */}
              <div
                style={{
                  background: "#fafafa",
                  padding: "4mm",
                  borderRadius: "2mm",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "2mm",
                    fontSize: "9pt",
                    color: "#525252",
                  }}
                >
                  <span>Subtotal</span>
                  <span style={{ fontFamily: "monospace" }}>
                    {formatFinanceMoney(financialSummary?.subtotal || 0, currency)}
                  </span>
                </div>
                
                {(financialSummary?.discount || 0) > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "2mm",
                      fontSize: "9pt",
                      color: "#dc2626",
                    }}
                  >
                    <span>Discount</span>
                    <span style={{ fontFamily: "monospace" }}>
                      -{formatFinanceMoney(financialSummary.discount, currency)}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "2mm",
                    fontSize: "9pt",
                    color: "#525252",
                  }}
                >
                  <span>Tax</span>
                  <span style={{ fontFamily: "monospace" }}>
                    {formatFinanceMoney(financialSummary?.tax || 0, currency)}
                  </span>
                </div>

                <div
                  style={{
                    height: "0.5pt",
                    background: "#d4d4d4",
                    margin: "3mm 0",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "2mm",
                    fontSize: "11pt",
                    fontWeight: 700,
                    color: "#0a0a0a",
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
                      marginBottom: "2mm",
                      fontSize: "9pt",
                      color: "#16a34a",
                    }}
                  >
                    <span>Paid to Date</span>
                    <span style={{ fontFamily: "monospace" }}>
                      -{formatFinanceMoney(financialSummary.paid, currency)}
                    </span>
                  </div>
                )}

                {/* Balance Due - Highlighted */}
                <div
                  style={{
                    background: "#0a0a0a",
                    color: "#ffffff",
                    padding: "3mm 4mm",
                    marginTop: "3mm",
                    borderRadius: "1.5mm",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "9pt",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    Balance Due
                  </span>
                  <span
                    style={{
                      fontSize: "12pt",
                      fontWeight: 700,
                      fontFamily: "monospace",
                    }}
                  >
                    {formatFinanceMoney(financialSummary?.balance || financialSummary?.total || 0, currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment History */}
            {payments && payments.length > 0 && (
              <div style={{ marginTop: "10mm", marginBottom: "8mm" }}>
                <div
                  style={{
                    fontSize: "7.5pt",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#737373",
                    marginBottom: "3mm",
                    paddingBottom: "2mm",
                    borderBottom: "0.5pt solid #e5e5e5",
                  }}
                >
                  Payment History
                </div>
                <div style={{ display: "grid", gap: "2mm" }}>
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "2mm 0",
                        fontSize: "8.5pt",
                        borderBottom: "0.5pt solid #f5f5f5",
                      }}
                    >
                      <div>
                        <span style={{ color: "#0a0a0a", fontWeight: 500 }}>
                          {payment.reference_number || "Payment"}
                        </span>
                        <span style={{ color: "#737373", marginLeft: "3mm" }}>
                          {formatFinanceDate(payment.payment_date)}
                        </span>
                      </div>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontWeight: 600,
                          color: "#16a34a",
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
                marginTop: "auto",
                paddingTop: "10mm",
                borderTop: "0.5pt solid #e5e5e5",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                fontSize: "8pt",
                color: "#737373",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: "#0a0a0a", marginBottom: "1mm" }}>
                  Thank you for your business
                </div>
                <div style={{ fontSize: "7.5pt", maxWidth: "80mm" }}>
                  {invoice?.metadata?.preferred_payment_method_id && (
                    <div>Preferred Payment Method: {invoice.metadata.preferred_payment_method_id}</div>
                  )}
                  {invoice?.posted_to_ledger && (
                    <div style={{ marginTop: "0.5mm" }}>Posted to Ledger: {formatFinanceDate(invoice.issued_at)}</div>
                  )}
                </div>
              </div>
              
              <div style={{ textAlign: "right", fontSize: "7.5pt" }}>
                <div>Generated by System</div>
                <div style={{ marginTop: "0.5mm", opacity: 0.6 }}>
                  {new Date().toISOString().split('T')[0]}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
