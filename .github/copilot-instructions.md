# MiniCalen AI Coding Instructions

## Project Architecture

MiniCalen is a **real-time collaborative calendar application** built as an npm workspace monorepo with React frontend and Node.js backend, featuring WebSocket-based live synchronization.

### Workspace Structure

- `packages/frontend/` - React 18 + TypeScript + Vite + Material-UI application
- `packages/server/` - Express.js + Socket.IO backend with file-based session storage
- Root workspace manages both packages via npm workspaces

## Development Workflow

### Starting Services

```bash
npm run dev:all      # Start both frontend and backend concurrently
npm run dev:server   # Backend only (port 3001) 
npm run dev          # Frontend only (port 5173)
```

### Key Commands

- Use `npm run build` to build both packages
- Use `--workspace=@minicalen/frontend` or `--workspace=@minicalen/server` for package-specific commands
- Backend uses `nodemon` with `tsx` for TypeScript hot-reload in development

## Core Patterns

### Context-Based State Management
The frontend uses **nested React Context providers** for global state:
```tsx
<WebSocketProvider>
  <CategoryProvider>
    <SessionProvider>
      <Layout/>
```

**Key contexts:**
- `WebSocketContext` - Real-time communication and session management
- `CategoryProvider` - Calendar categories with color coding (foreground/background/tag types)
- `SessionContext` - Session persistence and state management

### Real-Time Synchronization Architecture

- Backend (server): Express.js server with Socket.IO for WebSocket connections
- Frontend: Socket.IO client integrated via React Context
- **State broadcasting pattern**: Local state changes trigger WebSocket events to sync across clients
- **Dual persistence**: Changes saved via both API calls and WebSocket state-change events

### Session Management

- **File-based storage**: Sessions saved as JSON files in `packages/server/data/sessions/`
- **UUID-based session IDs**: Each session gets a unique identifier
- **Automatic persistence**: State changes auto-saved via WebSocket `state-change` events
- **API endpoints**: `/api/sessions` for CRUD operations

### Category System

Three category types with distinct behaviors:

- **Foreground**: Primary calendar categories with colors (`#F44336`, `#2196F3`, etc.)

## Configuration Patterns

### Environment-Aware CORS

Backend dynamically configures CORS based on environment:
- Development: Auto-includes localhost ports (5173, 3000)
- Production: Uses `ALLOWED_ORIGINS` or `MINICALEN_HOST` environment variables
- See `getAllowedOrigins()` function in `packages/server/src/index.ts`

### API Configuration

Frontend uses environment-aware API configuration:
- Development: Defaults to `http://localhost:3001`
- Production: Uses `VITE_API_URL`/`VITE_WS_URL` or derives from current host
- See `packages/frontend/src/config/api.ts`

### Deployment with Caddy

- **Reverse proxy setup**: Caddy handles SSL termination and routing
- **WebSocket support**: Special handling for `/socket.io/*` paths
- **Environment variables**: `MINICALEN_HOST`, `MINICALEN_BACKEND`, `MINICALEN_FRONTEND`
- Configuration in `packages/server/Caddyfile`

## Development Guidelines

### File Structure Conventions

- Context files end with `Context.tsx` and export both context and provider
- Component files use PascalCase and include corresponding `.css` files where needed
- Server uses single `index.ts` file with clear separation of concerns (WebSocket, API, file operations)

### State Update Pattern

When modifying calendar state:

1. Update local React state
2. Broadcast via WebSocket using `broadcastStateChange()`
3. Backend auto-saves to file system
4. Other clients receive updates via WebSocket

### Error Handling

- Server includes comprehensive environment validation (SSL certificates, CORS configuration)
- Frontend includes connection fallbacks (WebSocket → polling)
- File operations include proper error handling and logging

### Security Considerations

- Sessions API endpoint `/api/sessions` marked for privacy enhancement (TODO comment)
- CORS origins strictly controlled in production
- SSL/HTTPS support with certificate validation

## Common Debugging

- Enable API debugging with `debugApiConfig()` in development
- WebSocket connection logging on both client and server
- Session file storage visible in `packages/server/data/sessions/`
- Health check endpoint at `/health` provides environment status
