import { useEffect, useRef, useState, type ReactNode } from "react";
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
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const horizontalScrollRef = useRef<HTMLDivElement | null>(null);
  const [archiveScrollWidth, setArchiveScrollWidth] = useState(1);

  const isArchiveVariant = variant === "archive";

  const resolvedMinWidthClassName =
    minWidthClassName ??
    (variant === "registry"
      ? "min-w-[1240px]"
      : variant === "archive"
        ? "min-w-[1680px]"
        : "min-w-max");

  useEffect(() => {
    if (!isArchiveVariant) return;

    const tableScrollElement = tableScrollRef.current;
    const horizontalScrollElement = horizontalScrollRef.current;

    if (!tableScrollElement || !horizontalScrollElement) return;

    const updateScrollWidth = () => {
      setArchiveScrollWidth(Math.max(tableScrollElement.scrollWidth, tableScrollElement.clientWidth, 1));
      horizontalScrollElement.scrollLeft = tableScrollElement.scrollLeft;
    };

    updateScrollWidth();

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateScrollWidth)
        : null;

    resizeObserver?.observe(tableScrollElement);

    const tableElement = tableScrollElement.querySelector("table");
    if (tableElement) {
      resizeObserver?.observe(tableElement);
    }

    window.addEventListener("resize", updateScrollWidth);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateScrollWidth);
    };
  }, [isArchiveVariant, children]);

  const syncTableScrollFromTable = () => {
    if (!isArchiveVariant) return;

    const tableScrollElement = tableScrollRef.current;
    const horizontalScrollElement = horizontalScrollRef.current;

    if (!tableScrollElement || !horizontalScrollElement) return;

    if (horizontalScrollElement.scrollLeft !== tableScrollElement.scrollLeft) {
      horizontalScrollElement.scrollLeft = tableScrollElement.scrollLeft;
    }
  };

  const syncTableScrollFromFrame = () => {
    if (!isArchiveVariant) return;

    const tableScrollElement = tableScrollRef.current;
    const horizontalScrollElement = horizontalScrollRef.current;

    if (!tableScrollElement || !horizontalScrollElement) return;

    if (tableScrollElement.scrollLeft !== horizontalScrollElement.scrollLeft) {
      tableScrollElement.scrollLeft = horizontalScrollElement.scrollLeft;
    }
  };

  return (
    <div
      className="aixia-table-wrap aixia-scrollbar"
      data-table-variant={variant}
    >
      <div
        ref={tableScrollRef}
        className={`aixia-table-scroll aixia-scrollbar ${maxHeightClassName}`}
        onScroll={syncTableScrollFromTable}
      >
        <table className={`aixia-table ${resolvedMinWidthClassName}`}>
          {children}
        </table>
      </div>

      {isArchiveVariant ? (
        <div
          ref={horizontalScrollRef}
          className="aixia-table-horizontal-scroll aixia-scrollbar"
          onScroll={syncTableScrollFromFrame}
          aria-hidden="true"
        >
          <div
            className="aixia-table-horizontal-scroll-spacer"
            style={{ width: `${archiveScrollWidth}px` }}
          />
        </div>
      ) : null}
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
