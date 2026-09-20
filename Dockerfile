FROM node:22-slim AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages

RUN npm ci
RUN npm run build --workspace=@minicalen/frontend

FROM node:22-slim

COPY --from=caddy:2-alpine /usr/bin/caddy /usr/bin/caddy

WORKDIR /app

ENV NODE_ENV=production \
    HOST=127.0.0.1 \
    PORT=3001 \
    COLLAB_PORT=3002 \
    DATABASE_URL=/app/data/minicalen.db

COPY --from=build /app ./
COPY Caddyfile /etc/caddy/Caddyfile
COPY docker/entrypoint.sh /app/docker/entrypoint.sh

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["sh", "/app/docker/entrypoint.sh"]
