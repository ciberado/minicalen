# Deployment Guide

This guide explains how to deploy MiniCalen in different environments with proper configuration.

## � Quick Deployment with Published Images

The fastest way to deploy MiniCalen is using the pre-built Docker images published via GitHub Actions.

### Using Docker Compose with Published Images

Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  minicalen-server:
    image: your-dockerhub-username/minicalen-server:latest
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - MINICALEN_HOST=yourdomain.com
    volumes:
      - ./data:/app/data
    restart: unless-stopped

  minicalen-frontend:
    image: your-dockerhub-username/minicalen-frontend:latest
    ports:
      - "8080:8080"
    environment:
      - VITE_API_URL=https://yourdomain.com
      - VITE_WS_URL=wss://yourdomain.com
    restart: unless-stopped

  caddy:
    image: caddy:alpine
    ports:
      - "80:80"
      - "443:443"
    environment:
      - MINICALEN_HOST=yourdomain.com
      - MINICALEN_BACKEND=minicalen-server
      - MINICALEN_FRONTEND=minicalen-frontend
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - minicalen-server
      - minicalen-frontend
    restart: unless-stopped

volumes:
  caddy_data:
  caddy_config:
```

Then run:
```bash
docker-compose up -d
```

### Manual Docker Run

```bash
# Create a data directory for sessions
mkdir -p ./data

# Run the server
docker run -d \
  --name minicalen-server \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e MINICALEN_HOST=yourdomain.com \
  -v $(pwd)/data:/app/data \
  your-dockerhub-username/minicalen-server:latest

# Run the frontend
docker run -d \
  --name minicalen-frontend \
  -p 8080:8080 \
  -e VITE_API_URL=https://yourdomain.com \
  -e VITE_WS_URL=wss://yourdomain.com \
  your-dockerhub-username/minicalen-frontend:latest
```

### Available Image Tags

Choose from these tag options:
- `:latest` - Latest stable release
- `:1.0.0` - Specific version (replace with actual version)
- `:abc12345` - Specific commit (replace with actual commit SHA)

## �🚀 Caddy Reverse Proxy Deployment (Recommended)

MiniCalen includes a pre-configured `Caddyfile` for easy deployment with Caddy as a reverse proxy. This setup handles SSL termination, WebSocket connections, and routing.

### Environment Setup

Set these environment variables for Caddy:

```bash
# Required: Caddy proxy hostname
export MINICALEN_HOST=yourdomain.com

# Required: Backend service (Node.js server)
export MINICALEN_BACKEND=localhost  # or backend-container-name

# Required: Frontend service (Vite dev server or static files)
export MINICALEN_FRONTEND=localhost  # or frontend-container-name
```

### Backend Configuration

For the Node.js server, set:

```bash
export NODE_ENV=production
export PORT=3001
export MINICALEN_HOST=yourdomain.com  # For CORS configuration
```

### Frontend Configuration

Build the frontend with proxy-aware settings:

```bash
export VITE_API_URL=https://yourdomain.com
export VITE_WS_URL=wss://yourdomain.com
npm run build
```

### Running with Caddy

```bash
# Start the backend server
npm run server:build

# Start Caddy with the configuration
caddy run --config Caddyfile
```

### Docker Compose Example

```yaml
version: '3.8'
services:
  backend:
    build: 
      context: .
      dockerfile: packages/server/Dockerfile
    command: npm run start --workspace=@minicalen/server
    environment:
      - NODE_ENV=production
      - PORT=3001
      - MINICALEN_HOST=yourdomain.com
    volumes:
      - ./packages/server/data:/app/data

  frontend:
    build:
      context: .
      dockerfile: packages/frontend/Dockerfile
    command: npm run preview --workspace=@minicalen/frontend
    environment:
      - VITE_API_URL=https://yourdomain.com
      - VITE_WS_URL=wss://yourdomain.com
    ports:
      - "5173:5173"

  proxy:
    image: caddy:alpine
    ports:
      - "443:443"
    environment:
      - MINICALEN_HOST=yourdomain.com
      - MINICALEN_BACKEND=backend
      - MINICALEN_FRONTEND=frontend
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
    depends_on:
      - backend
      - frontend
```

## 🏠 Development Environment

**Default setup** - No configuration needed:
```bash
npm run dev:server  # Starts server on http://localhost:3001
npm run dev         # Starts client on http://localhost:5173

# Or start both at once:
npm run dev:all
```

The client will automatically connect to `http://localhost:3001` for both API and WebSocket.

## 🌐 Production Environment

### Same Domain Deployment

When both client and server are on the same domain:

**Server (.env)**:
```env
NODE_ENV=production
PORT=3001
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Client (.env)**:
```env
VITE_API_URL=https://yourdomain.com
VITE_WS_URL=wss://yourdomain.com
```

### Separate API Domain

When the API is on a different domain/subdomain:

**Server (.env)**:
```env
NODE_ENV=production
PORT=3001
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

**Client (.env)**:
```env
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
```

### Different Port

When the API runs on a different port:

**Server (.env)**:
```env
NODE_ENV=production
PORT=8080
ALLOWED_ORIGINS=https://yourdomain.com
```

**Client (.env)**:
```env
VITE_API_URL=https://yourdomain.com:8080
VITE_WS_URL=wss://yourdomain.com:8080
```

## 🔒 HTTPS/SSL Configuration

### Using Reverse Proxy (Recommended)

Use nginx, Apache, or a cloud load balancer to handle SSL termination:

**nginx.conf example**:
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io/ {
        proxy_pass http://localhost:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

### Direct HTTPS in Node.js

**Server (.env)**:
```env
NODE_ENV=production
USE_HTTPS=true
SSL_KEY_PATH=/path/to/private-key.pem
SSL_CERT_PATH=/path/to/certificate.pem
PORT=3001
ALLOWED_ORIGINS=https://yourdomain.com
```

**Generate self-signed certificates for testing**:
```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

## 🐳 Docker Deployment

**Dockerfile.server**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY server/ ./server/
COPY dist/ ./dist/
EXPOSE 3001
CMD ["npm", "run", "server:build"]
```

**docker-compose.yml**:
```yaml
version: '3.8'
services:
  minicalen-server:
    build:
      context: .
      dockerfile: Dockerfile.server
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - ALLOWED_ORIGINS=https://yourdomain.com
    volumes:
      - ./data:/app/data

  minicalen-client:
    build:
      context: .
      dockerfile: Dockerfile.client
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=https://yourdomain.com
      - VITE_WS_URL=wss://yourdomain.com
```

## 🌍 Environment-Specific Configs

### .env.development
```env
# Development overrides (optional)
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
```

### .env.staging
```env
NODE_ENV=production
VITE_API_URL=https://staging-api.yourdomain.com
VITE_WS_URL=wss://staging-api.yourdomain.com
ALLOWED_ORIGINS=https://staging.yourdomain.com
```

### .env.production
```env
NODE_ENV=production
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## 🚀 Build and Deploy

1. **Build both packages**:
   ```bash
   npm run build
   ```

2. **Or build them separately**:
   ```bash
   npm run build:frontend
   npm run build:server
   ```

3. **Deploy static files** to your web server or CDN

4. **Deploy server** with proper environment variables

5. **Test configuration**:
   ```bash
   curl https://yourdomain.com/api/health
   ```

## 🔧 Troubleshooting

### CORS Issues
- Ensure `ALLOWED_ORIGINS` includes your client domain
- Check for trailing slashes in URLs
- Verify protocol matches (http/https)

### WebSocket Connection Issues
- Ensure WebSocket URL uses correct protocol (ws/wss)
- Check if reverse proxy supports WebSocket upgrades
- Verify firewall allows WebSocket connections

### SSL Certificate Issues
- Verify certificate files exist and are readable
- Check certificate validity and expiration
- Ensure private key matches certificate

## 📊 Monitoring

Add health checks to your deployment:

```bash
# API Health
curl https://yourdomain.com/api/health

# Expected response:
{
  "status": "OK",
  "timestamp": "2025-07-10T18:45:51.794Z",
  "environment": "production",
  "https": true,
  "version": "1.0.0"
}
```

## 🔄 CI/CD: Automated Image Publishing

MiniCalen includes automated Docker image building through GitHub Actions.

### Release Workflow

1. **Update package versions** in `packages/frontend/package.json` and `packages/server/package.json`
2. **Create a release tag** ending with `-RELEASE`:
   ```bash
   git tag v1.2.0-RELEASE
   git push origin v1.2.0-RELEASE
   ```
3. **GitHub Actions automatically**:
   - Builds multi-architecture Docker images (linux/amd64, linux/arm64)
   - Tags images with package versions and commit SHA
   - Pushes to Docker Hub registry

### Required Repository Secrets

Configure in GitHub repository settings → Secrets and variables → Actions:

- `DOCKER_USERNAME` - Your Docker Hub username
- `DOCKER_PASSWORD` - Your Docker Hub password or access token

### Deployment with New Images

After a successful release build:

```bash
# Pull latest images
docker-compose pull

# Restart services with new images
docker-compose up -d

# Or for manual deployments
docker pull your-dockerhub-username/minicalen-frontend:latest
docker pull your-dockerhub-username/minicalen-server:latest
docker-compose restart
```

### Image Verification

Check image information:

```bash
# View image tags and details
docker image inspect your-dockerhub-username/minicalen-server:latest

# Check running container versions
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
```
