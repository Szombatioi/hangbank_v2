# Stage 1: Build
# Debian slim (glibc): onnxruntime-node (pulled in by @ricky0123/vad-node and used
# by the speaker check) ships prebuilt glibc binaries — Alpine/musl is unsupported.
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# The speaker check loads ./onnx/ecapa_tdnn.onnx relative to the working dir
COPY --from=builder /app/onnx/ecapa_tdnn.onnx ./onnx/ecapa_tdnn.onnx

EXPOSE 3002

CMD ["node", "dist/main"]
