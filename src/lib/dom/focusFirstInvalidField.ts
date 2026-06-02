const INVALID_SELECTORS = [
  '[aria-invalid="true"]',
  ".aixia-field-error input",
  ".aixia-field-error textarea",
  ".aixia-field-error select",
  "input:invalid",
  "textarea:invalid",
  "select:invalid",
].join(", ");

export function focusFirstInvalidField(root: HTMLElement | Document = document) {
  const scope = root instanceof Document ? root : root;
  const first = scope.querySelector<HTMLElement>(INVALID_SELECTORS);
  if (!first) return false;

  const focusable =
    first.matches("input, textarea, select, button")
      ? first
      : first.querySelector<HTMLElement>("input, textarea, select, button");

  (focusable ?? first).focus({ preventScroll: true });
  first.scrollIntoView({ block: "center", behavior: "smooth" });
  return true;
}
