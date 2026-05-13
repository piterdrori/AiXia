import type { ReactNode } from "react";
import { ArrowUpDown } from "lucide-react";

type SortDirection = "asc" | "desc";
type AixiaTableShellVariant = "registry" | "archive" | "default";

type AixiaTableShellProps = {
  children: ReactNode;
  minWidthClassName?: string;
  maxHeightClassName?: string;
  variant?: AixiaTableShellVariant;
};

type AixiaSortableHeaderProps<TSortKey extends string> = {
  label: string;
  sortKey: TSortKey;
  activeSortKey: TSortKey;
  sortDirection: SortDirection;
  onSort: (sortKey: TSortKey) => void;
  align?: "left" | "center" | "right";
};

export function AixiaTableShell({
  children,
  minWidthClassName,
  maxHeightClassName = "max-h-[690px]",
  variant = "default",
}: AixiaTableShellProps) {
  const resolvedMinWidthClassName =
    minWidthClassName ??
    (variant === "registry"
      ? "min-w-[1240px]"
      : variant === "archive"
        ? "min-w-[1780px]"
        : "min-w-max");

  return (
    <div
      className="aixia-table-wrap aixia-scrollbar"
      data-table-variant={variant}
    >
      <div
        className={`aixia-table-scroll aixia-scrollbar ${maxHeightClassName}`}
      >
        <table className={`aixia-table ${resolvedMinWidthClassName}`}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function AixiaSortableHeader<TSortKey extends string>({
  label,
  sortKey,
  activeSortKey,
  sortDirection,
  onSort,
  align = "center",
}: AixiaSortableHeaderProps<TSortKey>) {
  const isActive = activeSortKey === sortKey;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`aixia-sortable-header ${
        isActive ? "is-active" : ""
      } ${
        align === "right"
          ? "justify-end text-right"
          : align === "left"
            ? "justify-start text-left"
            : "justify-center text-center"
      }`}
    >
      {label}
      <ArrowUpDown
        className={`h-3.5 w-3.5 transition ${
          isActive && sortDirection === "desc" ? "rotate-180" : ""
        }`}
      />
    </button>
  );
}
