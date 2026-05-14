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

export default function InvoicePrintDocument({
  invoice,
  lineItems,
  financialSummary,
  payments = [],
}: Props) {
  const currency = invoice?.currency_code || "USD";

  const companyName =
    invoice?.company_name_snapshot ||
    invoice?.company_name ||
    invoice?.company ||
    "—";

  const companyContact =
    invoice?.company_contact_person_snapshot ||
    invoice?.company_contact_person ||
    "";

  const companyEmail =
    invoice?.company_email_snapshot ||
    invoice?.company_email ||
    "";

  const companyPhone =
    invoice?.company_phone_snapshot ||
    invoice?.company_phone ||
    "";

  const companyAddress =
    invoice?.company_address_snapshot ||
    invoice?.company_address ||
    "";

  const counterpartyName =
    invoice?.counterparty_name_snapshot ||
    invoice?.client_name_snapshot ||
    invoice?.client_name ||
    invoice?.client ||
    "—";

  const counterpartyContact =
    invoice?.counterparty_contact_person_snapshot ||
    invoice?.client_contact_person_snapshot ||
    invoice?.client_contact_person ||
    "";

  const counterpartyEmail =
    invoice?.counterparty_email_snapshot ||
    invoice?.client_email_snapshot ||
    invoice?.client_email ||
    "";

  const counterpartyPhone =
    invoice?.counterparty_phone_snapshot ||
    invoice?.client_phone_snapshot ||
    invoice?.client_phone ||
    "";

  const billingAddress =
    invoice?.billing_address_snapshot ||
    invoice?.billing_address ||
    "—";

  const invoiceNumber = invoice?.invoice_number || "Draft";
  const issueDate = invoice?.issue_date || invoice?.issued_at || null;
  const dueDate = invoice?.due_date || null;

  const bankInfo = parseBankDetails(invoice?.bank_details_snapshot);

  const paymentTerms = invoice?.payment_terms_snapshot || "—";
  const paymentTermsText =
    invoice?.payment_terms_document_text ||
    invoice?.payment_terms_text_snapshot ||
    invoice?.payment_terms_description ||
    "";

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
          @page {
            size: A4;
            margin: 0;
          }

          html,
          body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body * {
            visibility: hidden !important;
          }

          .invoice-print-sheet,
          .invoice-print-sheet * {
            visibility: visible !important;
          }

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

        .invoice-print-page {
          width: 210mm;
          min-height: 297mm;
          background: #ffffff;
          color: #111827;
          position: relative;
          overflow: visible;
        }

        .invoice-print-header-bg {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 78mm;
          background: linear-gradient(135deg, #232323 0%, #1b1b1b 100%);
          z-index: 0;
        }

        .invoice-print-body {
          position: relative;
          z-index: 2;
          padding: 9mm 14mm 10mm 14mm;
        }

        .invoice-print-top {
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 10mm;
          align-items: start;
          color: #ffffff;
          min-height: 72mm;
        }

        .invoice-print-logo {
          height: 40mm;
          width: auto;
          filter: brightness(0) invert(1);
          margin-top: -7mm;
          margin-bottom: 0.5mm;
        }

        .invoice-print-company {
          max-width: 84mm;
          padding-top: 0;
          margin-top: -5mm;
        }

        .invoice-print-company-name {
          margin-bottom: 0.8mm;
        }

        .invoice-print-company-address {
          margin-top: 0.5mm;
          white-space: pre-wrap;
          word-break: break-word;
          max-width: 84mm;
        }

        .invoice-print-title-block {
          padding-top: 2mm;
          text-align: left;
        }

        .invoice-print-title {
          text-transform: uppercase;
          margin-bottom: 6mm;
        }

        .invoice-print-meta-row {
          display: flex;
          gap: 4mm;
        }

        .invoice-print-meta-label {
          width: 26mm;
          opacity: 0.78;
        }

        .invoice-print-recipient-wrap {
          margin-top: 5mm;
          margin-bottom: 7mm;
        }

        .invoice-print-recipient-card {
          background: #ffffff;
          border: 0.5pt solid #e5e7eb;
          border-radius: 2mm;
          padding: 4mm 5mm;
          display: grid;
          grid-template-columns: 1fr;
        }

        .invoice-print-section-label {
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 1.5mm;
        }

        .invoice-print-recipient-name {
          margin-bottom: 1mm;
        }

        .invoice-print-muted-line {
          color: #4b5563;
          margin-bottom: 0.8mm;
        }

        .invoice-print-table-wrap {
          margin-bottom: 8mm;
        }

        .invoice-print-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .invoice-print-table thead tr {
          background: #232323;
          color: #ffffff;
        }

        .invoice-print-table th {
          padding: 3mm 2mm;
        }

        .invoice-print-table td {
          padding: 3mm 2mm;
        }

        .invoice-print-table-row {
          border-bottom: 0.5pt solid #d1d5db;
        }

        .invoice-print-bottom-grid {
          display: grid;
          grid-template-columns: 1.12fr 0.88fr;
          gap: 14mm;
          align-items: start;
          margin-top: 0;
        }

        .invoice-print-left-copy {
          color: #374151;
        }

        .invoice-print-copy-box {
          background: #ffffff;
          padding-top: 2mm;
          padding-right: 1mm;
        }

        .invoice-print-copy-section {
          margin-bottom: 4mm;
        }

        .invoice-print-copy-section-large {
          margin-bottom: 8mm;
        }

        .invoice-print-copy-title {
          color: #111827;
          margin-bottom: 1.5mm;
        }

        .invoice-print-terms-text {
          margin-top: 1mm;
          padding-left: 0;
          white-space: pre-wrap;
          color: #374151;
        }

        .invoice-print-total-box {
          background: #ffffff;
          padding: 2mm 0 0 6mm;
        }

        .invoice-print-total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2mm;
        }

        .invoice-print-grand-total {
          background: #232323;
          color: #ffffff;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 3mm 3mm;
          margin-top: 2.5mm;
        }

        .invoice-print-paid-row {
          display: flex;
          justify-content: space-between;
          margin-top: 2.4mm;
        }

        .invoice-print-balance-row {
          display: flex;
          justify-content: space-between;
          margin-top: 2.4mm;
        }

        .invoice-print-signature {
          margin-top: 6mm;
          text-align: center;
          width: 100%;
        }

        .invoice-print-signature-line {
          border-bottom: 0.5pt dashed #6b7280;
          height: 12mm;
          margin-bottom: 1.5mm;
        }

        .invoice-print-footer {
          margin-top: 1mm;
          padding-top: 2mm;
          border-top: 0.5pt solid #e5e7eb;
          background: #ffffff;
        }

        .invoice-print-footer-title {
          color: #111827;
          margin-bottom: 2mm;
        }

        .invoice-print-footer-terms {
          white-space: pre-wrap;
          color: #374151;
          margin-bottom: 3mm;
        }

        .invoice-print-payment-history {
          margin-top: 2mm;
          text-align: right;
          color: #6b7280;
        }

        .invoice-print-thank-you {
          text-align: center;
          text-transform: uppercase;
          color: #111827;
          margin-top: 3mm;
        }

        .invoice-print-text-xs {
          font-size: 6.8pt;
          line-height: 1.5;
        }

        .invoice-print-text-sm {
          font-size: 7pt;
          line-height: 1.45;
        }

        .invoice-print-text-md {
          font-size: 7.2pt;
          line-height: 1.2;
        }

        .invoice-print-text-base {
          font-size: 8pt;
          line-height: 1.65;
        }

        .invoice-print-text-body {
          font-size: 8.3pt;
          line-height: 1.38;
        }

        .invoice-print-text-table {
          font-size: 8.5pt;
          line-height: 1.3;
        }

        .invoice-print-text-total {
          font-size: 9pt;
          line-height: 1.3;
        }

        .invoice-print-text-title-small {
          font-size: 10.5pt;
          line-height: 1.2;
        }

        .invoice-print-text-title {
          font-size: 31pt;
          line-height: 1;
          letter-spacing: 0.09em;
        }

        .invoice-print-weight-light {
          font-weight: 300;
        }

        .invoice-print-weight-medium {
          font-weight: 500;
        }

        .invoice-print-weight-semibold {
          font-weight: 600;
        }

        .invoice-print-weight-bold {
          font-weight: 700;
        }

        .invoice-print-tracking {
          letter-spacing: 0.1em;
        }

        .invoice-print-mono {
          font-family: monospace;
        }
      `}</style>

      <div className="invoice-print-sheet">
        <div className="invoice-print-page">
          <div className="invoice-print-header-bg" />

          <div className="invoice-print-body">
            <div className="invoice-print-top">
              <div>
                <img
                  src="https://leoilrrnwlquunsbulok.supabase.co/storage/v1/object/public/Branding/aixia-logo.png"
                  alt="AiXia"
                  className="invoice-print-logo"
                />

                <div className="invoice-print-company invoice-print-text-body">
                  <div className="invoice-print-company-name invoice-print-text-title-small invoice-print-weight-bold">
                    {companyName}
                  </div>
                  {companyContact ? <div>{companyContact}</div> : null}
                  {companyPhone ? <div>{companyPhone}</div> : null}
                  {companyEmail ? <div>{companyEmail}</div> : null}
                  {companyAddress ? (
                    <div className="invoice-print-company-address invoice-print-text-body">
                      {companyAddress}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="invoice-print-title-block">
                <div className="invoice-print-title invoice-print-text-title invoice-print-weight-light">
                  Invoice
                </div>

                <div className="invoice-print-text-title-small">
                  <div className="invoice-print-meta-row">
                    <span className="invoice-print-meta-label">Invoice No</span>
                    <span className="invoice-print-weight-bold">{invoiceNumber}</span>
                  </div>
                  <div className="invoice-print-meta-row">
                    <span className="invoice-print-meta-label">Issue Date</span>
                    <span>{formatFinanceDate(issueDate)}</span>
                  </div>
                  <div className="invoice-print-meta-row">
                    <span className="invoice-print-meta-label">Due Date</span>
                    <span>{formatFinanceDate(dueDate)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="invoice-print-recipient-wrap">
              <div className="invoice-print-recipient-card">
                <div className="invoice-print-section-label invoice-print-text-md invoice-print-weight-bold invoice-print-tracking">
                  Recipient
                </div>
                <div className="invoice-print-recipient-name invoice-print-text-title-small invoice-print-weight-bold">
                  {counterpartyName}
                </div>
                {counterpartyContact ? (
                  <div className="invoice-print-muted-line invoice-print-text-body">
                    {counterpartyContact}
                  </div>
                ) : null}
                {counterpartyEmail || counterpartyPhone ? (
                  <div className="invoice-print-muted-line invoice-print-text-base">
                    {[counterpartyEmail, counterpartyPhone].filter(Boolean).join(" • ")}
                  </div>
                ) : null}
                <div className="invoice-print-text-body" style={{ color: "#4b5563" }}>
                  {billingAddress}
                </div>
              </div>
            </div>

            <div className="invoice-print-table-wrap">
              <table className="invoice-print-table invoice-print-text-table">
                <thead>
                  <tr>
                    <th style={{ width: "9%", textAlign: "center" }}>No</th>
                    <th style={{ width: "49%", textAlign: "left", paddingLeft: "3mm" }}>
                      Item Description
                    </th>
                    <th style={{ width: "15%", textAlign: "right" }}>Unit Price</th>
                    <th style={{ width: "12%", textAlign: "right" }}>Quantity</th>
                    <th style={{ width: "15%", textAlign: "right" }}>Value</th>
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
                      <tr key={item.id || index} className="invoice-print-table-row">
                        <td style={{ textAlign: "center" }}>{index + 1}</td>
                        <td style={{ paddingLeft: "3mm", verticalAlign: "top" }}>
                          <div className="invoice-print-weight-medium">
                            {item.description || "—"}
                          </div>
                        </td>
                        <td className="invoice-print-mono" style={{ textAlign: "right" }}>
                          {formatFinanceMoney(unitPrice, currency)}
                        </td>
                        <td className="invoice-print-mono" style={{ textAlign: "right" }}>
                          {quantity}
                        </td>
                        <td
                          className="invoice-print-mono invoice-print-weight-bold"
                          style={{ textAlign: "right" }}
                        >
                          {formatFinanceMoney(value, currency)}
                        </td>
                      </tr>
                    );
                  })}

                  {Array.from({ length: fillerRows }).map((_, index) => (
                    <tr key={`filler-${index}`} className="invoice-print-table-row">
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

            <div className="invoice-print-bottom-grid">
              <div className="invoice-print-left-copy invoice-print-text-base">
                <div className="invoice-print-copy-box">
                  <div className="invoice-print-copy-section">
                    <div className="invoice-print-copy-title invoice-print-text-total invoice-print-weight-bold">
                      Payment and Shipping Terms
                    </div>
                    <div>
                      <div>
                        <span style={{ color: "#6b7280" }}>Payment Terms: </span>
                        <span className="invoice-print-weight-medium">{paymentTerms}</span>
                      </div>

                      {paymentTermsText ? (
                        <div className="invoice-print-terms-text invoice-print-text-body">
                          {paymentTermsText}
                        </div>
                      ) : null}

                      <div style={{ marginTop: paymentTermsText ? "1.2mm" : "0mm" }}>
                        <span style={{ color: "#6b7280" }}>Shipping Terms: </span>
                        <span className="invoice-print-weight-medium">{shippingTerms}</span>
                      </div>
                      <div>
                        <span style={{ color: "#6b7280" }}>Currency: </span>
                        <span className="invoice-print-weight-medium">{currency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="invoice-print-copy-section-large">
                    <div className="invoice-print-copy-title invoice-print-text-total invoice-print-weight-bold">
                      Bank Details
                    </div>

                    {bankInfo ? (
                      <div>
                        {bankInfo.beneficiary ? (
                          <div>
                            <span style={{ color: "#6b7280" }}>Beneficiary: </span>
                            <span className="invoice-print-weight-semibold">
                              {bankInfo.beneficiary}
                            </span>
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
                            <span className="invoice-print-mono invoice-print-weight-semibold">
                              {bankInfo.accountNumber}
                            </span>
                          </div>
                        ) : null}
                        {bankInfo.swift ? (
                          <div>
                            <span style={{ color: "#6b7280" }}>SWIFT Code: </span>
                            <span className="invoice-print-mono invoice-print-weight-semibold">
                              {bankInfo.swift}
                            </span>
                          </div>
                        ) : null}
                        {bankInfo.iban ? (
                          <div>
                            <span style={{ color: "#6b7280" }}>IBAN: </span>
                            <span className="invoice-print-mono invoice-print-weight-semibold">
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
                <div className="invoice-print-total-box">
                  <div className="invoice-print-total-row invoice-print-text-total">
                    <span>SUB TOTAL</span>
                    <span className="invoice-print-mono">
                      {formatFinanceMoney(financialSummary?.subtotal || 0, currency)}
                    </span>
                  </div>

                  <div className="invoice-print-total-row invoice-print-text-total">
                    <span>TAX / VAT</span>
                    <span className="invoice-print-mono">
                      {formatFinanceMoney(financialSummary?.tax || 0, currency)}
                    </span>
                  </div>

                  <div className="invoice-print-total-row invoice-print-text-total">
                    <span>DISCOUNT</span>
                    <span className="invoice-print-mono">
                      {formatFinanceMoney(financialSummary?.discount || 0, currency)}
                    </span>
                  </div>

                  <div className="invoice-print-grand-total">
                    <span className="invoice-print-text-title-small invoice-print-weight-bold">
                      Grand Total
                    </span>
                    <span className="invoice-print-mono invoice-print-text-title-small invoice-print-weight-bold">
                      {formatFinanceMoney(financialSummary?.total || 0, currency)}
                    </span>
                  </div>

                  {(financialSummary?.paid || 0) > 0 ? (
                    <div className="invoice-print-paid-row invoice-print-text-body">
                      <span>PAID</span>
                      <span className="invoice-print-mono">
                        {formatFinanceMoney(financialSummary?.paid || 0, currency)}
                      </span>
                    </div>
                  ) : null}

                  <div className="invoice-print-balance-row invoice-print-text-total invoice-print-weight-bold">
                    <span>BALANCE DUE</span>
                    <span className="invoice-print-mono">
                      {formatFinanceMoney(financialSummary?.balance || 0, currency)}
                    </span>
                  </div>

                  <div className="invoice-print-signature">
                    <div className="invoice-print-signature-line" />
                    <div className="invoice-print-text-base" style={{ color: "#374151" }}>
                      Signature
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="invoice-print-footer">
              <div className="invoice-print-footer-title invoice-print-text-total invoice-print-weight-bold">
                Terms and Conditions
              </div>

              <div className="invoice-print-footer-terms invoice-print-text-sm">
                {termsAndConditions}
              </div>

              {payments?.length > 0 ? (
                <div className="invoice-print-payment-history invoice-print-text-xs">
                  {payments.map((payment: any, index: number) => (
                    <div key={payment.id || index}>
                      {formatFinanceDate(payment.payment_date)} ·{" "}
                      {formatFinanceMoney(payment.amount, currency)}
                      {payment.reference_number ? ` · ${payment.reference_number}` : ""}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="invoice-print-thank-you invoice-print-text-title-small invoice-print-weight-bold">
                Thank You For Your Business
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
