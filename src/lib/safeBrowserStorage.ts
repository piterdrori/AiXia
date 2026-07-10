import type { SupportedStorage } from "@supabase/supabase-js";

const memoryStore = new Map<string, string>();

function canUseLocalStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const probeKey = "__aixia_storage_probe__";
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

export function createSafeBrowserStorage(): SupportedStorage {
  const localStorageAvailable = canUseLocalStorage();

  return {
    getItem: (key: string) => {
      if (localStorageAvailable) {
        try {
          return window.localStorage.getItem(key);
        } catch {
          return memoryStore.get(key) ?? null;
        }
      }
      return memoryStore.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (localStorageAvailable) {
        try {
          window.localStorage.setItem(key, value);
          return;
        } catch {
          // fall through to memory
        }
      }
      memoryStore.set(key, value);
    },
    removeItem: (key: string) => {
      if (localStorageAvailable) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // ignore
        }
      }
      memoryStore.delete(key);
    },
  };
}

export function clearAuthStorageKeys(storageKey = "taskflow-auth"): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // ignore
  }

  memoryStore.delete(storageKey);
}

export const AUTH_BOOTSTRAP_TIMEOUT_MS = 15_000;
