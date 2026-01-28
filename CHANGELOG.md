# Changelog

All notable changes to MiniCalen will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-01-28

### Added
- **Authentication System**: Complete user authentication and session management
  - Email/password authentication via BetterAuth framework
  - Anonymous session support (create calendars without signing up)
  - Session claiming functionality (convert anonymous → owned)
  - SQLite database with Drizzle ORM for session persistence
  - User accounts with secure password hashing
  - HTTP-only cookies for session security
  
- **Permission-Based Sharing**: Granular access control for collaborative calendars
  - Owner permission: Full control (read, write, share, delete)
  - Editor permission: Can modify content but not share
  - Viewer permission: Read-only access
  - Share sessions via email address
  - Real-time permission enforcement on API and WebSocket layers
  
- **Frontend Authentication UI**: Complete Material-UI based auth interface
  - Sign in/sign up dialogs with email/password
  - User menu with account management
  - My Calendars dashboard showing owned and shared calendars
  - Share dialog for granting permissions
  - Access banner displaying current user and permissions
  - Session list with create, rename, and delete operations
  
- **Database Integration**: SQLite with Drizzle ORM
  - Better-Auth tables for user/session management
  - Custom sessions table with ownership and sharing
  - Migration system for schema updates
  - Automatic database initialization on startup
  
- **API Enhancements**: New authentication and session endpoints
  - `/api/auth/*` - BetterAuth endpoints for sign-in/sign-up/sign-out
  - `/api/sessions` - CRUD operations for calendar sessions
  - `/api/sessions/:id/share` - Share sessions with other users
  - Session migration endpoint for claiming anonymous sessions
  - Authentication middleware protecting sensitive endpoints

### Changed
- **WebSocket Authentication**: Socket.IO connections now support authenticated users
  - Optional authentication middleware for anonymous users
  - User and session information attached to socket connections
  - Permission-based access control for real-time updates
  
- **Session Storage**: Migrated from file-based to database storage
  - Automatic migration of existing JSON session files to database
  - Sessions now linked to user accounts when authenticated
  - Support for both anonymous and authenticated sessions

### Fixed
- **Code Quality**: Resolved TypeScript linter errors
  - Fixed Socket.IO type definitions with proper interface extension
  - Removed all `any` types with explicit type definitions
  - Fixed React Fast Refresh warnings by extracting hooks to separate files
  
- **Project Structure**: Improved code organization
  - Created `contexts/` directory for React contexts
  - Created `hooks/` directory for custom hooks
  - Separated authentication logic into `auth/` directory
  - Better separation of concerns for maintainability

### Documentation
- **README Updates**: Comprehensive documentation improvements
  - Added authentication and user management section
  - Included screenshots showcasing key features
  - Reorganized features with concise, scannable bullet points
  - Simplified technical stack and environment sections
  - Added documentation links to `docs/` folder
  
- **New Documentation**: Detailed guides and references
  - `docs/AUTHENTICATION.md` - Complete authentication guide
  - `docs/screenshots/` - Visual feature demonstrations
  - `TESTING.md` - Authentication testing documentation
  - Environment variable documentation for Better-Auth setup

### Security
- **Authentication Security**: Industry-standard security practices
  - Password hashing with bcrypt
  - HTTP-only cookies for session tokens
  - CORS configuration for production environments
  - Session expiration (30-day default)
  - CSRF protection via Better-Auth

### Breaking Changes
- **Database Migration Required**: Sessions now stored in SQLite database
  - Existing JSON session files will be automatically migrated on first startup
  - Environment variable `BETTER_AUTH_SECRET` now required (min 32 characters)
  - Database file location: `packages/server/data/minicalen.db`
  - Access level indicators throughout UI
  
- **Database Schema**: Comprehensive schema for authentication
  - `users` table: User accounts and profiles
  - `sessions` table: Calendar sessions with ownership
  - `sessionPermissions` table: Fine-grained access control
  - Foreign key relationships with cascade deletes
  - Automatic timestamp tracking
  
- **WebSocket Authentication**: Secure real-time communication
  - Cookie-based authentication for Socket.IO
  - Permission validation on state change events
  - Anonymous user support with proper access control
  - `checkSessionAccess()` helper for permission checks
  
- **Migration Tools**: Legacy session migration system
  - `/api/migrate/legacy-sessions` endpoint
  - Converts file-based sessions to database
  - Dry-run mode for testing
  - Preserves session IDs and state

### Changed
- **Session Storage**: Migrated from file-based to database storage
  - Sessions now stored in SQLite database
  - Legacy JSON files can be migrated automatically
  - Improved concurrent access handling
  - Better performance for multi-user scenarios
  
- **API Authentication**: Updated API endpoints with auth middleware
  - `requireAuth` middleware for protected routes
  - `optionalAuth` middleware for mixed access patterns
  - Cookie-based session management
  - Proper error handling for unauthenticated requests
  
- **CORS Configuration**: Enhanced CORS with credentials support
  - `credentials: true` in CORS config
  - `withCredentials: true` in Socket.IO client
  - Proper cookie handling across domains
  
### Documentation
- Added `AUTHENTICATION.md` - Complete authentication system guide
- Added `TESTING.md` - Comprehensive testing results
- Updated `README.md` - Authentication features and documentation links
- Updated architecture diagram with database layer

### Dependencies
- Added `better-auth` v1.0 - Authentication framework
- Added `drizzle-orm` - Type-safe database queries
- Added `better-sqlite3` - SQLite database driver
- Added `@mui/icons-material` - Material-UI icons

## [1.4.2] - 2026-01-18

### Fixed
- **Build**: Fixed TypeScript compilation errors related to unused variables
  - Removed unused `setSelectedDate` and `toggleTextCategory` variables from SessionContext
  - Fixed unused `trackedDates` variable in Calendar component

## [1.4.1] - 2026-01-18

### Improved
- **Documentation**: Added comprehensive features list to README.md
  - Detailed calendar management capabilities
  - Complete category system documentation (foreground and text categories)
  - Session management and real-time collaboration features
  - User interface and technical features overview
  - Development and deployment capabilities summary

## [1.4.0] - 2026-01-18

### Fixed
- **Text Category Session Persistence**: Resolved issue where text category symbols disappeared on session reload
  - Fixed React state update timing issue in CategoryContext.applyRemoteState function
  - Modified dateInfoMap state application to use setTimeout for proper React state detection
  - Text category symbols (H, D, etc.) now properly persist and display after page refresh
  - Calendar component's updateDateSymbols useEffect now correctly triggers on session data restoration
  - Enhanced session loading reliability for complete state restoration including text categories

## [1.3.1] - 2026-01-18

### Fixed
- **Firefox WebSocket Compatibility**: Resolved WebSocket connection failures in Firefox browser
  - Changed Socket.IO transport priority from websocket-first to polling-first for better Firefox compatibility
  - Added `forceNew` and `rememberUpgrade: false` options to prevent Firefox caching issues
  - Enhanced connection error handling and reconnection logging
  - Real-time synchronization now works reliably across all major browsers
- **Version Unification**: Aligned all package versions to maintain consistency across the monorepo

## [1.3.0] - 2026-01-18

### Improved
- **Category Deactivation Behavior**: Enhanced visual feedback and interaction control for deactivated foreground categories
  - Deactivated categories now properly display at 20% opacity (reduced from 70%)
  - Calendar dates with deactivated category colors also show at 20% opacity using RGBA transparency
  - Prevented date manipulation (add/remove) when selected category is deactivated
  - Improved FullCalendar compatibility by using RGBA background colors instead of separate opacity property
  - Added debug logging for better troubleshooting of category state changes


## [1.2.2] - 2026-01-18

### Fixed
- **Text Categories Cross-Month Display**: Fixed bug where text category symbols only appeared on first occurrence of dates that span multiple months
  - Updated `updateDateSymbols` function to use `querySelectorAll` instead of `querySelector`
  - Ensures text symbols appear on all instances of cross-month dates (e.g., last week of one month showing in next month)
  - Fixes both addition and removal of text symbols across duplicate date displays

## [1.2.1] - 2026-01-18

### Fixed
- **Docker Build Compilation**: Resolved TypeScript compilation errors for Docker builds
  - Fix HTMLElement casting in Calendar component for style property access
  - Import TextCategory type in Sidebar component
  - Ensure color property is never null in text category mapping
  - Enable successful Docker image builds for v1.2.0

## [1.2.0] - 2026-01-18

### Added
- **Text Categories Feature**: New text label system for enhanced calendar organization
  - Text categories with customizable symbols (e.g., "Holiday [H]", "Deadline [D]")
  - Support for multiple text categories per date alongside foreground categories
  - Visual symbols displayed on calendar dates for quick identification
  - Independent management from foreground color categories

### Fixed
- **Text Categories Backward Compatibility**: Seamless support for legacy sessions without text categories
  - Preserve default text categories when loading old sessions
  - Maintain existing text categories during remote state synchronization
  - Ensure forward compatibility by always including text categories in new saves
  - Fix infinite sync loop in multi-user collaboration scenarios

### Improved
- Enhanced state comparison logic to handle missing text categories gracefully
- Consistent text category ordering across UI components
- More robust WebSocket state synchronization
- Updated Docker images with latest dependencies and optimizations

## [1.1.0] - 2025-08-01

### Changed

- Added border radius effect to the CategoryValues on the calendar.

## [1.0.0] - 2025-07-17

### Fixed
- Fixed category value removal when clicking on already selected dates ([4f733af](../../commit/4f733af))
- State now saves with each update even for single-user sessions ([d1b4dc1](../../commit/d1b4dc1))

### Added
- GitHub Actions support for CI/CD ([0476967](../../commit/0476967))

### Changed
- Updated deployment configurations ([8ac46bc](../../commit/8ac46bc))

## [0.3.0] - 2025-07-13

### Added
- **Docker Support**: Complete containerization with multi-stage builds
  - Frontend Docker support with Nginx ([fed1066](../../commit/fed1066))
  - Server Docker support ([a918820](../../commit/a918820))
  - Docker Compose configurations ([e12b71f](../../commit/e12b71f))
- **Proper Logging**: Winston-based logging system ([23a5139](../../commit/23a5139))

### Fixed
- Frontend Dockerfile and Nginx configuration improvements ([04abc0f](../../commit/04abc0f))
- Added DateInfo and SessionState TypeScript interfaces ([54b0ef2](../../commit/54b0ef2))

### Removed
- Removed unused script files ([046c29d](../../commit/046c29d))
- Removed legacy background and tag categories ([63c6de9](../../commit/63c6de9))

## [0.2.0] - 2025-07-12

### Added
- **Monorepo Architecture**: Major refactor into npm workspace packages ([0663f16](../../commit/0663f16))
  - Separated frontend and server into distinct packages
  - Improved build and development workflows
- **Reverse Proxy Support**: Caddy server integration ([03892da](../../commit/03892da))

### Changed
- Removed hardcoded URLs for better deployment flexibility ([aa6002b](../../commit/aa6002b))

## [0.1.0] - 2025-07-10

### Added
- **Real-time Collaboration**: WebSocket-based synchronization
  - WebSocket session management ([69d66f2](../../commit/69d66f2))
  - Real-time state synchronization across clients ([17049b7](../../commit/17049b7))
  - State updates via WebSocket events ([b4aec7c](../../commit/b4aec7c))
- **Persistent Storage**: Server-based session persistence
  - Individual session files for data storage ([c31a01d](../../commit/c31a01d))
  - Automatic state saving ([be12004](../../commit/be12004))
- **TypeScript Backend**: Server migration to TypeScript ([ef5cf4b](../../commit/ef5cf4b))
- **Development Tools**: Nodemon integration for hot-reload ([4253224](../../commit/4253224))

### Changed
- Simplified data directory structure ([99861da](../../commit/99861da))

### Removed
- Removed global exclusive category behavior ([e0f83e2](../../commit/e0f83e2))
- Simplified category system ([27b6cdf](../../commit/27b6cdf))
- Removed previous autosave implementation ([207b238](../../commit/207b238))

## [0.0.3] - 2025-07-07

### Added
- **Interactive Calendar**: Full year calendar with date selection
  - FullCalendar integration with multi-month view ([58b5a07](../../commit/58b5a07))
  - Color updates on day clicks ([96f48c1](../../commit/96f48c1))
  - Toggle behavior for date selection ([15b5f02](../../commit/15b5f02))
- **Category Management**: Enhanced category system
  - Global exclusive category switching ([65db1ac](../../commit/65db1ac))
  - Session state management ([c1bcd06](../../commit/c1bcd06))
  - Server-based persistence ([f9354a5](../../commit/f9354a5))

### Fixed
- Calendar layout fixed to 4 columns and 3 rows ([6ba8dd0](../../commit/6ba8dd0))
- Removed calendar borders for cleaner appearance ([5301267](../../commit/5301267))

## [0.0.2] - 2025-06-30

### Added
- **Category System**: Initial category implementation
  - Multiple category support ([f0199f0](../../commit/f0199f0))
  - Optional color configuration ([fcd6739](../../commit/fcd6739))
  - Exclusive category switching ([cc9dc40](../../commit/cc9dc40))
  - Basic category functionality ([c29c03d](../../commit/c29c03d))
- **UI Framework**: Material-UI integration ([7a057a2](../../commit/7a057a2))
- **Application Layout**: Basic layout structure ([c73a36d](../../commit/c73a36d))
- **Development Tools**: Enhanced development workflow ([4ae675f](../../commit/4ae675f))
  - git-cz (Commitizen) for standardized commits
  - GitHub CLI in dev container

## [0.0.1] - 2025-06-28

### Added
- **Project Foundation**: Initial project setup
  - Vite-based React application ([85cf3de](../../commit/85cf3de))
  - TypeScript configuration
  - Basic development server setup

### Fixed
- Development server host configuration for container compatibility ([c384f4f](../../commit/c384f4f))

---

## Legend

- 🎸 **feat**: New features
- 🐛 **fix**: Bug fixes  
- 💡 **refactor**: Code refactoring
- 💄 **style**: UI/UX improvements
- 🤖 **chore**: Build process, dependencies, tooling
- 📝 **docs**: Documentation updates

## Contributors

- **Javi Moreno** - *Initial development and all current features*

## Development Milestones

- **Jun 28, 2025**: Project inception with Vite + React + TypeScript
- **Jun 30, 2025**: UI foundation with Material-UI and category system
- **Jul 3, 2025**: Interactive calendar with full-year view
- **Jul 7, 2025**: Enhanced category management and session state
- **Jul 10, 2025**: Real-time collaboration with WebSocket synchronization
- **Jul 12, 2025**: Monorepo architecture and deployment infrastructure
- **Jul 13, 2025**: Production-ready Docker containerization
- **Jul 17, 2025**: First stable release v1.0.0 with CI/CD pipeline
