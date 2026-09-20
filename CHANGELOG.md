# Changelog

All notable changes to MiniCalen v2 are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0] - 2026-09-20

### Added

- The year grid now **scales down uniformly** when the viewport is too short to show all
  twelve months, keeping the layout coherent instead of scrolling (with a 55% floor below
  which it scrolls again). Only the calendar is scaled; the sidebar keeps its size.

## [2.4.1] - 2026-09-20

### Fixed

- Moved the year control into the sidebar so the 12-month grid no longer loses vertical
  space above the fold on 1080p screens (it now fits down to ~950px of viewport height).

## [2.4.0] - 2026-09-20

### Added

- **New calendar** button in the sidebar: signed-in users create a fresh owned calendar;
  anonymous users reset to a clean local calendar.
- **Subtle year navigation** (`‹ year ›`) in the grid and print views, with a click on the
  year jumping back to the current year. The mobile two-month view now paginates across year
  boundaries.
- **Magic-link sharing for anonymous sessions**: saving a calendar appends the anonymous
  token to the URL fragment (`#<id>?k=<token>`), so opening the link on another device grants
  access and syncs in real time.

### Fixed

- Loading a session by changing the URL hash (e.g. pasting a link into an already-open tab)
  now works; previously only a full page load honored the hash.
- `/health` reports the real app version; `APP_VERSION` is read from the root `package.json`
  instead of being hardcoded.

## [2.3.0] - 2026-09-20

### Added

- **Mobile two-month view**: on coarse-pointer, narrow viewports the app defaults to a
  paginated view showing two months at a time — stacked in portrait, side by side in
  landscape — with previous/next and **Today** navigation.
- Collapsible sidebar drawer on mobile, opened from a top bar button and closed after
  selecting a category.
- `<year-grid>` now accepts `startMonth`, `monthCount` and `columns` to render a subset of
  the year, keeping the full 12-month responsive layout when unset.
- Playwright `mobile` project (Pixel 5) and mobile end-to-end coverage.

## [2.2.0] - 2026-09-20

### Changed

- Merged the two per-category toggles (**Active** and **Visible**) into a single **Enabled**
  toggle: turning it off both prevents applying the category to days and fades its existing
  marks.
- Removed the legacy v1 codebase; the v2 implementation now lives at the repository root.

### Removed

- v1 packages, docs and the separate frontend/server Docker images (superseded by the
  all-in-one image).

## [2.1.0] - 2026-09-20

### Added

- **All-in-one Docker image**: a single `ciberado/minicalen` image runs **Caddy** (serves the
  SPA and proxies `/api` and `/collaboration`) and the **Node server** (REST + Hocuspocus) in
  one container, exposing only port `8080`.
- **Tailscale deployment example** (`docker-compose.tailscale.yml`): a Tailscale sidecar joins
  the app to a tailnet with no published ports; an external Caddy reaches the node by name.
- `HOST` configuration to bind the server and collaboration listeners.

### Changed

- The Docker release workflow now publishes the single `ciberado/minicalen` image (tags
  version, commit sha and `latest`) instead of separate frontend and server images.
- Removed the per-package Dockerfiles and the nginx config in favour of the single image and
  a `Caddyfile`.
- `app.set('trust proxy', 1)` in production so Better-Auth sees the forwarded protocol behind
  Caddy.

## [2.0.0] - 2026-09-20

First stable release of the v2 reimplementation.

### Added

**Monorepo and tooling**

- npm workspaces monorepo with TypeScript 5.9, ESLint 10 (flat), Vitest 5 and Vite 8.
- CI that runs lint, type-check, unit/integration tests, build and Playwright E2E.

**`@minicalen/shared`**

- Domain types, Zod schemas and Yjs document helpers with schema versioning and migrations.
- Date utilities, default categories, symbol generation and id generation.

**`@minicalen/renderer`**

- Interactive `<year-grid>` Web Component: 12-month 4×3 layout, today highlight,
  foreground colours, text symbols, click handling and read-only mode.
- Forked **NeatoCal** (MIT) `renderYear()` (aligned-weekdays and default layouts) and a
  `<neatocal-view>` Web Component for the sheet/print view.
- Up to two foreground categories per day, split along the bottom-left → top-right
  diagonal (the lower `order` always occupies the top-left half).
- Contrast-computed day-number ink and normal-flow stacking of the number and symbols.

**`@minicalen/server`**

- Better-Auth email/password authentication with Drizzle ORM + SQLite.
- Session metadata REST API: list, create, rename, delete, claim, share, permissions and
  snapshot state endpoints.
- Single **deny-by-default** authorization service shared by REST and Hocuspocus, with
  explicit `public` visibility and per-session anonymous access tokens (hashed at rest).
- Hocuspocus collaboration server that loads/stores Yjs documents in SQLite.
- Validated environment configuration and structured logging (pino).

**`@minicalen/frontend`**

- Anonymous-first Lit app shell: sidebar, category editor, auth dialog, session list and
  share dialog.
- Yjs + IndexedDB session store with a Hocuspocus provider, read-only detection and default
  categories for empty calendars.
- API client with per-session anonymous tokens (`localStorage` + `Authorization` header).
- Awareness/presence and a read-only banner for viewer sessions.
- Grid / Sheet view switcher.
- Calm "zen" theme with vibrant per-category highlights.
- Single entry point in development (Vite proxies `/api` and `/collaboration`); the
  frontend derives its API/WebSocket URLs from `window.location`.
- Printing: the current view on **A4 landscape**, **in colour**, fitted to one page and
  with the calendar title at the top.

**Operations**

- Docker images for the server and frontend plus `docker-compose.yml`.
- `v2-docker-release.yml` publishes images on `v2-*-RELEASE` tags.

### Changed

- Calendar state is schema version **2**; `DateMark` holds up to two `categoryIds` and any
  number of `textCategoryIds`.

### Fixed

- The session store creates a fresh `Y.Doc` per session, so switching/connecting no longer
  propagates deletes that wiped persisted state.
- `loadSnapshot` applies the stored update before wrapping the document, avoiding a
  schema-version race.
