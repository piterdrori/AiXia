import type { ReactNode } from "react";

/** Semantic registry column tiers (08-table-list-standard §4.L.5). Prefer `status` / `count` over `small` for new work. */
export type AixiaTableColumnTier =
  | "flex"
  | "status"
  | "count"
  | "medium"
  | "small"
  | "action";

export type AixiaTableTextCellWidth = "sm" | "md" | "lg" | "xl";

type BodyColumnTier = Exclude<AixiaTableColumnTier, "action">;

type AixiaTableTextCellProps = {
  primary: ReactNode;
  secondary?: ReactNode;
  /** Legacy width alias — maps to column tier via global CSS (08 §4.L). */
  width?: AixiaTableTextCellWidth;
  /** Semantic column tier; overrides width-derived tier when set. Use `count` for numeric counts. */
  tier?: AixiaTableColumnTier;
};

type AixiaTableBadgeCellProps = {
  children: ReactNode;
  width?: AixiaTableTextCellWidth;
  tier?: AixiaTableColumnTier;
};

type AixiaTableDateCellProps = {
  children: ReactNode;
  width?: AixiaTableTextCellWidth;
  tier?: AixiaTableColumnTier;
};

type AixiaTableActionsAlign = "center" | "end";

type AixiaTableActionsCellProps = {
  children: ReactNode;
  /** Registry/module tables default to center (08-table-list-standard). Use `end` only for approved exceptions. */
  actionsAlign?: AixiaTableActionsAlign;
};

type AixiaTableHeaderCellProps = {
  children: ReactNode;
  tier?: AixiaTableColumnTier;
  width?: AixiaTableTextCellWidth;
  className?: string;
};

function deriveColumnTierFromWidth(width: AixiaTableTextCellWidth): BodyColumnTier {
  if (width === "sm") return "small";
  if (width === "md") return "medium";
  return "flex";
}

function resolveBodyCellTier(
  tier: AixiaTableColumnTier | undefined,
  width: AixiaTableTextCellWidth
): BodyColumnTier {
  if (tier && tier !== "action") return tier;
  return deriveColumnTierFromWidth(width);
}

function resolveBadgeCellTier(
  tier: AixiaTableColumnTier | undefined,
  width: AixiaTableTextCellWidth
): BodyColumnTier {
  if (tier && tier !== "action") return tier;
  if (width === "sm") return "status";
  if (width === "md") return "medium";
  if (width === "lg" || width === "xl") return "flex";
  return "status";
}

export function AixiaTableHeaderCell({
  children,
  tier,
  width,
  className,
}: AixiaTableHeaderCellProps) {
  const resolvedTier =
    tier ??
    (width !== undefined ? deriveColumnTierFromWidth(width) : undefined);

  return (
    <th
      className={["aixia-table-th", className].filter(Boolean).join(" ")}
      {...(resolvedTier ? { "data-table-column-tier": resolvedTier } : {})}
      {...(width ? { "data-table-cell-width": width } : {})}
    >
      {children}
    </th>
  );
}

export function AixiaTableTextCell({
  primary,
  secondary,
  width = "md",
  tier,
}: AixiaTableTextCellProps) {
  const resolvedTier = resolveBodyCellTier(tier, width);

  return (
    <td
      className="aixia-table-cell-text"
      data-table-cell-type="text"
      data-table-cell-width={width}
      data-table-column-tier={resolvedTier}
    >
      <div className="aixia-table-primary-text">{primary}</div>
      {secondary ? <div className="aixia-table-secondary-text">{secondary}</div> : null}
    </td>
  );
}

export function AixiaTableBadgeCell({
  children,
  width = "sm",
  tier,
}: AixiaTableBadgeCellProps) {
  const resolvedTier = resolveBadgeCellTier(tier, width);

  return (
    <td
      className="aixia-table-cell-badge"
      data-table-cell-type="badge"
      data-table-cell-width={width}
      data-table-column-tier={resolvedTier}
    >
      {children}
    </td>
  );
}

export function AixiaTableDateCell({
  children,
  width = "md",
  tier,
}: AixiaTableDateCellProps) {
  const resolvedTier = resolveBodyCellTier(tier, width);

  return (
    <td
      className="aixia-table-cell-date"
      data-table-cell-type="date"
      data-table-cell-width={width}
      data-table-column-tier={resolvedTier}
    >
      {children}
    </td>
  );
}

export function AixiaTableActionsCell({
  children,
  actionsAlign = "center",
}: AixiaTableActionsCellProps) {
  return (
    <td
      className="aixia-table-cell-actions"
      data-table-cell-type="actions"
      data-table-column-tier="action"
    >
      <div className="aixia-table-actions" data-table-actions-align={actionsAlign}>
        {children}
      </div>
    </td>
  );
}
