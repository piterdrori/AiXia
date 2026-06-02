/**
 * Staging-only: create/update 12 synthetic AgentOps browser QA users.
 * Requires SUPABASE_URL (or VITE_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY + password env.
 * Never logs passwords or service role keys.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const STAGING_REF = "ydppcpbxrvvardeslzrk";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const usersJsonPath = path.join(repoRoot, "qa-agent", "browser-qa", "synthetic-browser-users.json");
const envLocalPath = path.join(repoRoot, ".env.local");
const syntheticEnvPath = path.join(repoRoot, "qa-agent", "browser-qa", ".env.synthetic-users.local");
const ownerEnvPath = path.join(repoRoot, "qa-agent", "browser-qa", ".env.owner.local");

const OWNER_NOTES =
  "Synthetic AgentOps Owner QA user for readonly browser smoke testing";

function parseEnvFile(filePath, target) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
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
    if (!target[key]) target[key] = value;
  }
}

function loadConfigEnv() {
  const merged = { ...process.env };
  parseEnvFile(envLocalPath, merged);
  parseEnvFile(syntheticEnvPath, merged);
  parseEnvFile(ownerEnvPath, merged);
  return merged;
}

function resolveSharedPassword(env) {
  return env.AGENTOPS_QA_SYNTHETIC_PASSWORD || env.AGENTOPS_QA_OWNER_PASSWORD || "";
}

function resolveSupabaseUrl(env) {
  return env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
}

function resolvePassword(env, userSpec, sharedPassword) {
  const perUser = env[userSpec.envVarPasswordName];
  if (perUser?.trim()) return perUser.trim();
  if (sharedPassword?.trim()) return sharedPassword.trim();
  return null;
}

function missingEnvReport(env) {
  const missing = [];
  const url = resolveSupabaseUrl(env);
  if (!url) missing.push("SUPABASE_URL (or VITE_SUPABASE_URL)");
  if (!env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  const shared = resolveSharedPassword(env);
  const anyPerUser = JSON.parse(fs.readFileSync(usersJsonPath, "utf8")).users.some(
    (u) => env[u.envVarPasswordName],
  );
  if (!shared && !anyPerUser) {
    missing.push("AGENTOPS_QA_SYNTHETIC_PASSWORD (or per-user AGENTOPS_QA_*_PASSWORD)");
  }
  return missing;
}

async function listAllUsers(admin) {
  const users = [];
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    users.push(...(data?.users ?? []));
    if (!data?.users?.length || data.users.length < perPage) break;
    page += 1;
  }
  return users;
}

async function ensureAuthUser(admin, email, password, displayName, qaUserId) {
  const all = await listAllUsers(admin);
  const existing = all.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: displayName,
        synthetic_qa: true,
        qa_user_id: qaUserId,
        purpose: "agentops_browser_qa_staging",
      },
    });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    return { userId: data.user.id, created: true };
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: {
      ...existing.user_metadata,
      full_name: displayName,
      synthetic_qa: true,
      qa_user_id: qaUserId,
      purpose: "agentops_browser_qa_staging",
    },
  });
  if (updateError) throw new Error(`updateUser ${email}: ${updateError.message}`);
  return { userId: existing.id, created: false };
}

function resolveMemberType(qaUserId) {
  if (qaUserId === "vendor-external") return "supplier";
  if (qaUserId === "tenant-admin") return "operations_manager";
  if (qaUserId === "finance-admin" || qaUserId === "finance-viewer") return "finance";
  if (qaUserId === "hr-admin" || qaUserId === "hr-employee") return "operations";
  return null;
}

async function ensureProfile(admin, userId, userSpec) {
  const company =
    userSpec.qaUserId === "vendor-external"
      ? "Synthetic External Vendor QA"
      : userSpec.qaUserId === "tenant-admin"
        ? "Synthetic Tenant QA Org"
        : "Synthetic QA (staging)";

  const payload = {
    email: userSpec.email,
    full_name: userSpec.displayName,
    display_name: userSpec.displayName,
    role: userSpec.profileRole,
    status: userSpec.profileStatus,
    profile_completed: userSpec.profileCompleted,
    company,
    job_title: `${userSpec.displayName} — staging browser QA`,
    permissions: userSpec.permissionOverrides ?? {},
  };

  const memberType = resolveMemberType(userSpec.qaUserId);
  if (memberType) payload.member_type = memberType;

  const { error } = await admin.from("profiles").update(payload).eq("user_id", userId);
  if (error) throw new Error(`profile update ${userSpec.email}: ${error.message}`);
}

async function syncAgentOpsOwner(admin, userId, grant) {
  if (grant) {
    const { error } = await admin.from("agentops_owners").upsert(
      { user_id: userId, active: true, notes: OWNER_NOTES },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(`agentops_owners upsert: ${error.message}`);
    return "granted";
  }

  const { data: row } = await admin
    .from("agentops_owners")
    .select("user_id, active")
    .eq("user_id", userId)
    .maybeSingle();

  if (row?.user_id) {
    const { error } = await admin
      .from("agentops_owners")
      .update({
        active: false,
        notes: "Synthetic QA user — AgentOps owner access explicitly denied",
      })
      .eq("user_id", userId);
    if (error) throw new Error(`agentops_owners deactivate: ${error.message}`);
    return "deactivated";
  }
  return "none";
}

async function main() {
  const env = loadConfigEnv();
  const missing = missingEnvReport(env);

  if (missing.length > 0) {
    console.log(
      JSON.stringify({
        ok: false,
        ran: false,
        stagingOnly: true,
        missingEnvVars: missing,
        message:
          "Set missing env vars in shell or gitignored qa-agent/browser-qa/.env.synthetic-users.local, then rerun npm run qa:create-synthetic-users",
        passwordPrinted: false,
      }),
    );
    process.exit(0);
  }

  const url = resolveSupabaseUrl(env);
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url.includes(STAGING_REF)) {
    throw new Error(`Refusing to run: Supabase URL is not staging (${STAGING_REF}).`);
  }

  const catalog = JSON.parse(fs.readFileSync(usersJsonPath, "utf8"));
  const users = catalog.users;
  if (users.length !== 12) {
    throw new Error(`Expected 12 users in synthetic-browser-users.json, found ${users.length}`);
  }

  const sharedPassword = resolveSharedPassword(env);
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results = [];
  let createdCount = 0;
  let skippedAuthCreateCount = 0;
  let profilesUpdated = 0;
  let agentopsOwnerRows = 0;
  let agentopsDeactivated = 0;

  for (const userSpec of users) {
    const password = resolvePassword(env, userSpec, sharedPassword);
    if (!password) {
      throw new Error(`No password for ${userSpec.email} — set AGENTOPS_QA_SYNTHETIC_PASSWORD`);
    }

    const { userId, created } = await ensureAuthUser(
      admin,
      userSpec.email,
      password,
      userSpec.displayName,
      userSpec.qaUserId,
    );
    if (created) createdCount += 1;
    else skippedAuthCreateCount += 1;

    await ensureProfile(admin, userId, userSpec);
    profilesUpdated += 1;

    const ownerSync = await syncAgentOpsOwner(admin, userId, userSpec.agentOpsOwnerAccess);
    if (ownerSync === "granted") agentopsOwnerRows += 1;
    if (ownerSync === "deactivated") agentopsDeactivated += 1;

    results.push({
      qaUserId: userSpec.qaUserId,
      email: userSpec.email,
      userId,
      authCreated: created,
      profileRole: userSpec.profileRole,
      agentOpsOwnerAccess: userSpec.agentOpsOwnerAccess,
      agentopsOwnersSync: ownerSync,
    });
  }

  const envLines = [
    "# Staging synthetic QA users — gitignored, never commit",
    `# SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY: use .env.local or set here`,
    `AGENTOPS_QA_SYNTHETIC_PASSWORD=${sharedPassword || "(per-user passwords in env)"}`,
    "",
  ];
  for (const u of users) {
    envLines.push(`${u.envVarEmailName}=${u.email}`);
    const pw = resolvePassword(env, u, sharedPassword);
    if (pw) envLines.push(`${u.envVarPasswordName}=${pw}`);
  }
  envLines.push("");
  fs.writeFileSync(syntheticEnvPath, envLines.join("\n"), "utf8");

  const owner = users.find((u) => u.agentOpsOwnerAccess);
  if (owner) {
    const ownerPw = resolvePassword(env, owner, sharedPassword);
    fs.writeFileSync(
      ownerEnvPath,
      [
        "# Staging synthetic Owner QA — gitignored",
        `${owner.envVarEmailName}=${owner.email}`,
        `${owner.envVarPasswordName}=${ownerPw}`,
        "",
      ].join("\n"),
      "utf8",
    );
  }

  const nonOwnerStillActiveInAllowlist = [];
  for (const r of results) {
    if (r.agentOpsOwnerAccess) continue;
    const { data: row } = await admin
      .from("agentops_owners")
      .select("active")
      .eq("user_id", r.userId)
      .maybeSingle();
    if (row?.active) nonOwnerStillActiveInAllowlist.push(r.email);
  }

  const syntheticOwner = results.find((r) => r.agentOpsOwnerAccess);

  console.log(
    JSON.stringify({
      ok: true,
      ran: true,
      stagingProjectRef: STAGING_REF,
      usersDefined: 12,
      usersCreated: createdCount,
      usersSkippedAuthCreate: skippedAuthCreateCount,
      profilesUpdated,
      agentopsOwnerRowsGranted: agentopsOwnerRows,
      agentopsOwnerRowsDeactivated: agentopsDeactivated,
      syntheticOwnerEmail: syntheticOwner?.email ?? null,
      syntheticOwnerUserId: syntheticOwner?.userId ?? null,
      nonOwnerStillActiveInAllowlist,
      onlyOwnerHasAgentOpsAmongSynthetic: nonOwnerStillActiveInAllowlist.length === 0,
      results,
      envFilesWritten: [
        "qa-agent/browser-qa/.env.synthetic-users.local",
        "qa-agent/browser-qa/.env.owner.local",
      ],
      passwordPrinted: false,
    }),
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
