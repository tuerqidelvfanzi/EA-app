import { Link } from "react-router-dom";
import { Card, Badge, Button } from "../components/ui";
import { WorkflowGuide } from "../components/WorkflowGuide";
import { ApiModeBanner } from "../components/ApiModeBanner";
import { downloadExtensionZip } from "../lib/extension";
import { useMetrics } from "../hooks/useAppQueries";
import { isDemoMode } from "../lib/demoConfig";

// 当前展示范围（会议 12:00-17:00 共识）：
// 3 大核心：选品 / 标题优化 / 竞品分析；支撑：采集箱 / 链接直采 / 批量采集
const QUICK_ACTIONS = [
  { icon: "🎯", label: "选品", desc: "插件采集 → Skill 分析 → 选品报告", to: "/app/insights" },
  { icon: "🔍", label: "竞品分析", desc: "输入链接 → 自动分析 → 输出结论", to: "/app/competitors" },
  { icon: "✏️", label: "标题优化", desc: "导入表格 → 预设规则 → 上架标题", to: "/app/title-optimization" },
  { icon: "📥", label: "采集箱", desc: "插件/链接/批量采集商品", to: "/app/inbox" },
  { icon: "🔗", label: "链接直采", desc: "粘贴商品链接一键采集", to: "/app/link-collect" },
  { icon: "⚡", label: "批量采集", desc: "榜单/搜索页批量入库", to: "/app/batch-collect" },
];

const ACTIVITIES = [
  { time: "今天 10:30", text: "插件采集「韩版童装连衣裙」入采集箱" },
  { time: "今天 10:25", text: "选品 Skill 分析完成，发掘 3 款值得推广候选" },
  { time: "今天 09:50", text: "标题优化：导入 50 行 → 输出 48 条上架标题" },
  { time: "昨天 18:30", text: "竞品分析：输入淘宝商品链接 → 输出结论报告" },
  { time: "昨天 15:20", text: "批量采集「童装 TOP 榜」30 款入采集箱" },
];

export function DashboardPage() {
  const { data: m, isLoading } = useMetrics();
  const demo = isDemoMode();
  const stat = (val: number | undefined, suffix = "") =>
    isLoading ? "—" : (val ?? 0) + suffix;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-medium">v3.0 · MVP 范围</span>
            {demo && <span className="px-2.5 py-0.5 rounded-full bg-amber-400/30 text-xs font-medium">✨ 演示版</span>}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">电商助手</h1>
          <p className="mt-2 text-white/70 max-w-md">
            当前展示范围：选品 · 竞品分析 · 标题优化 — 插件采集 → 后端 Skill 分析 → 报告输出
          </p>
          <div className="flex gap-3 mt-6">
            <Link to="/app/insights">
              <Button className="bg-white text-indigo-700 hover:bg-white/90 font-medium shadow-lg">开始选品</Button>
            </Link>
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={downloadExtensionZip}>下载插件</Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "采集箱", value: stat(m?.rawCount), sub: "已采集商品", color: "from-amber-50 to-orange-50 border-amber-200", icon: "📦" },
          { label: "选品候选", value: stat(m?.processingCount), sub: "Skill 分析中", color: "from-blue-50 to-sky-50 border-blue-200", icon: "🎯" },
          { label: "今日新增", value: stat(m ? Math.floor(m.rawCount * 0.3) : undefined), sub: "今日采集", color: "from-purple-50 to-violet-50 border-purple-200", icon: "☁️" },
          { label: "值得推广", value: stat(m?.publishedCount), sub: "选品结论命中", color: "from-green-50 to-emerald-50 border-green-200", icon: "✅" },
        ].map((kpi) => (
          <Card key={kpi.label} className={"border bg-gradient-to-br " + kpi.color}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">{kpi.label}</span>
              <span className="text-xl">{kpi.icon}</span>
            </div>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">{kpi.sub}</div>
          </Card>
        ))}
      </div>

      {/* Quick Actions + Workflow */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <h3 className="font-semibold mb-4">快速入口</h3>
          <div className="space-y-2">
            {QUICK_ACTIONS.map((a) => (
              <Link key={a.label} to={a.to} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--color-muted)] transition group">
                <span className="text-2xl group-hover:scale-110 transition">{a.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{a.label}</div>
                  <div className="text-xs text-[var(--color-text-muted)] truncate">{a.desc}</div>
                </div>
                <span className="text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition">→</span>
              </Link>
            ))}
          </div>
        </Card>

        {/* Workflow */}
        <Card className="lg:col-span-2">
          <h3 className="font-semibold mb-4">标准作业流程</h3>
          <WorkflowGuide />
        </Card>
      </div>

      {/* Activity Feed + Focus */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="font-semibold mb-4">近期活动</h3>
          <div className="space-y-4">
            {ACTIVITIES.map((a, i) => (
              <div key={i} className="flex gap-3">
                <div className="relative flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] mt-1.5" />
                  {i < ACTIVITIES.length - 1 && <div className="w-px flex-1 bg-[var(--color-border)] mt-1" />}
                </div>
                <div className="flex-1 pb-1">
                  <p className="text-sm">{a.text}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">当前聚焦</h3>
          <div className="space-y-4">
            {[
              { title: "选品", desc: "童装 / T恤类目 · 后端 Skill 分析 · 输出值得推广候选", icon: "🎯" },
              { title: "标题优化", desc: "导入表格 → 预设规则（去废词 / 补热搜）→ 上架标题", icon: "✏️" },
              { title: "竞品分析", desc: "输入商品链接 → 自动分析 → 输出结论", icon: "🔍" },
            ].map((item) => (
              <div key={item.title} className="p-4 rounded-xl bg-[var(--color-muted)]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium text-sm">{item.title}</span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}