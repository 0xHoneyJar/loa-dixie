FROM node:22-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# Path resolution: WORKDIR=/app, package.json says file:../../loa-hounfour
# From /app, ../../loa-hounfour resolves to /loa-hounfour
# So we COPY .hounfour-build to /loa-hounfour to satisfy the file: reference.

# --- Dependencies ---
FROM base AS deps
COPY .hounfour-build /loa-hounfour
COPY app/package.json app/package-lock.json* ./
# --install-links dereferences file: symlinks into real directories.
# Explicit conditional: npm ci for lockfile integrity when present, npm install otherwise.
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --install-links; \
    else \
      npm install --omit=dev --install-links; \
    fi

# --- Build ---
FROM base AS build
# Both stages need hounfour: npm install --install-links resolves the file: reference
# at install time, and multi-stage builds have independent filesystems.
COPY .hounfour-build /loa-hounfour
COPY app/package.json app/package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci --install-links; \
    else \
      npm install --install-links; \
    fi
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
