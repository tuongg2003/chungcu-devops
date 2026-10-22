# ---- Stage 1: cai dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# ---- Stage 2: image chay that (non-root) ----
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY views ./views
COPY public ./public
# Hardening: chay bang user "node" (uid 1000), khong dung root
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "src/server.js"]
