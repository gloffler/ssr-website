# ---------- Builder: Astro build ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Lockfiles für besseren Cache nutzen
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm ci

# Projektdateien kopieren und builden
COPY . .
RUN npm run build

# ---------- Runtime: Node Server ----------
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
# nur Prod-Abhängigkeiten
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Build-Artefakte aus Builder
COPY --from=builder /app/dist ./dist

# Astro Node-Adapter erwartet diesen Einstiegspunkt
EXPOSE 3000
CMD ["node", "./dist/server/entry.mjs"]
