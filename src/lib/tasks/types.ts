export type TaskFieldType =
  | "plain_text"
  | "textarea"
  | "datetime"
  | "checkbox_list"
  | "radio_list"
  | "dropdown"
  | "multi_select_dropdown";

export type TaskFieldDefinitionStatus = "active" | "archived" | "deleted";

export type TaskLifecycleFilter = "active" | "archived" | "deleted" | "all";

export type TaskRegistryFilter =
  | "all"
  | "main"
  | "subtasks"
  | "my"
  | "overdue"
  | "completed"
  | "archived";

export type TaskRowExtended = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  start_date: string | null;
  due_date: string | null;
  project_id: string | null;
  parent_task_id: string | null;
  assignee_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_status_update_at: string | null;
  archived_at: string | null;
  archived_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
};

export type ProjectTaskFieldDefinitionRow = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  field_type: TaskFieldType;
  is_required: boolean;
  include_by_default: boolean;
  allows_multiple: boolean;
  options_json: string[] | { label: string; value: string }[] | null;
  sort_order: number;
  status: TaskFieldDefinitionStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectTaskFieldValueRow = {
  id: string;
  task_id: string;
  field_definition_id: string;
  value_text: string | null;
  value_json: unknown;
  created_at: string;
  updated_at: string;
};

export type CustomFieldFormValue = {
  definitionId: string;
  valueText: string | null;
  valueJson: string[] | null;
};

export type CustomFieldPayloadItem = {
  fieldDefinitionId: string;
  valueText?: string | null;
  valueJson?: string[] | null;
};
