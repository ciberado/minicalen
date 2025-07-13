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
COPY packages/server/package.json ./packages/server/
# Install dependencies including dev dependencies for build
RUN npm ci && npm cache clean --force

# Build the source code
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY packages/server ./packages/server

# Build the application
WORKDIR /app/packages/server
RUN npm run build

# Production image, copy only what's needed and run the server
FROM node:20-alpine AS runner
WORKDIR /app

# Install dumb-init and wget for proper signal handling and health checks
RUN apk add --no-cache dumb-init wget

# Create a non-root user
RUN addgroup --system --gid 1001 minicalen
RUN adduser --system --uid 1001 minicalen

# Create necessary directories
RUN mkdir -p /app/data/sessions /app/logs \
    && chown -R minicalen:minicalen /app

# Copy package.json for production dependencies
COPY --from=deps /app/packages/server/package.json ./
# Install only production dependencies
RUN npm install --only=production && npm cache clean --force

# Copy the built application
COPY --from=builder --chown=minicalen:minicalen /app/packages/server/dist ./dist

# Create data and logs directories with proper permissions
RUN chown -R minicalen:minicalen /app

# Switch to non-root user
USER minicalen

# Expose the application port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider --timeout=3 http://localhost:3001/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
