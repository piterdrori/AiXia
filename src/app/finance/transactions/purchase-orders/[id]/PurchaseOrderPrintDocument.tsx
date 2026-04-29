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
    return lines
      .map((line) => String(line || "").trim())
      .filter(Boolean);
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

export default function PurchaseOrderPrintDocument({
  purchaseOrder,
  lineItems,
  financialSummary,
}: PurchaseOrderPrintProps) {
  const metadata = purchaseOrder?.metadata || {};
  const companySnapshot = resolveMetadataObject(metadata, "company_snapshot");
  const vendorSnapshot = resolveMetadataObject(metadata, "vendor_snapshot");
  const vendorBankSnapshot = resolveMetadataObject(
    metadata,
    "vendor_bank_snapshot"
  );
  const paymentTermsSnapshot = resolveMetadataObject(
    metadata,
    "payment_terms_snapshot"
  );
  const shippingTermsSnapshot = resolveMetadataObject(
    metadata,
    "shipping_terms_snapshot"
  );

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

  const companyContact =
    companySnapshot?.contact_person ||
    purchaseOrder?.company_contact_person ||
    "";

  const companyEmail =
    companySnapshot?.email ||
    purchaseOrder?.company_email ||
    "";

  const companyPhone =
    companySnapshot?.phone ||
    purchaseOrder?.company_phone ||
    "";

  const companyAddress =
    companySnapshot?.address ||
    purchaseOrder?.company_address ||
    "";

  const vendorName =
    vendorSnapshot?.legal_name ||
    vendorSnapshot?.name ||
    purchaseOrder?.vendor_name ||
    "—";

  const vendorContact =
    vendorSnapshot?.contact_person ||
    purchaseOrder?.vendor_contact_person ||
    "";

  const vendorEmail =
    vendorSnapshot?.email ||
    purchaseOrder?.vendor_email ||
    "";

  const vendorPhone =
    vendorSnapshot?.phone ||
    purchaseOrder?.vendor_phone ||
    "";

  const vendorAddress =
    vendorSnapshot?.address ||
    purchaseOrder?.vendor_address ||
    "—";

  const purchaseOrderNumber =
    purchaseOrder?.purchase_order_number || "Draft PO";

  const issueDate =
    purchaseOrder?.issued_at ||
    purchaseOrder?.po_date ||
    null;

  const expectedDeliveryDate =
    purchaseOrder?.expected_delivery_date || null;

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
          html, body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * { visibility: hidden !important; }
          .purchase-order-print-sheet, .purchase-order-print-sheet * {
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
                    fontSize: "25pt",
                    fontWeight: 300,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: "6mm",
                    lineHeight: 1.05,
                  }}
                >
                  Purchase Order
                </div>

                <div style={{ fontSize: "10pt", lineHeight: 1.95 }}>
                  <div style={{ display: "flex", gap: "4mm" }}>
                    <span style={{ width: "31mm", opacity: 0.78 }}>PO No</span>
                    <span style={{ fontWeight: 700 }}>
                      {purchaseOrderNumber}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "4mm" }}>
                    <span style={{ width: "31mm", opacity: 0.78 }}>PO Date</span>
                    <span>{formatPrintDate(issueDate)}</span>
                  </div>

                  <div style={{ display: "flex", gap: "4mm" }}>
                    <span style={{ width: "31mm", opacity: 0.78 }}>
                      Expected Delivery
                    </span>
                    <span>{formatPrintDate(expectedDeliveryDate)}</span>
                  </div>

                  <div style={{ display: "flex", gap: "4mm" }}>
                    <span style={{ width: "31mm", opacity: 0.78 }}>Status</span>
                    <span style={{ textTransform: "capitalize" }}>
                      {String(purchaseOrder?.status || "draft").replaceAll(
                        "_",
                        " "
                      )}
                    </span>
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
                  Supplier / Vendor
                </div>

                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "11pt",
                    marginBottom: "1mm",
                  }}
                >
                  {vendorName}
                </div>

                {vendorContact ? (
                  <div
                    style={{
                      fontSize: "8.3pt",
                      color: "#4b5563",
                      marginBottom: "0.8mm",
                    }}
                  >
                    {vendorContact}
                  </div>
                ) : null}

                {vendorEmail || vendorPhone ? (
                  <div
                    style={{
                      fontSize: "8.1pt",
                      color: "#4b5563",
                      marginBottom: "0.8mm",
                    }}
                  >
                    {[vendorEmail, vendorPhone].filter(Boolean).join(" • ")}
                  </div>
                ) : null}

                <div
                  style={{
                    fontSize: "8.3pt",
                    color: "#4b5563",
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {vendorAddress}
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
                    const unitPrice = toPrintNumber(
                      item.unitPrice ?? item.unit_price
                    );
                    const quantity = toPrintNumber(item.quantity);
                    const discount = toPrintNumber(item.discount);
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
                          <div style={{ fontWeight: 500 }}>
                            {item.description || "—"}
                          </div>
                        </td>

                        <td
                          style={{
                            padding: "3mm 2mm",
                            textAlign: "right",
                            fontFamily: "monospace",
                          }}
                        >
                          {formatPrintMoney(unitPrice, currency)}
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
                          {formatPrintMoney(value, currency)}
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
                        <span style={{ color: "#6b7280" }}>
                          Payment Terms:{" "}
                        </span>
                        <span style={{ fontWeight: 500 }}>
                          {paymentTerms}
                        </span>
                      </div>

                      {paymentTermsText ? (
                        <div
                          style={{
                            marginTop: "1mm",
                            lineHeight: 1.55,
                            whiteSpace: "pre-wrap",
                            color: "#374151",
                          }}
                        >
                          {paymentTermsText}
                        </div>
                      ) : null}

                      <div
                        style={{
                          marginTop: paymentTermsText ? "1.2mm" : "0mm",
                        }}
                      >
                        <span style={{ color: "#6b7280" }}>
                          Shipping Terms:{" "}
                        </span>
                        <span style={{ fontWeight: 500 }}>
                          {shippingTerms}
                        </span>
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
                      Vendor Bank Details
                    </div>

                    {bankLines.length > 0 ? (
                      <div style={{ lineHeight: 1.65 }}>
                        {bankLines.map((line, index) => (
                          <div key={`${line}-${index}`}>{line}</div>
                        ))}
                      </div>
                    ) : (
                      <div>No vendor bank details available.</div>
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
                      {formatPrintMoney(subtotal, currency)}
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
                      {formatPrintMoney(tax, currency)}
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
                      {formatPrintMoney(discount, currency)}
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
                      {formatPrintMoney(total, currency)}
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
                    <div style={{ fontSize: "8pt", color: "#374151" }}>
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
                Purchase Order Issued By AiXia
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
