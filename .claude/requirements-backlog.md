# Requirements Backlog — 跨模块 / 跨分支需求登记

> **用途**：当一个 commit / 一个分支只涉及特定模块，但需求中包含了其他模块、
> 框架层、字段等其他范围的改动时，把"暂不在此分支范围内"的需求登记在这里。
> 等切到对应分支（或决定纳入范围）时再实现。
>
> **维护原则**：
> 1. 每个跨模块/跨范围需求开一个 `## [ID]` 段
> 2. 实现时反向链接到 commit，并改状态为 done
> 3. 不要在本表写实现细节（代码层面），只写"为什么有这个需求"

---

## 模板

```
## [YYYYMMDD-NN] <一句话描述>
- 登记日期: YYYY-MM-DD
- 涉及模块: <模块名或"框架层">
- 来源分支: feat/frontend-mvp
- 触发场景: <什么情况下发现这个需求>
- 期望行为: <用户视角描述>
- 阻塞依赖: <需要先实现什么>
- 实现: <commit-sha> (<链接>)  ← 实现后填
- 状态: pending
```

---

## 现有 backlog

### [20260619-01] 改写模板（RewriteTemplate）数据模型
- 登记日期: 2026-06-19
- 涉及模块: **新模块 — 改写模板管理**（`/app/rewrite-templates`）
- 来源分支: feat/frontend-mvp
- 触发场景: 用户 06-19 描述「模板指的是规则，和 AI 共同作用形成管线」「国别/平台/品类分三层模板」
- 期望行为: 改写阶段有独立模板数据模型，按 国×平×品 3 维定位，含 system_prompt / sku_config / pricing_rules / title_rules / image_rules / strategy_templates（高曝光+高转化）/ pipeline_steps
- 阻塞依赖: 无（R1 先做数据模型 + 新页）
- 状态: pending

### [20260619-02] Workbench「按模板跑 + 扩到全部目标」
- 登记日期: 2026-06-19
- 涉及模块: **workbench**（V3 已 in MVP，但 V4 需大改）
- 来源分支: feat/frontend-mvp
- 触发场景: 用户 06-19 「改写成功后，将一个商品改写成所有当前可以上的商品」
- 期望行为: Workbench 顶部加"模板"下拉（一键按模板跑 3a-3f 流程）；加"扩到全部目标"按钮（复用当前改写结果 × N 目标）
- 阻塞依赖: 20260619-01（需要改写模板数据）
- 状态: pending

### [20260619-03] PublishPage 多目标模式 + 多对多管理
- 登记日期: 2026-06-19
- 涉及模块: **publish**（V3 已在路由，但 V4 需扩）
- 来源分支: feat/frontend-mvp
- 触发场景: V4 草稿 #8「多对多发布可能混乱，需要一套管理机制」+ 用户 06-19「之前发送过的内容改写过以后也可以发送」
- 期望行为: PublishPage 支持 1 source × N targets 显示；显示 1 source 的所有 ProcessedProduct；版本对比；冲突检测
- 阻塞依赖: 20260619-01 + 20260619-02
- 状态: pending

### [20260619-04] AIDialog 三页补齐
- 登记日期: 2026-06-19
- 涉及模块: **inbox + workbench + publish**
- 来源分支: feat/frontend-mvp
- 触发场景: V4 草稿「每页都有 AI 对话框」+ 当前 3 页缺 AIDialog
- 期望行为: InboxPage / WorkbenchPage / PublishPage 顶部加 AIDialog，预设按钮按页定制
- 阻塞依赖: 无（R3 独立做）
- 状态: pending

### [20260619-05] 导航加「模板」组
- 登记日期: 2026-06-19
- 涉及模块: **layout**（导航）
- 来源分支: feat/frontend-mvp
- 触发场景: 模板管理隐藏在 `/app/templates`，用户反馈找不到
- 期望行为: 导航加「模板」组：选品模板 + 改写模板
- 阻塞依赖: 20260619-01（新页需先有）
- 状态: pending
