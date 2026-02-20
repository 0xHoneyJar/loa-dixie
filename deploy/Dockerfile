FROM node:22-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# --- Dependencies ---
FROM base AS deps
COPY app/package.json app/package-lock.json* ./
RUN npm ci --omit=dev

# --- Build ---
FROM base AS build
COPY app/package.json app/package-lock.json* ./
RUN npm ci
COPY app/tsconfig.json ./
COPY app/src/ ./src/
RUN npm run build

# --- Runtime ---
FROM base AS runtime
RUN addgroup --system dixie && adduser --system --ingroup dixie dixie

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY app/package.json ./

USER dixie
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/api/health').then(r=>{if(!r.ok)throw 1}).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
