import { execSync, spawn } from "child_process";
import http from "http";
import net from "net";

/** Single source of truth for local AiXia dev URL (matches vite.config.ts and browser QA). */
export const DEV_HOST = process.env.AIXIA_DEV_HOST || "127.0.0.1";
export const DEV_PORT = Number(process.env.AIXIA_DEV_PORT || "5173");
export const DEV_URL =
  process.env.AGENTOPS_QA_BASE_URL ||
  process.env.VITE_DEV_SERVER_URL ||
  `http://${DEV_HOST}:${DEV_PORT}/`;

export function devLoginUrl() {
  return new URL("/login", DEV_URL).toString();
}

export function isPortListening(port = DEV_PORT, host = DEV_HOST) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const done = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(1500);
    socket.on("connect", () => done(true));
    socket.on("timeout", () => done(false));
    socket.on("error", () => done(false));
  });
}

export function isDevServerUp(url = DEV_URL) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(4000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

export function killListenersOnPort(port = DEV_PORT) {
  if (process.platform === "win32") {
    try {
      const output = execSync(`netstat -ano -p tcp | findstr :${port}`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const pids = new Set();
      for (const line of output.split(/\r?\n/)) {
        if (!line.includes("LISTENING")) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== "0") {
          pids.add(pid);
        }
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        } catch {
          // Process may already have exited.
        }
      }
      return pids.size;
    } catch {
      return 0;
    }
  }

  try {
    execSync(`lsof -ti tcp:${port} | xargs -r kill -9`, {
      stdio: "ignore",
      shell: true,
    });
    return 1;
  } catch {
    return 0;
  }
}

export function spawnViteDevServer({ stdio = "inherit" } = {}) {
  return spawn("npx", ["vite"], {
    cwd: process.cwd(),
    stdio,
    env: process.env,
    shell: true,
  });
}

export async function getDevServerStatus() {
  const listening = await isPortListening();
  const httpOk = listening ? await isDevServerUp() : false;
  return { listening, httpOk, url: DEV_URL };
}

export async function assertDevServerForQa() {
  const status = await getDevServerStatus();
  if (status.httpOk) {
    return status;
  }

  console.error("\nAiXia dev server is not reachable for browser QA.");
  console.error(`Expected: ${DEV_URL}`);
  console.error("\nStart or restart it in a dedicated terminal:");
  console.error("  npm run dev");
  console.error("  npm run dev:restart");
  console.error("\nThen check:");
  console.error("  npm run dev:status");
  console.error("");
  process.exit(1);
}

export function openDevServerInBrowser() {
  const url = DEV_URL;
  if (process.platform === "win32") {
    execSync(`start "" "${url}"`, { stdio: "ignore", shell: true });
    return;
  }
  if (process.platform === "darwin") {
    execSync(`open "${url}"`, { stdio: "ignore" });
    return;
  }
  execSync(`xdg-open "${url}"`, { stdio: "ignore" });
}
