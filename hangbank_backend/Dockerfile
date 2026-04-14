# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app/hangbank_backend

COPY shared/ /app/shared/
COPY hangbank_backend/package*.json ./
RUN npm install

COPY hangbank_backend/ .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app/hangbank_backend

COPY --from=builder /app/hangbank_backend/package*.json ./
COPY --from=builder /app/hangbank_backend/node_modules ./node_modules
COPY --from=builder /app/hangbank_backend/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
