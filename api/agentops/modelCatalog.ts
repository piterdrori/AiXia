/** Server-side mirror of src/lib/agentops/ollamaModelCatalog.ts */
export const AGENTOPS_OLLAMA_MODEL_CATALOG = [
  { id: "llama3.2", label: "Llama 3.2 3B", hint: "Fast text-only chat" },
  { id: "llama3.2-vision:11b", label: "Llama 3.2 Vision 11B", hint: "Images + text" },
  { id: "qwen3:14b", label: "Qwen3 14B", hint: "Coding / reasoning" },
] as const;

export const AGENTOPS_OLLAMA_DEFAULT_MODEL = "llama3.2";

export type AgentOpsOllamaModelOption = {
  id: string;
  label: string;
  hint: string;
  installed: boolean;
  sizeBytes?: number;
};

export function mergeAgentOpsOllamaModelOptions(
  installed: Array<{ name: string; size?: number }>,
): AgentOpsOllamaModelOption[] {
  const installedNames = installed.map((item) => item.name.trim()).filter(Boolean);
  const installedByName = new Map(installed.map((item) => [item.name.trim(), item.size]));

  function isInstalled(entryId: string): boolean {
    if (installedByName.has(entryId) || installedByName.has(`${entryId}:latest`)) {
      return true;
    }
    if (entryId === "llama3.2") {
      return installedNames.some((name) => name === "llama3.2:latest" || name === "llama3.2");
    }
    return installedNames.some(
      (name) => name === entryId || name.startsWith(`${entryId}:`) || name.startsWith(`${entryId}-`),
    );
  }

  function resolveSize(entryId: string): number | undefined {
    return (
      installedByName.get(entryId) ??
      installedByName.get(`${entryId}:latest`) ??
      installed.find(
        (item) =>
          item.name === entryId ||
          item.name.startsWith(`${entryId}:`) ||
          item.name.startsWith(`${entryId}-`),
      )?.size
    );
  }

  return AGENTOPS_OLLAMA_MODEL_CATALOG.map((entry) => ({
    ...entry,
    installed: isInstalled(entry.id),
    sizeBytes: resolveSize(entry.id),
  }));
}
