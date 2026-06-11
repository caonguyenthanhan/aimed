## Deploy Modes

This project supports two deployment modes for the `/api/backend/*` proxy route.

### Demo Mode (default)

Use `MCS_DEPLOY_MODE=demo`.

- If `CPU_SERVER_URL` is not set, or the backend is unreachable, `/api/backend/*` will fall back to a safe in-process stub for key endpoints used by `/account`.
- Stub data can be edited via `data/backend-proxy-stub.json` or overridden with `BACKEND_PROXY_STUB_JSON`.

### Prod Mode

Use `MCS_DEPLOY_MODE=prod`.

- `/api/backend/*` will not use stubs.
- If `CPU_SERVER_URL` is missing or unreachable, the route returns `503` with a hint to configure the backend URL.

### Recommended Vercel Setup

- `MCS_DEPLOY_MODE=demo` for demo-only deployments without a FastAPI server.
- `MCS_DEPLOY_MODE=prod` and set `CPU_SERVER_URL=https://<your-fastapi-host>` when the CPU server is deployed and reachable from Vercel.
