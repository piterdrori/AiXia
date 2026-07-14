/**
 * AgentOps Phase A — TTS preference + messenger eligibility verify.
 * Run: npx tsx scripts/agentops-tts-preference-verify.ts
 */

import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import {
  isAgentOpsMessengerMessageAutoSpeakEligible,
  resolveAgentOpsMessengerMessageId,
  seedAgentOpsTtsHistoryMessageIds,
  selectNextAgentOpsTtsSpeakCandidate,
} from "../src/lib/agentops/agentOpsMessengerTtsEligibility";
import {
  AGENTOPS_TTS_ENABLED_STORAGE_KEY,
  getAgentOpsTtsEnabled,
  getAgentOpsTtsPreferenceDefault,
  parseAgentOpsTtsPreferenceStoredValue,
  setAgentOpsTtsEnabled,
  subscribeAgentOpsTtsPreference,
} from "../src/lib/agentops/agentOpsTtsPreference";

function installLocalStorageMock(initial?: Map<string, string>) {
  const store = initial ?? new Map<string, string>();
  const emitter = new EventEmitter();
  const listeners = new Map<string, Set<(event: Event) => void>>();

  const localStorage = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      const oldValue = store.has(key) ? store.get(key)! : null;
      store.set(key, String(value));
      const event = {
        key,
        oldValue,
        newValue: String(value),
        storageArea: localStorage,
      } as StorageEvent;
      emitter.emit("storage", event);
      for (const listener of listeners.get("storage") ?? []) listener(event);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };

  const windowLike = {
    localStorage,
    addEventListener(type: string, listener: EventListener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener as (event: Event) => void);
    },
    removeEventListener(type: string, listener: EventListener) {
      listeners.get(type)?.delete(listener as (event: Event) => void);
    },
    dispatchEvent(event: Event) {
      for (const listener of listeners.get(event.type) ?? []) {
        listener(event);
      }
      return true;
    },
  };

  (globalThis as { window?: typeof windowLike }).window = windowLike;
  return { store, windowLike, emitter };
}

function uninstallWindow() {
  delete (globalThis as { window?: unknown }).window;
}

function main() {
  assert.equal(getAgentOpsTtsPreferenceDefault(), false, "default is OFF");
  assert.equal(parseAgentOpsTtsPreferenceStoredValue(null), false, "absent → OFF");
  assert.equal(parseAgentOpsTtsPreferenceStoredValue("true"), true, "stored true → ON");
  assert.equal(parseAgentOpsTtsPreferenceStoredValue("false"), false, "stored false → OFF");
  assert.equal(parseAgentOpsTtsPreferenceStoredValue("nope"), false, "invalid → OFF");
  assert.equal(AGENTOPS_TTS_ENABLED_STORAGE_KEY, "agentops.tts.enabled", "storage key");

  const { store } = installLocalStorageMock();
  assert.equal(getAgentOpsTtsEnabled(), false, "fresh storage defaults OFF");

  const sameTabUpdates: boolean[] = [];
  const unsubscribe = subscribeAgentOpsTtsPreference((enabled) => {
    sameTabUpdates.push(enabled);
  });

  setAgentOpsTtsEnabled(true);
  assert.equal(store.get(AGENTOPS_TTS_ENABLED_STORAGE_KEY), "true", "writes immediately");
  assert.equal(getAgentOpsTtsEnabled(), true, "reads ON");
  assert.ok(sameTabUpdates.includes(true), "same-tab subscriber updated");

  setAgentOpsTtsEnabled(false);
  assert.equal(store.get(AGENTOPS_TTS_ENABLED_STORAGE_KEY), "false", "writes OFF");
  assert.ok(sameTabUpdates.includes(false), "same-tab OFF");
  unsubscribe();

  const crossTabUpdates: boolean[] = [];
  const stopCross = subscribeAgentOpsTtsPreference((enabled, meta) => {
    if (meta.source === "storage") crossTabUpdates.push(enabled);
  });
  // Simulate another tab writing the key (storage event only).
  (globalThis as { window: { localStorage: Storage } }).window.localStorage.setItem(
    AGENTOPS_TTS_ENABLED_STORAGE_KEY,
    "true",
  );
  assert.ok(crossTabUpdates.includes(true), "cross-tab storage event updates preference");
  stopCross();

  uninstallWindow();
  assert.equal(getAgentOpsTtsEnabled(), false, "no window → OFF");
  setAgentOpsTtsEnabled(true);

  installLocalStorageMock();
  const failing = (globalThis as { window: { localStorage: Storage } }).window.localStorage;
  failing.getItem = () => {
    throw new Error("denied");
  };
  failing.setItem = () => {
    throw new Error("denied");
  };
  assert.equal(getAgentOpsTtsEnabled(), false, "getItem throw → OFF");
  setAgentOpsTtsEnabled(false);

  assert.equal(
    isAgentOpsMessengerMessageAutoSpeakEligible({
      id: "1",
      senderType: "user",
      content: "hello",
    }),
    false,
    "owner never speaks",
  );
  assert.equal(
    isAgentOpsMessengerMessageAutoSpeakEligible({
      id: "2",
      senderType: "agent",
      content: "Agent could not reach the staging LLM just now.",
    }),
    false,
    "error/fallback never speaks",
  );
  assert.equal(
    isAgentOpsMessengerMessageAutoSpeakEligible({
      id: "3",
      senderType: "agent",
      content: "Looks good on staging.",
      skipAutoSpeak: true,
    }),
    false,
    "skipAutoSpeak respected",
  );
  assert.equal(
    isAgentOpsMessengerMessageAutoSpeakEligible({
      id: "4",
      senderType: "agent",
      content: '{"rewrittenPrompt":"x"}',
    }),
    false,
    "JSON bodies never auto-speak",
  );
  assert.equal(
    isAgentOpsMessengerMessageAutoSpeakEligible({
      id: "5",
      senderType: "agent",
      content: "Staging review complete for System Agent.",
    }),
    true,
    "normal agent reply eligible",
  );

  const history = [
    { id: "h1", senderType: "agent" as const, content: "Old reply" },
    { id: "h2", senderType: "user" as const, content: "Hi" },
  ];
  const handled = seedAgentOpsTtsHistoryMessageIds(history);
  assert.ok(handled.has("h1") && handled.has("h2"), "history ids seeded");
  assert.equal(
    selectNextAgentOpsTtsSpeakCandidate(history, handled),
    null,
    "seeded history never selected",
  );

  const nextMessages = [
    ...history,
    { id: "n1", senderType: "agent" as const, content: "Brand new reply after mount." },
  ];
  const next = selectNextAgentOpsTtsSpeakCandidate(nextMessages, handled);
  assert.ok(next && next.messageId === "n1", "new eligible agent message selected");

  const compositeId = resolveAgentOpsMessengerMessageId({
    senderType: "agent",
    senderName: "QA",
    createdAt: "2026-07-14",
    content: "Hello without id",
  });
  assert.ok(compositeId.startsWith("composite:"), "composite id fallback");

  uninstallWindow();
  console.log("[agentops-tts-preference-verify] PASS");
}

main();
