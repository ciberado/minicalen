# Changelog

All notable changes to MiniCalen v2 are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
