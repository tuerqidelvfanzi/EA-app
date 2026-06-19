/**
 * 竞品分析 - V4 重设计版
 *
 * 设计依据（[docs/requirements-draft/requirements-draft-v40-mvp-redesign.md §第 3 页]）：
 *   1. **两种链接**：
 *      - 原商品（参考商品）：1 个，来源可选
 *      - 对比链接：1-3 个，手工添加
 *   2. **逻辑分支**：
 *      - 仅原商品 → 只分析这一个（产品画像）
 *      - 原商品 + 对比链接 → 综合对比（1 vs N）
 *   3. **原商品来源**：本地 / 采集箱内 / 自己店铺 / 别人店铺
 *   4. AI 对话框置顶
 *
 * 状态机：idle → analyzing → result
 *   - solo 模式：1 个原商品 → 单品分析
 *   - compare 模式：1 原商品 + N 对比 → 综合对比
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Card, Button, Badge, Input } from '../../components/ui';
import { AIDialog } from '../../components/AIDialog';

type Platform = 'taobao' | 'tmall' | '1688' | 'pinduoduo' | 'shopee' | 'tiktok' | 'other';
type SourceKind = 'local' | 'inbox' | 'mine' | 'other';

const PLATFORM_PATTERNS: { pattern: RegExp; platform: Platform; label: string }[] = [
  { pattern: /item\.taobao\.com|taobao\.com/i, platform: 'taobao', label: '淘宝' },
  { pattern: /detail\.tmall\.com|chaoshi\.detail\.tmall/i, platform: 'tmall', label: '天猫' },
  { pattern: /detail\.1688\.com|1688\.com/i, platform: '1688', label: '1688' },
  { pattern: /yangkeduo\.com|pinduoduo\.com/i, platform: 'pinduoduo', label: '拼多多' },
  { pattern: /shopee\./i, platform: 'shopee', label: 'Shopee' },
  { pattern: /tiktok\.com|抖音|douyin/i, platform: 'tiktok', label: 'TikTok / 抖音' },
];

const PLATFORM_LABEL: Record<Platform, string> = {
  taobao: '淘宝',
  tmall: '天猫',
  '1688': '1688',
  pinduoduo: '拼多多',
  shopee: 'Shopee',
  tiktok: 'TikTok / 抖音',
  other: '其他',
};

const SOURCE_LABEL: Record<SourceKind, string> = {
  local: '本地草稿',
  inbox: '采集箱内',
  mine: '我的店铺',
  other: '他人店铺',
};

function detectPlatform(url: string): Platform {
  for (const p of PLATFORM_PATTERNS) if (p.pattern.test(url)) return p.platform;
  return 'other';
}

// === Mock 商品数据 ===

const MOCK_REFERENCE = {
  product: {
    title: '【热销爆款】2024夏季新款女童纯棉卡通印花短袖T恤 韩版休闲百搭上衣',
    price: 28.8,
    currency: 'CNY',
    thumbnail: 'https://placehold.co/240x240/pink/white?text=Reference',
    sales: 5680,
    shop: '韩都衣舍童装旗舰店',
    rating: 4.8,
  },
  titleSignals: [
    { keyword: '纯棉', signal: 'positive' as const },
    { keyword: '夏季新款', signal: 'positive' as const },
    { keyword: '女童', signal: 'positive' as const },
    { keyword: '韩版', signal: 'neutral' as const },
    { keyword: '卡通印花', signal: 'positive' as const },
    { keyword: '热销爆款', signal: 'negative' as const },
  ],
};

const MOCK_COMPARE_ITEMS = [
  {
    title: '夏季女童纯棉短袖 卡通印花 公主裙',
    price: 32.5,
    sales: 4200,
    rating: 4.7,
    shop: '巴拉巴拉官方旗舰店',
    diff: ['价格高 +3.7', '销量低 -1480', '评分相当'],
  },
  {
    title: '韩版童装连衣裙女童 夏季纯棉公主裙',
    price: 25.0,
    sales: 6800,
    rating: 4.6,
    shop: '南极人童装店',
    diff: ['价格低 -3.8', '销量高 +1120', '评分低 -0.2'],
  },
];

export function CompetitorsPage() {
  const [referenceUrl, setReferenceUrl] = useState('');
  const [referenceSource, setReferenceSource] = useState<SourceKind>('inbox');
  const [compareUrls, setCompareUrls] = useState<string[]>(['']);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mode, setMode] = useState<'idle' | 'reference' | 'compare'>('idle');

  const refPlatform = referenceUrl.trim() ? detectPlatform(referenceUrl) : null;
  const hasCompare = compareUrls.some((u) => u.trim());

  async function handleAnalyze() {
    if (!referenceUrl.trim()) return;
    setIsAnalyzing(true);
    await new Promise((r) => setTimeout(r, 1800));
    setMode(hasCompare ? 'compare' : 'reference');
    setIsAnalyzing(false);
  }

  function addCompare() {
    if (compareUrls.length < 3) setCompareUrls([...compareUrls, '']);
  }
  function removeCompare(i: number) {
    setCompareUrls(compareUrls.filter((_, idx) => idx !== i));
  }
  function updateCompare(i: number, v: string) {
    setCompareUrls(compareUrls.map((u, idx) => (idx === i ? v : u)));
  }

  return (
    <>
      <PageHeader title="竞品分析" desc="原商品 + 1~3 个对比链接：单品画像 或 综合对比" />

      {/* AI 对话框（V4 新增） */}
      <div className="mb-4">
        <AIDialog
          contextHint="例如：分析这个原商品在淘宝的优劣势；把采集箱内 #12 作为参考，跟这 3 个链接对比；…"
          presets={[
            { id: 'solo', label: '🔍 单品画像', prompt: '只分析这个原商品' },
            { id: 'compare', label: '⚖️ 综合对比', prompt: '对比原商品与对比链接' },
            { id: 'history', label: '📜 历史分析', prompt: '查看最近分析记录' },
          ]}
          onSubmit={(p) => `已收到竞品分析指令: "${p}"`}
        />
      </div>

      {/* 输入区 */}
      <Card className="mb-4">
        <h3 className="font-medium mb-3">📥 设置对比对象</h3>

        {/* 原商品 */}
        <div className="rounded-lg border border-[var(--color-border)] p-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Badge tone="ok">原商品 · 必填</Badge>
            <span className="text-sm font-medium">参考商品（1 个）</span>
            {refPlatform && (
              <Badge tone="default">已识别: {PLATFORM_LABEL[refPlatform]}</Badge>
            )}
          </div>
          <div className="flex gap-2 mb-2">
            <select
              value={referenceSource}
              onChange={(e) => setReferenceSource(e.target.value as SourceKind)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            >
              <option value="local">本地草稿</option>
              <option value="inbox">采集箱内</option>
              <option value="mine">我的店铺</option>
              <option value="other">他人店铺</option>
            </select>
            <Input
              placeholder="粘贴商品链接 / 从来源选择"
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        {/* 对比链接 */}
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <Badge tone="warn">对比链接 · 可选 1-3 个</Badge>
            <span className="text-xs text-[var(--color-text-muted)]">
              不填则只分析原商品（单品画像）
            </span>
          </div>
          <div className="space-y-2">
            {compareUrls.map((url, i) => (
              <div key={i} className="flex gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-muted)] text-sm font-medium">
                  #{i + 1}
                </span>
                <Input
                  placeholder={`对比商品 #${i + 1} 链接`}
                  value={url}
                  onChange={(e) => updateCompare(i, e.target.value)}
                />
                {compareUrls.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeCompare(i)}>
                    删
                  </Button>
                )}
              </div>
            ))}
          </div>
          {compareUrls.length < 3 && (
            <Button variant="outline" size="sm" className="mt-2" onClick={addCompare}>
              + 添加对比链接
            </Button>
          )}
        </div>

        <Button onClick={handleAnalyze} disabled={isAnalyzing || !referenceUrl.trim()}>
          {isAnalyzing ? '分析中…' : hasCompare ? '⚖️ 开始综合对比' : '🔍 开始单品画像'}
        </Button>
      </Card>

      {/* 分析中 */}
      {isAnalyzing && (
        <Card className="mb-4">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
            <p className="text-sm">
              后端正在抓取{mode === 'compare' ? '并对比' : ''}商品信息…
            </p>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs text-[var(--color-text-muted)]">
            <div>○ 访问原商品页</div>
            <div>○ 抽取标题/价格/SKU</div>
            <div>{hasCompare ? '○ 访问对比商品' : '○ 调用管线分析'}</div>
            <div>○ 生成{mode === 'compare' ? '对比' : '单品'}结论</div>
          </div>
        </Card>
      )}

      {/* 结果：单品画像 */}
      {mode === 'reference' && !isAnalyzing && (
        <Card className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📋</span>
            <h3 className="font-medium">单品画像（原商品分析）</h3>
            <Badge tone="default">{SOURCE_LABEL[referenceSource]}</Badge>
          </div>
          <div className="flex gap-4 mb-3">
            <img src={MOCK_REFERENCE.product.thumbnail} alt="" className="h-28 w-28 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="font-medium leading-relaxed">{MOCK_REFERENCE.product.title}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <Badge tone="ok">{MOCK_REFERENCE.product.shop}</Badge>
                <Badge tone="ok">评分 {MOCK_REFERENCE.product.rating}</Badge>
                <Badge>月销 {MOCK_REFERENCE.product.sales.toLocaleString()}</Badge>
              </div>
              <p className="mt-3 text-2xl font-bold text-[var(--color-primary)]">
                ¥{MOCK_REFERENCE.product.price}
              </p>
            </div>
          </div>
          <div className="border-t border-[var(--color-border)] pt-3">
            <p className="text-sm font-medium mb-2">标题卖点词频</p>
            <div className="space-y-1">
              {MOCK_REFERENCE.titleSignals.map((s) => (
                <div key={s.keyword} className="flex items-center justify-between text-sm">
                  <span>{s.keyword}</span>
                  <Badge tone={s.signal === 'positive' ? 'ok' : s.signal === 'negative' ? 'warn' : 'default'}>
                    {s.signal === 'positive' ? '转化贡献高' : s.signal === 'negative' ? '建议优化' : '中性'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* 结果：综合对比 */}
      {mode === 'compare' && !isAnalyzing && (
        <>
          <Card className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">⚖️</span>
              <h3 className="font-medium">
                综合对比：原商品 vs {compareUrls.filter((u) => u).length} 个对比商品
              </h3>
            </div>

            {/* 原商品 */}
            <div className="rounded-lg border-2 border-[var(--color-primary)] p-3 mb-3 bg-[var(--color-primary-soft)]">
              <Badge tone="ok">原商品</Badge>
              <p className="font-medium mt-1">{MOCK_REFERENCE.product.title}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {MOCK_REFERENCE.product.shop} · ¥{MOCK_REFERENCE.product.price} · 月销{' '}
                {MOCK_REFERENCE.product.sales.toLocaleString()} · 评分 {MOCK_REFERENCE.product.rating}
              </p>
            </div>

            {/* 对比商品 */}
            <p className="text-sm font-medium mb-2">对比商品</p>
            <div className="space-y-2">
              {MOCK_COMPARE_ITEMS.map((item, i) => (
                <div key={i} className="rounded-lg border border-[var(--color-border)] p-3">
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {item.shop} · ¥{item.price} · 月销 {item.sales.toLocaleString()} · 评分 {item.rating}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.diff.map((d) => (
                      <Badge key={d}>{d}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 对比结论 */}
          <Card className="mb-4">
            <h3 className="font-medium mb-3">📊 对比结论</h3>
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 border border-green-200">
                <p className="font-medium text-green-700 mb-2">✓ 优势</p>
                <ul className="space-y-1">
                  <li>• 标题卖点词数（5 个）高于对比均值（3 个）</li>
                  <li>• 评分 4.8 高于对比均价 4.65</li>
                </ul>
              </div>
              <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 p-3 border border-orange-200">
                <p className="font-medium text-orange-700 mb-2">⚠ 短板</p>
                <ul className="space-y-1">
                  <li>• 销量 5680 低于对比 #2（6800）</li>
                  <li>• 价格 ¥28.8 高于对比 #2（¥25）</li>
                </ul>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* 空状态 */}
      {!isAnalyzing && mode === 'idle' && (
        <Card className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-[var(--color-text-muted)]">设置原商品链接，开始竞品分析</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            不加对比链接 = 单品画像 · 加 1-3 个 = 综合对比
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link to="/app/inbox">
              <Button variant="outline">从采集箱选</Button>
            </Link>
            <Link to="/app/insights">
              <Button variant="outline">从选品结果选</Button>
            </Link>
          </div>
        </Card>
      )}
    </>
  );
}

export default CompetitorsPage;