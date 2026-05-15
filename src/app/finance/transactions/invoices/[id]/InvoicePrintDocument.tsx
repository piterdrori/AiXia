import {
  AixiaFinancePrintBankBlock,
  AixiaFinancePrintBottomGrid,
  AixiaFinancePrintFooter,
  AixiaFinancePrintHeader,
  AixiaFinancePrintLineTable,
  AixiaFinancePrintPartyBlock,
  AixiaFinancePrintSheet,
  AixiaFinancePrintTermsBlock,
  AixiaFinancePrintTotalsBlock,
  type AixiaFinancePrintBankRow,
  type AixiaFinancePrintLineItem,
  type AixiaFinancePrintMetaRow,
  type AixiaFinancePrintTermRow,
  type AixiaFinancePrintTotalRow,
} from "@/components/aixia";
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

type ParsedBankDetails = {
  beneficiary: string;
  bank: string;
  bankAddress: string;
  accountNumber: string;
  iban: string;
  swift: string;
  currency: string;
};

function parseBankDetails(details: string | null | undefined): ParsedBankDetails | null {
  if (!details) return null;

  try {
    const parsed = JSON.parse(details);

    return {
      beneficiary: parsed?.beneficiary_name || "",
      bank: parsed?.bank_name || parsed?.institution_name || "",
      bankAddress: parsed?.bank_address || "",
      accountNumber:
        parsed?.account_number ||
        parsed?.account_identifier_value ||
        parsed?.masked_account_number ||
        "",
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
      beneficiary: unlabeledLines[0] || labeledValue("Beneficiary"),
      bank: unlabeledLines[1] || labeledValue("Bank"),
      bankAddress: unlabeledLines[2] || labeledValue("Bank Address"),
      accountNumber: labeledValue("Account"),
      iban: labeledValue("IBAN"),
      swift: labeledValue("SWIFT"),
      currency: labeledValue("Currency"),
    };
  }
}

function isUuidLike(value: unknown) {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getLineValue(item: any) {
  const unitPrice = toNumber(item.unitPrice ?? item.unit_price);
  const quantity = toNumber(item.quantity);
  const discount = toNumber(item.discount ?? item.line_discount_amount);

  return (
    item.lineTotal ??
    item.line_total ??
    Math.max(quantity * unitPrice - discount, 0)
  );
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
    "";

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
    "";

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
    "";

  const invoiceNumber = invoice?.invoice_number || "Draft";
  const issueDate = invoice?.issue_date || invoice?.issued_at || null;
  const dueDate = invoice?.due_date || null;

  const bankInfo = parseBankDetails(invoice?.bank_details_snapshot);

  const paymentTerms =
    invoice?.payment_terms_snapshot ||
    invoice?.payment_terms_label ||
    invoice?.payment_term_name ||
    "";

  const paymentTermsText =
    invoice?.payment_terms_document_text ||
    invoice?.payment_terms_text_snapshot ||
    invoice?.payment_terms_description ||
    invoice?.payment_terms_text ||
    "";

  const shippingTerms =
    invoice?.shipping_terms_snapshot && !isUuidLike(invoice.shipping_terms_snapshot)
      ? invoice.shipping_terms_snapshot
      : invoice?.shipping_term_label || invoice?.shipping_term_name || "";

  const termsAndConditions =
    invoice?.terms_and_conditions_snapshot || DEFAULT_TERMS;

  const printLines: AixiaFinancePrintLineItem[] = Array.isArray(lineItems)
    ? lineItems.map((item, index) => {
        const unitPrice = toNumber(item.unitPrice ?? item.unit_price);
        const quantity = toNumber(item.quantity);
        const value = getLineValue(item);

        return {
          id: item.id || index,
          description: item.description || item.item_name || item.name || "—",
          unitPrice: formatFinanceMoney(unitPrice, currency),
          quantity,
          value: formatFinanceMoney(value, currency),
        };
      })
    : [];

  const metaRows: AixiaFinancePrintMetaRow[] = [
    {
      label: "Invoice No",
      value: invoiceNumber,
    },
    {
      label: "Issue Date",
      value: issueDate ? formatFinanceDate(issueDate) : undefined,
    },
    {
      label: "Due Date",
      value: dueDate ? formatFinanceDate(dueDate) : undefined,
    },
  ];

  const termRows: AixiaFinancePrintTermRow[] = [
    {
      label: "Payment Terms",
      value: paymentTerms,
      detail: paymentTermsText,
    },
    {
      label: "Shipping Terms",
      value: shippingTerms,
    },
    {
      label: "Currency",
      value: currency,
    },
  ];

  const bankRows: AixiaFinancePrintBankRow[] = bankInfo
    ? [
        {
          label: "Beneficiary",
          value: bankInfo.beneficiary,
        },
        {
          label: "Beneficiary Bank Name",
          value: bankInfo.bank,
        },
        {
          label: "Beneficiary Bank Address",
          value: bankInfo.bankAddress,
        },
        {
          label: "Bank Account",
          value: bankInfo.accountNumber,
          monospace: true,
        },
        {
          label: "SWIFT Code",
          value: bankInfo.swift,
          monospace: true,
        },
        {
          label: "IBAN",
          value: bankInfo.iban,
          monospace: true,
        },
        {
          label: "Bank Currency",
          value: bankInfo.currency,
        },
      ]
    : [];

  const paidAmount = toNumber(financialSummary?.paid);
  const balanceAmount = toNumber(financialSummary?.balance);

  const totalRows: AixiaFinancePrintTotalRow[] = [
    {
      label: "SUB TOTAL",
      value: formatFinanceMoney(financialSummary?.subtotal || 0, currency),
    },
    {
      label: "TAX / VAT",
      value: formatFinanceMoney(financialSummary?.tax || 0, currency),
    },
    {
      label: "DISCOUNT",
      value: formatFinanceMoney(financialSummary?.discount || 0, currency),
    },
    {
      label: "Grand Total",
      value: formatFinanceMoney(financialSummary?.total || 0, currency),
      highlight: true,
    },
    ...(paidAmount > 0
      ? [
          {
            label: "PAID",
            value: formatFinanceMoney(paidAmount, currency),
          },
        ]
      : []),
    ...(financialSummary?.balance !== null && financialSummary?.balance !== undefined
      ? [
          {
            label: "BALANCE DUE",
            value: formatFinanceMoney(balanceAmount, currency),
          },
        ]
      : []),
  ];

  const paymentHistory =
    payments?.length > 0 ? (
      <>
        {payments.map((payment: any, index: number) => (
          <div key={payment.id || index}>
            {formatFinanceDate(payment.payment_date)} ·{" "}
            {formatFinanceMoney(payment.amount, currency)}
            {payment.reference_number ? ` · ${payment.reference_number}` : ""}
          </div>
        ))}
      </>
    ) : null;

  return (
    <AixiaFinancePrintSheet>
      <AixiaFinancePrintHeader
        documentTitle="Invoice"
        companyName={companyName}
        companyContact={companyContact}
        companyPhone={companyPhone}
        companyEmail={companyEmail}
        companyAddress={companyAddress}
        metaRows={metaRows}
      />

      <AixiaFinancePrintPartyBlock
        party={{
          label: "Recipient",
          name: counterpartyName,
          contact: counterpartyContact,
          email: counterpartyEmail,
          phone: counterpartyPhone,
          address: billingAddress,
        }}
      />

      <AixiaFinancePrintLineTable items={printLines} />

      <AixiaFinancePrintBottomGrid
        left={
          <>
            <AixiaFinancePrintTermsBlock rows={termRows} />
            <AixiaFinancePrintBankBlock rows={bankRows} />
          </>
        }
        right={
          <AixiaFinancePrintTotalsBlock
            rows={totalRows}
            signatureLabel="Signature"
          />
        }
      />

      <AixiaFinancePrintFooter
        terms={termsAndConditions}
        history={paymentHistory}
        thankYou="Thank You For Your Business"
      />
    </AixiaFinancePrintSheet>
  );
}
