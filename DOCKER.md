# Docker Guide for MiniCalen

This guide covers how to build and run MiniCalen using Docker containers.

## Overview

MiniCalen supports containerized deployment with Docker for both development and production environments. The application consists of two main containers:

- **Frontend**: React application served by nginx on port 8080
- **Server**: Node.js Express server with Socket.IO on port 3001

## Prerequisites

- Docker Engine 20.10+ 
- Node.js 20+ (for building)

## Quick Start

### Build All Images

```bash
# Build both frontend and server images
npm run build:frontend:docker
npm run build:server:docker
```

### Run Containers

```bash
# Run frontend container
docker run -d --name minicalen-frontend -p 8080:8080 minicalen-frontend

# Run server container  
docker run -d --name minicalen-server -p 3001:3001 minicalen-server
```

Access the application at `http://localhost:8080`

## Building Images

### Frontend Image

```bash
# Build frontend Docker image
npm run build:frontend:docker
```

This command:
1. Compiles TypeScript and builds the React application using Vite
2. Creates a production Docker image using nginx Alpine
3. Tags the image as `minicalen-frontend`

**Image details:**
- Base: `nginx:alpine`
- Port: 8080
- Size: ~50MB (optimized multi-stage build)
- User: non-root (`minicalen:minicalen`)

### Server Image

```bash
# Build server Docker image
npm run build:server:docker
```

This command:
1. Compiles TypeScript to JavaScript
2. Creates a production Docker image with only runtime dependencies
3. Tags the image as `minicalen-server`

**Image details:**
- Base: `node:20-alpine`
- Port: 3001
- Size: ~150MB (optimized multi-stage build)
- User: non-root (`minicalen:minicalen`)

## Running Containers

### Frontend Container

```bash
# Basic run
docker run -d --name minicalen-frontend -p 8080:8080 minicalen-frontend

# With custom port
docker run -d --name minicalen-frontend -p 3000:8080 minicalen-frontend

# With health checks enabled
docker run -d --name minicalen-frontend -p 8080:8080 --health-interval=30s minicalen-frontend
```

**Health check endpoint:** `http://localhost:8080/health`

### Server Container

```bash
# Basic run
docker run -d --name minicalen-server -p 3001:3001 minicalen-server

# With persistent data volume
docker run -d --name minicalen-server -p 3001:3001 \
  -v minicalen-data:/app/data \
  -v minicalen-logs:/app/logs \
  minicalen-server

# With environment variables
docker run -d --name minicalen-server -p 3001:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  minicalen-server
```

**Health check endpoint:** `http://localhost:3001/health`

## Production Deployment

### Environment Configuration

For production deployment, configure these environment variables:

**Server Container:**
```bash
NODE_ENV=production
PORT=3001
ALLOWED_ORIGINS=https://your-domain.com
MINICALEN_HOST=your-domain.com
```

**Frontend Container:**
The frontend is a static build, but you can customize the nginx configuration if needed.

### Behind a Reverse Proxy

Example nginx configuration for reverse proxy:

```nginx
upstream minicalen_frontend {
    server localhost:8080;
}

upstream minicalen_server {
    server localhost:3001;
}

server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://minicalen_frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API and WebSocket
    location /api/ {
        proxy_pass http://minicalen_server;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io/ {
        proxy_pass http://minicalen_server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### SSL/HTTPS with Caddy

The server includes Caddy configuration for production SSL:

```bash
# Build with Caddy support
docker run -d --name minicalen-caddy \
  -p 80:80 -p 443:443 \
  -v $PWD/packages/server/Caddyfile:/etc/caddy/Caddyfile \
  -v caddy_data:/data \
  -v caddy_config:/config \
  caddy:alpine
```

## Troubleshooting

### Common Issues

**Frontend container exits immediately:**
```bash
# Check logs
docker logs minicalen-frontend

# Verify nginx configuration
docker run --rm minicalen-frontend nginx -t
```

**Server container can't write to data directory:**
```bash
# Ensure proper volume permissions
docker run --rm -v minicalen-data:/app/data alpine chown -R 1001:1001 /app/data
```

**Health checks failing:**
```bash
# Test health endpoints directly
curl http://localhost:8080/health
curl http://localhost:3001/health

# Check container health status
docker inspect --format='{{.State.Health.Status}}' minicalen-frontend
```

### Performance Optimization

**For production environments:**

1. **Resource limits:**
```bash
docker run -d --name minicalen-server \
  --memory=512m \
  --cpus=1.0 \
  -p 3001:3001 \
  minicalen-server
```

2. **Log rotation:**
```bash
docker run -d --name minicalen-server \
  --log-driver=json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  -p 3001:3001 \
  minicalen-server
```

## Security Considerations

- Both containers run as non-root users (`minicalen:minicalen`)
- Images use Alpine Linux for minimal attack surface
- Frontend uses security headers (CSP, X-Frame-Options, etc.)
- Server supports CORS configuration for production
- Health checks use minimal overhead commands

## Image Management

```bash
# List built images
docker images | grep minicalen

# Remove old images
docker image prune -f

# Export images for deployment
docker save minicalen-frontend:latest | gzip > minicalen-frontend.tar.gz
docker save minicalen-server:latest | gzip > minicalen-server.tar.gz

# Import images on target system
docker load < minicalen-frontend.tar.gz
docker load < minicalen-server.tar.gz
```

