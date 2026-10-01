# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# NEXT_PUBLIC_* vars are inlined at build time. The browser reaches the backend
# same-origin through the reverse proxy, so the API base is the relative "/api".
ARG NEXT_PUBLIC_BACKEND_URL=/api
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
# Live transcription WebSocket — a relative path is resolved against the page's
# host (wss:// on https), routed by the reverse proxy to WhisperLiveKit.
ARG NEXT_PUBLIC_TRANSCRIPTION_URL=/asr
ENV NEXT_PUBLIC_TRANSCRIPTION_URL=$NEXT_PUBLIC_TRANSCRIPTION_URL
# Support page feedback form link (optional)
ARG NEXT_PUBLIC_SUBMIT_URL=
ENV NEXT_PUBLIC_SUBMIT_URL=$NEXT_PUBLIC_SUBMIT_URL
RUN npm run build

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["npm", "start"]
