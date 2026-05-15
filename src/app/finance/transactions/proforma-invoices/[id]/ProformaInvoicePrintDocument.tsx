import { formatFinanceDate, formatFinanceMoney } from "@/lib/finance/invoicesIssued";

type Props = {
  proforma: any;
  lineItems: any[];
  financialSummary: any;
  project?: any;
  task?: any;
  company?: any;
  client?: any;
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
        .find((entry) =>
          entry.toLowerCase().startsWith(`${label.toLowerCase()}:`)
        );

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
  company,
  client,
}: Props) {
  const currency =
    proforma?.currency_code ||
    proforma?.metadata?.currency_code ||
    "USD";

  const companyName =
    proforma?.company_name_snapshot ||
    company?.legal_name ||
    company?.name ||
    proforma?.company_name ||
    proforma?.company ||
    "—";

  const companyContact =
    proforma?.company_contact_person_snapshot ||
    company?.contact_person ||
    proforma?.company_contact_person ||
    "";

  const companyEmail =
    proforma?.company_email_snapshot ||
    company?.email ||
    proforma?.company_email ||
    "";

  const companyPhone =
    proforma?.company_phone_snapshot ||
    company?.phone ||
    proforma?.company_phone ||
    "";

  const companyAddress =
    proforma?.company_address_snapshot ||
    [
      company?.address_line_1,
      company?.address_line_2,
      company?.city,
      company?.state_province,
      company?.postal_code,
      company?.country,
    ]
      .filter(Boolean)
      .join(", ") ||
    proforma?.company_address ||
    "";

  const counterpartyName =
    proforma?.counterparty_name_snapshot ||
    proforma?.client_name_snapshot ||
    client?.legal_name ||
    client?.name ||
    proforma?.client_name ||
    proforma?.client ||
    "—";

  const counterpartyContact =
    proforma?.counterparty_contact_person_snapshot ||
    proforma?.client_contact_person_snapshot ||
    client?.contact_person ||
    proforma?.client_contact_person ||
    "";

  const counterpartyEmail =
    proforma?.counterparty_email_snapshot ||
    proforma?.client_email_snapshot ||
    client?.company_email ||
    client?.personnel_email ||
    proforma?.client_email ||
    "";

  const counterpartyPhone =
    proforma?.counterparty_phone_snapshot ||
    proforma?.client_phone_snapshot ||
    client?.company_phone ||
    client?.personnel_phone ||
    proforma?.client_phone ||
    "";

  const billingAddress =
    proforma?.billing_address_snapshot ||
    [
      client?.address_line_1,
      client?.address_line_2,
      client?.city,
      client?.state_province,
      client?.postal_code,
      client?.country,
    ]
      .filter(Boolean)
      .join(", ") ||
    proforma?.billing_address ||
    "—";

  const proformaNumber = proforma?.proforma_number || "Draft";
  const issueDate = proforma?.issue_date || null;
  const validUntil = proforma?.valid_until || null;

  const bankInfo = parseBankDetails(proforma?.bank_details_snapshot);

  const paymentTerms =
    proforma?.payment_terms_snapshot ||
    proforma?.payment_terms_label ||
    proforma?.payment_term_name ||
    "—";

  const paymentTermsText =
    proforma?.payment_terms_document_text ||
    proforma?.payment_terms_text_snapshot ||
    proforma?.payment_terms_description ||
    proforma?.payment_terms_text ||
    "";

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
          className="aixia-print-page"
          style={{
            width: "210mm",
            minHeight: "297mm",
            background: "#ffffff",
            color: "#111827",
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

          <div
            style={{
              position: "relative",
              zIndex: 2,
              padding: "9mm 14mm 10mm 14mm",
            }}
          >
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
                  className="aixia-print-company-details"
                  style={{
                    maxWidth: "84mm",
                    paddingTop: "0mm",
                    marginTop: "-5mm",
                  }}
                >
                  <div
                    className="aixia-print-company-name"
                    style={{
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
                      className="aixia-print-address"
                      style={{
                        marginTop: "0.5mm",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        maxWidth: "84mm",
                      }}
                    >
                      {companyAddress}
                    </div>
                  ) : null}
                </div>
              </div>

              <div style={{ paddingTop: "2mm", textAlign: "left" }}>
                <div
                  className="aixia-print-title"
                  style={{
                    textTransform: "uppercase",
                    marginBottom: "6mm",
                  }}
                >
                  Proforma Invoice
                </div>

                <div className="aixia-print-document-meta">
                  <div style={{ display: "flex", gap: "4mm" }}>
                    <span style={{ width: "30mm", opacity: 0.78 }}>
                      Proforma No
                    </span>
                    <span className="aixia-print-strong">{proformaNumber}</span>
                  </div>
                  <div style={{ display: "flex", gap: "4mm" }}>
                    <span style={{ width: "30mm", opacity: 0.78 }}>
                      Issue Date
                    </span>
                    <span>{formatFinanceDate(issueDate)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "4mm" }}>
                    <span style={{ width: "30mm", opacity: 0.78 }}>
                      Valid Until
                    </span>
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
                  className="aixia-print-label"
                  style={{
                    textTransform: "uppercase",
                    color: "#6b7280",
                    marginBottom: "1.5mm",
                  }}
                >
                  Recipient
                </div>
                <div
                  className="aixia-print-recipient-name"
                  style={{
                    marginBottom: "1mm",
                  }}
                >
                  {counterpartyName}
                </div>
                {counterpartyContact ? (
                  <div
                    className="aixia-print-muted-line"
                    style={{
                      color: "#4b5563",
                      marginBottom: "0.8mm",
                    }}
                  >
                    {counterpartyContact}
                  </div>
                ) : null}
                {counterpartyEmail || counterpartyPhone ? (
                  <div
                    className="aixia-print-muted-line"
                    style={{
                      color: "#4b5563",
                      marginBottom: "0.8mm",
                    }}
                  >
                    {[counterpartyEmail, counterpartyPhone]
                      .filter(Boolean)
                      .join(" • ")}
                  </div>
                ) : null}
                <div
                  className="aixia-print-address"
                  style={{
                    color: "#4b5563",
                  }}
                >
                  {billingAddress}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "8mm" }}>
              <table
                className="aixia-print-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                }}
              >
                <thead>
                  <tr style={{ background: "#232323", color: "#ffffff" }}>
                    <th
                      className="aixia-print-strong"
                      style={{
                        width: "9%",
                        textAlign: "center",
                        padding: "3mm 2mm",
                      }}
                    >
                      No
                    </th>
                    <th
                      className="aixia-print-strong"
                      style={{
                        width: "49%",
                        textAlign: "left",
                        padding: "3mm 3mm",
                      }}
                    >
                      Item Description
                    </th>
                    <th
                      className="aixia-print-strong"
                      style={{
                        width: "15%",
                        textAlign: "right",
                        padding: "3mm 2mm",
                      }}
                    >
                      Unit Price
                    </th>
                    <th
                      className="aixia-print-strong"
                      style={{
                        width: "12%",
                        textAlign: "right",
                        padding: "3mm 2mm",
                      }}
                    >
                      Quantity
                    </th>
                    <th
                      className="aixia-print-strong"
                      style={{
                        width: "15%",
                        textAlign: "right",
                        padding: "3mm 2mm",
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
                    const discount =
                      Number(item.discount ?? item.discount_rate ?? 0);
                    const value =
                      item.lineTotal ??
                      item.line_total ??
                      Math.max(quantity * unitPrice - discount, 0);

                    return (
                      <tr
                        key={item.id || index}
                        style={{ borderBottom: "0.5pt solid #d1d5db" }}
                      >
                        <td
                          style={{
                            padding: "3mm 2mm",
                            textAlign: "center",
                          }}
                        >
                          {index + 1}
                        </td>
                        <td
                          style={{
                            padding: "3mm 3mm",
                            verticalAlign: "top",
                          }}
                        >
                          <div className="aixia-print-medium">
                            {item.description || item.item_name || "—"}
                          </div>
                        </td>
                        <td
                          className="aixia-print-money"
                          style={{
                            padding: "3mm 2mm",
                            textAlign: "right",
                          }}
                        >
                          {formatFinanceMoney(unitPrice, currency)}
                        </td>
                        <td
                          className="aixia-print-money"
                          style={{
                            padding: "3mm 2mm",
                            textAlign: "right",
                          }}
                        >
                          {quantity}
                        </td>
                        <td
                          className="aixia-print-money aixia-print-strong"
                          style={{
                            padding: "3mm 2mm",
                            textAlign: "right",
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
                      style={{ borderBottom: "0.5pt solid #d1d5db" }}
                    >
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
              <div className="aixia-print-copy" style={{ color: "#374151" }}>
                <div
                  style={{
                    background: "#ffffff",
                    paddingTop: "2mm",
                    paddingRight: "1mm",
                  }}
                >
                  <div style={{ marginBottom: "4mm" }}>
                    <div
                      className="aixia-print-section-title"
                      style={{
                        color: "#111827",
                        marginBottom: "1.5mm",
                      }}
                    >
                      Payment and Shipping Terms
                    </div>
                    <div>
                      <div>
                        <span style={{ color: "#6b7280" }}>Payment Terms: </span>
                        <span className="aixia-print-medium">{paymentTerms}</span>
                      </div>

                      {paymentTermsText ? (
                        <div
                          className="aixia-print-paragraph"
                          style={{
                            marginTop: "1mm",
                            whiteSpace: "pre-wrap",
                            color: "#374151",
                          }}
                        >
                          {paymentTermsText}
                        </div>
                      ) : null}

                      <div style={{ marginTop: paymentTermsText ? "1.2mm" : "0mm" }}>
                        <span style={{ color: "#6b7280" }}>Shipping Terms: </span>
                        <span className="aixia-print-medium">{shippingTerms}</span>
                      </div>
                      <div>
                        <span style={{ color: "#6b7280" }}>Currency: </span>
                        <span className="aixia-print-medium">{currency}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: "8mm" }}>
                    <div
                      className="aixia-print-section-title"
                      style={{
                        color: "#111827",
                        marginBottom: "1.5mm",
                      }}
                    >
                      Bank Details
                    </div>

                    {bankInfo ? (
                      <div>
                        {bankInfo.beneficiary ? (
                          <div>
                            <span style={{ color: "#6b7280" }}>Beneficiary: </span>
                            <span className="aixia-print-strong">{bankInfo.beneficiary}</span>
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
                            <span className="aixia-print-money aixia-print-strong">
                              {bankInfo.accountNumber}
                            </span>
                          </div>
                        ) : null}
                        {bankInfo.swift ? (
                          <div>
                            <span style={{ color: "#6b7280" }}>SWIFT Code: </span>
                            <span className="aixia-print-money aixia-print-strong">
                              {bankInfo.swift}
                            </span>
                          </div>
                        ) : null}
                        {bankInfo.iban ? (
                          <div>
                            <span style={{ color: "#6b7280" }}>IBAN: </span>
                            <span className="aixia-print-money aixia-print-strong">
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
                    className="aixia-print-total-row"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "2mm",
                    }}
                  >
                    <span>SUB TOTAL</span>
                    <span className="aixia-print-money">
                      {formatFinanceMoney(financialSummary?.subtotal || 0, currency)}
                    </span>
                  </div>

                  <div
                    className="aixia-print-total-row"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "2mm",
                    }}
                  >
                    <span>TAX / VAT</span>
                    <span className="aixia-print-money">
                      {formatFinanceMoney(financialSummary?.tax || 0, currency)}
                    </span>
                  </div>

                  <div
                    className="aixia-print-total-row"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "2mm",
                    }}
                  >
                    <span>DISCOUNT</span>
                    <span className="aixia-print-money">
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
                      className="aixia-print-strong"
                      style={{
                        textTransform: "uppercase",
                      }}
                    >
                      Grand Total
                    </span>
                    <span className="aixia-print-money aixia-print-strong">
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
                    <div style={{ color: "#374151" }}>
                      Authorized Signature
                    </div>
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
                className="aixia-print-section-title"
                style={{
                  color: "#111827",
                  marginBottom: "2mm",
                }}
              >
                Terms and Conditions
              </div>

              <div
                className="aixia-print-legal-text"
                style={{
                  whiteSpace: "pre-wrap",
                  color: "#374151",
                  marginBottom: "3mm",
                }}
              >
                {termsAndConditions}
              </div>

              <div
                className="aixia-print-thank-you"
                style={{
                  textAlign: "center",
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
