# MiniCalen

A lightweight, modern calendar application built with React and Node.js.

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
# Build Docker images
npm run build:frontend:docker
npm run build:server:docker

# Run containers individually
docker run -d --name minicalen-frontend -p 8080:8080 minicalen-frontend
docker run -d --name minicalen-server -p 3001:3001 minicalen-server

# Or use Docker Compose for orchestration
docker-compose up -d
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
