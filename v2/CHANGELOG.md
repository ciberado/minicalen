# Changelog

All notable changes to MiniCalen v2 are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0-beta.4] - 2026-09-19

### Changed

- **Day cell layout**: the number and the text symbols now stack in normal flow (no absolute
  overlay), so symbols can no longer overlap the day number.
- **Responsive cell height**: day cells grow with the viewport
  (`min-height: clamp(30px, 3.6vh, 52px)`) and expand further only when their content needs
  it. Months are taller when there is room without looking stretched; on short screens the
  grid scrolls instead of compressing.

## [2.0.0-beta.3] - 2026-09-19

### Added

- **Two foreground categories per day**: `DateMark.categoryIds` now holds up to two
  categories. A day with two is split along the bottom-left → top-right diagonal; the
  category with the lower `order` always occupies the top-left half, so the same category
  keeps the same half across days.
- **Adaptive day-number ink**: the number (now top-left) picks dark or light ink based on
  the WCAG relative luminance of the category color (and of the top-left half when there
  are two), so it is always legible.
- **Add/remove click behaviour**: clicking a selected foreground category toggles it;
  adding a third replaces the oldest one on that day.

### Changed

- **Schema version 2** with a `v1 → v2` migration (`categoryId` → `categoryIds`) applied
  on document load on both the server and the client.
- The neatocal print view renders the same diagonal split and ink via `NeatoCalColorCell.ink`.
- Bumped all v2 packages to `2.0.0-beta.3`.

## [2.0.0-beta.2] - 2026-09-19

### Added

- **Single entry point**: the Vite dev server now proxies `/api` and `/collaboration`
  (WebSocket) to the backend, so the app is reachable through one URL — e.g.
  `http://vs-minicalen:5173` from another device over Tailscale.
- The frontend derives the API and WebSocket URLs from `window.location` (same origin) in
  both development and production; explicit `VITE_API_URL`/`VITE_COLLAB_URL` still override.

### Changed

- Bumped all v2 packages to `2.0.0-beta.2`.

## [2.0.0-beta.1] - 2026-09-18

### Changed

- **Theme**: introduced a calm "zen" visual language driven by CSS custom properties that
  pierce the shadow DOM: warm stone background, sage accent, soft cards, generous spacing
  and gentle transitions across the app shell, sidebar, category editor, dialogs, year grid
  and the neatocal view.
- **Categories**: vibrant per-category highlights — swatches keep their saturated colors
  with a soft colored glow, selected rows get a sage ring, and marked days render as
  rounded, elevated color chips.
- Bumped all v2 packages to `2.0.0-beta.1`.

## [2.0.0-beta.0] - 2026-09-18

### Added

- **E2E**: Playwright happy-path tests (anonymous calendar persistence and sign-up flow).
- **Docker**: server and frontend images plus `docker-compose.yml` (nginx proxies `/api`
  and `/collaboration`).
- **CI**: `v2-ci.yml` now runs the E2E suite; `v2-docker-release.yml` publishes images on
  `v2-*-RELEASE` tags.
- **Docs**: v2 README, architecture notes and operational commands.

### Fixed

- Session store now creates a fresh `Y.Doc` per session so switching/connecting no longer
  propagates deletes that wiped persisted state.

### Changed

- Bumped all v2 packages to `2.0.0-beta.0` (all planned phases complete).

## [2.0.0-alpha.5] - 2026-09-18

### Added

- **Frontend**: awareness/presence — connected peers are shown in the sidebar and the
  local user identity is broadcast over Yjs awareness.
- **Frontend**: read-only banner for viewer sessions.
- **Server**: integration tests for the collaboration server (owner authentication and
  persistence, viewer read-only scope, anonymous rejection).

### Changed

- Bumped all v2 packages to `2.0.0-alpha.5`.

## [2.0.0-alpha.4] - 2026-09-18

### Added

- **Renderer**: forked **NeatoCal** (MIT) into a dependency-free `renderYear()` module
  supporting the `aligned-weekdays` and `default` layouts, plus a `<neatocal-view>` Web
  Component for the read-only/print view.
- **Frontend**: Grid / Print view switcher in the sidebar.

### Tests

- 12 renderer tests for `renderYear` and `<neatocal-view>` (87 tests total).

### Changed

- Bumped all v2 packages to `2.0.0-alpha.4`.

## [2.0.0-alpha.3] - 2026-09-18

### Added

- **Renderer**: interactive `<year-grid>` Web Component — 12-month 4×3 layout, today
  highlight, foreground colors, text symbols, click handling and read-only mode.
- **Shared**: date utilities (`toDateKey`, `monthCells`, `daysInMonth`, …) with tests.
- **Frontend**: wired the year grid to the session store with toggle behaviour.

### Tests

- 11 renderer component tests and 6 shared date tests (75 tests total).

### Changed

- Bumped all v2 packages to `2.0.0-alpha.3`.

## [2.0.0-alpha.2] - 2026-09-18

### Added

- **Frontend**: anonymous-first Lit app shell with sidebar, category editor, auth
  dialog, session list and share dialog.
- **Frontend**: Yjs + IndexedDB session store with a Hocuspocus provider, read-only
  detection and default categories for empty calendars.
- **Frontend**: API client with per-session anonymous tokens (localStorage +
  `Authorization` header).
- **Server**: per-session anonymous access tokens (hashed at rest) so anonymous creators
  can access their own sessions without weakening the deny-by-default model.
- **Tests**: frontend API client tests and server anonymous-token authorization tests.

### Changed

- Bumped all v2 packages to `2.0.0-alpha.2`.

## [2.0.0-alpha.1] - 2026-09-18

### Added

- **Server**: Better-Auth email/password authentication with Drizzle + SQLite persistence.
- **Server**: session metadata REST API — list, create, rename, delete, claim, share,
  permissions and snapshot state endpoints.
- **Server**: single authorization service with **deny-by-default** and explicit
  `public` visibility (fixes the v1 anonymous bypass).
- **Server**: Hocuspocus collaboration server that loads/stores Yjs documents in SQLite.
- **Server**: validated environment configuration and structured logging (pino).
- **Tests**: 21 server tests covering authorization, REST integration and persistence.

### Changed

- Bumped all v2 packages to `2.0.0-alpha.1`.

## [2.0.0-alpha.0] - 2026-09-18

### Added

- **v2 monorepo scaffold**: npm workspaces, TypeScript 5.9, ESLint 10 (flat), Vitest 5,
  Vite 8 and a CI workflow.
- **`@minicalen/shared`**: domain types, Zod schemas, Yjs document helpers, default
  categories, symbol generation and id generation.
- **`@minicalen/renderer`**: Lit `<year-grid>` placeholder.
- **`@minicalen/frontend`**: Vite + Lit application shell.
- **`@minicalen/server`**: Express health endpoint.
- **Tests**: 30 shared tests and a server health test.
