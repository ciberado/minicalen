# MiniCalen Server

Backend server for MiniCalen calendar application.

## Features

- Express.js REST API
- WebSocket support with Socket.IO
- CORS configuration for cross-origin requests
- File-based session storage
- Health check endpoint
- SSL/HTTPS support

## Development

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type check
npm run type-check

# Lint code
npm run lint
```

## Environment Variables

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `MINICALEN_HOST` - Host for proxy configuration
- `USE_HTTPS` - Enable HTTPS (true/false)
- `SSL_KEY_PATH` - Path to SSL private key
- `SSL_CERT_PATH` - Path to SSL certificate

## Docker

```bash
# Build Docker image (from workspace root)
npm run build:server:docker

# Run container
docker run -d --name minicalen-server -p 3001:3001 minicalen-server

# Run with persistent storage
docker run -d --name minicalen-server -p 3001:3001 \
  -v minicalen-data:/app/data \
  -v minicalen-logs:/app/logs \
  minicalen-server

# Health check
curl http://localhost:3001/health
```

The Docker image:
- Uses Node.js 20 Alpine as base
- Runs on port 3001 as non-root user
- Includes dumb-init for proper signal handling
- Optimized multi-stage build (~150MB)
- Persistent volumes for data and logs

For detailed Docker documentation, see [../../DOCKER.md](../../DOCKER.md).

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/sessions` - Get all sessions
- `GET /api/sessions/:id` - Get session by ID
- `POST /api/sessions` - Create new session
- `PUT /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session

## WebSocket Events

- `sessionCreated` - New session created
- `sessionUpdated` - Session updated
- `sessionDeleted` - Session deleted

## Data Storage

Sessions are stored in JSON files in the `data/sessions/` directory.
