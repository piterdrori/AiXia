import { AixiaBadge } from "./AixiaBadge";

type AixiaStatusBadgeTone =
  | "indigo"
  | "violet"
  | "gold"
  | "emerald"
  | "rose"
  | "neutral";

type AixiaStatusBadgeProps = {
  value: string | null | undefined;
  className?: string;
};

function formatStatus(value: string | null | undefined) {
  if (!value) return "Unknown";

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusTone(value: string | null | undefined): AixiaStatusBadgeTone {
  switch (value) {
    case "active":
    case "approved":
    case "accepted":
    case "confirmed":
    case "paid":
    case "completed":
    case "enabled":
      return "emerald";

    case "draft":
    case "pending":
    case "review":
    case "partial":
    case "inactive":
      return "gold";

    case "archived":
    case "deleted":
    case "rejected":
    case "cancelled":
    case "canceled":
    case "void":
    case "locked":
      return "rose";

    case "issued":
    case "sent":
    case "open":
    case "linked":
      return "indigo";

    case "converted":
      return "violet";

    default:
      return "neutral";
  }
}

export function AixiaStatusBadge({ value, className = "" }: AixiaStatusBadgeProps) {
  return (
    <AixiaBadge tone={getStatusTone(value)} className={className}>
      {formatStatus(value)}
    </AixiaBadge>
  );
}
