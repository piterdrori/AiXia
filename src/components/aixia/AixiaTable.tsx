import type { ReactNode } from "react";
import { ArrowUpDown } from "lucide-react";

type SortDirection = "asc" | "desc";

type AixiaTableShellProps = {
  children: ReactNode;
  minWidthClassName?: string;
  maxHeightClassName?: string;
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
  minWidthClassName = "min-w-max",
  maxHeightClassName = "max-h-[690px]",
}: AixiaTableShellProps) {
  return (
    <div className="aixia-table-wrap aixia-scrollbar">
      <div className={`aixia-table-scroll aixia-scrollbar ${maxHeightClassName}`}>
        <table className={`aixia-table ${minWidthClassName}`}>{children}</table>
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
  align = "left",
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
          : align === "center"
            ? "justify-center text-center"
            : "justify-start text-left"
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
