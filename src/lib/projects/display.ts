/** Same title line as project list/grid cards (`project.name`). */
export type ProjectCardFields = {
  name: string | null;
  description: string | null;
};

export function getProjectCardTitle(
  project: ProjectCardFields,
  untitledLabel: string,
): string {
  const title = (project.name ?? "").trim();
  return title || untitledLabel;
}

/** Same description line as project list/grid cards (`project.description`). */
export function getProjectCardDescription(
  project: ProjectCardFields,
  noDescriptionLabel: string,
): string {
  const description = (project.description ?? "").trim();
  return description || noDescriptionLabel;
}
