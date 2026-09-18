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
npm run dev:all      # server (3001) + frontend (5173)
npm run lint
npm run type-check
npm run test
npm run build
```

## Status

Phase 0 (scaffold). No features implemented yet.
