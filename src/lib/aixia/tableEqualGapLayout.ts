export type AixiaEqualGapColumnTier =
  | "flex"
  | "status"
  | "count"
  | "medium"
  | "small"
  | "action";

export type AixiaEqualGapColumn = {
  id: string;
  tier: AixiaEqualGapColumnTier;
};

export type AixiaEqualGapLayoutColumnResult = {
  id: string;
  tier: AixiaEqualGapColumnTier;
  minWidthPx: number;
  computedWidthPx: number;
};

export type AixiaEqualGapLayoutResult = {
  columnCount: number;
  gapCount: number;
  gapPx: number;
  layoutMinWidthPx: number;
  scrollRequired: boolean;
  columns: AixiaEqualGapLayoutColumnResult[];
};

/** First-pass tier minimums aligned with registry CSS tokens (08 §4.L). */
export const AIXIA_EQUAL_GAP_TIER_MIN_WIDTH_PX: Record<
  AixiaEqualGapColumnTier,
  number
> = {
  flex: 152,
  status: 144,
  count: 76,
  medium: 116,
  small: 92,
  action: 152,
};

export const AIXIA_EQUAL_GAP_MIN_GAP_PX = 12;

export type ComputeEqualGapTableLayoutInput = {
  columns: AixiaEqualGapColumn[];
  containerWidthPx: number;
  gapMinPx?: number;
  tierMinWidthPx?: Partial<Record<AixiaEqualGapColumnTier, number>>;
};

function resolveTierMinWidthPx(
  tier: AixiaEqualGapColumnTier,
  tierMinWidthPx?: Partial<Record<AixiaEqualGapColumnTier, number>>
): number {
  return tierMinWidthPx?.[tier] ?? AIXIA_EQUAL_GAP_TIER_MIN_WIDTH_PX[tier];
}

/**
 * Equal-gap registry table layout (08 §4.L.0).
 * Pure function — no React/DOM. Distributes (N+1) visual gaps across N columns
 * without letting flex absorb all slack.
 */
export function computeEqualGapTableLayout({
  columns,
  containerWidthPx,
  gapMinPx = AIXIA_EQUAL_GAP_MIN_GAP_PX,
  tierMinWidthPx,
}: ComputeEqualGapTableLayoutInput): AixiaEqualGapLayoutResult {
  const columnCount = columns.length;
  const gapCount = columnCount + 1;

  if (columnCount === 0) {
    return {
      columnCount: 0,
      gapCount: 0,
      gapPx: gapMinPx,
      layoutMinWidthPx: 0,
      scrollRequired: false,
      columns: [],
    };
  }

  const layoutColumns = columns.map((column) => {
    const minWidthPx = resolveTierMinWidthPx(column.tier, tierMinWidthPx);
    return {
      id: column.id,
      tier: column.tier,
      minWidthPx,
      computedWidthPx: minWidthPx,
    };
  });

  const minColumnTotal = layoutColumns.reduce(
    (sum, column) => sum + column.minWidthPx,
    0
  );
  const layoutMinimum = minColumnTotal + gapCount * gapMinPx;
  const safeContainerWidth =
    Number.isFinite(containerWidthPx) && containerWidthPx > 0
      ? containerWidthPx
      : 0;

  const canFit = safeContainerWidth >= layoutMinimum;
  const gapPx = canFit
    ? (safeContainerWidth - minColumnTotal) / gapCount
    : gapMinPx;
  const layoutMinWidthPx = canFit ? safeContainerWidth : layoutMinimum;
  const scrollRequired = !canFit;

  const gapContributionPerColumn = (gapCount * gapPx) / columnCount;

  const columnsWithWidths = layoutColumns.map((column) => ({
    ...column,
    computedWidthPx: column.minWidthPx + gapContributionPerColumn,
  }));

  return {
    columnCount,
    gapCount,
    gapPx,
    layoutMinWidthPx,
    scrollRequired,
    columns: columnsWithWidths,
  };
}
