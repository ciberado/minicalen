# Minicalen

A barebones React application built with TypeScript and Vite with real-time collaboration support.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the backend server:
   ```bash
   npm run server
   ```

3. In a separate terminal, start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure as needed:

#### Client Configuration (Vite environment variables)
- `VITE_API_URL` - API server URL (default: `http://localhost:3001`)
- `VITE_WS_URL` - WebSocket server URL (default: `http://localhost:3001`)

#### Server Configuration
- `NODE_ENV` - Environment mode (`development` or `production`)
- `PORT` - Server port (default: `3001`)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `USE_HTTPS` - Enable HTTPS (`true` or `false`)
- `SSL_KEY_PATH` - Path to SSL private key file (when using HTTPS)
- `SSL_CERT_PATH` - Path to SSL certificate file (when using HTTPS)

### Examples

#### Development (default)
No configuration needed. The app will use `localhost:3001` for both API and WebSocket.

#### Production (same domain)
```bash
# Client
VITE_API_URL=https://yourdomain.com
VITE_WS_URL=wss://yourdomain.com

# Server
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com
```

#### Production (separate API domain)
```bash
# Client
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com

# Server
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### HTTPS Support
```bash
USE_HTTPS=true
SSL_KEY_PATH=/path/to/private-key.pem
SSL_CERT_PATH=/path/to/certificate.pem
```

## Available Scripts

- `npm run dev` - Start the development server
- `npm run server` - Start the backend server for state storage
- `npm run build` - Build the project for production
- `npm run lint` - Run ESLint to check for code issues
- `npm run preview` - Preview the production build locally

## Tech Stack

- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Express** - Backend server for state storage
- **Socket.IO** - Real-time communication

## Features

### State Management

MiniCalen uses a server-side state storage system:

1. **Client-Side**: The application state is managed in React context providers
2. **Server-Side**: When saving, the state is sent to an Express server
3. **Persistence**: Sessions are stored in JSON files on the server
4. **URL Sharing**: Each session has a unique ID in the URL hash for easy sharing

### Real-time Collaboration

- **WebSocket Connection**: Real-time synchronization between multiple clients
- **Automatic State Sync**: Changes are broadcast to all connected clients in the same session
- **Conflict Resolution**: Last-write-wins conflict resolution with timestamps

### Security Features

- **CORS Protection**: Configurable CORS origins for production security
- **HTTPS Support**: Optional SSL/TLS encryption
- **Environment-based Configuration**: Separate settings for development and production
