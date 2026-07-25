#!/usr/bin/env bash
# Starts the Flask backend and the Vite dev server together (macOS / Linux).
# Ctrl-C stops both.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo "   HONEYPOT SECURITY DASHBOARD"
echo "   Starting Frontend + Backend"
echo "========================================"

cleanup() {
  echo ""
  echo "Shutting down..."
  kill 0 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "[1/2] Starting backend (Flask) on :5000..."
(
  cd "$ROOT/backend"
  if [ -d "venv" ]; then
    # shellcheck disable=SC1091
    source venv/bin/activate
  fi
  python app.py
) &

sleep 3

echo "[2/2] Starting frontend (Vite) on :3000..."
echo ""
echo "========================================"
echo "  Dashboard: http://localhost:3000"
echo "  Backend:   http://localhost:5000"
echo "  Sign up on first run to create an admin account."
echo "========================================"
echo ""

cd "$ROOT"
npm run dev
