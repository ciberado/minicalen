# AGENTS.md

Guidance for AI coding agents and contributors working on MiniCalen.

## 1. Project Overview

MiniCalen is a lightweight, collaborative **year-view calendar**.

- Click days to assign up to **two foreground color categories** (rendered as a diagonal
  split) and any number of **text label categories** (rendered as symbols).
- Sessions are shareable via URL and synchronized in **real time** across clients.
- **Anonymous-first**: a calendar is usable immediately; optional email/password accounts
  let users persist calendars across devices and share them with viewer/editor/owner roles.

| Item | Value |
| --- | --- |
| Version | `2.1.0` (lockstep across all `package.json`) |
| Node | 22 (Docker) / 24 (dev container) |
| Persistence | SQLite (`data/minicalen.db`) via Drizzle ORM |
| Sync | Yjs CRDT over Hocuspocus WebSocket + IndexedDB |
| Production | Single all-in-one image (`ciberado/minicalen`) with Caddy |

## 2. Repository Layout

```
minicalen/
├── packages/
│   ├── shared/       # @minicalen/shared — domain, Zod, Yjs document helpers, dates
│   ├── renderer/     # @minicalen/renderer — Lit <year-grid> + forked neatocal view
│   ├── frontend/     # @minicalen/frontend — Lit app shell, Yjs wiring, auth/session UI
│   └── server/       # @minicalen/server — Express + Hocuspocus + Better-Auth + SQLite
├── e2e/              # Playwright tests and config
├── docker/           # entrypoint.sh for the all-in-one image
├── Dockerfile        # single production image (Caddy + Node)
├── Caddyfile         # internal Caddy: SPA + /api + /collaboration
├── docker-compose.yml             # local (bridge)
├── docker-compose.tailscale.yml   # Tailscale sidecar deployment
├── .env.example
├── AGENTS.md         # This file
├── README.md
└── CHANGELOG.md
```

npm workspaces monorepo. `shared`/`renderer` are consumed as TypeScript source via workspace
`exports`; the server runs with `tsx`.

## 3. Commands

Run from the repository root.

```bash
npm install
npm run dev:all      # server (3001/3002) + frontend (5173); single entry via Vite proxy
npm run dev          # frontend only
npm run dev:server   # server only
npm run lint
npm run type-check
npm run test         # Vitest (unit + integration)
npm run test:e2e     # Playwright (starts servers; reuses running ones)
npm run build
docker compose up -d --build   # single all-in-one image on :8080 (Caddy + Node)
```

Server database (from the server workspace):

```bash
npm run db:generate --workspace=@minicalen/server
npm run db:migrate  --workspace=@minicalen/server
npm run db:push     --workspace=@minicalen/server
npm run db:studio   --workspace=@minicalen/server
```

Agent shortcuts:

- **"patch bump"** → `npm run build`, fix errors, bump the patch version in **all**
  `package.json` files, update `CHANGELOG.md`, commit and tag.
- **"release"** → push a tag ending in `-RELEASE` (e.g. `v2.1.0-RELEASE`); the
  `Docker Release` workflow builds and pushes the multi-arch image to Docker Hub.

## 4. Architecture

### 4.1 Frontend (`@minicalen/frontend`, Lit)

- Anonymous-first: a local `Y.Doc` persisted in IndexedDB; "save" creates a session and
  connects the Hocuspocus provider.
- State lives in a `Y.Doc`: `categories` and `dateMarks` maps plus a `meta` map with
  `schemaVersion`. `@minicalen/shared` owns the document helpers and migrations.
- `appStore` is a small observable singleton consumed by Lit `StoreElement` subclasses.
- Grid and sheet views; a Print button prints the current view (see Printing below).

### 4.2 Rendering (`@minicalen/renderer`)

- `<year-grid>`: interactive 12-month 4×3 grid. A day with two foreground categories is
  split along the bottom-left → top-right diagonal (lower `order` on the top-left). The day
  number uses contrast-computed ink and stacks above the text symbols.
- `<neatocal-view>` + `renderYear()`: a focused TypeScript adaptation of
  [NeatoCal](https://github.com/abetusk/neatocal) (MIT) for the sheet/print view. See
  `packages/renderer/src/neatocal/LICENSE`.
- Printing: `@page { size: A4 landscape; margin: 6mm }` and `print-color-adjust: exact`,
  with compact `@media print` rules in the shell, grid and neatocal view.

### 4.3 Server (`@minicalen/server`)

- REST on `PORT` (default 3001): `/api/auth/*` (Better-Auth), `/api/sessions/*`, `/health`.
- Hocuspocus collaboration WebSocket on `COLLAB_PORT` (default 3002); it loads/stores encoded
  Yjs updates in `session_documents`.
- Authorization is **deny-by-default** in `authz.ts`, shared by REST and Hocuspocus. Anonymous
  creators get a per-session token (hashed at rest) stored in the browser and sent as a bearer
  token / provider token.
- Presence uses Yjs awareness; viewers connect with `readOnly` enforced by the server.

### 4.4 Data model

- `users`, `accounts`, `verifications`, `better_auth_sessions` — Better-Auth.
- `sessions` — metadata, ownership, visibility.
- `session_permissions` — viewer/editor/owner.
- `session_documents` — Yjs snapshot per session.
- `DateMark { categoryIds: string[]; textCategoryIds: string[] }` (up to two foreground
  categories; array order = insertion order).

## 5. Configuration

Frontend (`VITE_*`, optional — defaults derive from `window.location`):

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Backend base URL (defaults to same origin) |
| `VITE_COLLAB_URL` | WebSocket URL (defaults to `<origin>/collaboration`) |

Server:

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development` / `test` / `production` |
| `HOST` | Bind address (default `0.0.0.0`; the image uses `127.0.0.1`) |
| `PORT` / `COLLAB_PORT` | REST / collaboration ports (3001 / 3002) |
| `DATABASE_URL` | SQLite path (default `./data/minicalen.db`) |
| `BETTER_AUTH_SECRET` | **Required** in production (min 32 chars) |
| `BETTER_AUTH_URL` | Public base URL |
| `ALLOWED_ORIGINS` | Comma-separated CORS/trusted origins |
| `MINICALEN_HOST` | Proxy host used to derive allowed origins |

## 6. Deployment

- **All-in-one image** `ciberado/minicalen`: Caddy serves the SPA and proxies `/api` and
  `/collaboration` to the Node server in the same container. Only port `8080` is exposed.
- `docker-compose.yml`: local bridge deployment.
- `docker-compose.tailscale.yml`: Tailscale sidecar; no ports published, an external Caddy
  reaches the node by name (`http://minicalen:8080`). Copy `.env.example` to `.env`.
  Changing `CLIENT_SECRET` requires resetting the sidecar state (`docker compose down -v`)
  because Tailscale persists its login in the volume.
- Tags matching `*-RELEASE` trigger the multi-arch Docker release workflow.

## 7. Testing

- **Vitest** — `shared` (domain, Zod, Yjs helpers, dates), `renderer` (year grid, neatocal)
  and `server` (authz, REST via Supertest, persistence, collaboration integration).
- **Playwright** — `e2e/` covers anonymous persistence, add/remove/combine categories,
  printing and sign-up.

## 8. Conventions

- **Exhaustive tests** for every module.
- Calendar state lives in a versioned `Y.Doc` (`schemaVersion`, currently 2). Bump
  `SCHEMA_VERSION` and add a migration in `shared/src/ydoc.ts` when changing the model.
- **No comments** unless requested; 2-space indent, single quotes, TypeScript.
- Commit with **Conventional Commits**; clean **Semantic Versioning** (no pre-release
  suffixes). Versions are kept in lockstep across all `package.json`.
- Never commit secrets; use `.env.example` as reference.
