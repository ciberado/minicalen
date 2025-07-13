# Winston.js Logging Setup for MiniCalen

This document describes the Winston.js logging setup implemented in both the frontend and backend of the MiniCalen application.

## Server-side Logging (Winston.js)

The server uses Winston.js with the following configuration:

### Features:
- **Multiple log levels**: error, warn, info, http, debug
- **Colored console output** in development
- **File logging**: 
  - `logs/error.log` - Error logs only
  - `logs/combined.log` - All logs
- **JSON format** for file logs
- **Timestamped logs**
- **Environment-based log levels** (debug in development, info in production)

### Usage:
```typescript
import logger from './logger.js';

logger.error('Something went wrong', { error: errorObject });
logger.warn('Warning message');
logger.info('Information message');
logger.debug('Debug information');
```

### Configuration:
Located in `packages/server/src/logger.ts`

### Log Files:
- Logs are stored in `packages/server/logs/`
- Files are automatically created
- Already ignored in `.gitignore`

## Frontend Logging (Custom Browser Logger)

The frontend uses a custom browser-compatible logger that mimics Winston's interface:

### Features:
- **Console-based logging** (browser-compatible)
- **Log levels**: error, warn, info, debug
- **Formatted timestamps**
- **Environment-based filtering** (debug in development, info in production)
- **Consistent API** with server logger

### Usage:
```typescript
import logger from './logger';

logger.error('Something went wrong', errorData);
logger.warn('Warning message');
logger.info('Information message');
logger.debug('Debug information');
```

### Configuration:
Located in `packages/frontend/src/logger.ts`

## Applied Changes

### Server (`packages/server/`)
1. **Installed Winston.js**: `npm install winston`
2. **Created logger configuration**: `src/logger.ts`
3. **Updated all console.log statements** in `src/index.ts` to use appropriate log levels:
   - Errors → `logger.error()`
   - Warnings → `logger.warn()`
   - Info messages → `logger.info()`
   - Debug/connection info → `logger.debug()`

### Frontend (`packages/frontend/`)
1. **Created custom browser logger**: `src/logger.ts`
2. **Updated key components**:
   - `src/App.tsx` - Application initialization logging
   - `src/components/WebSocketContext.tsx` - WebSocket connection logging
   - `src/config/api.ts` - API configuration debugging

## Log Levels

| Level | Server | Frontend | Usage |
|-------|--------|----------|-------|
| error | ✓ | ✓ | Critical errors, exceptions |
| warn  | ✓ | ✓ | Warnings, potential issues |
| info  | ✓ | ✓ | General information, server startup |
| http  | ✓ | ✗ | HTTP request logging (server only) |
| debug | ✓ | ✓ | Development debugging, verbose info |

## Environment Configuration

### Development
- **Server**: Logs to console (colored) + files, level: debug
- **Frontend**: Logs to browser console, level: debug

### Production
- **Server**: Logs to files primarily, level: info
- **Frontend**: Logs to browser console, level: info

## Example Output

### Server Console (Development)
```
[2024-01-15 10:30:25:123] INFO: Server running on port 3001 (development mode, HTTP)
[2024-01-15 10:30:25:124] INFO: WebSocket server ready for connections
[2024-01-15 10:30:30:456] DEBUG: User connected: abc123
[2024-01-15 10:30:35:789] DEBUG: User abc123 joining session: session-456
```

### Frontend Console (Development)
```
[10:30:25.123] INFO: Connecting to WebSocket at: ws://localhost:3001
[10:30:25.456] DEBUG: Connected to WebSocket server: abc123
[10:30:30.789] DEBUG: Joining session: session-456
```

## Benefits

1. **Structured Logging**: Better than console.log for production
2. **Configurable Levels**: Control verbosity by environment
3. **Persistent Logs**: Server logs are saved to files
4. **Consistent Interface**: Same API across frontend and backend
5. **Production Ready**: Proper logging for monitoring and debugging
6. **Development Friendly**: Colored, timestamped console output

## Future Enhancements

Consider adding:
- Log rotation for server files
- Remote logging service integration
- Request/response logging middleware
- Performance metrics logging
- Error tracking integration (e.g., Sentry)
