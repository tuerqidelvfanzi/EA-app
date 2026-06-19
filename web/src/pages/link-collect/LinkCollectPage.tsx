/**
 * 链接采集页（合并：直采 + 批量 + AI 扩展） — V4 重设计版
 *
 * 设计依据（[docs/requirements-draft/requirements-draft-v40-mvp-redesign.md §第 5 页]）：
 *   1. **链接直采 + 批量采集合并**（同一功能，深度不同）
 *   2. 加 AI 对话框支持扩展采集指令：
 *      - "采集类似商品"
 *      - "采集同规格商品"
 *      - "采集同类型商品"
 *   3. 三种模式（tab）：
 *      - 直采：单链接，深度浅（只抓当前商品）
 *      - 批量：搜索页/榜单 URL，深度中（批量入库）
 *      - AI 扩展：基于已采集商品，深度深（相似/同款/同类型）
 *   4. /app/batch-collect 路由废弃（保留向后兼容）
 */
import { useState } from 'react';
import { PageHeader, Card, Button, Input, Badge } from '../../components/ui';
import { AIDialog } from '../../components/AIDialog';

type CollectMode = 'direct' | 'batch' | 'expand';

const QUICK_URLS = [
  { label: '1688商品', placeholder: 'https://detail.1688.com/offer/xxx.html' },
  { label: '淘宝商品', placeholder: 'https://item.taobao.com/item.htm?id=xxx' },
  { label: '天猫商品', placeholder: 'https://detail.tmall.com/item.htm?id=xxx' },
  { label: '拼多多商品', placeholder: 'https://mobile.yangkeduo.com/goods.html?goods_id=xxx' },
];

function detectPlatform(url: string): string | null {
  if (url.includes('1688.com')) return '1688';
  if (url.includes('tmall.com')) return '天猫';
  if (url.includes('taobao.com')) return '淘宝';
  if (url.includes('yangkeduo.com') || url.includes('pinduoduo')) return '拼多多';
  return null;
}

export function LinkCollectPage() {
  const [mode, setMode] = useState<CollectMode>('direct');
  const [url, setUrl] = useState('');
  const [batchUrl, setBatchUrl] = useState('https://s.taobao.com/search?q=童装');
  const [maxItems, setMaxItems] = useState(10);
  const [isCollecting, setIsCollecting] = useState(false);
  const [directResult, setDirectResult] = useState<any>(null);
  const [expandBase, setExpandBase] = useState('');

  async function handleDirectCollect() {
    if (!url.trim()) return;
    const platform = detectPlatform(url);
    if (!platform) {
      alert('无法识别平台，请输入有效的 1688/淘宝/天猫/拼多多 链接');
      return;
    }
    setIsCollecting(true);
    setDirectResult(null);
    await new Promise((r) => setTimeout(r, 1800));
    setDirectResult({
      success: true,
      platform,
      title: '2024夏季新款可爱卡通小熊图案印花纯棉短袖T恤儿童百搭休闲上衣',
      price: 29.9,
      images: [
        'https://placehold.co/200x200/pink/white?text=主图',
        'https://placehold.co/200x200/blue/white?text=图2',
        'https://placehold.co/200x200/green/white?text=图3',
      ],
      skuCount: 12,
    });
    setIsCollecting(false);
  }

  async function handleBatchCollect() {
    setIsCollecting(true);
    await new Promise((r) => setTimeout(r, 2500));
    setIsCollecting(false);
    alert(`已批量采集 ${maxItems} 款商品入采集箱（mock）`);
  }

  async function handleExpandCollect() {
    if (!expandBase.trim()) return;
    setIsCollecting(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsCollecting(false);
    alert(`基于 ${expandBase} 已采集 12 个相似商品（mock）`);
  }

  const platform = detectPlatform(url);

  return (
    <>
      <PageHeader
        title="链接采集"
        desc="直采（单链接） · 批量（榜单/搜索） · AI 扩展（相似/同款）"
      />

      {/* AI 对话框（V4 新增） */}
      <div className="mb-4">
        <AIDialog
          contextHint="例如：采集淘宝搜索「女童连衣裙」前 50 条；基于采集箱 #12 找相似款；把已采集商品的同 SKU 规格都拉过来；…"
          presets={[
            { id: 'similar', label: '🔍 采集相似商品', prompt: '采集类似商品' },
            { id: 'same-spec', label: '📐 同规格商品', prompt: '采集同规格商品' },
            { id: 'same-type', label: '🏷️ 同类型商品', prompt: '采集同类型商品' },
            { id: 'batch-search', label: '⚡ 批量搜索', prompt: '批量采集搜索结果' },
          ]}
          onSubmit={(p) => `已记录采集指令: "${p}"（本地 mock）`}
        />
      </div>

      {/* 模式切换 tabs */}
      <div className="mb-4 flex gap-2 border-b border-[var(--color-border)]">
        {[
          { id: 'direct', label: '🔗 链接直采', desc: '单链接 · 浅深度' },
          { id: 'batch', label: '⚡ 批量采集', desc: '搜索/榜单 · 中深度' },
          { id: 'expand', label: '🧠 AI 扩展', desc: '相似/同款 · 深深度' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setMode(t.id as CollectMode)}
            className={`px-4 py-2 text-sm border-b-2 transition ${
              mode === t.id
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] font-medium'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {t.label}
            <span className="ml-2 text-xs opacity-60">{t.desc}</span>
          </button>
        ))}
      </div>

      {/* 模式 1：链接直采 */}
      {mode === 'direct' && (
        <>
          <Card className="mb-4">
            <h3 className="text-sm font-medium mb-3">快速链接模板</h3>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              {QUICK_URLS.map((q) => (
                <div key={q.label} className="p-2 bg-[var(--color-muted)] rounded-lg text-sm">
                  <p className="text-[var(--color-text-muted)]">{q.label}</p>
                  <p className="text-xs mt-1 truncate">{q.placeholder}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">输入商品链接</h3>
              {platform && <Badge tone="ok">已识别: {platform}</Badge>}
            </div>
            <div className="flex gap-3">
              <Input
                placeholder="粘贴 1688/淘宝/天猫/拼多多 商品链接"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleDirectCollect} disabled={isCollecting || !url.trim()}>
                {isCollecting ? '采集中…' : '🚀 开始采集'}
              </Button>
            </div>
            <div className="mt-3 text-xs text-[var(--color-text-muted)]">
              <p>支持平台: 1688 · 淘宝 · 天猫 · 拼多多</p>
              <p>提示: 复杂的商品详情页可能需要更长的采集时间</p>
            </div>
          </Card>

          {isCollecting && (
            <Card className="mb-4">
              <div className="flex items-center gap-4">
                <div className="animate-spin text-2xl">⏳</div>
                <div className="flex-1">
                  <p className="font-medium">正在采集商品…</p>
                  <div className="mt-2 h-2 bg-[var(--color-muted)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-primary)] rounded-full animate-pulse"
                      style={{ width: '60%' }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-4 text-center text-xs text-[var(--color-text-muted)]">
                <div>✓ 访问目标页面</div>
                <div>✓ 解析商品数据</div>
                <div>○ 保存到采集箱</div>
              </div>
            </Card>
          )}

          {directResult && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">✅</span>
                <h3 className="font-medium">采集成功</h3>
                <Badge tone="ok">{directResult.platform}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-[var(--color-text-muted)] mb-1">商品标题</p>
                  <p className="font-medium">{directResult.title}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-muted)] mb-1">价格</p>
                  <p className="font-medium">¥{directResult.price}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-[var(--color-text-muted)] mb-2">
                  商品图片 ({directResult.images.length} 张)
                </p>
                <div className="flex gap-2">
                  {directResult.images.map((img: string, i: number) => (
                    <img key={i} src={img} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  ))}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button>📦 加入采集箱</Button>
                <Button variant="outline">⚙️ 前往处理</Button>
                <Button variant="outline">🗑️ 放弃</Button>
              </div>
            </Card>
          )}
        </>
      )}

      {/* 模式 2：批量采集 */}
      {mode === 'batch' && (
        <>
          <Card className="mb-4">
            <h3 className="text-sm font-medium mb-3">批量采集（搜索页 / 榜单）</h3>
            <div className="space-y-3">
              <Input
                placeholder="搜索 URL 或 榜单 URL"
                value={batchUrl}
                onChange={(e) => setBatchUrl(e.target.value)}
              />
              <div className="flex items-center gap-3">
                <label className="text-sm">最大采集数:</label>
                <Input
                  type="number"
                  value={maxItems}
                  onChange={(e) => setMaxItems(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-xs text-[var(--color-text-muted)]">
                  提示: 阿里系单次建议 ≤ 30（反爬限制）
                </span>
              </div>
              <Button onClick={handleBatchCollect} disabled={isCollecting || !batchUrl.trim()}>
                {isCollecting ? '采集中…' : '⚡ 开始批量采集'}
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-medium mb-3">任务状态（mock）</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between border-b border-[var(--color-border)] pb-2">
                <span>淘宝「童装」搜索 → 已入采集箱 30 款</span>
                <Badge tone="ok">完成</Badge>
              </li>
              <li className="flex justify-between border-b border-[var(--color-border)] pb-2">
                <span>Shopee 女装 TOP 榜 → 进行中（已采集 12/30）</span>
                <Badge tone="warn">运行中</Badge>
              </li>
            </ul>
          </Card>
        </>
      )}

      {/* 模式 3：AI 扩展 */}
      {mode === 'expand' && (
        <Card className="mb-4">
          <h3 className="text-sm font-medium mb-2">AI 扩展采集</h3>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            基于一个已采集商品，AI 自动找相似 / 同规格 / 同类型商品。
            也可以在顶部对话框里直接说："采集与 #42 同款的所有店铺商品"。
          </p>
          <div className="flex gap-3 mb-3">
            <Input
              placeholder="输入商品 ID / 链接（如 inbox:42 或粘贴商品链接）"
              value={expandBase}
              onChange={(e) => setExpandBase(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleExpandCollect} disabled={isCollecting || !expandBase.trim()}>
              {isCollecting ? '扩展中…' : '🧠 开始扩展'}
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="p-3 rounded-lg border border-[var(--color-border)]">
              <p className="text-sm font-medium mb-1">🔍 相似商品</p>
              <p className="text-xs text-[var(--color-text-muted)]">图片/标题向量相似</p>
            </div>
            <div className="p-3 rounded-lg border border-[var(--color-border)]">
              <p className="text-sm font-medium mb-1">📐 同规格</p>
              <p className="text-xs text-[var(--color-text-muted)]">SKU 维度匹配</p>
            </div>
            <div className="p-3 rounded-lg border border-[var(--color-border)]">
              <p className="text-sm font-medium mb-1">🏷️ 同类型</p>
              <p className="text-xs text-[var(--color-text-muted)]">类目 + 风格匹配</p>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}

export default LinkCollectPage;