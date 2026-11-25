# 今日角色（today-role）

每天花 5 秒记录状态，逐步生成「个人角色资料卡」的微信小程序 MVP。

- 固定 6 个状态、5 个场景，记录当天状态、场景和可选一句话。
- 记录后立即得到「今日角色碎片」，文案必须引用当天选择并带数据锚点。
- 最近 7 天记录满 3 天可看周快照（2 个模式），当月记录满 10 天可看月角色卡。
- 免费层完整可用；Pro 层用本机 mock 开关控制深度解读、历史对比和完整行动建议。
- 所有数据只存在小程序本地存储，可导出 JSON，可一键清空。

需求来源：`docs/project-brief.md`（唯一 MVP 需求来源）。本文档同时是运行、测试、数据切换和后续迭代说明。

## 当前进度

M1–M6 已完成：

| 里程碑 | 内容                                                            | 状态 |
| ------ | --------------------------------------------------------------- | ---- |
| M1     | 小程序脚手架、6 个页面、底部导航、Repository 抽象、本地存储实现 | ✅   |
| M2     | 每日记录、同日更新、今日角色碎片（RuleBasedGenerator）          | ✅   |
| M3     | 最近 7 天周快照、3 天门控、2 个 Pattern、反常识规则             | ✅   |
| M4     | 当月角色卡、10 天门控、状态分布 / Top 场景 / 张力 / 行动建议    | ✅   |
| M5     | mock 付费页、isPro 开关、设置 / 隐私 / 清空 / 导出              | ✅   |
| M6     | 规则单元测试、结构检查、手动测试清单、README                    | ✅   |

工程护栏：GitHub Actions CI、ESLint、Prettier，以及开发约束与踩坑记录见 `docs/development-notes.md`。

## 快速开始

环境要求：

- Node.js ≥ 22（仅用于类型检查、Lint、格式化、单元测试和项目结构检查；小程序运行不依赖 Node）
- 微信开发者工具（稳定版即可）

```bash
cd today-role
npm install            # 安装 typescript、miniprogram-api-typings、eslint、prettier 等开发依赖
npm run check          # 类型检查 + Lint + 格式检查 + 单元测试 + 项目结构检查
```

在微信开发者工具中：

1. 选择「导入项目」，目录选 `today-role/` 根目录（不是 `miniprogram/`）。
2. `project.config.json` 中已配置 AppID `wx32d9039656d150d3`；若要换成自己的测试号，改 `appid` 或在导入时选择测试号即可。
3. 工具识别 `miniprogramRoot: "miniprogram/"` 和 `useCompilerPlugins: ["typescript"]`，直接编译 TS，无需额外构建命令。
4. 编译后从「记录」页开始，依次可进入今日结果、角色（周快照）、月卡、付费页、设置页。

> 如果开发者工具版本较旧、不认识 TypeScript 编译插件，请升级工具；本项目没有手写 `app.js` 兜底。

## 命令

| 命令                      | 作用                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `npm run typecheck`       | 用 `tsconfig.json` 检查小程序源码与全局类型                                            |
| `npm run lint`            | ESLint 检查正确性问题（`lint:fix` 自动修复可修复项）                                   |
| `npm run format`          | Prettier 写入格式（`format:check` 只检查、不改文件）                                   |
| `npm test`                | 编译 `miniprogram/core` + `tests` 到 `.tmp-test/`，用 Node 内置 test runner 跑规则测试 |
| `npm run check:structure` | 校验 `app.json` 页面四件套、tabBar、JSON 语法、页面/事件基础一致性、文案红线词         |
| `npm run check`           | 以上五项全跑（与 CI 一致）                                                             |

测试只覆盖与微信 API 解耦的 `miniprogram/core`（日期、聚合、生成规则、本地仓储、权益、种子数据），不依赖开发者工具。

## 目录结构

```text
today-role/
├── .github/
│   └── workflows/ci.yml          # CI：npm ci + npm run check（Node 22）
├── docs/
│   ├── project-brief.md          # 需求任务书（只读）
│   ├── development-notes.md      # 开发约束 / 踩坑记录 / 改动检查清单
│   └── manual-test.md            # 手动测试清单
├── miniprogram/
│   ├── app.ts / app.json / app.wxss
│   ├── sitemap.json
│   ├── config.ts                 # 数据层 / 生成器模式开关
│   ├── core/                     # 纯 TS 核心，不依赖 wx，可在 Node 测试
│   │   ├── types.ts              # 状态、场景、数据模型、生成结果类型
│   │   ├── date.ts               # 本地时区日期工具（周一为一周起点）
│   │   ├── stats.ts              # 记录筛选、分布、场景聚合、状态参考值
│   │   ├── entitlement.ts        # 免费 / Pro 能力判定
│   │   ├── seed.ts               # 演示数据生成（仅开发调试）
│   │   ├── generator/
│   │   │   ├── types.ts          # RoleGenerator / MonthlyInsights 接口
│   │   │   ├── rule-based.ts     # 规则模板实现（MVP）
│   │   │   ├── llm.ts            # LLM 生成器占位（未接入）
│   │   │   └── index.ts          # 生成器工厂
│   │   └── repository/
│   │       ├── types.ts          # Repository / KeyValueStorage / 导出包
│   │       ├── local.ts          # LocalRepository（wx.storage 或任意 KV 适配器）
│   │       └── memory.ts         # 内存仓储（测试 / 预览）
│   ├── assets/tab/               # 本地 tabBar 线性图标（普通 / 选中）
│   ├── data/
│   │   ├── repository.ts         # 组合本地存储 + 仓储，暴露单例入口
│   │   └── wx-storage.ts         # wx.storage → KeyValueStorage 适配器
│   ├── pages/
│   │   ├── index/                # 记录（tab）
│   │   ├── today-result/         # 今日角色碎片
│   │   ├── weekly/               # 周快照（tab「角色」）
│   │   ├── monthly/              # 月角色卡
│   │   ├── paywall/              # mock 付费权益
│   │   ├── history/              # 历史记录（按月回看，只读）
│   │   └── settings/             # 设置 / 隐私 / 导出 / 清空（tab「我的」）
├── minitest/                     # 微信开发者工具 minitest 配置（工具生成）
├── scripts/
│   ├── check-structure.mjs       # 结构 + 文案红线扫描
│   └── run-tests.mjs             # 跨平台收集并运行编译后的测试
├── tests/                        # Node 单元测试 + 端到端流程测试
├── typings/                      # 小程序全局类型与 IAppOption
├── eslint.config.mjs             # ESLint flat config
├── .prettierrc.json / .prettierignore
├── project.config.json           # 微信开发者工具项目配置
├── tsconfig.json                 # 小程序源码类型检查
├── tsconfig.test.json            # 核心 + 测试编译
└── package.json
```

## 核心流程

```text
pages/index ──保存/更新──▶ LocalRepository ──▶ pages/today-result
     │                         │
     │                         ├─▶ pages/weekly  （最近 7 天 ≥3 天）
     │                         └─▶ pages/monthly （当月 ≥10 天）
     └── tab「我的」──▶ pages/settings（导出/清空/隐私/演示数据）
                           ├──▶ pages/paywall（mock Pro 开关）
                           └──▶ pages/history（按月回看）──▶ today-result?mode=history（只读）
```

- 页面通过 `getApp<IAppOption>().globalData` 取得 `repository` 与 `generator`，不直接碰 `wx.storage`。
- 页面只做展示和交互；聚合、门控、文案全部在 `core` 中，可单测。
- 数据访问全部是 `Promise`，为后续云开发留出异步空间。

## 界面与视觉

方向是「安静的手账感」：纸张底色、鼠尾草绿、金色点缀、衬线标题。目标不是花哨，而是让人愿意每天打开一次。

- 首屏：日期 / 问候 / 品牌字标 + 状态网格 + 场景胶囊 + 实时组合预览；选中项有底色、描边、右上角 ✓ 角标和轻微上浮。
- 「留一句话」默认收起成一行，需要时展开（已有备注会自动展开），让「保存 / 更新」按钮保持在首屏可见；已记录时首屏文案显示今天的状态 × 场景，并提供「查看今日碎片」入口，不必重复保存。
- 次要文字（说明、计数、页脚）统一按 WCAG AA 对比度调深，说明类字号不低于 24rpx。
- 状态有固定颜色（兴奋金、平稳绿、紧绷陶土、低电量蓝灰、烦躁玫红、麻木灰），分布条、周点阵复用同一套颜色。
- 周快照用 7 个点阵显示哪几天有记录；月卡用深绿封面 + 彩色分布条；付费页用深绿 + 金色 Pro 标识。
- 设置页顶部展示累计天数 / 本月记录 / 连续记录（streak）三个指标，不再重复展示恒等的「总条数」。
- 历史记录页按月分组、日期倒序，每行显示日号 + 星期 + 「状态 × 场景」+ 备注单行省略；点击某天进入结果页的只读回看模式（`mode=history`），文案为「那天的你更像」，不显示「下一步」与编辑入口。
- 底部 3 个 tab 使用本机 PNG 线性图标（普通 / 选中两套），不依赖网络图片。
- 所有装饰（圆环、光晕、点阵、进度条）由 WXSS 绘制，没有外部插图或字体请求。
- 入场使用 0.46s 的轻微上浮，不阻塞交互；降低动效偏好未单独适配（微信 WebView 不支持媒体查询时忽略）。
- 视觉资产全部在 `miniprogram/assets/`，不产生网络请求。

## 数据模型

定义在 `miniprogram/core/types.ts`，与任务书一致：

- `Status`：平稳 / 紧绷 / 低电量 / 兴奋 / 烦躁 / 麻木
- `Scene`：工作 / 关系 / 独处 / 身体 / 家庭
- `DailyEntry`：`id`、`userId`、`date`（本地 `YYYY-MM-DD`）、`status`、`scene`、`note?`（≤100 字）、`createdAt`、`updatedAt`
- `Entitlement`：`userId`、`isPro`、`plan`（`free` / `mock_pro`）、`expiresAt?`
- `WeeklySnapshot`：`weekStart`（周一）、`patterns[2]`、`generatedAt`
- `MonthlyCard`：`month`、`statusDistribution`、`topScenes`、`tension?`、`actionSuggestion?`、`generatedAt`

约束：同一用户同一天只有一条记录；再次提交按 `date` 更新，保留 `createdAt`，刷新 `updatedAt`。

日期全部按设备本地时区计算，不存 UTC 时间戳作为「哪一天」的依据；`createdAt/updatedAt` 只是审计时间戳。

## 生成规则

所有文案来自 `RoleGenerator`，MVP 实现是 `RuleBasedGenerator`。生成结果带 `dataAnchors`（或文案内嵌数字），每个结论都能回到具体记录。

### 今日角色碎片

输入：当天 `status`、`scene`、最近 7 天记录。

- 标签由「状态 × 场景」查表得到（如工作 × 紧绷 →「硬撑的协调者」）。
- 解释固定引用当天状态和场景，并给出最近 7 天同组合次数、该状态天数。
- 示例：「今天你在「工作」场景下记录为「紧绷」。最近 7 天（含今天）里，这个组合出现 3 天；「紧绷」共出现 4 天。」
- 不读取、不回显用户填写的 note，避免把私密内容带进生成文案。
- 不使用「你就是……的人」「你属于……」等定性句式。

### 周快照

条件：最近 7 天（含今天）有效记录 ≥3 天；不足时返回门控结果，页面显示还差几天。

固定输出 2 个 Pattern：

1. 高频组合：最近 7 天出现最多的「状态 × 场景」，带天数与占比锚点。
2. 反常识模式，按优先级尝试：
   - 状态参考值最低的一天不在周一/周五 →「低点不在周初或周五」，带日期、星期、场景；
   - 某场景平均状态参考值比整体低 ≥0.8 且该场景 ≥2 天 → 场景落差；
   - 否则比较各场景状态跨度，输出「最稳定 / 最波动场景」；
   - 都不满足时明确写「暂未出现可验证的反常识模式」，不硬编故事。
   - 每条都含数字锚点；`isCounterIntuitive` 只在第 1、2 条规则命中时为 `true`。

### 月角色卡

条件：当月（本地时区自然月）有效记录 ≥10 天。

免费基础版：

- 状态分布（6 个状态天数，含 0）；
- 高频场景 Top 2（含天数）；
- 例外 / 张力一句（优先：某状态高度集中在单一场景 → 场景均值偏离整体 → 稀有状态落点）；
- 一条轻量行动建议（优先：本月平均状态最低的星期，给出下一个该星期的具体日期；否则给最高频场景的 1 分钟缓冲建议）。

Pro 完整版（页面按 `isPro` 展示，不写入基础月卡）：

- 触发 / 共现观察：高频场景内的状态构成、低状态记录的场景集中度；明确标注「共现，不代表因果」；
- 历史对比：本月 vs 上月有效天数、主导状态、最高频场景；上月不足 3 天时明确说明无法对比；
- 完整行动建议：3 条，均由本月锚点推导（低状态星期、连续低状态天数、状态较好的场景）。

「状态参考值」只是 0–5 的展示排序（兴奋 5 → 麻木 0），仅用于找模式和排序，不是心理量表。

## 免费 / 付费分层

| 能力                            | 免费 | Mock Pro |
| ------------------------------- | ---- | -------- |
| 每日记录 / 今日碎片             | ✅   | ✅       |
| 周快照 2 个 Pattern             | ✅   | ✅       |
| 月卡：分布 / Top 场景 / 张力    | ✅   | ✅       |
| 月卡：一句轻量建议              | ✅   | ✅       |
| 月卡深度解读（共现 / 触发观察） | —    | ✅       |
| 本月 vs 上月历史对比            | —    | ✅       |
| 完整行动建议（3 条）            | —    | ✅       |
| 导出 JSON                       | ✅   | ✅       |

付费页只提供「模拟开通 / 关闭」按钮，写本机 `Entitlement`，不接微信支付、不产生任何费用。

**决策记录（任务书歧义处）**：任务书 §8 把「数据导出」列在 Pro，但 §2、§9 要求设置页必须提供导出。这里按「更小、更可运行、更保护隐私」原则，把导出做成所有用户可用——数据可携带是隐私保护的一部分，也避免 mock 付费墙遮挡真实数据权利。其余 Pro 能力严格由 `isPro` 控制。

## 数据层：本地 / 云端切换

MVP 默认 `LocalRepository`，键前缀 `today-role.v1.`，数据在 `wx.storage`：

- `entries`：`DailyEntry[]`
- `entitlement`：`Entitlement`
- `weekly`：`{ [weekStart]: WeeklySnapshot }`
- `monthly`：`{ [month]: MonthlyCard }`
- `user`：本机随机匿名 `userId`（只在首次保存记录 / 权益 / 演示数据时写入；不登录、不采集微信身份）

切换云开发时：

1. 在 `miniprogram/config.ts` 把 `dataMode` 改为 `'cloud'`。
2. 新建 `CloudRepository implements Repository`，实现 `miniprogram/core/repository/types.ts` 中的方法（全部返回 Promise）：
   `getUserId`、`getEntry`、`listEntries`、`upsertEntry`、`replaceEntries`、get/set `Entitlement`、get/save `WeeklySnapshot`、get/save `MonthlyCard`、`clearAll`、`exportAll`。
3. 在 `miniprogram/data/repository.ts` 的工厂里返回 `CloudRepository`；页面不感知存储位置。
4. 云端需要保证「同一 userId + date」唯一，并在清空时删除该用户的全部集合。

当前 `dataMode: 'cloud'` 会抛出明确错误，避免静默落到本地造成数据位置误解。

## 生成器：规则 / LLM 切换

`RoleGenerator` 接口位于 `miniprogram/core/generator/types.ts`：

- `generateTodayFragment`
- `generateWeeklySnapshot`
- `generateMonthlyCard`
- `buildMonthlyInsights`（Pro 深度内容，按需调用）

`RuleBasedGenerator` 是默认实现。接入 LLM 时：

1. 实现 `LLMGenerator`（`miniprogram/core/generator/llm.ts` 已留空类与错误提示）。
2. 输入仍传结构化记录，输出必须经过同样的「数据锚点 + 文案红线」校验；建议在服务端做二次过滤。
3. 在 `config.ts` 把 `generatorMode` 改为 `'llm'`；实现时建议失败回退到规则生成，保证主流程可用。

小程序端不直接持有第三方模型密钥；后续接入应走自有服务端代理。

## 隐私与安全

- 全部记录、权益状态只写本机 `wx.storage`，无网络请求、无埋点、无登录。
- `note` 可留空，最多 100 字；不会被用于生成文案，也不会出现在任何分享内容里。
- 设置页提供隐私说明、导出 JSON、清空全部数据。
- 清空是物理删除：按 `today-role.v1.` 前缀删除所有键（包括缓存快照和权益），并清空内存引用；清空后不会自动生成新记录。
- 导出包含记录、快照、月卡、权益和 schema 版本，先写本机临时文件再复制到剪贴板，不上传。
- 不做分享奖励、不做分享解锁、不接支付。
- 「载入演示数据」只在开发者工具与体验版显示；正式版隐藏该区块并拦截调用，避免真实用户误触覆盖自己的记录。
- 文案只描述记录中的共现和数量，不做诊断、人格定性或治疗建议；月卡页固定展示「仅供自我观察，不构成医疗建议」。

## 测试

```bash
npm run check
```

- 静态检查：`npm run lint`（ESLint）与 `npm run format:check`（Prettier）；CI 配置见 `.github/workflows/ci.yml`。
- 单元测试：`tests/*.test.ts`，覆盖日期边界、同一天 upsert、周/月门控、反常识分支、数据锚点、Pro 内容、连续记录（streak）、环境判定、清空无残留、导出结构、文案红线。
- 结构检查：`scripts/check-structure.mjs` 校验 `app.json` 中的每个页面都有 `.ts/.json/.wxml/.wxss`、tabBar 指向已注册页面、所有 JSON 可解析、WXML 事件绑定存在对应方法、源码不含诊断类词。
- 手动测试：`docs/manual-test.md`，按 M1–M6 验收项逐步走。

## 演示数据

设置页「开发调试」区域可载入演示数据（会覆盖现有记录，需二次确认）：

- 生成最近 45 天的记录，工作日常见组合为「工作 × 紧绷」，周末为「独处 × 平稳 / 兴奋」；
- 刻意把某周低点放在周三，便于观察反常识 Pattern；
- 当月 ≥10 天、上月也有记录，便于验证月卡和 Pro 历史对比。

演示数据生成逻辑在 `miniprogram/core/seed.ts`，不依赖当前日期以外的外部状态。

## 已知限制

- Mock Pro 只存在本机，换设备/清空后消失；不具备真实支付、订单、退款能力。
- 周快照按「最近 7 天滚动窗口」而非自然周统计，`weekStart` 只用于缓存键。
- 状态参考值是固定排序，不等于心理学量表；规则模板只做共现描述。
- 云开发与 LLM 只有接口和切换点，未在本期实现。
- 没有页面级自动化 e2e，页面行为依赖结构检查与手动测试清单。
