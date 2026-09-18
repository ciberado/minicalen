# MiniCalen AI Coding Instructions

> **Canonical guide: [`AGENTS.md`](../AGENTS.md) at the repository root.**
> This file is kept for tool compatibility. When the two disagree, `AGENTS.md` wins.
> This document was previously stale (it described file-based storage as primary and
> omitted authentication); it has been corrected as of v1.5.1.

## Project Architecture

MiniCalen is a **real-time collaborative year-view calendar** built as an npm workspace
monorepo:

- `packages/frontend/` — React 18 + TypeScript + Vite + Material-UI v7 + FullCalendar v6
- `packages/server/` — Express 5 + Socket.IO + Better-Auth + Drizzle ORM + SQLite
- Root workspace manages both packages via npm workspaces

Sessions are stored in **SQLite** (`packages/server/data/minicalen.db`) as a JSON `state`
blob on the `sessions` table, with ownership and sharing in `session_permissions`.
Legacy JSON files in `data/sessions/` are still written by the WebSocket path and can be
migrated via `/api/migrate/legacy-sessions`.

## Development Workflow

```bash
npm install
npm run dev:all      # frontend (5173) + server (3001)
npm run dev          # frontend only
npm run dev:server   # server only
npm run lint         # eslint both packages (max-warnings 0)
npm run build        # tsc + vite (frontend), tsc (server)
npm run type-check --workspace=@minicalen/frontend
npm run type-check --workspace=@minicalen/server
```

Database (from the server workspace):

```bash
npm run db:generate --workspace=@minicalen/server
npm run db:migrate  --workspace=@minicalen/server
npm run db:push     --workspace=@minicalen/server
npm run db:studio   --workspace=@minicalen/server
```

There is **no automated test suite**.

## Core Patterns

### Provider nesting (`packages/frontend/src/App.tsx`)

```tsx
<AuthProvider>          // Better-Auth session (useSession)
  <WebSocketProvider>   // socket.io-client
    <CategoryProvider>  // foregroundCategories, textCategories, dateInfoMap
      <SessionProvider> // URL hash, localStorage, REST save/load, WS broadcast
        <Layout />
        <AuthDialog />
```

- `CategoryContext` is the source of truth for calendar state.
- `SessionContext` persists state to `/api/sessions` (upsert) and broadcasts over
  Socket.IO after a ~500 ms debounce.
- Remote updates are applied via `applyRemoteState()` using refs
  (`pendingRemoteUpdateRef`, `isRemoteUpdateRef`) to suppress re-broadcast. This is
  fragile — see `BUG-INVESTIGATION.md`.

### Session state shape

```ts
interface SessionState {
  foregroundCategories: Category[];        // { id, label, color, active, visible, selected }
  textCategories: TextCategory[];          // { id, label, color, active, visible, selected }
  dateInfoMap: [string, DateInfoEntry][];  // "YYYY-MM-DD" -> { color, categoryId, textCategoryIds? }
  timestamp: string;                       // ISO
}
```

### Real-time flow

1. Local state change in `CategoryContext`.
2. `SessionContext` detects it and emits `state-change` over Socket.IO.
3. Server validates permission (authenticated users only) and persists; the WebSocket
   path currently writes a legacy JSON file.
4. Server emits `state-update` to the room (excluding sender).
5. Receiving clients apply it via `applyRemoteState()`.

### Authentication

- Better-Auth email/password, 30-day sessions, cookie prefix `minicalen`.
- Express middleware `requireAuth` / `optionalAuth`; Socket.IO `optionalAuthSocket`.
- Permission levels: `owner` (all), `editor` (read/write), `viewer` (read).
- Anonymous sessions are first-class and can later be claimed by a signed-in user.

## Configuration

- Frontend: `VITE_API_URL`, `VITE_WS_URL` (`packages/frontend/.env`).
- Server: `PORT`, `NODE_ENV`, `BETTER_AUTH_SECRET` (required, ≥32 chars),
  `ALLOWED_ORIGINS`, `MINICALEN_HOST`, `USE_HTTPS`, `SSL_KEY_PATH`, `SSL_CERT_PATH`.
- CORS is environment-aware in `getAllowedOrigins()` (`packages/server/src/index.ts`).
- Runtime API/WS URLs are resolved in `packages/frontend/src/config/api.ts`.

## Deployment

- Docker Compose: `ciberado/minicalen-frontend` + `ciberado/minicalen-server`.
- Root `Caddyfile` handles reverse proxy/TLS (WebSocket path `/socket.io/*`).
- Pushing a tag matching `*-RELEASE` triggers `.github/workflows/docker-release.yml`,
  which builds multi-arch images and pushes to Docker Hub.

## Agent shortcuts

- **"patch bump"** → run `npm run build`, fix errors, increment the patch version of all
  `package.json` files (root, frontend, server), update `CHANGELOG.md`, commit and tag.
- **"release"** → create and push a tag ending in `-RELEASE`
  (e.g. `v1.5.1-RELEASE`) to trigger the Docker image pipeline.

## Important caveats

The current code is a **reference implementation for a planned v2 rewrite**. Known issues
(no tests, fragile state sync, dual persistence, anonymous authorization bypass, dead
code, heavy `console.log` usage) are catalogued in [`AGENTS.md`](../AGENTS.md) section 7.
