# ai-saas

npm workspaces monorepo for the ai-saas product: a Fastify API (`apps/api`) and a web app
(`apps/web`, a placeholder until the Next.js app is added).

## Prerequisites

- Node.js **22.12 or newer** (see `.nvmrc`; run `nvm use` if you use nvm)
- npm (ships with Node)

## Setup

```bash
npm ci
cp .env.example .env   # optional: defaults work without it
```

`.env` at the repository root is loaded by the API on startup. Variables already set in the
environment take precedence over values in `.env`.

| Variable       | Default     | Description                                                    |
| -------------- | ----------- | -------------------------------------------------------------- |
| `PORT`         | `4000`      | Port the API listens on (1–65535)                              |
| `HOST`         | `127.0.0.1` | Interface the API binds to                                     |
| `STORAGE`      | `memory`    | Storage backend: `memory` or `prisma`                          |
| `LOG_LEVEL`    | `info`      | `fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent` |
| `GITHUB_TOKEN` | _(unset)_   | Optional GitHub token                                          |
| `DATABASE_URL` | _(unset)_   | Optional database URL (needed for `STORAGE=prisma` later)      |

Invalid configuration stops the API at startup with a message naming each invalid variable.

## Running the API in dev mode

```bash
npm run dev -w @ai-saas/api
curl http://127.0.0.1:4000/health   # {"status":"ok"}
```

`dev` uses `tsx watch` and restarts on changes. For a production-style run:
`npm run build && npm start -w @ai-saas/api`.

## Root scripts

| Script              | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm run lint`      | ESLint over the whole repo, then `prettier --check`       |
| `npm run format`    | Formats the repo with Prettier                            |
| `npm run typecheck` | `tsc --noEmit` in every workspace that has the script     |
| `npm test`          | Vitest unit tests in every workspace that has the script  |
| `npm run build`     | Builds every workspace that has the script (API → `dist`) |

Run a script in one workspace with `-w`, e.g. `npm test -w @ai-saas/api`.

## API layout

```
apps/api/src
├── app.ts           buildApp(deps): composes error handling and routes (no env, no I/O)
├── server.ts        process entry: loads .env, validates config, listens
├── config.ts        Zod schema for environment variables
├── errors.ts        AppError classes and the JSON error handler
├── routes/          HTTP only: parse/validate input (parseWith), call services, shape output
├── services/        business rules; depend on repository interfaces
└── repositories/    persistence only; one memory and one prisma implementation per interface
```

All errors are returned as JSON: `{ "error": { "code": "...", "message": "...", "details"?: ... } }`.
Unexpected errors return `500 INTERNAL_ERROR` without stack traces or internal messages.
