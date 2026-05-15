import type { ReactNode } from "react";

type AixiaTableTextCellWidth = "sm" | "md" | "lg" | "xl";

type AixiaTableTextCellProps = {
  primary: ReactNode;
  secondary?: ReactNode;
  width?: AixiaTableTextCellWidth;
};

type AixiaTableBadgeCellProps = {
  children: ReactNode;
  width?: AixiaTableTextCellWidth;
};

type AixiaTableDateCellProps = {
  children: ReactNode;
  width?: AixiaTableTextCellWidth;
};

type AixiaTableActionsCellProps = {
  children: ReactNode;
};

function getWidthClass(width: AixiaTableTextCellWidth) {
  if (width === "sm") return "min-w-[130px]";
  if (width === "lg") return "min-w-[230px]";
  if (width === "xl") return "min-w-[260px]";

  return "min-w-[180px]";
}

export function AixiaTableTextCell({
  primary,
  secondary,
  width = "md",
}: AixiaTableTextCellProps) {
  return (
    <td className={`aixia-table-cell-text ${getWidthClass(width)}`}>
      <div className="aixia-table-primary-text">{primary}</div>
      {secondary ? <div className="aixia-table-secondary-text">{secondary}</div> : null}
    </td>
  );
}

export function AixiaTableBadgeCell({
  children,
  width = "sm",
}: AixiaTableBadgeCellProps) {
  return (
    <td className={`aixia-table-cell-badge ${getWidthClass(width)}`}>
      {children}
    </td>
  );
}

export function AixiaTableDateCell({
  children,
  width = "sm",
}: AixiaTableDateCellProps) {
  return (
    <td className={`aixia-table-cell-date ${getWidthClass(width)}`}>
      {children}
    </td>
  );
}

export function AixiaTableActionsCell({ children }: AixiaTableActionsCellProps) {
  return (
    <td className="aixia-table-cell-actions">
      <div className="aixia-table-actions">{children}</div>
    </td>
  );
}
