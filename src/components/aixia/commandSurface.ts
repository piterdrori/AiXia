export type AixiaCommandSurface = "default" | "command";

export type AixiaCommandTone =
  | "indigo"
  | "violet"
  | "gold"
  | "amber"
  | "emerald"
  | "cyan"
  | "rose"
  | "neutral";

export function getCommandMetricToneClass(tone: AixiaCommandTone | string = "indigo") {
  const normalized = tone as AixiaCommandTone;
  if (normalized === "violet") return "aixia-dash-metric--tone-violet";
  if (normalized === "gold" || normalized === "amber") return "aixia-dash-metric--tone-amber";
  if (normalized === "emerald" || normalized === "cyan") return "aixia-dash-metric--tone-teal";
  if (normalized === "rose") return "aixia-dash-metric--tone-rose";
  return "";
}
