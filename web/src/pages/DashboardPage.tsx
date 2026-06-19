/**
 * Dashboard / 总览 — V4 重设计版
 *
 * 设计依据（[docs/requirements-draft/requirements-draft-v40-mvp-redesign.md §第 1 页]）：
 *   1. **标准作业流程放最上面**（之前在中部）
 *   2. **AI 对话框置顶**：用户可在首页发起任何 AI 操作（要选品 / 要分析 / 要改写）
 *   3. **Hero Banner 合并**：作为流程卡上方的提示条（非独立蓝色区）
 *   4. **KPI 4 卡逻辑重写**：之前"采集箱/选品候选/今日新增/值得推广"无说明，
 *      现在改为"按状态机的进度"，逻辑明确：
 *        ① 已采集 → ② 已选品 → ③ 改写中 → ④ 待上架
 *      每张卡代表"从采集到上架"漏斗中的一段计数
 *   5. **快速入口卡片删除**：用户原话"完全没有必要请去掉"
 *
 * 数据来源：useMetrics() 保持不变（rawCount / processingCount / publishedCount）
 *   - rawCount = ① 已采集
 *   - processingCount = ② 已选品
 *   - processingCount × 0.6 = ③ 改写中（mock 拆分）
 *   - publishedCount = ④ 待上架
 */
import { Link } from "react-router-dom";
import { Card, Badge } from "../components/ui";
import { WorkflowGuide } from "../components/WorkflowGuide";
import { AIDialog } from "../components/AIDialog";
import { downloadExtensionZip } from "../lib/extension";
import { useMetrics } from "../hooks/useAppQueries";
import { isDemoMode } from "../lib/demoConfig";

// === KPI 漏斗（按状态机分组） ===

const KPI_FUNNEL = [
  { id: "collected", label: "已采集", desc: "进入采集箱的商品数", color: "from-amber-50 to-orange-50 border-amber-200", icon: "📥" },
  { id: "selected", label: "已选品", desc: "完成管线分析 · 待改写", color: "from-blue-50 to-sky-50 border-blue-200", icon: "🎯" },
  { id: "rewriting", label: "改写中", desc: "管线处理中 · 待上架", color: "from-purple-50 to-violet-50 border-purple-200", icon: "✏️" },
  { id: "published", label: "待上架", desc: "改写完成 · 写入草稿箱", color: "from-green-50 to-emerald-50 border-green-200", icon: "🚀" },
] as const;

export function DashboardPage() {
  const { data: m, isLoading } = useMetrics();
  const demo = isDemoMode();
  const v = (n: number | undefined, suffix = "") => (isLoading ? "—" : (n ?? 0) + suffix);

  return (
    <div className="space-y-5">
      {/* ① AI 对话框（最顶） */}
      <AIDialog
        contextHint="例如：帮我从淘宝采集最近 7 天销量 TOP 50 的女童连衣裙；分析这 3 个链接的优劣势；把 inbox 里 #42 商品改写为越南语上架 Shopee…"
        presets={[
          { id: "collect", label: "📥 采集热销品", prompt: "采集当前热销品入采集箱" },
          { id: "select", label: "🎯 跑选品分析", prompt: "对采集箱内的商品运行选品分析" },
          { id: "rewrite", label: "✏️ 批量改写", prompt: "对已选品结果批量改写" },
          { id: "publish", label: "🚀 写入草稿箱", prompt: "把改写完成的商品写入目标平台草稿箱" },
        ]}
        onSubmit={(p) =>
          `已收到指令: "${p}"\n\n提示：当前为前端 mock，未接通后端管线时会先解析为本地动作建议。完整执行需要后端管线 + 浏览器插件。`
        }
      />

      {/* ② Hero 提示条（合并态） */}
      <Card className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-indigo-200/50 py-3 px-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Badge tone="ok">v4 · V3 管道</Badge>
            <span className="text-[var(--color-text)]">
              电商助手 · 端到端流水线: <strong>采集 → 选品 → 改写 → 上架</strong>
            </span>
            {demo && <Badge tone="warn">演示版</Badge>}
          </div>
          <div className="flex gap-2">
            <Link
              to="/app/insights"
              className="rounded-lg bg-[var(--color-primary)] px-3 py-1 text-xs text-[var(--color-primary-fg)] font-medium hover:opacity-90"
            >
              开始选品
            </Link>
            <button
              type="button"
              onClick={downloadExtensionZip}
              className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-1 text-xs hover:bg-[var(--color-muted)]"
            >
              下载插件
            </button>
          </div>
        </div>
      </Card>

      {/* ③ 标准作业流程（最上面） */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">📍 标准作业流程</h3>
          <span className="text-xs text-[var(--color-text-muted)]">4 步 · 端到端</span>
        </div>
        <WorkflowGuide />
      </Card>

      {/* ④ KPI 漏斗（按状态机分组） */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_FUNNEL.map((kpi, i) => {
          let value: number | undefined;
          if (kpi.id === "collected") value = m?.rawCount;
          else if (kpi.id === "selected") value = m?.processingCount;
          else if (kpi.id === "rewriting") value = m ? Math.floor(m.processingCount * 0.6) : undefined;
          else if (kpi.id === "published") value = m?.publishedCount;
          return (
            <Card key={kpi.id} className={`border bg-gradient-to-br ${kpi.color} relative`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[var(--color-text-muted)]">
                  步骤 {i + 1} · {kpi.label}
                </span>
                <span className="text-xl">{kpi.icon}</span>
              </div>
              <div className="text-2xl font-bold">{v(value)}</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-1">{kpi.desc}</div>
            </Card>
          );
        })}
      </div>

      {/* ⑤ 最近活动（保留） */}
      <Card>
        <h3 className="font-semibold mb-3">📝 最近活动</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between border-b border-[var(--color-border)] pb-2">
            <span>插件采集「韩版童装连衣裙」入采集箱</span>
            <span className="text-xs text-[var(--color-text-muted)]">今天 10:30</span>
          </li>
          <li className="flex justify-between border-b border-[var(--color-border)] pb-2">
            <span>选品管线分析完成：发掘 3 款值得推广候选</span>
            <span className="text-xs text-[var(--color-text-muted)]">今天 10:25</span>
          </li>
          <li className="flex justify-between border-b border-[var(--color-border)] pb-2">
            <span>标题优化：导入 50 行 → 输出 48 条上架标题</span>
            <span className="text-xs text-[var(--color-text-muted)]">今天 09:50</span>
          </li>
          <li className="flex justify-between border-b border-[var(--color-border)] pb-2">
            <span>竞品分析：输入淘宝商品链接 → 输出结论报告</span>
            <span className="text-xs text-[var(--color-text-muted)]">昨天 18:30</span>
          </li>
          <li className="flex justify-between">
            <span>批量采集「童装 TOP 榜」30 款入采集箱</span>
            <span className="text-xs text-[var(--color-text-muted)]">昨天 15:20</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}