
import { differenceInCalendarDays } from "date-fns";

export type AppClockMode = "live" | "fixed";

export type AppClockSettings = {
  id: "global";
  mode: AppClockMode;
  offset_ms: number;
  fixed_now: string | null;
  updated_at: string | null;
};

const CLOCK_STORAGE_KEY = "taskflow_clock_settings";

export const DEFAULT_APP_CLOCK_SETTINGS: AppClockSettings = {
  id: "global",
  mode: "live",
  offset_ms: 0,
  fixed_now: null,
  updated_at: null,
};

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function normalizeClockSettings(
  value?: Partial<AppClockSettings> | null
): AppClockSettings {
  const mode = value?.mode === "fixed" ? "fixed" : "live";

  const offsetMs =
    typeof value?.offset_ms === "number" && Number.isFinite(value.offset_ms)
      ? value.offset_ms
      : DEFAULT_APP_CLOCK_SETTINGS.offset_ms;

  return {
    id: "global",
    mode,
    offset_ms: offsetMs,
    fixed_now:
      typeof value?.fixed_now === "string" && value.fixed_now.trim().length > 0
        ? value.fixed_now
        : null,
    updated_at:
      typeof value?.updated_at === "string" && value.updated_at.trim().length > 0
        ? value.updated_at
        : null,
  };
}

export function readClockSettings(): AppClockSettings {
  if (!isBrowser()) {
    return DEFAULT_APP_CLOCK_SETTINGS;
  }

  const raw = window.localStorage.getItem(CLOCK_STORAGE_KEY);

  if (!raw) {
    return DEFAULT_APP_CLOCK_SETTINGS;
  }

  try {
    return normalizeClockSettings(JSON.parse(raw) as Partial<AppClockSettings>);
  } catch {
    return DEFAULT_APP_CLOCK_SETTINGS;
  }
}

export function writeClockSettingsCache(settings: AppClockSettings) {
  if (!isBrowser()) return;
  window.localStorage.setItem(CLOCK_STORAGE_KEY, JSON.stringify(settings));
}

export function clearClockSettingsCache() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(CLOCK_STORAGE_KEY);
}

export function getClockOffsetMs(
  settings: AppClockSettings = readClockSettings()
): number {
  if (settings.mode === "fixed" && settings.fixed_now) {
    const fixedMs = new Date(settings.fixed_now).getTime();

    if (!Number.isNaN(fixedMs)) {
      return fixedMs - Date.now();
    }
  }

  return settings.offset_ms;
}

export function getClockNow(
  settings: AppClockSettings = readClockSettings()
): Date {
  return new Date(Date.now() + getClockOffsetMs(settings));
}

export function getClockNowMs(
  settings: AppClockSettings = readClockSettings()
): number {
  return getClockNow(settings).getTime();
}

export function getClockNowIso(
  settings: AppClockSettings = readClockSettings()
): string {
  return getClockNow(settings).toISOString();
}

export function shiftDateByClock(
  value?: string | number | Date | null,
  settings: AppClockSettings = readClockSettings()
): Date {
  const base =
    value instanceof Date
      ? new Date(value.getTime())
      : value === null || typeof value === "undefined"
        ? new Date()
        : new Date(value);

  if (Number.isNaN(base.getTime())) {
    return new Date(NaN);
  }

  return new Date(base.getTime() + getClockOffsetMs(settings));
}

export function shiftIsoByClock(
  value?: string | null,
  settings: AppClockSettings = readClockSettings()
): string | null {
  if (!value) return null;

  const shifted = shiftDateByClock(value, settings);

  return Number.isNaN(shifted.getTime()) ? null : shifted.toISOString();
}

export function getClockTodayKey(
  settings: AppClockSettings = readClockSettings()
): string {
  const now = getClockNow(settings);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isClockToday(
  value: string | number | Date,
  settings: AppClockSettings = readClockSettings()
): boolean {
  const shifted = shiftDateByClock(value, settings);
  const now = getClockNow(settings);

  if (Number.isNaN(shifted.getTime())) return false;

  return differenceInCalendarDays(shifted, now) === 0;
}

export function isClockYesterday(
  value: string | number | Date,
  settings: AppClockSettings = readClockSettings()
): boolean {
  const shifted = shiftDateByClock(value, settings);
  const now = getClockNow(settings);

  if (Number.isNaN(shifted.getTime())) return false;

  return differenceInCalendarDays(now, shifted) === 1;
}
