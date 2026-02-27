FROM node:25-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# --- Dependencies ---
FROM base AS deps
COPY app/package.json app/package-lock.json ./
RUN npm ci --omit=dev

# --- Build ---
FROM base AS build
COPY app/package.json app/package-lock.json ./
# NODE_ENV=production (from base) causes npm to skip devDependencies.
# Build needs @types/pg and other type declarations, so include dev deps here.
RUN npm ci --include=dev
COPY app/tsconfig.json app/tsconfig.build.json ./
COPY app/src/ ./src/
RUN npx tsc -p tsconfig.build.json
# tsc doesn't copy non-TS files; copy only UP migrations (exclude _down.sql rollbacks)
RUN mkdir -p dist/db/migrations && \
    find src/db/migrations -name '*.sql' ! -name '*_down.sql' -exec cp {} dist/db/migrations/ \;

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
