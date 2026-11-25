# Docker 部署更新

在本地仓库根目录运行 `pnpm deploy:prod`。脚本在本地安装依赖、构建两套前端，并生成 `linux/amd64` 的 Nginx 和 API 镜像。两个镜像使用同一个发布版本号，压缩后和 Compose 配置一起通过 SSH 上传。生产机导入并校验镜像，用 Compose 启动容器。

## 首次配置

本地需要仓库指定的 Node.js 和 pnpm、Docker Buildx、SSH、SCP 和 gzip。生产机需要 Docker、支持 `up --wait` 的 Compose v2，以及 Linux 的 `flock`。SSH 账号须能写入部署目录并运行 Docker，服务器公钥须已核实并加入本地 `known_hosts`。

在本地仓库根目录创建 `.env.deploy.local`，该文件由 Git 忽略。`DEPLOY_HOST` 可以是 SSH 地址或 `~/.ssh/config` 中的别名。使用别名或 SSH agent 提供密钥时，可以省略 `DEPLOY_SSH_KEY`。

```dotenv
DEPLOY_HOST=deploy@your-server
DEPLOY_DIR=/opt/apps/qqfeiche-rank
DEPLOY_SSH_KEY=~/.ssh/your-deploy-key
```

已有生产环境继续使用原部署目录中的 `.env.production`、SQLite 卷 `qqfeiche-rank_sqlite-data` 和公共网关的 `gateway-net`。新服务器应先准备部署目录、公共网关和 `gateway-net`，并将域名指向网关。首次启动空数据库时，在服务器上的 `.env.production` 设置 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD`。使用 COS 时，在同一个文件配置 `COS_*` 变量，放行管理端来源，并为用户端提供 HTTPS 的资源地址。 [网关与证书配置](../README.md#接入公共网关) · [COS 配置](../README.md#赛道管理)

## 发布

```bash
pnpm deploy:prod
```

脚本导入并确认两个镜像后才替换容器。Compose 等待 API 就绪，随后本地脚本通过公共域名检查两个首页、`/api/health` 和 `/api/public/records?page=1`。脚本会输出新版本和上一版本。第一次切换时，脚本会给原有容器正在使用的镜像补一个 `before-` 开头的版本，供首次回滚使用。

上线检查通过后，脚本按版本号清理本次在本地构建的两个镜像。生产机保留镜像用于回滚。如果本地清理失败，脚本会提示，发布结果仍为成功。

生产机在 `.releases/` 下保存每版的 Compose 配置。`.releases/current` 记录最近一次通过启动检查的版本，首次切换前会先记录原有版本。部署目录中的 `compose.yaml` 指向所记录版本的配置。镜像归档在导入后清理，已导入的镜像标签保留在 Docker 中。例行检查可在生产部署目录执行以下命令。

```bash
RELEASE_TAG="$(readlink .releases/current)" docker compose -p qqfeiche-rank -f compose.yaml ps
```

## 回滚应用

在本地运行以下命令，把示例版本替换成发布时输出的上一版本。

```bash
pnpm deploy:prod --rollback 2026-11-25-a1b2c3d4
```

回滚使用生产机上保留的镜像和 Compose 配置，并继续使用现有 SQLite 卷。发布包含数据库迁移时，发布前备份 SQLite，回滚前确认旧应用兼容当前数据库结构。

如果脚本报告公网检查失败，容器已经切换，先看脚本标出的失败项。若 Compose 的启动检查失败，容器可能已经部分切换，脚本会输出查看容器日志的命令。
