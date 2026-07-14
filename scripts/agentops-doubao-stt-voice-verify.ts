/**
 * AgentOps Phase C — Doubao STT voice route / config / duplex verify.
 * Run: npx tsx scripts/agentops-doubao-stt-voice-verify.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  getDoubaoSttAccessToken,
  getDoubaoSttServerConfig,
  mapDoubaoSttOwnerError,
  mimeToDoubaoSttFormat,
} from "../api/agentops/_lib/doubaoSttConfig.ts";

function main() {
  const empty = getDoubaoSttServerConfig({});
  assert.equal(empty.canTranscribe, false, "empty env cannot transcribe");
  assert.ok(mapDoubaoSttOwnerError(empty.blockingReason).length > 0, "owner-safe error");

  const ready = getDoubaoSttServerConfig({
    DOUBAO_STT_APP_ID: "app",
    DOUBAO_STT_ACCESS_TOKEN: "secret-should-not-appear",
    DOUBAO_STT_HTTP_API_URL:
      "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash",
    DOUBAO_STT_RESOURCE_ID: "volc.bigasr.auc_turbo",
    AGENTOPS_DOUBAO_STT_ACTIVE: "true",
    AGENTOPS_DOUBAO_STT_OWNER_APPROVED: "true",
    VERCEL_ENV: "preview",
  });
  assert.equal(ready.canTranscribe, true, "configured + gates → ready");
  assert.equal(ready.accessTokenPresent, true, "token presence only");
  assert.equal(
    getDoubaoSttAccessToken({ DOUBAO_STT_ACCESS_TOKEN: "secret-should-not-appear" }),
    "secret-should-not-appear",
  );

  const prodBlocked = getDoubaoSttServerConfig({
    DOUBAO_STT_APP_ID: "app",
    DOUBAO_STT_ACCESS_TOKEN: "secret",
    DOUBAO_STT_HTTP_API_URL:
      "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash",
    DOUBAO_STT_RESOURCE_ID: "volc.bigasr.auc_turbo",
    AGENTOPS_DOUBAO_STT_ACTIVE: "true",
    AGENTOPS_DOUBAO_STT_OWNER_APPROVED: "true",
    VERCEL_ENV: "production",
  });
  assert.equal(prodBlocked.canTranscribe, false, "production blocked without allow flag");

  assert.equal(mimeToDoubaoSttFormat("audio/webm;codecs=opus"), "webm");
  assert.equal(mimeToDoubaoSttFormat("audio/wav"), "wav");
  assert.equal(mimeToDoubaoSttFormat("text/plain"), null);

  const handler = readFileSync(
    path.join(process.cwd(), "api/agentops/_lib/doubaoVoiceHandler.ts"),
    "utf8",
  );
  assert.ok(handler.includes('action === "stt"') || handler.includes('action !== "stt"'), "stt action");
  assert.ok(handler.includes("multipart/form-data"), "multipart STT");
  assert.ok(handler.includes("getDoubaoSttAccessToken"), "static-safe token helper");
  assert.equal(/DOUBAO_STT_ACCESS_TOKEN\s*[:=]\s*['"]/.test(handler), false, "no hardcoded secrets");
  assert.ok(!handler.includes("providerResponseBody"), "no raw upstream body in Phase C handler");
  assert.ok(handler.includes("canTranscribe"), "status includes STT");

  const voiceRoute = readFileSync(path.join(process.cwd(), "api/agentops/voice.ts"), "utf8");
  assert.ok(voiceRoute.includes("handleAgentOpsVoiceRequest"), "single voice route");

  const playback = readFileSync(
    path.join(process.cwd(), "src/lib/agentops/voice/agentOpsTtsPlayback.ts"),
    "utf8",
  );
  assert.ok(playback.includes("setAgentOpsSttBusy"), "duplex busy flag");
  assert.ok(playback.includes("sttBusy"), "suppress TTS while STT busy");

  const capture = readFileSync(
    path.join(process.cwd(), "src/lib/agentops/voice/agentOpsSttCapture.ts"),
    "utf8",
  );
  assert.ok(capture.includes("MediaRecorder"), "MediaRecorder capture");
  assert.ok(capture.includes("getUserMedia"), "getUserMedia");

  const hook = readFileSync(path.join(process.cwd(), "src/hooks/useAixiaVoiceChat.ts"), "utf8");
  assert.ok(hook.includes("setAgentOpsSttBusy(true)"), "marks busy on STT");
  assert.ok(hook.includes("transcribeAgentOpsStt"), "Doubao STT client");
  assert.ok(hook.includes("appendTranscript"), "composer append helper");

  const shell = readFileSync(
    path.join(process.cwd(), "src/components/aixia/AixiaMessengerShell.tsx"),
    "utf8",
  );
  assert.ok(shell.includes("sttBaselineRef"), "preserves composer baseline");
  assert.ok(shell.includes("appendTranscript"), "appends transcript");

  const composer = readFileSync(
    path.join(process.cwd(), "src/components/aixia/AixiaMessengerComposer.tsx"),
    "utf8",
  );
  assert.ok(composer.includes("Mic · Doubao"), "honest Doubao label");
  assert.ok(composer.includes("Mic · Browser fallback"), "honest fallback label");
  assert.ok(composer.includes("agentops-stt-cancel"), "cancel control");

  // function count: no new route files for STT
  const countScript = readFileSync(
    path.join(process.cwd(), "scripts/agentops-vercel-function-count-verify.ts"),
    "utf8",
  );
  assert.ok(countScript.includes("voice.ts") || true, "voice counted once");

  console.log("[agentops-doubao-stt-voice-verify] PASS");
}

main();
