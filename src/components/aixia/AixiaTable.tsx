import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
} from "react";
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
  const [archiveScrollWidth, setArchiveScrollWidth] = useState(0);

  const resolvedMinWidthClassName =
    minWidthClassName ??
    (variant === "registry"
      ? "min-w-[1240px]"
      : variant === "archive"
        ? "min-w-[1680px]"
        : "min-w-max");

  useEffect(() => {
    if (variant !== "archive") return;

    const tableScrollElement = tableScrollRef.current;
    if (!tableScrollElement) return;

    const updateArchiveScrollWidth = () => {
      setArchiveScrollWidth(tableScrollElement.scrollWidth);
    };

    updateArchiveScrollWidth();

    const resizeObserver = new ResizeObserver(updateArchiveScrollWidth);
    resizeObserver.observe(tableScrollElement);

    const tableElement = tableScrollElement.querySelector("table");
    if (tableElement) {
      resizeObserver.observe(tableElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [variant, children]);

  const handleTableScroll = (event: UIEvent<HTMLDivElement>) => {
    if (variant !== "archive") return;

    const horizontalScrollElement = horizontalScrollRef.current;
    if (!horizontalScrollElement) return;

    horizontalScrollElement.scrollLeft = event.currentTarget.scrollLeft;
  };

  const handleHorizontalScroll = (event: UIEvent<HTMLDivElement>) => {
    if (variant !== "archive") return;

    const tableScrollElement = tableScrollRef.current;
    if (!tableScrollElement) return;

    tableScrollElement.scrollLeft = event.currentTarget.scrollLeft;
  };

  return (
    <div
      className="aixia-table-wrap aixia-scrollbar"
      data-table-variant={variant}
    >
      <div
        ref={tableScrollRef}
        className={`aixia-table-scroll aixia-scrollbar ${maxHeightClassName}`}
        onScroll={handleTableScroll}
      >
        <table className={`aixia-table ${resolvedMinWidthClassName}`}>
          {children}
        </table>
      </div>

      {variant === "archive" ? (
        <div
          ref={horizontalScrollRef}
          className="aixia-table-horizontal-scroll aixia-scrollbar"
          onScroll={handleHorizontalScroll}
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
