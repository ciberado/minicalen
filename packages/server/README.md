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
