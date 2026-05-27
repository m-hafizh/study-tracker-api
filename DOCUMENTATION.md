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

## Vercel deployment (serverless)

This project is configured for **Vercel Serverless Functions** using:

- `api/index.ts` as the function entrypoint
- `vercel.json` rewrites so every route is handled by Fastify

### 1) Push to your Git provider and import in Vercel

- Create a new Vercel project from this repository.

### 2) Configure required environment variables in Vercel

- `NODE_ENV=production`
- `DATABASE_URL`
- `JWT_SECRET`
- `ACCESS_TOKEN_TTL` (optional, defaults to `15m`)
- `REFRESH_TOKEN_TTL_DAYS` (optional, defaults to `30`)
- `CORS_ORIGINS` (comma-separated exact origins and/or `*` wildcard patterns, without trailing slash)

Example:

- `CORS_ORIGINS=https://study-tracker-pj1vvp7fg-wachana-dev.vercel.app,https://study-tracker-*-wachana-dev.vercel.app`

> `PORT` is not required on Vercel. The serverless runtime provides request handling.

### 3) Deploy

- Vercel runs `vercel-build` (configured as `pnpm prisma:generate`) so Prisma Client is generated for the function bundle.

### Serverless notes

- Do not rely on in-memory state between requests.
- Cold starts can happen; app/bootstrap is cached per warm runtime instance.
- Keep database connections and query volume efficient for short-lived function execution.

---

## Docker Compose (API only)

The compose file in this folder starts only the `api` service.
Database is not containerized: the API connects directly to your external Supabase PostgreSQL via `DATABASE_URL`.

### 1) Prepare environment variables

1. Copy compose env template:
   - `.env.compose.example` -> `.env`
2. Set values in `.env`:
   - `DATABASE_URL` (Supabase connection string)
   - `JWT_SECRET`
   - `CORS_ORIGINS` (comma-separated frontend origins; exact values and `*` wildcard patterns are supported)

Compose mapping is fixed to:

- host `3003` -> container `3000`

### 2) Build and start the API container

```bash
docker compose up -d --build
```

### 3) Verify container health

```bash
curl http://localhost:3003/health
```

### 4) Optional Prisma schema push

If you need to apply schema changes to Supabase manually:

```bash
docker compose run --rm api pnpm prisma:push
```

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
