/**
 * Staging-only: create synthetic AgentOps Owner QA user (ydppcpbxrvvardeslzrk).
 * Reads SUPABASE credentials from gitignored .env.local only.
 * Never logs passwords or service role keys.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const envLocalPath = path.join(repoRoot, ".env.local");
const ownerEnvPath = path.join(repoRoot, "qa-agent", "browser-qa", ".env.owner.local");

const OWNER_EMAIL = "qa+agentops-owner@aixia.local";
const OWNER_NOTES =
  "Synthetic AgentOps Owner QA user for readonly browser smoke testing";

function loadEnvLocal() {
  if (!fs.existsSync(envLocalPath)) {
    throw new Error(".env.local not found — staging Supabase keys required locally.");
  }
  const env = {};
  for (const line of fs.readFileSync(envLocalPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function generatePassword() {
  return crypto.randomBytes(24).toString("base64url");
}

async function main() {
  const env = loadEnvLocal();
  const url = env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env.local");
  }

  if (!url.includes("ydppcpbxrvvardeslzrk")) {
    throw new Error("Refusing to provision: .env.local is not pointed at aixia-staging.");
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const password = generatePassword();

  const { data: listData } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const existing = listData?.users?.find(
    (u) => u.email?.toLowerCase() === OWNER_EMAIL.toLowerCase(),
  );

  let userId = existing?.id ?? null;
  let createdAuth = false;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: OWNER_EMAIL,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: "AgentOps Owner QA",
        synthetic_qa: true,
        purpose: "agentops_owner_browser_smoke",
      },
    });
    if (error) throw new Error(`auth.admin.createUser failed: ${error.message}`);
    userId = data.user.id;
    createdAuth = true;
  } else {
    const { error: updateAuthError } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (updateAuthError) {
      throw new Error(`auth.admin.updateUserById failed: ${updateAuthError.message}`);
    }
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      email: OWNER_EMAIL,
      full_name: "AgentOps Owner QA",
      display_name: "AgentOps Owner QA",
      role: "admin",
      status: "active",
      profile_completed: true,
      company: "Synthetic QA",
      job_title: "AgentOps Owner QA (browser smoke)",
    })
    .eq("user_id", userId);

  if (profileError) {
    throw new Error(`profiles update failed: ${profileError.message}`);
  }

  const { error: ownerError } = await admin.from("agentops_owners").upsert(
    {
      user_id: userId,
      active: true,
      notes: OWNER_NOTES,
    },
    { onConflict: "user_id" },
  );

  if (ownerError) {
    throw new Error(`agentops_owners upsert failed: ${ownerError.message}`);
  }

  const ownerEnvLines = [
    "# Staging synthetic Owner QA — gitignored, never commit",
    `AGENTOPS_QA_OWNER_EMAIL=${OWNER_EMAIL}`,
    `AGENTOPS_QA_OWNER_PASSWORD=${password}`,
    "",
  ];
  fs.writeFileSync(ownerEnvPath, ownerEnvLines.join("\n"), "utf8");

  console.log(JSON.stringify({
    ok: true,
    stagingProjectRef: "ydppcpbxrvvardeslzrk",
    email: OWNER_EMAIL,
    userId,
    authUserCreated: createdAuth,
    profileUpdated: true,
    agentopsOwnerRow: true,
    ownerEnvFile: "qa-agent/browser-qa/.env.owner.local",
    passwordPrinted: false,
  }));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
