# qqfeiche-rank

QQ 飞车手游国服记录榜。仓库采用 pnpm workspace 管理，根目录下是三个独立项目：

```text
qqfeiche-rank/
├── client/     # C 端（Vue 3 + Vite）
├── admin/      # 后台管理（Vue 3 + Vite）
├── server/     # API 服务端（Koa）
├── docs/       # 需求、数据模型、核心流程
├── package.json
└── pnpm-workspace.yaml
```

每个项目都有自己的 `package.json`、依赖、配置和 `src`，可以单独安装、启动和构建。

## 项目说明

### client：C 端

- Vue 3 + TypeScript + Vite
- Vue Router、Pinia
- Element Plus 按需引入
- Sass 样式，统一放在 `client/src/styles`
- 开发端口：`9431`
- 页面：`/records`、`/rankings`（国服排行：车手 / 赛车 / 宠物）、`/teams`、`/stats`，`/` 重定向到 `/records`，旧地址 `/drivers` 重定向到 `/rankings`。
- 当前路由页面已清空，保留 50px header 和 main 布局，等待接入新 UI。
- 示例数据保留在 `apps/client/src/data/tracks.ts`，尚未接入业务 API。

### admin：后台管理

- Vue 3 + TypeScript + Vite
- Vue Router、Pinia
- Element Plus 按需引入
- Sass 样式，统一放在 `admin/src/styles`
- 开发端口：`9432`
- 访问地址：`http://localhost:9432/`
- 页面：`/`、`/tracks`、`/tags`、`/people`、`/records`、`/logs`、`/login`
- 登录后可进入概览和赛道管理。赛道管理支持搜索、状态筛选、新增、编辑、启用、禁用和归档。

### server：服务端

- Koa API 服务
- `GET /api/health`
- 默认监听 `127.0.0.1:9433`，可通过 `HOST` 和 `PORT` 配置
- 使用 Node 原生 TypeScript 类型剥离运行，不需要额外编译服务端

#### 服务端分层

- `src/index.ts` 装配配置、数据库、认证服务并监听端口，`src/app.ts` 组装 Koa 中间件和路由。
- `src/modules/auth/auth.routes.ts` 处理 HTTP 输入、Cookie 和响应，`requireAdmin` 可用于其他管理接口的 Bearer 鉴权。
- `src/modules/auth/auth.service.ts` 编排登录、令牌轮换和登出，只通过 `AuthStore` 访问持久层。密码校验在写事务之外执行，提交时重新确认账号和锁定状态。
- `src/modules/auth/sqlite-auth.store.ts` 实现 SQLite 查询和写入，`src/db` 负责连接及版本化迁移。

#### 管理员认证

本地首次启动前，在 `apps/server/.env` 中设置 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD`。服务端启动时自动读取此文件，已设置的进程环境变量优先。服务会在空库中创建管理员，已有账号时直接复用数据库中的凭据。数据库默认为 `apps/server/data/qqfeiche.sqlite`，可通过 `DATABASE_PATH` 指定持久化路径。

| 接口 | 请求 | 成功响应 |
| --- | --- | --- |
| `POST /api/admin/auth/login` | JSON `{ username, password }` | `200`，签发双令牌 |
| `POST /api/admin/auth/refresh` | 浏览器携带 Refresh Cookie | `200`，轮换双令牌 |
| `GET /api/admin/auth/me` | `Authorization: Bearer <accessToken>` | `200`，返回 `{ admin, roles, permissions, menus }` |
| `POST /api/admin/auth/logout` | 可携带 Refresh Cookie 或 Bearer Token | `204`，清除 Cookie 并撤销匹配到的有效会话 |

登录和刷新响应的 JSON 含 `admin`（`id`、`username`、`displayName`）、`accessToken`、`accessExpiresAt` 和 `refreshExpiresAt`。Access Token 保存在前端内存，有效期最多 15 分钟。Refresh Token 由 `admin_refresh` Cookie 下发，设置 `HttpOnly`、`SameSite=Lax`、`Path=/api/admin/auth`，会话从登录起最多持续 7 天。服务端仅保存令牌摘要，每次刷新立即替换当前两个摘要。前端应合并同一会话的并发刷新，并将刷新和登出串行化。

认证错误返回 `{ code, message }`。凭据错误及令牌失效返回 `401`。同一账号连续输错 5 次会锁定 15 分钟，同一来源 IP 在 15 分钟内最多提交 20 次登录，两项限制均返回 `429` 和 `Retry-After`。开发环境默认接受 `http://localhost:9432` 和 `http://127.0.0.1:9432` 发起的认证写请求，可用 `ADMIN_ORIGIN` 指定其他来源。

#### 后台权限管理

管理员通过角色获得权限，多个角色的权限取并集。服务端在每次请求时检查权限，会话无效返回 `401`，权限不足返回 `403`。

超级管理员是迁移创建的唯一内置角色，固定编码为 `super-admin`。鉴权时从权限注册表读取全部权限，新增注册权限自动生效。角色接口通过 `isSystem` 标记内置角色，拦截编辑、删除及权限分配，SQLite 触发器同时保护角色记录。首次接入 RBAC 的已有数据库优先绑定 ID 最小的启用账号，新数据库绑定首次启动创建的账号。超级管理员可以将角色绑定给其他账号，系统要求至少保留一个启用的超级管理员。

`/api/admin/auth/me` 的 `roles` 为 `{ id, code, name, description }` 数组，`permissions` 为权限码数组，`menus` 为可见菜单树。每个菜单包含 `id`、`key`、`parentId`、`title`、`path`、`icon`、`sortOrder`、`isVisible`、`permissionCode` 和 `children`。隐藏目录会隐藏整个分支。记录管理、车手管理、赛车管理和宠物管理预置菜单和查看权限，业务接口随各模块实现。

以下路径均以 `/api/admin` 为前缀，请求均携带 Bearer Access Token。管理端的用户管理、角色管理和菜单管理页面从 `@/api` 调用这些接口，复用现有会话续签和错误处理。

| 方法和路径 | 权限码 | JSON 请求和成功响应 |
| --- | --- | --- |
| `GET /users` | `users:read` | 返回 `{ users }`，用户项包含 `roleIds`、`isActive` 和登录时间 |
| `POST /users` | `users:create` | `{ username, displayName, password }`，返回 `201 { user }` |
| `PUT /users/:id` | `users:update` | `{ displayName }`，返回 `{ user }` |
| `POST /users/:id/enable` | `users:enable` | 返回 `{ user }` |
| `POST /users/:id/disable` | `users:disable` | 返回 `{ user }` |
| `POST /users/:id/reset-password` | `users:reset-password` | `{ password }`，返回 `204` |
| `GET /users/assignable-roles` | `users:assign-roles` | 返回 `{ roles }`，供用户角色选择使用 |
| `PUT /users/:id/roles` | `users:assign-roles` | `{ roleIds }`，替换角色绑定并返回 `{ user }` |
| `GET /roles` | `roles:read` | 返回 `{ roles }`，角色项包含 `isSystem` 和权限码数组 `permissions` |
| `POST /roles` | `roles:create` | `{ code, name, description }`，返回 `201 { role }` |
| `PUT /roles/:id` | `roles:update` | `{ name, description }`，返回 `{ role }` |
| `DELETE /roles/:id` | `roles:delete` | 返回 `204` |
| `GET /permissions` | `roles:read` | 返回 `{ permissions }`，每项包含 `code`、`menuId`、`label`、`kind` |
| `PUT /roles/:id/permissions` | `roles:assign-permissions` | `{ permissions }`，替换权限码并返回 `{ role }` |
| `GET /menus` | `menus:read` | 返回 `{ menus }`，包含隐藏菜单的完整菜单树 |
| `PUT /menus/:id` | `menus:update` | `{ title, icon, sortOrder, isVisible }`，返回 `{ menu }` |

用户停用和密码重置会撤销该用户的现有会话。角色仍被绑定时删除返回 `409`。停用最后一个启用的超级管理员或移除其超级管理员角色也返回 `409`。

#### 赛道管理

赛道接口均需要 `Authorization: Bearer <accessToken>`。新增、编辑和归档会写入操作日志，归档后的赛道仍保留在管理列表中。

| 接口 | 权限码 | 用途 |
| --- | --- | --- |
| `GET /api/admin/tracks` | `tracks:read` | 按赛道名称排序，返回 `{ tracks }` |
| `POST /api/admin/tracks` | `tracks:create` | 新增赛道，返回 `{ track }` |
| `PUT /api/admin/tracks/:id` | `tracks:update` | 修改赛道，返回 `{ track }` |
| `POST /api/admin/tracks/:id/archive` | `tracks:archive` | 归档赛道，返回 `204` |

新增和修改接受 JSON `{ name, stars?, status?, coverUploadTicket? }`。星级 `stars` 可传 1 到 7 的整数或 `null`，修改时省略则保留原值。赛道响应包含 `stars`，未录入时为 `null`。

状态 `status` 可传 `active`（启用）或 `disabled`（禁用）。省略时，新赛道默认启用，已有赛道保留原状态。归档须使用归档接口，已归档赛道的状态固定为 `archived`。

省略 `coverUploadTicket` 则保留原封面（新增时无封面），传 `null` 则移除封面，传上传凭证则设置新封面。赛道响应包含 `coverFileId` 和用于展示的 `coverUrl`，无封面时两者均为 `null`。

#### 赛道封面直传 COS

赛道表单支持预览、选择、更换和移除封面，不接受手填地址。保存时，浏览器先向 API 申请 5 分钟有效的上传签名，再将图片直接 POST 到 COS，随后提交赛道资料和上传凭证。服务端确认文件大小和图片文件头后，在同一数据库事务内将对象 Key（形如 `qqfeiche/tracks/covers/<uuid>.<ext>`）及文件元数据登记到 `files`，并写入 `tracks.cover_file_id`。读取时根据 `COS_PUBLIC_BASE_URL` 生成展示地址。更换或移除封面不会删除原文件。支持 JPEG、PNG、WebP，单张最大 5 MB。

| 接口 | JSON 请求 | 成功响应 |
| --- | --- | --- |
| `POST /api/admin/tracks/cover/upload` | `{ size, contentType, originalName? }`，大小单位为字节 | `{ uploadUrl, fields, ticket }` |

申请上传要求后台会话具备 `tracks:create` 或 `tracks:update`。浏览器先将 `fields` 放入表单，再将图片作为最后一个 `file` 字段提交到 `uploadUrl`，最后把 `ticket` 作为 `coverUploadTicket` 随赛道保存请求提交。

在服务端环境变量或 `apps/server/.env` 配置：

```dotenv
COS_SECRET_ID=<CAM 子账号 SecretId>
COS_SECRET_KEY=<CAM 子账号 SecretKey>
COS_BUCKET=assets-125xxxxxxxx
COS_REGION=ap-guangzhou
COS_PUBLIC_BASE_URL=https://assets.example.com/
```

- 五项均未配置时，仍可管理赛道资料，但不能上传新封面，也不能生成已存对象 Key 的访问地址。启用 COS 上传时需一次配置齐全。
- 从旧表结构升级时不会转存旧封面，赛道资料保留，可在后台重新上传封面。
- CAM 子账号需要目标桶 `qqfeiche/tracks/covers/*` 的 `cos:PostObject` 和 `cos:GetObject` 权限。使用未启用版本控制的存储桶，使上传表单中的禁止覆盖设置生效。
- 存储桶 CORS 放行后台页面来源的 `POST`，例如生产环境的 `ADMIN_ORIGIN` 或本地的 `http://localhost:9432`。
- `COS_PUBLIC_BASE_URL` 使用站点访问者可读取的 HTTP 或 HTTPS 资源根地址。使用私有桶时，为公开封面配置可访问的 CDN 域名并开启 COS 回源鉴权。使用公读私写的专用桶时，也可填写桶的默认域名。

#### 客户端静态图片

客户端的页面背景、站点标志、排行榜装饰图和默认赛车、宠物图使用 `apps/client/public/qqfeiche/assets/client/` 下的 WebP。发布或更新素材时，在仓库根目录运行：

```bash
pnpm upload:client-assets --dry-run
pnpm upload:client-assets
```

命令读取环境变量和 `apps/server/.env` 中的 COS 配置，按文件名批量上传到 `COS_BUCKET` 的 `qqfeiche/assets/client/`。重复运行会更新同名对象，并将 `Cache-Control` 设为 `public, max-age=300`。执行上传的 CAM 子账号需有 `qqfeiche/assets/client/*` 的 `cos:PutObject` 权限。

本地开发和生产环境的客户端都会在启动后调用 `GET /api/public/client-assets`。后端根据 `COS_PUBLIC_BASE_URL` 生成素材目录的访问前缀，客户端按文件名拼出图片地址。后端未配置 COS 或前缀获取失败时，客户端使用自带的 WebP。首次上线该功能时，先上传图片，再执行生产发布。

## 命令

在仓库根目录执行：

```bash
pnpm install       # 安装所有 workspace 依赖
pnpm dev           # 同时启动 client、admin、server
pnpm dev:client    # 只启动 C 端
pnpm dev:admin     # 只启动后台
pnpm dev:server    # 只启动服务端
pnpm build         # 构建 client 和 admin
pnpm typecheck     # 三个项目分别做类型检查
pnpm start         # 启动 Koa API 服务
```

开发地址：

- C 端：http://localhost:9431/
- 后台：http://localhost:9432/
- 接口：http://127.0.0.1:9433/api/health

开发环境下，两个前端的 Vite 都会把 `/api` 代理到 `http://127.0.0.1:9433`。

## Docker 生产部署

访问入口为 `https://feiche.coderjc.cn`（client）和 `http://feiche-admin.coderjc.cn`（admin）。公共网关通过同一宿主机的 `gateway-net` 转发到 `qqfeiche-nginx`，由项目 Nginx 按域名提供两套前端，并将各自的 `/api/` 请求转发到独立的 Koa 容器 `qqfeiche-api`。两个项目容器都只在 Docker 网络内提供服务。

在本地配置好 SSH 后，从仓库根目录运行 `pnpm deploy:prod`。命令在本地构建 Nginx 和 API 镜像，通过 SSH 上传并启动两个服务，然后检查用户端、管理端、API 和榜单记录查询。连接配置、上线前提和回滚命令见 [Docker 部署更新](docs/Docker部署更新.md)。

生产配置由服务器上的 `.env.production` 提供。Compose 将 SQLite 数据目录挂载到命名卷 `qqfeiche-rank_sqlite-data`，替换容器后继续使用同一个卷。空卷首次启动时会创建数据库。

### 接入公共网关

首次配置公共网关时，在网关所在机器上执行以下命令。将 `gateway_dir` 替换为公共网关的目录，并从本仓库准备 `deploy/gateway/` 下的两份网关配置。已有网关可直接发布应用。

```bash
gateway_dir=/path/to/gateway
cp deploy/gateway/qqfeiche-rank.conf "$gateway_dir/conf.d/"
docker compose -f "$gateway_dir/docker-compose.yml" exec nginx nginx -t && \
    docker compose -f "$gateway_dir/docker-compose.yml" exec nginx nginx -s reload
```

这一步启用 admin 的 HTTP 转发和 client 的 ACME 验证入口。通过网关已经挂载的 webroot 为 client 签发证书。

```bash
sudo certbot certonly --webroot -w /var/www/certbot \
    --cert-name feiche.coderjc.cn -d feiche.coderjc.cn
```

证书签发成功后，再将 client 的 HTTPS 配置放入网关并重新加载。之后将新证书纳入网关现有的续期流程，续期成功后重载 Nginx。

```bash
cp deploy/gateway/qqfeiche-rank-https.conf "$gateway_dir/conf.d/"
docker compose -f "$gateway_dir/docker-compose.yml" exec nginx nginx -t && \
    docker compose -f "$gateway_dir/docker-compose.yml" exec nginx nginx -s reload
```

当前 Compose 显式设置 `ADMIN_ORIGIN=http://feiche-admin.coderjc.cn` 和 `ALLOW_HTTP_ADMIN_ORIGIN=1`。HTTP 下后台登录凭据和会话令牌未经传输加密。以后为后台启用 HTTPS 时，更新网关配置及 COS CORS 来源，将 `ADMIN_ORIGIN` 改为 `https://feiche-admin.coderjc.cn`，并移除 `ALLOW_HTTP_ADMIN_ORIGIN`。HTTPS 请求的 Refresh Cookie 会自动启用 `Secure`。

## Element Plus 按需引入

client 和 admin 各自通过 `unplugin-vue-components`、`unplugin-auto-import` 和 `ElementPlusResolver({ importStyle: 'sass' })` 按需引入，没有全量 `app.use(ElementPlus)`。

以下通过 JS API 调用的组件不会出现在模板扫描中，样式需要手动引入。两个前端分别维护了一份：

- `client/src/styles/element/manual.ts`
- `admin/src/styles/element/manual.ts`

包含：

| 组件 | 用途 |
| --- | --- |
| `ElMessage` | 轻提示 |
| `ElMessageBox` | 确认框 / 对话框 |
| `ElNotification` | 通知 |
| `ElLoading` | 加载服务与 `v-loading` 指令 |
| `ElInfiniteScroll` | `v-infinite-scroll` 指令（当前无实际 CSS，保留导入） |

`ElLoading` 和 `ElInfiniteScroll` 同时在各自项目的 `src/main.ts` 中注册。语言包通过 `App.vue` 的 `<el-config-provider :locale="zhCn">` 注入。

## 图标

client 和 admin 统一使用 `@iconify/vue` 的 `<Icon>` 组件，图标集为 Element Plus（`ep`）。

- 依赖：`@iconify/vue` + `@iconify-json/ep`。
- 两端各自的 `src/icons.ts` 在启动时用 `addCollection` 离线注册图标集，运行时不请求 Iconify API。
- 组件统一从 `@/icons` 导入，图标名使用 `ep:` 前缀：

```vue
<script setup lang="ts">
import { Icon } from '@/icons'
</script>

<template>
    <Icon icon="ep:search" />
</template>
```

需要新增其它图标集时，安装对应的 `@iconify-json/*`，并在两端的 `src/icons.ts` 中追加 `addCollection`。

## 样式约定

- 全局公共样式放在各自的 `src/styles`，统一使用 Sass，由 `src/styles/index.scss` 汇总。
- 组件私有样式放在 SFC 的 `<style scoped lang="scss">` 中，按 DOM 层级嵌套并使用完整类名。
- 当前全局入口仅保留基础 reset，Element Plus 使用默认样式。
- `apps/client/public/images` 中的图片裁切自页面设计参考稿，仅用于原型预览，正式上线前应替换为独立原图。

## 开发说明

- client 与 admin 是两个独立的 Vite 应用，页面路由从各自站点的根路径 `/` 开始。跨站链接使用目标站点的完整地址。
- 后台的 `src/stores/auth.ts` 在内存中保存管理员资料和 Access Token，统一处理会话恢复、并发续签和登出。
- Node.js 版本要求：`>=22.18.0`。
