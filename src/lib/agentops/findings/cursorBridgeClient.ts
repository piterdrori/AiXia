/**
 * E-A7 — browser client for the local Cursor bridge (127.0.0.1:17876).
 * The bridge runs only on the owner machine via `npm run agentops:cursor-bridge`.
 * Localhost is exempt from mixed-content blocking, so the HTTPS staging page may
 * probe it directly. No secrets ever travel through this client.
 */

export const CURSOR_BRIDGE_URL = "http://127.0.0.1:17876";
export const BRIDGE_TOKEN_STORAGE_KEY = "agentops.cursorBridgeToken";
export const CURSOR_BRIDGE_START_COMMAND = "npm run agentops:cursor-bridge";

export type CursorBridgeHealth = {
  online: boolean;
  cursorCliAvailable: boolean;
};

export type CursorBridgeFixResult = {
  accepted: boolean;
  status: number | null;
  mode: string | null;
  cursorLaunched: boolean;
  promptFile: string | null;
  needsToken: boolean;
  error: string | null;
};

export function readStoredBridgeToken(): string {
  try {
    return window.localStorage.getItem(BRIDGE_TOKEN_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function storeBridgeToken(token: string): void {
  try {
    if (token.trim()) window.localStorage.setItem(BRIDGE_TOKEN_STORAGE_KEY, token.trim());
    else window.localStorage.removeItem(BRIDGE_TOKEN_STORAGE_KEY);
  } catch {
    // Storage unavailable — token stays session-only in component state.
  }
}

/**
 * Chrome 138+ Local Network Access: fetches from a public HTTPS page to loopback
 * must declare targetAddressSpace and the owner must click "Allow" once when
 * Chrome asks for local network permission.
 */
const LOOPBACK_INIT = { targetAddressSpace: "loopback" } as RequestInit;

export async function probeCursorBridge(timeoutMs = 3000): Promise<CursorBridgeHealth> {
  try {
    const response = await fetch(`${CURSOR_BRIDGE_URL}/health`, {
      ...LOOPBACK_INIT,
      method: "GET",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return { online: false, cursorCliAvailable: false };
    const payload = (await response.json()) as {
      ok?: boolean;
      service?: string;
      cursorCliAvailable?: boolean;
    };
    return {
      online: payload.ok === true && payload.service === "agentops-cursor-bridge",
      cursorCliAvailable: payload.cursorCliAvailable === true,
    };
  } catch {
    return { online: false, cursorCliAvailable: false };
  }
}

export async function sendFixIssueToBridge(input: {
  issueId: string;
  issueTitle: string;
  prompt: string;
  token: string;
}): Promise<CursorBridgeFixResult> {
  try {
    const response = await fetch(`${CURSOR_BRIDGE_URL}/fix-issue`, {
      ...LOOPBACK_INIT,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bridge-Token": input.token,
      },
      body: JSON.stringify({
        issueId: input.issueId,
        issueTitle: input.issueTitle,
        prompt: input.prompt,
        branch: "staging",
        stagingUrl: window.location.origin,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      accepted?: boolean;
      mode?: string;
      cursorLaunched?: boolean;
      promptFile?: string;
      error?: string;
    };
    return {
      accepted: response.ok && payload.accepted === true,
      status: response.status,
      mode: payload.mode ?? null,
      cursorLaunched: payload.cursorLaunched === true,
      promptFile: payload.promptFile ?? null,
      needsToken: response.status === 401,
      error: payload.error ?? (response.ok ? null : `Bridge error (${response.status}).`),
    };
  } catch (error) {
    return {
      accepted: false,
      status: null,
      mode: null,
      cursorLaunched: false,
      promptFile: null,
      needsToken: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
