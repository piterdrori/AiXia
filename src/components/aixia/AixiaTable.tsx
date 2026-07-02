"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ArrowUpDown } from "lucide-react";
import {
  computeEqualGapTableLayout,
  type AixiaEqualGapColumn,
  type AixiaEqualGapLayoutResult,
} from "@/lib/aixia/tableEqualGapLayout";

type SortDirection = "asc" | "desc";
type AixiaTableShellVariant = "registry" | "archive" | "default";
export type AixiaTableWidthPreset = "compact" | "standard" | "wide" | "extra-wide";

export type { AixiaEqualGapColumn, AixiaEqualGapLayoutResult };

const AIXIA_TABLE_VARIANTS: readonly AixiaTableShellVariant[] = [
  "registry",
  "archive",
  "default",
];

type AixiaTableShellProps = {
  children: ReactNode;
  /**
   * Legacy table min-width utility on `<table>`. Prefer `tableWidthPreset` / `columnCount`.
   * When set with a registry preset, width rhythm is driven by `data-table-width-preset` on the wrap.
   */
  minWidthClassName?: string;
  maxHeightClassName?: string;
  variant?: AixiaTableShellVariant;
  /** Global registry table min-width band (08 §4.L.5). */
  tableWidthPreset?: AixiaTableWidthPreset;
  /** Derives `tableWidthPreset` when preset is omitted (1–5 compact, 6–8 standard, 9–12 wide, 13+ extra-wide). */
  columnCount?: number;
  /** Equal-gap layout columns (08 §4.L.0). Enables engine when `variant="registry"`. */
  columns?: AixiaEqualGapColumn[];
};

type AixiaSortableHeaderProps<TSortKey extends string> = {
  label: string;
  sortKey: TSortKey;
  activeSortKey: TSortKey;
  sortDirection: SortDirection;
  onSort: (sortKey: TSortKey) => void;
  align?: "left" | "center" | "right";
};

function deriveWidthPresetFromColumnCount(columnCount: number): AixiaTableWidthPreset {
  if (columnCount <= 5) return "compact";
  if (columnCount <= 8) return "standard";
  if (columnCount <= 12) return "wide";
  return "extra-wide";
}

/** Infer preset from legacy `min-w-[…px]` so unmigrated pages keep approximate rhythm. */
function inferWidthPresetFromMinWidthClassName(
  minWidthClassName: string | undefined
): AixiaTableWidthPreset | undefined {
  if (!minWidthClassName) return undefined;
  const match = minWidthClassName.match(/min-w-\[(\d+)px\]/);
  if (!match) return undefined;
  const px = Number(match[1]);
  if (!Number.isFinite(px)) return undefined;
  if (px <= 920) return "compact";
  if (px <= 1100) return "standard";
  if (px <= 1400) return "wide";
  return "extra-wide";
}

function resolveRegistryWidthPreset({
  tableWidthPreset,
  columnCount,
  minWidthClassName,
}: {
  tableWidthPreset?: AixiaTableWidthPreset;
  columnCount?: number;
  minWidthClassName?: string;
}): AixiaTableWidthPreset {
  if (tableWidthPreset) return tableWidthPreset;
  if (columnCount != null && columnCount > 0) {
    return deriveWidthPresetFromColumnCount(columnCount);
  }
  return (
    inferWidthPresetFromMinWidthClassName(minWidthClassName) ?? "standard"
  );
}

export function AixiaTableShell({
  children,
  minWidthClassName,
  maxHeightClassName,
  variant = "default",
  tableWidthPreset,
  columnCount,
  columns,
}: AixiaTableShellProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [containerWidthPx, setContainerWidthPx] = useState(0);

  const resolvedVariant: AixiaTableShellVariant = AIXIA_TABLE_VARIANTS.includes(
    variant
  )
    ? variant
    : "default";

  const isRegistry = resolvedVariant === "registry";
  const equalGapEnabled =
    isRegistry && columns != null && columns.length > 0;

  const layoutColumnsKey =
    columns?.map((column) => `${column.id}:${column.tier}`).join("|") ?? "";

  const resolvedColumnCount =
    columnCount ?? (columns != null ? columns.length : undefined);

  const resolvedRegistryPreset = isRegistry
    ? resolveRegistryWidthPreset({
        tableWidthPreset,
        columnCount: resolvedColumnCount,
        minWidthClassName,
      })
    : undefined;

  useLayoutEffect(() => {
    if (!equalGapEnabled || !wrapRef.current) return;

    const element = wrapRef.current;

    const updateWidth = () => {
      setContainerWidthPx(element.clientWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [equalGapEnabled, layoutColumnsKey]);

  const equalGapLayout = useMemo((): AixiaEqualGapLayoutResult | undefined => {
    if (!equalGapEnabled || !columns) return undefined;
    return computeEqualGapTableLayout({
      columns,
      containerWidthPx,
    });
  }, [equalGapEnabled, columns, containerWidthPx]);

  const resolvedMinWidthClassName =
    minWidthClassName ??
    (resolvedVariant === "archive"
      ? "min-w-[1680px]"
      : resolvedVariant === "default"
        ? "min-w-max"
        : undefined);

  const tableClassName = [
    "aixia-table",
    resolvedMinWidthClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const equalGapWrapStyle: CSSProperties | undefined = equalGapLayout
    ? {
        ["--aixia-table-gap-current" as string]: `${equalGapLayout.gapPx}px`,
        ["--aixia-table-layout-min-width" as string]: `${equalGapLayout.layoutMinWidthPx}px`,
      }
    : undefined;

  return (
    <div
      ref={wrapRef}
      className="aixia-table-wrap aixia-scrollbar"
      data-table-variant={resolvedVariant}
      {...(isRegistry && resolvedRegistryPreset
        ? { "data-table-width-preset": resolvedRegistryPreset }
        : {})}
      {...(equalGapLayout
        ? {
            "data-table-layout-engine": "equal-gap",
            "data-table-column-count": String(equalGapLayout.columnCount),
            "data-table-gap-count": String(equalGapLayout.gapCount),
            "data-table-scroll-required": equalGapLayout.scrollRequired
              ? "true"
              : "false",
          }
        : {})}
      data-table-has-custom-min-width={minWidthClassName ? "true" : "false"}
      data-table-guardrail={resolvedVariant === "default" ? "legacy-default" : "standard"}
      style={equalGapWrapStyle}
    >
      <div
        className={[
          "aixia-table-scroll",
          "aixia-scrollbar",
          maxHeightClassName,
        ]
          .filter(Boolean)
          .join(" ")}
        data-table-has-custom-max-height={maxHeightClassName ? "true" : "false"}
      >
        <table className={tableClassName}>
          {equalGapLayout ? (
            <colgroup>
              {equalGapLayout.columns.map((column) => (
                <col
                  key={column.id}
                  data-table-column-tier={column.tier}
                  style={{ width: `${column.computedWidthPx}px` }}
                />
              ))}
            </colgroup>
          ) : null}
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
  const resolvedAlignClassName =
    align === "right"
      ? "justify-end text-right"
      : align === "left"
        ? "justify-start text-left"
        : "justify-center text-center";

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`aixia-sortable-header ${isActive ? "is-active" : ""} ${resolvedAlignClassName}`}
      data-sort-active={isActive ? "true" : "false"}
      data-sort-direction={isActive ? sortDirection : "none"}
      data-sort-align={align}
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
