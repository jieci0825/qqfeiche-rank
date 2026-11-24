# Docker 部署更新

发布前，先从本地上传本次改动。已配置本地部署脚本时，在本地仓库根目录运行 `node scripts/deploy-local.js`。也可以按 [README 的 Docker 部署步骤](../README.md#docker-生产部署)手动上传。

上传完成后，登录服务器并进入 `/opt/apps/qqfeiche-rank`，按发布范围选择下面的一条命令。

## 首次启动或更新整个项目

首次部署时，在 `.env.production` 和 `gateway-net` 准备完成后执行。日常发布同时改动前端和 API，或修改影响两个服务的 Docker 配置时，也用这条命令。

```bash
docker compose up -d --build
```

## 只更新前端

只发布用户端（client）、管理端（admin）或项目 Nginx 配置时执行。构建 Nginx 镜像时会读取两套前端 `dist`，只更新一端时，服务器上要保留另一端的构建产物。

```bash
docker compose up -d --build --no-deps qqfeiche-nginx
```

## 只更新 API

只发布服务端源码或服务端依赖改动时执行。Compose 会构建并更新 `qqfeiche-api` 服务。

```bash
docker compose up -d --build --no-deps qqfeiche-api
```
