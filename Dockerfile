FROM nginx:alpine AS frontend
COPY apps/client/dist/ /usr/share/nginx/client/
COPY apps/admin/dist/ /usr/share/nginx/admin/
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY deploy/nginx/api.conf /etc/nginx/snippets/api.conf

FROM node:24-bookworm-slim AS workspace
ENV CI=true
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=qqfeiche-rank-npm,target=/root/.npm,sharing=locked \
    npm install --global "$(node -p 'require("./package.json").packageManager')"

COPY apps/client/package.json ./apps/client/
COPY apps/admin/package.json ./apps/admin/
COPY apps/server/package.json ./apps/server/

FROM workspace AS server-deps
RUN --mount=type=cache,id=qqfeiche-rank-pnpm-store,target=/workspace/.pnpm-store,sharing=locked \
    --mount=type=cache,id=qqfeiche-rank-pnpm-metadata,target=/root/.cache/pnpm,sharing=locked \
    pnpm --filter @qqfeiche/server install --prod --frozen-lockfile \
        --config.cache-dir=/root/.cache/pnpm --config.enable-global-virtual-store=false

FROM node:24-bookworm-slim AS api
WORKDIR /app
COPY --from=server-deps /workspace/node_modules/ ./node_modules/
COPY --from=server-deps /workspace/apps/server/ ./apps/server/
COPY apps/server/src/ ./apps/server/src/
RUN install -d -o node -g node -m 0700 /app/data
USER node
EXPOSE 9433
CMD ["node", "apps/server/src/index.ts"]
