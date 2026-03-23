import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Language } from "@/lib/translations";

type UserPreferences = {
  language: Language;
  timezone: string;
  dateFormat: string;
  isLoading: boolean;
};

const USER_PREFERENCES_UPDATED_EVENT = "taskflow:user-preferences-updated";

async function loadUserPreferences() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      language: "en" as Language,
      timezone: "UTC",
      dateFormat: "MM/DD/YYYY",
    };
  }

  const { data } = await supabase
    .from("profiles")
    .select("language, timezone, date_format")
    .eq("user_id", user.id)
    .single();

  return {
    language: ((data?.language as Language) || "en") as Language,
    timezone: data?.timezone || "UTC",
    dateFormat: data?.date_format || "MM/DD/YYYY",
  };
}

export function useUserPreferences(): UserPreferences {
  const [language, setLanguage] = useState<Language>("en");
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const applyLatest = async () => {
      try {
        const next = await loadUserPreferences();
        if (!isMounted) return;

        setLanguage(next.language);
        setTimezone(next.timezone);
        setDateFormat(next.dateFormat);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void applyLatest();

    const handlePreferencesUpdated = () => {
      void applyLatest();
    };

    window.addEventListener(
      USER_PREFERENCES_UPDATED_EVENT,
      handlePreferencesUpdated
    );

    return () => {
      isMounted = false;
      window.removeEventListener(
        USER_PREFERENCES_UPDATED_EVENT,
        handlePreferencesUpdated
      );
    };
  }, []);

  return {
    language,
    timezone,
    dateFormat,
    isLoading,
  };
}

export function notifyUserPreferencesUpdated() {
  window.dispatchEvent(new Event(USER_PREFERENCES_UPDATED_EVENT));
}
