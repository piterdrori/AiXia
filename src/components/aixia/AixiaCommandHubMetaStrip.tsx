import { AixiaSignalRow } from "./AixiaSignalRow";

export type AixiaCommandHubMetaTone =
  | "indigo"
  | "violet"
  | "gold"
  | "amber"
  | "emerald"
  | "cyan"
  | "rose"
  | "neutral";

export type AixiaCommandHubMetaItem = {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone?: AixiaCommandHubMetaTone;
};

const COMMAND_HUB_META_TONES = new Set<AixiaCommandHubMetaTone>([
  "indigo",
  "violet",
  "gold",
  "amber",
  "emerald",
  "cyan",
  "rose",
  "neutral",
]);

export type AixiaCommandHubMetaVariant = "finance" | "command";

export type AixiaCommandHubMetaStripProps = {
  items: AixiaCommandHubMetaItem[];
  className?: string;
  /** `finance` → `.aixia-finance-hub-meta` under `.aixia-finance-page`; `command` → `.aixia-command-hub-meta`. */
  variant?: AixiaCommandHubMetaVariant;
};

/**
 * Canonical page-level meta/status row (secondary context below command hero — not hero KPIs).
 * Use instead of `AixiaRuntimeStatusStrip` for page chrome.
 */
export function AixiaCommandHubMetaStrip({
  items,
  className = "",
  variant = "command",
}: AixiaCommandHubMetaStripProps) {
  if (items.length === 0) return null;

  const gridClassName =
    variant === "finance" ? "aixia-finance-hub-meta" : "aixia-command-hub-meta";

  return (
    <div className={`${gridClassName} ${className}`.trim()}>
      {items.map((item) => (
        <AixiaSignalRow
          key={item.key}
          label={item.label}
          value={`${item.value} — ${item.detail}`}
          tone={normalizeCommandHubMetaTone(item.tone)}
        />
      ))}
    </div>
  );
}

export function normalizeCommandHubMetaTone(
  tone?: string,
): AixiaCommandHubMetaTone | undefined {
  if (!tone) return undefined;
  const normalized = tone === "gold" ? "amber" : tone;
  if (COMMAND_HUB_META_TONES.has(normalized as AixiaCommandHubMetaTone)) {
    return normalized as AixiaCommandHubMetaTone;
  }
  return "neutral";
}
