import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import {
  DEFAULT_APP_CLOCK_SETTINGS,
  getClockNow,
  getClockNowIso,
  getClockNowMs,
  getClockOffsetMs,
  getClockTodayKey,
  normalizeClockSettings,
  readClockSettings,
  shiftDateByClock,
  shiftIsoByClock,
  writeClockSettingsCache,
  type AppClockSettings,
} from "@/lib/clock";

type AppClockContextValue = {
  isLoaded: boolean;
  settings: AppClockSettings;
  now: Date;
  nowMs: number;
  nowIso: string;
  offsetMs: number;
  todayKey: string;
  refresh: () => Promise<void>;
  shiftDate: (value?: string | number | Date | null) => Date;
  shiftIso: (value?: string | null) => string | null;
};

const AppClockContext = createContext<AppClockContextValue | null>(null);

export function ClockProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [settings, setSettings] = useState<AppClockSettings>(() =>
    readClockSettings()
  );
  const [nowMs, setNowMs] = useState<number>(() =>
    getClockNowMs(readClockSettings())
  );

  const refresh = async () => {
    try {
      const { data, error } = await supabase
        .from("app_clock_settings")
        .select("id, mode, offset_ms, fixed_now, updated_at")
        .eq("id", "global")
        .maybeSingle();

      if (error) {
        console.error("Failed to load app clock settings:", error);
        return;
      }

      const nextSettings = normalizeClockSettings(
        data ?? DEFAULT_APP_CLOCK_SETTINGS
      );

      setSettings(nextSettings);
      writeClockSettingsCache(nextSettings);
      setNowMs(getClockNowMs(nextSettings));
    } catch (error) {
      console.error("Failed to refresh app clock:", error);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    void refresh();

    const channel = supabase
      .channel("app-clock-settings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_clock_settings",
          filter: "id=eq.global",
        },
        (payload) => {
          const nextSettings = normalizeClockSettings(
            (payload.new as Partial<AppClockSettings> | null) ??
              DEFAULT_APP_CLOCK_SETTINGS
          );

          setSettings(nextSettings);
          writeClockSettingsCache(nextSettings);
          setNowMs(getClockNowMs(nextSettings));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(getClockNowMs(settings));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [settings]);

  const value = useMemo<AppClockContextValue>(
    () => ({
      isLoaded,
      settings,
      now: getClockNow(settings),
      nowMs,
      nowIso: getClockNowIso(settings),
      offsetMs: getClockOffsetMs(settings),
      todayKey: getClockTodayKey(settings),
      refresh,
      shiftDate: (input) => shiftDateByClock(input, settings),
      shiftIso: (input) => shiftIsoByClock(input, settings),
    }),
    [isLoaded, nowMs, settings]
  );

  return (
    <AppClockContext.Provider value={value}>
      {children}
    </AppClockContext.Provider>
  );
}

export function useAppClock() {
  const context = useContext(AppClockContext);

  if (!context) {
    throw new Error("useAppClock must be used inside ClockProvider");
  }

  return context;
}
