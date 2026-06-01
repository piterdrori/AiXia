# AgentOps Browser QA Foundation

## Purpose
Real browser QA foundation for AgentOps.

Browser QA must use the website like real users and produce objective evidence. Static scanning is not enough.

## Current Status
Stage 9 foundation only.
No scheduler.
No 24/7.
No production write tests.
No Hermes runtime automation.
No CodeGraph runtime automation.

## Dev server (required)

Browser QA needs the app at **http://127.0.0.1:5173/**.

```bash
npm run dev          # start (keep terminal open)
npm run dev:status   # is it up?
npm run dev:restart  # fix stuck / dead server
```

See [docs/DEV_SERVER.md](../../docs/DEV_SERVER.md).

## Safety Rules
- Local/staging only by default.
- Production read-only only if explicitly approved.
- No destructive actions.
- No create/edit/archive/delete real records in MVP.
- Synthetic users only.
- Screenshots/logs must not expose secrets.
- All findings go to reports first, then later can be imported into AgentOps backlog.

## Future Flow
Browser QA finding -> agent review -> backlog finding -> Active Top 10 promotion -> Piter fix -> verification.
