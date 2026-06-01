# AgentOps Browser QA Specification

## Goal

Agents must **use the AiXia website like real users** and produce **objective evidence**. Browser QA is the primary truth source for UI, workflow, and permission-visible defects. Static analysis and CodeGraph supplement but do not replace lived experience of the product.

---

## Principles

| Principle | Meaning |
| --- | --- |
| Observe, don’t destroy | Default read-only; staged writes only |
| Role-realistic | Test as synthetic roles the product supports |
| Evidence-first | No Top 10 promotion without reproducible steps for High+ UI issues |
| Separate layers | Observation ≠ root cause ≠ suggestion |
| Environment-aware | stricter rules for production |

---

## Browser QA Capabilities (Future Implementation)

Must eventually support:

| Capability | Notes |
| --- | --- |
| Login as synthetic roles | Map to `qa-agent/registry/synthetic-roles.json` |
| Route navigation | Deep links + in-app nav |
| Click testing | buttons, links, row actions |
| Form opening | create/edit flows |
| Modal open/close | registry modals, archive manager |
| Safe draft creation | staging only; rollback/cleanup policy |
| Search / filter / sort | registry toolbars |
| Tab testing | multi-tab pages |
| Upload panel interaction | when safe test files available |
| Archive/restore | **staging only**, labeled data |
| Role visibility | hidden vs disabled vs error state |
| Responsive viewports | e.g. 1440, 1280, 768 widths |
| Screenshot capture | full page and element |
| Console error capture | errors and warnings |
| Network error capture | 4xx/5xx, failed RPC |
| Trace/video | optional Playwright trace when approved |

**Not in this phase:** implement Playwright, install packages, or commit test suites.

---

## Environment Rules

| Environment | Allowed depth |
| --- | --- |
| `local` | Full UI flows; cautious writes with test data |
| `staging` | Full flows including safe CRUD/archive tests |
| `preview` | Read-only + safe navigation unless Owner approves writes |
| `production-read-only` | Navigation, read, screenshots; **no** create/archive/delete |

**Destructive actions** require:

- staging (or local)  
- synthetic user label  
- documented cleanup procedure  
- never default on daily production run  

---

## Synthetic Roles

Use roles from QA registry, e.g.:

- Platform Owner / finance admin  
- Finance manager / viewer  
- Employee (personal expense/paycheck)  
- HR admin (when HR in scope)  

Each finding records **`user_role`** used during observation.

Role matrix tests: same route visited with multiple roles when issue is permission-related.

---

## Evidence Requirements

Every browser-origin finding must include:

| Field | Required |
| --- | --- |
| `route` | Yes |
| `user_role` | Yes |
| `viewport` | Yes (width × height) |
| `steps_performed` | Numbered list |
| `expected_result` | Yes |
| `actual_result` | Yes |
| `screenshot` / trace / log refs | At least one for Medium+ |
| `agent_interpretation` | Labeled as interpretation |
| `prompt_suggestion` | Draft or final from Chair |

Store files in `agentops_evidence_files` (future) or interim `qa-agent/reports/agentops-evidence/`.

---

## Objective Suggestion Rule

Agents must label three layers:

1. **Observed issue** — what was seen (screenshot-visible or console fact)  
2. **Inferred root cause** — hypothesis (“likely shared component missing”)  
3. **Suggested improvement** — recommended action  
4. **Optional idea** — nice-to-have, clearly marked lower priority  

Chair must not promote items where layer 1 is weak unless severity is critical (e.g. security header missing).

---

## Flow Experience Rule

Synthetic User QA and Design agents evaluate:

| Question | |
| --- | --- |
| Is the workflow clear? | |
| Is the action path too long? | |
| Are primary buttons obvious? | |
| Are status states understandable? | |
| Does the user get enough explanation? | |
| Is result feedback clear (toast, inline, refresh)? | |
| Does the module feel professional and enterprise-grade? | |

Improvements from this rubric may be severity `improvement` unless they block task completion (then `medium`+).

---

## Integration with Static Guardrails

| Source | Role in AgentOps |
| --- | --- |
| `qa:static-design-guardrails` | Candidates → browser confirm before Top 10 |
| `qa:static-discovery` | Route/module coverage planner |
| Guardrail action plans | Input to Chair, not auto-promoted |

Example: static flags finance glass pattern → browser confirms on hub → promote.

---

## Browser Run Slice (Daily Workflow)

Per daily run, browser slice should:

1. Load route list from focus directive or full finance-first default.  
2. For each route (prioritized):  
   - login if needed  
   - snapshot + screenshot  
   - execute scripted flow checklist (module-specific, future)  
   - capture console/network on error  
3. Emit raw findings JSON.  
4. Pass to agent collaboration phase.  

Coverage targets (configurable): critical paths per module, not every permutation daily.

---

## Safety Checklist (Browser Operator)

- [ ] Correct environment  
- [ ] No production destructive clicks  
- [ ] Tenant test company only in staging  
- [ ] No real employee PII in screenshots stored long-term  
- [ ] Logout/switch role between permission tests  
- [ ] Do not paste secrets into prompts or reports  

---

## Failure Modes

| Condition | Tag | Behavior |
| --- | --- | --- |
| Login failed | `verification_blocked` / run partial | Retry or skip module |
| Flaky network | retry once | note in evidence |
| Missing permission for route | document as finding or skip per focus | |
| Browser automation down | `browser-limited` run | static-only with warning |

---

## Relationship to Fix Verification

Verification runs reuse browser QA with:

- Same `steps_performed` as original finding  
- Additional regression checks (see `AGENTOPS_FIX_VERIFICATION_SPEC.md`)  
- Before/after screenshot pair when visual  

---

## Future Tooling Options (Decision Deferred)

| Option | Notes |
| --- | --- |
| Playwright | Likely candidate when approved; not installed in spec phase |
| Cursor IDE browser MCP | Manual/agent-assisted sessions; interim |
| Custom runner | `qa-agent/scripts/agentops-browser-run.mjs` future |

Piter approves package install and CI placement separately.

---

## Related Documents

- `AGENTOPS_DAILY_WORKFLOW.md`  
- `AGENTOPS_FIX_VERIFICATION_SPEC.md`  
- `AGENTOPS_HERMES_CODEGRAPH_SPEC.md`  
