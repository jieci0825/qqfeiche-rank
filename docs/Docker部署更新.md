# Docker 部署更新

发布前，先从本地上传本次改动。已配置本地部署脚本时，在本地仓库根目录运行 `node scripts/deploy-local.js`。也可以按 [README 的 Docker 部署步骤](../README.md#docker-生产部署)手动上传。

当前生产服务器为 `linux/amd64`。发布涉及 API 时，在本地构建 API 镜像并上传。服务器构建 API 会执行 `pnpm install`，内存紧张时可能导致磁盘 I/O 等待和其他容器响应超时。

## 构建并上传 API 镜像

首次部署、更新整个项目或只更新 API 时，在本地仓库根目录执行。将 `deploy_host` 改为可登录部署服务器的 SSH 地址或别名。本地需要 Docker Buildx。

```bash
deploy_host=deploy@your-server
api_image=qqfeiche-rank-qqfeiche-api:latest

(
    set -o pipefail
    docker buildx build --platform linux/amd64 --target api --progress plain --load \
        --tag "$api_image" . &&
        docker image save "$api_image" | gzip -1 | ssh "$deploy_host" docker image load
)
```

看到 `Loaded image` 后，登录服务器并进入 `/opt/apps/qqfeiche-rank`，按发布范围执行下面的命令。

## 首次启动或更新整个项目

确认 API 镜像已上传，两套前端 `dist` 已同步。首次部署还需准备 `.env.production` 和 `gateway-net`。先单独构建 Nginx，再启动两个服务。

```bash
docker compose --progress plain build qqfeiche-nginx &&
    docker compose up -d --no-build --pull never
```

## 只更新前端

只发布用户端（client）、管理端（admin）或项目 Nginx 配置时执行。构建 Nginx 镜像时会读取两套前端 `dist`，只更新一端时，服务器上要保留另一端的构建产物。

```bash
docker compose up -d --build --no-deps qqfeiche-nginx
```

## 只更新 API

只发布服务端源码或服务端依赖改动时，上传新镜像后执行。

```bash
docker compose up -d --no-build --pull never --no-deps qqfeiche-api
```
