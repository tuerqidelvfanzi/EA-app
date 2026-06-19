# Claude Code 项目规范

## 设计规格保留原则（核心铁律）

> **任何时候，原始设计规格中的完整功能、配置、选项，必须完整保留，不得以"简化"、"优化"、"重构"等名义删减。**

### 违规示例（绝对禁止）
- ❌ "原定36种配色，简化到12种"
- ❌ "原定20个字段，删减为10个"
- ❌ "原来3种模式，合并为1种"

### 合规操作
- ✅ 新增功能：追加而非替换
- ✅ 重构代码：保持功能等价
- ✅ 删除功能：需明确说明业务原因并获确认

### 实现方式

在每次修改前，必须：
1. 读取项目设计文档（如 REQUIREMENTS.md, SPEC.md）
2. 对比现有实现与设计规格的差异
3. 如发现删减，提出警告并等待确认

---

## 开发管道（V3.0+）

详见 `docs/PIPELINE.md`，核心流程：

```
需求 → 调研 → SPEC → 实现 → 自测 → 验收
```

---

## 技术栈

- **前端**: React 18 + TypeScript + TailwindCSS
- **后端**: Node.js + Express
- **插件**: Chrome Extension (Manifest V3)
- **状态**: Zustand + React Query
- **样式**: CSS Variables 主题系统

---

## 目录结构

```
web/          # 前端应用
extension/   # 浏览器插件
docs/         # 设计文档
server/       # 后端服务
```

---

## 分支管理规范（feat/frontend-mvp 工作流）

> 当前活跃分支：`feat/frontend-mvp`（远程）
> 原项目来源：`origin/main`
> 同步策略：**手动 fetch + merge**（仅在用户明确说"同步原项目"时执行）

### 1. 三层分支结构

| 层级 | 命名 | 作用 | 寿命 |
|------|------|------|------|
| trunk | `main` | 原项目稳定版，受保护 | 永久 |
| iteration | `feat/frontend-mvp` | 前端需求澄清迭代主线 | 长期 |
| experiment | `feat/frontend-mvp-<子主题>` | 大改/风险改动的子分支 | 短期，验证后并回主线 |

子主题命名示例：
- `feat/frontend-mvp-selection`（选品模块重做）
- `feat/frontend-mvp-title-rules`（标题规则重构）
- `feat/frontend-mvp-fields`（字段定义重构）

### 2. Scope 限定原则（铁律）

> **当前分支的所有改动，scope 必须限定到当前 MVP 已出现的模块。**

MVP 模块清单（来自 [web/src/v2/nav.ts](web/src/v2/nav.ts)）：
- `dashboard` | `insights` | `competitors` | `title-optimization`
- `inbox` | `link-collect` | `batch-collect`
- 框架层: `layout` | `auth` | `workflow` | `ci`

新增模块前必须先 grep 原项目是否已有（见下方 SOP）。

### 3. 跨模块需求登记（铁律）

当一个 commit 涉及**当前分支页面范围之外**的需求时：
- 不要在 commit 里偷偷塞无关改动
- 登记到 [.claude/requirements-backlog.md](.claude/requirements-backlog.md)
- commit footer 注明：`跨模块需求: backlog-id`

适用范围：
- 不在当前路由范围的需求（即使功能相关）
- 字段定义变更（影响其他模块读这个字段时）
- 框架层 / 主题 / 构建配置变更
- 暂未决定是否纳入 MVP 的功能

### 4. 模块迁移 SOP（从原项目 porting）

新增模块前，**先到原项目 grep**：

```bash
# 假设原项目在 ../EA-app-origin
cd ../EA-app-origin
grep -rn "<module-name>" --include="*.ts" --include="*.tsx" \
  web/src/ docs/
```

决策树：
| 场景 | 决策 |
|------|------|
| 原项目有，且 MVP 需要 | **porting**：原样拉过来，再按需改造 |
| 原项目有，但 MVP 不需要 | 跳过（登记到 backlog） |
| 原项目无 | 重写（全新实现） |

Porting 时不要 `git mv`，直接 `cp` 后再改造，避免跨分支 history 污染。

### 5. Commit 规范：Conventional Commits

```
<type>(<scope>): <subject>
```

**type 类型**：
| type | 用途 | 例子 |
|------|------|------|
| `feat` | 新功能 | `feat(insights): 增加 3 步 Skill 流程展示` |
| `fix` | 修复 bug | `fix(dashboard): 修复中文转义乱码` |
| `refactor` | 重构（无功能变化） | `refactor(title): 抽离 rule-engine 抽象层` |
| `chore` | 杂项（依赖、配置、CI） | `chore(deps): 升级 react-query v5` |
| `docs` | 文档 | `docs(readme): 补充字段说明` |
| `style` | 样式（不改逻辑） | `style(card): 调整圆角与间距` |
| `test` | 测试 | `test(selection): 补 Score 边界测试` |
| `field` | 字段增删改 | `field(insights): 新增 recommendedAt 字段` |
| `revert` | 回滚 | `revert: 撤销 #123 的字段变更` |

**scope 限定到模块**：见上方 MVP 模块清单。

**commit template**：仓库根目录 `.gitmessage`（启用：`git config commit.template .gitmessage`）

### 6. 同步策略

- **从 main 同步**：`git fetch origin && git merge origin/main --no-ff`
- **频率**：仅在用户说"同步原项目"时执行（避免自动同步打断当前工作）
- **冲突解决**：以 main 为准，前端调整留新功能

---

## 铁律速查（cheat sheet）

每次动手前对照：
1. ☐ 改动 scope 在 MVP 模块清单内？（否则进 backlog）
2. ☐ 新模块已 grep 原项目？（porting SOP 第 4 条）
3. ☐ 字段变化同步更新 mock 数据？
4. ☐ commit 符合 Conventional Commits？
5. ☐ 涉及跨模块需求已登记 backlog？

