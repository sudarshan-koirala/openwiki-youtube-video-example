# Meridian Tasks API OpenWiki

`meridian-tasks-api` is an internal Meridian Labs task and project API. It is a compact TypeScript/Express service that exposes versioned REST routes, applies API-key authentication and plan-tier rate limiting globally, and models work across four regions: `NA`, `EU`, `APAC`, and `LATAM`.

Start here when you need to answer questions or make changes in this repository. This page gives the operating context and links to the canonical section pages.

## Documentation map

- [Architecture overview](./architecture/overview.md) — request flow, source layout, data model, middleware, regional routing, and source-level caveats.
- [API reference](./architecture/api.md) — task/project endpoints, headers, response shapes, errors, and the legacy route alias.
- [Operations and OpenWiki workflow](./operations/openwiki-and-deployment.md) — build/run commands, environment variables, deployment concerns, and repository documentation automation.

## What the service does

The API currently supports:

- Listing, fetching, and creating tasks through `src/routes/tasks.ts`.
- Listing projects and returning per-project task status rollups through `src/routes/projects.ts`.
- Global authentication through `src/middleware/auth.ts`.
- Global rate limiting through `src/middleware/rateLimit.ts`.
- Regional endpoint resolution through `src/services/regionRouter.ts`.
- A legacy `/v1/tickets` alias for pre-1.0 mobile clients, wired to the same router as `/v2/tasks` in `src/index.ts`.

The current data store is in-memory seed data in `src/db.ts`. That file includes comments about a production Postgres path through `DATABASE_URL`, but there is no database client implementation in the current source.

## Local development

Install dependencies:

```bash
npm install
```

Run the TypeScript source directly:

```bash
npm run dev
```

The server listens on `PORT` if set, otherwise `4000` (`src/index.ts`).

Build and run compiled JavaScript:

```bash
npm run build
npm start
```

Build output goes to `dist/` from TypeScript source under `src/` (`tsconfig.json`).

## Quick request examples

Development requests may omit `x-api-key`, but if the header is present it must be the local dev key from `src/middleware/auth.ts`:

```bash
curl "http://localhost:4000/v2/tasks" \
  -H "x-api-key: meridian-dev-key" \
  -H "x-plan-tier: pro"
```

Filter task listing by region and status:

```bash
curl "http://localhost:4000/v2/tasks?region=APAC&status=todo" \
  -H "x-api-key: meridian-dev-key"
```

Fetch a project dashboard rollup:

```bash
curl "http://localhost:4000/v2/projects/p1/summary" \
  -H "x-api-key: meridian-dev-key"
```

See [API reference](./architecture/api.md) for all endpoints and response shapes.

## Source layout

```text
src/
  index.ts                  Express app setup, middleware order, route registration
  db.ts                     Task/Project interfaces and in-memory seed data
  middleware/
    auth.ts                 `x-api-key` authentication behavior
    rateLimit.ts            per-IP + plan-tier request counters
  routes/
    tasks.ts                task listing, lookup, and creation routes
    projects.ts             project listing and dashboard summary route
  services/
    regionRouter.ts         region-to-endpoint mapping and APAC failover flag
```

Other important files:

- `package.json` — scripts and Node/TypeScript/Express dependencies.
- `tsconfig.json` — strict TypeScript, ES2022 target, CommonJS module output.
- `README.md` — repository-level OpenWiki runbook and CLI notes.
- `.github/workflows/openwiki-update.yml` — automated OpenWiki refresh workflow.
- `AGENTS.md` and `CLAUDE.md` — agent-facing pointers to this generated wiki. Do not treat them as generated OpenWiki pages.

## Current business and product assumptions

- Tasks and projects are region-scoped to support regional data locality and latency concerns.
- Project plans are `free`, `pro`, and `enterprise` (`src/db.ts`). These plans feed rate limiting through the `x-plan-tier` request header.
- Enterprise rate limits are called contractual in `src/middleware/rateLimit.ts`; coordinate with the platform team before changing them.
- The APAC region has a known failover path to NA when `APAC_FAILOVER=1`; source comments connect this to mobile push notification lag and seed task `t3`.
- `/v1/tickets` exists only for legacy mobile clients and should remain until mobile v3 rollout is complete (`src/index.ts`).

## Change-oriented guidance

### Adding or changing routes

1. Start in `src/routes/tasks.ts` or `src/routes/projects.ts`.
2. If adding a new router, register it in `src/index.ts` after the global middleware.
3. Remember that `authMiddleware` and `rateLimit` apply before every route.
4. Update [API reference](./architecture/api.md) with request/response behavior.

### Changing data shapes

1. Update `Task` or `Project` interfaces and seed data in `src/db.ts`.
2. Check route filters and summaries that assume specific enum values.
3. Update [Architecture overview](./architecture/overview.md) and [API reference](./architecture/api.md).

### Changing rate limits or auth

1. Read `src/middleware/rateLimit.ts` and `src/middleware/auth.ts` first.
2. Current limits are `free: 600`, `pro: 900`, `enterprise: 3000` requests per 60-second window.
3. Recent git history shows the pro limit has changed multiple times, so verify product/platform intent before editing.
4. Update docs and run `npm run build`.

### Changing regional behavior

1. Start with `src/services/regionRouter.ts`.
2. Keep region enums in `src/db.ts` aligned with endpoint keys.
3. Be explicit about unknown-region fallback to NA and APAC failover side effects.

## Verification

There is no test suite in the current repository inventory. At minimum, run:

```bash
npm run build
```

For behavior checks, run `npm run dev` and use curl against the routes listed above.

## Known caveats

- The repository currently has no automated tests.
- `POST /v2/tasks` copies request body fields into the task without schema validation.
- In-memory tasks, projects, and rate-limit counters reset on process restart.
- Rate-limit counters are process-local; horizontal scaling would require shared storage such as Redis.
- `DATABASE_URL` is documented/commented as a production path, but the source currently does not open database connections.
