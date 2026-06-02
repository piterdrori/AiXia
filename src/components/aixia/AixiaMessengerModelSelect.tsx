import { RefreshCw } from "lucide-react";

import { AixiaButton } from "./AixiaButton";
import { AixiaSelectField } from "./AixiaFormFields";
import type { AgentOpsOllamaModelOption } from "@/lib/agentops/ollamaModelCatalog";

export type AixiaMessengerModelSelectProps = {
  models: AgentOpsOllamaModelOption[];
  value: string;
  onChange: (modelId: string) => void;
  onRefresh?: () => void;
  disabled?: boolean;
  loading?: boolean;
  refreshing?: boolean;
  installedCount?: number;
};

function formatModelOption(option: AgentOpsOllamaModelOption): string {
  const installTag = option.installed ? "" : " · not installed";
  return `${option.label} (${option.hint})${installTag}`;
}

export function AixiaMessengerModelSelect({
  models,
  value,
  onChange,
  onRefresh,
  disabled = false,
  loading = false,
  refreshing = false,
  installedCount,
}: AixiaMessengerModelSelectProps) {
  const installedLabel =
    typeof installedCount === "number" ? `${installedCount}/${models.length} installed` : null;

  return (
    <div className="aixia-messenger-model-select-wrap" data-testid="agentops-messenger-model-select">
      <label className="aixia-messenger-model-select">
        <span className="aixia-messenger-model-select__label">Model</span>
        <AixiaSelectField
          className="aixia-messenger-model-select__control"
          value={value}
          disabled={disabled || loading || models.length === 0}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Ollama model for this chat"
          title="Choose which Ollama model replies in this chat"
        >
          {models.map((option) => (
            <option key={option.id} value={option.id} disabled={!option.installed}>
              {formatModelOption(option)}
            </option>
          ))}
        </AixiaSelectField>
      </label>
      {onRefresh ? (
        <AixiaButton
          type="button"
          variant="secondary"
          className="aixia-messenger-model-select__refresh-btn"
          disabled={loading || refreshing}
          onClick={onRefresh}
          title="Refresh installed models from Ollama"
          aria-label="Refresh installed models"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </AixiaButton>
      ) : null}
      {installedLabel ? (
        <span className="aixia-messenger-model-select__meta">{installedLabel}</span>
      ) : null}
    </div>
  );
}
