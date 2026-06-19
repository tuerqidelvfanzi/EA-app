import { Link } from 'react-router-dom';
import { Download, Globe, Inbox, Sparkles, FileText } from 'lucide-react';
import { downloadExtensionZip } from '../lib/extension';

type Step = {
  n: number;
  title: string;
  desc: string;
  icon: typeof Download;
  link?: { label: string; to: string };
  button?: { label: string; onClick: () => void };
};

/**
 * 当前展示范围（会议 12:00-17:00 共识）的标准作业流程：
 *   1. 安装插件 / 选数据源
 *   2. 采集数据（链接 / 批量 / 插件详情页）
 *   3. 数据入库 → 采集箱
 *   4. 管线分析 → 选品 / 竞品分析 / 标题优化
 *   5. 输出结论（选品报告 / 竞品分析 / 优化后标题）
 */
const steps: Step[] = [
  {
    n: 1,
    title: '安装插件或选择采集源',
    desc: '下载浏览器插件并安装，或使用链接直采、批量采集作为数据源。',
    icon: Download,
    button: { label: '下载插件', onClick: downloadExtensionZip },
  },
  {
    n: 2,
    title: '采集商品数据',
    desc: '插件：在 1688 / 淘宝详情页点击「采集当前页」。链接：粘贴商品链接直采。批量：榜单/搜索页批量入库。',
    icon: Globe,
    link: { label: '打开采集箱', to: '/app/inbox' },
  },
  {
    n: 3,
    title: '数据进入采集箱',
    desc: '插件/链接/批量采集的商品数据自动入库，可在采集箱查看、筛选与导出。',
    icon: Inbox,
    link: { label: '查看采集箱', to: '/app/inbox' },
  },
  {
    n: 4,
    title: '管线分析',
    desc: '后端按既定管线流程逐步执行：选品维度评估 → 标题规则优化 → 竞品信息抽取，得出结论。',
    icon: Sparkles,
    link: { label: '进入选品', to: '/app/insights' },
  },
  {
    n: 5,
    title: '输出结论',
    desc: '输出选品报告（值得推广候选）、优化后的上架标题、竞品分析结论，可导出或继续处理。',
    icon: FileText,
  },
];

export function WorkflowGuide({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'grid gap-2 sm:grid-cols-5' : 'grid gap-3 md:grid-cols-5'}>
      {steps.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.n}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-sm font-semibold text-[var(--color-primary)]">
                {s.n}
              </span>
              <Icon className="h-4 w-4 text-[var(--color-primary)]" />
            </div>
            <p className="mt-2 text-sm font-medium">{s.title}</p>
            {!compact ? <p className="mt-1 text-xs text-muted leading-relaxed">{s.desc}</p> : null}
            {s.link ? (
              <div className="mt-2">
                <Link to={s.link.to} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
                  {s.link.label} →
                </Link>
              </div>
            ) : null}
            {s.button ? (
              <div className="mt-2">
                <button
                  type="button"
                  className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                  onClick={s.button.onClick}
                >
                  {s.button.label} →
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}