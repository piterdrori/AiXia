import { AixiaBadge } from "./AixiaBadge";

type AixiaDefaultBadgeProps = {
  isDefault: boolean;
  defaultLabel?: string;
  standardLabel?: string;
  className?: string;
};

export function AixiaDefaultBadge({
  isDefault,
  defaultLabel = "Default",
  standardLabel = "Standard",
  className = "",
}: AixiaDefaultBadgeProps) {
  return (
    <AixiaBadge tone={isDefault ? "emerald" : "neutral"} className={className}>
      {isDefault ? defaultLabel : standardLabel}
    </AixiaBadge>
  );
}
