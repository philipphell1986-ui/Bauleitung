# Stage 1: build frontend
FROM node:20-bookworm-slim AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: production image
FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends gosu \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/code

# Backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY backend/ ./

# Frontend static (from stage 1)
COPY --from=frontend-build /build/dist ./public

# Start script
COPY start.sh /app/code/start.sh
RUN chmod +x /app/code/start.sh

EXPOSE 8000

CMD [ "/app/code/start.sh" ]
