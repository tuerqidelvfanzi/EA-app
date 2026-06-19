/**
 * 选品模板管理 — V4 重设计版（替换原 V3 类目模板）
 *
 * 设计依据（V4 草稿 + 用户 06-19 反馈）：
 *   1. 选品模板按「国家 × 平台 × 类目」3 维度定义
 *   2. 每模板含 6 大块：
 *      - 阈值（GMV/CTR/同款/价格）→ 用于自动筛选
 *      - 报告维度 → 决定选品报告里展示哪些字段
 *      - 选品逻辑（promote / observe / skip 规则）→ 决策规则
 *      - SKU 结构 → 不同品类 SKU 段数不同（灯 2 段 / 服装 3 段 / 3C 3 段）
 *      - 内容提取字段 → 该品类要抓哪些信息
 *      - 处理管线步骤 → 改写 + 上架流程（越南 13 步为完整示例）
 *   3. 完整 CRUD：增 / 删 / 改 / 查 + 切换 active
 *   4. 内置 6 个示例模板（覆盖 5+ 品类）
 *
 * 路由：/app/templates（替换原 V3 类目模板）
 */
import { useState } from 'react';
import { PageHeader, Card, Button, Badge, Input } from '../components/ui';
import { AIDialog } from '../components/AIDialog';

// === 模板数据结构 ===

interface SkuStructure {
  segments: string[];
  example: string;
}

interface SelectionTemplate {
  id: string;
  name: string;
  country: string;
  platform: string;
  category: string;
  active: boolean;
  thresholds: {
    minGmv: number;
    minCtr: number;
    maxSameProduct: number;
    priceRange: [number, number];
  };
  reportDimensions: string[];
  selectionLogic: {
    promote: string;
    observe: string;
    skip: string;
  };
  skuStructure: SkuStructure;
  contentFields: { name: string; required: boolean; description: string }[];
  pipelineSteps: string[];
}

// === 6 个示例模板（覆盖 5+ 品类） ===

const MOCK_TEMPLATES: SelectionTemplate[] = [
  {
    id: 't-vn-shopee-kids',
    name: '越南 · Shopee · 童装',
    country: '越南',
    platform: 'Shopee',
    category: '童装',
    active: true,
    thresholds: { minGmv: 30000, minCtr: 9, maxSameProduct: 5, priceRange: [15, 60] },
    reportDimensions: ['GMV', 'CTR', '同款数', '评分', '趋势', '毛利率'],
    selectionLogic: {
      promote: 'GMV ≥ 30K 且 CTR ≥ 9% 且 同款 ≤ 5 且 趋势↑',
      observe: 'GMV 达标但 CTR < 9% 或 同款 > 5',
      skip: 'GMV < 阈值 或 趋势↓ 或 评级 < 4.5',
    },
    skuStructure: { segments: ['颜色', '尺码', '套装'], example: '红色 / 110 / 2件套' },
    contentFields: [
      { name: '主图', required: true, description: '白底或场景图，800x800' },
      { name: '尺码表', required: true, description: '身高/胸围/袖长' },
      { name: '面料成分', required: true, description: '如 95%棉 5%氨纶' },
      { name: '安全认证', required: false, description: 'CE / CCC 儿童认证' },
    ],
    pipelineSteps: [
      '① 从源站抓取商品 + 图片 + SKU',
      '② 越南语翻译（标题 + 描述 + SKU）',
      '③ 替换为本地模特图 / 场景图',
      '④ 价格换算 VND + 加价 1.4x',
      '⑤ 标题 SEO 优化（越南热搜词）',
      '⑥ 生成 SKU 矩阵（颜色 × 尺码）',
      '⑦ 尺码表翻译 + 本地化',
      '⑧ 物流方式配置（Shopee Xpress）',
      '⑨ 类目映射到 Shopee 越南童装',
      '⑩ 运费模板设置',
      '⑪ 优惠券 + 促销配置',
      '⑫ 图片水印 + Logo',
      '⑬ 写入 Shopee 越南站草稿箱',
    ],
  },
  {
    id: 't-th-lazada-women',
    name: '泰国 · Lazada · 女装',
    country: '泰国',
    platform: 'Lazada',
    category: '女装',
    active: false,
    thresholds: { minGmv: 25000, minCtr: 8, maxSameProduct: 6, priceRange: [10, 50] },
    reportDimensions: ['GMV', 'CTR', '同款数', '评分', '趋势'],
    selectionLogic: {
      promote: 'GMV ≥ 25K 且 CTR ≥ 8% 且 同款 ≤ 6',
      observe: 'GMV 达标但 CTR 接近阈值',
      skip: 'GMV < 阈值 或 同款 > 10',
    },
    skuStructure: { segments: ['颜色', '尺码'], example: '黑色 / M' },
    contentFields: [
      { name: '主图', required: true, description: '9:16 竖图优先' },
      { name: '尺码表', required: true, description: 'S/M/L/XL' },
      { name: '面料', required: true, description: '成分百分比' },
    ],
    pipelineSteps: [
      '① 抓取商品',
      '② 泰语翻译',
      '③ 价格换算 THB',
      '④ SEO 优化',
      '⑤ SKU 矩阵',
      '⑥ 写入 Lazada 草稿箱',
    ],
  },
  {
    id: 't-br-ml-3c',
    name: '巴西 · Mercado Livre · 3C',
    country: '巴西',
    platform: 'Mercado Livre',
    category: '3C 数码',
    active: false,
    thresholds: { minGmv: 50000, minCtr: 10, maxSameProduct: 4, priceRange: [40, 200] },
    reportDimensions: ['GMV', 'CTR', '同款数', '评分', '认证'],
    selectionLogic: {
      promote: 'GMV ≥ 50K 且 有官方认证 且 同款 ≤ 4',
      observe: '认证不全但销量达标',
      skip: '无认证 或 假货嫌疑',
    },
    skuStructure: { segments: ['型号', '颜色', '容量'], example: 'iPhone15 / 黑 / 256G' },
    contentFields: [
      { name: '产品图', required: true, description: '多角度 5 张+' },
      { name: '规格参数', required: true, description: '详细参数表' },
      { name: '认证证书', required: true, description: 'ANATEL 巴西认证' },
      { name: '保修信息', required: true, description: '保修期 + 售后政策' },
    ],
    pipelineSteps: [
      '① 抓取商品',
      '② 葡语翻译',
      '③ BRL 换算 + 关税预估',
      '④ 认证信息核对',
      '⑤ 保修文案',
      '⑥ 写入草稿箱',
    ],
  },
  {
    id: 't-cn-taobao-tshirt',
    name: '中国 · 淘宝 · T恤',
    country: '中国',
    platform: '淘宝',
    category: 'T恤',
    active: false,
    thresholds: { minGmv: 20000, minCtr: 7, maxSameProduct: 8, priceRange: [20, 80] },
    reportDimensions: ['GMV', 'CTR', '同款数', '评分'],
    selectionLogic: {
      promote: 'GMV ≥ 20K 且 评分 ≥ 4.7',
      observe: '评分 4.5-4.7',
      skip: '评分 < 4.5',
    },
    skuStructure: { segments: ['颜色', '尺码'], example: '白色 / L' },
    contentFields: [
      { name: '主图', required: true, description: '800x800 白底' },
      { name: '尺码表', required: true, description: '均码/尺码可选' },
      { name: '面料', required: true, description: '克重 + 成分' },
    ],
    pipelineSteps: [
      '① 抓取',
      '② 标题 SEO（淘宝搜索词）',
      '③ SKU 矩阵',
      '④ 写入淘宝草稿箱',
    ],
  },
  {
    id: 't-cn-pdd-kids',
    name: '中国 · 拼多多 · 童装',
    country: '中国',
    platform: '拼多多',
    category: '童装',
    active: false,
    thresholds: { minGmv: 15000, minCtr: 8, maxSameProduct: 7, priceRange: [10, 50] },
    reportDimensions: ['GMV', 'CTR', '同款数', '评分', '价格优势'],
    selectionLogic: {
      promote: 'GMV ≥ 15K 且 价格低于淘宝 20%+',
      observe: 'GMV 达标但价格优势不明显',
      skip: '价格无优势',
    },
    skuStructure: { segments: ['颜色', '尺码', '件数'], example: '蓝色 / 110 / 1件' },
    contentFields: [
      { name: '主图', required: true, description: '800x800' },
      { name: '尺码表', required: true, description: '身高对照' },
      { name: '面料', required: true, description: '成分' },
    ],
    pipelineSteps: [
      '① 抓取',
      '② 价格对比（淘宝）',
      '③ SKU 矩阵',
      '④ 写入拼多多草稿箱',
    ],
  },
  {
    id: 't-cn-jd-lamp',
    name: '中国 · 京东 · 灯具',
    country: '中国',
    platform: '京东',
    category: '灯具',
    active: false,
    thresholds: { minGmv: 18000, minCtr: 6, maxSameProduct: 10, priceRange: [30, 300] },
    reportDimensions: ['GMV', 'CTR', '同款数', '评分', '功率'],
    selectionLogic: {
      promote: 'GMV ≥ 18K 且 评分 ≥ 4.6',
      observe: 'GMV 达标但功率规格不全',
      skip: '功率描述模糊',
    },
    skuStructure: { segments: ['颜色', '尺寸', '瓦数'], example: '黑色 / 中号 / 12W' },
    contentFields: [
      { name: '产品图', required: true, description: '场景 + 尺寸参照' },
      { name: '功率参数', required: true, description: '瓦数 + 色温 + 流明' },
      { name: '材质', required: true, description: '铝/铁/亚克力' },
      { name: '保修', required: true, description: '3 年质保' },
    ],
    pipelineSteps: [
      '① 抓取',
      '② 京东 SKU 规则匹配',
      '③ 功率参数补全',
      '④ 写入京东草稿箱',
    ],
  },
];

// === 工具 ===

const COUNTRIES = ['越南', '泰国', '巴西', '中国', '印尼', '菲律宾', '马来西亚'];
const PLATFORMS = ['Shopee', 'Lazada', 'TikTok Shop', 'Mercado Livre', '淘宝', '天猫', '拼多多', '京东', '1688'];
const CATEGORIES = ['童装', '女装', 'T恤', '3C 数码', '灯具', '鞋类', '美妆', '家居'];

const EMPTY_TEMPLATE: SelectionTemplate = {
  id: '',
  name: '',
  country: '中国',
  platform: '淘宝',
  category: '童装',
  active: false,
  thresholds: { minGmv: 20000, minCtr: 8, maxSameProduct: 5, priceRange: [10, 100] },
  reportDimensions: ['GMV', 'CTR', '同款数', '评分'],
  selectionLogic: { promote: '', observe: '', skip: '' },
  skuStructure: { segments: ['颜色', '尺码'], example: '白色 / M' },
  contentFields: [
    { name: '主图', required: true, description: '800x800' },
    { name: '尺码表', required: true, description: '' },
  ],
  pipelineSteps: ['① 抓取', '② 翻译', '③ 价格换算', '④ 写入草稿箱'],
};

export function TemplatesPage() {
  const [templates, setTemplates] = useState<SelectionTemplate[]>(MOCK_TEMPLATES);
  const [editing, setEditing] = useState<SelectionTemplate | null>(null);
  const [filterCountry, setFilterCountry] = useState<string>('全部');
  const [filterCategory, setFilterCategory] = useState<string>('全部');

  const filtered = templates.filter(
    (t) =>
      (filterCountry === '全部' || t.country === filterCountry) &&
      (filterCategory === '全部' || t.category === filterCategory),
  );

  function activate(id: string) {
    setTemplates((prev) =>
      prev.map((t) => ({
        ...t,
        active: t.id === id,
      })),
    );
  }

  function remove(id: string) {
    if (!confirm('确认删除该模板？')) return;
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  function openNew() {
    setEditing({ ...EMPTY_TEMPLATE, id: `t-new-${Date.now()}` });
  }

  function openEdit(t: SelectionTemplate) {
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

  function addStep() {
    if (!editing) return;
    const n = editing.pipelineSteps.length + 1;
    setEditing({ ...editing, pipelineSteps: [...editing.pipelineSteps, `⑩ 步骤 ${n}`] });
  }
  function updateStep(i: number, v: string) {
    if (!editing) return;
    const next = [...editing.pipelineSteps];
    next[i] = v;
    setEditing({ ...editing, pipelineSteps: next });
  }
  function removeStep(i: number) {
    if (!editing) return;
    setEditing({ ...editing, pipelineSteps: editing.pipelineSteps.filter((_, idx) => idx !== i) });
  }

  return (
    <>
      <PageHeader
        title="选品模板管理"
        desc="按 国家 × 平台 × 类目 定义选品规则、报告维度、处理管线"
      />

      {/* AI 对话框（V4 新增） */}
      <div className="mb-4">
        <AIDialog
          contextHint="例如：帮我新建一个越南 Lazada 女装模板；把 #2 模板的 CTR 阈值改到 10%；…"
          presets={[
            { id: 'new', label: '➕ 新建模板', prompt: '基于当前页筛选条件新建模板' },
            { id: 'duplicate', label: '📋 复制模板', prompt: '复制激活模板到其他平台' },
            { id: 'optimize', label: '⚡ 优化阈值', prompt: '根据历史数据优化阈值' },
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
        {filtered.map((t) => (
          <Card key={t.id} className={t.active ? 'border-2 border-[var(--color-primary)]' : ''}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium">{t.name}</h3>
                {t.active && <Badge tone="ok">当前激活</Badge>}
                <Badge>{t.country}</Badge>
                <Badge>{t.platform}</Badge>
                <Badge>{t.category}</Badge>
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

            <div className="grid gap-3 md:grid-cols-3 text-xs">
              <div className="rounded-lg bg-[var(--color-muted)] p-2">
                <p className="font-medium mb-1">阈值</p>
                <p>GMV ≥ ${t.thresholds.minGmv.toLocaleString()}</p>
                <p>CTR ≥ {t.thresholds.minCtr}%</p>
                <p>同款 ≤ {t.thresholds.maxSameProduct}</p>
                <p>价格 ${t.thresholds.priceRange[0]}–${t.thresholds.priceRange[1]}</p>
              </div>
              <div className="rounded-lg bg-[var(--color-muted)] p-2">
                <p className="font-medium mb-1">SKU 结构</p>
                <p>{t.skuStructure.segments.join(' × ')}</p>
                <p className="text-[var(--color-text-muted)]">例: {t.skuStructure.example}</p>
              </div>
              <div className="rounded-lg bg-[var(--color-muted)] p-2">
                <p className="font-medium mb-1">管线步骤</p>
                <p className="font-medium">{t.pipelineSteps.length} 步</p>
                <p className="text-[var(--color-text-muted)] truncate">
                  {t.pipelineSteps[0]} → ... → {t.pipelineSteps.at(-1)}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 编辑弹窗 */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-3xl my-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">编辑模板</h3>
              <button onClick={() => setEditing(null)} className="text-xl">×</button>
            </div>

            {/* 基本信息 */}
            <div className="grid gap-3 md:grid-cols-2 mb-4">
              <label className="text-sm">
                <span className="text-[var(--color-text-muted)]">模板名称</span>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="mt-1"
                  placeholder="如: 越南 · Shopee · 童装"
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
            </div>

            {/* 阈值 */}
            <details open className="mb-3">
              <summary className="text-sm font-medium cursor-pointer">阈值（自动筛选用）</summary>
              <div className="grid gap-2 md:grid-cols-4 mt-2 text-sm">
                <label>
                  GMV ≥
                  <Input
                    type="number"
                    value={editing.thresholds.minGmv}
                    onChange={(e) =>
                      setEditing({ ...editing, thresholds: { ...editing.thresholds, minGmv: +e.target.value } })
                    }
                    className="mt-1"
                  />
                </label>
                <label>
                  CTR ≥ %
                  <Input
                    type="number"
                    value={editing.thresholds.minCtr}
                    onChange={(e) =>
                      setEditing({ ...editing, thresholds: { ...editing.thresholds, minCtr: +e.target.value } })
                    }
                    className="mt-1"
                  />
                </label>
                <label>
                  同款 ≤
                  <Input
                    type="number"
                    value={editing.thresholds.maxSameProduct}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        thresholds: { ...editing.thresholds, maxSameProduct: +e.target.value },
                      })
                    }
                    className="mt-1"
                  />
                </label>
                <label>
                  价格区间
                  <div className="flex gap-1 mt-1">
                    <Input
                      type="number"
                      value={editing.thresholds.priceRange[0]}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          thresholds: {
                            ...editing.thresholds,
                            priceRange: [+e.target.value, editing.thresholds.priceRange[1]],
                          },
                        })
                      }
                    />
                    <Input
                      type="number"
                      value={editing.thresholds.priceRange[1]}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          thresholds: {
                            ...editing.thresholds,
                            priceRange: [editing.thresholds.priceRange[0], +e.target.value],
                          },
                        })
                      }
                    />
                  </div>
                </label>
              </div>
            </details>

            {/* SKU 结构 */}
            <details open className="mb-3">
              <summary className="text-sm font-medium cursor-pointer">SKU 结构</summary>
              <div className="mt-2 text-sm">
                <p className="text-xs text-[var(--color-text-muted)] mb-1">段数与名称（用 × 分隔）</p>
                <Input
                  value={editing.skuStructure.segments.join(' × ')}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      skuStructure: {
                        ...editing.skuStructure,
                        segments: e.target.value.split(/\s*[×x]\s*/).filter(Boolean),
                      },
                    })
                  }
                  placeholder="颜色 × 尺码 × 套装"
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-2 mb-1">示例</p>
                <Input
                  value={editing.skuStructure.example}
                  onChange={(e) =>
                    setEditing({ ...editing, skuStructure: { ...editing.skuStructure, example: e.target.value } })
                  }
                  placeholder="红色 / M / 2件套"
                />
              </div>
            </details>

            {/* 选品逻辑 */}
            <details open className="mb-3">
              <summary className="text-sm font-medium cursor-pointer">选品逻辑</summary>
              <div className="grid gap-2 mt-2 text-sm">
                <label>
                  ✓ 推广规则
                  <Input
                    value={editing.selectionLogic.promote}
                    onChange={(e) =>
                      setEditing({ ...editing, selectionLogic: { ...editing.selectionLogic, promote: e.target.value } })
                    }
                    className="mt-1"
                  />
                </label>
                <label>
                  ⚠ 观察规则
                  <Input
                    value={editing.selectionLogic.observe}
                    onChange={(e) =>
                      setEditing({ ...editing, selectionLogic: { ...editing.selectionLogic, observe: e.target.value } })
                    }
                    className="mt-1"
                  />
                </label>
                <label>
                  — 跳过规则
                  <Input
                    value={editing.selectionLogic.skip}
                    onChange={(e) =>
                      setEditing({ ...editing, selectionLogic: { ...editing.selectionLogic, skip: e.target.value } })
                    }
                    className="mt-1"
                  />
                </label>
              </div>
            </details>

            {/* 处理管线 */}
            <details open className="mb-3">
              <summary className="text-sm font-medium cursor-pointer">处理管线（采集后改写 + 上架）</summary>
              <div className="mt-2 text-sm space-y-2">
                {editing.pipelineSteps.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-xs text-[var(--color-text-muted)] w-6 pt-2">{i + 1}.</span>
                    <Input
                      value={s}
                      onChange={(e) => updateStep(i, e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeStep(i)}>
                      删
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addStep}>
                  + 添加步骤
                </Button>
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

export default TemplatesPage;