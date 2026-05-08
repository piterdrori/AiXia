import { AixiaBadge } from "./AixiaBadge";

type AixiaCurrencyBadgeProps = {
  value: string | null | undefined;
  className?: string;
};

export function AixiaCurrencyBadge({
  value,
  className = "",
}: AixiaCurrencyBadgeProps) {
  return (
    <AixiaBadge tone="indigo" className={`aixia-currency-badge ${className}`}>
      {value || "—"}
    </AixiaBadge>
  );
}
