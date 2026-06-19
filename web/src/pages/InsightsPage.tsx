/**
 * 选品 - V4 重设计版
 *
 * 设计依据（[docs/requirements-draft/requirements-draft-v40-mvp-redesign.md §第 2 页]）：
 *   1. 顶部加 AI 对话框（其他页一致）
 *   2. **选品模板放出来**：之前藏在设置里，现在暴露在选品页（用户可见）
 *      - 模板按国家/类目划分
 *      - 用户可查看当前生效的选品规则
 *      - V4.2：模板可点击切换激活（用户 06-19 反馈）
 *      - V4.2：「管理模板」链接到 /app/templates（替换原 /app/settings 错误链接）
 *   3. 保留原有四步流程可视化 + 选品报告
 *   4. V4.2：选品报告每条可点击展开详情（命中的维度规则）
 *
 * 模板入口说明：
 *   - 选品模板是后端分析流程的参数集（GMV 阈值 / CTR 阈值 / 同款数 / 价格段 等）
 *   - 模板数据来自后端 /api/selection-templates，本地 mock 提供 3 个国家的示例
 *   - V4.2：术语统一「后端分析」替换原「Skill」（用户 06-19 反馈）
 */
import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Card, Button, Badge } from '../components/ui';
import { AIDialog } from '../components/AIDialog';
import { downloadExtensionZip } from '../lib/extension';
import { useInsight } from '../hooks/useAppQueries';

// === 选品模板（V4 新增：暴露给前端） ===

type SelectionTemplate = {
  id: string;
  name: string;
  market: string;
  category: string;
  thresholds: {
    minGmv: number;
    minCtr: number;
    maxSameProduct: number;
    priceRange: [number, number];
  };
  reportDimensions: string[];
  active: boolean;
};

const MOCK_TEMPLATES: SelectionTemplate[] = [
  {
    id: 't-vn-kids',
    name: '越南 · 童装',
    market: '越南',
    category: '童装',
    thresholds: { minGmv: 30000, minCtr: 9, maxSameProduct: 5, priceRange: [15, 60] },
    reportDimensions: ['GMV', 'CTR', '同款数', '评分', '趋势', '毛利率'],
    active: true,
  },
  {
    id: 't-th-female',
    name: '泰国 · 女装',
    market: '泰国',
    category: '女装',
    thresholds: { minGmv: 25000, minCtr: 8, maxSameProduct: 6, priceRange: [10, 50] },
    reportDimensions: ['GMV', 'CTR', '同款数', '评分', '趋势'],
    active: false,
  },
  {
    id: 't-br-3c',
    name: '巴西 · 3C',
    market: '巴西',
    category: '3C 数码',
    thresholds: { minGmv: 50000, minCtr: 10, maxSameProduct: 4, priceRange: [40, 200] },
    reportDimensions: ['GMV', 'CTR', '同款数', '评分', '认证'],
    active: false,
  },
];

// === 模拟数据 ===

type Recommendation = 'promote' | 'observe' | 'skip';

interface SelectionItem {
  id: string;
  thumbnail: string;
  title: string;
  source: string;
  price: number;
  gmv: number;
  ctr: number;
  sameProductCount: number;
  rating: number;
  /** 选品后端分析输出：值得推广 / 观察 / 跳过 */
  recommendation: Recommendation;
  /** 命中的维度（GMV / CTR / 同款数 / 利润 / 趋势） */
  matchedDimensions: string[];
  reason: string;
}

const MOCK_SELECTION: SelectionItem[] = [
  {
    id: 'p1',
    thumbnail: 'https://placehold.co/120x120/pink/white?text=T1',
    title: '纯棉卡通印花短袖T恤 女童夏季新款 韩版休闲百搭',
    source: 'tiktok',
    price: 29.9,
    gmv: 48500,
    ctr: 12.5,
    sameProductCount: 3,
    rating: 4.8,
    recommendation: 'promote',
    matchedDimensions: ['GMV', 'CTR', '趋势↑', '低同款'],
    reason: '周 GMV $48.5K 高于阈值、CTR 12.5% 远超均值、同款仅 3 条竞争度低，强烈推荐推广',
  },
  {
    id: 'p2',
    thumbnail: 'https://placehold.co/120x120/blue/white?text=T2',
    title: '夏季透气速干运动T恤 男童 纯棉 多色可选',
    source: 'shopee',
    price: 35.0,
    gmv: 36200,
    ctr: 9.8,
    sameProductCount: 5,
    rating: 4.7,
    recommendation: 'promote',
    matchedDimensions: ['GMV', 'CTR', '趋势↑'],
    reason: '销量与点击率均达标，运动速干品类 7 日内搜索热度 +24%',
  },
  {
    id: 'p3',
    thumbnail: 'https://placehold.co/120x120/white/black?text=T3',
    title: '宽松百搭纯棉打底衫 女童 春秋款',
    source: 'tiktok',
    price: 22.5,
    gmv: 28500,
    ctr: 8.2,
    sameProductCount: 8,
    rating: 4.6,
    recommendation: 'observe',
    matchedDimensions: ['GMV', 'CTR'],
    reason: '基本指标达标但同款数已达 8 条，建议先观察',
  },
  {
    id: 'p4',
    thumbnail: 'https://placehold.co/120x120/black/white?text=T4',
    title: '潮流街头风格印花T恤 男款',
    source: 'shopee',
    price: 45.0,
    gmv: 22100,
    ctr: 7.5,
    sameProductCount: 12,
    rating: 4.5,
    recommendation: 'observe',
    matchedDimensions: ['GMV'],
    reason: 'GMV 达标但 CTR 一般、同款 12 条偏多',
  },
  {
    id: 'p5',
    thumbnail: 'https://placehold.co/120x120/gray/white?text=T5',
    title: '韩版修身圆领短袖 女童',
    source: 'tiktok',
    price: 28.8,
    gmv: 15800,
    ctr: 6.3,
    sameProductCount: 6,
    rating: 4.4,
    recommendation: 'skip',
    matchedDimensions: ['CTR'],
    reason: '「修身」类词汇热度下降趋势，GMV 低于阈值',
  },
];

// === 工具组件 ===

function StepBadge({ n, status }: { n: number; status: 'pending' | 'running' | 'done' }) {
  const tone =
    status === 'done' ? 'bg-green-500 text-white' : status === 'running'
      ? 'bg-[var(--color-primary)] text-white animate-pulse'
      : 'bg-[var(--color-muted)] text-muted';
  const Icon = status === 'done' ? '✓' : status === 'running' ? '…' : String(n);
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${tone}`}
    >
      {Icon}
    </span>
  );
}

function RecommendationBadge({ rec }: { rec: Recommendation }) {
  if (rec === 'promote') return <Badge tone="ok">✓ 值得推广</Badge>;
  if (rec === 'observe') return <Badge tone="warn">观察</Badge>;
  return <Badge tone="default">跳过</Badge>;
}

// === 主页面 ===

export function InsightsPage() {
  const { data: insight, isLoading } = useInsight();

  // 流程阶段状态（demo 用，本地模拟；生产应读后端任务状态）
  const [phase, setPhase] = useState<'idle' | 'collecting' | 'analyzing' | 'done'>('idle');
  const [collectionStats, setCollectionStats] = useState({
    candidates: 156,
    inDb: 142,
    blocked: 14,
  });
  const [analysisStep, setAnalysisStep] = useState(0); // 0..3

  // V4.2：模板可切换激活（点击卡片）
  const [templates, setTemplates] = useState<SelectionTemplate[]>(MOCK_TEMPLATES);
  function activateTemplate(id: string) {
    setTemplates((prev) => prev.map((t) => ({ ...t, active: t.id === id })));
  }
  const activeTpl = templates.find((t) => t.active) ?? templates[0];

  // V4.2：选品报告每条可点击展开详情
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  // 模拟「一键运行」：依次推进阶段
  function runFullPipeline() {
    setPhase('collecting');
    setAnalysisStep(0);
    setTimeout(() => setPhase('analyzing'), 1200);
    setTimeout(() => setAnalysisStep(1), 2000);
    setTimeout(() => setAnalysisStep(2), 2800);
    setTimeout(() => {
      setAnalysisStep(3);
      setPhase('done');
    }, 3600);
  }

  const items = MOCK_SELECTION;
  const promoteCount = items.filter((i) => i.recommendation === 'promote').length;
  const observeCount = items.filter((i) => i.recommendation === 'observe').length;
  const skipCount = items.filter((i) => i.recommendation === 'skip').length;

  if (isLoading) {
    return <PageHeader title="选品" desc="加载中…" />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="选品"
        desc="插件采集 → 后端分析（多维度）→ 输出值得推广候选"
      />

      {/* AI 对话框（V4 新增） */}
      <AIDialog
        contextHint="例如：帮我按越南童装模板筛选采集箱内的商品；把 #12 和 #35 加入对比分析；导出值得推广候选…"
        presets={[
          { id: 'run-template', label: '🎯 按当前模板跑选品', prompt: '用当前激活的选品模板分析采集箱' },
          { id: 'switch', label: '🌏 切换选品模板', prompt: '切换到其他市场的选品模板' },
          { id: 'export', label: '📤 导出候选', prompt: '把值得推广候选导出为 CSV' },
        ]}
        onSubmit={(p) => `已记录选品指令: "${p}"（本地 mock，未接通后端分析）`}
      />

      {/* 选品模板（V4 新增：暴露给前端 · V4.2 可点击切换激活） */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">📋 选品模板（按国家/类目）— 点击卡片可切换激活</h3>
          <Link to="/app/templates" className="text-xs text-[var(--color-primary)] hover:underline">
            管理模板 →
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => activateTemplate(tpl.id)}
              className={`text-left rounded-lg border p-3 transition cursor-pointer hover:shadow-md ${
                tpl.active
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] ring-2 ring-[var(--color-primary)]/30'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{tpl.name}</span>
                {tpl.active ? (
                  <Badge tone="ok">✓ 当前激活</Badge>
                ) : (
                  <span className="text-xs text-[var(--color-text-muted)]">点击激活 →</span>
                )}
              </div>
              <div className="text-xs text-[var(--color-text-muted)] space-y-1">
                <div>GMV ≥ ${tpl.thresholds.minGmv.toLocaleString()}</div>
                <div>CTR ≥ {tpl.thresholds.minCtr}%</div>
                <div>同款 ≤ {tpl.thresholds.maxSameProduct}</div>
                <div>价格 ${tpl.thresholds.priceRange[0]}–${tpl.thresholds.priceRange[1]}</div>
                <div className="pt-1 border-t border-[var(--color-border)]/50 mt-2">
                  报告维度: {tpl.reportDimensions.join(' / ')}
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* 流程面板：四步状态 */}
      <Card>
        <h3 className="font-medium mb-3">📍 选品流程（当前进度）</h3>
        <div className="grid gap-3 md:grid-cols-4">
          {/* Step 1 · 插件 */}
          <div className="rounded-lg border border-[var(--color-border)] p-3">
            <div className="flex items-center gap-2 mb-2">
              <StepBadge n={1} status="done" />
              <p className="font-medium text-sm">插件就绪</p>
            </div>
            <p className="text-xs text-muted">
              浏览器插件已安装（半自动安装即可，源站详情页可一键采集）
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={downloadExtensionZip}
            >
              重新下载插件
            </Button>
          </div>

          {/* Step 2 · 采集 */}
          <div className="rounded-lg border border-[var(--color-border)] p-3">
            <div className="flex items-center gap-2 mb-2">
              <StepBadge
                n={2}
                status={
                  phase === 'collecting'
                    ? 'running'
                    : phase === 'analyzing' || phase === 'done'
                    ? 'done'
                    : 'pending'
                }
              />
              <p className="font-medium text-sm">数据采集</p>
            </div>
            <p className="text-xs text-muted">
              候选 {collectionStats.candidates} · 入库 {collectionStats.inDb} ·{' '}
              <span className="text-orange-500">反爬 {collectionStats.blocked}</span>
            </p>
            <div className="mt-2 flex gap-1">
              <Link to="/app/inbox">
                <Button variant="outline" size="sm">采集箱</Button>
              </Link>
              <Link to="/app/link-collect">
                <Button variant="outline" size="sm">链接直采</Button>
              </Link>
            </div>
          </div>

          {/* Step 3 · 后端分析 */}
          <div className="rounded-lg border border-[var(--color-border)] p-3">
            <div className="flex items-center gap-2 mb-2">
              <StepBadge
                n={3}
                status={
                  phase === 'analyzing'
                    ? 'running'
                    : phase === 'done'
                    ? 'done'
                    : 'pending'
                }
              />
              <p className="font-medium text-sm">后端分析</p>
            </div>
            <ul className="text-xs space-y-1">
              <li className={analysisStep >= 1 ? 'text-[var(--color-primary)]' : 'text-muted'}>
                {analysisStep >= 1 ? '✓' : '○'} 第一步：销量 / 热度维度筛选
              </li>
              <li className={analysisStep >= 2 ? 'text-[var(--color-primary)]' : 'text-muted'}>
                {analysisStep >= 2 ? '✓' : '○'} 第二步：价格 / 毛利维度评估
              </li>
              <li className={analysisStep >= 3 ? 'text-[var(--color-primary)]' : 'text-muted'}>
                {analysisStep >= 3 ? '✓' : '○'} 第三步：竞争度 / 趋势综合评分
              </li>
            </ul>
          </div>

          {/* Step 4 · 输出 */}
          <div className="rounded-lg border border-[var(--color-border)] p-3">
            <div className="flex items-center gap-2 mb-2">
              <StepBadge n={4} status={phase === 'done' ? 'done' : 'pending'} />
              <p className="font-medium text-sm">输出选品结论</p>
            </div>
            <p className="text-xs text-muted">
              值得推广 <strong className="text-green-600">{promoteCount}</strong> · 观察{' '}
              <strong className="text-orange-500">{observeCount}</strong> · 跳过{' '}
              <strong className="text-muted">{skipCount}</strong>
            </p>
            <Button
              size="sm"
              className="mt-2"
              disabled={phase !== 'idle' && phase !== 'done'}
              onClick={runFullPipeline}
            >
              {phase === 'idle' || phase === 'done' ? '🚀 运行完整选品' : '分析中…'}
            </Button>
          </div>
        </div>

        <div className="mt-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 p-3 text-xs text-muted">
          💡 反爬提醒：阿里系源站批量翻页会触发风控。已通过间隔随机化（3-10s）+ 路径多样化 + 模拟人类操作规避；如遇弹验证码，参见 [反爬方案] 文档。
        </div>
      </Card>

      {/* 输出 · 选品报告 */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">📋 选品报告（哪些值得推广）</h3>
          <div className="flex gap-2 text-xs">
            <Badge tone="ok">✓ 值得推广 {promoteCount}</Badge>
            <Badge tone="warn">观察 {observeCount}</Badge>
            <Badge>跳过 {skipCount}</Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] text-muted">
              <tr>
                <th className="py-2 text-left">商品</th>
                <th className="py-2 text-left">来源</th>
                <th className="py-2 text-right">价格</th>
                <th className="py-2 text-right">周 GMV</th>
                <th className="py-2 text-right">CTR</th>
                <th className="py-2 text-right">同款</th>
                <th className="py-2 text-center">命中维度</th>
                <th className="py-2 text-center">建议</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <Fragment key={item.id}>
                  <tr
                    key={`row-${item.id}`}
                    onClick={() => setExpandedReport(expandedReport === item.id ? null : item.id)}
                    className={`border-b border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-primary-soft)] transition ${
                      item.recommendation === 'promote'
                        ? 'bg-green-50/40 dark:bg-green-900/10'
                        : ''
                    } ${expandedReport === item.id ? 'bg-[var(--color-primary-soft)]' : ''}`}
                  >
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={item.thumbnail}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-xs">{item.title}</p>
                          <p className="text-xs text-muted">评分 {item.rating}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 text-muted">{item.source}</td>
                    <td className="py-2 text-right">¥{item.price}</td>
                    <td className="py-2 text-right font-medium">${item.gmv.toLocaleString()}</td>
                    <td className="py-2 text-right">
                      <span
                        className={
                          item.ctr >= 9
                            ? 'text-green-600 font-medium'
                            : item.ctr >= 6
                            ? 'text-orange-500'
                            : 'text-muted'
                        }
                      >
                        {item.ctr}%
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <span
                        className={
                          item.sameProductCount <= 5
                            ? 'text-green-600 font-medium'
                            : item.sameProductCount <= 10
                            ? 'text-orange-500'
                            : 'text-muted'
                        }
                      >
                        {item.sameProductCount}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {item.matchedDimensions.map((d) => (
                          <Badge key={d}>{d}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <RecommendationBadge rec={item.recommendation} />
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                          {expandedReport === item.id ? '收起 ▲' : '详情 ▼'}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {expandedReport === item.id && (
                    <tr key={`detail-${item.id}`} className="bg-[var(--color-muted)]/50">
                      <td colSpan={8} className="py-3 px-3">
                        <div className="grid gap-3 md:grid-cols-3 text-xs">
                          <div>
                            <p className="font-medium mb-1">📐 维度明细（基于「{activeTpl?.name}」）</p>
                            <ul className="space-y-0.5 text-muted">
                              <li>GMV ≥ ${activeTpl?.thresholds.minGmv.toLocaleString()} →
                                <span className={item.gmv >= (activeTpl?.thresholds.minGmv ?? 0) ? 'text-green-600' : 'text-red-500'}>
                                  {' '}${item.gmv.toLocaleString()} {item.gmv >= (activeTpl?.thresholds.minGmv ?? 0) ? '✓' : '✗'}
                                </span>
                              </li>
                              <li>CTR ≥ {activeTpl?.thresholds.minCtr}% →
                                <span className={item.ctr >= (activeTpl?.thresholds.minCtr ?? 0) ? 'text-green-600' : 'text-red-500'}>
                                  {' '}{item.ctr}% {item.ctr >= (activeTpl?.thresholds.minCtr ?? 0) ? '✓' : '✗'}
                                </span>
                              </li>
                              <li>同款 ≤ {activeTpl?.thresholds.maxSameProduct} →
                                <span className={item.sameProductCount <= (activeTpl?.thresholds.maxSameProduct ?? 0) ? 'text-green-600' : 'text-red-500'}>
                                  {' '}{item.sameProductCount} {item.sameProductCount <= (activeTpl?.thresholds.maxSameProduct ?? 0) ? '✓' : '✗'}
                                </span>
                              </li>
                              <li>价格 ${activeTpl?.thresholds.priceRange[0]}–${activeTpl?.thresholds.priceRange[1]} →
                                <span className={
                                  item.price >= (activeTpl?.thresholds.priceRange[0] ?? 0) &&
                                  item.price <= (activeTpl?.thresholds.priceRange[1] ?? 0)
                                    ? 'text-green-600' : 'text-red-500'
                                }>
                                  {' '}¥{item.price}
                                </span>
                              </li>
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium mb-1">🎯 后端分析输出</p>
                            <p className="text-muted">{item.reason}</p>
                          </div>
                          <div>
                            <p className="font-medium mb-1">🚀 下一步动作</p>
                            <div className="flex flex-wrap gap-1">
                              <Link to={`/app/workbench/${item.id}`}>
                                <Button size="sm" variant="outline">进入处理中心</Button>
                              </Link>
                              <Link to="/app/competitors">
                                <Button size="sm" variant="outline">竞品对比</Button>
                              </Link>
                              <Link to="/app/title-optimization">
                                <Button size="sm" variant="outline">标题优化</Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 输出 · 选品结论说明 */}
      <Card>
        <h3 className="font-medium mb-2">📝 选品结论说明</h3>
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 border border-green-200">
            <p className="font-medium text-green-700 dark:text-green-300 mb-1">
              ✓ 值得推广（{promoteCount} 款）
            </p>
            <p className="text-xs text-muted">
              同时满足 GMV ≥ $30K、CTR ≥ 9%、同款 ≤ 5、趋势上升；建议优先采集并生成优化标题。
            </p>
          </div>
          <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 p-3 border border-orange-200">
            <p className="font-medium text-orange-700 dark:text-orange-300 mb-1">
              ⚠ 观察（{observeCount} 款）
            </p>
            <p className="text-xs text-muted">
              部分维度达标但存在风险项（同款偏多 / CTR 一般）；建议 1 周后再评估。
            </p>
          </div>
          <div className="rounded-lg bg-[var(--color-muted)] p-3 border border-[var(--color-border)]">
            <p className="font-medium mb-1">— 跳过（{skipCount} 款）</p>
            <p className="text-xs text-muted">
              不满足选品阈值或趋势向下，暂不推广。
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default InsightsPage;