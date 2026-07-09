export class FetchTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = "FetchTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export type FetchWithTimeoutInit = RequestInit & {
  timeoutMs?: number;
};

/**
 * fetch with AbortSignal timeout — always clears the timer in finally.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: FetchWithTimeoutInit = {},
): Promise<Response> {
  const { timeoutMs = 18_000, ...requestInit } = init;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  if (requestInit.signal) {
    if (requestInit.signal.aborted) {
      window.clearTimeout(timer);
      controller.abort();
    } else {
      requestInit.signal.addEventListener(
        "abort",
        () => {
          window.clearTimeout(timer);
          controller.abort();
        },
        { once: true },
      );
    }
  }

  try {
    const response = await fetch(input, {
      ...requestInit,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new FetchTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}
