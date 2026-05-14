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

function joinAddress(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(", ");
}

function getLineValue(item: any) {
  const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
  const quantity = Number(item.quantity ?? 0);
  const discount = Number(item.discount ?? 0);

  return item.lineTotal ?? item.line_total ?? Math.max(quantity * unitPrice - discount, 0);
}

export default function ProformaInvoicePrintDocument({
  proforma,
  lineItems,
  financialSummary,
  company,
  client,
}: Props) {
  const currency = proforma?.currency_code || proforma?.metadata?.currency_code || "USD";

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
    proforma?.company_email_snapshot || company?.email || proforma?.company_email || "";

  const companyPhone =
    proforma?.company_phone_snapshot || company?.phone || proforma?.company_phone || "";

  const companyAddress =
    proforma?.company_address_snapshot ||
    joinAddress([
      company?.address_line_1,
      company?.address_line_2,
      company?.city,
      company?.state_province,
      company?.postal_code,
      company?.country,
    ]) ||
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
    joinAddress([
      client?.address_line_1,
      client?.address_line_2,
      client?.city,
      client?.state_province,
      client?.postal_code,
      client?.country,
    ]) ||
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
      : proforma?.shipping_term_label || proforma?.shipping_term_name || "Not specified";

  const termsAndConditions = proforma?.terms_and_conditions_snapshot || DEFAULT_TERMS;
  const rows = Array.isArray(lineItems) ? lineItems : [];
  const visibleRows = rows.slice(0, 8);
  const fillerRows = Math.max(0, 3 - visibleRows.length);

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }

          html,
          body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body * {
            visibility: hidden !important;
          }

          .proforma-print-sheet,
          .proforma-print-sheet * {
            visibility: visible !important;
          }

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
        <div className="aixia-print-page">
          <div className="aixia-print-hero-band" />

          <div className="aixia-print-content">
            <div className="aixia-print-hero-grid">
              <div className="aixia-print-company-block">
                <img
                  src="https://leoilrrnwlquunsbulok.supabase.co/storage/v1/object/public/Branding/aixia-logo.png"
                  alt="AiXia"
                  className="aixia-print-logo"
                />

                <div className="aixia-print-company-details">
                  <div className="aixia-print-company-name">{companyName}</div>
                  {companyContact ? <div>{companyContact}</div> : null}
                  {companyPhone ? <div>{companyPhone}</div> : null}
                  {companyEmail ? <div>{companyEmail}</div> : null}
                  {companyAddress ? (
                    <div className="aixia-print-address">{companyAddress}</div>
                  ) : null}
                </div>
              </div>

              <div className="aixia-print-document-heading">
                <div className="aixia-print-title">Proforma Invoice</div>

                <div className="aixia-print-document-meta">
                  <div className="aixia-print-meta-row">
                    <span>Proforma No</span>
                    <strong>{proformaNumber}</strong>
                  </div>
                  <div className="aixia-print-meta-row">
                    <span>Issue Date</span>
                    <strong>{formatFinanceDate(issueDate)}</strong>
                  </div>
                  <div className="aixia-print-meta-row">
                    <span>Valid Until</span>
                    <strong>{formatFinanceDate(validUntil)}</strong>
                  </div>
                  <div className="aixia-print-meta-row">
                    <span>Status</span>
                    <strong>{String(proforma?.status || "—")}</strong>
                  </div>
                </div>
              </div>
            </div>

            <section className="aixia-print-card aixia-print-recipient-card">
              <div className="aixia-print-label">Recipient</div>
              <div className="aixia-print-recipient-name">{counterpartyName}</div>
              {counterpartyContact ? <div>{counterpartyContact}</div> : null}
              {counterpartyEmail || counterpartyPhone ? (
                <div>{[counterpartyEmail, counterpartyPhone].filter(Boolean).join(" • ")}</div>
              ) : null}
              <div className="aixia-print-address">{billingAddress}</div>
            </section>

            <table className="aixia-print-table">
              <thead>
                <tr>
                  <th className="aixia-print-col-number">No</th>
                  <th>Item Description</th>
                  <th>Unit Price</th>
                  <th>Quantity</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((item, index) => {
                  const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
                  const quantity = Number(item.quantity ?? 0);
                  const value = getLineValue(item);

                  return (
                    <tr key={item.id || index}>
                      <td>{index + 1}</td>
                      <td>{item.description || "—"}</td>
                      <td className="aixia-print-money">{formatFinanceMoney(unitPrice, currency)}</td>
                      <td className="aixia-print-money">{quantity}</td>
                      <td className="aixia-print-money aixia-print-strong">
                        {formatFinanceMoney(value, currency)}
                      </td>
                    </tr>
                  );
                })}

                {Array.from({ length: fillerRows }).map((_, index) => (
                  <tr key={`filler-${index}`} className="aixia-print-filler-row">
                    <td />
                    <td />
                    <td />
                    <td />
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="aixia-print-bottom-grid">
              <section className="aixia-print-terms-block">
                <div className="aixia-print-section-title">Payment and Shipping Terms</div>
                <div className="aixia-print-term-line">
                  <span>Payment Terms: </span>
                  <strong>{paymentTerms}</strong>
                </div>
                {paymentTermsText ? (
                  <div className="aixia-print-paragraph">{paymentTermsText}</div>
                ) : null}
                <div className="aixia-print-term-line">
                  <span>Shipping Terms: </span>
                  <strong>{shippingTerms}</strong>
                </div>
                <div className="aixia-print-term-line">
                  <span>Currency: </span>
                  <strong>{currency}</strong>
                </div>

                <div className="aixia-print-section-title aixia-print-bank-title">
                  Bank Details
                </div>
                {bankInfo ? (
                  <div className="aixia-print-bank-details">
                    {bankInfo.beneficiary ? (
                      <div>
                        <span>Beneficiary: </span>
                        <strong>{bankInfo.beneficiary}</strong>
                      </div>
                    ) : null}
                    {bankInfo.bank ? (
                      <div>
                        <span>Beneficiary Bank Name: </span>
                        <strong>{bankInfo.bank}</strong>
                      </div>
                    ) : null}
                    {bankInfo.bankAddress ? (
                      <div>
                        <span>Beneficiary Bank Address: </span>
                        <strong>{bankInfo.bankAddress}</strong>
                      </div>
                    ) : null}
                    {bankInfo.accountNumber ? (
                      <div>
                        <span>Bank Account: </span>
                        <strong className="aixia-print-money">{bankInfo.accountNumber}</strong>
                      </div>
                    ) : null}
                    {bankInfo.swift ? (
                      <div>
                        <span>SWIFT Code: </span>
                        <strong className="aixia-print-money">{bankInfo.swift}</strong>
                      </div>
                    ) : null}
                    {bankInfo.iban ? (
                      <div>
                        <span>IBAN: </span>
                        <strong className="aixia-print-money">{bankInfo.iban}</strong>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div>No bank details available.</div>
                )}
              </section>

              <section className="aixia-print-summary-block">
                <div className="aixia-print-total-row">
                  <span>SUB TOTAL</span>
                  <strong className="aixia-print-money">
                    {formatFinanceMoney(financialSummary?.subtotal || 0, currency)}
                  </strong>
                </div>
                <div className="aixia-print-total-row">
                  <span>TAX / VAT</span>
                  <strong className="aixia-print-money">
                    {formatFinanceMoney(financialSummary?.tax || 0, currency)}
                  </strong>
                </div>
                <div className="aixia-print-total-row">
                  <span>DISCOUNT</span>
                  <strong className="aixia-print-money">
                    {formatFinanceMoney(financialSummary?.discount || 0, currency)}
                  </strong>
                </div>
                <div className="aixia-print-grand-total-row">
                  <span>Grand Total</span>
                  <strong className="aixia-print-money">
                    {formatFinanceMoney(financialSummary?.total || 0, currency)}
                  </strong>
                </div>
                <div className="aixia-print-signature-block">
                  <div className="aixia-print-signature-line" />
                  <div>Authorized Signature</div>
                </div>
              </section>
            </div>

            <section className="aixia-print-footer-terms">
              <div className="aixia-print-section-title">Terms and Conditions</div>
              <div className="aixia-print-legal-text">{termsAndConditions}</div>
              <div className="aixia-print-thank-you">Thank You For Your Business</div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
