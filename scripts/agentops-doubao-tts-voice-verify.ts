/**
 * AgentOps Phase B — Doubao TTS voice route / normalize / config gates verify.
 * Run: npx tsx scripts/agentops-doubao-tts-voice-verify.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  getDoubaoTtsAccessToken,
  getDoubaoTtsServerConfig,
  mapDoubaoTtsOwnerError,
} from "../api/agentops/_lib/doubaoTtsConfig.ts";
import {
  chunkAgentOpsTtsText,
  normalizeAgentOpsTtsSpeakText,
} from "../src/lib/agentops/voice/agentOpsTtsNormalize.ts";
import {
  isAgentOpsMessengerMessageAutoSpeakEligible,
  seedAgentOpsTtsHistoryMessageIds,
  selectNextAgentOpsTtsSpeakCandidate,
} from "../src/lib/agentops/agentOpsMessengerTtsEligibility.ts";

function assertNoSecretLeak(source: string, label: string) {
  assert.equal(/DOUBAO_TTS_API_KEY|DOUBAO_TTS_ACCESS_TOKEN|Bearer;/.test(source), false, label);
}

function main() {
  // Config gates
  const empty = getDoubaoTtsServerConfig({});
  assert.equal(empty.canGenerateAudio, false, "empty env cannot generate");
  assert.ok(mapDoubaoTtsOwnerError(empty.blockingReason).includes("Doubao"), "owner-safe error");

  const ready = getDoubaoTtsServerConfig({
    DOUBAO_TTS_APP_ID: "app",
    DOUBAO_TTS_API_KEY: "secret-should-not-appear",
    DOUBAO_TTS_VOICE_ID: "voice",
    DOUBAO_TTS_API_URL: "https://openspeech.bytedance.com/api/v1/tts",
    AGENTOPS_DOUBAO_TTS_ACTIVE: "true",
    AGENTOPS_DOUBAO_TTS_OWNER_APPROVED: "true",
    VERCEL_ENV: "preview",
  });
  assert.equal(ready.canGenerateAudio, true, "configured + gates → ready");
  assert.equal(ready.cloud.accessTokenPresent, true, "token presence only");
  assert.equal(ready.cloud.appId, "app", "app id non-secret");
  assert.equal(
    getDoubaoTtsAccessToken({
      DOUBAO_TTS_API_KEY: "secret-should-not-appear",
    }),
    "secret-should-not-appear",
    "access token helper reads from env arg",
  );

  // Handler must not use dynamic-only env reads for secrets (Vercel Preview trap).
  const handlerSource = readFileSync(
    path.join(process.cwd(), "api/agentops/_lib/doubaoVoiceHandler.ts"),
    "utf8",
  );
  assert.ok(
    handlerSource.includes("getDoubaoTtsAccessToken"),
    "handler uses static-safe token helper",
  );
  assert.ok(
    handlerSource.includes("process.env.DOUBAO_TTS_API_KEY"),
    "handler also has static process.env.DOUBAO_TTS_API_KEY fallback",
  );
  assert.equal(
    /[^.]env\.DOUBAO_TTS_API_KEY/.test(handlerSource),
    false,
    "handler does not use bare env.DOUBAO_TTS_API_KEY (bundler-unsafe)",
  );

  const prodBlocked = getDoubaoTtsServerConfig({
    DOUBAO_TTS_APP_ID: "app",
    DOUBAO_TTS_API_KEY: "secret",
    DOUBAO_TTS_VOICE_ID: "voice",
    DOUBAO_TTS_API_URL: "https://openspeech.bytedance.com/api/v1/tts",
    AGENTOPS_DOUBAO_TTS_ACTIVE: "true",
    AGENTOPS_DOUBAO_TTS_OWNER_APPROVED: "true",
    VERCEL_ENV: "production",
  });
  assert.equal(prodBlocked.canGenerateAudio, false, "production blocked by default");

  // Normalize / chunk
  assert.equal(
    normalizeAgentOpsTtsSpeakText('Hello ```code``` world https://example.com/x'),
    "Hello world link",
    "strip code + soften url",
  );
  const long = "A".repeat(301);
  const chunks = chunkAgentOpsTtsText(long, 300);
  assert.ok(chunks.every((c) => c.length <= 300), "chunks within limit");
  assert.ok(chunks.length >= 2, "long text chunked");

  // History + rewrite eligibility unchanged
  const history = [{ id: "h1", senderType: "agent" as const, content: "Old" }];
  const handled = seedAgentOpsTtsHistoryMessageIds(history);
  assert.equal(selectNextAgentOpsTtsSpeakCandidate(history, handled), null);
  assert.equal(
    isAgentOpsMessengerMessageAutoSpeakEligible({
      id: "r1",
      senderType: "agent",
      content: '{"rewrittenPrompt":"huge"}',
    }),
    false,
    "rewrite JSON not spoken",
  );

  // Secret-safe client sources
  const clientProvider = readFileSync(
    path.join(process.cwd(), "src/lib/agentops/voice/agentOpsTtsProviders.ts"),
    "utf8",
  );
  assert.equal(/VITE_.*DOUBAO|process\.env\.DOUBAO/.test(clientProvider), false, "no client env secrets");
  assert.ok(
    mapDoubaoTtsOwnerError("credentials missing DOUBAO_TTS_API_KEY").includes("not configured"),
    "mapped errors hide secret names",
  );

  // Voice route exists and is thin
  const route = readFileSync(path.join(process.cwd(), "api/agentops/voice.ts"), "utf8");
  assert.ok(route.includes("handleAgentOpsVoiceRequest"), "voice route wires handler");

  console.log("[agentops-doubao-tts-voice-verify] PASS");
}

main();
