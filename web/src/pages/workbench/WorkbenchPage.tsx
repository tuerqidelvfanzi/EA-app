/**
 * 处理工作台（V3.0 挂载版）
 *
 * 来源：V2 `v2/pages/WorkbenchV2Page.tsx`（v2 完整版）
 * 变更：
 *   - 替换 V2Shell 为 PageHeader + 卡片布局
 *   - 路由 `/app/workbench/:id` 在 v3.0 正式挂载
 *   - 行为/管线调用与 v2 等价
 *
 * 覆盖 PRD V3 §5.3 FR-P-01 处理工作台 + FR-P-03 五段 SKU + FR-P-07 图片任务
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, Button, Input, Badge, PageHeader } from '../../components/ui';
import { validateTitle } from '../../lib/listingTitle';
import { useProduct, useTemplates, useUpdateProduct } from '../../hooks/useAppQueries';
import {
  useV2PipelineRuns,
  useV2RunPipeline,
  useV2TemplateCatalog,
} from '../../v2/hooks/useV2Queries';
import type { TargetLocale } from '../../v2/types';
import type { PackageDimensions } from '../../lib/api/types';
import { InsightsAttachPanel } from '../../components/workbench/InsightsAttachPanel';
import { CopyEditPanel } from '../../components/workbench/CopyEditPanel';
import { LogisticsPanel } from '../../components/workbench/LogisticsPanel';
import { ImageNineGridPanel } from '../../components/workbench/ImageNineGridPanel';
import { ImageTasksPanel } from '../../components/workbench/ImageTasksPanel';
import { FabricCheckBanner } from '../../components/workbench/FabricCheckBanner';
import { AIDialog } from '../../components/AIDialog';
import { REWRITE_TEMPLATE_EXAMPLES } from '../../lib/api/types';
import type { RewriteTemplate } from '../../lib/api/types';

const SHOPEE_VN_STEPS = [
  '选择店铺',
  '创建商品',
  '上传 9 张图',
  '标题 ≤20 字',
  '类目',
  'SKU 价×3.5 库存50',
  '短描述',
  '长描述',
  '物流模板',
  '重量 220g',
  '包裹 10×5×10',
  '发布',
  '确认上架',
] as const;

const DEFAULT_PACKAGE: PackageDimensions = { length: 10, width: 5, height: 10 };

export function WorkbenchPage() {
  const { id = '' } = useParams();
  const { data: product, isLoading } = useProduct(id);
  const { data: catalog = [] } = useV2TemplateCatalog();
  const { data: templates = [] } = useTemplates();
  const { data: runs = [] } = useV2PipelineRuns(id);
  const runPipeline = useV2RunPipeline(id);
  const updateProduct = useUpdateProduct();

  const [locale, setLocale] = useState<TargetLocale>('vi-VN');
  const [templateId, setTemplateId] = useState('tpl-tshirt-a');
  const [adhocPrompt, setAdhocPrompt] = useState('');
  const [selectedOutput, setSelectedOutput] = useState<'exposure' | 'conversion'>('exposure');
  const [editTitle, setEditTitle] = useState('');
  const [editShortDesc, setEditShortDesc] = useState('');
  const [editLongDesc, setEditLongDesc] = useState('');
  const [weightGrams, setWeightGrams] = useState(220);
  const [packageDims, setPackageDims] = useState<PackageDimensions>(DEFAULT_PACKAGE);
  const [imageMsg, setImageMsg] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [vnSteps, setVnSteps] = useState<boolean[]>(() => SHOPEE_VN_STEPS.map(() => false));

  // V4 R2：改写模板驱动（按激活模板跑）+ 扩到全部目标
  const [rewriteTplId, setRewriteTplId] = useState<string>('');
  const [expandOpen, setExpandOpen] = useState(false);
  const [expandTargets, setExpandTargets] = useState<RewriteTemplate[]>([]);
  const [expandMsg, setExpandMsg] = useState('');

  // 当前激活的改写模板（如果用户选了）；否则按目标 locale 自动匹配
  const activeRewriteTpl = REWRITE_TEMPLATE_EXAMPLES.find((t) => t.id === rewriteTplId);
  const defaultTpl = REWRITE_TEMPLATE_EXAMPLES.find((t) => t.targetLocale === locale) ?? REWRITE_TEMPLATE_EXAMPLES[0];
  const effectiveTpl = activeRewriteTpl ?? defaultTpl;

  // 「扩到全部目标」候选：所有其他可发布的目标（同品类）
  const allTargetOptions = REWRITE_TEMPLATE_EXAMPLES.filter(
    (t) => t.targetLocale !== locale && t.category === product?.category,
  );

  const lastRun = runs[0];
  const output =
    selectedOutput === 'exposure' ? lastRun?.exposure : lastRun?.conversion;

  const displayTitle = editTitle || output?.title || '';

  useEffect(() => {
    if (!product) return;
    setEditLongDesc(product.description ?? '');
    const proc = product.processed;
    if (proc) {
      setEditTitle(proc.conversion.title ?? proc.exposure.title ?? product.title);
      setEditShortDesc(proc.conversion.shortDescription ?? proc.exposure.shortDescription ?? '');
    }
  }, [product?.id]);

  useEffect(() => {
    if (output?.title && !editTitle) setEditTitle(output.title);
    if (output?.shortDescription) setEditShortDesc(output.shortDescription);
  }, [output?.title, output?.shortDescription]);

  const titleValidation = useMemo(() => {
    if (locale !== 'vi-VN' || !displayTitle) return null;
    return validateTitle(displayTitle);
  }, [locale, displayTitle]);

  const checklistFromRun = lastRun?.shopeeVnChecklist;

  async function handleSave() {
    if (!product) return;
    await updateProduct.mutateAsync({
      id: product.id,
      patch: {
        description: editLongDesc,
        processed: product.processed
          ? {
              ...product.processed,
              exposure: {
                ...product.processed.exposure,
                title: selectedOutput === 'exposure' ? displayTitle : product.processed.exposure.title,
                shortDescription:
                  selectedOutput === 'exposure' ? editShortDesc : product.processed.exposure.shortDescription,
              },
              conversion: {
                ...product.processed.conversion,
                title: selectedOutput === 'conversion' ? displayTitle : product.processed.conversion.title,
                shortDescription:
                  selectedOutput === 'conversion' ? editShortDesc : product.processed.conversion.shortDescription,
              },
            }
          : undefined,
        attributes: {
          ...(product.attributes ?? {}),
          weightGrams,
          packageDimensions: packageDims,
        },
      },
    });
    setSaveMsg('已保存草稿（演示）');
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="处理工作台" />
        <p className="text-muted">加载中…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-4">
        <PageHeader title="处理工作台" />
        <p className="text-muted">商品不存在</p>
        <Link to="/app/inbox" className="text-sm text-[var(--color-primary)]">
          返回采集箱
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="处理工作台"
        desc="演示完整：洞察挂载 · 文案/违禁 · 9 图 · 物流 · 管线 · 五段 SKU"
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleSave} disabled={updateProduct.isPending}>
              保存编辑
            </Button>
            <Link to="/app/inbox">
              <Button type="button" variant="outline" size="sm">
                采集箱
              </Button>
            </Link>
          </div>
        }
      />

      {/* V4 R3: AI 对话框（处理工作台） */}
      <AIDialog
        contextHint="例如：按当前改写模板跑全流程；把这个商品扩到所有东南亚目标；基于竞品分析结果重新生成标题；…"
        presets={[
          { id: 'run-tpl', label: '⚡ 按模板跑', prompt: '按当前改写模板跑完整流程' },
          { id: 'expand', label: '🌐 扩到全部目标', prompt: '把当前改写结果扩展到所有可发布目标' },
          { id: 'recheck', label: '🔍 重新校验', prompt: '基于规则重新校验标题/SKU/价格' },
          { id: 'rephrase', label: '✍️ 重新改写', prompt: '针对当前标题重新生成高曝光/高转化双版本' },
        ]}
        onSubmit={(p) => `已记录工作台指令: "${p}"（本地 mock）`}
      />

      {saveMsg ? (
        <Card className="border-[var(--color-primary)]">
          <p className="text-sm text-[var(--color-primary)]">{saveMsg}</p>
        </Card>
      ) : null}

      <FabricCheckBanner product={product} title={displayTitle} description={editLongDesc} />

      <Card className="border-dashed border-[var(--color-primary)]/40">
        <p className="text-sm text-muted">
          源平台 <strong>{product.source}</strong> · 处理层加工 ·{' '}
          <Link to="/app/competitors" className="text-[var(--color-primary)]">
            竞品/找同类
          </Link>
        </p>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="font-medium">原始（源平台）</h2>
          <div className="mt-3 flex gap-3">
            <img src={product.thumb} alt="" className="h-20 w-20 rounded-lg object-cover" />
            <div className="min-w-0 text-sm">
              <p className="font-medium">{product.title}</p>
              <p className="text-muted">
                {product.source} · ¥{product.priceCny}
              </p>
              <a href={product.sourceUrl} target="_blank" rel="noreferrer" className="text-[var(--color-primary)]">
                源链接
              </a>
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="font-medium">处理后（目标市场）</h2>
          <div className="mt-3 text-sm">
            <p className="font-medium">{displayTitle || '—'}</p>
            <p className="mt-1 text-muted">{editShortDesc || output?.shortDescription || '—'}</p>
            <p className="mt-2 font-medium">{output?.priceLabel ?? '—'}</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="font-medium">管线配置</h2>
          <div className="mt-3 grid gap-2 text-sm">
            <label>
              <span className="text-muted">目标市场</span>
              <select
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2"
                value={locale}
                onChange={(e) => setLocale(e.target.value as TargetLocale)}
              >
                <option value="vi-VN">越南 Shopee</option>
                <option value="th-TH">泰国 TikTok</option>
                <option value="fil-PH">菲律宾 Shopee</option>
                <option value="id-ID">印尼 Shopee</option>
              </select>
            </label>
            <label>
              <span className="text-muted">类目模板</span>
              <select
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                {catalog.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.mode})
                  </option>
                ))}
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    我的 · {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-muted">临时 Prompt</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm"
                rows={3}
                value={adhocPrompt}
                onChange={(e) => setAdhocPrompt(e.target.value)}
              />
            </label>
            <InsightsAttachPanel value={adhocPrompt} onChange={setAdhocPrompt} />
          </div>
          <Button
            type="button"
            className="mt-3"
            disabled={runPipeline.isPending}
            onClick={() =>
              runPipeline.mutate(
                { templateId, locale, adhocPrompt: adhocPrompt || undefined },
                {
                  onSuccess: (res) => {
                    setEditTitle(res.run.exposure.title);
                    setEditShortDesc(res.run.exposure.shortDescription);
                    if (res.run.shopeeVnChecklist) {
                      setVnSteps(res.run.shopeeVnChecklist.map((s) => s.done));
                    }
                  },
                },
              )
            }
          >
            运行管线（Mock）
          </Button>

          {/* V4 R2: 按改写模板跑 + 扩到全部目标 */}
          <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">🧩 改写模板驱动</span>
              <Link to="/app/rewrite-templates" className="text-xs text-[var(--color-primary)] hover:underline">
                管理模板 →
              </Link>
            </div>
            <label className="text-sm block mb-2">
              <span className="text-muted">改写模板（按 国家×平台×品类 自动匹配）</span>
              <select
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2"
                value={rewriteTplId}
                onChange={(e) => setRewriteTplId(e.target.value)}
              >
                <option value="">自动匹配当前目标（{defaultTpl.name}）</option>
                {REWRITE_TEMPLATE_EXAMPLES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}（{t.targetLocale} · {t.categoryMode}）
                  </option>
                ))}
              </select>
            </label>
            {effectiveTpl && (
              <div className="rounded-lg bg-[var(--color-muted)] p-2 text-xs mb-2">
                <p className="font-medium mb-1">📋 模板规则摘要（{effectiveTpl.steps.length} 步）</p>
                <p className="text-muted">定价 ×{effectiveTpl.pricing.multiplier} {effectiveTpl.pricing.currency} · 标题 ≤{effectiveTpl.title.maxChars}字 · 主图 {effectiveTpl.image.mainCount} 张 · SKU {effectiveTpl.skuSegments.join('×')}</p>
                <p className="text-muted truncate">System: {effectiveTpl.systemPrompt.split('\n')[0]}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setSaveMsg(`已按模板「${effectiveTpl.name}」跑完整改写管线（${effectiveTpl.steps.length} 步）`);
                  setTimeout(() => setSaveMsg(''), 3000);
                }}
              >
                ⚡ 按模板跑（双策略）
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setExpandOpen(!expandOpen)}
              >
                🌐 扩到全部目标 →
              </Button>
            </div>

            {expandOpen && (
              <div className="mt-3 p-3 rounded-lg border border-dashed border-[var(--color-primary)]/50 bg-[var(--color-primary-soft)]">
                <p className="text-sm font-medium mb-2">选择要扩展到的目标（同类目 · 不同国家/平台）</p>
                {allTargetOptions.length === 0 ? (
                  <p className="text-xs text-muted">当前品类「{product?.category}」暂无可扩展的目标（其它国家/平台的同类目模板未配置）</p>
                ) : (
                  <>
                    <div className="space-y-1 mb-2">
                      {allTargetOptions.map((t) => (
                        <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={expandTargets.find((x) => x.id === t.id) !== undefined}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setExpandTargets([...expandTargets, t]);
                              } else {
                                setExpandTargets(expandTargets.filter((x) => x.id !== t.id));
                              }
                            }}
                          />
                          <span>{t.name}</span>
                          <Badge tone="default">{t.targetLocale}</Badge>
                          <span className="text-xs text-muted">×{t.pricing.multiplier} {t.pricing.currency}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={expandTargets.length === 0}
                        onClick={() => {
                          setExpandMsg(`已基于当前改写结果，扩展到 ${expandTargets.length} 个目标（${expandTargets.map((t) => t.name).join(' / ')}）`);
                          setExpandOpen(false);
                          setExpandTargets([]);
                          setTimeout(() => setExpandMsg(''), 5000);
                        }}
                      >
                        ✓ 确认扩展 {expandTargets.length > 0 ? `(${expandTargets.length})` : ''}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setExpandOpen(false)}>
                        取消
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {expandMsg && (
              <div className="mt-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 text-xs text-green-700">
                ✓ {expandMsg}
              </div>
            )}
          </div>
        </Card>

        {locale === 'vi-VN' ? (
          <Card>
            <h2 className="font-medium">越南 Shopee · 13 步</h2>
            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-sm">
              {SHOPEE_VN_STEPS.map((label, i) => {
                const done = checklistFromRun?.[i]?.done ?? vnSteps[i];
                return (
                  <li key={label}>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => {
                          const next = [...vnSteps];
                          next[i] = !next[i];
                          setVnSteps(next);
                        }}
                      />
                      <span className={done ? 'text-muted line-through' : ''}>
                        {i + 1}. {label}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : (
          <Card>
            <h2 className="font-medium">物流（演示）</h2>
            <div className="mt-3">
              <LogisticsPanel
                weightGrams={weightGrams}
                packageDims={packageDims}
                onWeight={setWeightGrams}
                onDims={setPackageDims}
              />
            </div>
          </Card>
        )}
      </div>

      <Card>
        <h2 className="font-medium">文案编辑 · 违禁扫描</h2>
        <div className="mt-3">
          <CopyEditPanel
            locale={locale}
            title={displayTitle}
            shortDesc={editShortDesc}
            longDesc={editLongDesc}
            onTitle={setEditTitle}
            onShortDesc={setEditShortDesc}
            onLongDesc={setEditLongDesc}
          />
        </div>
      </Card>

      {locale === 'vi-VN' ? (
        <Card>
          <h2 className="font-medium">物流信息</h2>
          <div className="mt-3">
            <LogisticsPanel
              weightGrams={weightGrams}
              packageDims={packageDims}
              onWeight={setWeightGrams}
              onDims={setPackageDims}
            />
          </div>
        </Card>
      ) : null}

      <Card>
        <h2 className="font-medium">图片 · 9 槽位</h2>
        <div className="mt-3">
          <ImageNineGridPanel product={product} onMessage={setImageMsg} />
          {imageMsg ? <p className="mt-2 text-xs text-[var(--color-primary)]">{imageMsg}</p> : null}
        </div>
      </Card>

      {product ? (
        <div>
          <ImageTasksPanel
            imageUrls={(product.images ?? []).map((i) =>
              typeof i === 'string' ? i : i.url,
            )}
          />
        </div>
      ) : null}

      {lastRun ? (
        <>
          <Card>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={selectedOutput === 'exposure' ? 'primary' : 'outline'}
                onClick={() => {
                  setSelectedOutput('exposure');
                  setEditTitle(lastRun.exposure.title);
                  setEditShortDesc(lastRun.exposure.shortDescription);
                }}
              >
                高曝光
              </Button>
              <Button
                type="button"
                size="sm"
                variant={selectedOutput === 'conversion' ? 'primary' : 'outline'}
                onClick={() => {
                  setSelectedOutput('conversion');
                  setEditTitle(lastRun.conversion.title);
                  setEditShortDesc(lastRun.conversion.shortDescription);
                }}
              >
                高转化
              </Button>
            </div>
            {lastRun.warnings.length > 0 ? (
              <ul className="mt-3 text-xs text-amber-700">
                {lastRun.warnings.map((w) => (
                  <li key={w}>⚠ {w}</li>
                ))}
              </ul>
            ) : null}
          </Card>

          <Card>
            <h2 className="font-medium">SKU（五段 · ADR-001）</h2>
            <table className="mt-2 w-full text-left text-sm">
              <thead>
                <tr className="text-muted">
                  <th className="py-1">编码</th>
                  <th className="py-1">印花</th>
                  <th className="py-1">颜色</th>
                  <th className="py-1">尺码</th>
                  <th className="py-1">价/库存</th>
                </tr>
              </thead>
              <tbody>
                {lastRun.skus.map((s) => (
                  <tr key={s.skuCode} className="border-t border-[var(--color-border)]">
                    <td className="py-2 font-mono text-xs">{s.skuCode}</td>
                    <td className="py-2">{s.printVariant ? <Badge tone="ok">+{s.printVariant}</Badge> : '—'}</td>
                    <td className="py-2">{s.color}</td>
                    <td className="py-2">{s.size}</td>
                    <td className="py-2">
                      {s.price} / {s.stock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      ) : (
        <Card>
          <p className="text-sm text-muted">运行管线后展示 SKU 表</p>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Link to="/app/publish">
          <Button type="button">发布中心（生成填表）</Button>
        </Link>
        <Link to="/app/competitors">
          <Button type="button" variant="outline">
            竞品洞察
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default WorkbenchPage;
