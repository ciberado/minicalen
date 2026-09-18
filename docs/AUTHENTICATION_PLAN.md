# MiniCalen Authentication Implementation Plan

**Status**: ✅ Core implementation shipped in v1.5.0 (branch `feat/lists`); this document
is retained as a historical design record.  
**Started**: January 28, 2026  
**Target**: v1.5.0 (released on `feat/lists`; not yet merged to `main`)

> **Reality check:** the shipped implementation diverges from parts of this plan. It uses
> `POST /api/sessions/:id/share` (by email) rather than the collaborators endpoints
> described below, stores calendar state as a JSON blob on `sessions.state` rather than in
> the `categories`/`date_info` tables, and leaves several planned items (public access
> toggle, rename UI, `AccessBanner`, permission-changed socket events, automated tests)
> unimplemented. See `AGENTS.md` section 7 for the authoritative list of gaps.

## Overview

Adding user authentication to MiniCalen with SQLite + Drizzle ORM + BetterAuth. Maintains anonymous-first UX where existing functionality works without auth, but enables multi-device access and collaboration for authenticated users.

### Core Objectives
- [x] Define authentication architecture
- [x] Database setup with Drizzle ORM
- [x] BetterAuth integration
- [x] Backend API routes (core CRUD + share + claim)
- [x] Frontend authentication UI
- [~] Real-time permission system (edit check only; no permission-change events)
- [ ] Testing and deployment (manual `curl` verification only)

---

## Phase 1: Database Setup & Schema Design

**Status**: ⚪ Not Started  
**Estimated Time**: 2-4 hours

### Tasks

#### 1.1 Install Dependencies
- [ ] Install Drizzle ORM packages
  ```bash
  npm install --workspace=@minicalen/server \
    drizzle-orm better-sqlite3 \
    better-auth @better-auth/drizzle-adapter \
    @types/better-sqlite3 drizzle-kit
  ```
- [ ] Verify package installations
- [ ] Check for dependency conflicts

#### 1.2 Database Schema Design
- [ ] Create `src/db/schema/users.ts` - BetterAuth user tables
  - [ ] Run `npx @better-auth/cli generate` to get initial schema
  - [ ] Customize user table with additional fields if needed
  - [ ] Add `session` table for auth sessions
  - [ ] Add `account` table for OAuth providers (future)
- [ ] Create `src/db/schema/sessions.ts` - Calendar session ownership
  - [ ] `calendarSession` table with owner reference
  - [ ] `sessionCollaborator` table for sharing
  - [ ] Foreign key constraints
- [ ] Create `src/db/schema/categories.ts` - Persistent categories
  - [ ] `category` table linked to sessions
  - [ ] `dateInfo` table for date-category mappings
- [ ] Create `src/db/schema/index.ts` - Export all schemas

#### 1.3 Database Configuration
- [ ] Create `drizzle.config.ts` at server root
  - [ ] Configure SQLite driver
  - [ ] Set schema path
  - [ ] Set output directory for migrations
- [ ] Create `src/db/index.ts` - Database connection
  - [ ] Initialize better-sqlite3
  - [ ] Create Drizzle instance
  - [ ] Export typed db object

#### 1.4 Migration Setup
- [ ] Add migration scripts to `package.json`
  - [ ] `db:generate` - Generate migration files
  - [ ] `db:push` - Push schema to database
  - [ ] `db:studio` - Open Drizzle Studio
- [ ] Create initial migration
  - [ ] Run `npm run db:generate --workspace=@minicalen/server`
  - [ ] Review generated SQL
- [ ] Apply migration
  - [ ] Run `npm run db:push --workspace=@minicalen/server`
  - [ ] Verify database file created at `data/drizzle.db`

### Verification
- [ ] Database file exists at `packages/server/data/drizzle.db`
- [ ] Can open database with `npm run db:studio`
- [ ] All tables created correctly
- [ ] Foreign key relationships working

---

## Phase 2: BetterAuth Integration

**Status**: ⚪ Not Started  
**Estimated Time**: 2-3 hours

### Tasks

#### 2.1 Auth Configuration
- [ ] Create `src/auth/index.ts`
  - [ ] Import BetterAuth
  - [ ] Configure Drizzle adapter
  - [ ] Enable email/password auth
  - [ ] Set session expiration (7 days)
  - [ ] Disable email verification initially
- [ ] Configure environment variables
  - [ ] Add `BETTER_AUTH_SECRET` to `.env`
  - [ ] Add `BETTER_AUTH_URL` to `.env`
  - [ ] Generate secret with `openssl rand -hex 32`

#### 2.2 Auth Middleware
- [ ] Create `src/auth/middleware.ts`
  - [ ] Implement `requireAuth()` middleware
  - [ ] Implement `optionalAuth()` middleware
  - [ ] Handle missing/invalid sessions
- [ ] Create TypeScript declarations
  - [ ] Create `src/types/express.d.ts`
  - [ ] Extend Express Request with `user` and `session`

#### 2.3 Auth Routes
- [ ] Create `src/routes/auth.ts`
  - [ ] Set up BetterAuth handler for all `/api/auth/*` routes
  - [ ] Export router
- [ ] Update `src/index.ts`
  - [ ] Import and mount auth router
  - [ ] Add route: `app.use('/api/auth', authRouter)`

### Verification
- [ ] Can signup: `POST /api/auth/sign-up` with email/password
- [ ] Can signin: `POST /api/auth/sign-in` with credentials
- [ ] Session cookie is set
- [ ] Can get session: `GET /api/auth/session`
- [ ] Middleware correctly identifies authenticated users

---

## Phase 3: Backend Integration

**Status**: ⚪ Not Started  
**Estimated Time**: 4-6 hours

### Tasks

#### 3.1 Update Server Index
- [ ] Add auth imports to `src/index.ts`
- [ ] Mount auth routes
- [ ] Add Socket.IO auth middleware
  - [ ] Extract token from handshake
  - [ ] Verify token with BetterAuth
  - [ ] Attach user to socket.data
  - [ ] Allow anonymous connections (backward compatibility)

#### 3.2 Refactor Session API
- [ ] Create `src/routes/sessions.ts` (or update existing)
- [ ] Implement `GET /api/sessions` - List user's sessions
  - [ ] Add `requireAuth` middleware
  - [ ] Query owned and collaborated sessions
  - [ ] Return with role and collaborator count
- [ ] Implement `GET /api/sessions/:id` - Get session details
  - [ ] Add `optionalAuth` middleware
  - [ ] Check ownership/collaboration/public access
  - [ ] Return 403 if no access
- [ ] Implement `GET /api/sessions/:id/access` - Check access level
  - [ ] Add `optionalAuth` middleware
  - [ ] Return role and canEdit flag
- [ ] Implement `POST /api/sessions` - Create session
  - [ ] Add `requireAuth` middleware
  - [ ] Create with owner reference
  - [ ] Generate UUID
  - [ ] Return new session
- [ ] Implement `PATCH /api/sessions/:id` - Update session
  - [ ] Add `requireAuth` middleware
  - [ ] Verify ownership
  - [ ] Support name and isPublic updates
- [ ] Implement `DELETE /api/sessions/:id` - Delete session
  - [ ] Add `requireAuth` middleware
  - [ ] Verify ownership
  - [ ] Cascade delete collaborators/categories/dateInfo

#### 3.3 Collaborator Management Routes
- [ ] Implement `GET /api/sessions/:id/collaborators`
  - [ ] List all collaborators with user details
  - [ ] Verify requestor is owner or collaborator
- [ ] Implement `POST /api/sessions/:id/collaborators`
  - [ ] Add collaborator by email
  - [ ] Verify requestor is owner
  - [ ] Look up user by email
  - [ ] Set permission level
- [ ] Implement `PATCH /api/sessions/:id/collaborators/:collabId`
  - [ ] Update collaborator permission
  - [ ] Verify requestor is owner
- [ ] Implement `DELETE /api/sessions/:id/collaborators/:collabId`
  - [ ] Remove collaborator
  - [ ] Verify requestor is owner
  - [ ] Emit Socket.IO event for access revocation

#### 3.4 Migration Endpoint
- [ ] Create `src/routes/migrate.ts`
- [ ] Implement `POST /api/migrate/sessions`
  - [ ] Add `requireAuth` middleware
  - [ ] Accept array of session IDs
  - [ ] Read JSON files
  - [ ] Create database records with current user as owner
  - [ ] Return migration results

#### 3.5 Socket.IO Authorization
- [ ] Update `state-change` event handler
  - [ ] Fetch session from database
  - [ ] Verify user has edit permission
  - [ ] Return error if no permission
- [ ] Add `permission-changed` event emitter
  - [ ] Emit when collaborator permission updated
- [ ] Add `access-revoked` event emitter
  - [ ] Emit when collaborator removed

### Verification
- [ ] All API endpoints respond correctly
- [ ] Ownership checks prevent unauthorized access
- [ ] Socket.IO enforces edit permissions
- [ ] Migration endpoint claims anonymous sessions
- [ ] Real-time events propagate permission changes

---

## Phase 4: Frontend Integration

**Status**: ⚪ Not Started  
**Estimated Time**: 6-8 hours

### Tasks

#### 4.1 Auth Context
- [ ] Create `packages/frontend/src/components/AuthContext.tsx`
  - [ ] Import BetterAuth client
  - [ ] Create AuthContext and Provider
  - [ ] Implement `signIn()` method
  - [ ] Implement `signUp()` method
  - [ ] Implement `signOut()` method
  - [ ] Check for existing session on mount
  - [ ] Export `useAuth()` hook

#### 4.2 Routing Setup
- [ ] Add routing to `App.tsx` (or create router file)
  - [ ] `/` - Home page
  - [ ] `/sessions` - Session list page
  - [ ] `/session/:id` - Calendar view
- [ ] Create page components
  - [ ] `HomePage.tsx` - Landing/redirect
  - [ ] `SessionListPage.tsx` - Wrapper for SessionList
  - [ ] Update calendar page to use `:id` param

#### 4.3 Update App Context Nesting
- [ ] Wrap app with `AuthProvider` (outermost)
- [ ] Verify context order:
  ```tsx
  <AuthProvider>
    <WebSocketProvider>
      <CategoryProvider>
        <SessionProvider>
  ```

#### 4.4 AuthDialog Component
- [ ] Create `packages/frontend/src/components/AuthDialog.tsx`
  - [ ] Two-tab interface (Sign In / Sign Up)
  - [ ] Email and password fields
  - [ ] Optional name field for signup
  - [ ] Loading state with CircularProgress
  - [ ] Error display with Alert
  - [ ] Form validation
  - [ ] **No "Continue as Guest" button**
  - [ ] **No warning messages**
- [ ] Style with Material-UI
  - [ ] Max width: 600px
  - [ ] Clean, simple design
  - [ ] Proper spacing

#### 4.5 SessionList Component
- [ ] Create `packages/frontend/src/components/SessionList.tsx`
  - [ ] Fetch sessions from `/api/sessions`
  - [ ] Display list with Material-UI List
  - [ ] Show name, date, public/private badge, collaborator count
  - [ ] Three-dot menu for owners
  - [ ] Context menu: Rename, Share, Delete
  - [ ] Click row to navigate to session
- [ ] Create rename dialog
  - [ ] Simple text input
  - [ ] Cancel/Rename buttons
- [ ] Create delete confirmation
  - [ ] Use window.confirm or Dialog

#### 4.6 ShareDialog Component
- [ ] Create `packages/frontend/src/components/ShareDialog.tsx`
  - [ ] Public access toggle switch
  - [ ] Copy link button (with "Copied!" feedback)
  - [ ] Email input for inviting collaborators
  - [ ] Permission dropdown (View/Edit)
  - [ ] Add button
  - [ ] Collaborator list with permissions
  - [ ] Change permission dropdown for each
  - [ ] Remove collaborator button
  - [ ] Error handling for invalid emails

#### 4.7 AccessBanner Component
- [ ] Create `packages/frontend/src/components/AccessBanner.tsx`
  - [ ] Read `sessionRole` and `canEdit` from context
  - [ ] Show nothing for owners
  - [ ] **For anonymous users:**
    - [ ] Track user activity (edits, time)
    - [ ] Show banner only after 3+ edits OR 5+ minutes
    - [ ] Info severity (not warning)
    - [ ] Message: "💡 Tip: Sign in to access this calendar from any device"
    - [ ] Dismissible with X button
    - [ ] Store dismissal in localStorage
    - [ ] Don't show again for 7 days if dismissed
  - [ ] Show view-only banner for read-only collaborators
  - [ ] Show edit collaborator banner

#### 4.8 Update SessionProvider
- [ ] Add auth integration
  - [ ] Import `useAuth` hook
  - [ ] Add `canEdit` state
  - [ ] Add `sessionRole` state
  - [ ] Add `showClaimDialog` state
- [ ] Implement `checkSessionAccess()`
  - [ ] Fetch from `/api/sessions/:id/access`
  - [ ] Update local state
  - [ ] Show claim dialog if logged in + anonymous session
  - [ ] Respect localStorage dismissal
- [ ] Update `handleCreateSession()`
  - [ ] **Create anonymous session if not logged in**
  - [ ] Create owned session if logged in
  - [ ] No auth dialog interruption
- [ ] Implement `handleClaimSession()`
  - [ ] POST to `/api/migrate/sessions`
  - [ ] Update role to owner
  - [ ] Close dialog
  - [ ] Store dismissal in localStorage
- [ ] Export `canEdit` and `sessionRole` in context
- [ ] Add claim dialog JSX
  - [ ] Title: "Save your current calendar?"
  - [ ] Message: Brief, friendly
  - [ ] "No thanks" (default) / "Save"
  - [ ] Small, non-intrusive

#### 4.9 Update Layout Component
- [ ] Add user menu for authenticated users
  - [ ] Avatar with first letter of name/email
  - [ ] Dropdown menu on click
  - [ ] Show email (disabled item)
  - [ ] "My Calendars" → Navigate to `/sessions`
  - [ ] Divider
  - [ ] "Sign Out"
- [ ] Add **subtle** Sign In button for anonymous users
  - [ ] Text button (no background)
  - [ ] Secondary or inherit color
  - [ ] Small, blends with UI
  - [ ] Top-right position
- [ ] Add AccessBanner below header

#### 4.10 Update Calendar and Categories
- [ ] Update `Calendar.tsx`
  - [ ] Read `canEdit` from SessionContext
  - [ ] Disable date clicks when `canEdit === false`
  - [ ] Grey out UI for read-only
- [ ] Update `Categories.tsx`
  - [ ] Read `canEdit` from SessionContext
  - [ ] Disable add/edit/delete buttons
  - [ ] Show disabled state visually

#### 4.11 Update WebSocketContext
- [ ] Send auth token with Socket.IO connection
  - [ ] Get token from BetterAuth client
  - [ ] Add to `socket.handshake.auth`
- [ ] Listen for permission events
  - [ ] `permission-changed` → Update local `canEdit`
  - [ ] `access-revoked` → Redirect to `/sessions` with notification

### Verification
- [ ] Can sign up new account
- [ ] Can sign in with existing account
- [ ] Sessions list loads correctly
- [ ] Can navigate between sessions
- [ ] Share dialog works (add/remove/change permissions)
- [ ] Access banner shows appropriately
- [ ] Anonymous users can use app without interruption
- [ ] Auth UI is subtle and non-intrusive
- [ ] Real-time permission changes propagate

---

## Phase 5: Access Control & Collaboration

**Status**: ⚪ Not Started  
**Estimated Time**: 2-3 hours

### Tasks

#### 5.1 Real-time Permission Updates
- [ ] Backend: Emit Socket.IO events on permission changes
- [ ] Frontend: Handle permission-changed event
- [ ] Frontend: Handle access-revoked event
- [ ] Test with multiple browsers/users

#### 5.2 UI Access Control
- [ ] Verify all edit buttons disabled for view-only
- [ ] Verify calendar dates non-clickable for view-only
- [ ] Verify category controls disabled for view-only
- [ ] Add visual indicators (grey out, cursor changes)

#### 5.3 Share Button in Toolbar
- [ ] Add "Share" button to calendar toolbar
- [ ] Show only when `sessionRole === "owner"`
- [ ] Opens ShareDialog on click
- [ ] Position appropriately in UI

### Verification
- [ ] Owner can share sessions
- [ ] Collaborators receive correct permissions
- [ ] View-only users cannot edit
- [ ] Edit collaborators can edit
- [ ] Permission changes reflected in real-time
- [ ] Removed collaborators lose access immediately

---

## Testing

**Status**: ⚪ Not Started

### Manual Testing Checklist

#### Authentication Flow
- [ ] Sign up with valid email/password
- [ ] Sign up with invalid inputs (see errors)
- [ ] Sign in with correct credentials
- [ ] Sign in with incorrect credentials (see error)
- [ ] Sign out clears session
- [ ] Session persists across page reload
- [ ] Session expires after 7 days

#### Anonymous User Experience
- [ ] Can use app immediately without auth
- [ ] Can create calendar without interruption
- [ ] Can edit calendar without interruption
- [ ] Sign In button is subtle and non-intrusive
- [ ] No banners or prompts on first visit
- [ ] Banner appears only after activity threshold
- [ ] Banner is dismissible and doesn't reappear

#### Session Management
- [ ] Can view list of owned sessions
- [ ] Can view list of shared sessions
- [ ] Can create new session
- [ ] Can rename session (owner only)
- [ ] Can delete session (owner only)
- [ ] Can navigate between sessions
- [ ] Session state persists

#### Collaboration
- [ ] Can share session (owner only)
- [ ] Can toggle public access
- [ ] Can copy public link
- [ ] Can add collaborator by email
- [ ] Can set view/edit permission
- [ ] Can change collaborator permission
- [ ] Can remove collaborator
- [ ] Collaborator receives correct access level

#### Real-time Synchronization
- [ ] Multiple users can edit same session
- [ ] Changes sync in real-time
- [ ] Permission changes sync immediately
- [ ] Removed collaborator gets access-revoked event
- [ ] View-only collaborator cannot edit
- [ ] Socket.IO connection maintains auth

#### Migration
- [ ] Can claim anonymous session after login
- [ ] Claim dialog is dismissible
- [ ] Claimed session shows in session list
- [ ] Claimed session has correct ownership

#### Edge Cases
- [ ] Public session accessible without auth
- [ ] Cannot access private session without permission
- [ ] Cannot edit view-only session
- [ ] Cannot modify session as non-owner
- [ ] Invalid collaborator email shows error
- [ ] Duplicate collaborator shows error

### Automated Testing (Future)
- [ ] Unit tests for auth middleware
- [ ] Unit tests for permission logic
- [ ] Integration tests for API endpoints
- [ ] E2E tests for critical paths

---

## Deployment

**Status**: ⚪ Not Started

### Pre-Deployment Checklist
- [ ] Backup existing database
- [ ] Set production environment variables
  - [ ] `BETTER_AUTH_SECRET` (strong 32-byte secret)
  - [ ] `BETTER_AUTH_URL` (production URL)
  - [ ] `DATABASE_URL` (if different)
  - [ ] `NODE_ENV=production`
  - [ ] `ALLOWED_ORIGINS`
- [ ] Build frontend with production config
  - [ ] `VITE_API_URL`
  - [ ] `VITE_WS_URL`
- [ ] Review CORS settings
- [ ] Test SSL/HTTPS configuration

### Deployment Steps
- [ ] Deploy backend with new code
- [ ] Run database migrations
  - [ ] `npm run db:push --workspace=@minicalen/server`
- [ ] Verify database schema
  - [ ] Check with `npm run db:studio`
- [ ] Deploy frontend
- [ ] Test production deployment
  - [ ] Signup/signin works
  - [ ] Session creation works
  - [ ] Collaboration works
  - [ ] WebSocket connections work (wss://)
- [ ] Monitor logs for errors
- [ ] Set up database backup schedule

### Rollback Plan
- [ ] Keep previous version deployable
- [ ] Document rollback procedure
- [ ] Test rollback in staging

---

## Documentation

### To Document
- [ ] Update README with auth features
- [ ] Document API endpoints
- [ ] Document environment variables
- [ ] Add deployment guide
- [ ] Create user guide for collaboration
- [ ] Document database schema
- [ ] Add troubleshooting section

---

## Future Enhancements (Phase 2)

**Status**: ⚪ Not Started (Future)

### Planned Features
- [ ] Email verification
- [ ] Password reset flow
- [ ] OAuth providers (Google, GitHub)
- [ ] Email notifications for collaboration
- [ ] In-app notifications
- [ ] Advanced permissions (admin role)
- [ ] Audit log
- [ ] Rate limiting
- [ ] Data export (JSON, CSV, iCal)

---

## Notes

### Decisions Made
- Anonymous-first UX to maintain current app experience
- SQLite for simplicity (can migrate to PostgreSQL later)
- BetterAuth for modern auth experience
- Drizzle ORM for type safety
- Subtle auth UI (no interruption for anonymous users)

### Open Questions
- [ ] Session expiration policy for anonymous sessions?
- [ ] Email service for notifications (Phase 2)?
- [ ] Rate limiting thresholds?
- [ ] Database backup retention policy?

### Issues Encountered
_(Track issues here as they arise)_

---

**Last Updated**: January 28, 2026
