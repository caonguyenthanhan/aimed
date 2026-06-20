# System Test Report - 2026-06-14

## 1. Summary

- Overall status: `PASS WITH WARNINGS`
- Main change after fix: frontend automated regression in fallback doctor navigation has been resolved.
- Strong signals:
  - frontend `lint`: pass with warnings only
  - frontend `vitest`: pass
  - frontend `build`: pass with warnings only
  - backend `pytest`: pass
  - local runtime smoke for DB/conversations/graph/agent-chat: pass

## 2. Test Scope

This test run covered the following layers:

1. Frontend static quality gates
   - `npm run lint`
   - `npm test` (`vitest run`)
   - `npm run build`
2. Backend focused automated test
   - `python -m pytest cpu_server/tests/test_langgraph_triage.py -q`
3. Local runtime smoke
   - Next.js local server on `http://127.0.0.1:3001`
   - CPU backend on `http://127.0.0.1:8000`
   - API smoke for DB, conversations, graph, and agent chat

## 3. Environment

- OS: Windows
- Shell: PowerShell
- Project root: `d:\desktop\tlcn\medical consulting system`
- Frontend app: `medical-consultation-app`
- Backend app: `cpu_server`
- Frontend env loaded during build/dev: `.env.local`, `.env`
- FOZA local env: available during runtime smoke

## 4. Executed Commands

### Frontend

```powershell
npm run lint
npm test
npm run build
```

### Backend

```powershell
python -m pytest cpu_server/tests/test_langgraph_triage.py -q
python -m uvicorn cpu_server.server:app --host 127.0.0.1 --port 8000
```

### Local Runtime

```powershell
npx next dev -H 127.0.0.1 -p 3001
```

### API Smoke

Smoke requests were executed against:

- `GET /api/db/ping`
- `POST /api/conversations/save`
- `GET /api/conversations/list`
- `GET /api/conversations/load`
- `POST /api/mcp/call` with `graph.status`
- `POST /api/agent-chat`
- `POST /v1/agent-chat` on CPU backend

## 5. Results Matrix

| Area | Command / Case | Result | Notes |
|---|---|---|---|
| Frontend lint | `npm run lint` | PASS with warnings | `0` errors, `3` warnings from `coverage/` artifacts |
| Frontend unit/integration | `npm test` | PASS | `199` passed, `4` skipped, `203` total |
| Frontend production build | `npm run build` | PASS with warnings | Build completed successfully, but there is an optional dependency warning |
| Backend LangGraph regression | `pytest cpu_server/tests/test_langgraph_triage.py -q` | PASS | `3 passed`, `1 warning` |
| Local DB ping | `GET /api/db/ping` | PASS | `200`, DB enabled |
| Local conversation save | `POST /api/conversations/save` | PASS | `200`, data persisted |
| Local conversation list | `GET /api/conversations/list` | PASS | `200`, saved conversation visible |
| Local conversation load | `GET /api/conversations/load` | PASS | `200`, messages loaded correctly |
| Local graph status | `POST /api/mcp/call` => `graph.status` | PASS | `200`, graph connected |
| Local Next agent chat | `POST /api/agent-chat` | PASS | `200`, provider `foza`, mode `cpu` |
| Local CPU agent chat | `POST /v1/agent-chat` | PASS | `200`, LangGraph orchestration returned normal answer |

## 6. Key Findings

### Finding 1 - Fallback doctor navigation regression was fixed

- Severity: `Resolved`
- Status: `Closed`
- Original failing test:
  - `medical-consultation-app/lib/__tests__/agent-profiles-fallback.test.ts`
- Original failure:
  - expected `json.actions[0]?.type` to be `"ask_navigation"`
  - received `undefined`
- Scenario:
  - input message: `"Tôi bị đau ngực và khó thở"`
  - requested agent: `"default"`
- Root cause:
  - `buildGatewayFallbackActions()` did not map raw red-flag triage intent to `ask_navigation -> bac-si` when `triageMeta` was not active yet.
- Fix applied:
  - add a fallback rule: when `intentFlags.triage` is true and triage is not already active/emergency-guarded, return `ask_navigation` to `bac-si`.
- Verification:
  - targeted test file: pass `2/2`
  - full `npm test`: pass `199/199`, `4 skipped`

### Finding 2 - Lint signal is noisy because coverage files are included

- Severity: `Medium`
- Status: `Open`
- Evidence:
  - warnings in:
    - `medical-consultation-app/coverage/block-navigation.js`
    - `medical-consultation-app/coverage/prettify.js`
    - `medical-consultation-app/coverage/sorter.js`
- Impact:
  - lint still exits successfully
  - QA signal is noisier than needed
  - CI readability is reduced
- Suggested direction:
  - exclude `coverage/` from lint scope via ignore config

### Finding 3 - Optional dependency warning during build

- Severity: `Medium`
- Status: `Open`
- Evidence:
  - build warning:
    - `Module not found: Can't resolve '@sentry/nextjs'`
  - import trace:
    - `medical-consultation-app/lib/error-tracker.ts`
    - `medical-consultation-app/app/api/appointments/route.ts`
- Current behavior:
  - production build still completes successfully
  - warning does not block build
- Impact:
  - optional observability path is not fully installed or not fully guarded
  - future refactors may accidentally convert this warning into a hard failure

### Finding 4 - CPU local runtime is healthy but local model files are absent

- Severity: `Low`
- Status: `Known / Non-blocking`
- Evidence from startup logs:
  - text model files missing locally
  - VLM model files missing locally
  - server still starts because models are lazy-loaded and current tested path used FOZA
- Impact:
  - current FOZA-backed runtime smoke is healthy
  - pure local CPU model fallback is not fully validated in this run

## 7. Runtime Smoke Details

### API Smoke Snapshot

- `GET /api/db/ping`
  - `200`
  - `ok=true`
  - `dbEnabled=true`
- `POST /api/conversations/save`
  - `200`
  - `success=true`
- `GET /api/conversations/list`
  - `200`
  - saved conversation was returned
- `GET /api/conversations/load`
  - `200`
  - saved messages were returned correctly
- `POST /api/mcp/call`
  - tool: `graph.status`
  - `200`
  - graph connected
- `POST /api/agent-chat`
  - `200`
  - response returned normally
  - metadata shows `provider=foza`, `mode=cpu`, `orchestrator=langgraph`
- `POST /v1/agent-chat`
  - `200`
  - direct CPU backend response returned normally

## 8. Risk Assessment

### Release Readiness

- Frontend runtime: `usable`
- Backend runtime: `usable`
- Local data path (DB + conversations): `healthy`
- Graph integration: `healthy` in smoke scope
- Test suite health: `green with warnings`

### Current Go / No-Go

- For internal demo/testing: `GO`
- For CI-like local quality gates: `GO with warnings`

## 9. Recommended Next Actions

### Priority 1

1. Exclude `coverage/` from lint
2. Decide whether `@sentry/nextjs` should be:
   - installed as a real dependency, or
   - fully guarded so Next build emits no module warning

### Priority 2

1. Keep the explicit regression test for raw red-flag symptom text in default fallback mode as a guardrail
2. Add one smoke script variant that prints machine-readable JSON without PowerShell encoding issues

## 10. Final Verdict

- The system is currently stable for the tested local scope.
- Core runtime paths that matter for demo flow are working:
  - FOZA local path
  - conversations persistence
  - graph status
  - LangGraph backend response
- Remaining issues are warnings and QA hygiene items, not release-blocking failures for the tested scope.
