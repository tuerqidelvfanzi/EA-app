import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader, Card, Badge, Button, Input } from '../components/ui';
import { AIDialog } from '../components/AIDialog';
import { importCollectFromEncoded } from '../lib/collectImport';
import { exportProductsCsv, exportProductsJson } from '../lib/exportUtils';
import {
  useDeleteProduct,
  useInvalidateProducts,
  useProducts,
  useRunPipeline,
} from '../hooks/useAppQueries';
import { api } from '../lib/api';
import type { ProductStatus } from '../lib/api/types';

const statusLabel: Record<ProductStatus, string> = {
  raw: '待处理',
  processing: '处理中',
  ready: '可发布',
  published: '已发布',
};

// 来源平台选项
const SOURCE_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '1688', label: '1688' },
  { value: 'taobao', label: '淘宝' },
  { value: 'tmall', label: '天猫' },
  { value: 'pinduoduo', label: '拼多多' },
  { value: 'douyin', label: '抖音' },
  { value: 'tiktok', label: 'TikTok' },
];

export function InboxPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [importMsg, setImportMsg] = useState('');
  const [filter, setFilter] = useState<ProductStatus | 'all'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 筛选状态
  const [sourceFilter, setSourceFilter] = useState('all');
  const [keywordFilter, setKeywordFilter] = useState('');

  // 处理图片上传
  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const validFiles = Array.from(files).filter(f => validTypes.includes(f.type));

    if (validFiles.length === 0) {
      setImportMsg('请上传 JPG/PNG/WebP 格式图片');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const reader = new FileReader();

        await new Promise<void>((resolve, reject) => {
          reader.onload = async (e) => {
            try {
              const base64 = e.target?.result as string;
              // 创建商品（简化版：使用文件名作为标题）
              const title = file.name.replace(/\.[^/.]+$/, '').slice(0, 50);
              await api.createProduct({
                title,
                source: 'upload',
                sourceUrl: '',
                priceCny: 0,
                thumb: base64,
                images: [base64],
                targetLocale: 'vi-VN',
              });
              setUploadProgress(Math.round(((i + 1) / validFiles.length) * 100));
              resolve();
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error('读取文件失败'));
          reader.readAsDataURL(file);
        });
      }

      invalidate();
      setImportMsg(`成功上传 ${validFiles.length} 张图片`);
    } catch (err) {
      setImportMsg(`上传失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const invalidate = useInvalidateProducts();
  const { data: products = [], isLoading } = useProducts(filter, {
    source: sourceFilter !== 'all' ? sourceFilter : undefined,
    keyword: keywordFilter.trim() || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const deleteMut = useDeleteProduct();
  const pipelineMut = useRunPipeline();

  const filteredProducts = products;

  useEffect(() => {
    const payload = searchParams.get('demoImport');
    if (!payload) return;
    void importCollectFromEncoded(payload).then((res) => {
      if (res.ok) {
        invalidate();
        setImportMsg(`已从插件导入：${res.title}`);
      } else {
        setImportMsg(res.error ?? '导入失败，请重新上传。');
      }
      searchParams.delete('demoImport');
      setSearchParams(searchParams, { replace: true });
    });
  }, [searchParams, setSearchParams, invalidate]);

  const extensionCount = products.filter((p) => p.fromExtension).length;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const batchProcess = async () => {
    const ids =
      selected.size > 0 ? [...selected] : filteredProducts.filter((p) => p.status === 'raw').map((p) => p.id);
    if (ids.length === 0) {
      alert('没有可处理的商品');
      return;
    }
    for (const id of ids) {
      await pipelineMut.mutateAsync({ productId: id });
    }
    setImportMsg(`已批量处理 ${ids.length} 条`);
    setSelected(new Set());
  };

  return (
    <>
      <PageHeader
        title="采集箱"
        desc="插件采集 / 链接采集 / 图片上传 → 编辑 → 运行管线"
        action={
          <div className="flex flex-wrap gap-2">
            {/* 图片上传按钮 */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files)}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? `上传中 ${uploadProgress}%` : '📤 上传图片'}
            </Button>
            <Button variant="outline" disabled={pipelineMut.isPending} onClick={batchProcess}>
              {pipelineMut.isPending ? '处理中…' : '批量处理'}
            </Button>
            <Button variant="outline" onClick={() => exportProductsJson(products)}>
              导出 JSON
            </Button>
            <Button variant="outline" onClick={() => exportProductsCsv(products)}>
              导出 CSV
            </Button>
          </div>
        }
      />

      {/* V4 R3: AI 对话框（采集箱） */}
      <div className="mb-4">
        <AIDialog
          contextHint="例如：采集淘宝搜索「女童连衣裙」前 50 条；基于 #12 找相似款；批量把已采集商品按当前改写模板跑管线；…"
          presets={[
            { id: 'similar', label: '🔍 采集相似商品', prompt: '采集类似商品' },
            { id: 'same-spec', label: '📐 同规格商品', prompt: '采集同规格商品' },
            { id: 'same-type', label: '🏷️ 同类型商品', prompt: '采集同类型商品' },
            { id: 'batch-run', label: '⚡ 批量跑管线', prompt: '对已勾选的商品批量运行改写管线' },
          ]}
          onSubmit={(p) => `已记录采集箱指令: "${p}"（本地 mock）`}
        />
      </div>

      {importMsg ? (
        <Card className="mb-4 border-[var(--color-primary)]">
          <p className="text-sm text-[var(--color-primary)]">{importMsg}</p>
        </Card>
      ) : null}

      {/* 筛选工具栏 */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* 来源筛选 */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted whitespace-nowrap">来源:</label>
            <select
              className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 关键词搜索 */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted whitespace-nowrap">关键词:</label>
            <Input
              className="w-40"
              placeholder="搜索标题..."
              value={keywordFilter}
              onChange={(e) => setKeywordFilter(e.target.value)}
            />
          </div>

          {/* 日期范围 */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted whitespace-nowrap">日期:</label>
            <input
              type="date"
              className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span className="text-sm text-muted">至</span>
            <input
              type="date"
              className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          {/* 状态筛选 */}
          <div className="flex flex-wrap gap-1 text-sm">
            {(['all', 'raw', 'processing', 'ready', 'published'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={`rounded px-2 py-1 ${filter === s ? 'bg-[var(--color-primary)] text-white' : 'bg-muted text-label'}`}
                onClick={() => setFilter(s)}
              >
                {s === 'all' ? '全部' : statusLabel[s]}
              </button>
            ))}
          </div>

          {/* 清空筛选 */}
          {(sourceFilter !== 'all' || keywordFilter || dateFrom || dateTo) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSourceFilter('all');
                setKeywordFilter('');
                setDateFrom('');
                setDateTo('');
              }}
            >
              清空筛选
            </Button>
          )}
        </div>
      </Card>

      {/* 统计信息 */}
      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          插件采集 <strong>{extensionCount}</strong> 条 · 筛选结果 <strong>{filteredProducts.length}</strong> 条 / 共 <strong>{products.length}</strong> 条
        </p>
      </Card>
      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-muted">加载中…</p>
        ) : filteredProducts.length === 0 ? (
          <p className="p-6 text-sm text-muted text-center">没有找到符合条件的商品</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-table-head text-muted">
              <tr>
                <th className="w-8 p-3">
                  <input
                    type="checkbox"
                    checked={selected.size === filteredProducts.length && filteredProducts.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelected(new Set(filteredProducts.map((p) => p.id)));
                      } else {
                        setSelected(new Set());
                      }
                    }}
                  />
                </th>
                <th className="p-3">商品</th>
                <th className="p-3">来源</th>
                <th className="p-3">进价</th>
                <th className="p-3">GMV</th>
                <th className="p-3">CTR</th>
                <th className="p-3">SKU数</th>
                <th className="p-3">图片数</th>
                <th className="p-3">采集时间</th>
                <th className="p-3">状态</th>
                <th className="p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-[var(--color-surface)]">
                  <td className="p-3">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img src={p.thumb} alt="" className="h-12 w-12 rounded object-cover" />
                      <div>
                        <span className="line-clamp-2 max-w-xs font-medium">{p.title}</span>
                        <div className="flex gap-2 mt-1">
                          {p.fromExtension ? (
                            <span className="text-xs px-1 py-0.5 rounded bg-[var(--color-primary)] text-white">插件</span>
                          ) : null}
                          <span className="text-xs text-muted">{p.category || '未分类'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge tone="default">{p.source}</Badge>
                  </td>
                  <td className="p-3">¥{p.priceCny}</td>
                  <td className="p-3 text-center">
                    {/* GMV字段 - 从竞品数据获取 */}
                    {(p as any).gmv ? (
                      <span className="text-green-600 font-medium">${(p as any).gmv}</span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {/* CTR字段 - 从竞品数据获取 */}
                    {(p as any).ctr ? (
                      <span className={`font-medium ${(p as any).ctr > 5 ? 'text-green-600' : 'text-orange-500'}`}>
                        {(p as any).ctr}%
                      </span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="p-3 text-center">{p.skuCount ?? p.skus?.length ?? '-'}</td>
                  <td className="p-3 text-center">{p.imageCount ?? p.images?.length ?? '-'}</td>
                  <td className="p-3 text-xs text-muted">
                    {p.capturedAt ? new Date(p.capturedAt).toLocaleDateString('zh-CN') : '-'}
                  </td>
                  <td className="p-3">
                    <Badge tone={p.status === 'ready' ? 'ok' : p.status === 'processing' ? 'warn' : 'default'}>
                      {statusLabel[p.status]}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Link to={`/app/workbench/${p.id}`}>
                        <Button variant="outline" size="sm">编辑</Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('删除？')) deleteMut.mutate(p.id);
                        }}
                      >
                        删除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
