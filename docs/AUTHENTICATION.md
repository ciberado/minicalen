# MiniCalen Authentication System

## Overview

MiniCalen now includes a comprehensive authentication system that supports:
- **Anonymous sessions** - Create calendars without signing up
- **User accounts** - Email/password authentication via BetterAuth
- **Session claiming** - Convert anonymous sessions to owned sessions
- **Permission-based sharing** - Share calendars with viewer or editor access
- **Real-time sync** - WebSocket integration with authentication

## Architecture

### Backend Stack
- **BetterAuth** v1.0 - Authentication framework
- **SQLite** - Database (minicalen.db)
- **Drizzle ORM** - Type-safe database queries
- **Socket.IO** - Real-time WebSocket communication
- **Express.js** - HTTP API server

### Frontend Stack
- **better-auth** client - React integration
- **React Context API** - Global state management
- **Material-UI** - UI components
- **Socket.IO client** - WebSocket connection

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  emailVerified INTEGER DEFAULT 0,
  name TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  userId TEXT REFERENCES users(id),
  isAnonymous INTEGER DEFAULT 0,
  name TEXT,
  state TEXT,  -- JSON blob
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  lastAccessedAt INTEGER NOT NULL
);
```

### Session Permissions Table
```sql
CREATE TABLE sessionPermissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sessionId TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  userId TEXT REFERENCES users(id),
  accessLevel TEXT CHECK(accessLevel IN ('viewer', 'editor', 'owner')),
  grantedAt INTEGER NOT NULL,
  grantedBy TEXT REFERENCES users(id)
);
```

## API Endpoints

### Authentication
- `POST /api/auth/sign-up/email` - Create account
- `POST /api/auth/sign-in/email` - Sign in
- `POST /api/auth/sign-out` - Sign out
- `GET /api/auth/get-session` - Get current session

### Sessions
- `GET /api/sessions` - List user's sessions
- `GET /api/sessions/:id` - Get session details
- `POST /api/sessions` - Create session
- `PUT /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session
- `POST /api/sessions/:id/claim` - Claim anonymous session
- `POST /api/sessions/:id/share` - Share session with user

### Migration
- `POST /api/migrate/legacy-sessions` - Migrate file-based sessions

## Permission Levels

### Owner
- Full control over session
- Can read, modify, delete, and share
- Original creator or user who claimed anonymous session

### Editor
- Can read and modify session content
- **Cannot** share or delete session
- Useful for collaborative calendar editing

### Viewer
- Read-only access to session
- **Cannot** modify or share
- Useful for sharing calendars publicly

## Usage Flows

### Anonymous User Flow
1. User visits application
2. Creates calendar without signing in
3. Session stored with `isAnonymous: true` and `userId: null`
4. User can edit their calendar freely
5. **Optional**: User signs up and claims session

### Authenticated User Flow
1. User signs up with email/password
2. Creates calendar - automatically owned
3. Session stored with `isAnonymous: false` and `userId` set
4. User can share calendar with others
5. Shared users see calendar in their session list

### Session Claiming Flow
1. Anonymous user creates calendar
2. User decides to create account
3. User signs up
4. Application calls `/api/sessions/:id/claim`
5. Session ownership transferred to user
6. Session now appears in user's account

### Sharing Flow
1. Owner opens session
2. Clicks "Share Session" button
3. Enters recipient email and access level
4. Backend creates permission entry
5. Recipient sees shared session in their list
6. Real-time updates via WebSocket

## WebSocket Integration

### Authentication
- Frontend sends `withCredentials: true` to include auth cookies
- Backend uses `optionalAuthSocket` middleware
- Extracts user from session cookie automatically

### Permission Validation
```javascript
// Backend checks permissions on state changes
socket.on('state-change', async (data) => {
  const hasAccess = await checkSessionAccess(
    data.sessionId,
    socket.data.user?.id,
    'editor' // Minimum required level
  );
  
  if (!hasAccess) {
    socket.emit('error', { message: 'Access denied' });
    return;
  }
  
  // Save and broadcast state change
});
```

### Anonymous User Handling
- Anonymous users can still join sessions via WebSocket
- Permission checks allow anonymous users to modify their own sessions
- Once user signs in, permissions enforced immediately

## Environment Variables

### Required for Production
```bash
# Database location
DATABASE_URL=file:./data/minicalen.db

# BetterAuth configuration
BETTER_AUTH_SECRET=<random-secret-key>
BETTER_AUTH_URL=https://your-domain.com

# CORS configuration
ALLOWED_ORIGINS=https://your-frontend.com
# OR
MINICALEN_HOST=your-domain.com
```

### Optional
```bash
# SSL/HTTPS mode
USE_HTTPS=true
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem

# Logging
LOG_LEVEL=info
```

## Security Considerations

### Password Security
- Passwords hashed with bcrypt via BetterAuth
- Minimum password requirements enforced client-side
- No password stored in plaintext

### Session Security
- HTTP-only cookies prevent XSS attacks
- Secure flag enabled in production (HTTPS)
- SameSite attribute prevents CSRF

### Permission Enforcement
- Double-checked on API and WebSocket layers
- Database foreign keys ensure referential integrity
- Cascade deletes clean up permissions automatically

### Anonymous Sessions
- No personal data collected
- Can be claimed by any signed-in user with session ID
- Recommend UUID-based session IDs to prevent guessing

## Migration from File-Based Storage

### Automatic Migration
The backend includes a migration endpoint that:
1. Scans `data/sessions/` directory
2. Reads all `.json` session files
3. Creates database entries as anonymous sessions
4. Preserves session IDs, names, and state

### Running Migration
```bash
# Dry run - check what will be migrated
curl -X POST http://localhost:3001/api/migrate/legacy-sessions \
  -H "Content-Type: application/json" \
  -d '{"dryRun":true}'

# Execute migration
curl -X POST http://localhost:3001/api/migrate/legacy-sessions \
  -H "Content-Type: application/json" \
  -d '{"dryRun":false}'
```

### Post-Migration
- Old JSON files remain in place (manual cleanup)
- Sessions marked as `isAnonymous: true`
- Users can claim sessions via `/claim` endpoint

## Development

### Running Locally
```bash
# Install dependencies
npm install

# Start both frontend and backend
npm run dev:all

# Or start separately
npm run dev:server  # Backend on :3001
npm run dev         # Frontend on :5173
```

### Creating Test Users
```bash
# Sign up
curl -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email":"test@example.com",
    "password":"SecurePassword123!",
    "name":"Test User"
  }'

# Sign in
curl -X POST http://localhost:3001/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email":"test@example.com",
    "password":"SecurePassword123!"
  }'

# Use cookies for authenticated requests
curl http://localhost:3001/api/sessions -b cookies.txt
```

## Troubleshooting

### "Access denied" errors
- Check user is signed in: `GET /api/auth/get-session`
- Verify session permissions: `GET /api/sessions/:id`
- Check access level meets requirements (viewer vs editor)

### WebSocket connection issues
- Verify `withCredentials: true` in frontend
- Check CORS configuration includes credentials
- Ensure auth cookies are being sent

### Session claiming not working
- Verify session is anonymous: `isAnonymous: true`
- Check user is authenticated
- Ensure session ID is correct

### Migration failures
- Check `data/sessions/` directory exists
- Verify JSON files are valid
- Check database write permissions
- Review logs for specific errors

## Testing

See [TESTING.md](./TESTING.md) for comprehensive test results including:
- Anonymous user flows
- Authenticated user flows
- Permission enforcement
- Session claiming
- Sharing with different access levels
- Legacy session migration

## Future Enhancements

Potential improvements:
- OAuth providers (Google, GitHub, etc.) via BetterAuth
- Email verification for new accounts
- Password reset functionality
- Session invitation links with expiration
- Activity logs for shared sessions
- Rate limiting on authentication endpoints
- Two-factor authentication support
