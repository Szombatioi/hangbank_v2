# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app/auth

COPY shared/ /app/shared/
COPY auth/package*.json ./
RUN npm install

COPY auth/ .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app/auth

COPY --from=builder /app/auth/package*.json ./
COPY --from=builder /app/auth/node_modules ./node_modules
COPY --from=builder /app/auth/dist ./dist

EXPOSE 8888

CMD ["node", "dist/main"]
