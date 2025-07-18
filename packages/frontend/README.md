# MiniCalen Frontend

Frontend application for MiniCalen calendar built with React and Vite.

## Features

- React 18 with TypeScript
- Material-UI components
- FullCalendar integration
- Real-time updates via WebSocket
- Category-based organization
- Responsive design

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check

# Lint code
npm run lint
```

## Environment Variables

- `VITE_API_URL` - Backend API URL (default: http://localhost:3001)
- `VITE_WS_URL` - WebSocket URL (default: http://localhost:3001)

## Docker

```bash
# Build Docker image (from workspace root)
npm run build:frontend:docker

# Run container
docker run -d --name minicalen-frontend -p 8080:8080 minicalen-frontend

# Health check
curl http://localhost:8080/health
```

The Docker image:
- Uses nginx Alpine for serving static files
- Runs on port 8080 as non-root user
- Includes health check endpoint
- Optimized multi-stage build (~50MB)
- SPA routing support for React Router

For detailed Docker documentation, see [../../DOCKER.md](../../DOCKER.md).

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Material-UI** - Component library
- **FullCalendar** - Calendar component
- **Socket.IO Client** - Real-time communication
- **ESLint** - Code linting

## Project Structure

```
src/
├── components/          # React components
│   ├── Calendar.tsx     # Main calendar component
│   ├── Categories.tsx   # Category management
│   ├── Layout.tsx       # App layout
│   ├── Sidebar.tsx      # Navigation sidebar
│   └── ...
├── config/             # Configuration
│   └── api.ts          # API configuration
├── App.tsx             # Main app component
├── main.tsx            # App entry point
└── theme.ts            # Material-UI theme
```

## Components

- **Calendar** - Main calendar view using FullCalendar
- **Categories** - Category management and filtering
- **Sidebar** - Navigation and category list
- **Layout** - Main application layout
- **SessionContext** - Session state management
- **WebSocketContext** - Real-time connection management
