import type { Language } from "@/lib/translations";

type DateInput = string | number | Date;

const LANGUAGE_TO_LOCALE: Record<Language, string> = {
  en: "en-US",
  zh: "zh-CN",
  ru: "ru-RU",
};

function toDate(value: DateInput) {
  return value instanceof Date ? value : new Date(value);
}

function getLocale(language: Language) {
  return LANGUAGE_TO_LOCALE[language] || "en-US";
}

export function formatDateInTimezone(
  value: DateInput,
  language: Language,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
) {
  const date = toDate(value);

  return new Intl.DateTimeFormat(getLocale(language), {
    timeZone: timezone || "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  }).format(date);
}

export function formatDateTimeInTimezone(
  value: DateInput,
  language: Language,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
) {
  const date = toDate(value);

  return new Intl.DateTimeFormat(getLocale(language), {
    timeZone: timezone || "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(date);
}

export function formatTimeInTimezone(
  value: DateInput,
  language: Language,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
) {
  const date = toDate(value);

  return new Intl.DateTimeFormat(getLocale(language), {
    timeZone: timezone || "UTC",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(date);
}
