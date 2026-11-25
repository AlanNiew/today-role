# 开发与维护说明

README 回答「项目是什么、怎么跑」；本文件回答「改代码时必须遵守什么、踩过哪些坑」。
产品需求以 `docs/project-brief.md` 为准，这里不重复需求细节。

## 1. 命令与 CI

| 命令                      | 作用                                                                      |
| ------------------------- | ------------------------------------------------------------------------- |
| `npm run typecheck`       | `tsc` 检查小程序源码与全局类型                                            |
| `npm run lint`            | ESLint（flat config）检查正确性问题                                       |
| `npm run lint:fix`        | ESLint 自动修复可修复项                                                   |
| `npm run format`          | Prettier 写入格式                                                         |
| `npm run format:check`    | 只检查格式，不改文件                                                      |
| `npm test`                | 编译 `core` + `tests` 到 `.tmp-test/`，用 Node test runner 跑单测         |
| `npm run check:structure` | 页面四件套 / tabBar / JSON / WXML 事件 / 文案红线 / 隐私入口 / 无网络调用 |
| `npm run check`           | 依次跑 typecheck → lint → format:check → test → check:structure           |

CI 在 `.github/workflows/ci.yml`：push 到 `master` 或提 PR 时执行 `npm ci && npm run check`（Node 22）。
**提交前本地跑一遍 `npm run check`**；改了文案或数据结构时，另外按 `docs/manual-test.md` 走对应验收项。

## 2. 分层与依赖方向

```text
pages/* ──仅通过 getApp().globalData──▶ Repository（data/repository.ts）
   │                                     └─ core/repository/local.ts
   └──▶ RoleGenerator（core/generator）   └─ core/repository/types.ts
core/* 不得 import wx、pages 或 data 层；tests 只依赖 core
```

- 页面只做展示与交互：不直接调用 `wx.storage`，不拼业务文案。
- 聚合、门控、文案生成全部放在 `core/`，这样才能在 Node 里单测。
- 文案的唯一出口是 `RoleGenerator`（`generateTodayFragment` / `generateWeeklySnapshot` / `generateMonthlyCard` / `buildMonthlyInsights`）。
- 新增能力优先加在 core 并在页面组装，不要在页面里复制统计逻辑。

## 3. 微信运行时的硬约束（历史踩坑）

1. **目录 import 必须写全 `index`**：`import { createGenerator } from './core/generator/index'`。
   写成 `./core/generator` 能通过 `tsc`，但微信真机/模拟器会报错（见提交 `6d3be46`）。
2. **WXSS 不支持通配/子组合选择器**（如 `.a > * + *` 曾被删除），请只用具体类名。
3. **不要手写 `app.js` 和页面 `.js`**：TS 由开发者工具的 `useCompilerPlugins: ["typescript"]` 编译；`miniprogram/**/*.js` 已在 `.gitignore`。
4. **新增页面必须注册且四件套齐全**：`app.json.pages` 登记，`.ts/.json/.wxml/.wxss` 都存在，页面 json 必须有 `navigationBarTitleText`，否则 `check:structure` 失败。
5. **WXML 内置组件有白名单**（`scripts/check-structure.mjs` 的 `allowedTags`）：用新组件（如 `swiper`）前先登记，否则检查失败。
6. **`project.config.json` 归微信开发者工具所有**：工具会重写其格式，Prettier 已忽略该文件，不要依赖它的排版。
7. **「开发调试 / 载入演示数据」只在非正式版出现**：`core/env.ts` 的 `shouldShowDevTools` + 设置页 `wx.getAccountInfoSync().miniProgram.envVersion` 双重控制（UI 隐藏 + 调用拦截）。发布前不要为了省事绕过，否则真实用户可能覆盖自己的记录。

## 4. 文案与产品红线

- 所有生成文案必须带**数据锚点**：天数、次数、占比、具体日期/星期等至少一个数字。
- 红线词表存在两处，**改一处必须同步另一处**：
  - `scripts/check-structure.mjs`（扫描源码）
  - `tests/helpers.ts` 的 `BANNED_COPY`（扫描生成结果）
- 禁止诊断、人格定性、治疗/医疗建议；健康相关统一用「状态参考值」。
- `note` 不参与生成、不回显到生成文案；只在结果页展示给本人。
- 免费层（记录、今日碎片、周快照、月卡基础版）永远不上锁；Pro 只加深解读。
- 反常识规则宁可不命中，也不硬编故事（已实现为「暂无可验证的反常识模式」）。

## 5. 日期与统计口径

- 「哪一天」只认设备本地时区的 `YYYY-MM-DD`；不存 UTC 日期键。`createdAt/updatedAt` 仅审计。
- 一周从周一开始；周快照是「最近 7 天滚动窗口」，`weekStart` 只作缓存键，不等于自然周统计。
- 同一用户同一天只有一条记录；重复提交是更新（保留 `createdAt`，刷新 `updatedAt`）。
- 连续记录（streak）由 `core/stats.ts` 的 `currentStreak` 计算：从今天往回数，今天还没记录时从昨天开始数（不清零）；断一天即停止。只用于展示，不参与生成文案。
- 状态参考值（兴奋 5 → 麻木 0）只用于排序与找模式，不是心理量表。

## 6. 数据与存储

- 键前缀 `today-role.v1.`（`config.ts` 的 `storagePrefix`），值均为 JSON 字符串。
- `user` 键只在真正写入（记录 / 权益 / 演示数据）时落盘；只读场景（含导出）不会留下匿名 id。
- 清空 = 按前缀物理删除所有键，随后不自动生成新记录。
- 缓存裁剪：周快照保留 8 周、月卡保留 6 月（`core/repository/local.ts` 的 `pruneMap`）。
- 导出包 `schemaVersion: 1`。**改数据结构时必须**：
  1. 递增导出 `schemaVersion`；
  2. 提供迁移/兼容读取（或更换 key 前缀并保留旧数据读取路径）；
  3. 补单测与 `docs/manual-test.md` 验收项。

## 7. 切换点：本地/云端、规则/LLM

- `miniprogram/config.ts` 的 `dataMode` 与 `generatorMode` 是唯一切换点，页面不感知。
- 实现 `CloudRepository` 时保持 `core/repository/types.ts` 接口，所有方法维持 Promise；云端需保证「同一 userId + date」唯一。
- 接入 LLM 时：走自有服务端代理（小程序端不持有模型密钥）、失败回退 `RuleBasedGenerator`、输出仍要过锚点与红线校验。
- 未实现的模式必须抛明确错误，不能静默回退（`dataMode === 'cloud'` 当前即 throw）。

## 8. 改动检查清单

- [ ] `npm run check` 全绿（typecheck / lint / format / test / structure）
- [ ] 新增或修改文案已被锚点与红线测试覆盖
- [ ] 新页面已注册，四件套齐全，页面 json 有标题
- [ ] 涉及日期、门控、仓储、统计时补了 `tests/` 单测
- [ ] 手动走 `docs/manual-test.md` 中对应里程碑
- [ ] 改了数据结构：迁移方案 + `schemaVersion` 同步
- [ ] 提交前至少用微信开发者工具模拟器走一遍主流程（真机更佳）

## 9. 环境与可选工具

- Node ≥ 22（`package.json` engines；仅用于工具链，小程序运行不依赖 Node）。
- 微信开发者工具（稳定版）。本项目不含手写 JS 兜底，旧版工具不认识 TS 编译插件会失败。
- 开发者工具自带 CLI（安装目录下的 `cli.bat`，本机为 `D:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat`），可用于打开/preview/自动化。使用前需在工具设置中开启「服务端口」并登录，因此**不放进 CI**。
- 单元测试只覆盖 `core/`（无 `wx` 依赖）；页面层由结构检查 + 手动清单兜底。

## 10. 已知技术债

- 没有页面级自动化 e2e（可评估 `miniprogram-automator`，但依赖开发者工具登录与服务端口）。
- 月卡缓存只写不读（每次进入月卡页全量重算）；数据量小，暂不优化。
- 没有存储 schema 迁移框架，仅靠 key 前缀 `v1` 与导出 `schemaVersion`。
- Mock Pro 无真实支付、订单、退款能力。
