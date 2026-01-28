# MiniCalen Authentication Testing Results

## Test Summary

All authentication and permission tests passed successfully on 2026-01-28.

## Test Users Created

- **test@example.com** (Owner) - ID: `Tsc1wLNOTWq23SpXsqNYjfN0UkXHlmVR`
- **viewer@example.com** (Viewer) - ID: `GOLXkV8b5QdnU4IY0Fr8ZpT1ORLoT9Or`
- **editor@example.com** (Editor) - ID: `2bR0x9BHp3e2EBzXBwNfODSj9yvloZtd`
- **claimer@example.com** (Claim Test) - ID: `SZaxuzTjXVZNF429twYp61FNeKTB2ES4`

## Test Scenarios

### 1. Anonymous User Flow ✅

**Test**: Create session without authentication
```bash
curl -X POST http://localhost:3001/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name":"Anonymous Calendar","state":{"foregroundCategories":[],"dateInfoMap":[]}}'
```

**Result**: 
- Session created successfully with `isAnonymous: true`
- Session ID: `4f7b4e61-aaca-40aa-9786-7ebd7eb26338`
- `userId` is `null` for anonymous sessions

### 2. Authenticated User Flow ✅

**Test**: Sign up and create session
```bash
# Sign up
curl -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -c /tmp/test-auth.txt \
  -d '{"email":"test@example.com","password":"SecurePassword123!","name":"Test User"}'

# Create session
curl -X POST http://localhost:3001/api/sessions \
  -H "Content-Type: application/json" \
  -b /tmp/test-auth.txt \
  -d '{"name":"Authenticated Calendar","state":{"foregroundCategories":[],"dateInfoMap":[]}}'
```

**Result**:
- User created with ID: `Tsc1wLNOTWq23SpXsqNYjfN0UkXHlmVR`
- Session created with `isAnonymous: false`
- Session ID: `1e9408e4-79e0-4aa5-9561-86f0b419c791`
- Session linked to user via `userId` field

### 3. Session Listing ✅

**Test**: List sessions for authenticated user
```bash
curl http://localhost:3001/api/sessions -b /tmp/test-auth.txt
```

**Result**:
- Returns array with user's sessions
- Each session includes `accessLevel` field
- Owned sessions show `accessLevel: "owner"`

### 4. Session Sharing - Viewer Access ✅

**Test**: Share session with viewer permissions
```bash
curl -X POST http://localhost:3001/api/sessions/1e9408e4-79e0-4aa5-9561-86f0b419c791/share \
  -H "Content-Type: application/json" \
  -b /tmp/test-auth.txt \
  -d '{"email":"viewer@example.com","accessLevel":"viewer"}'
```

**Result**:
- Sharing succeeded: `{"success": true}`
- Viewer sees session in their list with `accessLevel: "viewer"`
- Viewer can read session data
- **Viewer CANNOT modify** - PUT request returns `{"error": "Access denied"}`

### 5. Session Sharing - Editor Access ✅

**Test**: Share session with editor permissions
```bash
curl -X POST http://localhost:3001/api/sessions/1e9408e4-79e0-4aa5-9561-86f0b419c791/share \
  -H "Content-Type: application/json" \
  -b /tmp/test-auth.txt \
  -d '{"email":"editor@example.com","accessLevel":"editor"}'
```

**Result**:
- Sharing succeeded
- Editor can modify session content (PUT request succeeds)
- **Editor CANNOT share** session - returns `{"error": "Only owner can share session"}`
- Session name successfully changed from "Updated by Owner" to "Modified by Editor"

### 6. Owner Permissions ✅

**Test**: Verify owner has full control
```bash
curl -X PUT http://localhost:3001/api/sessions/1e9408e4-79e0-4aa5-9561-86f0b419c791 \
  -H "Content-Type: application/json" \
  -b /tmp/test-auth.txt \
  -d '{"name":"Updated by Owner","state":{"foregroundCategories":[],"dateInfoMap":[]}}'
```

**Result**:
- Owner can modify session ✅
- Owner can share session ✅
- Session updated successfully with new name and state

### 7. Session Claim Functionality ✅

**Test**: Anonymous user claims session after signing in
```bash
# Create anonymous session
SESSION_ID=$(curl -X POST http://localhost:3001/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name":"Anonymous Calendar","state":{}}' | jq -r '.session.id')

# Sign up new user
curl -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -c /tmp/claimer-auth.txt \
  -d '{"email":"claimer@example.com","password":"SecurePassword123!","name":"Claimer User"}'

# Claim the session
curl -X POST http://localhost:3001/api/sessions/$SESSION_ID/claim \
  -b /tmp/claimer-auth.txt
```

**Result**:
- Session claimed successfully
- `isAnonymous` changed from `true` to `false`
- `userId` changed from `null` to `SZaxuzTjXVZNF429twYp61FNeKTB2ES4`
- User now owns the session and can share it

### 8. Error Handling ✅

**Test**: Share with non-existent user
```bash
curl -X POST http://localhost:3001/api/sessions/1e9408e4-79e0-4aa5-9561-86f0b419c791/share \
  -H "Content-Type: application/json" \
  -b /tmp/test-auth.txt \
  -d '{"email":"nonexistent@example.com","accessLevel":"viewer"}'
```

**Result**:
- Returns proper error: `{"error": "User not found"}`
- Session remains unmodified

### 9. Legacy Session Migration ✅

**Test**: Migrate file-based sessions to database
```bash
# Check migration status
curl -X POST http://localhost:3001/api/migrate/legacy-sessions \
  -H "Content-Type: application/json" \
  -d '{"dryRun":true}'

# Execute migration
curl -X POST http://localhost:3001/api/migrate/legacy-sessions \
  -H "Content-Type: application/json" \
  -d '{"dryRun":false}'
```

**Result**:
- Dry run: 14 sessions ready for migration
- Actual migration: 0 migrated, 14 skipped (already in database)
- All legacy sessions successfully preserved in database

## Permission Matrix

| Access Level | Read | Modify | Share | Delete |
|-------------|------|--------|-------|--------|
| **Owner**   | ✅   | ✅     | ✅    | ✅     |
| **Editor**  | ✅   | ✅     | ❌    | ❌     |
| **Viewer**  | ✅   | ❌     | ❌    | ❌     |

## WebSocket Integration

The WebSocket layer includes authentication via cookies:
- Frontend: `withCredentials: true` in Socket.IO config
- Backend: `checkSessionAccess()` validates permissions on `state-change` events
- Anonymous users can still modify their own sessions
- Permission errors emitted as `error` events to client

## Database Schema

### Sessions Table
- `id` - UUID primary key
- `userId` - Foreign key to users table (nullable for anonymous)
- `isAnonymous` - Boolean flag
- `name` - Session name
- `state` - JSON blob of calendar state
- `createdAt`, `updatedAt`, `lastAccessedAt` - Timestamps

### Session Permissions Table
- `id` - Auto-increment primary key
- `sessionId` - Foreign key to sessions (cascade delete)
- `userId` - Foreign key to users
- `accessLevel` - Enum: 'viewer', 'editor', 'owner'
- `grantedAt` - Timestamp
- `grantedBy` - User ID who granted permission

## Conclusion

All authentication features are working as designed:
- ✅ Anonymous session creation
- ✅ User registration and authentication
- ✅ Session ownership tracking
- ✅ Permission-based sharing (viewer/editor/owner)
- ✅ Session claiming for anonymous users
- ✅ API permission enforcement
- ✅ WebSocket authentication integration
- ✅ Legacy session migration

The system is ready for Phase 5 deployment.
