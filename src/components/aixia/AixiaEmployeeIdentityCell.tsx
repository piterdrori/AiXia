import { AixiaTableTextCell } from "./AixiaTableCells";

type AixiaEmployeeIdentityCellProps = {
  primary: string;
  secondary?: string;
  reference?: string;
  width?: "sm" | "md" | "lg" | "xl";
};

function isBadPrimary(value: string) {
  return (
    /^EMP-[0-9]+/i.test(value.trim()) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim()
    )
  );
}

export function AixiaEmployeeIdentityCell({
  primary,
  secondary,
  reference,
  width = "lg",
}: AixiaEmployeeIdentityCellProps) {
  const cleanPrimary = primary && !isBadPrimary(primary) ? primary : "Unresolved employee";

  const cleanSecondary = [secondary, reference ? `Ref: ${reference}` : ""]
    .filter(Boolean)
    .join(" • ");

  return (
    <AixiaTableTextCell
      width={width}
      primary={cleanPrimary}
      secondary={cleanSecondary || "No role/company saved"}
    />
  );
}
