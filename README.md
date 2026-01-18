# MiniCalen

A lightweight, modern calendar application built with React and Node.js.

## ✨ Features

### 📅 **Calendar Management**
- **Year View**: Display 12-month grid layout for comprehensive year overview
- **Interactive Date Selection**: Click dates to assign categories and labels
- **Today Highlighting**: Current date automatically highlighted for easy navigation
- **Cross-Month Date Display**: Seamless handling of dates spanning multiple months

### 🎨 **Category System**
- **Foreground Categories**: Color-coded background categories (Important, Work, Personal)
  - Customizable colors with hex color picker
  - Visual opacity control (active/inactive states)
  - Category activation/deactivation with visual feedback
- **Text Categories**: Symbol-based labeling system
  - Customizable text labels with auto-generated symbols (e.g., "Holiday [H]", "Deadline [D]")
  - Overlay symbols displayed on calendar dates
  - Multiple text categories per date supported
  - Color-coded symbols with customizable colors

### 💾 **Session Management**
- **Persistent Sessions**: Automatic saving and loading of calendar state
- **Session URLs**: Shareable URLs for collaborative calendar access
- **State Restoration**: Complete restoration of categories, dates, and text labels
- **Session Persistence**: Text categories and assignments persist across page reloads

### 🔄 **Real-Time Collaboration**
- **WebSocket Synchronization**: Live updates across multiple browser sessions
- **Multi-User Support**: Multiple users can collaborate on the same calendar
- **Cross-Browser Compatibility**: WebSocket fallback ensures compatibility with Firefox and all major browsers
- **State Broadcasting**: Changes automatically sync to all connected clients

### 🎛️ **User Interface**
- **Material-UI Design**: Modern, responsive interface with Material Design components
- **Sidebar Controls**: Organized category management with checkboxes and color controls
- **Visual Feedback**: Clear indicators for category states and interactions
- **Responsive Layout**: Optimized 4-column grid layout with automatic sizing

### 🔧 **Technical Features**
- **TypeScript**: Full type safety across frontend and backend
- **File-Based Storage**: Simple JSON file storage for sessions (no database required)
- **CORS Support**: Configurable cross-origin request handling
- **Docker Ready**: Complete containerization support for easy deployment
- **Monorepo Architecture**: Independent frontend and backend packages
- **Environment Configuration**: Flexible configuration for development and production

### 🚀 **Development & Deployment**
- **Hot Reload**: Instant development feedback with Vite and nodemon
- **Automated CI/CD**: GitHub Actions for Docker image building and publishing
- **Multi-Environment**: Development, production, and Docker deployment options
- **Comprehensive Logging**: Debug logging for troubleshooting and monitoring

## 📦 Packages

This is a monorepo containing two independent packages:

- **[@minicalen/frontend](./packages/frontend)** - React frontend application
- **[@minicalen/server](./packages/server)** - Node.js backend server

## 🚀 Quick Start

### Development

```bash
# Install all dependencies
npm install

# Start both frontend and server in development mode
npm run dev:all

# Or start them separately:
npm run dev:server  # Start backend server
npm run dev         # Start frontend application
```

### Production Build

```bash
# Build both packages
npm run build

# Or build them separately:
npm run build:frontend
npm run build:server

# Start production server
npm run start
```

### Docker Deployment

```bash
# Build Docker images locally
npm run build:frontend:docker
npm run build:server:docker

# Run containers individually
docker run -d --name minicalen-frontend -p 8080:8080 minicalen-frontend
docker run -d --name minicalen-server -p 3001:3001 minicalen-server

# Or use Docker Compose for orchestration
docker-compose up -d

# Use pre-built images from Docker Hub (after CI/CD)
docker run -d -p 8080:8080 your-dockerhub-username/minicalen-frontend:latest
docker run -d -p 3001:3001 your-dockerhub-username/minicalen-server:latest
```

For detailed Docker documentation, see [DOCKER.md](./DOCKER.md).

## 🏗️ Architecture

```
minicalen/
├── packages/
│   ├── frontend/          # React frontend package
│   │   ├── src/          # React components and logic
│   │   ├── public/       # Static assets
│   │   └── dist/         # Built frontend assets
│   └── server/           # Node.js backend package
│       ├── src/          # Server source code
│       ├── data/         # Session storage
│       └── dist/         # Built server code
├── scripts/              # Utility scripts
└── DEPLOYMENT.md         # Deployment guide
```

## 🛠️ Development Workflow

Each package is independently managed with its own:
- Dependencies (`package.json`)
- Build configuration
- TypeScript configuration
- ESLint configuration
- README documentation

### Working with Packages

```bash
# Install dependencies for a specific package
npm install --workspace=@minicalen/frontend
npm install --workspace=@minicalen/server

# Run scripts in a specific package
npm run build --workspace=@minicalen/frontend
npm run dev --workspace=@minicalen/server

# Add dependencies to a specific package
npm install react --workspace=@minicalen/frontend
npm install express --workspace=@minicalen/server
```

## 🌐 Environment Configuration

### Frontend Environment Variables
- `VITE_API_URL` - Backend API URL (default: http://localhost:3001)
- `VITE_WS_URL` - WebSocket URL (default: http://localhost:3001)

### Server Environment Variables
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `MINICALEN_HOST` - Host for proxy configuration

## 📚 Documentation

- [Frontend Documentation](./packages/frontend/README.md)
- [Server Documentation](./packages/server/README.md)
- [Docker Guide](./DOCKER.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [CI/CD Guide](./CI-CD.md)

## 🔄 CI/CD: Automated Builds

MiniCalen includes automated Docker image building and publishing through GitHub Actions.

### Release Process

To trigger automated Docker image builds:

1. **Create a release tag** ending with `-RELEASE`:
   ```bash
   git tag v1.0.0-RELEASE
   git push origin v1.0.0-RELEASE
   ```

2. **GitHub Actions automatically**:
   - Builds Docker images for both frontend and server
   - Tags images with package versions and commit SHA
   - Pushes to Docker Hub registry

### Required Secrets

Configure these secrets in your GitHub repository:

- `DOCKER_USERNAME` - Your Docker Hub username
- `DOCKER_PASSWORD` - Your Docker Hub password or access token

### Generated Image Tags

Each release creates multiple tags:

**Frontend images:**
- `username/minicalen-frontend:1.0.0` (package version)
- `username/minicalen-frontend:abc12345` (commit SHA)
- `username/minicalen-frontend:latest`

**Server images:**
- `username/minicalen-server:1.0.0` (package version) 
- `username/minicalen-server:abc12345` (commit SHA)
- `username/minicalen-server:latest`

### Using Published Images

```bash
# Pull and run the latest images
docker pull username/minicalen-frontend:latest
docker pull username/minicalen-server:latest

# Or use specific versions
docker pull username/minicalen-frontend:1.0.0
docker pull username/minicalen-server:1.0.0
```

## 🔧 Scripts

### Development
- `npm run dev` - Start frontend development server
- `npm run dev:server` - Start backend development server
- `npm run dev:all` - Start both frontend and backend

### Building
- `npm run build` - Build both packages
- `npm run build:frontend` - Build frontend package only
- `npm run build:server` - Build server package only

### Docker
- `npm run build:frontend:docker` - Build frontend Docker image
- `npm run build:server:docker` - Build server Docker image

### Production
- `npm run start` - Start production server

### Development Tools
- `npm run lint` - Lint all packages

## 🏗️ Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for build and development
- Material-UI for components
- FullCalendar for calendar functionality
- Socket.IO client for real-time updates

### Backend
- Node.js with Express
- TypeScript
- Socket.IO for real-time communication
- File-based session storage
- CORS support for cross-origin requests

## 📄 License

[Add your license here]
