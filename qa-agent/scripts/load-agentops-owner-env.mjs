import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const ENV_FILES = [
  path.join(repoRoot, ".env.local"),
  path.join(repoRoot, "qa-agent", "browser-qa", ".env.owner.local"),
];

const OWNER_KEYS = ["AGENTOPS_QA_OWNER_EMAIL", "AGENTOPS_QA_OWNER_PASSWORD"];

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

export function loadAgentOpsOwnerEnv() {
  for (const filePath of ENV_FILES) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed || !OWNER_KEYS.includes(parsed.key)) continue;
      if (!process.env[parsed.key]) process.env[parsed.key] = parsed.value;
    }
  }
}

export function ownerEnvStatus() {
  return {
    emailPresent: Boolean(process.env.AGENTOPS_QA_OWNER_EMAIL?.trim()),
    passwordPresent: Boolean(process.env.AGENTOPS_QA_OWNER_PASSWORD?.trim()),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  loadAgentOpsOwnerEnv();
  const status = ownerEnvStatus();
  console.log(`AGENTOPS_QA_OWNER_EMAIL:${status.emailPresent ? "SET" : "MISSING"}`);
  console.log(`AGENTOPS_QA_OWNER_PASSWORD:${status.passwordPresent ? "SET" : "MISSING"}`);
}
