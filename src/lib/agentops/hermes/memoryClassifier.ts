/**
 * Hermes memory classification — assigns cognitive type before agentops_memory writes.
 */

export type ClassifiedMemoryType = "fact" | "rule" | "preference" | "behavior";

export type ClassifyMemoryInput = {
  content: string;
};

export function classifyMemory(input: ClassifyMemoryInput): ClassifiedMemoryType {
  const text = input.content.toLowerCase();

  if (text.includes("should") || text.includes("must") || text.includes("always") || text.includes("never")) {
    return "rule";
  }

  if (text.includes("prefers") || text.includes("likes") || text.includes("prefer")) {
    return "preference";
  }

  if (text.includes("usually") || text.includes("behavior") || text.includes("habit") || text.includes("pattern")) {
    return "behavior";
  }

  return "fact";
}

export function classifiedMemoryTypeToUpper(type: ClassifiedMemoryType): "FACT" | "RULE" | "PREFERENCE" | "BEHAVIOR" {
  switch (type) {
    case "rule":
      return "RULE";
    case "preference":
      return "PREFERENCE";
    case "behavior":
      return "BEHAVIOR";
    default:
      return "FACT";
  }
}

export function normalizeStoredMemoryType(value: unknown): ClassifiedMemoryType | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "fact") return "fact";
  if (normalized === "rule") return "rule";
  if (normalized === "preference") return "preference";
  if (normalized === "behavior") return "behavior";
  return null;
}

export function isSystemEventMemoryContent(content: string): boolean {
  const text = content.toLowerCase();
  return (
    text.includes("cycle scanned") ||
    text.includes("scheduled_cycle") ||
    text.includes("issue created") ||
    text.includes("work cycle") ||
    text.includes("browser qa simulation") ||
    text.includes("initializer returned") ||
    text.includes("activation log")
  );
}
