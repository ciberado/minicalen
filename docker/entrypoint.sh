#!/bin/sh
set -eu

caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &
CADDY_PID=$!

./node_modules/.bin/tsx packages/server/src/index.ts &
NODE_PID=$!

shutdown() {
  kill "$CADDY_PID" "$NODE_PID" 2>/dev/null || true
}

trap 'shutdown; exit 0' TERM INT

while kill -0 "$CADDY_PID" 2>/dev/null && kill -0 "$NODE_PID" 2>/dev/null; do
  sleep 1
done

shutdown
exit 1
