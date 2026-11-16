# 任务完成后的验证要求

- 如无用户特殊说明，任务完成后只需执行基本的 TypeScript 类型检查。
- 默认在仓库根目录运行 `pnpm typecheck`；仅修改单个应用时，可运行对应的类型检查：
  - 客户端：`pnpm --filter @qqfeiche/client typecheck`
  - 管理端：`pnpm --filter @qqfeiche/admin typecheck`
  - 服务端：`pnpm --filter @qqfeiche/server typecheck`
- 默认不额外执行构建、单元测试、端到端测试或浏览器验证；用户明确要求时，按要求执行。
- 仅修改文档等不影响 TypeScript 类型的内容时，可跳过类型检查，并在完成说明中注明。
- 完成说明中简要报告执行的检查及结果；如检查失败或无法执行，应如实说明。
