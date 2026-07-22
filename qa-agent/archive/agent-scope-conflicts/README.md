# Archived — superseded by role-first full-site scans

These notes mark **conflicting historical guidance** that taught:

- per-agent small route maps
- Design Agent scanning only its own detail page
- browser_qa blocked from `entire_staging`
- shared role-blind detectors for all agents

## Current law (staging)

- Full site inventory: `src/lib/agentops/runtime/fullSiteRouteInventory.ts`
- Role detector packs: `src/lib/agentops/runtime/agentRoleDetectors.ts`
- Per-agent memory: `qa-agent/agentops-agents/{slug}/`
- Personas remain at `qa-agent/agents/{persona}/` (different product)

Do not restore subset route maps as active monitoring law.
