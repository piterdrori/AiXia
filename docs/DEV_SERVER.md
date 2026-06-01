# Local dev server (AiXia)

## One URL

Always use **http://127.0.0.1:5173/** (port **5173**, host **127.0.0.1**).

Vite is configured with `strictPort: true` so it will **not** silently move to 5174 when 5173 is busy.

## Daily commands

| Command | When to use |
| --- | --- |
| `npm run dev` | Start dev server (or tell you it is already running) |
| `npm run dev:status` | Check if the site is up |
| `npm run dev:restart` | Site broken or port stuck — kills old listener and starts fresh |
| `npm run dev:open` | Open the app in your default browser |

## Rules that prevent “site down”

1. **One dev terminal** — run `npm run dev` once and leave it open.
2. **Do not start multiple `npm run dev`** — a second instance fails or steals another port.
3. If the browser cannot connect, run **`npm run dev:restart`** (not another random `vite` command).
4. Browser QA (`npm run qa:agentops-*`) now checks the dev server first and prints these commands if it is down.

## Why it used to fail often

- Several background dev processes fought for port 5173.
- Killing ports left no server running, but the UI still looked “started”.
- Vite sometimes used **5174** while QA expected **5173**.
- `localhost` vs `127.0.0.1` mismatches on some Windows setups.

The `scripts/dev-server.mjs` helper fixes the common cases automatically.
