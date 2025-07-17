# Changelog

All notable changes to MiniCalen will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
