#!/bin/bash
set -eu

# Writable dirs: only /tmp, /run, /app/data. DB and uploads must live in /app/data.
export DATABASE_PATH="/app/data/bauleitung.db"
export UPLOAD_DIR="/app/data/uploads"
export PUBLIC_DIR="/app/code/public"
export PORT="8000"

mkdir -p /app/data/uploads
chown -R node:node /app/data

exec /usr/bin/gosu node node /app/code/src/index.js
