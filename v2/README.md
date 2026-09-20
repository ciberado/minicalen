# MiniCalen v2

Clean reimplementation of MiniCalen. See the root [`AGENTS.md`](../AGENTS.md) for the
product behaviour and the v1 reference implementation.

## Direction

- **UI**: vanilla TypeScript + [Lit](https://lit.dev) Web Components (no React).
- **Sync**: [Yjs](https://yjs.dev) CRDT with Hocuspocus + IndexedDB (offline-first).
- **Persistence**: SQLite via Drizzle ORM; a single persistence path.
- **Rendering**: custom year grid; [neatocal](https://github.com/abetusk/neatocal) (MIT)
  forked as a reusable read-only renderer.
- **Auth**: Better-Auth (email/password), anonymous-first.

## Packages

| Package | Responsibility |
| --- | --- |
| `@minicalen/shared` | Domain types, Zod schemas, Yjs document helpers |
| `@minicalen/renderer` | Lit year grid + forked neatocal read-only view |
| `@minicalen/frontend` | App shell, Yjs wiring, auth/session UI |
| `@minicalen/server` | Express + Hocuspocus + Better-Auth + SQLite |

## Commands

```bash
npm install
npm run dev:all      # server (3001/3002) + frontend (5173)
npm run lint
npm run type-check
npm run test         # Vitest (unit + integration)
npm run test:e2e     # Playwright (starts servers; reuses running ones)
npm run build
```

## Single entry point

In development the Vite server proxies `/api` (REST) and `/collaboration` (WebSocket) to the
backend, so **one URL is enough** — including from another device over Tailscale:

```
http://vs-minicalen:5173
```

Start both processes from `v2/`:

```bash
npm run dev:all
```

The proxy rewrites the `Origin` header for `/api` to `http://localhost:5173`, which the
server trusts in development. In production the container's Caddy performs the equivalent
proxying, so the app is also reachable through a single origin.

## Docker (all-in-one image)

A single image (`ciberado/minicalen`) runs everything: Caddy serves the SPA and proxies
`/api` and `/collaboration` to the Node server (REST + Hocuspocus) running in the same
container. Only port `8080` is exposed.

```bash
docker compose up -d --build          # http://localhost:8080
```

Set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `ALLOWED_ORIGINS` for non-local
deployments. The SQLite database lives in the `minicalen-data` volume at `/app/data`.

### Deployment with Tailscale

`docker-compose.tailscale.yml` joins the app to a tailnet through a sidecar; no ports are
published and no Tailscale Serve config is needed — the node is reachable by name. Copy
`.env.example` to `.env`, fill in `CLIENT_SECRET` and `BETTER_AUTH_SECRET`, then:

```bash
cp .env.example .env
# edit .env
docker compose -f docker-compose.tailscale.yml up -d
```

By default the node joins as your own device (no ACL tags). To use a tag, set
`TS_EXTRA_ARGS=--advertise-tags=tag:container` and create the auth key **with** that tag
(or declare it in the ACL `tagOwners`); otherwise Tailscale rejects it with
`requested tags ... are invalid or not permitted`.

Then a Caddy on another tailnet node (e.g. an EC2 with a public IP) exposes it:

```
minicalen.mininube.com {
    encode gzip
    reverse_proxy http://minicalen:8080
}
```

Caddy handles the `/collaboration` WebSocket upgrade automatically, and the container's
internal Caddy routes `/api` and `/collaboration` to the local server.

## Status

All planned phases are complete at `2.1.0`:

- Phase 0 (scaffold) — done
- Phase 1 (`shared` domain + Yjs helpers) — done
- Phase 2 (server: auth, REST, Hocuspocus, SQLite) — done
- Phase 3 (frontend: Lit shell, Yjs + IndexedDB, auth/session UI) — done
- Phase 4 (interactive `<year-grid>`) — done
- Phase 5 (forked neatocal read-only view) — done
- Phase 6 (awareness/presence + read-only enforcement) — done
- Phase 7 (Docker/CI, docs, final verification) — done

## Printing

The Print button in the sidebar prints the **current view** (grid or sheet) on
**A4 landscape** and **in colour**, fitted to one page, with the calendar title (and year) at
the top. This is driven by `@page { size: A4 landscape; margin: 6mm }` and
`print-color-adjust: exact` in `styles/global.css`, plus compact `@media print` rules inside
the app shell (which shows the title and hides the sidebar, dialogs and toasts),
`<year-grid>` and `<neatocal-view>`.

## Testing

- **Vitest** — `shared` (domain, Zod, Yjs helpers, dates), `renderer` (year grid,
  neatocal) and `server` (authz, REST via Supertest, persistence, collaboration
  integration).
- **Playwright** — `e2e/` covers the anonymous calendar persistence flow and the
  sign-up flow.

## Architecture notes

- The calendar state is a single `Y.Doc`: `categories` and `dateMarks` maps plus a `meta`
  map with `schemaVersion`. `@minicalen/shared` owns the document helpers and migrations.
- A `DateMark` holds up to two foreground `categoryIds` and any number of `textCategoryIds`.
  Two categories render as a bottom-left → top-right diagonal split (lower `order` on the
  top-left); the day number uses contrast-computed ink. Schema `v1 → v2` migration runs on
  document load (server and client).
- Day cells stack the number and text symbols in normal flow and use a responsive height
  (`clamp(30px, 3.6vh, 52px)`), so symbols never overlap the number and months use available
  vertical space without stretching.
- The server persists encoded Yjs updates in `session_documents` (snapshot per session)
  through Hocuspocus `onLoadDocument`/`onStoreDocument`.
- Authorization is deny-by-default in `authz.ts`, shared by REST and Hocuspocus. Anonymous
  creators get a per-session token (hashed at rest) stored in the browser and sent as a
  bearer token / provider token.
- Presence uses Yjs awareness; viewers connect with `readOnly` enforced by the server.

## NeatoCal attribution

`@minicalen/renderer` includes a focused TypeScript adaptation of the
[NeatoCal](https://github.com/abetusk/neatocal) `aligned-weekdays` and `default` layouts
(MIT). See `packages/renderer/src/neatocal/LICENSE`. Moon phases, ICS import and other
NeatoCal features are intentionally omitted.

See `CHANGELOG.md` for details.

## Server layout

- REST API on `PORT` (default 3001): `/api/auth/*`, `/api/sessions/*`, `/health`.
- Collaboration WebSocket on `COLLAB_PORT` (default 3002) via Hocuspocus.

The server runs with `tsx` (TypeScript source). Database migrations live in
`packages/server/drizzle/` and are applied automatically on startup.
