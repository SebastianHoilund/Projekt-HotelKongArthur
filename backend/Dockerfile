FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx tsc
# tsc kopierer ikke .sql-filer, så migrationerne skal med over i dist.
RUN mkdir -p dist/db && cp -r src/db/migrations dist/db/migrations

FROM build AS test
ENV NODE_ENV=test
CMD ["npm", "run", "test:integration"]

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
# Lang start-period: backenden kører migrationer og seed, før den svarer.
HEALTHCHECK --interval=5s --timeout=3s --start-period=60s --retries=12 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "dist/server.js"]
