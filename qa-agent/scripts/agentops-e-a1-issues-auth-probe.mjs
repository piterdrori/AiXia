/**
 * Phase E-A1 — anonymous API rejection probe (staging).
 * Does not print secrets. Does not approve/promote.
 */
const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";

async function probe(path, init = {}) {
  const response = await fetch(`${base}${path}`, init);
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { path, status: response.status, ok: body?.ok, error: body?.error ?? null };
}

const results = [];
results.push(await probe("/api/agentops/monitoring/drafts?limit=5"));
results.push(
  await probe("/api/agentops/monitoring/drafts/decision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      draftId: "21109c88-4ca6-4afa-9546-f7db66f8bc13",
      decision: "owner_approved",
      ownerId: "spoofed-owner",
    }),
  }),
);
results.push(
  await probe("/api/agentops/monitoring/drafts/promote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      draftId: "21109c88-4ca6-4afa-9546-f7db66f8bc13",
      ownerId: "spoofed-owner",
    }),
  }),
);
results.push(
  await probe("/api/agentops/monitoring/drafts/prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      draftId: "21109c88-4ca6-4afa-9546-f7db66f8bc13",
      promptText: "spoof prompt",
      ownerId: "spoofed-owner",
    }),
  }),
);
results.push(
  await probe("/api/agentops/monitoring/drafts/decision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      draftId: "21109c88-4ca6-4afa-9546-f7db66f8bc13",
      decision: "needs_more_info",
      note: "spoof",
      ownerId: "spoofed-owner",
    }),
  }),
);
results.push(
  await probe("/api/agentops/monitoring/drafts/decision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      draftId: "21109c88-4ca6-4afa-9546-f7db66f8bc13",
      decision: "mark_duplicate",
      duplicateOf: "00000000-0000-4000-8000-000000000001",
      ownerId: "spoofed-owner",
    }),
  }),
);

const rejected = results.every((row) => row.status === 401 || row.status === 403);
console.log(
  JSON.stringify(
    {
      at: new Date().toISOString(),
      base,
      rejected,
      results,
    },
    null,
    2,
  ),
);
process.exit(rejected ? 0 : 2);
