# Multi-stage build for optimal image size and security
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files for dependency installation
# Copy root package.json for workspace configuration
COPY package.json package-lock.json* ./
COPY packages/frontend/package.json ./packages/frontend/
# Install dependencies including dev dependencies for build
RUN npm ci && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY packages/frontend ./packages/frontend

# Build the application
WORKDIR /app/packages/frontend
RUN npm run build

# Production image, copy all the files and run nginx
FROM nginx:alpine AS runner

# Install wget for health checks
RUN apk add --no-cache wget

# Create a non-root user
RUN addgroup --system --gid 1001 minicalen
RUN adduser --system --uid 1001 minicalen

# Create necessary directories and set permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run \
    && chown -R minicalen:minicalen /var/cache/nginx /var/log/nginx /var/run /usr/share/nginx/html \
    && chmod -R 755 /var/cache/nginx /var/log/nginx /var/run

# Copy nginx configuration for SPA routing
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built application
COPY --from=builder --chown=minicalen:minicalen /app/packages/frontend/dist /usr/share/nginx/html

# Switch to non-root user
USER minicalen

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
