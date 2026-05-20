/** Same title line as task list/grid cards (`task.title`). */
export type TaskCardFields = {
  title: string | null;
  description?: string | null;
};

export function getTaskCardTitle(task: TaskCardFields, untitledLabel: string): string {
  const title = (task.title ?? "").trim();
  return title || untitledLabel;
}

/** Same description line as task list/grid cards (`task.description`). */
export function getTaskCardDescription(
  task: TaskCardFields,
  noDescriptionLabel: string,
): string {
  const description = (task.description ?? "").trim();
  return description || noDescriptionLabel;
}
