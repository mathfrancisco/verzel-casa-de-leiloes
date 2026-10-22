# Imagem única: API (Fastify + Socket.IO) servindo também o build do web.

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

# ---- build: instala tudo, compila web e api, separa dependências de produção da api
FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @leilao/web build \
 && pnpm --filter @leilao/api build \
 && pnpm --filter @leilao/api deploy --prod --legacy /out

# ---- runtime: só o necessário para rodar, como usuário não-root
FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /repo/apps/api/dist ./dist
COPY --from=build --chown=node:node /repo/apps/api/drizzle ./drizzle
COPY --from=build --chown=node:node /repo/apps/web/dist ./public
USER node
EXPOSE 3000
# As migrations rodam no início do processo (src/main.ts).
CMD ["node", "dist/main.js"]
