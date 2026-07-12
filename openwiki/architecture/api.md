# API Reference

This page documents the HTTP behavior implemented in `src/routes/tasks.ts`, `src/routes/projects.ts`, `src/middleware/auth.ts`, `src/middleware/rateLimit.ts`, and `src/index.ts`.

## Base paths

- Current API: `/v2`
- Legacy mobile alias: `/v1/tickets` maps to the same router as `/v2/tasks`

The service listens on `PORT` or `4000` by default.

## Headers

| Header | Required? | Behavior |
| --- | --- | --- |
| `x-api-key` | Required in production; optional in development | Production must match `MERIDIAN_API_KEY`. Development rejects the header only when it is present and not `meridian-dev-key`. |
| `x-plan-tier` | Optional | Used for rate limiting. Valid source tiers are `free`, `pro`, and `enterprise`; missing or unknown values use the free numeric limit. |

## Errors shared by middleware

### `401 Unauthorized`

Production invalid/missing API key:

```json
{ "error": "invalid api key" }
```

Development invalid supplied key:

```json
{ "error": "invalid dev key" }
```

### `429 Too Many Requests`

Returned by `src/middleware/rateLimit.ts` when the IP/plan counter exceeds the plan limit:

```json
{
  "error": "rate limit exceeded",
  "limit": 800,
  "plan": "pro"
}
```

Current request limits per 60-second window are `free: 600`, `pro: 800`, and `enterprise: 3000`.

## Tasks

Source: `src/routes/tasks.ts`.

### `GET /v2/tasks`

Lists tasks from the in-memory `tasks` array. Supports optional filtering by exact `region` and exact `status` query values.

Query parameters:

| Parameter | Example | Notes |
| --- | --- | --- |
| `region` | `APAC` | Filters to tasks whose `Task.region` equals the query value. The same value is used for regional endpoint resolution. If omitted, endpoint resolution uses `NA`. |
| `status` | `todo` | Filters to tasks whose `Task.status` equals the query value. |

Example:

```bash
curl "http://localhost:4000/v2/tasks?region=APAC&status=todo" \
  -H "x-api-key: meridian-dev-key" \
  -H "x-plan-tier: pro"
```

Response shape:

```json
{
  "endpoint": "https://db-apac.meridianlabs.internal",
  "tasks": [
    {
      "id": "t3",
      "projectId": "p3",
      "title": "Fix push notification lag",
      "status": "todo",
      "assignee": "mei",
      "region": "APAC",
      "dueDate": "2026-07-08"
    }
  ]
}
```

Notes:

- `endpoint` is produced by `resolveRegionEndpoint(String(region || "NA"))`.
- The endpoint is informational in the current implementation; the route still reads from in-memory data.
- Unknown `region` values return the NA endpoint and usually an empty task list unless seed/new data has that exact region string.
- If `APAC_FAILOVER=1`, APAC endpoint resolution returns the NA endpoint.

### `GET /v2/tasks/:id`

Fetches one task by `id`.

Example:

```bash
curl "http://localhost:4000/v2/tasks/t1" \
  -H "x-api-key: meridian-dev-key"
```

Success response:

```json
{
  "id": "t1",
  "projectId": "p1",
  "title": "Migrate hero banner",
  "status": "in_progress",
  "assignee": "priya",
  "region": "NA",
  "dueDate": "2026-07-10"
}
```

Not found response:

```json
{ "error": "task not found" }
```

### `POST /v2/tasks`

Creates a new task by appending to the in-memory `tasks` array.

Example:

```bash
curl -X POST "http://localhost:4000/v2/tasks" \
  -H "content-type: application/json" \
  -H "x-api-key: meridian-dev-key" \
  -d '{
    "projectId": "p1",
    "title": "Update launch checklist",
    "status": "todo",
    "assignee": "alex",
    "region": "NA",
    "dueDate": "2026-08-01"
  }'
```

Success response uses status `201` and returns the object that was pushed:

```json
{
  "id": "t5",
  "projectId": "p1",
  "title": "Update launch checklist",
  "status": "todo",
  "assignee": "alex",
  "region": "NA",
  "dueDate": "2026-08-01"
}
```

Implementation notes and risks:

- The ID is generated as `t${tasks.length + 1}`.
- There is no request-body schema validation.
- Arbitrary body fields are spread into the created object after the generated ID.
- Data is not persisted after process restart.

## Projects

Source: `src/routes/projects.ts`.

### `GET /v2/projects`

Lists all projects from the in-memory `projects` array.

Example:

```bash
curl "http://localhost:4000/v2/projects" \
  -H "x-api-key: meridian-dev-key"
```

Response shape:

```json
[
  {
    "id": "p1",
    "name": "Website Redesign",
    "plan": "pro",
    "region": "NA"
  }
]
```

### `GET /v2/projects/:id/summary`

Returns dashboard rollup data for one project. The route finds the project by ID, filters tasks by `projectId`, and counts tasks by status.

Example:

```bash
curl "http://localhost:4000/v2/projects/p1/summary" \
  -H "x-api-key: meridian-dev-key"
```

Success response:

```json
{
  "project": "Website Redesign",
  "plan": "pro",
  "total": 1,
  "todo": 0,
  "in_progress": 1,
  "done": 0
}
```

Not found response:

```json
{ "error": "project not found" }
```

Notes:

- The response does not include `projectId`; it returns project name and plan.
- `total` is derived from tasks whose `projectId` equals the matched project ID.
- Status counts assume the three current statuses: `todo`, `in_progress`, and `done`.

## Legacy route: `/v1/tickets`

`src/index.ts` mounts `tasksRouter` at `/v1/tickets` as a compatibility alias for pre-1.0 mobile clients.

Examples:

- `GET /v1/tickets` behaves like `GET /v2/tasks`.
- `GET /v1/tickets/:id` behaves like `GET /v2/tasks/:id`.
- `POST /v1/tickets` behaves like `POST /v2/tasks`.

Do not remove this alias until mobile v3 rollout is complete.

## Current seed data for examples

`src/db.ts` seeds four projects and four tasks:

| Project | Plan | Region | Representative task |
| --- | --- | --- | --- |
| `p1` Website Redesign | `pro` | `NA` | `t1` Migrate hero banner |
| `p2` Q3 Onboarding Revamp | `enterprise` | `EU` | `t2` Localize welcome emails |
| `p3` Mobile App v3 | `pro` | `APAC` | `t3` Fix push notification lag |
| `p4` Partner Portal | `free` | `LATAM` | `t4` Draft partner FAQ |

Use this table for local smoke tests, but do not assume it represents production data.
