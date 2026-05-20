import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  normalizeFieldOptions,
  usesValueJson,
} from "@/lib/tasks/customFields";
import type {
  CustomFieldFormValue,
  ProjectTaskFieldDefinitionRow,
} from "@/lib/tasks/types";

type Props = {
  definitions: ProjectTaskFieldDefinitionRow[];
  values: Record<string, CustomFieldFormValue>;
  onChange: (values: Record<string, CustomFieldFormValue>) => void;
  disabled?: boolean;
  readOnly?: boolean;
};

export function TaskCustomFieldsForm({
  definitions,
  values,
  onChange,
  disabled = false,
  readOnly = false,
}: Props) {
  if (definitions.length === 0) return null;

  const setValue = (definitionId: string, patch: Partial<CustomFieldFormValue>) => {
    onChange({
      ...values,
      [definitionId]: {
        definitionId,
        valueText: values[definitionId]?.valueText ?? "",
        valueJson: values[definitionId]?.valueJson ?? [],
        ...patch,
      },
    });
  };

  return (
    <div className="space-y-4">
      {definitions.map((def) => {
        const entry = values[def.id] || {
          definitionId: def.id,
          valueText: "",
          valueJson: [],
        };
        const options = normalizeFieldOptions(def.options_json);
        const isArchived = def.status === "archived";

        return (
          <div key={def.id} className="space-y-2">
            <Label className="aixia-tasks-label flex items-center gap-2">
              <span>
                {def.title}
                {def.is_required && def.status === "active" ? (
                  <span className="text-red-400"> *</span>
                ) : null}
              </span>
              {isArchived ? (
                <span className="aixia-dash-pill aixia-tasks-pill--planning text-[10px]">
                  Archived field
                </span>
              ) : null}
            </Label>
            {def.description ? (
              <p className="aixia-tasks-muted text-xs">{def.description}</p>
            ) : null}

            {def.field_type === "plain_text" && (
              <Input
                value={entry.valueText || ""}
                onChange={(e) => setValue(def.id, { valueText: e.target.value })}
                disabled={disabled || readOnly}
                className="aixia-tasks-input"
              />
            )}

            {def.field_type === "textarea" && (
              <Textarea
                value={entry.valueText || ""}
                onChange={(e) => setValue(def.id, { valueText: e.target.value })}
                disabled={disabled || readOnly}
                rows={3}
                className="bg-slate-950 aixia-tasks-divider text-white resize-none"
              />
            )}

            {def.field_type === "datetime" && (
              <Input
                type="datetime-local"
                value={entry.valueText || ""}
                onChange={(e) => setValue(def.id, { valueText: e.target.value })}
                disabled={disabled || readOnly}
                className="aixia-tasks-input"
              />
            )}

            {(def.field_type === "dropdown" || def.field_type === "radio_list") && (
              <Select
                value={entry.valueText || ""}
                onValueChange={(v) => setValue(def.id, { valueText: v })}
                disabled={disabled || readOnly}
              >
                <SelectTrigger className="aixia-tasks-input">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent className="aixia-tasks-select-content">
                  {options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {usesValueJson(def.field_type) && (
              <div className="space-y-2 rounded-lg border aixia-tasks-divider bg-slate-950/50 p-3">
                {options.map((opt) => {
                  const selected = (entry.valueJson || []).includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 text-sm text-white cursor-pointer"
                    >
                      <Checkbox
                        checked={selected}
                        disabled={disabled || readOnly}
                        onCheckedChange={(checked) => {
                          const current = new Set(entry.valueJson || []);
                          if (checked) {
                            if (
                              def.field_type === "radio_list" ||
                              !def.allows_multiple
                            ) {
                              current.clear();
                              current.add(opt.value);
                            } else {
                              current.add(opt.value);
                            }
                          } else {
                            current.delete(opt.value);
                          }
                          setValue(def.id, { valueJson: Array.from(current) });
                        }}
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
