# Local LLM Memory Policy (Phase 5/6)

## Policy Scope

Applies to Council chat, Individual Agent chat, and Issue chat in AgentOps.

## Required Rules

1. **No automatic memory writes**
   - Runtime responses do not create durable memory by default.

2. **Approval required**
   - Durable memory updates occur only after explicit owner approval (`Yes`).

3. **Normal chat behavior**
   - Normal chat does not show memory prompt.

4. **Intent-gated prompt behavior**
   - If user intent indicates memory instruction (`remember`, `from now on`, `always`, `never`, `apply this`, etc.), agent asks:  
     **"Do you want me to update my memory with this?"**
   - Buttons: **Yes / No**

5. **Approval outcomes**
   - **Yes:** create memory write request for target scope and persist after validation.
   - **No:** continue conversation; do not write memory.

6. **Default scope**
   - Memory is agent-specific by default.

7. **Shared/cross-agent memory**
   - Allowed only with explicit owner approval for shared scope.

8. **Durable tracking**
   - All durable memory is tracked in Supabase with audit metadata.

## Data Safety Constraints

- Never store secrets, API keys, service role keys, private credentials, or tokens.
- Never store production-only credentials.
- Avoid unrelated personal/private data not relevant to AgentOps behavior.
- Enforce redaction/validation before persistence.

## Runtime Safety Constraints

- Memory policy does not authorize runtime activation.
- No automatic Cursor trigger.
- No scheduler/cron activation.
- No production mutation path.

## Compliance Notes

- Supabase remains source of truth for approved memory records.
- Retrieval runtime (agentmemory-style) is advisory and non-authoritative.
- Hermes memory reasoning is essential but activated later under readiness gates.
