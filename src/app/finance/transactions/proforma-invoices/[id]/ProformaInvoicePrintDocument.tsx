import { formatFinanceDate, formatFinanceMoney } from "@/lib/finance/invoicesIssued";

type Props = {
  proforma: any;
  lineItems: any[];
  financialSummary: any;
  project?: any;
  task?: any;
};

const DEFAULT_TERMS =
  "This proforma invoice is issued for commercial confirmation purposes only and does not represent a final tax invoice or receivable posting. Prices, quantities, payment terms, and delivery terms remain subject to final confirmation and formal invoice issuance. Please reference the proforma number in all communications.";

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
    const normalized = String(details).replace(/\r\n/g, "\n").trim();

    const labeledValue = (label: string) => {
      const line = normalized
        .split("\n")
        .map((entry) => entry.trim())
        .find((entry) => entry.toLowerCase().startsWith(`${label.toLowerCase()}:`));

      return line ? line.slice(label.length + 1).trim() : "";
    };

    const lines = normalized
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean);

    const unlabeledLines = lines.filter((entry) => !entry.includes(":"));

    return {
      beneficiary: unlabeledLines[0] || "",
      bank: unlabeledLines[1] || "",
      bankAddress: unlabeledLines[2] || "",
      accountNumber: labeledValue("Account"),
      iban: labeledValue("IBAN"),
      swift: labeledValue("SWIFT"),
      currency: labeledValue("Currency"),
    };
  }
}

export default function ProformaInvoicePrintDocument({
  proforma,
  lineItems,
  financialSummary,
}: Props) {
  if (!proforma) return null;

  const currency =
    proforma?.currency_code ||
    proforma?.metadata?.currency_code ||
    "USD";

  const companyName =
    proforma?.company_name_snapshot ||
    proforma?.company_name ||
    proforma?.company ||
    "—";

  const companyContact =
    proforma?.company_contact_person_snapshot ||
    proforma?.company_contact_person ||
    "";

  const companyEmail =
    proforma?.company_email_snapshot ||
    proforma?.company_email ||
    "";

  const companyPhone =
    proforma?.company_phone_snapshot ||
    proforma?.company_phone ||
    "";

  const companyAddress =
    proforma?.company_address_snapshot ||
    proforma?.company_address ||
    "";

  const counterpartyName =
    proforma?.counterparty_name_snapshot ||
    proforma?.client_name_snapshot ||
    proforma?.client_name ||
    proforma?.client ||
    "—";

  const counterpartyContact =
    proforma?.counterparty_contact_person_snapshot ||
    proforma?.client_contact_person_snapshot ||
    proforma?.client_contact_person ||
    "";

  const counterpartyEmail =
    proforma?.counterparty_email_snapshot ||
    proforma?.client_email_snapshot ||
    proforma?.client_email ||
    "";

  const counterpartyPhone =
    proforma?.counterparty_phone_snapshot ||
    proforma?.client_phone_snapshot ||
    proforma?.client_phone ||
    "";

  const billingAddress =
    proforma?.billing_address_snapshot ||
    proforma?.billing_address ||
    "—";

  const proformaNumber =
    proforma?.proforma_number || "Draft";

  const issueDate =
    proforma?.issue_date || null;

  const validUntil =
    proforma?.valid_until || null;

  const bankInfo = parseBankDetails(proforma?.bank_details_snapshot);

  const paymentTerms =
    proforma?.payment_terms_snapshot || "—";

  const shippingTerms =
    proforma?.shipping_terms_snapshot &&
    !String(proforma.shipping_terms_snapshot).match(/^[0-9a-f-]{36}$/i)
      ? proforma.shipping_terms_snapshot
      : proforma?.shipping_term_label ||
        proforma?.shipping_term_name ||
        "Not specified";

  const termsAndConditions =
    proforma?.terms_and_conditions_snapshot || DEFAULT_TERMS;

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
          .proforma-print-sheet, .proforma-print-sheet * { visibility: visible !important; }
          .proforma-print-sheet {
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
          .proforma-print-sheet {
            display: none !important;
          }
        }
      `}</style>

      <div className="proforma-print-sheet">
        <div
          style={{
            width: "210mm",
            minHeight: "297mm",
            background: "#ffffff",
            color: "#111827",
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            position: "relative",
            overflow: "visible",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: "78mm",
              background: "linear-gradient(135deg, #232323 0%, #1b1b1b 100%)",
              zIndex: 0,
            }}
          />

          <div style={{ position: "relative", zIndex: 2, padding: "9mm 14mm 10mm 14mm" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.05fr 0.95fr",
                gap: "10mm",
                alignItems: "start",
                color: "#ffffff",
                minHeight: "72mm",
              }}
            >
              <div>
                <img
                  src="https://leoilrrnwlquunsbulok.supabase.co/storage/v1/object/public/Branding/aixia-logo.png"
                  alt="AiXia"
                  style={{
                    height: "40mm",
                    width: "auto",
                    filter: "brightness(0) invert(1)",
                    marginTop: "-7mm",
                    marginBottom: "0.5mm",
                  }}
                />

                <div
                  style={{
                    maxWidth: "84mm",
                    fontSize: "8.3pt",
                    lineHeight: 1.38,
                    paddingTop: "0mm",
                    marginTop: "-5mm",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "10.5pt",
                      marginBottom: "0.8mm",
                    }}
                  >
                    {companyName}
                  </div>

                  {companyContact ? <div>{companyContact}</div> : null}
                  {companyPhone ? <div>{companyPhone}</div> : null}
                  {companyEmail ? <div>{companyEmail}</div> : null}
                  {companyAddress ? (
                    <div
                      style={{
                        marginTop: "0.5mm",
                        lineHeight: 1.32,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        maxWidth: "84mm",
                        fontSize: "7.9pt",
                      }}
                    >
                      {companyAddress}
                    </div>
                  ) : null}
                </div>
              </div>

              <div style={{ paddingTop: "2mm", textAlign: "left" }}>
                <div
                  style={{
                    fontSize: "31pt",
                    fontWeight: 300,
                    letterSpacing: "0.09em",
                    textTransform: "uppercase",
                    marginBottom: "6mm",
                    lineHeight: 1,
                  }}
                >
                  Proforma Invoice
                </div>

                <div style={{ fontSize: "10pt", lineHeight: 1.95 }}>
                  <div style={{ display: "flex", gap: "4mm" }}>
                    <span style={{ width: "30mm", opacity: 0.78 }}>Proforma No</span>
                    <span style={{ fontWeight: 700 }}>{proformaNumber}</span>
                  </div>
                  <div style={{ display: "flex", gap: "4mm" }}>
                    <span style={{ width: "30mm", opacity: 0.78 }}>Issue Date</span>
                    <span>{formatFinanceDate(issueDate)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "4mm" }}>
                    <span style={{ width: "30mm", opacity: 0.78 }}>Valid Until</span>
                    <span>{formatFinanceDate(validUntil)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "4mm" }}>
                    <span style={{ width: "30mm", opacity: 0.78 }}>Status</span>
                    <span>{String(proforma?.status || "—")}</span>
                  </div>
                </div>
              </div>
            </div>


                        <div style={{ marginTop: "5mm", marginBottom: "7mm" }}>
              <div
                style={{
                  background: "#ffffff",
                  border: "0.5pt solid #e5e7eb",
                  borderRadius: "2mm",
                  padding: "4mm 5mm",
                  display: "grid",
                  gridTemplateColumns: "1fr",
                }}
              >
                <div
                  style={{
                    fontSize: "7.2pt",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#6b7280",
                    fontWeight: 700,
                    marginBottom: "1.5mm",
                  }}
                >
                  Recipient
                </div>
                <div style={{ fontWeight: 700, fontSize: "11pt", marginBottom: "1mm" }}>
                  {counterpartyName}
                </div>
                {counterpartyContact ? (
                  <div style={{ fontSize: "8.3pt", color: "#4b5563", marginBottom: "0.8mm" }}>
                    {counterpartyContact}
                  </div>
                ) : null}
                {counterpartyEmail || counterpartyPhone ? (
                  <div style={{ fontSize: "8.1pt", color: "#4b5563", marginBottom: "0.8mm" }}>
                    {[counterpartyEmail, counterpartyPhone].filter(Boolean).join(" • ")}
                  </div>
                ) : null}
                <div style={{ fontSize: "8.3pt", color: "#4b5563", lineHeight: 1.55 }}>
                  {billingAddress}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "8mm" }}>
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
                        width: "9%",
                        textAlign: "center",
                        padding: "3mm 2mm",
                        fontWeight: 700,
                      }}
                    >
                      No
                    </th>
                    <th
                      style={{
                        width: "49%",
                        textAlign: "left",
                        padding: "3mm 3mm",
                        fontWeight: 700,
                      }}
                    >
                      Item Description
                    </th>
                    <th
                      style={{
                        width: "15%",
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
                        width: "15%",
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
                  {visibleRows.map((item, index) => {
                    const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
                    const quantity = Number(item.quantity ?? 0);
                    const discount = Number(item.discount ?? 0);
                    const value =
                      item.lineTotal ??
                      item.line_total ??
                      Math.max(quantity * unitPrice - discount, 0);

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
                          {quantity}
                        </td>
                        <td
                          style={{
                            padding: "3mm 2mm",
                            textAlign: "right",
                            fontFamily: "monospace",
                            fontWeight: 700,
                          }}
                        >
                          {formatFinanceMoney(value, currency)}
                        </td>
                      </tr>
                    );
                  })}

                  {Array.from({ length: fillerRows }).map((_, index) => (
                    <tr key={`filler-${index}`} style={{ borderBottom: "0.5pt solid #d1d5db" }}>
                      <td style={{ height: "7mm", padding: "0 2mm" }} />
                      <td style={{ height: "7mm", padding: "0 3mm" }} />
                      <td style={{ height: "7mm", padding: "0 2mm" }} />
                      <td style={{ height: "7mm", padding: "0 2mm" }} />
                      <td style={{ height: "7mm", padding: "0 2mm" }} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.12fr 0.88fr",
                gap: "14mm",
                alignItems: "start",
                marginTop: "0mm",
              }}
            >
              <div style={{ fontSize: "8pt", color: "#374151" }}>
                <div
                  style={{
                    background: "#ffffff",
                    paddingTop: "2mm",
                    paddingRight: "1mm",
                  }}
                >
                  <div style={{ marginBottom: "4mm" }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "9pt",
                        color: "#111827",
                        marginBottom: "1.5mm",
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
                      <div>
                        <span style={{ color: "#6b7280" }}>Currency: </span>
                        <span style={{ fontWeight: 500 }}>{currency}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: "8mm" }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "9pt",
                        color: "#111827",
                        marginBottom: "1.5mm",
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
                </div>
              </div>


                            <div>
                <div
                  style={{
                    background: "#ffffff",
                    padding: "2mm 0 0 6mm",
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
                      marginBottom: "2mm",
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
                      padding: "3mm 3mm",
                      marginTop: "2.5mm",
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

                  <div
                    style={{
                      marginTop: "6mm",
                      textAlign: "center",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        borderBottom: "0.5pt dashed #6b7280",
                        height: "12mm",
                        marginBottom: "1.5mm",
                      }}
                    />
                    <div style={{ fontSize: "8pt", color: "#374151" }}>Authorized Signature</div>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "1mm",
                paddingTop: "2mm",
                borderTop: "0.5pt solid #e5e7eb",
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "9pt",
                  color: "#111827",
                  marginBottom: "2mm",
                }}
              >
                Terms and Conditions
              </div>

              <div
                style={{
                  lineHeight: 1.45,
                  whiteSpace: "pre-wrap",
                  fontSize: "7pt",
                  color: "#374151",
                  marginBottom: "3mm",
                }}
              >
                {termsAndConditions}
              </div>

              <div
                style={{
                  textAlign: "center",
                  fontSize: "10pt",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#111827",
                  marginTop: "3mm",
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



            
