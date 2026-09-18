# Changelog

All notable changes to MiniCalen v2 are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
