import { createClient } from "@supabase/supabase-js";

import { createSafeBrowserStorage } from "@/lib/safeBrowserStorage";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

const browserStorageAdapter = createSafeBrowserStorage();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "implicit",
    storage: browserStorageAdapter,
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
