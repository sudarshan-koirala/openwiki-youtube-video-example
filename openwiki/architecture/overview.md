# Architecture Overview

`meridian-tasks-api` is a small Express 4 application written in strict TypeScript. The code favors a single-process, in-memory implementation that is easy to run locally, while comments and operational documentation point toward a future production database-backed deployment.

## Request flow

`src/index.ts` wires every request through the same global stack:

```text
HTTP request
  -> express.json()
  -> authMiddleware
  -> rateLimit
  -> /v2/tasks, /v2/projects, or /v1/tickets route handler
  -> JSON response
```

The order matters:

1. JSON parsing happens before auth/rate limiting.
2. Authentication rejects invalid production keys before requests consume rate-limit budget.
3. Rate limiting rejects over-limit traffic before business route handlers run.
4. Route handlers read and mutate the in-memory arrays exported from `src/db.ts`.

## Main layers and files

| Layer | Source | Responsibility |
| --- | --- | --- |
| Entrypoint | `src/index.ts` | Creates the Express app, installs middleware, mounts current and legacy routes, starts the listener. |
| Data model/store | `src/db.ts` | Defines `Task` and `Project` interfaces plus seed arrays. |
| Middleware | `src/middleware/auth.ts`, `src/middleware/rateLimit.ts` | Applies API-key authentication and plan-tier request limits. |
| Routes | `src/routes/tasks.ts`, `src/routes/projects.ts` | Implements task and project HTTP behavior. |
| Service logic | `src/services/regionRouter.ts` | Maps a requested region to the regional database endpoint and handles APAC failover. |

## Data model

`src/db.ts` is the source of truth for current entity shapes.

### Task

Fields:

- `id: string`
- `projectId: string`
- `title: string`
- `status: "todo" | "in_progress" | "done"`
- `assignee: string`
- `region: "NA" | "EU" | "APAC" | "LATAM"`
- `dueDate: string`

Seed data includes operational clues: task `t3` (`Fix push notification lag`) belongs to the APAC mobile app project and is referenced by `src/services/regionRouter.ts` comments as related to APAC failover latency.

### Project

Fields:

- `id: string`
- `name: string`
- `plan: "free" | "pro" | "enterprise"`
- `region: "NA" | "EU" | "APAC" | "LATAM"`

Project plans are used by the dashboard summary response and should remain aligned with rate-limit tiers.

## Routes

The current API surface is intentionally narrow:

- `GET /v2/tasks` lists tasks and supports `region` and `status` query filters.
- `GET /v2/tasks/:id` fetches one task or returns `404`.
- `POST /v2/tasks` appends a task to the in-memory array and generates an ID from array length.
- `GET /v2/projects` lists all projects.
- `GET /v2/projects/:id/summary` returns task counts per status for a project.
- `/v1/tickets` is mounted to the same router as `/v2/tasks` for pre-1.0 mobile clients.

See [API reference](./api.md) for request/response details.

## Authentication

`src/middleware/auth.ts` reads the `x-api-key` header.

- In production (`NODE_ENV === "production"`), the header must equal `MERIDIAN_API_KEY`; missing or mismatched values return `401` with `{ "error": "invalid api key" }`.
- Outside production, a present key must equal the hard-coded dev key `meridian-dev-key`; missing keys are allowed.

This means local curl examples can work without a key, but including `x-api-key: meridian-dev-key` better matches production call shape.

## Rate limiting

`src/middleware/rateLimit.ts` enforces per-minute counters keyed by `req.ip` and plan tier from `x-plan-tier`. Missing or unknown tiers fall back to the free limit.

Current limits:

| Plan | Requests per 60-second window |
| --- | ---: |
| `free` | 600 |
| `pro` | 900 |
| `enterprise` | 3000 |

Source comments say enterprise limits are contractual and should be confirmed with the platform team before changes. Recent git history is also high-signal: the pro tier has changed multiple times, so verify current product/platform intent before editing it.

Implementation caveats:

- Counters live in a process-local `Map` and reset on restart.
- Counters are not shared across horizontally scaled instances.
- The `Map` has no cleanup for old IP/plan keys beyond window reset when a key is seen again.

## Region routing

`src/services/regionRouter.ts` maps region strings to internal endpoint URLs:

| Region | Endpoint |
| --- | --- |
| `NA` | `https://db-na.meridianlabs.internal` |
| `EU` | `https://db-eu.meridianlabs.internal` |
| `APAC` | `https://db-apac.meridianlabs.internal` |
| `LATAM` | `https://db-latam.meridianlabs.internal` |

`resolveRegionEndpoint(region)` behavior:

1. Unknown regions fall back to the NA endpoint.
2. `APAC` falls back to NA when `APAC_FAILOVER === "1"`.
3. Otherwise the endpoint for the supplied region is returned.

Important caveat: routes do not actually connect to these endpoints today. `GET /v2/tasks` includes the resolved endpoint in the JSON response as the endpoint that would be used, while tasks still come from the in-memory array.

## Storage and production-readiness boundaries

Current code is development-friendly but not yet a full production persistence layer:

- `src/db.ts` stores arrays in memory.
- There is no Postgres client, repository layer, migration system, or schema file.
- `DATABASE_URL` is mentioned in comments and operational docs, but not consumed by runtime code.
- `POST /v2/tasks` has no validation and accepts arbitrary request body fields into the stored object.

If implementing persistence, add a real data-access layer instead of spreading database calls directly across route handlers. Keep route behavior and API response contracts documented in [API reference](./api.md).

## Extension points for future agents

- **Add validation:** introduce schema validation before `POST /v2/tasks` writes to the array or future database.
- **Add persistence:** create a storage abstraction for tasks/projects, then replace in-memory arrays with database-backed implementations.
- **Add shared rate limiting:** replace process-local counters with Redis or another shared store before multi-instance deployment.
- **Add health checks:** no dedicated health endpoint exists; adding one would simplify deployment probes.
- **Add tests:** no tests were found in the current repository inventory. Start with route-level integration tests for auth, rate limiting, task filters, and project summaries.
