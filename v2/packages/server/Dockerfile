FROM node:22-slim AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages

RUN npm ci --workspace=@minicalen/server --include-workspace-root

FROM node:22-slim

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app ./

EXPOSE 3001 3002

CMD ["npx", "tsx", "packages/server/src/index.ts"]
