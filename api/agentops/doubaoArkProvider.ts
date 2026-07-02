/**
 * Volcano Ark (Doubao) Responses API — server-side only. Never expose ARK_API_KEY to clients.
 */

import { readServerEnv } from "./ollamaProxy.js";
import { isOkResultFailed, okResultError } from "./okResult.js";

export type DoubaoArkMessageRole = "system" | "user" | "assistant";

export type DoubaoArkMessage = {
  role: DoubaoArkMessageRole;
  content: string;
};

const DEFAULT_ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const DEFAULT_ARK_MODEL = "doubao-seed-2-0-pro-260215";

export function getDoubaoArkConfig(): {
  baseUrl: string;
  model: string;
  apiKey: string | undefined;
  timeoutMs: number;
} {
  const baseUrl = (readServerEnv("ARK_BASE_URL") ?? DEFAULT_ARK_BASE_URL).replace(/\/+$/, "");
  const model = readServerEnv("ARK_MODEL") ?? DEFAULT_ARK_MODEL;
  const apiKey = readServerEnv("ARK_API_KEY");
  const timeoutMs = Number(readServerEnv("HERMES_TIMEOUT_MS") ?? "120000");
  return { baseUrl, model, apiKey, timeoutMs };
}

export function isDoubaoArkConfigured(): boolean {
  const { apiKey, baseUrl, model } = getDoubaoArkConfig();
  return Boolean(apiKey && baseUrl && model);
}

function buildDoubaoInput(messages: DoubaoArkMessage[], mergeSystemIntoUser: boolean) {
  if (mergeSystemIntoUser) {
    const systemText = messages
      .filter((message) => message.role === "system")
      .map((message) => message.content.trim())
      .filter(Boolean)
      .join("\n\n");
    const userText = messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => message.content.trim())
      .filter(Boolean)
      .join("\n\n");
    const combined = [
      systemText ? `System instructions:\n${systemText}` : "",
      userText ? `User request:\n${userText}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    return [
      {
        role: "user",
        content: [{ type: "input_text", text: combined }],
      },
    ];
  }

  return messages.map((message) => ({
    role: message.role,
    content: [{ type: "input_text", text: message.content }],
  }));
}

function collectResponseText(value: unknown, out: string[], depth = 0): void {
  if (depth > 10 || value == null) return;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) out.push(trimmed);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectResponseText(item, out, depth + 1);
    return;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") collectResponseText(record.text, out, depth + 1);
    if (typeof record.content === "string") collectResponseText(record.content, out, depth + 1);
    if (typeof record.output_text === "string") collectResponseText(record.output_text, out, depth + 1);
    for (const key of ["output", "content", "message", "choices", "data", "result"]) {
      if (key in record) collectResponseText(record[key], out, depth + 1);
    }
  }
}

export function parseDoubaoArkResponseText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text.trim();
  }

  const collected: string[] = [];
  collectResponseText(record.output, collected);
  if (collected.length > 0) {
    return collected.join("\n").trim();
  }

  collectResponseText(record, collected);
  const unique = [...new Set(collected)].filter(Boolean);
  if (unique.length > 0) return unique.join("\n").trim();

  try {
    const fallback = JSON.stringify(record);
    if (fallback.length > 0 && fallback.length <= 500) return fallback;
  } catch {
    /* ignore */
  }

  return null;
}

function sanitizeDoubaoError(status: number, rawBody: string, apiKey?: string): string {
  let body = rawBody.slice(0, 400);
  if (apiKey) {
    body = body.split(apiKey).join("[REDACTED]");
  }
  body = body.replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]");
  return body ? `Doubao Ark HTTP ${status}: ${body}` : `Doubao Ark HTTP ${status}`;
}

async function postDoubaoResponsesRequest(
  input: ReturnType<typeof buildDoubaoInput>,
  model: string,
  timeoutMs: number,
  apiKey: string,
  baseUrl: string,
): Promise<{ ok: true; payload: unknown } | { ok: false; error: string; status?: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input }),
      signal: controller.signal,
    });

    const rawBody = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        error: sanitizeDoubaoError(response.status, rawBody, apiKey),
        status: response.status,
      };
    }

    try {
      return { ok: true, payload: JSON.parse(rawBody) as unknown };
    } catch {
      return { ok: false, error: "Doubao Ark returned non-JSON response." };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message.includes("abort") ? "Doubao Ark request timed out." : message };
  } finally {
    clearTimeout(timer);
  }
}

export async function callDoubaoArkResponses(options: {
  messages: DoubaoArkMessage[];
  model?: string;
  timeoutMs?: number;
}): Promise<{ ok: true; content: string; model: string } | { ok: false; error: string }> {
  const config = getDoubaoArkConfig();
  if (!config.apiKey) {
    return { ok: false, error: "Doubao Ark API key not configured." };
  }

  const model = options.model?.trim() || config.model;
  const timeoutMs = options.timeoutMs ?? config.timeoutMs;
  const hasSystem = options.messages.some((message) => message.role === "system");

  if (hasSystem) {
    const withSystem = buildDoubaoInput(options.messages, false);
    const firstAttempt = await postDoubaoResponsesRequest(
      withSystem,
      model,
      timeoutMs,
      config.apiKey,
      config.baseUrl,
    );
    if (firstAttempt.ok) {
      const content = parseDoubaoArkResponseText(firstAttempt.payload);
      if (content) return { ok: true, content, model };
      return { ok: false, error: "Doubao Ark returned empty content." };
    }
    if (firstAttempt.status && firstAttempt.status >= 400 && firstAttempt.status < 500) {
      const merged = buildDoubaoInput(options.messages, true);
      const retry = await postDoubaoResponsesRequest(
        merged,
        model,
        timeoutMs,
        config.apiKey,
        config.baseUrl,
      );
      if (retry.ok) {
        const content = parseDoubaoArkResponseText(retry.payload);
        if (content) return { ok: true, content, model };
        return { ok: false, error: "Doubao Ark returned empty content." };
      }
      if (isOkResultFailed(retry)) {
        return { ok: false, error: okResultError(retry) };
      }
    }
    if (isOkResultFailed(firstAttempt)) {
      return { ok: false, error: okResultError(firstAttempt) };
    }
  }

  const userOnly = buildDoubaoInput(options.messages, false);
  const attempt = await postDoubaoResponsesRequest(
    userOnly,
    model,
    timeoutMs,
    config.apiKey,
    config.baseUrl,
  );
  if (isOkResultFailed(attempt)) return { ok: false, error: okResultError(attempt) };
  const content = parseDoubaoArkResponseText(attempt.payload);
  if (!content) return { ok: false, error: "Doubao Ark returned empty content." };
  return { ok: true, content, model };
}
