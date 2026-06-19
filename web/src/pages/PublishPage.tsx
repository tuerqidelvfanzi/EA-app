import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PageHeader, Card, Badge, Button } from '../components/ui';
import { AIDialog } from '../components/AIDialog';
import { api } from '../lib/api';
import { queryKeys, useProducts, usePublishTasks } from '../hooks/useAppQueries';
import type { PublishTask } from '../lib/api/types';

// 平台配置
const PLATFORM_CONFIG: Record<PublishTask['platform'], {
  url: string;
  flag: string;
  desc: string;
  steps: string[];
}> = {
  Shopee: {
    url: 'https://seller.shopee.cn/',
    flag: '🇻🇳',
    desc: '越南 Shopee 电商平台',
    steps: ['1. 打开卖家后台', '2. 商品管理 → 添加商品', '3. 插件自动填表', '4. 检查图片/描述', '5. 提交发布'],
  },
  'TikTok Shop': {
    url: 'https://seller.tiktokglobalshop.com/',
    flag: '🇹🇭',
    desc: '泰国 TikTok Shop',
    steps: ['1. 打开卖家中心', '2. 商品管理 → 创建商品', '3. 插件自动填表', '4. 设置SKU变体', '5. 提交审核'],
  },
  '淘宝': {
    url: 'https://sell.taobao.com/',
    flag: '🇨🇳',
    desc: '淘宝卖家中心',
    steps: ['1. 打开千牛工作台', '2. 商品管理 → 发布宝贝', '3. 插件自动填表', '4. 设置价格库存', '5. 上架'],
  },
};

// 模拟发布任务数据
const MOCK_PUBLISH_TASKS: PublishTask[] = [
  { id: 'pub-new-1', platform: 'Shopee', title: '韩版童装连衣裙夏季女童公主裙', status: 'pending' },
  { id: 'pub-new-2', platform: 'TikTok Shop', title: '儿童纯棉短袖T恤男童打底衫', status: 'pending' },
  { id: 'pub-new-3', platform: 'Shopee', title: '婴儿连体衣新生儿哈衣爬服', status: 'pending' },
];

// 状态配置
const STATUS_CONFIG: Record<string, { label: string; tone: 'default' | 'ok' | 'warn'; icon: string }> = {
  pending: { label: '待发布', tone: 'warn', icon: '⏳' },
  filling: { label: '填表中', tone: 'warn', icon: '✍️' },
  completed: { label: '已发布', tone: 'ok', icon: '✅' },
  failed: { label: '失败', tone: 'warn', icon: '❌' },
  draft: { label: '草稿', tone: 'default', icon: '📝' },
};

export function PublishPage() {
  const { data: tasks = MOCK_PUBLISH_TASKS } = usePublishTasks();
  const { data: products = [] } = useProducts('ready');
  const qc = useQueryClient();
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<PublishTask['platform']>('Shopee');

  const createMut = useMutation({
    mutationFn: () => {
      const p = products[0];
      if (!p) throw new Error('NO_READY_PRODUCT');
      return api.createPublishTask({
        platform: p.targetLocale === 'vi-VN' ? 'Shopee' : 'TikTok Shop',
        title: p.processed?.conversion.title ?? p.title,
        productId: p.id,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.publish }),
  });

  const patchMut = useMutation({
    mutationFn: (vars: { id: string; status: PublishTask['status'] }) =>
      api.updatePublishTask(vars.id, { status: vars.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.publish }),
  });

  const prepareMut = useMutation({
    mutationFn: (id: string) => api.preparePublishTask(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.publish });
      if (data.ok) {
        alert(data.fillInstructions ?? '已生成填表数据，请在插件中填入草稿');
      } else {
        alert(`校验未通过：${(data.validation?.issues ?? []).join('；')}`);
      }
    },
    onError: () => alert('生成填表数据失败'),
  });

  // 按平台分组统计
  const platformStats = tasks.reduce((acc, t) => {
    acc[t.platform] = (acc[t.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <PageHeader
        title="发布中心"
        desc="工作台处理 → 发布任务 → 插件填表 → 卖家中心发布"
        action={
          <Button
            disabled={createMut.isPending || products.length === 0}
            onClick={() => {
              createMut.mutate(undefined, {
                onError: () => alert('请先将商品处理为「可发布」'),
              });
            }}
          >
            + 新建发布任务
          </Button>
        }
      />

      {/* V4 R3: AI 对话框（发布中心） */}
      <div className="mb-4">
        <AIDialog
          contextHint="例如：把所有 #1 商品的发布任务状态检查一遍；把 #3 商品扩到全部目标；找出来哪些任务重发了同一商品；…"
          presets={[
            { id: 'audit', label: '🔍 任务审计', prompt: '扫描所有任务找冲突/重复/失败原因' },
            { id: 'expand', label: '🌐 扩到全部目标', prompt: '把当前任务扩展到所有可发布的平台/国家' },
            { id: 'retry', label: '↻ 失败重试', prompt: '对所有失败任务按原参数重试' },
            { id: 'republish', label: '🔁 重新发布', prompt: '对已发布任务按当前最新改写结果重发' },
          ]}
          onSubmit={(p) => `已记录发布指令: "${p}"（本地 mock）`}
        />
      </div>

      {/* 发布流程说明 */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <h3 className="font-medium mb-4">📋 发布流程</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">1</div>
            <div>
              <p className="font-medium">采集箱</p>
              <p className="text-xs text-muted">插件采集商品数据</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">2</div>
            <div>
              <p className="font-medium">工作台处理</p>
              <p className="text-xs text-muted">运行管线，生成标题/描述</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">3</div>
            <div>
              <p className="font-medium">创建发布任务</p>
              <p className="text-xs text-muted">选择目标平台</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">4</div>
            <div>
              <p className="font-medium">插件填表发布</p>
              <p className="text-xs text-muted">自动填入卖家后台</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 越南Shopee 13步流程 */}
      <Card className="mb-6 border-orange-200 bg-orange-50/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-orange-700">🇻🇳 越南Shopee上品13步流程</h3>
          <Badge tone="warn">Shopee越南站</Badge>
        </div>
        <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-7 text-xs">
          {[
            { step: 1, title: '下载安装', desc: '店八方应用' },
            { step: 2, title: '点击上货', desc: '进入采集箱' },
            { step: 3, title: '编辑产品', desc: '进入链接' },
            { step: 4, title: '编辑标题', desc: '≤20字符' },
            { step: 5, title: '简易描述', desc: '删除违禁词' },
            { step: 6, title: '详细描述', desc: '优化文案' },
            { step: 7, title: '选择类目', desc: '正确类目' },
            { step: 8, title: '编辑SKU', desc: '×3.5倍' },
            { step: 9, title: '编辑图片', desc: '9张1:1' },
            { step: 10, title: '编辑物流', desc: '10-5-10' },
            { step: 11, title: '保存越南', desc: '保存修改' },
            { step: 12, title: '一键翻译', desc: '越南语' },
            { step: 13, title: '发布产品', desc: '完成上架' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-2 p-2 bg-white rounded border border-orange-100">
              <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {item.step}
              </div>
              <div>
                <p className="font-medium text-orange-800">{item.title}</p>
                <p className="text-orange-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 平台选择和操作 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 平台列表 */}
        <div className="lg:col-span-1">
          <Card>
            <h3 className="font-medium mb-4">🎯 选择目标平台</h3>
            <div className="space-y-2">
              {(Object.keys(PLATFORM_CONFIG) as PublishTask['platform'][]).map((platform) => {
                const cfg = PLATFORM_CONFIG[platform];
                const isActive = selectedPlatform === platform;
                const count = platformStats[platform] || 0;
                return (
                  <div
                    key={platform}
                    className={`p-3 rounded-lg border cursor-pointer transition ${
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedPlatform(platform)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">{cfg.flag}</span>
                      <span className="font-medium">{platform}</span>
                      {count > 0 && (
                        <Badge tone="warn">{count}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-1">{cfg.desc}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 选中平台的发布步骤 */}
          <Card className="mt-4">
            <h3 className="font-medium mb-3">{PLATFORM_CONFIG[selectedPlatform].flag} {selectedPlatform} 发布步骤</h3>
            <ol className="space-y-2 text-sm">
              {PLATFORM_CONFIG[selectedPlatform].steps.map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium">{i + 1}</span>
                  <span className="text-muted">{step.replace(/^\d+\.\s*/, '')}</span>
                </li>
              ))}
            </ol>
            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={() => window.open(PLATFORM_CONFIG[selectedPlatform].url, '_blank')}
            >
              🚀 打开 {selectedPlatform} 卖家后台
            </Button>
          </Card>
        </div>

        {/* 发布任务列表 */}
        <div className="lg:col-span-2">
          <Card className="mb-3">
            <h3 className="font-medium mb-2">🌐 多对多管理（V4 R4）</h3>
            <p className="text-xs text-muted mb-3">
              按来源商品分组 · 1 个源商品可发往 N 个目标 · 已发可重发 · 支持版本对比
            </p>
            {tasks.length === 0 ? (
              <p className="text-xs text-muted">暂无任务</p>
            ) : (
              <div className="space-y-2">
                {/* 按 productId 分组（若无 productId 则按 title 聚类） */}
                {Array.from(
                  tasks.reduce((acc, t) => {
                    const key = t.productId || t.title;
                    if (!acc.has(key)) acc.set(key, [] as PublishTask[]);
                    acc.get(key)!.push(t);
                    return acc;
                  }, new Map<string, PublishTask[]>()),
                ).map(([key, group]) => {
                  const sample = group[0];
                  return (
                    <div key={key} className="rounded-lg border border-[var(--color-border)] p-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium truncate max-w-[60%]" title={sample.title}>
                          📦 {sample.title}
                        </p>
                        <span className="text-xs text-muted">已发往 {group.length} 个目标</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {group.map((t) => {
                          const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.pending;
                          return (
                            <div
                              key={t.id}
                              className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-muted)] px-2 py-1 text-xs"
                            >
                              <span>{PLATFORM_CONFIG[t.platform]?.flag}</span>
                              <span>{t.platform}</span>
                              <Badge tone={statusCfg.tone as 'default' | 'ok' | 'warn'} className="text-[10px]">
                                {statusCfg.icon}
                              </Badge>
                            </div>
                          );
                        })}
                        {/* 扩到全部目标按钮 */}
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded border border-dashed border-[var(--color-primary)]/50 px-2 py-1 text-xs text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
                          onClick={() => alert(`已基于 ${sample.title} 扩展到剩余 4 个可发布目标（mock）`)}
                        >
                          + 扩到全部
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="font-medium mb-4">📋 发布任务列表</h3>
            {tasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted">暂无发布任务</p>
                <p className="text-xs text-muted mt-2">在工作台处理商品后创建发布任务</p>
                <Link to="/app/workbench" className="mt-4 inline-block">
                  <Button variant="outline">去工作台</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((t) => {
                  const cfg = PLATFORM_CONFIG[t.platform];
                  const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.pending;
                  return (
                    <div
                      key={t.id}
                      className="p-4 rounded-lg border border-border hover:border-primary/50 transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{cfg?.flag || '📦'}</span>
                            <span className="font-medium">{t.title}</span>
                          </div>
                          <div className="flex gap-2 mt-2 text-xs text-muted">
                            <Badge tone={cfg ? 'default' : 'warn'}>
                              {cfg?.flag} {t.platform}
                            </Badge>
                            <Badge tone={statusCfg.tone as 'default' | 'ok' | 'warn'}>
                              {statusCfg.icon} {statusCfg.label}
                            </Badge>
                          </div>
                          {t.reason && (
                            <p className="mt-2 text-xs text-red-500">失败原因: {t.reason}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={prepareMut.isPending}
                            onClick={() => prepareMut.mutate(t.id)}
                          >
                            📝 生成填表
                          </Button>
                          {t.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => patchMut.mutate({ id: t.id, status: 'completed' })}
                            >
                              ✅ 标记完成
                            </Button>
                          )}
                          {t.status === 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(cfg?.url || '#', '_blank')}
                            >
                              🚀 打开后台
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* 校验结果 */}
                      {t.validation && (
                        <div className="mt-3 p-2 bg-muted/50 rounded text-xs">
                          <p className="font-medium mb-1">校验结果:</p>
                          {t.validation.ok ? (
                            <p className="text-green-600">✅ 全部通过</p>
                          ) : (
                            <ul className="text-red-500 space-y-1">
                              {t.validation.issues.map((issue, i) => (
                                <li key={i}>❌ {issue}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 发布统计 */}
      <Card className="mt-6 bg-green-50/50 dark:bg-green-900/20">
        <h3 className="font-medium mb-4">📊 发布统计</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-2xl font-bold text-primary">{tasks.length}</p>
            <p className="text-xs text-muted">总任务数</p>
          </div>
          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-2xl font-bold text-yellow-500">{tasks.filter(t => t.status === 'pending').length}</p>
            <p className="text-xs text-muted">待发布</p>
          </div>
          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-2xl font-bold text-green-500">{tasks.filter(t => t.status === 'completed').length}</p>
            <p className="text-xs text-muted">已完成</p>
          </div>
          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-2xl font-bold text-red-500">{tasks.filter(t => t.status === 'failed').length}</p>
            <p className="text-xs text-muted">失败</p>
          </div>
        </div>
      </Card>

      <p className="mt-4 text-sm">
        <Link to="/app/inbox" className="text-[var(--color-primary)]">
          ← 返回采集箱
        </Link>
      </p>
    </>
  );
}
