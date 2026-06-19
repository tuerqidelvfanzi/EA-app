export type NavItem = { to: string; label: string; end?: boolean; badge?: string; icon?: string };

export type NavGroup = {
  title: string;
  icon: string;
  items: NavItem[];
};

/**
 * V4 菜单配置（V3.0 → V4 重设计）
 *
 * 核心三大功能（V3 保持）：
 *   1. 选品（plugin → 采集 → 管线分析 → 选品报告）
 *   2. 竞品分析（原商品 + 对比链接，单品画像 / 综合对比）
 *   3. 处理中心（V4 扩展：标题优化 + 采集箱编辑能力）
 *
 * 支撑功能：
 *   - Dashboard（V4 重设计：流程置顶 / 漏斗 KPI / AI 对话框）
 *   - 采集箱（V4 改造计划中）
 *   - 链接采集（V4 合并直采 + 批量 + AI 扩展 3 模式）
 *
 * 隐藏功能（路由保留）：
 *   - 批量采集（/app/batch-collect 已重定向到 /app/link-collect）
 *   - 工作台 / 发布 / 模板 / 规则 / 设置 / 主题 / 标题 V2 / 集成 / 团队
 *
 * 设计原则（V4）：
 *   - AI 原生：每页顶部对话框
 *   - 流水线化：采集 → 选品 → 改写 → 上架
 */
export const v3NavGroups: NavGroup[] = [
  {
    title: '工作台',
    icon: '🏠',
    items: [
      { to: '/app', label: '总览', end: true, icon: '🏠' },
    ],
  },
  {
    title: '选品中心',
    icon: '📊',
    items: [
      { to: '/app/insights', label: '选品', icon: '🎯' },
      { to: '/app/competitors', label: '竞品分析', icon: '🔍' },
    ],
  },
  {
    title: '采集中心',
    icon: '📦',
    items: [
      { to: '/app/inbox', label: '采集箱', icon: '📥' },
      { to: '/app/link-collect', label: '链接采集', icon: '🔗' },
    ],
  },
  {
    title: '处理中心',
    icon: '✏️',
    items: [
      { to: '/app/title-optimization', label: '标题优化', icon: '✏️' },
    ],
  },
  {
    title: '模板中心',
    icon: '🧩',
    items: [
      { to: '/app/templates', label: '选品模板', icon: '🎯' },
      { to: '/app/rewrite-templates', label: '改写模板', icon: '✍️' },
    ],
  },
];

/** 兼容旧版扁平菜单 */
export const v2NavItems: NavItem[] = v3NavGroups.flatMap(group => group.items);