import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type AixiaSelectableTileTone =
  | "cyan"
  | "emerald"
  | "amber"
  | "violet"
  | "rose"
  | "neutral";

type AixiaSelectableTileProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  selected?: boolean;
  tone?: AixiaSelectableTileTone;
  meta?: ReactNode;
};

export function AixiaSelectableTile({
  title,
  description,
  icon: Icon,
  selected = false,
  tone = "cyan",
  meta,
  className = "",
  type = "button",
  ...props
}: AixiaSelectableTileProps) {
  return (
    <button
      {...props}
      type={type}
      className={`aixia-selectable-tile ${className}`}
      data-selected={selected ? "true" : "false"}
      data-tone={tone}
    >
      <span className="aixia-selectable-tile-head">
        {Icon ? (
          <span className="aixia-selectable-tile-icon">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}

        <span className="aixia-selectable-tile-copy">
          <span className="aixia-selectable-tile-title">{title}</span>
          {description ? (
            <span className="aixia-selectable-tile-description">
              {description}
            </span>
          ) : null}
        </span>
      </span>

      {meta ? <span className="aixia-selectable-tile-meta">{meta}</span> : null}
    </button>
  );
}
