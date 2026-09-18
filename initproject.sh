#!/usr/bin/env bash
# =============================================================================
# initproject.sh  —  Bootstrap a new project with the devcontainer-template
#
# One-liner:
#   curl -fsSL https://raw.githubusercontent.com/ciberado/devcontainer-template/main/initproject.sh | bash
#
# Or locally:
#   bash initproject.sh
#
# What it does:
#   1. Creates a project directory (default: current directory)
#   2. Initialises a git repo (if not already one)
#   3. Prompts for local git user.name / user.email if not globally set
#   4. Runs `git subtree add` to pull in the devcontainer template
#   5. Optionally configures Tailscale and writes .devcontainer/.env
#   6. Prints the final `devcontainer up` command
# =============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
REPO_URL="https://github.com/ciberado/devcontainer-template.git"
TEMPLATE_PREFIX=".devcontainer"

# ── Helpers ───────────────────────────────────────────────────────────────────

bold()   { printf "\033[1m%s\033[0m" "$1"; }
green()  { printf "\033[32m%s\033[0m" "$1"; }
yellow() { printf "\033[33m%s\033[0m" "$1"; }
step()   { printf "\n── %s\n" "$(bold "$1")"; }

# ── Banner ────────────────────────────────────────────────────────────────────
clear 2>/dev/null || true
echo "$(bold '===================================================')"
echo "$(bold '  devcontainer-template  —  Project Bootstrap')"
echo "$(bold '===================================================')"
echo ""

# ── Step 1 — Project directory ────────────────────────────────────────────────
step "Step 1: Project directory"

printf "  %s Directory for the new project [%s]: " "$(yellow '?')" "$(bold '.')" >&2
read -r PROJECT_DIR </dev/tty
PROJECT_DIR="${PROJECT_DIR:-.}"
PROJECT_DIR="${PROJECT_DIR/#\~/$HOME}"

mkdir -p "$PROJECT_DIR"
PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"
cd "$PROJECT_DIR"
echo "  $(green '✔') Using: ${PROJECT_DIR}"

# ── Step 2 — Project name ─────────────────────────────────────────────────────
step "Step 2: Project name"

DEFAULT_NAME="$(basename "$PROJECT_DIR")"
printf "  %s Project name [%s]: " "$(yellow '?')" "$(bold "${DEFAULT_NAME}")" >&2
read -r PROJECT_NAME </dev/tty
PROJECT_NAME="${PROJECT_NAME:-$DEFAULT_NAME}"
echo "  $(green '✔') Using: ${PROJECT_NAME}"

# ── Step 3 — Git init & user config ───────────────────────────────────────────
step "Step 3: Git initialization"

IS_NEW_REPO=false

if [ -d ".git" ]; then
  echo "  $(green '✔') Git repository already exists."
else
  git init
  IS_NEW_REPO=true
  echo "  $(green '✔') Git repository initialised."
fi

# Local git user.name if global is unset or empty
GLOBAL_NAME="$(git config --global user.name 2>/dev/null || true)"
if [ -n "$GLOBAL_NAME" ]; then
  echo "  $(green '✔') Using global git user.name: ${GLOBAL_NAME}"
else
  printf "  %s  Your name (for local git config): " "$(yellow '?')" >&2
  read -r GIT_USERNAME </dev/tty
  git config user.name "$GIT_USERNAME"
  echo "  $(green '✔') Local git user.name set."
fi

# Local git user.email if global is unset or empty
GLOBAL_EMAIL="$(git config --global user.email 2>/dev/null || true)"
if [ -n "$GLOBAL_EMAIL" ]; then
  echo "  $(green '✔') Using global git user.email: ${GLOBAL_EMAIL}"
else
  printf "  %s  Your email (for local git config): " "$(yellow '?')" >&2
  read -r GIT_EMAIL </dev/tty
  git config user.email "$GIT_EMAIL"
  echo "  $(green '✔') Local git user.email set."
fi

# Seed the repo so git subtree add has a HEAD to merge into
if $IS_NEW_REPO; then
  git commit --allow-empty -m "chore: initial commit"
  echo "  $(green '✔') Empty initial commit created (required for git subtree)."
fi

# ── Step 4 — git subtree add ──────────────────────────────────────────────────
step "Step 4: Adding devcontainer template"

if [ -d "${TEMPLATE_PREFIX}" ]; then
  echo "  $(yellow '⚠') Directory '${TEMPLATE_PREFIX}' already exists — skipping."
  echo "      Run 'git subtree pull' to update."
else
  echo "  Adding template from $(bold "${REPO_URL}") …"
  git subtree add --prefix="${TEMPLATE_PREFIX}" "${REPO_URL}" main --squash
  echo "  $(green '✔') Template added under '${TEMPLATE_PREFIX}/'."
fi

# ── Step 5 — Tailscale auth key (optional) ────────────────────────────────────
step "Step 5: Tailscale configuration (optional)"

echo "  Leave the auth key empty to skip Tailscale setup entirely."
printf "  %s  Tailscale auth key (input hidden): " "$(yellow '?')" >&2
read -r -s TAILSCALE_AUTHKEY </dev/tty
echo ""

TS_HOSTNAME=""
if [ -n "$TAILSCALE_AUTHKEY" ]; then
  printf "  %s Tailscale node name [%s]: " "$(yellow '?')" "$(bold "${PROJECT_NAME}")" >&2
  read -r TS_HOSTNAME </dev/tty
  TS_HOSTNAME="${TS_HOSTNAME:-$PROJECT_NAME}"
  echo "  $(green '✔') Tailscale will be enabled with hostname: vs-${TS_HOSTNAME}"
else
  echo "  $(green '✔') Tailscale skipped."
fi

# ── Step 6 — Write .devcontainer/.env ─────────────────────────────────────────
step "Step 6: Creating .env file"

ENV_FILE="${TEMPLATE_PREFIX}/.env"

if [ -f "$ENV_FILE" ]; then
  echo "  $(yellow '⚠') ${ENV_FILE} already exists — not overwriting."
elif [ -n "$TAILSCALE_AUTHKEY" ]; then
  printf 'TAILSCALE_AUTHKEY=%s\nPROJECT_NAME=%s\n' "$TAILSCALE_AUTHKEY" "$TS_HOSTNAME" > "$ENV_FILE"
  echo "  $(green '✔') ${ENV_FILE} created with your Tailscale key."
  echo "      (The key is stored in plain text — .env is already in .gitignore.)"
else
  touch "$ENV_FILE"
  echo "  $(green '✔') ${ENV_FILE} created $(yellow '(empty — Tailscale will be skipped)')."
fi

# ── Done — next steps ─────────────────────────────────────────────────────────
echo ""
echo "$(bold '===================================================')"
echo "$(bold '  All set!  Next steps:')"
echo "$(bold '===================================================')"
echo ""
echo "  cd ${PROJECT_DIR}"
echo ""
echo "  Start the devcontainer:"
echo "    $(green 'devcontainer up --workspace-folder .')"
echo ""
echo "  Open a shell inside it:"
echo "    $(green 'devcontainer exec --workspace-folder . bash')"
echo ""

if [ -n "$TAILSCALE_AUTHKEY" ]; then
  echo "  SSH in from any device on your tailnet:"
  echo "    $(green "ssh dev@vs-${TS_HOSTNAME}")"
  echo ""
fi

if [ -z "$TAILSCALE_AUTHKEY" ]; then
  echo "  To enable Tailscale later, edit ${ENV_FILE}:"
  echo "    TAILSCALE_AUTHKEY=tskey-auth-xxxxxxxx"
  echo "    PROJECT_NAME=${PROJECT_NAME}"
  echo ""
fi

echo "  Happy coding! 🐳"
