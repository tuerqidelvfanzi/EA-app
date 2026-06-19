/**
 * 标题优化 - 会议 12:00-17:00 共识版本
 *
 * 流程（来自会议原文）：
 *   1. 导入表格（不是逐条输入，而是批量）
 *   2. 预设规则：
 *        - 移除词库：去掉没用/违规词
 *        - 热搜词库：补充热搜词（来自后台知识库或人工配置）
 *        - 结构性规则：例如 [品牌] + [核心词] + [材质] + [风格]
 *   3. 一键批量优化
 *   4. 输出优化后的上架标题（可导出 / 一键复制）
 *
 * 与旧 V1 七步 Tmall 流（保留后台路由 /app/title-optimization 不变）的差异：
 *   - 旧版：单商品 + Tmall 卖家中心填表
 *   - 新版：批量表格 + 预设规则 + 输出上架标题
 */
import { useState, useRef, useMemo } from 'react';
import { PageHeader, Card, Button, Badge, Input } from '../../components/ui';
import {
  parseCSV,
  exportToCSV,
  validateBatchSize,
  batchOptimize,
  type BatchResult,
} from '../../lib/title-optimizer/batch-optimizer';
import type { Platform, Language } from '../../lib/title-optimizer/platform-rules';

// === 预设规则（默认） ===

const DEFAULT_REMOVE_WORDS = ['包邮', '特价', '促销', '爆款', '亏本', '清仓'];
const DEFAULT_TRENDING_WORDS = ['夏季新款', '纯棉', '透气', '百搭', '韩版', '卡通印花'];

const STRUCTURAL_RULES = [
  { id: 'standard', label: '标准：核心词 + 材质 + 风格 + 人群', example: '纯棉T恤 夏季新款 女童 韩版' },
  { id: 'brand-first', label: '品牌前置：品牌 + 核心词 + 卖点', example: '韩都衣舍 纯棉T恤 透气 卡通印花' },
  { id: 'short', label: '精简：仅前 8 字核心卖点', example: '夏季女童纯棉T恤' },
];

type StructuralRule = (typeof STRUCTURAL_RULES)[number]['id'];

const PLATFORMS: Platform[] = ['amazon', 'ebay', 'shopee', 'tiktok', 'lazada'];
const PLATFORM_LABEL: Record<Platform, string> = {
  amazon: 'Amazon',
  ebay: 'eBay',
  shopee: 'Shopee',
  tiktok: 'TikTok Shop',
  lazada: 'Lazada',
};

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'es', label: 'Español' },
];

export function TitleOptimizationPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 输入数据
  const [rows, setRows] = useState<{ productName: string; keywords: string; brand?: string }[]>([]);
  const [error, setError] = useState('');

  // 预设规则
  const [removeWords, setRemoveWords] = useState(DEFAULT_REMOVE_WORDS.join('，'));
  const [trendingWords, setTrendingWords] = useState(DEFAULT_TRENDING_WORDS.join('，'));
  const [structuralRule, setStructuralRule] = useState<StructuralRule>('standard');

  // 优化参数
  const [platform, setPlatform] = useState<Platform>('shopee');
  const [language, setLanguage] = useState<Language>('zh');

  // 优化运行状态
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<BatchResult[]>([]);

  // 表格输入（粘贴模式）
  const [pastedText, setPastedText] = useState(
    '韩版夏季女童纯棉T恤 卡通印花 短袖\n2024新款男童运动短裤 速干 透气\n可爱婴儿连体衣 纯棉 春秋新款',
  );

  const removeList = useMemo(
    () => removeWords.split(/[，,]/).map((w) => w.trim()).filter(Boolean),
    [removeWords],
  );
  const trendingList = useMemo(
    () => trendingWords.split(/[，,]/).map((w) => w.trim()).filter(Boolean),
    [trendingWords],
  );

  // === 表格输入处理 ===

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('CSV 文件超过 5MB 限制');
      return;
    }
    const text = await file.text();
    const parsed = parseCSV(text);
    const validation = validateBatchSize(parsed);
    if (!validation.valid) {
      setError(validation.reason || '校验失败');
      return;
    }
    setError('');
    setRows(parsed);
  }

  function loadFromPaste() {
    const lines = pastedText.split('\n').filter((l) => l.trim());
    const parsed = lines.map((line) => {
      // 格式：「商品名 关键词1 关键词2 ...」
      const cells = line.trim().split(/\s+/);
      return {
        productName: cells[0] ?? '',
        keywords: cells.slice(1).join(','),
      };
    }).filter((r) => r.productName);
    if (parsed.length === 0) {
      setError('未识别到有效商品，请至少输入商品名');
      return;
    }
    setError('');
    setRows(parsed);
  }

  // === 优化规则应用（本地：先做规则处理，再交给 batchOptimize） ===

  function applyLocalRules(input: string): { cleaned: string; removed: string[]; added: string[] } {
    let cleaned = input;
    const removed: string[] = [];

    // 1. 移除无用词
    for (const w of removeList) {
      const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (re.test(cleaned)) {
        removed.push(w);
        cleaned = cleaned.replace(re, '').replace(/\s+/g, ' ').trim();
      }
    }

    // 2. 补充热搜词（按当前结构规则决定位置）
    const added: string[] = [];
    const missing = trendingList.filter((w) => !cleaned.includes(w)).slice(0, 3);
    for (const w of missing) {
      added.push(w);
    }

    if (structuralRule === 'short') {
      // 精简：只保留前 8 字核心 + 热搜词
      const core = cleaned.slice(0, 8);
      cleaned = [core, ...missing].join(' ');
    } else if (structuralRule === 'brand-first') {
      // 品牌前置
      cleaned = [...missing, cleaned].join(' ');
    } else {
      // 标准：核心词 + 热搜词
      cleaned = `${cleaned} ${missing.join(' ')}`.trim();
    }

    // 清理重复空格
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return { cleaned, removed, added };
  }

  // === 优化运行 ===

  async function handleOptimize() {
    if (rows.length === 0) {
      setError('请先导入表格');
      return;
    }
    setRunning(true);
    setError('');
    setProgress({ done: 0, total: rows.length });
    setResults([]);

    try {
      // Step A: 本地规则预处理（去无用词 + 补热搜词 + 结构规则）
      const preprocessed = rows.map((r) => {
        const local = applyLocalRules(`${r.productName} ${r.keywords.replace(/,/g, ' ')}`);
        return {
          ...r,
          keywords: local.cleaned,
        };
      });

      // Step B: 交给 batchOptimize（候选生成 + SEO 评分）
      const out = await batchOptimize(preprocessed, platform, language, (done, total) => {
        setProgress({ done, total });
      });

      setResults(out);
    } finally {
      setRunning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function downloadResults() {
    if (results.length === 0) return;
    const csv = exportToCSV(results);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'title-optimization-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // === 渲染 ===

  return (
    <div className="space-y-4">
      <PageHeader
        title="标题优化"
        desc="导入表格 → 预设规则（去废词 / 补热搜 / 结构规则）→ 输出上架标题（批量）"
      />

      {/* Step 1 · 导入表格 */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-semibold text-[var(--color-primary)]">
            1
          </span>
          <h3 className="font-medium">导入表格（批量，非逐条输入）</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {/* CSV 上传 */}
          <div className="rounded-lg border border-dashed border-[var(--color-border)] p-4">
            <p className="text-sm font-medium mb-1">📤 上传 CSV</p>
            <p className="text-xs text-muted mb-2">
              格式：productName, keywords, brand（最多 100 行）
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="hidden"
              disabled={running}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={running}>
              选择 CSV 文件
            </Button>
          </div>

          {/* 粘贴输入 */}
          <div className="rounded-lg border border-dashed border-[var(--color-border)] p-4">
            <p className="text-sm font-medium mb-1">📋 粘贴文本</p>
            <p className="text-xs text-muted mb-2">每行一条：商品名 + 空格分隔的关键词</p>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              className="w-full min-h-[80px] rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm"
              disabled={running}
            />
            <Button variant="outline" className="mt-2" onClick={loadFromPaste} disabled={running}>
              解析粘贴文本
            </Button>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="mt-3 rounded-lg bg-[var(--color-muted)] p-3">
            <p className="text-sm">
              ✓ 已导入 <strong>{rows.length}</strong> 行
              <Button variant="ghost" size="sm" className="ml-2" onClick={() => setRows([])}>
                清空
              </Button>
            </p>
          </div>
        )}

        {error && (
          <p className="mt-2 text-sm text-[var(--color-danger)]">{error}</p>
        )}
      </Card>

      {/* Step 2 · 预设规则 */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-semibold text-[var(--color-primary)]">
            2
          </span>
          <h3 className="font-medium">预设规则</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="text-muted">移除词库（去无用词 / 违规词）</span>
            <Input
              className="mt-1"
              value={removeWords}
              onChange={(e) => setRemoveWords(e.target.value)}
              placeholder="用逗号或顿号分隔"
              disabled={running}
            />
            <span className="text-xs text-muted">已配 {removeList.length} 个移除词</span>
          </label>

          <label className="text-sm">
            <span className="text-muted">热搜词库（自动补热搜）</span>
            <Input
              className="mt-1"
              value={trendingWords}
              onChange={(e) => setTrendingWords(e.target.value)}
              placeholder="用逗号或顿号分隔"
              disabled={running}
            />
            <span className="text-xs text-muted">已配 {trendingList.length} 个热搜词</span>
          </label>
        </div>

        <div className="mt-4">
          <p className="text-sm text-muted mb-2">结构规则（新规则突出优化后标题）</p>
          <div className="space-y-2">
            {STRUCTURAL_RULES.map((r) => (
              <label
                key={r.id}
                className={`flex items-start gap-2 rounded-lg border p-2 text-sm cursor-pointer ${
                  structuralRule === r.id
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                    : 'border-[var(--color-border)]'
                }`}
              >
                <input
                  type="radio"
                  name="rule"
                  value={r.id}
                  checked={structuralRule === r.id}
                  onChange={() => setStructuralRule(r.id)}
                  disabled={running}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">{r.label}</p>
                  <p className="text-xs text-muted">示例：{r.example}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="text-muted">目标平台</span>
            <select
              className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              disabled={running}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABEL[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-muted">输出语言</span>
            <select
              className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              disabled={running}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {/* Step 3 · 一键优化 */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-semibold text-[var(--color-primary)]">
            3
          </span>
          <h3 className="font-medium">一键优化（管线执行）</h3>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleOptimize} disabled={running || rows.length === 0}>
            {running ? `优化中 ${progress.done}/${progress.total}` : '🚀 开始批量优化'}
          </Button>
          <span className="text-xs text-muted">
            共 {rows.length} 行 · 预计按管线流程逐步执行
          </span>
        </div>

        {running && (
          <div className="mt-3">
            <div className="w-full rounded bg-[var(--color-muted)] h-2">
              <div
                className="bg-[var(--color-primary)] h-2 rounded transition-all"
                style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted">
              处理中: {progress.done} / {progress.total}
            </p>
          </div>
        )}
      </Card>

      {/* Step 4 · 输出上架标题 */}
      {results.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-semibold text-[var(--color-primary)]">
                4
              </span>
              <h3 className="font-medium">输出：优化后的上架标题</h3>
            </div>
            <Button onClick={downloadResults}>📥 下载 CSV</Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--color-border)] text-muted">
                <tr>
                  <th className="py-2 text-left">原商品名</th>
                  <th className="py-2 text-left">优化后上架标题</th>
                  <th className="py-2 text-center">SEO 评分</th>
                  <th className="py-2 text-center">状态</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-[var(--color-border)]">
                    <td className="py-2 text-muted">{r.input.productName}</td>
                    <td className="py-2 font-medium">{r.recommended || '—'}</td>
                    <td className="py-2 text-center">
                      {r.success ? (
                        <Badge tone={r.score >= 80 ? 'ok' : 'default'}>{r.score} 分</Badge>
                      ) : (
                        <Badge tone="warn">失败</Badge>
                      )}
                    </td>
                    <td className="py-2 text-center">
                      {r.success ? (
                        <Badge tone="ok">✓ 可上架</Badge>
                      ) : (
                        <Badge tone="warn">需人工确认</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-muted">
            完成 {results.length} 行 · 成功率{' '}
            {Math.round((results.filter((r) => r.success).length / results.length) * 100)}%
          </div>
        </Card>
      )}
    </div>
  );
}

export default TitleOptimizationPage;