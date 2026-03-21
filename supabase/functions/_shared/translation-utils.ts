type CacheEntry = {
  translatedText: string;
  quality: "fast" | "cloud";
  expiresAt: number;
};

type InFlightValue = {
  promise: Promise<TranslateResult>;
  createdAt: number;
};

export type TranslateResult = {
  translatedText: string;
  quality: "fast" | "cloud";
  source: "memory" | "db" | "ecs" | "cloud";
};

const MEMORY_TTL_MS = 10 * 60 * 1000;
const MAX_INFLIGHT_AGE_MS = 2 * 60 * 1000;

const memoryCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, InFlightValue>();
let supportedLanguagesCache:
  | { values: Set<string>; expiresAt: number }
  | null = null;

export function normalizeText(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateText(input: string): void {
  if (!input || !input.trim()) {
    throw new Error("Text is required.");
  }

  if (input.length > 5000) {
    throw new Error("Text exceeds maximum allowed length of 5000 characters.");
  }
}

export function chunkText(input: string, maxChunkLength = 900): string[] {
  if (input.length <= maxChunkLength) return [input];

  const parts: string[] = [];
  let remaining = input;

  while (remaining.length > maxChunkLength) {
    let splitAt = remaining.lastIndexOf(" ", maxChunkLength);
    if (splitAt < Math.floor(maxChunkLength * 0.6)) {
      splitAt = maxChunkLength;
    }

    parts.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) parts.push(remaining);
  return parts;
}

export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function makeCacheKey(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string> {
  const normalized = normalizeText(text);
  return await sha256(`${normalized}::${sourceLang}::${targetLang}`);
}

export function getMemoryCache(key: string): TranslateResult | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return {
    translatedText: entry.translatedText,
    quality: entry.quality,
    source: "memory",
  };
}

export function setMemoryCache(
  key: string,
  translatedText: string,
  quality: "fast" | "cloud",
): void {
  memoryCache.set(key, {
    translatedText,
    quality,
    expiresAt: Date.now() + MEMORY_TTL_MS,
  });
}

export function getInFlight(key: string): Promise<TranslateResult> | null {
  const found = inFlightRequests.get(key);
  if (!found) return null;

  if (Date.now() - found.createdAt > MAX_INFLIGHT_AGE_MS) {
    inFlightRequests.delete(key);
    return null;
  }

  return found.promise;
}

export function setInFlight(
  key: string,
  promise: Promise<TranslateResult>,
): void {
  inFlightRequests.set(key, {
    promise,
    createdAt: Date.now(),
  });
}

export function clearInFlight(key: string): void {
  inFlightRequests.delete(key);
}

export async function getSupportedLanguages(
  libreTranslateBaseUrl: string,
): Promise<Set<string>> {
  if (supportedLanguagesCache && supportedLanguagesCache.expiresAt > Date.now()) {
    return supportedLanguagesCache.values;
  }

  const res = await fetch(`${libreTranslateBaseUrl}/languages`, {
    method: "GET",
    headers: { "Accept": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Failed to load languages: ${res.status}`);
  }

  const data = await res.json();
  const values = new Set<string>(
    Array.isArray(data) ? data.map((item) => String(item.code).toLowerCase()) : [],
  );

  supportedLanguagesCache = {
    values,
    expiresAt: Date.now() + 30 * 60 * 1000,
  };

  return values;
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
