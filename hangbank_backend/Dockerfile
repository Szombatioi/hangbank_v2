# Stage 1: Build
# Node 22 is required: the backend imports archiver v8 (ESM-only) via require(),
# which needs Node >= 22.12.
FROM node:22-alpine AS builder

WORKDIR /app/hangbank_backend

# @hangbank/shared is referenced via a tsconfig path (../shared) — needed at build time
COPY shared/ /app/shared/
COPY hangbank_backend/package*.json ./
RUN npm install

COPY hangbank_backend/ .
RUN npm run build

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app/hangbank_backend
ENV NODE_ENV=production

COPY --from=builder /app/hangbank_backend/package*.json ./
COPY --from=builder /app/hangbank_backend/node_modules ./node_modules
COPY --from=builder /app/hangbank_backend/dist ./dist

EXPOSE 3000

# Output nests under dist/src because the shared types path lives outside src/
CMD ["node", "dist/src/main"]
