# qqfeiche-rank

QQ 飞车手游国服记录榜。仓库采用 pnpm workspace 管理，根目录下是三个独立项目：

```text
qqfeiche-rank/
├── client/     # C 端（Vue 3 + Vite）
├── admin/      # 后台管理（Vue 3 + Vite）
├── server/     # 服务端（Fastify）
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
- 开发端口：`5173`
- 页面：`/records`、`/drivers`、`/teams`、`/stats`，`/` 重定向到 `/records`。
- 当前路由页面已清空，保留 50px header 和 main 布局，等待接入新 UI。
- 示例数据保留在 `apps/client/src/data/tracks.ts`，尚未接入业务 API。

### admin：后台管理

- Vue 3 + TypeScript + Vite
- Vue Router、Pinia
- Element Plus 按需引入
- Sass 样式，统一放在 `admin/src/styles`
- 开发端口：`5174`
- 访问路径：`http://localhost:5174/admin/`
- 页面：`/admin`、`/admin/tracks`、`/admin/tags`、`/admin/people`、`/admin/records`、`/admin/records/new`、`/admin/logs`、`/admin/login`
- 当前路由页面已清空，管理布局仅保留 50px header 和 main 区域。

### server：服务端

- Fastify + `@fastify/static`
- `GET /api/health`
- 生产环境同时托管两个前端：
  - `client/dist` → `/`
  - `admin/dist` → `/admin/`
- 开发端口：`3000`
- 使用 Node 原生 TypeScript 类型剥离运行，不需要额外编译服务端

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
pnpm start         # 启动 Fastify，托管两个构建产物
```

开发地址：

- C 端：http://localhost:5173/
- 后台：http://localhost:5174/admin/
- 接口：http://localhost:3000/api/health

开发环境下，两个前端的 Vite 都会把 `/api` 代理到 `http://127.0.0.1:3000`。

生产模式：

```bash
pnpm build
pnpm start
```

然后访问 `http://localhost:3000/` 和 `http://localhost:3000/admin/`。

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

- client 与 admin 是两个独立的 Vite 应用，后台使用 `base: '/admin/'`，路由 history 基址与之一致。
- 开发环境下跨项目链接使用完整的 localhost 地址；生产环境下分别使用 `/` 和 `/admin/`。
- 后台登录页面已清空，尚未接入真实鉴权与接口。
- 后台的 `src/stores/auth.ts` 是 Pinia 鉴权状态占位，后续接入登录接口时使用。
- Node.js 版本要求：`>=22.18.0`。
