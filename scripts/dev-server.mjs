#!/usr/bin/env node
/**
 * Reliable local dev server helper for AiXia.
 *
 * Prevents "site down" confusion from:
 * - multiple stale `npm run dev` processes
 * - port 5173 taken by a dead/zombie listener
 * - starting a second dev server on 5174 while QA expects 5173
 */
import {
  DEV_URL,
  assertDevServerForQa,
  getDevServerStatus,
  isDevServerUp,
  isPortListening,
  killListenersOnPort,
  openDevServerInBrowser,
  spawnViteDevServer,
} from "./dev-server-utils.mjs";

const command = process.argv[2] || "start";

async function printStatus() {
  const status = await getDevServerStatus();
  if (status.httpOk) {
    console.log(`Dev server: UP  ${status.url}`);
    return 0;
  }
  if (status.listening) {
    console.log(`Dev server: PORT BUSY (not responding)  ${status.url}`);
    console.log("Run: npm run dev:restart");
    return 1;
  }
  console.log(`Dev server: DOWN  ${status.url}`);
  console.log("Run: npm run dev");
  return 1;
}

async function startDev() {
  if (await isDevServerUp()) {
    console.log(`Dev server already running: ${DEV_URL}`);
    console.log("Keep that terminal open. Use npm run dev:restart to force a fresh server.");
    return 0;
  }

  const listening = await isPortListening();
  if (listening) {
    console.log(`Port ${new URL(DEV_URL).port} is in use but not serving the app. Clearing…`);
    killListenersOnPort();
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log(`Starting Vite at ${DEV_URL}`);
  console.log("Leave this terminal open while you use the app.\n");

  const child = spawnViteDevServer();
  return new Promise((resolve) => {
    child.on("exit", (code) => resolve(code ?? 0));
  });
}

async function restartDev() {
  console.log("Restarting dev server…");
  killListenersOnPort();
  await new Promise((r) => setTimeout(r, 800));

  if (await isDevServerUp()) {
    console.log(`Dev server already responding: ${DEV_URL}`);
    return 0;
  }

  console.log(`Starting Vite at ${DEV_URL}`);
  console.log("Leave this terminal open while you use the app.\n");

  const child = spawnViteDevServer();
  return new Promise((resolve) => {
    child.on("exit", (code) => resolve(code ?? 0));
  });
}

async function openDev() {
  if (!(await isDevServerUp())) {
    console.error(`Dev server is not running at ${DEV_URL}`);
    console.error("Run: npm run dev:restart");
    return 1;
  }
  openDevServerInBrowser();
  console.log(`Opened ${DEV_URL}`);
  return 0;
}

async function main() {
  switch (command) {
    case "status":
      process.exit(await printStatus());
    case "start":
      process.exit(await startDev());
    case "restart":
      process.exit(await restartDev());
    case "open":
      process.exit(await openDev());
    case "assert-qa":
      await assertDevServerForQa();
      console.log(`Dev server OK for QA: ${DEV_URL}`);
      process.exit(0);
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Usage: node scripts/dev-server.mjs [start|restart|status|open|assert-qa]");
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
