/**
 * 改写模板管理 — V4 R1 新增页
 *
 * 设计依据（用户 06-19 描述）：
 *   1. 模板 = 规则源（system prompt），AI + 模板 = 管线
 *   2. 三层定位：国家 × 平台 × 品类
 *   3. 品类决定 SKU 段数（服装 3 段 / 灯具 2 段 / 3C 3 段）
 *   4. 标题改写走"竞品调研 → 平台建议 → 改写"链路
 *   5. 双策略：每个模板必须含「高曝光 / 高转化」双 prompt
 *
 * 与 TemplatesPage（选品模板）的区别：
 *   - 选品模板：用于「采集后 → 选品」阶段（已在 TemplatesPage 实现）
 *   - 改写模板（本页）：用于「选品后 → 上架前」阶段
 *
 * 路由：/app/rewrite-templates
 */
import { useState } from 'react';
import { PageHeader, Card, Button, Badge, Input } from '../components/ui';
import { AIDialog } from '../components/AIDialog';
import {
  REWRITE_TEMPLATE_EXAMPLES,
  type RewriteTemplate,
  type RewriteStep,
  type RewriteStrategyPrompt,
} from '../lib/api/types';

// === 工具 ===

const COUNTRIES = ['越南', '泰国', '巴西', '中国', '印尼', '菲律宾', '马来西亚'];
const PLATFORMS = ['Shopee', 'Lazada', 'TikTok Shop', 'Mercado Livre', '淘宝', '天猫', '拼多多', '京东', '1688'];
const CATEGORIES = ['童装', '女装', 'T恤', '3C 数码', '灯具', '鞋类', '美妆', '家居'];
const ASPECTS = ['1:1', '3:4', '9:16', '4:3'] as const;
const MODES: Array<{ value: 'A' | 'B' | 'C'; label: string; desc: string }> = [
  { value: 'A', label: 'A · 多规格服装', desc: '颜色×尺码×...  15-60 SKU' },
  { value: 'B', label: 'B · 中规格产品', desc: '配置选项组合  3-27 SKU' },
  { value: 'C', label: 'C · 少规格/定制', desc: '基础+定制字段  1-5 SKU' },
];

const EMPTY_TEMPLATE: RewriteTemplate = {
  id: '',
  name: '',
  country: '越南',
  platform: 'Shopee',
  category: '童装',
  active: false,
  targetLocale: 'vi-VN',
  categoryMode: 'A',
  systemPrompt: '你是 ... 上品专家。\n品类特征：...\n规则：...',
  pricing: { multiplier: 3.5, currency: 'VND', defaultStock: 50, defaultWeight: 220 },
  title: { maxChars: 20, mustInclude: [], mustExclude: ['爆款', '厂家直销'] },
  image: { mainCount: 9, aspectRatio: '1:1', removeWatermark: true, translateOverlay: true },
  skuSegments: ['颜色', '尺码'],
  strategyPrompts: [
    { id: 'exposure', label: '高曝光', prompt: '突出视觉冲击 + 本地热搜词' },
    { id: 'conversion', label: '高转化', prompt: '突出卖点 + 功能性' },
  ],
  steps: [
    { order: 1, title: '抓取商品', description: '采集', llmPowered: false },
    { order: 2, title: '翻译', description: 'LLM 翻译为目标语言', llmPowered: true },
    { order: 3, title: '标题改写', description: '双策略生成', llmPowered: true },
  ],
};

export function RewriteTemplatesPage() {
  const [templates, setTemplates] = useState<RewriteTemplate[]>(REWRITE_TEMPLATE_EXAMPLES);
  const [editing, setEditing] = useState<RewriteTemplate | null>(null);
  const [filterCountry, setFilterCountry] = useState<string>('全部');
  const [filterCategory, setFilterCategory] = useState<string>('全部');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = templates.filter(
    (t) =>
      (filterCountry === '全部' || t.country === filterCountry) &&
      (filterCategory === '全部' || t.category === filterCategory),
  );

  function activate(id: string) {
    setTemplates((prev) => prev.map((t) => ({ ...t, active: t.id === id })));
  }

  function remove(id: string) {
    if (!confirm('确认删除该改写模板？')) return;
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  function openNew() {
    setEditing({ ...EMPTY_TEMPLATE, id: `t-rw-new-${Date.now()}` });
  }

  function openEdit(t: RewriteTemplate) {
    setEditing(JSON.parse(JSON.stringify(t)));
  }

  function save() {
    if (!editing) return;
    if (!editing.name.trim()) {
      alert('模板名称不能为空');
      return;
    }
    setTemplates((prev) => {
      const exists = prev.find((t) => t.id === editing.id);
      if (exists) return prev.map((t) => (t.id === editing.id ? editing : t));
      return [...prev, editing];
    });
    setEditing(null);
  }

  // === 编辑器内联操作 ===
  function addStep() {
    if (!editing) return;
    const n = editing.steps.length + 1;
    setEditing({
      ...editing,
      steps: [...editing.steps, { order: n, title: `步骤 ${n}`, description: '', llmPowered: false }],
    });
  }
  function updateStep(i: number, patch: Partial<RewriteStep>) {
    if (!editing) return;
    const next = [...editing.steps];
    next[i] = { ...next[i], ...patch };
    setEditing({ ...editing, steps: next });
  }
  function removeStep(i: number) {
    if (!editing) return;
    setEditing({ ...editing, steps: editing.steps.filter((_, idx) => idx !== i) });
  }
  function updateStrategy(id: 'exposure' | 'conversion', patch: Partial<RewriteStrategyPrompt>) {
    if (!editing) return;
    setEditing({
      ...editing,
      strategyPrompts: editing.strategyPrompts.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  }

  return (
    <>
      <PageHeader
        title="改写模板管理"
        desc="按 国家 × 平台 × 品类 定义 AI 改写规则：System Prompt + 定价 + 标题 + 图片 + 双策略 + 改写步骤"
      />

      {/* AI 对话框（V4 全页一致） */}
      <div className="mb-4">
        <AIDialog
          contextHint="例如：帮我新建一个越南 Lazada 女装模板；把 #2 模板的 CTR 阈值改到 10%；…"
          presets={[
            { id: 'new', label: '➕ 新建模板', prompt: '基于当前页筛选条件新建模板' },
            { id: 'duplicate', label: '📋 复制模板', prompt: '复制激活模板到其他平台' },
            { id: 'optimize', label: '⚡ 优化规则', prompt: '根据历史数据优化规则' },
          ]}
          onSubmit={(p) => `已记录模板操作指令: "${p}"（本地 mock）`}
        />
      </div>

      {/* 筛选 + 操作 */}
      <Card className="mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium">筛选:</span>
          <select
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm"
          >
            <option>全部</option>
            {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm"
          >
            <option>全部</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <span className="text-xs text-[var(--color-text-muted)]">共 {filtered.length} 个模板</span>
          <div className="ml-auto">
            <Button onClick={openNew}>➕ 新建模板</Button>
          </div>
        </div>
      </Card>

      {/* 模板列表 */}
      <div className="space-y-3">
        {filtered.map((t) => {
          const isOpen = expanded === t.id;
          return (
            <Card key={t.id} className={t.active ? 'border-2 border-[var(--color-primary)]' : ''}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium">{t.name}</h3>
                  {t.active && <Badge tone="ok">当前激活</Badge>}
                  <Badge>{t.country}</Badge>
                  <Badge>{t.platform}</Badge>
                  <Badge>{t.category}</Badge>
                  <Badge tone="default">品类 {t.categoryMode}</Badge>
                  <Badge tone="default">{t.targetLocale}</Badge>
                </div>
                <div className="flex gap-1 shrink-0">
                  {!t.active && (
                    <Button variant="outline" size="sm" onClick={() => activate(t.id)}>
                      设为激活
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                    编辑
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(t.id)}>
                    删
                  </Button>
                </div>
              </div>

              {/* 概览：6 大块 */}
              <div className="grid gap-3 md:grid-cols-3 text-xs mb-3">
                <div className="rounded-lg bg-[var(--color-muted)] p-2">
                  <p className="font-medium mb-1">💰 定价 & 物流</p>
                  <p>倍率 ×{t.pricing.multiplier} ({t.pricing.currency})</p>
                  <p>库存 {t.pricing.defaultStock} · 重量 {t.pricing.defaultWeight}g</p>
                  <p>标题 ≤{t.title.maxChars} 字</p>
                </div>
                <div className="rounded-lg bg-[var(--color-muted)] p-2">
                  <p className="font-medium mb-1">🖼️ 图片 & SKU</p>
                  <p>主图 {t.image.mainCount} 张 ({t.image.aspectRatio})</p>
                  <p>SKU 段: {t.skuSegments.join(' × ')}</p>
                  <p>去水印: {t.image.removeWatermark ? '✓' : '✗'} · 翻译覆盖: {t.image.translateOverlay ? '✓' : '✗'}</p>
                </div>
                <div className="rounded-lg bg-[var(--color-muted)] p-2">
                  <p className="font-medium mb-1">🎯 双策略</p>
                  <p>高曝光: {t.strategyPrompts[0]?.prompt.slice(0, 30)}...</p>
                  <p>高转化: {t.strategyPrompts[1]?.prompt.slice(0, 30)}...</p>
                </div>
              </div>

              {/* 展开按钮 */}
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : t.id)}
                className="text-xs text-[var(--color-primary)] hover:underline"
              >
                {isOpen ? '收起完整内容 ▲' : `展开 ${t.steps.length} 步管线 + System Prompt ▼`}
              </button>

              {isOpen && (
                <div className="mt-3 pt-3 border-t border-[var(--color-border)] space-y-3">
                  {/* System Prompt */}
                  <div>
                    <p className="text-sm font-medium mb-1">🤖 System Prompt（注入 LLM）</p>
                    <pre className="rounded-lg bg-[var(--color-muted)] p-2 text-xs whitespace-pre-wrap font-mono">
                      {t.systemPrompt}
                    </pre>
                  </div>
                  {/* Steps */}
                  <div>
                    <p className="text-sm font-medium mb-1">📋 改写步骤（{t.steps.length} 步）</p>
                    <ol className="space-y-1 text-xs">
                      {t.steps.map((s) => (
                        <li key={s.order} className="flex gap-2">
                          <span className="w-6 text-right text-[var(--color-text-muted)]">{s.order}.</span>
                          <span className="flex-1">
                            <strong>{s.title}</strong>
                            {s.llmPowered && <Badge tone="default" className="ml-2 text-[10px]">LLM</Badge>}
                            {s.description && <span className="text-[var(--color-text-muted)]"> — {s.description}</span>}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  {/* Rules */}
                  <div>
                    <p className="text-sm font-medium mb-1">📏 标题规则</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      必含: {t.title.mustInclude?.join(', ') || '（无）'} ·
                      必删: {t.title.mustExclude?.join(', ') || '（无）'}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* 编辑弹窗 */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-4xl my-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">编辑改写模板</h3>
              <button onClick={() => setEditing(null)} className="text-xl">×</button>
            </div>

            {/* 基本信息 */}
            <div className="grid gap-3 md:grid-cols-3 mb-4">
              <label className="text-sm md:col-span-3">
                <span className="text-[var(--color-text-muted)]">模板名称 *</span>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="mt-1"
                />
              </label>
              <label className="text-sm">
                <span className="text-[var(--color-text-muted)]">国家</span>
                <select
                  value={editing.country}
                  onChange={(e) => setEditing({ ...editing, country: e.target.value })}
                  className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm"
                >
                  {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-[var(--color-text-muted)]">平台</span>
                <select
                  value={editing.platform}
                  onChange={(e) => setEditing({ ...editing, platform: e.target.value })}
                  className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm"
                >
                  {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-[var(--color-text-muted)]">类目</span>
                <select
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm"
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-[var(--color-text-muted)]">品类模式</span>
                <select
                  value={editing.categoryMode}
                  onChange={(e) =>
                    setEditing({ ...editing, categoryMode: e.target.value as 'A' | 'B' | 'C' })
                  }
                  className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm"
                >
                  {MODES.map((m) => <option key={m.value} value={m.value}>{m.label} — {m.desc}</option>)}
                </select>
              </label>
            </div>

            {/* System Prompt */}
            <details open className="mb-3">
              <summary className="text-sm font-medium cursor-pointer">🤖 System Prompt（注入 LLM）</summary>
              <textarea
                value={editing.systemPrompt}
                onChange={(e) => setEditing({ ...editing, systemPrompt: e.target.value })}
                rows={6}
                className="mt-2 w-full rounded border border-[var(--color-border)] bg-white p-2 text-xs font-mono"
                placeholder="你是 ... 上品专家。&#10;品类特征：...&#10;规则：..."
              />
            </details>

            {/* 定价 & 标题 & 图片 */}
            <details open className="mb-3">
              <summary className="text-sm font-medium cursor-pointer">💰 定价 / 🏷️ 标题 / 🖼️ 图片</summary>
              <div className="grid gap-3 md:grid-cols-3 mt-2 text-sm">
                <div>
                  <p className="font-medium mb-1 text-xs">定价</p>
                  <label className="block">
                    倍率
                    <Input
                      type="number"
                      step="0.1"
                      value={editing.pricing.multiplier}
                      onChange={(e) =>
                        setEditing({ ...editing, pricing: { ...editing.pricing, multiplier: +e.target.value } })
                      }
                      className="mt-1"
                    />
                  </label>
                  <label className="block mt-2">
                    货币
                    <Input
                      value={editing.pricing.currency}
                      onChange={(e) =>
                        setEditing({ ...editing, pricing: { ...editing.pricing, currency: e.target.value } })
                      }
                      className="mt-1"
                    />
                  </label>
                </div>
                <div>
                  <p className="font-medium mb-1 text-xs">标题</p>
                  <label className="block">
                    字数上限
                    <Input
                      type="number"
                      value={editing.title.maxChars}
                      onChange={(e) =>
                        setEditing({ ...editing, title: { ...editing.title, maxChars: +e.target.value } })
                      }
                      className="mt-1"
                    />
                  </label>
                  <label className="block mt-2">
                    必含词（逗号分隔）
                    <Input
                      value={editing.title.mustInclude?.join(', ') || ''}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          title: { ...editing.title, mustInclude: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) },
                        })
                      }
                      className="mt-1"
                    />
                  </label>
                  <label className="block mt-2">
                    必删词（逗号分隔）
                    <Input
                      value={editing.title.mustExclude?.join(', ') || ''}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          title: { ...editing.title, mustExclude: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) },
                        })
                      }
                      className="mt-1"
                    />
                  </label>
                </div>
                <div>
                  <p className="font-medium mb-1 text-xs">图片</p>
                  <label className="block">
                    主图数量
                    <Input
                      type="number"
                      value={editing.image.mainCount}
                      onChange={(e) =>
                        setEditing({ ...editing, image: { ...editing.image, mainCount: +e.target.value } })
                      }
                      className="mt-1"
                    />
                  </label>
                  <label className="block mt-2">
                    比例
                    <select
                      value={editing.image.aspectRatio}
                      onChange={(e) =>
                        setEditing({ ...editing, image: { ...editing.image, aspectRatio: e.target.value as typeof ASPECTS[number] } })
                      }
                      className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm"
                    >
                      {ASPECTS.map((a) => <option key={a}>{a}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 mt-2 text-xs">
                    <input
                      type="checkbox"
                      checked={editing.image.removeWatermark}
                      onChange={(e) => setEditing({ ...editing, image: { ...editing.image, removeWatermark: e.target.checked } })}
                    />
                    去水印
                  </label>
                  <label className="flex items-center gap-2 mt-1 text-xs">
                    <input
                      type="checkbox"
                      checked={editing.image.translateOverlay}
                      onChange={(e) => setEditing({ ...editing, image: { ...editing.image, translateOverlay: e.target.checked } })}
                    />
                    图片文字翻译覆盖
                  </label>
                </div>
              </div>
              {/* SKU 段数 */}
              <div className="mt-3 text-sm">
                <p className="font-medium mb-1 text-xs">SKU 段（决定笛卡尔积，按品类模式）</p>
                <Input
                  value={editing.skuSegments.join(' × ')}
                  onChange={(e) =>
                    setEditing({ ...editing, skuSegments: e.target.value.split(/\s*[×x]\s*/).filter(Boolean) })
                  }
                  placeholder="颜色 × 尺码 × 套装"
                />
              </div>
            </details>

            {/* 双策略 prompt */}
            <details open className="mb-3">
              <summary className="text-sm font-medium cursor-pointer">🎯 双策略 Prompt（高曝光 / 高转化）</summary>
              <div className="grid gap-3 md:grid-cols-2 mt-2 text-sm">
                {(['exposure', 'conversion'] as const).map((id) => {
                  const s = editing.strategyPrompts.find((x) => x.id === id)!;
                  return (
                    <div key={id}>
                      <p className="font-medium mb-1 text-xs">
                        {id === 'exposure' ? '📈 高曝光' : '💰 高转化'}
                      </p>
                      <label className="block">
                        Label
                        <Input
                          value={s.label}
                          onChange={(e) => updateStrategy(id, { label: e.target.value })}
                          className="mt-1"
                        />
                      </label>
                      <label className="block mt-2">
                        Prompt
                        <textarea
                          value={s.prompt}
                          onChange={(e) => updateStrategy(id, { prompt: e.target.value })}
                          rows={3}
                          className="mt-1 w-full rounded border border-[var(--color-border)] bg-white p-2 text-xs"
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            </details>

            {/* 改写步骤 */}
            <details open className="mb-3">
              <summary className="text-sm font-medium cursor-pointer">📋 改写步骤（{editing.steps.length} 步）</summary>
              <div className="mt-2 text-sm space-y-2">
                {editing.steps.map((s, i) => (
                  <div key={i} className="rounded border border-[var(--color-border)] p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-[var(--color-text-muted)] w-6">#{s.order}</span>
                      <Input
                        value={s.title}
                        onChange={(e) => updateStep(i, { title: e.target.value, order: i + 1 })}
                        className="flex-1"
                        placeholder="步骤标题"
                      />
                      <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={s.llmPowered}
                          onChange={(e) => updateStep(i, { llmPowered: e.target.checked })}
                        />
                        LLM
                      </label>
                      <Button variant="ghost" size="sm" onClick={() => removeStep(i)}>删</Button>
                    </div>
                    <Input
                      value={s.description}
                      onChange={(e) => updateStep(i, { description: e.target.value })}
                      placeholder="步骤详细描述"
                      className="text-xs"
                    />
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addStep}>+ 添加步骤</Button>
              </div>
            </details>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[var(--color-border)]">
              <Button variant="outline" onClick={() => setEditing(null)}>取消</Button>
              <Button onClick={save}>保存</Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

export default RewriteTemplatesPage;
