# Build from the repo root: docker build -f apps/server/Dockerfile -t orava-server .

FROM node:24-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/contracts/package.json packages/contracts/
COPY apps/server/package.json apps/server/
RUN npm ci --ignore-scripts -w @orava/server -w @orava/core -w @orava/contracts --include-workspace-root
COPY packages/core packages/core
COPY packages/contracts packages/contracts
COPY apps/server apps/server
RUN npm run build:packages && npm run build -w @orava/server

FROM node:24-slim AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/contracts/package.json packages/contracts/
COPY apps/server/package.json apps/server/
RUN npm ci --ignore-scripts --omit=dev --omit=optional -w @orava/server

FROM node:24-slim
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=deps --chown=node:node /repo/node_modules node_modules
COPY --from=deps --chown=node:node /repo/package.json package.json
COPY --from=build --chown=node:node /repo/packages/core/package.json packages/core/package.json
COPY --from=build --chown=node:node /repo/packages/core/dist packages/core/dist
COPY --from=build --chown=node:node /repo/packages/contracts/package.json packages/contracts/package.json
COPY --from=build --chown=node:node /repo/packages/contracts/dist packages/contracts/dist
COPY --from=build --chown=node:node /repo/apps/server/package.json apps/server/package.json
COPY --from=build --chown=node:node /repo/apps/server/dist apps/server/dist
USER node
WORKDIR /app/apps/server
EXPOSE 8080
CMD ["node", "dist/main.js"]
