# MiniCalen AI Coding Instructions

## Project Architecture

MiniCalen is a **real-time collaborative calendar application** built as an npm workspace monorepo with React frontend and Node.js backend, featuring WebSocket-based live synchronization.

### Workspace Structure

- `packages/frontend/` - React 18 + TypeScript + Vite + Material-UI application
- `packages/server/` - Express.js + Socket.IO backend with file-based session storage
- Root workspace manages both packages via npm workspaces

## Development Workflow

### Development Workflows

**Starting Services**:
```bash
npm run dev:all      # Start both frontend and backend concurrently
npm run dev:server   # Backend only (port 3001) 
npm run dev          # Frontend only (port 5173)
```

**Package-Specific Operations**:
```bash
# Workspace-scoped commands
npm install --workspace=@minicalen/frontend <package>
npm run lint --workspace=@minicalen/server
npm run build --workspace=@minicalen/frontend

# Available VS Code tasks (use run_task tool):
# - "Start All Services" - Equivalent to npm run dev:all
# - "Start Development Server" - Frontend only
# - "Start Backend Server" - Backend only
```

**Docker Deployment**:
- Local images: `npm run build:frontend:docker` / `npm run build:server:docker`
- Production: Use pre-built `ciberado/minicalen-frontend` and `ciberado/minicalen-server`
- Persistence: `/app/data` (sessions) and `/app/logs` volumes in server container

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

**Architecture**: Three category types with distinct behaviors:

- **Foreground**: Primary calendar categories with colors (`#F44336`, `#2196F3`, etc.)
- **Date-to-Category Mapping**: `dateInfoMap` stores date strings mapped to `{color, categoryId}` objects
- **Real-time Sync**: Category changes automatically update associated dates via React `useEffect`

**Key Implementation**: Categories are managed in `CategoryContext.tsx` with nested state:
```tsx
// Date info structure
interface DateInfo {
  color: string;
  categoryId: string; // Links date to specific category
}
```

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

### Context Provider Architecture

**Strict Nesting Order** (from `App.tsx`):
```tsx
<WebSocketProvider>      // Outermost: Socket.IO connection management
  <CategoryProvider>     // Middle: Calendar categories and date associations
    <SessionProvider>    // Innermost: Session persistence and URL routing
      <Layout/>
    </SessionProvider>
  </CategoryProvider>
</WebSocketProvider>
```

**Context Dependencies**: Each inner context can use outer contexts via hooks:
- `SessionProvider` uses `useCategories()` and `useWebSocket()`
- `CategoryProvider` has no dependencies (pure state management)

### State Update Pattern

When modifying calendar state:

1. **Local Update**: Update local React state in appropriate context
2. **WebSocket Broadcast**: Call `broadcastStateChange(sessionId, state)` from WebSocketContext
3. **Auto-Save**: Backend receives `state-change` event and auto-saves to JSON file
4. **Sync Others**: Other clients receive `state-update` event and apply changes

**Critical Data Flow**: State changes trigger dual persistence:
- HTTP API calls for explicit saves (`POST /api/sessions`)
- WebSocket `state-change` events for real-time sync and auto-save

**State Structure**: All contexts serialize state as:
```tsx
interface SessionState {
  foregroundCategories: Category[];
  dateInfoMap: [string, DateInfoEntry][]; // Serialized as array of tuples
  timestamp: string; // ISO timestamp
}
```

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

## Backend Implementation Notes

### WebSocket Event Flow

- Client joins session → `socket.join(sessionId)` creates Socket.IO room
- State changes → `state-change` event triggers auto-save and broadcasts to room
- Real-time sync → `state-update` events sent to all clients except sender
- File persistence → JSON files in `data/sessions/` with UUID filenames

### CORS & Environment Configuration  

- **Development**: Auto-includes `localhost:5173` and `localhost:3000`
- **Production**: Requires `ALLOWED_ORIGINS` or `MINICALEN_HOST` environment variables
- **Caddy Proxy**: Special WebSocket routing for `/socket.io/*` paths
- **SSL Support**: Optional HTTPS with certificate validation (`USE_HTTPS=true`)
