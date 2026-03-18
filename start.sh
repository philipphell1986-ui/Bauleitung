#!/bin/bash
set -eu

# Writable dirs: only /tmp, /run, /app/data. DB and uploads must live in /app/data.
export DATABASE_PATH="/app/data/bauleitung.db"
export UPLOAD_DIR="/app/data/uploads"
export PUBLIC_DIR="/app/code/public"
export PORT="8000"

# JWT secret: use env if set (e.g. Cloudron), otherwise generate and persist in /app/data
if [ -z "${JWT_SECRET:-}" ]; then
  JWT_FILE="/app/data/jwt_secret"
  if [ -f "$JWT_FILE" ]; then
    export JWT_SECRET="$(cat "$JWT_FILE")"
  else
    export JWT_SECRET="$(openssl rand -base64 32)"
    echo "$JWT_SECRET" > "$JWT_FILE"
    chmod 600 "$JWT_FILE"
  fi
fi

mkdir -p /app/data/uploads

exec node /app/code/src/index.js
