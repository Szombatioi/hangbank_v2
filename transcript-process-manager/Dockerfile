# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3004

# Spawns the batch workers (workers/ image) through the host's Docker socket,
# so /var/run/docker.sock must be mounted and the process runs as root.
CMD ["node", "dist/main"]
