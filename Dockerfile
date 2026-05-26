# syntax=docker/dockerfile:1.7
# ─── Build stage ──────────────────────────────────────────────────────────
FROM node:22.13.0-slim AS builder

WORKDIR /app

# Sharp needs libvips (pulled as a transitive dep). Keep build stage thin —
# only what's needed for `expo export --platform web`.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

RUN npx expo export --platform web

# ─── Runtime stage ────────────────────────────────────────────────────────
FROM node:22.13.0-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Bring over only what's needed at runtime:
# - dist/   → bundled client + server (incl. /api/generate)
# - node_modules → expo + openai + sharp dependencies
# - package.json → for `npx expo serve`
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/app.json ./app.json

EXPOSE 8080

CMD ["npx", "expo", "serve", "dist", "--port", "8080"]
