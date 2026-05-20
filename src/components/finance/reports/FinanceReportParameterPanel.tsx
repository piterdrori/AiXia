import {
  AixiaButton,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaInputField,
  AixiaReviewGrid,
  AixiaSelectField,
} from "@/components/aixia";
import type {
  FinanceReportParameterDefinition,
  FinanceReportParameterValues,
} from "@/lib/finance/reports/types";

type FinanceReportParameterPanelProps = {
  parameters: FinanceReportParameterDefinition[];
  values: FinanceReportParameterValues;
  isRunning?: boolean;
  onChange: (key: string, value: string) => void;
  onRun: () => void;
  onExport?: () => void;
  canExport?: boolean;
};

export function FinanceReportParameterPanel({
  parameters,
  values,
  isRunning = false,
  onChange,
  onRun,
  onExport,
  canExport = false,
}: FinanceReportParameterPanelProps) {
  return (
    <div className="aixia-stack">
      {parameters.length > 0 ? (
        <AixiaReviewGrid variant="cards">
          {parameters.map((parameter) => (
            <AixiaFormField key={parameter.key}>
              <AixiaFieldLabel label={parameter.label} />
              {parameter.type === "select" ? (
                <AixiaSelectField
                  value={values[parameter.key] || ""}
                  onChange={(event) => onChange(parameter.key, event.target.value)}
                >
                  <option value="">All</option>
                  {(parameter.options || []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AixiaSelectField>
              ) : (
                <AixiaInputField
                  type={parameter.type === "date" ? "date" : "text"}
                  value={values[parameter.key] || ""}
                  placeholder={parameter.placeholder}
                  onChange={(event) => onChange(parameter.key, event.target.value)}
                />
              )}
            </AixiaFormField>
          ))}
        </AixiaReviewGrid>
      ) : null}

      <div className="aixia-action-row">
        <AixiaButton type="button" variant="primary" onClick={onRun} disabled={isRunning}>
          {isRunning ? "Running..." : "Run Report"}
        </AixiaButton>
        {canExport && onExport ? (
          <AixiaButton type="button" variant="secondary" onClick={onExport} disabled={isRunning}>
            Export CSV
          </AixiaButton>
        ) : null}
      </div>
    </div>
  );
}
