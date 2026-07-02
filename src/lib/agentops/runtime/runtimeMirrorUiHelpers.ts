import type { AixiaCommandHubMetaItem } from "@/components/aixia";

export function buildRuntimeMirrorMetaItems(
  entries: Array<{ key: string; label: string; value: string; detail?: string }>,
): AixiaCommandHubMetaItem[] {
  return entries.map((entry) => ({
    key: entry.key,
    label: entry.label,
    value: entry.value,
    detail: entry.detail ?? "Supabase runtime mirror",
    tone: "cyan" as const,
  }));
}
