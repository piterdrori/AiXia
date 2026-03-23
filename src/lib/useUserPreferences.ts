import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Language } from "@/lib/translations";

type UserPreferences = {
  language: Language;
  timezone: string;
  dateFormat: string;
  isLoading: boolean;
};

export function useUserPreferences(): UserPreferences {
  const [language, setLanguage] = useState<Language>("en");
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !isMounted) {
          setIsLoading(false);
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("language, timezone, date_format")
          .eq("user_id", user.id)
          .single();

        if (!isMounted) return;

        setLanguage((data?.language as Language) || "en");
        setTimezone(data?.timezone || "UTC");
        setDateFormat(data?.date_format || "MM/DD/YYYY");
      } catch {
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    language,
    timezone,
    dateFormat,
    isLoading,
  };
}
