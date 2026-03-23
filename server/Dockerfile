FROM node:20-bookworm-slim

WORKDIR /app

COPY . .

RUN if [ -d node_modules ]; then npm prune --omit=dev --no-audit --no-fund; else npm ci --omit=dev --no-audit --no-fund; fi
RUN mkdir -p uploads/leases uploads/repairs

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "server.js"]
