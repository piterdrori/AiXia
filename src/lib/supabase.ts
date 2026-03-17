import { createClient, type SupportedStorage } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

const hybridStorageAdapter: SupportedStorage = {
  getItem: (key: string) => {
    if (typeof window === "undefined") return null;

    const useLocalStorage = key.includes("code-verifier");

    return useLocalStorage
      ? window.localStorage.getItem(key)
      : window.sessionStorage.getItem(key);
  },

  setItem: (key: string, value: string) => {
    if (typeof window === "undefined") return;

    const useLocalStorage = key.includes("code-verifier");

    if (useLocalStorage) {
      window.localStorage.setItem(key, value);
      return;
    }

    window.sessionStorage.setItem(key, value);
  },

  removeItem: (key: string) => {
    if (typeof window === "undefined") return;

    const useLocalStorage = key.includes("code-verifier");

    if (useLocalStorage) {
      window.localStorage.removeItem(key);
      return;
    }

    window.sessionStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "implicit",
    storage: hybridStorageAdapter,
    storageKey: "taskflow-auth",
  },
  global: {
    headers: {
      "X-Client-Info": "taskflow-web",
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 5,
    },
  },
});
