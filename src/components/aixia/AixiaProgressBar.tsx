type AixiaProgressBarProps = {
  value?: number;
  max?: number;
  className?: string;
  tone?: "default" | "primary" | "violet";
};

export function AixiaProgressBar({
  value = 0,
  max = 100,
  className = "",
  tone = "default",
}: AixiaProgressBarProps) {
  const clamped = Math.min(max, Math.max(0, value));
  const pct = max > 0 ? (clamped / max) * 100 : 0;

  const classNames = [
    "aixia-progress-bar",
    tone !== "default" ? `aixia-progress-bar--${tone}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classNames}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={clamped}
    >
      <div className="aixia-progress-bar__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
