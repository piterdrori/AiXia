import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const ENV_FILES = [
  path.join(repoRoot, ".env.local"),
  path.join(repoRoot, "qa-agent", "browser-qa", ".env.synthetic-users.local"),
  path.join(repoRoot, "qa-agent", "browser-qa", ".env.owner.local"),
];

const PASSWORD_ENV_NAMES = [
  "AGENTOPS_QA_SYNTHETIC_PASSWORD",
  "AGENTOPS_QA_OWNER_PASSWORD",
  "AGENTOPS_QA_ADMIN_PASSWORD",
  "AGENTOPS_QA_FINANCE_ADMIN_PASSWORD",
  "AGENTOPS_QA_FINANCE_VIEWER_PASSWORD",
  "AGENTOPS_QA_EMPLOYEE_PASSWORD",
  "AGENTOPS_QA_HR_ADMIN_PASSWORD",
  "AGENTOPS_QA_HR_EMPLOYEE_PASSWORD",
  "AGENTOPS_QA_MANAGER_PASSWORD",
  "AGENTOPS_QA_AI_USER_PASSWORD",
  "AGENTOPS_QA_GUEST_PASSWORD",
  "AGENTOPS_QA_VENDOR_EXTERNAL_PASSWORD",
  "AGENTOPS_QA_TENANT_ADMIN_PASSWORD",
];

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const eq = trimmed.indexOf("=");
  if (eq < 0) return null;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

export function loadSyntheticUsersEnv() {
  for (const filePath of ENV_FILES) {
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;
      const allow =
        PASSWORD_ENV_NAMES.includes(parsed.key) ||
        parsed.key.startsWith("AGENTOPS_QA_") && parsed.key.endsWith("_PASSWORD");
      if (!allow) continue;
      if (!process.env[parsed.key]) process.env[parsed.key] = parsed.value;
    }
  }
}

export function resolveUserPassword(userSpec) {
  const perUser = process.env[userSpec.envVarPasswordName]?.trim();
  if (perUser) {
    return { password: perUser, passwordSource: "per-user" };
  }
  const shared = process.env.AGENTOPS_QA_SYNTHETIC_PASSWORD?.trim();
  if (shared) {
    return { password: shared, passwordSource: "shared" };
  }
  const ownerFallback = process.env.AGENTOPS_QA_OWNER_PASSWORD?.trim();
  if (ownerFallback) {
    return {
      password: ownerFallback,
      passwordSource: "owner-fallback",
      usedOwnerPasswordFallback: true,
    };
  }
  return null;
}

export function credentialStatusForUsers(users) {
  let configured = 0;
  let usedOwnerFallback = false;
  const perUser = [];

  for (const user of users) {
    const resolved = resolveUserPassword(user);
    if (resolved) {
      configured += 1;
      if (resolved.usedOwnerPasswordFallback) usedOwnerFallback = true;
    }
    perUser.push({
      qaUserId: user.qaUserId,
      email: user.email,
      configured: Boolean(resolved),
      passwordSource: resolved?.passwordSource ?? null,
    });
  }

  return {
    total: users.length,
    configured,
    skipped: users.length - configured,
    usedOwnerPasswordFallback: usedOwnerFallback,
    perUser,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  loadSyntheticUsersEnv();
  const catalogPath = path.join(repoRoot, "qa-agent", "browser-qa", "synthetic-browser-users.json");
  const users = JSON.parse(fs.readFileSync(catalogPath, "utf8")).users;
  const status = credentialStatusForUsers(users);
  console.log(`SYNTHETIC_USERS_TOTAL:${status.total}`);
  console.log(`SYNTHETIC_USERS_CONFIGURED:${status.configured}`);
  console.log(`SYNTHETIC_USERS_SKIPPED:${status.skipped}`);
  console.log(`USED_OWNER_PASSWORD_FALLBACK:${status.usedOwnerPasswordFallback}`);
}
