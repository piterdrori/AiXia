import {
  getFinanceEmployeePrimaryName,
  getFinanceEmployeeReferenceLabel,
  getFinanceEmployeeSecondaryLabel,
  isPollutedEmployeeDisplay,
  type FinanceEmployeeIdentity,
} from "@/lib/finance/employeeIdentity";

import { AixiaTableTextCell } from "./AixiaTableCells";

type AixiaEmployeeIdentityCellProps = {
  identity?: FinanceEmployeeIdentity | null;
  primary?: string | null;
  secondary?: string | null;
  reference?: string | null;
  width?: "sm" | "md" | "lg" | "xl";
};

function cleanText(value: string | null | undefined) {
  return (value || "").trim();
}

export function AixiaEmployeeIdentityCell({
  identity,
  primary,
  secondary,
  reference,
  width = "lg",
}: AixiaEmployeeIdentityCellProps) {
  const resolvedPrimary = identity
    ? getFinanceEmployeePrimaryName(identity, primary)
    : cleanText(primary) && !isPollutedEmployeeDisplay(primary)
      ? cleanText(primary)
      : "Unresolved employee";

  const resolvedSecondary = identity
    ? getFinanceEmployeeSecondaryLabel(identity)
    : cleanText(secondary) || "No role/company saved";

  const resolvedReference = identity
    ? getFinanceEmployeeReferenceLabel(identity)
    : cleanText(reference);

  const cleanSecondary = [
    resolvedSecondary,
    resolvedReference ? `Ref: ${resolvedReference}` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <AixiaTableTextCell
      width={width}
      primary={resolvedPrimary}
      secondary={cleanSecondary || "No role/company saved"}
    />
  );
}
