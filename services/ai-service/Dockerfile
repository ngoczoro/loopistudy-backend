# Debian slim, not Alpine: the embedding runtime (onnxruntime-node, phase 2) needs glibc.
FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    PORT=5100 \
    TRANSFORMERS_CACHE=/app/.hf-cache

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

# Run as the image's unprivileged "node" user; the model cache is a volume it can write.
RUN mkdir -p /app/.hf-cache && chown -R node:node /app
USER node

EXPOSE 5100

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5100)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
