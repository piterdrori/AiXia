import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type AixiaFeaturePanelTone =
  | "indigo"
  | "violet"
  | "gold"
  | "amber"
  | "emerald"
  | "cyan"
  | "rose"
  | "neutral";

type AixiaFeaturePanelProps = {
  title: ReactNode;
  description?: ReactNode;
  icon: LucideIcon;
  tone?: AixiaFeaturePanelTone;
  children?: ReactNode;
  className?: string;
};

function getToneClass(tone: AixiaFeaturePanelTone) {
  if (tone === "emerald") return "aixia-feature-panel-emerald";
  if (tone === "cyan") return "aixia-feature-panel-cyan";
  if (tone === "gold" || tone === "amber") return "aixia-feature-panel-amber";
  if (tone === "violet") return "aixia-feature-panel-violet";
  if (tone === "rose") return "aixia-feature-panel-rose";
  if (tone === "neutral") return "aixia-feature-panel-neutral";

  return "aixia-feature-panel-indigo";
}

export function AixiaFeaturePanel({
  title,
  description,
  icon: Icon,
  tone = "indigo",
  children,
  className = "",
}: AixiaFeaturePanelProps) {
  return (
    <section className={`aixia-feature-panel ${getToneClass(tone)} ${className}`}>
      <div className="aixia-feature-panel-glow" />

      <div className="aixia-feature-panel-content">
        <div className="aixia-feature-panel-icon">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <div className="aixia-feature-panel-title">{title}</div>
          {description ? (
            <div className="aixia-feature-panel-description">{description}</div>
          ) : null}
          {children ? <div className="aixia-feature-panel-body">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
