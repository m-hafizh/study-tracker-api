# Study Tracker API Documentation

> ✅ **Current status update (April 2026)**
>
> Recent backend hardening completed for calendar writes:
>
> - Non all-day events are validated server-side to require valid `startTime` and `endTime`.
> - Time range is validated (`startTime < endTime`) before persistence.
> - Known Prisma write/constraint failures are mapped to safe, user-facing `AppError` responses.
> - Internal ORM/query details are no longer intended for end-user consumption.

Backend API for the Study Tracker app built with **Fastify + TypeScript + Prisma + PostgreSQL**.

---

## Tech stack

- Fastify 4
- TypeScript (ESM)
- Prisma ORM (`@prisma/client` + `prisma` CLI)
- PostgreSQL (Supabase-compatible)
- Zod validation
- JWT access tokens + opaque refresh tokens
- Swagger/OpenAPI via `@fastify/swagger` and `@fastify/swagger-ui`

---

## Available scripts

- `pnpm dev` — run development server with watch mode
- `pnpm build` — compile TypeScript to `dist`
- `pnpm start` — run compiled server
- `pnpm typecheck` — TS type check (`--noEmit`)
- `pnpm test` — run backend tests (Vitest)
- `pnpm prisma:generate` — generate Prisma client
- `pnpm prisma:push` — push Prisma schema to database

---

## Quick start

1. Copy env file:
   - `.env.example` → `.env`
2. Install dependencies:
   - `pnpm install`
3. Start the API in development:
   - `pnpm dev`

Default server port is controlled by `PORT` (`3000` if not set).

---

## Docker Compose (local development)

From repo root (`study-tracker`):

1. Copy compose env template:
   - `.env.compose.example` → `.env`
2. Start services:
   - `docker compose up --build`
3. Stop services:
   - `docker compose down`

Services started by compose:

- `postgres` (`postgres:16`) with persistent volume `postgres_data`
- `api` (Node 20) built from `api/Dockerfile`

Compose startup behavior for API:

- waits for Postgres health check
- runs `pnpm prisma:generate`
- runs `pnpm prisma:push`
- starts server via `pnpm start`

To reset DB data completely (destructive):

- `docker compose down -v`

---

## Health and API docs

- Health check: `GET /health`
- Swagger UI: `GET /docs`
- OpenAPI JSON: `GET /docs/json`

---

## Authentication

Protected routes require:

`Authorization: Bearer <access_token>`

Auth endpoints:

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`
- `GET /v1/auth/me`
- `PATCH /v1/auth/me`
- `POST /v1/auth/change-password`

---

## Active modules and routes

> Note: Todos API has been removed from this project.

### Study

- `GET /v1/study-sessions`
- `POST /v1/study-sessions`
- `PUT /v1/study-sessions/:id`
- `DELETE /v1/study-sessions/:id`

### Subjects

- `GET /v1/subjects`
- `POST /v1/subjects`
- `PUT /v1/subjects/:id`
- `DELETE /v1/subjects/:id`

### Calendar

- `GET /v1/calendar/events`
- `POST /v1/calendar/events`
- `PUT /v1/calendar/events/:id`
- `DELETE /v1/calendar/events/:id`
- `DELETE /v1/calendar/events`

#### Calendar validation notes

- `allDay: true` → `startTime`/`endTime` are treated as `null`.
- `allDay: false` → both `startTime` and `endTime` are required.
- Time-only values are expected in `HH:mm` format.
- Invalid ranges return `400` with calendar-specific error codes (for example `INVALID_EVENT_TIME`, `INVALID_EVENT_TIME_RANGE`).

### Kanban

- `GET /v1/kanban/board`
- `PUT /v1/kanban/board`
- `POST /v1/kanban/board/reset`

### Settings

- `GET /v1/settings/study`
- `PUT /v1/settings/study`

### Analytics

- `GET /v1/analytics/study-summary`

---

## Error format

All handled errors follow this shape:

```json
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {}
}
```

---

## Notes

- PostgreSQL must be reachable from `DATABASE_URL`.
- Swagger components include shared `ErrorResponse` and `NoContent` responses.
- API base routes are registered under `/v1` prefixes per module.
