# AGENTS.md

Guidance for AI coding agents and contributors working in this repository.

> **Strategic context:** The team is preparing a **full reimplementation** of MiniCalen
> (working name: v2). Treat the current codebase as a **reference implementation and
> source of product knowledge**, not as something to preserve as-is. The "Current State"
> and "Known Issues & Technical Debt" sections below are the primary input for that
> rewrite.

---

## 1. Project Overview

MiniCalen is a lightweight, collaborative **year-view calendar** application.

- Click days to assign **foreground color categories** (e.g. Important / Work / Personal).
- Assign **text label categories** rendered as symbols on days (e.g. `Holiday [H]`).
- Sessions are shareable via URL and synchronized in **real time** across clients.
- **Anonymous-first**: a calendar is usable immediately; optional email/password accounts
  let users persist calendars across devices and share with viewer/editor/owner roles.

### Current status

| Item | Value |
| --- | --- |
| Version | `1.5.1` (root + both workspace packages) |
| Active branch | `feat/lists` |
| `main` state | `1.4.2` — **behind**, missing all authentication work |
| Working tree | Clean |
| Commits | 68 (`feat/lists`) |
| Automated tests | **None** |
| Test runner / coverage | **Not configured** |
| Lint / type-check | Configured per package, run manually |
| Database | SQLite (`packages/server/data/minicalen.db`) via Drizzle ORM |
| Reimplementation | Planned (v2) — see section 8 |

`feat/lists` is **7 commits ahead of `main`** and contains the entire authentication /
sharing feature set (v1.5.0) plus the v1.5.1 fixes. `main` has **not** been updated.
All other local branches (`chore/*`, `feat/*`, `refactor/*`, `fix/*`) are already merged
into `feat/lists`; there is no divergent work to preserve.

---

## 2. Repository Layout

```
minicalen/
├── packages/
│   ├── frontend/                 # React 18 + TypeScript + Vite + MUI
│   │   ├── src/
│   │   │   ├── auth/client.ts    # Better-Auth React client
│   │   │   ├── components/       # UI + React contexts (see below)
│   │   │   ├── contexts/         # AuthContext type only
│   │   │   ├── hooks/useAuth.ts  # Auth hook
│   │   │   ├── config/api.ts     # Runtime API/WS URL resolution
│   │   │   ├── logger.ts         # Client logger wrapper
│   │   │   └── theme.ts
│   │   ├── Dockerfile / nginx*.conf
│   │   └── vite.config.ts
│   └── server/                   # Express 5 + Socket.IO + Better-Auth
│       ├── src/
│       │   ├── index.ts          # App bootstrap, CORS, WS, legacy endpoints
│       │   ├── auth/             # betterAuth config + Express/Socket middleware
│       │   ├── db/               # Drizzle client + schema
│       │   ├── routes/           # sessions.ts, migrate.ts, auth.ts
│       │   └── logger.ts         # Winston logger
│       ├── drizzle/              # Generated SQL migrations + snapshots
│       ├── Dockerfile
│       └── data/, logs/          # Runtime volumes (not committed)
├── docs/                         # AUTHENTICATION*.md, screenshots
├── .github/
│   ├── workflows/docker-release.yml
│   └── copilot-instructions.md   # Legacy agent notes (see AGENTS.md)
├── AGENTS.md                     # This file
├── README.md, CHANGELOG.md, TESTING.md
├── DOCKER.md, DEPLOYMENT.md, CI-CD.md, LOGGING.md
├── BUG-INVESTIGATION.md
├── docker-compose.yml, docker-compose.tailscale.yml
└── Caddyfile
```

It is an **npm workspace monorepo** (`packages/frontend`, `packages/server`). Dependencies
are installed once at the root; scripts are forwarded per package.

---

## 3. Commands

Run everything from the repository root unless noted.

### Development

```bash
npm install            # install all workspace deps
npm run dev:all        # server (tsx/nodemon) + frontend (Vite) concurrently
npm run dev            # frontend only  -> http://localhost:5173
npm run dev:server     # server only    -> http://localhost:3001
```

### Build / quality

```bash
npm run build                    # frontend tsc+vite, then server tsc
npm run build:frontend
npm run build:server
npm run lint                     # eslint both packages (max-warnings 0)
npm run preview                  # preview built frontend
npm run type-check --workspace=@minicalen/frontend
npm run type-check --workspace=@minicalen/server
```

> There is **no test command**. `TESTING.md` documents manual/`curl` verification only.

### Database (server workspace)

```bash
npm run db:generate --workspace=@minicalen/server   # generate migration from schema
npm run db:migrate  --workspace=@minicalen/server   # apply migrations
npm run db:push     --workspace=@minicalen/server   # push schema directly
npm run db:studio   --workspace=@minicalen/server   # Drizzle Studio
```

### Docker

```bash
npm run build:frontend:docker
npm run build:server:docker
docker compose up -d
```

### Agent shortcuts (preserved from prior instructions)

- **"patch bump"** → run `npm run build`, fix errors, increment the patch version of
  **all** `package.json` files (root, frontend, server), update `CHANGELOG.md`, commit and tag.
- **"release"** → create and push a tag ending in `-RELEASE` (e.g. `v1.5.1-RELEASE`).
  The GitHub Action builds and pushes both Docker images.

---

## 4. Architecture

### 4.1 Frontend

React 18 + TypeScript + Vite + Material-UI v7 + FullCalendar v6 (`multiMonth`).

Provider nesting (from `packages/frontend/src/App.tsx`):

```tsx
<AuthProvider>          // Better-Auth session (useSession)
  <WebSocketProvider>   // socket.io-client connection
    <CategoryProvider>  // categories + dateInfoMap (source of truth)
      <SessionProvider> // URL hash, localStorage, save/load, WS broadcast
        <Layout />      // Sidebar + MainContent(Calendar) + dialogs
        <AuthDialog />
```

Contexts / hooks:

| File | Responsibility |
| --- | --- |
| `components/AuthContext.tsx` + `contexts/AuthContext.ts` + `hooks/useAuth.ts` | Auth session + auth dialog visibility |
| `components/WebSocketContext.tsx` | Socket.IO lifecycle, join/leave session, `broadcastStateChange`, state-update callback registry |
| `components/CategoryContext.tsx` | **Core state**: `foregroundCategories`, `textCategories`, `dateInfoMap`, `selectedDates`; `applyRemoteState()` |
| `components/SessionContext.tsx` | Session id from URL hash, anonymous localStorage, REST save/load, debounced broadcast + autosave |
| `components/Calendar.tsx` | FullCalendar year view; converts `selectedDates` to background events; injects text symbols via **direct DOM manipulation** |
| `components/Sidebar.tsx` | User menu, foreground + text category editors, save button |
| `components/Categories.tsx` / `CategoryValue.tsx` | Category editor (label, color, active/visible, selection) |
| `components/SessionList.tsx` | "My Calendars" dialog (list/create/delete/share entry point) |
| `components/ShareDialog.tsx` | Share by email with viewer/editor level |
| `components/AccessBanner.tsx` | **Defined but never rendered (dead code)** |
| `components/SaveButton.tsx`, `MainContent.tsx`, `Layout.tsx` | Chrome/layout |
| `config/api.ts` | Resolves API + WS base URLs from Vite env or `window.location` |

State shape persisted for a calendar session:

```ts
interface SessionState {
  foregroundCategories: Category[];        // { id, label, color, active, visible, selected }
  textCategories: TextCategory[];          // { id, label, color, active, visible, selected }
  dateInfoMap: [string, DateInfoEntry][];  // key: "YYYY-MM-DD"
  timestamp: string;                       // ISO
}
interface DateInfoEntry {
  color: string;
  categoryId: string;
  textCategoryIds?: string[];
}
```

The frontend keeps `selectedDates: Map<date, color>` in sync with `dateInfoMap` **only for
backward compatibility**; `dateInfoMap` is authoritative.

### 4.2 Backend

Express 5 + Socket.IO 4 + Better-Auth + Drizzle ORM + `better-sqlite3` + Winston.

`packages/server/src/index.ts` is the bootstrap and currently mixes concerns:

- Dynamic CORS (`getAllowedOrigins()`) for REST **and** Socket.IO.
- `better-auth` handler mounted at `/api/auth` (`toNodeHandler`).
- Routes: `/api/sessions`, `/api/migrate`.
- `GET /health`.
- Socket.IO: `optionalAuthSocket` middleware, `join-session` / `leave-session` /
  `state-change` events; `checkSessionAccess()` permission helper.
- **Legacy** file persistence: `saveSessionToFile()` writes
  `data/sessions/<id>.json`, and `/api/legacy/sessions*` endpoints remain.

REST endpoints (`packages/server/src/routes/sessions.ts`):

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/sessions` | required | owned + shared, with `accessLevel` |
| POST | `/api/sessions` | optional | **upsert** (create or update state/name) |
| GET | `/api/sessions/:id` | optional | access check only when authenticated |
| PUT | `/api/sessions/:id` | optional | edit access enforced when authenticated |
| DELETE | `/api/sessions/:id` | optional | owner-only when session is owned |
| POST | `/api/sessions/:id/claim` | required | anonymous → owned |
| POST | `/api/sessions/:id/share` | required | owner-only, by email |

Permission matrix:

| Access | Read | Modify | Share | Delete |
| --- | --- | --- | --- | --- |
| Owner | yes | yes | yes | yes |
| Editor | yes | yes | no | no |
| Viewer | yes | no | no | no |
| Anonymous (own session) | yes | yes | no | yes |

### 4.3 Data model (`packages/server/src/db/schema/`)

- `users`, `accounts`, `verifications`, `better_auth_sessions` — Better-Auth tables.
- `sessions` — `id`, `user_id` (nullable), `is_anonymous`, `name`,
  **`state` (JSON blob)**, timestamps.
- `session_permissions` — `session_id`, `user_id`, `access_level` enum
  (`viewer|editor|owner`), `granted_at`, `granted_by`.
- `categories`, `date_info` — **legacy relational tables, used only by the migration
  route**; the live app stores everything inside `sessions.state`.

### 4.4 Real-time synchronization flow

1. User interaction mutates `CategoryContext` state.
2. `SessionContext` effect detects the change (JSON comparison), debounces ~500 ms,
   then `broadcastStateChange(sessionId, state)` emits `state-change`.
3. Server validates edit permission (authenticated users only), persists state (DB via
   REST upsert is expected; WebSocket path currently only writes a legacy JSON file),
   then emits `state-update` to the room excluding the sender.
4. Receiving clients call `applyRemoteState()` which sets `pendingRemoteUpdateRef` /
   `isRemoteUpdateRef` to suppress re-broadcast and the category color-sync effect.
5. Anonymous users with no `sessionId` autosave to `localStorage`
   (`minicalen-anonymous-session`).

### 4.5 Authentication

- Better-Auth email/password, 30-day sessions, HTTP-only cookie prefix `minicalen`.
- Frontend client in `packages/frontend/src/auth/client.ts`; `withCredentials: true`
  on Socket.IO and `credentials: 'include'` on fetches.
- Middleware: `requireAuth`, `optionalAuth` (Express), `optionalAuthSocket` (Socket.IO).
- `BETTER_AUTH_SECRET` is required (min 32 chars).

---

## 5. Configuration

### Frontend (`packages/frontend/.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Backend base URL (default `http://localhost:3001`) |
| `VITE_WS_URL` | WebSocket URL (defaults to `VITE_API_URL`) |

In production with the Caddy/nginx proxy, URLs are derived from `window.location`.

### Server (`packages/server/.env`)

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port (default `3001`) |
| `NODE_ENV` | `development` / `production` |
| `BETTER_AUTH_SECRET` | **Required**, min 32 chars |
| `ALLOWED_ORIGINS` | Comma-separated CORS/trusted origins |
| `MINICALEN_HOST` | Proxy host used to derive allowed origins |
| `USE_HTTPS` | `true` to enable HTTPS |
| `SSL_KEY_PATH`, `SSL_CERT_PATH` | Certificate paths when HTTPS enabled |

---

## 6. Deployment

- **Docker Compose** (`docker-compose.yml`): `ciberado/minicalen-frontend` (port 8080)
  + `ciberado/minicalen-server` (port 3001) with `minicalen-data` and `minicalen-logs`
  volumes; health checks hit `/health`.
- **Tailscale variant**: `docker-compose.tailscale.yml`.
- **Caddy**: root `Caddyfile` for reverse proxy + TLS (WebSocket path `/socket.io/*`).
- **CI/CD**: `.github/workflows/docker-release.yml` triggers on tags matching `*-RELEASE`,
  builds multi-arch images for both packages and pushes to Docker Hub
  (secrets: `DOCKER_USERNAME`, `DOCKER_PASSWORD`).
- See `DOCKER.md`, `DEPLOYMENT.md`, `CI-CD.md`, `LOGGING.md`.

---

## 7. Known Issues & Technical Debt

These are the main reasons a rewrite is justified. All are verified in the current code.

### Correctness / reliability

1. **No automated tests.** No unit, integration, or E2E tests; `TESTING.md` is a manual
   `curl` log. Any refactor is unguarded.
2. **Fragile remote-state synchronization.** `CategoryContext` uses
   `pendingRemoteUpdateRef` + `requestAnimationFrame` + a color-diff `useEffect` to avoid
   clobbering loaded state. `BUG-INVESTIGATION.md` documents a long history of race
   conditions and multiple attempted fixes. This is the highest-risk area.
3. **Dual/ambiguous persistence.** REST `POST /api/sessions` upserts to SQLite, but the
   WebSocket `state-change` handler calls `saveSessionToFile()` writing legacy JSON files.
   The two paths can diverge; `saveSessionToFile` also mutates the incoming state object
   (adds `timestamp`).
4. **Legacy endpoints still live** in `index.ts` (`/api/legacy/sessions*`) alongside the
   DB API.
5. **`listSessions()` in `SessionContext` is dead and wrong** — it returns the raw
   response body while `GET /api/sessions` returns `{ sessions: [...] }`; no component
   consumes it (`SessionList.tsx` calls the API directly).
6. **`AccessBanner.tsx` is dead code** — defined but never rendered.

### Security

7. **Anonymous users bypass session authorization.** In the `state-change` socket handler
   and in REST access checks, an unauthenticated request is allowed through. Any anonymous
   client that knows a session id can read and modify it. GET/PUT/DELETE also skip the
   ownership check whenever `userId` is undefined.
8. **Legacy endpoints are unauthenticated** and accept arbitrary ids/state.
9. **`checkSessionAccess()` duplicates** the permission logic already in
   `routes/sessions.ts`, using dynamic imports inside the request path.
10. **No rate limiting, CSRF hardening review, email verification, or password reset.**
11. **Session enumeration / public link model is implicit** — there is no explicit
    `isPublic` flag; access control relies on knowing the UUID.

### Code quality / maintainability

12. **Heavy debug logging.** ~97 `console.log` calls in the frontend (34 in
    `SessionContext`, 30 in `CategoryContext`, 21 in `Calendar`). No log levels/guards.
13. **Direct DOM manipulation** in `Calendar.tsx` for text symbols
    (`querySelectorAll`, injected `<div class="text-symbols-overlay">`), fighting React.
14. **`CategoryContext` is ~500 lines** mixing state, remote sync, selection, symbol
    generation and persistence concerns.
15. **Duplicated context plumbing**: `components/AuthContext.tsx` + `contexts/AuthContext.ts`
    + `hooks/useAuth.ts` for a single context; `Categories.tsx` keeps its own default
    categories separate from `CategoryContext`.
16. **Hacky text-category id remapping** in `Sidebar.tsx` (`t1`, `t2`… vs numeric ids).
17. **`any` types** remain in a few places (FullCalendar handlers, socket user casts).
18. **Legacy relational tables (`categories`, `date_info`) are unused** by the app and
    only referenced by the migration route — misleading schema.
19. **`copilot-instructions.md` is stale** (described file-based storage as primary and
    omitted auth) — superseded by this file.

---

## 8. Reimplementation Guidance (v2)

Goal: rebuild MiniCalen cleaner and better, preserving the product behaviour above.

### Product behaviour to preserve

- Year-at-a-glance calendar (12 months, 4×3 grid), click-to-assign.
- Foreground color categories + text label categories with symbols.
- Anonymous-first usage with local persistence.
- Accounts, "My Calendars", URL-based sharing, viewer/editor/owner roles.
- Real-time multi-user sync.
- Docker/compose deployment and tag-triggered image releases.

### Recommended technical direction

- **Single source of truth for calendar state** with an explicit reducer / store
  (e.g. Zustand, Redux Toolkit, or a well-typed `useReducer`) instead of four nested
  contexts with refs. Model `applyRemote` vs `localEdit` as explicit actions so remote
  application never triggers re-broadcast or derived-state effects. This directly kills
  the class of bugs in `BUG-INVESTIGATION.md`.
- **Normalize the domain model**: `Session { id, name, ownerId, visibility }`,
  `Category { id, sessionId, type, label, color, order }`,
  `DateMark { date, categoryId, textCategoryIds[] }`. Persist relationally (the existing
  `categories`/`date_info` tables are a starting point) instead of a JSON blob, or keep a
  single versioned JSON document but make it the only persistence path.
- **One persistence path**: remove legacy file storage and `/api/legacy/*`; the realtime
  layer should persist via the same service used by REST.
- **Authorization as a single service/middleware** shared by REST and Socket.IO, with
  deny-by-default and explicit public-link semantics. Add tests around the permission
  matrix.
- **Version the state document** (`schemaVersion`) and write migrations for it.
- **Testing from day one**: Vitest + React Testing Library for the frontend, Vitest/
  node:test + Supertest for the API, and a Playwright happy-path for
  create/share/collaborate. Add `npm test` at the root.
- **Typed shared contracts**: a shared `packages/shared` (or `@minicalen/contracts`) with
  Zod/TypeScript schemas for `SessionState`, category types, and socket events, consumed
  by both packages.
- **Structured logging** (pino or the existing Winston) with levels; replace frontend
  `console.log` with a gated logger.
- **Render text symbols through React/FullCalendar hooks** rather than DOM injection.
- **Config via validated env** (e.g. Zod) with fail-fast at startup.
- **Remove dead code** (`AccessBanner`, `listSessions`, legacy tables) unless re-used.
- Consider **PostgreSQL** if multi-instance/horizontal scaling is a goal; keep SQLite for
  single-node simplicity.
- Keep the **monorepo + npm workspaces** structure, but add a shared contracts package
  and a `test` script to the root.

### Suggested first steps for the rewrite

1. Freeze current behaviour: write a short product spec + permission matrix tests.
2. Create `packages/shared` with state/domain types and validation.
3. Stand up the new server with a single persistence service and authorization layer.
4. Build the frontend store with explicit local/remote actions.
5. Port UI components, removing DOM hacks and debug logging.
6. Add CI (lint + type-check + test + build) and re-point the Docker release workflow.

---

## 9. Conventions

- **Do not add comments** unless explicitly requested.
- Match existing formatting: 2-space indent, single quotes, TypeScript throughout.
- Commits use **Conventional Commits with git-cz / cz-git** (`npm run commit`);
  types are prefixed with emoji in history (feat 🎸, fix 🐛, refactor 💡, chore 🤖,
  docs 📝, style 💄).
- Versions are kept in lockstep across root/frontend/server `package.json`.
- Never commit secrets; `.env.local` is untracked, use `.env.example` as reference.
- Prefer editing existing files; avoid new documentation files unless requested.

---

## 10. Documentation Map

| File | Contents |
| --- | --- |
| `README.md` | User/feature overview, quick start, architecture diagram |
| `CHANGELOG.md` | Version history (Keep a Changelog) |
| `AGENTS.md` | **This file** — canonical agent/contributor guide |
| `.github/copilot-instructions.md` | Legacy agent notes (superseded; kept for compatibility) |
| `docs/AUTHENTICATION.md` | Auth system guide |
| `docs/AUTHENTICATION_PLAN.md` | Original phased auth plan |
| `TESTING.md` | Manual authentication test log |
| `BUG-INVESTIGATION.md` | Deep dive on the state-sync race condition |
| `DOCKER.md`, `DEPLOYMENT.md`, `CI-CD.md`, `LOGGING.md` | Ops docs |

---

## 11. v2 Workspace (in progress)

The reimplementation lives in **`v2/`** on the `v2` branch, as a **separate npm workspace**
so it does not interfere with v1. See `v2/README.md` for package details.

### v2 stack decisions

| Area | Choice |
| --- | --- |
| UI | Vanilla TypeScript + **Lit** Web Components (no React) |
| Sync | **Yjs** CRDT (Hocuspocus + IndexedDB) with awareness/presence |
| Persistence | SQLite via Drizzle ORM (single path: Yjs snapshots) |
| Rendering | Custom `<year-grid>` + forked **neatocal** (MIT) `<neatocal-view>` |
| Auth | **Better-Auth** (email/password), anonymous-first with per-session tokens |
| Tooling | TypeScript 5.9, ESLint 10 (flat), Vite 8, Vitest 5, Playwright |

### v2 packages

| Package | Responsibility | Status |
| --- | --- | --- |
| `@minicalen/shared` | Domain types, Zod schemas, Yjs document helpers, dates | done |
| `@minicalen/renderer` | Lit year grid + neatocal read-only view | done |
| `@minicalen/frontend` | App shell, Yjs wiring, auth/session UI | done |
| `@minicalen/server` | Express + Hocuspocus + Better-Auth + SQLite | done |

### v2 commands

Run from `v2/`:

```bash
npm install
npm run dev:all      # server (3001/3002) + frontend (5173); single entry via Vite proxy
npm run lint
npm run type-check
npm run test         # Vitest (unit + integration)
npm run test:e2e     # Playwright (starts servers; reuses running ones)
npm run build
docker compose up -d --build   # frontend on :8080, server on :3001/:3002
```

### v2 phase plan

0. Scaffold monorepo, tooling, CI — **done**
1. `shared`: domain + Zod + Yjs helpers + tests — **done**
2. Server: Better-Auth, REST metadata, Hocuspocus, authz, SQLite persistence — **done**
3. Frontend: Lit shell, Yjs + IndexedDB, auth UI, session list/share — **done**
4. Interactive `<year-grid>` — **done**
5. Forked neatocal read-only view — **done**
6. Awareness/presence + read-only enforcement — **done**
7. Docker/CI, docs, final verification — **done**

All planned phases are complete at `2.0.0-beta.0`.

### v2 conventions

- **Exhaustive tests** for every module (Vitest; Playwright for E2E).
- Calendar state lives in a versioned `Y.Doc` (`schemaVersion`, currently 2). `DateMark`
  supports up to two foreground categories rendered as a diagonal split, plus text symbols.
  Bump `SCHEMA_VERSION` and add a migration in `shared/src/ydoc.ts` when changing the model.
- **No comments** unless requested; 2-space indent, single quotes, TypeScript.
- Commit regularly with Conventional Commits; semantic versioning (started at
  `2.0.0-alpha.0`).
- `shared`/`renderer` are consumed as TypeScript source via workspace `exports`; the
  server runs with `tsx`.
- Note: this environment's npm blocks lifecycle scripts; approve `better-sqlite3`
  (`npm install-scripts approve better-sqlite3`) before Phase 2 uses it.
