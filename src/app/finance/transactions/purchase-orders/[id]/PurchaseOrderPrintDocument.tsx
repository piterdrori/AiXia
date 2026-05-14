type PurchaseOrderPrintProps = {
  purchaseOrder: any;
  lineItems: any[];
  financialSummary: {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  } | null;
};

const DEFAULT_PO_TERMS =
  "This purchase order is issued subject to the agreed commercial terms, delivery terms, quality requirements, and supplier obligations. The supplier must reference the purchase order number on all related proforma invoices, invoices, packing lists, delivery notes, and correspondence. Any changes to price, quantity, delivery date, payment terms, bank details, or shipment terms must be approved in writing before execution.";

function formatPrintDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPrintMoney(value: number | string | null | undefined, currency = "USD") {
  const parsed = Number(value ?? 0);
  const amount = Number.isFinite(parsed) ? parsed : 0;

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function toPrintNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeLines(lines: string[] | string | null | undefined) {
  if (!lines) return [];

  if (Array.isArray(lines)) {
    return lines.map((line) => String(line || "").trim()).filter(Boolean);
  }

  return String(lines)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function resolveMetadataObject(metadata: any, key: string) {
  const value = metadata?.[key];

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value;
}

function getLineValue(item: any) {
  const unitPrice = toPrintNumber(item.unitPrice ?? item.unit_price);
  const quantity = toPrintNumber(item.quantity);
  const discount = toPrintNumber(item.discount);

  return item.lineTotal ?? item.line_total ?? Math.max(quantity * unitPrice - discount, 0);
}

export default function PurchaseOrderPrintDocument({
  purchaseOrder,
  lineItems,
  financialSummary,
}: PurchaseOrderPrintProps) {
  const metadata = purchaseOrder?.metadata || {};
  const companySnapshot = resolveMetadataObject(metadata, "company_snapshot");
  const vendorSnapshot = resolveMetadataObject(metadata, "vendor_snapshot");
  const vendorBankSnapshot = resolveMetadataObject(metadata, "vendor_bank_snapshot");
  const paymentTermsSnapshot = resolveMetadataObject(metadata, "payment_terms_snapshot");
  const shippingTermsSnapshot = resolveMetadataObject(metadata, "shipping_terms_snapshot");

  const currency =
    purchaseOrder?.currency_code ||
    metadata?.currency_code ||
    companySnapshot?.currency_code ||
    vendorSnapshot?.currency_code ||
    "USD";

  const companyName =
    companySnapshot?.legal_name ||
    companySnapshot?.name ||
    purchaseOrder?.company_name ||
    "—";

  const companyContact = companySnapshot?.contact_person || purchaseOrder?.company_contact_person || "";
  const companyEmail = companySnapshot?.email || purchaseOrder?.company_email || "";
  const companyPhone = companySnapshot?.phone || purchaseOrder?.company_phone || "";
  const companyAddress = companySnapshot?.address || purchaseOrder?.company_address || "";

  const vendorName =
    vendorSnapshot?.legal_name ||
    vendorSnapshot?.name ||
    purchaseOrder?.vendor_name ||
    "—";

  const vendorContact = vendorSnapshot?.contact_person || purchaseOrder?.vendor_contact_person || "";
  const vendorEmail = vendorSnapshot?.email || purchaseOrder?.vendor_email || "";
  const vendorPhone = vendorSnapshot?.phone || purchaseOrder?.vendor_phone || "";
  const vendorAddress = vendorSnapshot?.address || purchaseOrder?.vendor_address || "—";

  const purchaseOrderNumber = purchaseOrder?.purchase_order_number || "Draft PO";
  const issueDate = purchaseOrder?.issued_at || purchaseOrder?.po_date || null;
  const expectedDeliveryDate = purchaseOrder?.expected_delivery_date || null;

  const paymentTerms =
    paymentTermsSnapshot?.document_label ||
    paymentTermsSnapshot?.name ||
    purchaseOrder?.payment_terms_snapshot ||
    "—";

  const paymentTermsText =
    paymentTermsSnapshot?.document_terms_text ||
    purchaseOrder?.payment_terms_document_text ||
    "";

  const shippingTerms =
    shippingTermsSnapshot?.label ||
    shippingTermsSnapshot?.name ||
    purchaseOrder?.shipping_terms_snapshot ||
    "Not specified";

  const termsAndConditions =
    metadata?.terms_and_conditions_snapshot ||
    metadata?.purchase_order_terms_and_conditions ||
    DEFAULT_PO_TERMS;

  const bankLines = normalizeLines(
    vendorBankSnapshot?.lines ||
      vendorBankSnapshot?.details ||
      purchaseOrder?.vendor_bank_details_snapshot
  );

  const rows = Array.isArray(lineItems) ? lineItems : [];
  const visibleRows = rows.slice(0, 8);
  const fillerRows = Math.max(0, 3 - visibleRows.length);

  const subtotal = financialSummary?.subtotal ?? purchaseOrder?.subtotal ?? 0;
  const discount = financialSummary?.discount ?? metadata?.discount_amount ?? 0;
  const tax = financialSummary?.tax ?? metadata?.tax_amount ?? 0;
  const total = financialSummary?.total ?? purchaseOrder?.total_amount ?? 0;

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

          .purchase-order-print-sheet,
          .purchase-order-print-sheet * {
            visibility: visible !important;
          }

          .purchase-order-print-sheet {
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
          .purchase-order-print-sheet {
            display: none !important;
          }
        }
      `}</style>

      <div className="purchase-order-print-sheet">
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
                  {companyAddress ? <div className="aixia-print-address">{companyAddress}</div> : null}
                </div>
              </div>

              <div className="aixia-print-document-heading">
                <div className="aixia-print-title">Purchase Order</div>

                <div className="aixia-print-document-meta">
                  <div className="aixia-print-meta-row">
                    <span>PO No</span>
                    <strong>{purchaseOrderNumber}</strong>
                  </div>
                  <div className="aixia-print-meta-row">
                    <span>PO Date</span>
                    <strong>{formatPrintDate(issueDate)}</strong>
                  </div>
                  <div className="aixia-print-meta-row">
                    <span>Expected Delivery</span>
                    <strong>{formatPrintDate(expectedDeliveryDate)}</strong>
                  </div>
                  <div className="aixia-print-meta-row">
                    <span>Status</span>
                    <strong>{String(purchaseOrder?.status || "draft").replaceAll("_", " ")}</strong>
                  </div>
                </div>
              </div>
            </div>

            <section className="aixia-print-card aixia-print-recipient-card">
              <div className="aixia-print-label">Supplier / Vendor</div>
              <div className="aixia-print-recipient-name">{vendorName}</div>
              {vendorContact ? <div>{vendorContact}</div> : null}
              {vendorEmail || vendorPhone ? (
                <div>{[vendorEmail, vendorPhone].filter(Boolean).join(" • ")}</div>
              ) : null}
              <div className="aixia-print-address">{vendorAddress}</div>
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
                  const unitPrice = toPrintNumber(item.unitPrice ?? item.unit_price);
                  const quantity = toPrintNumber(item.quantity);
                  const value = getLineValue(item);

                  return (
                    <tr key={item.id || index}>
                      <td>{index + 1}</td>
                      <td>{item.description || "—"}</td>
                      <td className="aixia-print-money">{formatPrintMoney(unitPrice, currency)}</td>
                      <td className="aixia-print-money">{quantity}</td>
                      <td className="aixia-print-money aixia-print-strong">
                        {formatPrintMoney(value, currency)}
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
                {paymentTermsText ? <div className="aixia-print-paragraph">{paymentTermsText}</div> : null}
                <div className="aixia-print-term-line">
                  <span>Shipping Terms: </span>
                  <strong>{shippingTerms}</strong>
                </div>
                <div className="aixia-print-term-line">
                  <span>Currency: </span>
                  <strong>{currency}</strong>
                </div>

                <div className="aixia-print-section-title aixia-print-bank-title">
                  Vendor Bank Details
                </div>
                {bankLines.length > 0 ? (
                  <div className="aixia-print-bank-details">
                    {bankLines.map((line, index) => (
                      <div key={`${line}-${index}`}>{line}</div>
                    ))}
                  </div>
                ) : (
                  <div>No vendor bank details available.</div>
                )}
              </section>

              <section className="aixia-print-summary-block">
                <div className="aixia-print-total-row">
                  <span>SUB TOTAL</span>
                  <strong className="aixia-print-money">{formatPrintMoney(subtotal, currency)}</strong>
                </div>
                <div className="aixia-print-total-row">
                  <span>TAX / VAT</span>
                  <strong className="aixia-print-money">{formatPrintMoney(tax, currency)}</strong>
                </div>
                <div className="aixia-print-total-row">
                  <span>DISCOUNT</span>
                  <strong className="aixia-print-money">{formatPrintMoney(discount, currency)}</strong>
                </div>
                <div className="aixia-print-grand-total-row">
                  <span>Grand Total</span>
                  <strong className="aixia-print-money">{formatPrintMoney(total, currency)}</strong>
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
              <div className="aixia-print-thank-you">Purchase Order Issued By AiXia</div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
