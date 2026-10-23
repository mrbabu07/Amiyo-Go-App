FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/migration/package.json packages/migration/package.json
COPY packages/observability/package.json packages/observability/package.json
RUN npm ci
COPY . .
RUN npm run prisma:generate && npm run build
RUN rm -rf node_modules \
    && npm ci --omit=dev --workspace @amiyo/worker --include-workspace-root \
    && npm run prisma:generate \
    && npm cache clean --force

FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS runtime
ARG RELEASE_COMMIT_SHA=unknown
LABEL org.opencontainers.image.source="https://github.com/mrbabu07/Amiyo-Go-App" \
      org.opencontainers.image.revision=$RELEASE_COMMIT_SHA
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
COPY --from=build /app/packages ./packages
RUN chown -R node:node /app
USER node
EXPOSE 4002
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+(process.env.WORKER_HEALTH_PORT||4002)+'/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/worker/dist/index.js"]
