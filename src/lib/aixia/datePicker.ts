/** ISO date string helpers for shared AiXia date pickers (YYYY-MM-DD). */

export function parseAixiaDateValue(value: string | null | undefined) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return undefined;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function formatAixiaDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatAixiaDateDisplay(
  value: string | null | undefined,
  placeholder = "mm/dd/yyyy",
) {
  const parsed = parseAixiaDateValue(value);
  if (!parsed) return placeholder;
  return parsed.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

export function isAixiaDateBeforeMin(date: Date, min?: string) {
  if (!min) return false;
  return formatAixiaDateValue(date) < min;
}

export function isAixiaDateAfterMax(date: Date, max?: string) {
  if (!max) return false;
  return formatAixiaDateValue(date) > max;
}
