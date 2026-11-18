# today-role

「今日角色」微信小程序 MVP：每日 5 秒记录状态，逐步生成个人角色资料卡。

## 当前状态

仅有需求任务书，代码尚未开始。开发范围与约束见 `docs/project-brief.md`（唯一的 MVP 需求来源，先读它再动手）。

## 计划技术栈

- 微信小程序原生 + TypeScript
- 数据访问：`repository` 抽象，MVP 用 `LocalRepository`（`wx.storage`），预留 `CloudRepository`
- 文案生成：`RoleGenerator` 抽象，MVP 用 `RuleBasedGenerator`，预留 `LLMGenerator`

## 目录约定

| 路径 | 用途 |
| --- | --- |
| `docs/` | 需求、设计与约定文档 |
| `src/` | 小程序源码（待创建） |
| `tests/` | 测试（待创建） |
| `tmp/` | 临时文件（已 gitignore） |

## 运行 / 测试

代码落地后在此补充：开发者工具导入方式、本地数据切换方式、测试命令。

## 数据与输出

- 运行时数据：MVP 阶段存在小程序本地存储 `wx.storage`，不上传服务端。
- 用户可导出 JSON、可一键清空全部数据（需求见任务书第 2 节）。
