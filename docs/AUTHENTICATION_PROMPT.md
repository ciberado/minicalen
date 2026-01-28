# MiniCalen Authentication Implementation Plan

You are an expert TypeScript developer implementing authentication for **MiniCalen**, a real-time collaborative calendar application. Add SQLite support using **Drizzle ORM + better-sqlite3** with **BetterAuth integration** for user authentication and session ownership.

## Project Architecture Overview

MiniCalen is an npm workspace monorepo with:
- **Frontend**: `packages/frontend/` - React 18 + TypeScript + Vite + Material-UI
- **Backend**: `packages/server/` - Express.js + Socket.IO + file-based session storage
- **Current State Management**: React Context providers (WebSocket, Category, Session)
- **Real-time Sync**: Socket.IO for collaborative features
- **Session Storage**: JSON files in `packages/server/data/sessions/` (UUID-based)

### Current Context Architecture (Frontend)
```tsx
<WebSocketProvider>      // Socket.IO connection management
  <CategoryProvider>     // Calendar categories (foreground/background/tag)
    <SessionProvider>    // Session persistence and URL routing
      <Layout/>
    </SessionProvider>
  </CategoryProvider>
</WebSocketProvider>
```

### Current Session State Structure
```tsx
interface SessionState {
  foregroundCategories: Category[];
  dateInfoMap: [string, DateInfoEntry][]; // Date-to-category mappings
  timestamp: string;
}
```

## Authentication Requirements

### Core Objectives
1. **User Authentication**: Email/password auth with BetterAuth
2. **Session Ownership**: Link calendar sessions to authenticated users
3. **Access Control**: Private sessions (owner only) vs shared sessions (collaborative)
4. **Migration Path**: Convert existing anonymous sessions to user-owned sessions
5. **Real-time Auth**: Integrate auth with existing Socket.IO collaborative features
6. **Type Safety**: Full end-to-end TypeScript types for User/Session/Calendar data

### Technical Stack
- **Database**: SQLite with Drizzle ORM + better-sqlite3
- **Auth**: BetterAuth with Drizzle adapter
- **Location**: Backend only (`packages/server/`)
- **Migration**: Drizzle Kit for schema management

## 📁 File Structure (Backend Package)

```
packages/server/
├── package.json                    # Add Drizzle + BetterAuth deps
├── tsconfig.json                   # Ensure ESM support
├── drizzle.config.ts              # NEW: Migration configuration
├── data/
│   ├── sessions/                  # EXISTING: JSON session files (migrate to DB)
│   └── drizzle.db                 # NEW: SQLite database
├── src/
│   ├── index.ts                   # MODIFY: Add auth routes & middleware
│   ├── logger.ts                  # EXISTING: Winston logger
│   ├── db/
│   │   ├── index.ts              # NEW: Database connection
│   │   └── schema/
│   │       ├── index.ts          # NEW: Merged schema (app + auth)
│   │       ├── users.ts          # NEW: BetterAuth tables
│   │       ├── sessions.ts       # NEW: Calendar session ownership
│   │       └── categories.ts     # NEW: Persistent category storage
│   ├── auth/
│   │   ├── index.ts              # NEW: BetterAuth configuration
│   │   └── middleware.ts         # NEW: Express auth middleware
│   └── routes/
│       ├── auth.ts               # NEW: /api/auth/* endpoints
│       ├── sessions.ts           # REFACTOR: Add ownership checks
│       └── migrate.ts            # NEW: /api/migrate endpoint
```

## Implementation Phases

### Phase 1: Database Setup & Schema Design

**1.1 Install Dependencies**
```bash
npm install --workspace=@minicalen/server \
  drizzle-orm better-sqlite3 \
  better-auth @better-auth/drizzle-adapter \
  @types/better-sqlite3 drizzle-kit
```

**1.2 Schema Design** (`src/db/schema/`)

**users.ts** - BetterAuth tables (generated + customized):
```ts
// Generate with: npx @better-auth/cli generate
// Then customize with userId as primary key for session ownership
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }),
  name: text("name"),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id),
  expiresAt: integer("expiresAt", { mode: "timestamp" }),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent")
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  expiresAt: integer("expiresAt", { mode: "timestamp" })
});
```

**sessions.ts** - Calendar session ownership:
```ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { user } from "./users";

export const calendarSession = sqliteTable("calendar_session", {
  id: text("id").primaryKey(), // UUID from existing system
  ownerId: text("owner_id").notNull().references(() => user.id),
  name: text("name"),
  isPublic: integer("is_public", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  state: text("state", { mode: "json" }).$type<SessionState>() // Store current state
});

export const sessionCollaborator = sqliteTable("session_collaborator", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => calendarSession.id),
  userId: text("user_id").notNull().references(() => user.id),
  permission: text("permission").notNull().default("edit"), // 'view' | 'edit'
  addedAt: integer("added_at", { mode: "timestamp" }).notNull()
});
```

**categories.ts** - Persistent category storage:
```ts
export const category = sqliteTable("category", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => calendarSession.id),
  name: text("name").notNull(),
  color: text("color").notNull(),
  type: text("type").notNull(), // 'foreground' | 'background' | 'tag'
  createdAt: integer("created_at", { mode: "timestamp" }).notNull()
});

export const dateInfo = sqliteTable("date_info", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => calendarSession.id),
  dateString: text("date_string").notNull(), // "2026-01-28"
  categoryId: text("category_id").notNull().references(() => category.id),
  color: text("color").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull()
});
```

**index.ts** - Merged schema:
```ts
export * from "./users";
export * from "./sessions";
export * from "./categories";
```

**1.3 Configuration Files**

**drizzle.config.ts**:
```ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  driver: "better-sqlite",
  dbCredentials: {
    url: "./data/drizzle.db"
  }
} satisfies Config;
```

**1.4 Database Connection** (`src/db/index.ts`):
```ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database("./data/drizzle.db");
export const db = drizzle(sqlite, { schema });
```

**1.5 Migration Commands** (add to `package.json`):
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate:sqlite",
    "db:push": "drizzle-kit push:sqlite",
    "db:studio": "drizzle-kit studio"
  }
}
```

### Phase 2: BetterAuth Integration

**2.1 Auth Configuration** (`src/auth/index.ts`):
```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "../db";
import * as schema from "../db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account
    }
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false // Enable later with email service
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24 // Update session every 24 hours
  }
});
```

**2.2 Auth Middleware** (`src/auth/middleware.ts`):
```ts
import { Request, Response, NextFunction } from "express";
import { auth } from "./index";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: req.headers });
  
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  req.user = session.user;
  req.session = session.session;
  next();
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: req.headers });
  
  if (session) {
    req.user = session.user;
    req.session = session.session;
  }
  
  next();
}
```

**2.3 Auth Routes** (`src/routes/auth.ts`):
```ts
import { Router } from "express";
import { auth } from "../auth";

export const authRouter = Router();

// BetterAuth handles all auth endpoints
authRouter.all("/*", async (req, res) => {
  return auth.handler(req, res);
});
```

**2.4 Type Declarations** (add to `src/types/express.d.ts`):
```ts
import { User, Session } from "../db/schema";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: Session;
    }
  }
}
```

### Phase 3: Backend Integration

**3.1 Update Server Index** (`src/index.ts`):

**Changes needed**:
- Add auth routes: `app.use('/api/auth', authRouter)`
- Add auth middleware to protected session endpoints
- Update session CRUD to include ownership checks
- Integrate auth with Socket.IO connections (verify user identity)

**Socket.IO Auth Integration**:
```ts
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (token) {
    try {
      const session = await auth.api.verifyToken({ token });
      socket.data.user = session.user;
    } catch (err) {
      // Allow anonymous connections for backward compatibility
    }
  }
  
  next();
});
```

**3.2 Refactor Session API** (`src/routes/sessions.ts`):

**Add ownership checks**:
```ts
// GET /api/sessions/:id - Check if user owns or has access
router.get("/:id", optionalAuth, async (req, res) => {
  const session = await db.query.calendarSession.findFirst({
    where: eq(calendarSession.id, req.params.id),
    with: { collaborators: true }
  });
  
  if (!session) return res.status(404).json({ error: "Not found" });
  
  // Check access: owner, collaborator, or public
  const hasAccess = 
    session.isPublic ||
    session.ownerId === req.user?.id ||
    session.collaborators.some(c => c.userId === req.user?.id);
  
  if (!hasAccess) return res.status(403).json({ error: "Forbidden" });
  
  res.json(session);
});

// POST /api/sessions - Create owned session
router.post("/", requireAuth, async (req, res) => {
  const sessionId = uuidv4();
  
  const [newSession] = await db.insert(calendarSession).values({
    id: sessionId,
    ownerId: req.user!.id,
    name: req.body.name || "Untitled Calendar",
    state: req.body.state || { foregroundCategories: [], dateInfoMap: [] },
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();
  
  res.json(newSession);
});
```

**3.3 Migration Endpoint** (`src/routes/migrate.ts`):
```ts
import { Router } from "express";
import { readdir, readFile } from "fs/promises";
import { db } from "../db";
import { calendarSession } from "../db/schema";
import { requireAuth } from "../auth/middleware";

export const migrateRouter = Router();

// POST /api/migrate/sessions - Claim existing anonymous sessions
migrateRouter.post("/sessions", requireAuth, async (req, res) => {
  const { sessionIds } = req.body; // Array of session UUIDs to claim
  
  const migrated = [];
  
  for (const sessionId of sessionIds) {
    const filePath = `./data/sessions/${sessionId}.json`;
    
    try {
      const fileData = await readFile(filePath, "utf-8");
      const state = JSON.parse(fileData);
      
      // Create DB record with current user as owner
      await db.insert(calendarSession).values({
        id: sessionId,
        ownerId: req.user!.id,
        name: `Migrated Session`,
        state,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      migrated.push(sessionId);
    } catch (err) {
      console.error(`Failed to migrate ${sessionId}:`, err);
    }
  }
  
  res.json({ migrated, count: migrated.length });
});
```

### Phase 4: Frontend Integration

**4.1 Add Auth Context** (`packages/frontend/src/components/AuthContext.tsx`):
```tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { createAuthClient } from "better-auth/client";

const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001"
});

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Check for existing session
    authClient.session.get().then(session => {
      setUser(session?.user || null);
      setIsLoading(false);
    });
  }, []);
  
  const signIn = async (email: string, password: string) => {
    const { data } = await authClient.signIn.email({ email, password });
    setUser(data.user);
  };
  
  const signUp = async (email: string, password: string, name?: string) => {
    const { data } = await authClient.signUp.email({ email, password, name });
    setUser(data.user);
  };
  
  const signOut = async () => {
    await authClient.signOut();
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
```

**4.2 Add Routing** (`packages/frontend/src/App.tsx` or router config):

**Required Routes**:
- `/` - Home page (redirects to last session or shows welcome)
- `/sessions` - Session list page (shows `SessionList` component)
- `/session/:id` - Calendar view (existing, shows current session)
- `/login` - Optional dedicated login page (or use dialog)

**Example Router Setup** (if using React Router):
```tsx
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/sessions" element={<SessionListPage />} />
  <Route path="/session/:id" element={<CalendarPage />} />
</Routes>
```

**Navigation Flow**:
- User clicks "My Calendars" in header → Navigate to `/sessions`
- User clicks calendar in list → Navigate to `/session/{id}`
- User creates new calendar → Redirects to `/session/{newId}`

**4.3 Update App.tsx Context Nesting**:
```tsx
<AuthProvider>               // NEW: Outermost
  <WebSocketProvider>        
    <CategoryProvider>
      <SessionProvider>
        <Layout/>
```

**4.3 Add Login/Signup UI** (`packages/frontend/src/components/AuthDialog.tsx`):

**Purpose**: Modal dialog for user authentication with email/password

**Features**:
- Tabbed interface switching between "Sign In" and "Sign Up"
- Input fields: Email (required), Password (required), Name (optional for signup)
- Context-aware messaging ("reason" prop: e.g., "Sign in to save your calendar")
- Loading state during authentication (CircularProgress in submit button)
- Error display using Material-UI Alert component
- Optional "Continue as Guest" button for anonymous sessions
- Warning text: "Guest sessions are temporary..."
- Form validation (email format, required fields, 8-char minimum password)

**Props**:
- `open: boolean` - Dialog visibility
- `onClose: () => void` - Close handler
- **Removed**: `onContinueAsGuest` prop (not needed - users are already anonymous)
- `mode?: "signin" | "signup"` - Initial tab selection
- `reason?: string` - Contextual message (optional, can be omitted for subtle approach)

**Behavior**:
- Simple, clean two-tab interface
- No warnings or pressure about anonymous usage
- Only appears when user explicitly clicks "Sign In"
- Can be closed at any time without consequence
- **Removed**: "Continue as Guest" button and warning text

**4.4 Add Session Management UI** (`packages/frontend/src/components/SessionList.tsx`):

**Purpose**: Display and manage user's calendar sessions (full page component at `/sessions` route)

**Features**:
- Fetches and displays all sessions (owned + shared with user)
- **Each list item shows:**
  - Calendar icon
  - Session name
  - Creation date
  - Public/Private indicator (chip with icon)
  - Collaborator count badge (if > 0)
  - Three-dot menu (owners only)
- Context menu actions (owner only):
  - Rename session
  - Share session (opens ShareDialog)
  - Delete session (with confirmation)
- Clickable rows navigate to `/session/{id}`
- Fetches sessions from `/api/sessions` with auth header

**Data Structure**:
```typescript
interface CalendarSession {
  id: string;
  name: string;
  ownerId: string;
  isPublic: boolean;
  createdAt: string;
  collaboratorCount?: number;
  role?: "owner" | "edit" | "view";
}
```

**Dialogs**:
- Rename Dialog: Simple text input with Cancel/Rename buttons
- Share Dialog: Opens `ShareDialog` component (see 4.5)

**Empty State**: "No calendars yet" with "Create Calendar" button
      headers: { Authorization: `Bearer ${getAuthToken()}` }
    });
    setSessions(await response.json());
  };
  
  const handleMenuOpen = (e: React.MouseEvent, session: CalendarSession) => {
    e.stopPropagation();
    setSelectedSession(session);
    setMenuAnchor(e.currentTarget as HTMLElement);
  };
  
  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedSession(null);
  };
  
  const handleRename = async () => {
    if (!selectedSession || !newName) return;
    
    await fetch(`/api/sessions/${selectedSession.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ name: newName })
    });
    
    setRenameDialogOpen(false);
    fetchSessions();
  };
  
  const handleDelete = async () => {
    if (!selectedSession) return;
    
    if (confirm(`Delete "${selectedSession.name}"?`)) {
      await fetch(`/api/sessions/${selectedSession.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      
      handleMenuClose();
      fetchSessions();
    }
  };
  
  return (
    <Box>
      <Typography variant="h6" sx={{ p: 2 }}>
        My Calendars
      </Typography>
      
      <List>
        {sessions.map((session) => (
          <ListItem
            key={session.id}
            disablePadding
            secondaryAction={
              session.role === "owner" && (
                <IconButton
                  edge="end"
                  onClick={(e) => handleMenuOpen(e, session)}
                >
                  <MoreVert />
                </IconButton>
              )
            }
          >
            <ListItemButton href={`/session/${session.id}`}>
              <ListItemIcon>
                <CalendarMonth />
              </ListItemIcon>
              <ListItemText
                primary={session.name}
                secondary={new Date(session.createdAt).toLocaleDateString()}
              />
              <Box sx={{ display: "flex", gap: 0.5 }}>
                {session.isPublic ? (
                  <Chip icon={<Public />} label="Public" size="small" />
                ) : (
                  <Chip icon={<Lock />} label="Private" size="small" />
                )}
                {session.collaboratorCount > 0 && (
                  <Chip
                    icon={<People />}
                    label={session.collaboratorCount}
                    size="small"
                  />
                )}
              </Box>
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      {/* Context Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={() => {
          setNewName(selectedSession?.name || "");
          setRenameDialogOpen(true);
          handleMenuClose();
        }}>
          <Edit sx={{ mr: 1 }} /> Rename
        </MenuItem>
        <MenuItem onClick={() => {
          setShareDialogOpen(true);
          handleMenuClose();
        }}>
          <ShareIcon sx={{ mr: 1 }} /> Share
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <Delete sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>
      
      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)}>
        <DialogTitle>Rename Calendar</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Calendar name"
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRename} variant="contained">Rename</Button>
        </DialogActions>
      </Dialog>
      
      {/* Share Dialog - Component below */}
    </Box>
  );
}
```

**4.5 Add Collaboration UI** (`packages/frontend/src/components/ShareDialog.tsx`):

**Purpose**: Manage session sharing and collaborators

**Props**:
- `open: boolean` - Dialog visibility
- `onClose: () => void` - Close handler
- `sessionId: string` - Session to share
- `sessionName: string` - Display in dialog title
- `isPublic: boolean` - Current public status

**Sections**:

1. **Public Access Toggle**
   - Switch: "Anyone with the link can view"
   - When enabled: Show readonly URL field + Copy button
   - Copy button shows "Copied!" feedback for 2 seconds
   - Updates via PATCH `/api/sessions/{id}` with `{isPublic: boolean}`

2. **Invite People**
   - Email input field (type="email")
   - Permission dropdown (View/Edit)
   - "Add" button (disabled if email empty)
   - Error alert for invalid emails or existing collaborators
   - POST to `/api/sessions/{id}/collaborators` with `{email, permission}`

3. **Collaborator List**
   - Header: "People with access (X)"
   - Each row shows:
     - Name (or email if no name)
     - Email as secondary text
     - Permission dropdown (View/Edit) - updates on change
     - Delete icon button
   - Permission change: PATCH `/api/sessions/{id}/collaborators/{collabId}`
   - Remove: DELETE `/api/sessions/{id}/collaborators/{collabId}`

**Data Structure**:
```typescript
interface Collaborator {
  id: string;
  userId: string;
  email: string;
  name?: string;
  permission: "view" | "edit";
}
```

**4.6 Update SessionProvider** (`packages/frontend/src/components/SessionContext.tsx`):
**4.6 Update SessionProvider** (`packages/frontend/src/components/SessionContext.tsx`):

**New State Variables**:
- `canEdit: boolean` - Whether user can modify this session
- `sessionRole: "owner" | "edit" | "view" | "anonymous"` - User's role for current session
- `showAuthDialog: boolean` - Control AuthDialog visibility
- `showClaimDialog: boolean` - Control claim dialog visibility

**New Methods**:

1. **checkSessionAccess()** - Called on mount and when user changes
   - Fetches GET `/api/sessions/{id}/access` with auth header
   - Sets `sessionRole` and `canEdit` based on response
   - If user is logged in and session is anonymous → show claim dialog **once, dismissible**
   - Respects localStorage dismissal flag

2. **handleCreateSession()** - Override existing method
   - **Changed**: Always creates session (anonymous if no user)
   - **Removed**: No auth dialog on create
   - If no user → Create anonymous session (works like today)
   - If user → POST to `/api/sessions` with auth (owned session)
   - No interruption either way

3. **handleClaimSession()** - Claim anonymous session (optional)
   - POST to `/api/migrate/sessions` with `{sessionIds: [sessionId]}`
   - On success: Update role to "owner", close dialog
   - On dismiss: Store in localStorage, don't show again

**Context Additions**:
- Export `canEdit` for components to disable edit buttons
- Export `sessionRole` for UI indicators
- Export `showAuthDialog()` method for triggering auth prompt

**Embedded Dialogs**:
1. **AuthDialog** - Shown only when user clicks "Sign In" button
   - **Removed**: "Continue as Guest" option (redundant - they're already using it)
   - Clean, simple email/password form
   - No pressure or warnings about anonymous usage
   
2. **Claim Dialog** - Subtle, one-time, fully optional
   - Only shows once per browser after first login
   - Can be permanently dismissed
   - Small dialog (not full-screen)
   - Title: "Save your current calendar?"
   - Message: "You have an unsaved calendar. Would you like to add it to your account?"
   - Buttons: "No thanks" (default) / "Save" (secondary)
   - If dismissed: Never show again for this session
   - Store dismissal in localStorage: `minicalen-claim-dismissed-{sessionId}`

**4.7 Add Access Control Banner** (`packages/frontend/src/components/AccessBanner.tsx`):

**Purpose**: Subtle, dismissible indicator of user's access level

**Behavior** (reads `sessionRole` and `canEdit` from SessionContext):

- **Owner** → No banner (full access assumed)

- **Anonymous + Not logged in** → **Subtle, Dismissible Info Banner** (NOT warning)
  - Severity: `info` (not warning - less alarming)
  - Only shows after 3+ edit actions OR 5+ minutes of use
  - Message: "💡 **Tip:** Sign in to access this calendar from any device"
  - Dismissible with X button
  - Stores dismissal in localStorage (don't show again for 7 days)
  - **Placement**: Collapsible, appears below toolbar (not blocking)
  
- **View-only access** (`canEdit = false`) → Info Alert
  - Severity: `info`
  - Icon: Visibility
  - Message: "You have **view-only** access to this calendar"
  - Chip: "Read Only" with Lock icon
  
- **Edit collaborator** (`sessionRole = "edit"`) → Success Alert
  - Severity: `success`
  - Icon: Edit
  - Message: "You can edit this shared calendar"

**Implementation Notes**:
- Track user activity to delay anonymous banner (don't show immediately)
- LocalStorage key: `minicalen-anonymous-banner-dismissed`
- Only show banner once per week maximum for anonymous users
- Never block or interrupt workflow

**4.8 Update Layout** (`packages/frontend/src/components/Layout.tsx`):

**Changes to Top Bar**:

**When User Logged In**:
- Replace any existing auth UI with **Avatar Button**:
  - Shows first letter of name or email
  - 32x32px circular avatar
  - Clicking opens dropdown menu

**User Menu** (Material-UI Menu component):
- **Email** (disabled menu item) - Shows user.email with Person icon
- **My Calendars** - Navigates to `/sessions` route to show SessionList component
- **Divider**
- **Sign Out** - Calls `signOut()` from AuthContext with Logout icon

**Navigation Behavior**:
- When user clicks "My Calendars" → Router navigates to `/sessions`
- SessionList fetches all user's calendars and displays them
- User clicks a calendar → Router navigates to `/session/{id}`
- Calendar page loads with session data and appropriate permissions

**When User Not Logged In**:
- Show **subtle "Sign In" text button** (not prominent, not colored)
  - Small, text-only button (no background)
  - Uses `secondary` or `inherit` color (not primary)
  - Position: Top-right, same size as other text elements
  - No visual prominence - blends with interface
  - Opens AuthDialog on click

**Design Philosophy**:
- Auth UI should be **discoverable but not intrusive**
- Anonymous users shouldn't feel pressured or blocked
- Sign-in option visible but subtle (like GitHub's approach)
- No prominent CTAs, no colored buttons, no banners on load

**Layout Structure**:
```
┌─────────────────────────────────┐
│  Top Bar (MiniCalen | Avatar)   │ ← Existing, add avatar
├─────────────────────────────────┤
│  <AccessBanner />               │ ← NEW: Insert here
├─────────────────────────────────┤
│  {children} (Calendar content)  │ ← Existing
└─────────────────────────────────┘
```

**Key Imports**:
- `useAuth` hook for user state
- `Avatar`, `Menu`, `MenuItem`, `ListItemIcon` from MUI
- `AccessBanner` component

## UI/UX Design Guidelines

### Visual Design Principles
- **Material-UI Theme**: Use existing theme from `packages/frontend/src/theme.ts`
- **Color Consistency**: Auth buttons use `primary` color, destructive actions use `error`
- **Spacing**: Follow 8px grid system (Material-UI default)
- **Typography**: Use Material-UI typography variants (`h6`, `body1`, `body2`, `caption`)

### Component States

**Loading States**:
- Show `CircularProgress` in buttons during async operations
- Disable form inputs while loading
- Use skeleton loaders for lists

**Error States**:
- Display errors with `Alert` component (`severity="error"`)
- Show field-level errors below inputs using `helperText`
- Provide clear error messages (e.g., "Email already exists")

**Empty States**:
- "No calendars yet" with "Create Calendar" CTA button
- "No collaborators" in share dialog
- Empty state illustrations optional (Material-UI icons sufficient)

### User Flows

**New User Flow (Anonymous)**:
1. Visit site → Shows calendar immediately (no auth prompt)
2. Use app normally → Full functionality available
3. Create/edit calendar → Works exactly as today (anonymous session)
4. Small, subtle "Sign in" link in header (not prominent)
5. **If user tries to access multi-device or after 30+ days**: Subtle banner appears
   - "Sign in to access this calendar from any device"
   - Dismissible with X button
   - Shows again after 3 more sessions (not every time)

**New User Flow (Authenticated)**:
1. User **chooses** to sign in (clicks subtle header link)
2. Auth dialog appears with "Sign Up" tab selected
3. After signup → Returns to calendar (now owned session)
4. Existing anonymous session offered for claiming (one-time, dismissible prompt)

**Returning User Flow**:
1. Visit site (`/`) → Auto-signin from stored session (BetterAuth cookie)
2. Header shows user avatar with "My Calendars" menu option
3. Click "My Calendars" → Navigate to `/sessions` route
4. See `SessionList` component with all owned and shared calendars
5. Each calendar shows: name, date, public/private badge, collaborator count
6. Click any calendar row → Navigate to `/session/{id}` to open calendar
7. Calendar loads with appropriate permissions (owner/edit/view)

**Claiming Anonymous Session**:
1. User creates guest session
2. Later signs in/up
3. Dialog auto-appears: "Save this calendar?"
4. Click "Save" → Session claimed, banner disappears

**Sharing Flow**:
1. Owner clicks "Share" button (top toolbar)
2. Share dialog opens
3. Toggle public access → Copy link appears
4. Add collaborator by email → Select permission
5. Collaborator receives email (Phase 2) with link
6. Collaborator clicks link → Opens calendar with appropriate access

### Responsive Design

**Desktop (≥960px)**:
- Sidebar (240px) + Main content
- Full dialogs (600px max width)
- Session list in sidebar

**Tablet (600-960px)**:
- Collapsible sidebar with menu icon
- Full dialogs
- Compact session list

**Mobile (<600px)**:
- Bottom navigation
- Full-screen dialogs
- Stacked layout for forms
- Touch-friendly buttons (48px min height)

### Accessibility

**Keyboard Navigation**:
- All interactive elements tabbable
- Enter submits forms
- Escape closes dialogs
- Arrow keys navigate lists

**Screen Readers**:
- Proper ARIA labels on all inputs
- Dialog titles announced
- Error messages linked to inputs
- Status messages for async operations

**Visual**:
- Minimum 4.5:1 contrast ratio
- Focus indicators visible
- No color-only indicators (use icons too)

### Micro-interactions

**Animations** (use Material-UI transitions):
- Dialog fade in/out (200ms)
- Button hover effects
- Chip appearance on add
- Snackbar for confirmations

**Feedback**:
- "Copied!" → "Copy" button text change
- Success snackbar after save
- Error shake on invalid input
- Disabled state for readonly controls

### Performance Considerations

- Lazy load `SessionList` component
- Debounce email input validation
- Virtual scrolling for large collaborator lists (Phase 2)
- Optimistic UI updates (update locally before API confirm)

### Mobile-Specific UX

**Touch Targets**:
- Minimum 48x48px buttons
- Increased padding in lists
- Swipe gestures for menu (optional)

**Input Optimization**:
- `type="email"` for email keyboard
- `type="password"` for secure input
- `autocomplete` attributes for form filling

**Dialog Behavior**:
- Full-screen on mobile
- Bottom sheet style (optional enhancement)
- Smooth slide-up animation

### Internationalization (i18n) Preparation

While not implemented in Phase 1, structure code for future i18n:
- Extract all UI strings to constants
- Use template strings for dynamic text
- Avoid hardcoded English in error messages
- Use locale-aware date/time formatting

```tsx
// Example: Prepare for i18n
const STRINGS = {
  AUTH_DIALOG_TITLE: "Sign in to save your calendar",
  AUTH_SIGNIN_TAB: "Sign In",
  AUTH_SIGNUP_TAB: "Sign Up",
  // ... more strings
};
```

### Phase 5: Access Control & Collaboration

**5.1 Add Collaborator API Routes** (`src/routes/sessions.ts`):

**Required Endpoints**:

1. **GET `/api/sessions`** - List user's sessions (for SessionList page)
   - Returns: `CalendarSession[]` with role and collaboratorCount
   - Middleware: `requireAuth`
   - Query: Join `calendarSession` (where ownerId = userId) UNION `sessionCollaborator` (where userId = userId)
   - Each session includes: `{ id, name, ownerId, isPublic, createdAt, role: "owner"|"edit"|"view", collaboratorCount }`
   - Used by: SessionList component to display all accessible calendars

2. **GET `/api/sessions/:id/access`** - Check user's access level
   - Returns: `{ role: "owner" | "edit" | "view" | "anonymous", canEdit: boolean }`
   - Middleware: `optionalAuth`
   - Used by frontend to determine UI permissions

3. **PATCH `/api/sessions/:id`** - Update session (rename, toggle public)
   - Body: `{ name?: string, isPublic?: boolean }`
   - Middleware: `requireAuth`
   - Verify: User is owner

4. **DELETE `/api/sessions/:id`** - Delete session
   - Middleware: `requireAuth`
   - Verify: User is owner
   - Cascade: Delete collaborators, categories, dateInfo

5. **GET `/api/sessions/:id/collaborators`** - List collaborators
   - Returns: `Collaborator[]` with user details
   - Middleware: `optionalAuth`
   - Access: Owner or collaborator

6. **POST `/api/sessions/:id/collaborators`** - Add collaborator
   - Body: `{ email: string, permission: "view" | "edit" }`
   - Middleware: `requireAuth`
   - Verify: User is owner
   - Lookup: Find user by email (error if not found)

7. **PATCH `/api/sessions/:id/collaborators/:collabId`** - Change permission
   - Body: `{ permission: "view" | "edit" }`
   - Middleware: `requireAuth`
   - Verify: User is owner

8. **DELETE `/api/sessions/:id/collaborators/:collabId`** - Remove collaborator
   - Middleware: `requireAuth`
   - Verify: User is owner

**5.2 Session Sharing UI**:
- Add "Share" button to calendar toolbar (visible to owner only)
- Button opens `ShareDialog` component
- Conditionally show based on `sessionRole === "owner"` from context

**5.3 Socket.IO Authorization**:
```ts
socket.on("state-change", async (sessionId, state) => {
  // Verify user has edit permission
  const session = await db.query.calendarSession.findFirst({
    where: eq(calendarSession.id, sessionId),
    with: { collaborators: true }
  });
  
  const userId = socket.data.user?.id;
  const hasEditAccess = 
    session.ownerId === userId ||
    session.collaborators.some(c => c.userId === userId && c.permission === "edit");
  
  if (!hasEditAccess) {
    socket.emit("error", { message: "No edit permission" });
    return;
  }
  
  // Proceed with state update...
});
```

**5.3 Socket.IO Authorization**:
```ts
socket.on("state-change", async (sessionId, state) => {
  // Verify user has edit permission
  const session = await db.query.calendarSession.findFirst({
    where: eq(calendarSession.id, sessionId),
    with: { collaborators: true }
  });
  
  const userId = socket.data.user?.id;
  const hasEditAccess = 
    session.ownerId === userId ||
    session.collaborators.some(c => c.userId === userId && c.permission === "edit");
  
  if (!hasEditAccess) {
    socket.emit("error", { message: "No edit permission" });
    return;
  }
  
  // Proceed with state update...
});
```

**5.4 Real-time Permission Updates**:

When permissions change, notify affected users via Socket.IO:
```ts
// After updating collaborator permission
io.to(sessionId).emit("permission-changed", { 
  userId: collaborator.userId, 
  newPermission: "view" 
});

// After removing collaborator
io.to(sessionId).emit("access-revoked", { 
  userId: collaborator.userId 
});
```

**Frontend handling**:
- Listen for `permission-changed` → Update local `canEdit` state
- Listen for `access-revoked` → Redirect to session list with notification

**5.5 UI Access Control**:
- Disable all edit buttons/inputs when `canEdit === false`
- Grey out category add/edit/delete controls
- Make calendar dates non-clickable for view-only users
- Show read-only banner at top
- Display collaborator list in sidebar (owner view) or dialog

## Frontend File Structure

```
packages/frontend/src/
├── pages/                        # NEW: Page-level components
│   ├── HomePage.tsx             # NEW: Landing/redirect page
│   ├── SessionListPage.tsx      # NEW: Renders SessionList at /sessions
│   └── CalendarPage.tsx         # MODIFY: Existing calendar view
├── components/
│   ├── AuthContext.tsx           # NEW: Auth state management
│   ├── AuthDialog.tsx            # NEW: Login/signup modal
│   ├── SessionList.tsx           # NEW: Calendar list component
│   ├── ShareDialog.tsx           # NEW: Collaboration UI
│   ├── AccessBanner.tsx          # NEW: Permission indicator
│   ├── SessionContext.tsx        # MODIFY: Add auth integration
│   ├── Layout.tsx                # MODIFY: Add user menu
│   ├── Calendar.tsx              # MODIFY: Respect canEdit flag
│   ├── Categories.tsx            # MODIFY: Respect canEdit flag
│   ├── WebSocketContext.tsx     # MODIFY: Send auth token
│   └── ... (existing components)
```

## API Endpoints Summary

### Authentication (BetterAuth)
- `POST /api/auth/sign-up` - Create account
- `POST /api/auth/sign-in` - Login
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/session` - Get current session

### Sessions
- `GET /api/sessions` - List user's sessions
- `GET /api/sessions/:id` - Get session details
- `GET /api/sessions/:id/access` - Check access level
- `POST /api/sessions` - Create new session (auth required)
- `PATCH /api/sessions/:id` - Update session (owner only)
- `DELETE /api/sessions/:id` - Delete session (owner only)

### Collaborators
- `GET /api/sessions/:id/collaborators` - List collaborators
- `POST /api/sessions/:id/collaborators` - Add collaborator (owner only)
- `PATCH /api/sessions/:id/collaborators/:collabId` - Update permission (owner only)
- `DELETE /api/sessions/:id/collaborators/:collabId` - Remove collaborator (owner only)

### Migration
- `POST /api/migrate/sessions` - Claim anonymous sessions (auth required)

### Socket.IO Events
- `state-change` - Update calendar state (edit permission required)
- `state-update` - Broadcast state to collaborators
- `permission-changed` - Notify user of permission change
- `access-revoked` - Notify user of access removal
- `error` - Send error messages to client

## Security Considerations

### Password Security
- BetterAuth handles password hashing (bcrypt by default)
- Minimum password length: 8 characters (enforce in frontend + backend)
- Consider adding password strength requirements (Phase 2)

### Session Security
- HTTP-only cookies for auth tokens (BetterAuth default)
- CSRF protection via SameSite cookies
- Session expiration: 7 days with refresh
- Secure cookies in production (`sameSite: 'strict'`, `secure: true`)

### API Security
- All authenticated routes require valid session token
- Ownership verification on all write operations
- SQL injection prevention via Drizzle parameterized queries
- Rate limiting on auth endpoints (Phase 2)

### Access Control
- Never trust client-side permissions - always verify on server
- Socket.IO events verify edit permission before state changes
- Public sessions have read-only access unless user is collaborator
- Collaborator list only visible to owner and existing collaborators

### Data Privacy
- Users can only see sessions they own or are invited to
- Email addresses only visible to session owner (in collaborator list)
- Session state not exposed in API unless user has access

## Error Handling

### Backend Error Responses

**Standard Format**:
```ts
{ error: string, code?: string, details?: any }
```

**HTTP Status Codes**:
- `400` - Bad request (validation errors)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found (session/collaborator doesn't exist)
- `409` - Conflict (email already exists, already a collaborator)
- `500` - Internal server error

**Example Error Handling**:
```ts
// In routes/sessions.ts
try {
  // ... operation
} catch (err) {
  logger.error("Failed to add collaborator", { sessionId, email, error: err });
  
  if (err.code === "SQLITE_CONSTRAINT") {
    return res.status(409).json({ error: "User is already a collaborator" });
  }
  
  res.status(500).json({ error: "Failed to add collaborator" });
}
```

### Frontend Error Handling

**Auth Errors**:
- Invalid credentials → Show error in dialog: "Invalid email or password"
- Email already exists → "An account with this email already exists"
- Network error → "Connection failed. Please try again."

**Session Errors**:
- 404 on session load → Redirect to session list with message: "Session not found"
- 403 on session access → "You don't have permission to access this calendar"
- Claim fails → Show snackbar: "Failed to save calendar. Please try again."

**Real-time Errors**:
- Socket disconnect → Show reconnecting indicator
- Permission denied on state change → Show alert: "You no longer have edit access"
- Access revoked event → Redirect with message: "Your access has been removed"

### Logging Strategy

**Backend Logging** (use existing Winston logger):
- Auth events: Login, logout, signup, failures
- Session operations: Create, update, delete, access checks
- Collaborator changes: Add, remove, permission updates
- Real-time events: Connection, state changes, errors
- Security events: Unauthorized access attempts, permission violations

**Log Levels**:
- `error` - Auth failures, permission violations, database errors
- `warn` - Failed access attempts, suspicious activity
- `info` - Successful auth, session CRUD, collaborator changes
- `debug` - Socket.IO events, state synchronization

## Testing Strategy

### Unit Tests

**Backend**:
- Auth middleware functions (`requireAuth`, `optionalAuth`)
- Session ownership verification logic
- Collaborator permission checks
- Migration functions (JSON to DB)

**Frontend**:
- Auth context methods (signIn, signUp, signOut)
- Session context permission logic
- Access banner rendering conditions
- Form validation logic

### Integration Tests

**API Tests**:
- Full auth flow (signup → signin → access protected route)
- Session CRUD with ownership verification
- Collaborator management (add → change permission → remove)
- Migration endpoint with mock JSON files

**Socket.IO Tests**:
- Auth token verification on connection
- Permission enforcement on state-change events
- Real-time permission update broadcasts
- Access revocation handling

### E2E Tests

**Critical Paths**:
1. **New User Journey**: Signup → Create session → Edit calendar → Share → Logout
2. **Collaboration**: Owner shares → Collaborator receives → View/Edit based on permission
3. **Migration**: Anonymous session → Signup → Claim session → Verify ownership
4. **Access Control**: Owner removes collaborator → Collaborator sees access revoked
5. **Multi-device**: Edit on device A → See changes on device B in real-time

### Manual Testing Checklist

- [ ] Create account with valid/invalid inputs
- [ ] Login with correct/incorrect credentials
- [ ] Create calendar while logged in/out
- [ ] Claim anonymous session after signup
- [ ] Share calendar and verify email lookup
- [ ] Test view-only vs edit permissions
- [ ] Toggle public access and test unauthenticated access
- [ ] Remove collaborator and verify access revoked
- [ ] Test real-time sync with multiple browsers
- [ ] Verify session persistence across page reloads
- [ ] Test logout clears auth state
- [ ] Verify responsive design on mobile/tablet/desktop

## Deployment Considerations

### Database Backups

**SQLite File Location**: `packages/server/data/drizzle.db`

**Backup Strategy**:
- Schedule regular backups (daily recommended)
- Use SQLite's `.backup` command or copy file while server stopped
- Store backups in separate location (S3, cloud storage)
- Test restoration procedure

**Backup Script**:
```bash
#!/bin/bash
DB_PATH="./data/drizzle.db"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

sqlite3 $DB_PATH ".backup $BACKUP_DIR/drizzle_$DATE.db"
```

### Migration Deployment

**Steps for Production**:
1. **Pre-deployment**: Backup existing database
2. **Deploy**: Update server code with new routes and schema
3. **Run migrations**: `npm run db:push --workspace=@minicalen/server`
4. **Verify**: Check database schema with `npm run db:studio`
5. **Monitor**: Watch logs for migration errors
6. **Rollback plan**: Keep previous version ready

**Zero-downtime Migration**:
- Phase 1: Deploy with auth optional (backward compatible)
- Phase 2: Encourage users to sign up (banners, prompts)
- Phase 3: Require auth for new sessions (allow existing anonymous)
- Phase 4: Grace period for claiming anonymous sessions
- Phase 5: Archive/delete unclaimed sessions

### Environment Configuration

**Production Environment Variables**:
```bash
# Backend (.env)
DATABASE_URL=/app/data/drizzle.db
BETTER_AUTH_SECRET=<use-strong-32-byte-secret>
BETTER_AUTH_URL=https://minicalen.example.com
NODE_ENV=production
ALLOWED_ORIGINS=https://minicalen.example.com

# Frontend (build-time)
VITE_API_URL=https://minicalen.example.com
VITE_WS_URL=wss://minicalen.example.com
```

**Docker Volumes**:
```yaml
volumes:
  - ./data:/app/data  # Persist database
  - ./logs:/app/logs  # Persist logs
```

### Monitoring

**Key Metrics**:
- Active user sessions (auth tokens)
- Failed login attempts (security)
- API response times (performance)
- Database size (growth tracking)
- Socket.IO connections (concurrent users)

**Alerts**:
- High rate of failed auth attempts (potential attack)
- Database errors (corruption, disk space)
- Socket.IO disconnect rate spikes
- API error rate threshold exceeded

## Phase 2: Future Enhancements

### Email Verification
- Enable `requireEmailVerification: true` in BetterAuth config
- Set up email service (SendGrid, AWS SES, Resend)
- Add email templates for verification, welcome, password reset
- Update UI to show "Verify your email" banner

### OAuth Providers
- Add Google OAuth: `google: { enabled: true, clientId, clientSecret }`
- Add GitHub OAuth for developer users
- Update AuthDialog to show "Sign in with Google/GitHub" buttons

### Advanced Permissions
- Add "Admin" role (can add/remove other admins)
- Session-level permissions (create categories, delete, export)
- Permission templates ("Can edit categories but not dates")

### Notifications
- Email notifications for collaboration invites
- In-app notifications for permission changes
- Desktop notifications for real-time updates (Phase 3)

### Audit Log
- Track all session changes with user attribution
- Display activity feed in session settings
- Export audit log for compliance

### Rate Limiting
- Implement rate limiting on auth endpoints (10 requests/minute)
- API rate limits per user (100 requests/minute)
- WebSocket message throttling

### Data Export
- Export session data as JSON/CSV/iCal
- Import calendar data from other formats
- Bulk session operations

## Migration Strategy

### UX Philosophy: Anonymous-First Experience

**Core Principle**: Anonymous users should experience the app **exactly as it works today** with zero friction or auth prompts on arrival.

**Design Guidelines**:
1. **No Auth Walls**: Never block features or show dialogs on first visit
2. **Subtle Sign-In**: Auth UI should be minimal (small button in header)
3. **Contextual Prompts**: Only suggest auth when user initiates save/persist action
4. **Dismissible Suggestions**: All auth prompts can be closed/ignored
5. **Feature Parity**: Anonymous users get full functionality (just not persisted)

### For Existing Sessions
1. **Backward Compatibility**: Anonymous sessions work identically to current behavior
2. **No Breaking Changes**: Existing functionality remains unchanged for non-authenticated users
3. **Opt-In Auth**: Authentication is a benefit, not a requirement
4. **Claim Flow**: Logged-in users can claim anonymous sessions via subtle UI (not forced)
5. **UI Prompt**: Small, dismissible banner "Sign in to save your calendar" (not blocking dialog)
6. **Gradual Rollout**: 
   - Phase 1 = auth optional, invisible to anonymous users
   - Phase 2 = gentle encouragement (dismissible banners)
   - Phase 3 = sessions expire after 30 days for anonymous users (with warning)
   - Phase 4 = authenticated sessions become default (but anonymous still works)

### Database Migration Steps
1. Run `npm run db:generate --workspace=@minicalen/server`
2. Run `npm run db:push --workspace=@minicalen/server`
3. Deploy backend with migration endpoint
4. Provide UI for users to claim existing sessions
5. After grace period, mark unclaimed sessions for deletion

## Testing Checklist

### Backend
- [ ] User signup/signin works (`POST /api/auth/sign-up`, `/api/auth/sign-in`)
- [ ] Session creation with ownership (`POST /api/sessions`)
- [ ] Ownership checks on session access (`GET /api/sessions/:id`)
- [ ] Collaborator addition (`POST /api/sessions/:id/collaborators`)
- [ ] Socket.IO auth integration (token verification)
- [ ] Anonymous session migration (`POST /api/migrate/sessions`)

### Frontend
- [ ] Login dialog shows when needed
- [ ] Auth token sent with WebSocket connection
- [ ] Session list shows only owned/shared sessions
- [ ] Claim button appears for anonymous sessions
- [ ] Edit controls disabled for view-only access
- [ ] Sign out clears local state

### Integration
- [ ] Real-time sync works with multiple authenticated users
- [ ] Permission changes reflected immediately
- [ ] Offline users can't edit protected sessions
- [ ] Public sessions accessible without auth

## Environment Variables

**Backend** (`packages/server/.env`):
```bash
DATABASE_URL=./data/drizzle.db
BETTER_AUTH_SECRET=<generate-with-openssl-rand-hex-32>
BETTER_AUTH_URL=http://localhost:3001
```

**Frontend** (`packages/frontend/.env`):
```bash
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## Success Criteria

✅ **Database**: SQLite + Drizzle with full type inference  
✅ **Auth**: BetterAuth email/password working  
✅ **Ownership**: Calendar sessions linked to users  
✅ **Access Control**: Owner/collaborator/public permissions enforced  
✅ **Real-time**: Socket.IO auth integrated  
✅ **Migration**: Existing sessions can be claimed  
✅ **UI**: Login/signup flow with Material-UI  
✅ **Backward Compatible**: Anonymous usage still works  
✅ **Type Safety**: End-to-end TypeScript types (User, Session, CalendarSession)  
✅ **Zero Runtime Errors**: All auth flows tested

## One-Line Setup

```bash
cd packages/server && npm install drizzle-orm better-sqlite3 better-auth @better-auth/drizzle-adapter @types/better-sqlite3 drizzle-kit && npx @better-auth/cli generate && npm run db:push
```

## Quick Test Snippet

```ts
// Test user creation + session ownership
const user = await auth.api.signUp.email({
  email: "test@example.com",
  password: "password123"
});

const session = await db.insert(calendarSession).values({
  id: uuidv4(),
  ownerId: user.user.id,
  name: "My Calendar",
  state: { foregroundCategories: [], dateInfoMap: [] },
  createdAt: new Date(),
  updatedAt: new Date()
}).returning();

console.log("Session created:", session[0].id, "owned by:", user.user.email);
``` 
