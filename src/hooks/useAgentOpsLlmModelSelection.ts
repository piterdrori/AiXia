import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AGENTOPS_OLLAMA_DEFAULT_MODEL,
  AGENTOPS_OLLAMA_MODEL_CATALOG,
  mergeAgentOpsOllamaModelOptions,
  readStoredAgentOpsLlmModel,
  writeStoredAgentOpsLlmModel,
  type AgentOpsOllamaModelOption,
} from "@/lib/agentops/ollamaModelCatalog";

const LLM_PROXY_PATH = "/api/agentops/llm";
const CATALOG_POLL_MS = 20_000;

type LlmCatalogResponse = {
  models?: Array<{ id: string; label: string; hint: string; installed: boolean; sizeBytes?: number }>;
  defaultModel?: string;
  runtimeActive?: boolean;
  ollamaReachable?: boolean | null;
};

function resolveInitialModel(roomKey: string, defaultModel: string): string {
  return readStoredAgentOpsLlmModel(roomKey) ?? defaultModel;
}

async function fetchLlmCatalog(): Promise<LlmCatalogResponse> {
  const response = await fetch(LLM_PROXY_PATH, { method: "GET" });
  return (await response.json()) as LlmCatalogResponse;
}

/** Per-room Ollama model picker backed by /api/agentops/llm catalog + localStorage. */
export function useAgentOpsLlmModelSelection(roomKey: string) {
  const [models, setModels] = useState<AgentOpsOllamaModelOption[]>(() =>
    mergeAgentOpsOllamaModelOptions([]),
  );
  const [defaultModel, setDefaultModel] = useState(AGENTOPS_OLLAMA_DEFAULT_MODEL);
  const [selectedModel, setSelectedModelState] = useState(() =>
    resolveInitialModel(roomKey, AGENTOPS_OLLAMA_DEFAULT_MODEL),
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const applyCatalog = useCallback((payload: LlmCatalogResponse, options?: { preserveSelection?: boolean }) => {
    const nextDefault = payload.defaultModel?.trim() || AGENTOPS_OLLAMA_DEFAULT_MODEL;
    setDefaultModel(nextDefault);

    const nextModels =
      payload.models?.length ?
        payload.models.map((item) => ({
          id: item.id,
          label: item.label,
          hint: item.hint,
          installed: item.installed,
          sizeBytes: item.sizeBytes,
        }))
      : mergeAgentOpsOllamaModelOptions([]);

    setModels(nextModels);

    setSelectedModelState((current) => {
      if (options?.preserveSelection && nextModels.some((item) => item.id === current && item.installed)) {
        return current;
      }

      const stored = readStoredAgentOpsLlmModel(roomKey);
      const storedValid = stored && nextModels.some((item) => item.id === stored && item.installed);
      const installedDefault =
        nextModels.find((item) => item.id === nextDefault && item.installed)?.id ??
        nextModels.find((item) => item.installed)?.id ??
        nextDefault;

      return storedValid ? stored! : installedDefault;
    });
  }, [roomKey]);

  const refreshCatalog = useCallback(async () => {
    setRefreshing(true);
    setCatalogError(null);
    try {
      const payload = await fetchLlmCatalog();
      applyCatalog(payload, { preserveSelection: true });
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : String(error));
    } finally {
      setRefreshing(false);
    }
  }, [applyCatalog]);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setLoading(true);
      setCatalogError(null);
      try {
        const payload = await fetchLlmCatalog();
        if (cancelled) return;
        applyCatalog(payload);
      } catch (error) {
        if (cancelled) return;
        setCatalogError(error instanceof Error ? error.message : String(error));
        setModels(mergeAgentOpsOllamaModelOptions([]));
        setSelectedModelState(resolveInitialModel(roomKey, AGENTOPS_OLLAMA_DEFAULT_MODEL));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [applyCatalog, roomKey]);

  const hasMissingModels = models.some((item) => !item.installed);

  useEffect(() => {
    if (!hasMissingModels) return;
    const timer = window.setInterval(() => {
      void refreshCatalog();
    }, CATALOG_POLL_MS);
    return () => window.clearInterval(timer);
  }, [hasMissingModels, refreshCatalog]);

  const setSelectedModel = useCallback(
    (modelId: string) => {
      setSelectedModelState(modelId);
      writeStoredAgentOpsLlmModel(roomKey, modelId);
    },
    [roomKey],
  );

  const selectedOption = useMemo(
    () =>
      models.find((item) => item.id === selectedModel) ??
      AGENTOPS_OLLAMA_MODEL_CATALOG.find((item) => item.id === selectedModel) ??
      null,
    [models, selectedModel],
  );

  const selectedLabel = selectedOption?.label ?? selectedModel;
  const installedCount = models.filter((item) => item.installed).length;

  return {
    models,
    defaultModel,
    selectedModel,
    selectedLabel,
    selectedOption,
    setSelectedModel,
    refreshCatalog,
    loading,
    refreshing,
    catalogError,
    installedCount,
    hasMissingModels,
  };
}
