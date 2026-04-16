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

export default function InvoicePrintDocument({
  invoice,
  lineItems,
  financialSummary,
  payments = [],
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

  const paymentTerms =
    invoice?.payment_terms_snapshot || "—";

  const shippingTerms =
    invoice?.shipping_terms_snapshot || "—";

  const termsAndConditions =
    invoice?.terms_and_conditions_snapshot || DEFAULT_TERMS;

  const totalRows = Math.max(lineItems.length, 8);
  const emptyRows = Math.max(0, totalRows - lineItems.length);

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
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
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
            height: "297mm",
            background: "#ffffff",
            color: "#111827",
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* HEADER */}
          <div
            style={{
              position: "absolute",
              inset: "0 0 auto 0",
              height: "74mm",
              background: "#232323",
              zIndex: 0,
            }}
          />

          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "45mm",
              height: "32mm",
              background: "#ffffff",
              clipPath: "ellipse(92% 100% at 50% 0%)",
              zIndex: 1,
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 2,
              padding: "11mm 14mm 0 14mm",
              color: "#ffffff",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10mm",
                alignItems: "start",
              }}
            >
              {/* LEFT HEADER */}
              <div>
                <img
                  src="https://leoilrrnwlquunsbulok.supabase.co/storage/v1/object/public/Branding/aixia-logo.png"
                  alt="AiXia"
                  style={{
                    height: "11mm",
                    width: "auto",
                    filter: "brightness(0) invert(1)",
                    marginBottom: "4mm",
                  }}
                />

                <div
                  style={{
                    fontSize: "8pt",
                    lineHeight: 1.65,
                    color: "rgba(255,255,255,0.92)",
                    maxWidth: "72mm",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "10pt", marginBottom: "1.2mm" }}>
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
                    <div style={{ marginTop: "1mm" }}>
                      {invoice.company_address_snapshot}
                    </div>
                  ) : null}
                </div>

                <div style={{ marginTop: "5mm", maxWidth: "72mm" }}>
                  <div
                    style={{
                      fontSize: "8pt",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: "1.5mm",
                    }}
                  >
                    Bill To
                  </div>

                  <div style={{ fontSize: "8pt", lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 700, fontSize: "10pt", marginBottom: "1mm" }}>
                      {invoice?.client_name_snapshot || "—"}
                    </div>
                    {invoice?.client_contact_person_snapshot ? (
                      <div>{invoice.client_contact_person_snapshot}</div>
                    ) : null}
                    {invoice?.client_email_snapshot ? (
                      <div>{invoice.client_email_snapshot}</div>
                    ) : null}
                    {invoice?.client_phone_snapshot ? (
                      <div>{invoice.client_phone_snapshot}</div>
                    ) : null}
                    {invoice?.billing_address_snapshot ? (
                      <div style={{ marginTop: "1mm" }}>
                        {invoice.billing_address_snapshot}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* RIGHT HEADER */}
              <div style={{ textAlign: "left", paddingLeft: "10mm" }}>
                <div
                  style={{
                    fontSize: "32pt",
                    fontWeight: 300,
                    letterSpacing: "0.09em",
                    textTransform: "uppercase",
                    marginBottom: "8mm",
                    marginTop: "4mm",
                  }}
                >
                  Invoice
                </div>

                <div style={{ fontSize: "10pt", lineHeight: 2 }}>
                  <div style={{ display: "flex", gap: "5mm" }}>
                    <span style={{ width: "25mm", opacity: 0.8 }}>Invoice No</span>
                    <span style={{ fontWeight: 700 }}>{invoice?.invoice_number || "—"}</span>
                  </div>
                  <div style={{ display: "flex", gap: "5mm" }}>
                    <span style={{ width: "25mm", opacity: 0.8 }}>Issue Date</span>
                    <span>{formatFinanceDate(invoice?.issue_date)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "5mm" }}>
                    <span style={{ width: "25mm", opacity: 0.8 }}>Due Date</span>
                    <span>{formatFinanceDate(invoice?.due_date)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "5mm" }}>
                    <span style={{ width: "25mm", opacity: 0.8 }}>Currency</span>
                    <span>{currency}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div style={{ position: "relative", zIndex: 2, padding: "12mm 14mm 0 14mm" }}>
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
                      width: "10%",
                      textAlign: "center",
                      padding: "3mm 2mm",
                      fontWeight: 700,
                    }}
                  >
                    No
                  </th>
                  <th
                    style={{
                      width: "48%",
                      textAlign: "left",
                      padding: "3mm 3mm",
                      fontWeight: 700,
                    }}
                  >
                    Item Description
                  </th>
                  <th
                    style={{
                      width: "14%",
                      textAlign: "right",
                      padding: "3mm 2mm",
                      fontWeight: 700,
                    }}
                  >
                    Unit Price
                  </th>
                  <th
                    style={{
                      width: "12%",
                      textAlign: "right",
                      padding: "3mm 2mm",
                      fontWeight: 700,
                    }}
                  >
                    Quantity
                  </th>
                  <th
                    style={{
                      width: "16%",
                      textAlign: "right",
                      padding: "3mm 2mm",
                      fontWeight: 700,
                    }}
                  >
                    Value
                  </th>
                </tr>
              </thead>

              <tbody>
                {lineItems.map((item, index) => {
                  const unitPrice = item.unitPrice ?? item.unit_price ?? 0;
                  const lineTotal =
                    item.lineTotal ??
                    item.line_total ??
                    (Number(item.quantity || 0) * Number(unitPrice || 0) -
                      Number(item.discount || 0));

                  return (
                    <tr key={item.id || index} style={{ borderBottom: "0.5pt solid #d1d5db" }}>
                      <td style={{ padding: "3mm 2mm", textAlign: "center" }}>{index + 1}</td>
                      <td style={{ padding: "3mm 3mm", verticalAlign: "top" }}>
                        <div style={{ fontWeight: 500 }}>{item.description || "—"}</div>
                      </td>
                      <td
                        style={{
                          padding: "3mm 2mm",
                          textAlign: "right",
                          fontFamily: "monospace",
                        }}
                      >
                        {formatFinanceMoney(unitPrice, currency)}
                      </td>
                      <td
                        style={{
                          padding: "3mm 2mm",
                          textAlign: "right",
                          fontFamily: "monospace",
                        }}
                      >
                        {item.quantity || 0}
                      </td>
                      <td
                        style={{
                          padding: "3mm 2mm",
                          textAlign: "right",
                          fontFamily: "monospace",
                          fontWeight: 700,
                        }}
                      >
                        {formatFinanceMoney(lineTotal, currency)}
                      </td>
                    </tr>
                  );
                })}

                {Array.from({ length: emptyRows }).map((_, index) => (
                  <tr
                    key={`empty-${index}`}
                    style={{ borderBottom: "0.5pt solid #d1d5db", height: "11mm" }}
                  >
                    <td style={{ padding: "3mm 2mm" }}>&nbsp;</td>
                    <td style={{ padding: "3mm 3mm" }}>&nbsp;</td>
                    <td style={{ padding: "3mm 2mm" }}>&nbsp;</td>
                    <td style={{ padding: "3mm 2mm" }}>&nbsp;</td>
                    <td style={{ padding: "3mm 2mm" }}>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* BOTTOM */}
          <div
            style={{
              position: "absolute",
              left: "14mm",
              right: "14mm",
              bottom: "18mm",
              display: "grid",
              gridTemplateColumns: "1.12fr 0.88fr",
              gap: "8mm",
              alignItems: "start",
            }}
          >
            {/* LEFT */}
            <div style={{ fontSize: "8pt", color: "#374151" }}>
              <div style={{ marginBottom: "4mm" }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "9pt",
                    color: "#111827",
                    marginBottom: "1.4mm",
                  }}
                >
                  Payment and Shipping Terms
                </div>
                <div style={{ lineHeight: 1.7 }}>
                  <div>
                    <span style={{ color: "#6b7280" }}>Payment Terms: </span>
                    <span style={{ fontWeight: 500 }}>{paymentTerms}</span>
                  </div>
                  <div>
                    <span style={{ color: "#6b7280" }}>Shipping Terms: </span>
                    <span style={{ fontWeight: 500 }}>{shippingTerms}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "4mm" }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "9pt",
                    color: "#111827",
                    marginBottom: "1.4mm",
                  }}
                >
                  Bank Details
                </div>

                {bankInfo ? (
                  <div style={{ lineHeight: 1.65 }}>
                    {bankInfo.beneficiary ? (
                      <div>
                        <span style={{ color: "#6b7280" }}>Beneficiary: </span>
                        <span style={{ fontWeight: 600 }}>{bankInfo.beneficiary}</span>
                      </div>
                    ) : null}

                    {bankInfo.bank ? (
                      <div>
                        <span style={{ color: "#6b7280" }}>Beneficiary Bank Name: </span>
                        <span>{bankInfo.bank}</span>
                      </div>
                    ) : null}

                    {bankInfo.bankAddress ? (
                      <div>
                        <span style={{ color: "#6b7280" }}>Beneficiary Bank Address: </span>
                        <span>{bankInfo.bankAddress}</span>
                      </div>
                    ) : null}

                    {bankInfo.accountNumber ? (
                      <div>
                        <span style={{ color: "#6b7280" }}>Bank Account: </span>
                        <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                          {bankInfo.accountNumber}
                        </span>
                      </div>
                    ) : null}

                    {bankInfo.swift ? (
                      <div>
                        <span style={{ color: "#6b7280" }}>SWIFT Code: </span>
                        <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                          {bankInfo.swift}
                        </span>
                      </div>
                    ) : null}

                    {bankInfo.iban ? (
                      <div>
                        <span style={{ color: "#6b7280" }}>IBAN: </span>
                        <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                          {bankInfo.iban}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div>No bank details available.</div>
                )}
              </div>

              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "9pt",
                    color: "#111827",
                    marginBottom: "1.4mm",
                  }}
                >
                  Terms and Conditions
                </div>
                <div
                  style={{
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    maxHeight: "24mm",
                    overflow: "hidden",
                  }}
                >
                  {termsAndConditions}
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div>
              <div
                style={{
                  paddingLeft: "8mm",
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
                  <span>SUB TOTAL</span>
                  <span style={{ fontFamily: "monospace" }}>
                    {formatFinanceMoney(financialSummary?.subtotal || 0, currency)}
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
                  <span>TAX / VAT</span>
                  <span style={{ fontFamily: "monospace" }}>
                    {formatFinanceMoney(financialSummary?.tax || 0, currency)}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "2.5mm",
                    fontSize: "9pt",
                  }}
                >
                  <span>DISCOUNT</span>
                  <span style={{ fontFamily: "monospace" }}>
                    {formatFinanceMoney(financialSummary?.discount || 0, currency)}
                  </span>
                </div>

                <div
                  style={{
                    background: "#232323",
                    color: "#ffffff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "2.8mm 3mm",
                    marginTop: "2mm",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10pt",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    Grand Total
                  </span>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: "11pt",
                      fontWeight: 700,
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
                      marginTop: "2.2mm",
                      fontSize: "8.5pt",
                    }}
                  >
                    <span>PAID</span>
                    <span style={{ fontFamily: "monospace" }}>
                      {formatFinanceMoney(financialSummary?.paid || 0, currency)}
                    </span>
                  </div>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "2.2mm",
                    fontSize: "9pt",
                    fontWeight: 700,
                  }}
                >
                  <span>BALANCE DUE</span>
                  <span style={{ fontFamily: "monospace" }}>
                    {formatFinanceMoney(financialSummary?.balance || 0, currency)}
                  </span>
                </div>

                <div style={{ marginTop: "18mm", textAlign: "center" }}>
                  <div
                    style={{
                      borderBottom: "0.5pt dashed #6b7280",
                      height: "10mm",
                      marginBottom: "1.5mm",
                    }}
                  />
                  <div style={{ fontSize: "8pt", color: "#374151" }}>Signature</div>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div
            style={{
              position: "absolute",
              left: "14mm",
              bottom: "8mm",
              fontSize: "9pt",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#111827",
            }}
          >
            Thank You For Your Business
          </div>

          {payments?.length > 0 ? (
            <div
              style={{
                position: "absolute",
                right: "14mm",
                bottom: "8mm",
                maxWidth: "90mm",
                textAlign: "right",
                fontSize: "6.8pt",
                color: "#6b7280",
                lineHeight: 1.5,
              }}
            >
              {payments.map((payment: any, index: number) => (
                <div key={payment.id || index}>
                  {formatFinanceDate(payment.payment_date)} ·{" "}
                  {formatFinanceMoney(payment.amount, currency)}
                  {payment.reference_number ? ` · ${payment.reference_number}` : ""}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
