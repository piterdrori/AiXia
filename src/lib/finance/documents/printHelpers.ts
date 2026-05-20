export type ParsedBankDetails = {
  beneficiary: string;
  bank: string;
  bankAddress: string;
  accountNumber: string;
  iban: string;
  swift: string;
  currency: string;
};

export function toPrintNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isUuidLike(value: unknown) {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
}

export function parseBankDetails(
  details: string | null | undefined,
): ParsedBankDetails | null {
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
          entry.toLowerCase().startsWith(`${label.toLowerCase()}:`),
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

export function getLineTotalValue(item: {
  unitPrice?: number | string | null;
  unit_price?: number | string | null;
  quantity?: number | string | null;
  discount?: number | string | null;
  line_discount_amount?: number | string | null;
  lineTotal?: number | string | null;
  line_total?: number | string | null;
}) {
  const unitPrice = toPrintNumber(item.unitPrice ?? item.unit_price);
  const quantity = toPrintNumber(item.quantity);
  const discount = toPrintNumber(item.discount ?? item.line_discount_amount);

  return (
    item.lineTotal ??
    item.line_total ??
    Math.max(quantity * unitPrice - discount, 0)
  );
}
