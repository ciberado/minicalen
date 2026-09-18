#!/usr/bin/env bash
# Runs on every container start (postStartCommand).
#
# If TAILSCALE_AUTHKEY is set and non-empty:
#   1. Starts tailscaled in the background (systemd is absent in containers).
#   2. Connects to the tailnet, advertising SSH + the vscode tag.
#   3. Uses PROJECT_NAME as the Tailscale hostname so the node is identifiable.
#   4. Wires up Tailscale MagicDNS (100.100.100.100) for tailnet name resolution.
#
# If TAILSCALE_AUTHKEY is empty or unset, Tailscale is skipped entirely.
#
# In both cases, OpenSSH is started so you can SSH in when Tailscale is active,
# or use the container's SSH server through other means.
#
# Env vars (injected via docker --env-file from .devcontainer/.env):
#   TAILSCALE_AUTHKEY  — optional. A reusable / ephemeral auth key from the
#                        Tailscale console. Leave empty to skip Tailscale.
#   PROJECT_NAME       — optional. Used as the Tailscale node hostname:
#                        vs-<PROJECT_NAME>. Only meaningful with Tailscale.
set -euo pipefail

# ── Tailscale check ───────────────────────────────────────────────────────────

if [[ -z "${TAILSCALE_AUTHKEY:-}" ]]; then
  echo "(tailscale) TAILSCALE_AUTHKEY is not set — skipping Tailscale setup."
  echo "(tailscale) Set it in .devcontainer/.env to join your tailnet on the next start."
else
  # — tailscaled daemon ———————————————————————————————————————————————————————

  if ! pgrep -x tailscaled > /dev/null 2>&1; then
    echo "(tailscale) Starting tailscaled..."
    sudo mkdir -p /var/run/tailscale /var/lib/tailscale
    sudo tailscaled \
      --state=/var/lib/tailscale/tailscaled.state \
      --socket=/var/run/tailscale/tailscaled.sock \
      >> /tmp/tailscaled.log 2>&1 &

    # Wait for the Unix socket to appear instead of sleeping a fixed amount.
    for i in $(seq 1 20); do
      [ -S /var/run/tailscale/tailscaled.sock ] && break
      sleep 0.5
    done

    if ! [ -S /var/run/tailscale/tailscaled.sock ]; then
      echo "(tailscale) ERROR: tailscaled socket did not appear in time. Check /tmp/tailscaled.log" >&2
      exit 1
    fi
  else
    echo "(tailscale) tailscaled is already running."
  fi

  # — tailscale up —————————————————————————————————————————————————————————————
  # --hostname uses PROJECT_NAME so the node shows up clearly in the admin
  # console. Falls back to the Docker hostname if PROJECT_NAME is unset.

  HOSTNAME="vs-${PROJECT_NAME:-devcontainer}"
  echo "(tailscale) Bringing Tailscale up as: ${HOSTNAME}"
  sudo tailscale up \
    --authkey="${TAILSCALE_AUTHKEY}" \
    --ssh \
    --advertise-tags=tag:vscode,tag:container \
    --hostname="${HOSTNAME}" \
    --accept-routes

  echo "(tailscale) Tailscale up. Node address: $(tailscale ip -4 2>/dev/null || echo 'pending')"

  # — MagicDNS —————————————————————————————————————————————————————————————————
  # Docker's --dns is static, so we set 100.100.100.100 dynamically only when
  # Tailscale is actually running. Prepended so tailnet names resolve first;
  # the static --dns=1.1.1.1 stays as fallback.

  if ! grep -q '^nameserver 100\.100\.100\.100$' /etc/resolv.conf 2>/dev/null; then
    sudo sed -i '1inameserver 100.100.100.100' /etc/resolv.conf
    echo "(tailscale) MagicDNS enabled (100.100.100.100)."
  fi
fi

# ── OpenSSH ───────────────────────────────────────────────────────────────────
# Installed by the sshd devcontainer feature.

sudo service ssh start 2>/dev/null || true
echo "(sshd) OpenSSH started (or was already running)."
