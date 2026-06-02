import { Circle } from "lucide-react";

import { AixiaBadge } from "./AixiaBadge";
import { AixiaCommandHubMetaStrip } from "./AixiaCommandHubMetaStrip";
import { AixiaSignalRow } from "./AixiaSignalRow";

export type AixiaRuntimeStatusTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "cyan"
  | "emerald"
  | "amber"
  | "violet";

export type AixiaRuntimeStatusItem = {
  name: string;
  status: string;
  tone?: AixiaRuntimeStatusTone;
  description?: string;
};

export type AixiaRuntimeStatusStripProps = {
  label?: string;
  description?: string;
  items: AixiaRuntimeStatusItem[];
  compact?: boolean;
  mode?: "inline" | "stacked";
  /**
   * @deprecated For page-level meta/status rows use `AixiaCommandHubMetaStrip` instead.
   * `hub-meta` exists only for legacy call sites; do not add new page meta via this strip.
   * `default` / `stacked` — runtime diagnostics (AgentOps service health, live probes), not page chrome.
   */
  variant?: "default" | "hub-meta";
  className?: string;
  itemClassName?: string;
};

function toBadgeTone(
  tone: AixiaRuntimeStatusTone,
): "neutral" | "indigo" | "violet" | "gold" | "emerald" | "rose" | "cyan" {
  if (tone === "success" || tone === "emerald") return "emerald";
  if (tone === "warning" || tone === "amber") return "gold";
  if (tone === "danger") return "rose";
  if (tone === "info") return "indigo";
  if (tone === "cyan") return "cyan";
  if (tone === "violet") return "violet";
  return "neutral";
}

function toSignalTone(
  tone: AixiaRuntimeStatusTone,
): "neutral" | "indigo" | "violet" | "gold" | "amber" | "emerald" | "cyan" | "rose" {
  if (tone === "success") return "emerald";
  if (tone === "warning") return "amber";
  if (tone === "danger") return "rose";
  if (tone === "info") return "indigo";
  if (tone === "amber") return "amber";
  if (tone === "cyan") return "cyan";
  if (tone === "emerald") return "emerald";
  if (tone === "violet") return "violet";
  return "neutral";
}

export function AixiaRuntimeStatusStrip({
  label = "Runtime status",
  description,
  items,
  compact = false,
  mode = "inline",
  variant = "default",
  className = "",
  itemClassName = "",
}: AixiaRuntimeStatusStripProps) {
  if (items.length === 0) return null;

  if (variant === "hub-meta") {
    const metaItems = items.map((item) => ({
      key: `${item.name}-${item.status}`,
      label: item.name,
      value: item.status,
      detail: item.description ?? "",
      tone: toSignalTone(item.tone ?? "neutral"),
    }));

    return (
      <AixiaCommandHubMetaStrip
        variant="command"
        items={metaItems}
        className={className}
      />
    );
  }

  const stripClassName = ["aixia-runtime-status-strip", className]
    .filter(Boolean)
    .join(" ");

  const itemsClassName = [
    "aixia-runtime-status-strip__items",
    compact ? "aixia-runtime-status-strip__items--compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={stripClassName}
      data-runtime-strip-mode={mode}
      data-runtime-strip-compact={compact ? "true" : "false"}
    >
      {label || description ? (
        <div className="aixia-runtime-status-strip__header">
          {label ? <h3 className="aixia-runtime-status-strip__label">{label}</h3> : null}
          {description ? (
            <p className="aixia-runtime-status-strip__description">{description}</p>
          ) : null}
        </div>
      ) : null}

      <div className={itemsClassName}>
        {items.map((item) => {
          const tone = item.tone ?? "neutral";
          const badgeTone = toBadgeTone(tone);
          const signalTone = toSignalTone(tone);
          const runtimeItemClassName = [
            "aixia-runtime-status-strip__item",
            itemClassName,
          ]
            .filter(Boolean)
            .join(" ");

          const labelNode = (
            <div className="aixia-runtime-status-strip__item-copy">
              <span className="aixia-runtime-status-strip__item-name">{item.name}</span>
              {item.description ? (
                <span className="aixia-runtime-status-strip__item-description">
                  {item.description}
                </span>
              ) : null}
            </div>
          );

          const valueNode = (
            <AixiaBadge tone={badgeTone} className="aixia-runtime-status-strip__item-status">
              <Circle className="h-2.5 w-2.5 fill-current" />
              {item.status}
            </AixiaBadge>
          );

          if (mode === "stacked") {
            return (
              <article key={`${item.name}-${item.status}`} className={runtimeItemClassName}>
                <div className="aixia-runtime-status-strip__item-stack">
                  {labelNode}
                  {valueNode}
                </div>
              </article>
            );
          }

          return (
            <AixiaSignalRow
              key={`${item.name}-${item.status}`}
              label={labelNode}
              value={valueNode}
              tone={signalTone}
              className={runtimeItemClassName}
            />
          );
        })}
      </div>
    </section>
  );
}
