/** B 站采集箱内部状态（DB / API 不变） */
export type ProductStatus = 'raw' | 'processing' | 'ready' | 'published';

/**
 * 平台侧上架状态（BRD 扩展，UI 展示用）
 * 映射：raw→pending, processing→draft, ready→reviewing, published→live
 * @see docs/LISTING_PUBLISH_IMPLEMENTATION.md §3.1
 */
export type ListingStatus = 'pending' | 'draft' | 'reviewing' | 'live' | 'suspended';

export const PRODUCT_TO_LISTING_STATUS: Record<ProductStatus, ListingStatus> = {
  raw: 'pending',
  processing: 'draft',
  ready: 'reviewing',
  published: 'live',
};
export type TargetLocale = 'vi-VN' | 'th-TH' | 'id-ID' | 'fil-PH';

/**
 * BRD v1.1 §5.2 ProductImage
 */
export type ProductImage = {
  id?: string;
  url: string;
  type: 'main' | 'detail' | 'sku';
  sort?: number;
  hasWatermark?: boolean;
  priceTag?: boolean;
  sensitiveContent?: string[];
  status?: 'pending' | 'downloaded' | 'processed' | 'translated';
};

/**
 * BRD v1.1 §5.3 ProductSku（六段编码支持）
 * 印花后缀：B=白底黑花，H=黑底白花
 */
export type PrintVariant = 'B' | 'H';

export type ProductSku = {
  id?: string;
  name: string;
  color: string;
  colorCode?: string;
  size: string;
  price: number;
  stock: number;
  weight?: number;
  skuCode?: string;
  patternSuffix?: 'P' | 'R' | 'PR';
  /** 印花后缀：B=白底黑花，H=黑底白花 */
  printVariant?: PrintVariant;
  isDummyHook?: boolean;
};

/**
 * BRD v1.1 §5.4 ProcessedOutput
 */
export type ProcessedOutput = {
  exposure: { title: string; priceLabel: string; shortDescription?: string };
  conversion: { title: string; priceLabel: string; shortDescription?: string };
  selectedOutput?: 'exposure' | 'conversion';
  ranAt: string;
  promptNote?: string;
  templateId?: string;
  modelUsed?: string;
};

/**
 * BRD v1.1 §5.1 Product (核心字段完整版)
 */
export type Product = {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  priceCny: number;
  status: ProductStatus;
  category: string;
  categoryId?: string;
  thumb: string;
  targetLocale: TargetLocale;
  capturedAt?: string;
  fromExtension?: boolean;
  extractLayer?: string;
  extractMethod?: string;
  /** 图片列表 */
  images?: string[] | ProductImage[];
  /** SKU 变体列表 */
  skus?: ProductSku[];
  /** 是否有变体 */
  hasVariants?: boolean;
  skuCount?: number;
  imageCount?: number;
  /** 商品属性 */
  attributes?: Record<string, unknown>;
  rawCapture?: unknown;
  processed?: ProcessedOutput;
  pipelineNote?: string;
  /** 详细描述（存 attributes.description） */
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * BRD v1.1 §6 类目模板（完整版）
 */
export type CategoryTemplateId =
  | 'tpl-clothing-tshirt'
  | 'tpl-clothing-general'
  | 'tpl-kitchenware'
  | 'tpl-lighting'
  | 'tpl-beauty'
  | 'tpl-electronics'
  | 'tpl-home'
  | 'tpl-other';

/** 白色钩子配置（BRD §4.4） */
export type DummyHookConfig = {
  enabled: boolean;
  colorName: string;
  price: number;
  stock: number;
  weight: number;
};

/** SKU 配置（BRD §4.2 六段编码，支持印花后缀） */
export type SkuConfig = {
  prefix: string;
  sequenceStart: number;
  colors: string[];
  sizes: string[];
  sides: Array<'P' | 'R' | 'PR'>;
  /** 支持的印花后缀：B=白底黑花，H=黑底白花 */
  printVariants?: PrintVariant[];
  dummyHook: DummyHookConfig;
};

/** 类目模板完整配置 */
export type CategoryTemplateConfig = {
  id: CategoryTemplateId;
  name: string;
  category: string;
  skuConfig?: SkuConfig;
  priceMultiplier?: number;
  titleMaxChars?: number;
  defaultStock?: number;
};

export type TemplateItem = {
  id: string;
  name: string;
  status: 'active' | 'draft';
  note: string;
  language: string;
  promptBody?: string;
  /** SKU 配置（仅服装类模板） */
  skuConfig?: SkuConfig;
  /** 模板分类 ID */
  categoryId?: CategoryTemplateId;
};

export type RuleItem = {
  id?: string;
  name: string;
  expr: string;
  group: 'pricing' | 'title' | 'safety' | 'translation';
};

/** 发布任务状态：现有 API 三态 + BRD 扩展 draft/filling/cancelled */
export type PublishTaskStatus =
  | 'draft'
  | 'pending'
  | 'filling'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** 物流配置默认值 */
export type LogisticsConfig = {
  shippingWeight: number;
  deliveryDays: number;
  freeReturn: boolean;
  /** 包裹尺寸（cm）：长×宽×高，菲律宾固定 10-5-10 */
  packageDimensions?: PackageDimensions;
};

export type PackageDimensions = {
  length: number;
  width: number;
  height: number;
};

/** 各市场包裹尺寸默认值（需求文档：上品实操PPT） */
export const DEFAULT_PACKAGE_DIMENSIONS: Record<TargetLocale, PackageDimensions> = {
  'vi-VN': { length: 10, width: 5, height: 10 },
  'th-TH': { length: 10, width: 5, height: 10 },
  'id-ID': { length: 10, width: 5, height: 10 },
  'fil-PH': { length: 10, width: 5, height: 10 },
};

export const LOGISTICS_DEFAULTS: LogisticsConfig = {
  shippingWeight: 220,
  deliveryDays: 3,
  freeReturn: true,
};

/**
 * BRD v1.1 §5.3 完整 SKU 填表数据
 */
export type PublishSku = {
  skuCode: string;
  color: string;
  size: string;
  price: number;
  stock: number;
  weight?: number;
  isDummyHook?: boolean;
};

/**
 * 发布填表 Payload（完整版）
 */
export type PublishFillPayload = {
  platform: 'tiktok' | 'taobao' | 'shopee';
  title: string;
  price: number;
  currency: string;
  stock: number;
  weightGrams: number;
  brand: string;
  /** SKU 变体列表（BRD §5.3） */
  skus?: PublishSku[];
  /** 物流配置 */
  logistics?: LogisticsConfig;
  /** 简要描述 */
  shortDescription?: string;
  /** 详细描述 */
  description?: string;
  /** 主图 URLs */
  imageUrls?: string[];
};

export type PublishTask = {
  id: string;
  platform: 'Shopee' | 'TikTok Shop' | '淘宝';
  title: string;
  /** 兼容现有 API；完整流转见 LISTING_PUBLISH_IMPLEMENTATION.md */
  status: PublishTaskStatus | 'pending' | 'completed' | 'failed';
  reason?: string;
  productId?: string;
  fillPayload?: PublishFillPayload;
  validation?: {
    ok: boolean;
    issues: string[];
    antiBan?: { ok: boolean; issues: string[] };
    title?: { ok: boolean; issues: string[] };
  };
  fillInstructions?: string;
  retryCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type PreparePublishResult = {
  taskId: string;
  ok: boolean;
  validation: PublishTask['validation'];
  fillPayload: PublishFillPayload;
  fillInstructions?: string;
};

export type ImageJob = {
  id: string;
  productId: string;
  operations: Array<'dedupe_watermark' | 'upscale' | 'model_tryon' | 'translate_overlay'>;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  resultUrls?: string[];
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type DashboardMetrics = {
  totalProducts: number;
  rawCount: number;
  processingCount: number;
  readyCount: number;
  publishedCount: number;
};

/**
 * 选品洞察 - 竞品数据
 */
export type CompetitorProduct = {
  id: string;
  title: string;
  thumbnail: string;
  gmv: number; // 周GMV (USD)
  ctr: number; // 点击率 %
  sameProductCount: number; // 同款商品数
  comments: number; // 评论数
  dailyOrders: number; // 日均订单
  price: number; // 价格 (CNY)
  source: 'tiktok' | 'shopee';
  trend: 'up' | 'stable' | 'down';
};

/**
 * 选品洞察 - 转化率数据
 */
export type ConversionData = {
  date: string;
  orders: number;
  views: number;
  conversionRate: number;
  newComments: number;
};

/**
 * 选品洞察 - 毛利分析
 */
export type ProfitMargin = {
  costPrice: number; // 成本价 (CNY)
  sellPrice: number; // 售价 (VND/THB)
  currency: 'VND' | 'THB';
  profit: number; // 利润 (CNY)
  margin: number; // 利润率 %
};

/**
 * 选品洞察 - GMV/CTR 筛选配置
 */
export type GmvCtrFilter = {
  minGmv: number; // 最低周GMV (USD)
  minCtr: number; // 最低点击率 %
  maxSameProduct: number; // 最大同款数
  platform: 'tiktok' | 'shopee' | 'all';
};

/**
 * 选品洞察状态 (扩展版)
 */
export type InsightState = {
  id?: string;
  status: 'idle' | 'analyzing' | 'done' | 'error';
  keywords: Array<{ keyword: string; score: number; trend?: 'up' | 'down' | 'stable' }>;
  topFeatures: string[];
  // 新增字段
  competitors?: CompetitorProduct[];
  gmvFilter?: GmvCtrFilter;
  conversionTrend?: ConversionData[];
  profitMargins?: ProfitMargin[];
  lastAnalysisTime?: string;
  analyzedCount?: number;
  updatedAt?: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; username: string };
};

export type BatchCollectJob = {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'paused';
  listUrl: string;
  maxItems: number;
  delayMsMin: number;
  delayMsMax: number;
  useCookies: boolean;
  itemsDone: number;
  itemsFailed: number;
  results: Array<{ url: string; ok: boolean; productId?: string; error?: string }>;
  auditLog: Array<Record<string, unknown>>;
  error?: string | null;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
};

export type CookieJarInfo = {
  domain: string;
  updatedAt: string;
  consentAt: string;
};

export type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T;
};

// ============================================================================
// V4 新增：改写模板（RewriteTemplate）
// ----------------------------------------------------------------------------
// 与 SelectionTemplate（选品模板）并列，对应 V2 原始 CategoryTemplate 设计
// 用于「改写」阶段（选品后→上架前），由「国家×平台×品类」3 维定位
// 模板 = 规则源（system prompt），AI + 模板 = 管线
// ============================================================================

export type RewriteStrategy = 'exposure' | 'conversion';

/** 单条改写策略 prompt（高曝光 / 高转化） */
export type RewriteStrategyPrompt = {
  id: RewriteStrategy;
  label: string;
  /** 给 LLM 的具体指令（与 system_prompt 一起使用） */
  prompt: string;
};

/** 定价规则 */
export type PricingRules = {
  /** 定价倍率：CNY × 系数（越南 3.5 / 泰国 2.5 / 印尼 3.5） */
  multiplier: number;
  /** 货币（VND / THB / IDR / PHP） */
  currency: string;
  /** 库存默认（如 50） */
  defaultStock: number;
  /** 重量默认（克，220g） */
  defaultWeight: number;
};

/** 标题规则 */
export type TitleRules = {
  /** 标题字数上限（越南 ≤20 / 泰国 ≤220） */
  maxChars: number;
  /** 必含词（如「纯棉」），AI 必须保留 */
  mustInclude?: string[];
  /** 必删词（如「爆款」），AI 必须删除 */
  mustExclude?: string[];
};

/** 图片规则 */
export type ImageRules = {
  /** 主图数量（越南 9 张 / 泰国 ≥5 张） */
  mainCount: number;
  /** 图片比例（1:1 / 3:4 / 9:16） */
  aspectRatio: '1:1' | '3:4' | '9:16' | '4:3';
  /** 是否需要去水印 */
  removeWatermark: boolean;
  /** 是否需要翻译覆盖（图片上的中文翻译为目标语言） */
  translateOverlay: boolean;
};

/** 改写步骤（与 V2 越南 Shopee 13 步对应） */
export type RewriteStep = {
  /** 步骤顺序（1-based） */
  order: number;
  /** 步骤标题 */
  title: string;
  /** 步骤详细描述（可包含 LLM 指令） */
  description: string;
  /** 是否由 LLM 处理（false = 规则引擎） */
  llmPowered: boolean;
};

/** 改写模板（核心数据模型） */
export type RewriteTemplate = {
  /** 唯一 ID，命名空间 `t-rw-{country}-{platform}-{category}` */
  id: string;
  /** 模板名（用户可读） */
  name: string;
  /** 国家 */
  country: string;
  /** 平台（Shopee / Lazada / TikTok Shop / Mercado Livre / 淘宝 / 拼多多 / 京东 / 1688） */
  platform: string;
  /** 品类（童装 / 女装 / T恤 / 3C 数码 / 灯具 / ...） */
  category: string;
  /** 是否当前激活（用户可在多个同组模板间切换） */
  active: boolean;
  /** 目标 locale（如 vi-VN / th-TH） */
  targetLocale: TargetLocale;
  /** 改写类别模式：A=多规格服装 / B=中规格产品 / C=少规格定制 */
  categoryMode: 'A' | 'B' | 'C';

  /** System Prompt（注入 LLM 调用的角色指令） */
  systemPrompt: string;

  /** 定价规则 */
  pricing: PricingRules;
  /** 标题规则 */
  title: TitleRules;
  /** 图片规则 */
  image: ImageRules;
  /** SKU 段数（品类 A/B/C 模式决定） */
  skuSegments: string[];

  /** 双策略 prompt（高曝光 / 高转化） */
  strategyPrompts: RewriteStrategyPrompt[];

  /** 改写步骤（顺序执行；llmPowered=true 的步骤会调 LLM） */
  steps: RewriteStep[];

  /** 备注 */
  note?: string;
  /** 最后更新时间 */
  updatedAt?: string;
};

/** 改写模板的 6 个示例（覆盖 6 国/平台组合，3 个品类模式） */
export const REWRITE_TEMPLATE_EXAMPLES: RewriteTemplate[] = [
  {
    id: 't-rw-vn-shopee-kids',
    name: '越南 · Shopee · 童装（品类 A 多规格）',
    country: '越南',
    platform: 'Shopee',
    category: '童装',
    active: true,
    targetLocale: 'vi-VN',
    categoryMode: 'A',
    systemPrompt: `你是东南亚电商童装上品专家。
品类特征：颜色×尺码矩阵、SKU 数量多、白色钩子处理。
越南 Shopee 规则：标题≤20 字符、汉字压缩到 9 字、价格×3.5、库存 50。
输出：越南语 20 字标题、SKU 列表、违禁词警告。`,
    pricing: { multiplier: 3.5, currency: 'VND', defaultStock: 50, defaultWeight: 220 },
    title: { maxChars: 20, mustInclude: ['100% cotton'], mustExclude: ['爆款', '厂家直销'] },
    image: { mainCount: 9, aspectRatio: '1:1', removeWatermark: true, translateOverlay: true },
    skuSegments: ['颜色', '尺码', '套装'],
    strategyPrompts: [
      {
        id: 'exposure',
        label: '高曝光',
        prompt: '生成高曝光标题：突出视觉冲击（颜色/图案/季节），多用本地热搜词，控制在 20 字内。',
      },
      {
        id: 'conversion',
        label: '高转化',
        prompt: '生成高转化标题：突出卖点（面料/认证/亲子场景），强调功能性，控制在 20 字内。',
      },
    ],
    steps: [
      { order: 1, title: '从源站抓取商品 + 图片 + SKU', description: '采集商品主图、详情图、SKU 价格、规格', llmPowered: false },
      { order: 2, title: '越南语翻译（标题 + 描述 + SKU）', description: '使用 LLM 将中文翻译为越南语，符合本地表达', llmPowered: true },
      { order: 3, title: '替换为本地模特图 / 场景图', description: '按 imageRules 重新生成/合成场景图', llmPowered: true },
      { order: 4, title: '价格换算 VND + 加价 1.4x', description: 'CNY × 3.5 × 1.4 校准', llmPowered: false },
      { order: 5, title: '标题 SEO 优化（越南热搜词）', description: '策略 1：高曝光 / 策略 2：高转化', llmPowered: true },
      { order: 6, title: '生成 SKU 矩阵（颜色 × 尺码）', description: '笛卡尔积 + 五段编码', llmPowered: false },
      { order: 7, title: '尺码表翻译 + 本地化', description: '身高/胸围/袖长表翻译', llmPowered: true },
      { order: 8, title: '物流方式配置（Shopee Xpress）', description: '220g / 10×5×10cm', llmPowered: false },
      { order: 9, title: '类目映射到 Shopee 越南童装', description: '本地类目 ID 映射', llmPowered: false },
      { order: 10, title: '运费模板设置', description: 'Shopee 越南标准运费', llmPowered: false },
      { order: 11, title: '优惠券 + 促销配置', description: '首单优惠 + 满减', llmPowered: false },
      { order: 12, title: '图片水印 + Logo', description: '按品牌要求添加水印', llmPowered: false },
      { order: 13, title: '写入 Shopee 越南站草稿箱', description: '生成填表 payload', llmPowered: false },
    ],
    note: '最完整的改写模板示例，覆盖 A 模式（多规格服装）。',
    updatedAt: '2026-06-19',
  },
  {
    id: 't-rw-th-lazada-lighting',
    name: '泰国 · Lazada · 灯具（品类 B 中规格）',
    country: '泰国',
    platform: 'Lazada',
    category: '灯具',
    active: false,
    targetLocale: 'th-TH',
    categoryMode: 'B',
    systemPrompt: `你是东南亚灯具上品专家。
品类特征：功率/色温/控制方式 等多配置变体。
泰国 Lazada 规则：标题≤220 字符、价格×2.5、主图≥5 张。`,
    pricing: { multiplier: 2.5, currency: 'THB', defaultStock: 30, defaultWeight: 800 },
    title: { maxChars: 220, mustInclude: ['LED'], mustExclude: ['厂家直销', '工厂直发'] },
    image: { mainCount: 5, aspectRatio: '1:1', removeWatermark: false, translateOverlay: true },
    skuSegments: ['颜色', '瓦数'],
    strategyPrompts: [
      { id: 'exposure', label: '高曝光', prompt: '突出场景（卧室/客厅/办公），用「LED」「节能」等热搜词。' },
      { id: 'conversion', label: '高转化', prompt: '突出规格（瓦数/色温/显色指数），强调质保。' },
    ],
    steps: [
      { order: 1, title: '抓取商品', description: '采集灯具规格', llmPowered: false },
      { order: 2, title: '泰语翻译', description: '使用 LLM 翻译', llmPowered: true },
      { order: 3, title: 'BRL/THB 换算 + 关税预估', description: '价格计算', llmPowered: false },
      { order: 4, title: '功率/色温参数补全', description: '缺失规格补充', llmPowered: true },
      { order: 5, title: '标题 SEO 优化', description: '双策略', llmPowered: true },
      { order: 6, title: '写入 Lazada 草稿箱', description: '填表', llmPowered: false },
    ],
    updatedAt: '2026-06-19',
  },
  {
    id: 't-rw-cn-taobao-tshirt',
    name: '中国 · 淘宝 · T恤（品类 A 简化版）',
    country: '中国',
    platform: '淘宝',
    category: 'T恤',
    active: false,
    targetLocale: 'id-ID', // 仅占位
    categoryMode: 'A',
    systemPrompt: `你是淘宝站内 T 恤上品专家。
规则：标题 SEO 优化、SKU 矩阵、淘宝搜索词嵌入。`,
    pricing: { multiplier: 1.0, currency: 'CNY', defaultStock: 100, defaultWeight: 200 },
    title: { maxChars: 30, mustExclude: ['爆款', '厂家直销'] },
    image: { mainCount: 5, aspectRatio: '1:1', removeWatermark: false, translateOverlay: false },
    skuSegments: ['颜色', '尺码'],
    strategyPrompts: [
      { id: 'exposure', label: '高曝光', prompt: '突出热搜词（夏季/新款/纯棉/宽松）。' },
      { id: 'conversion', label: '高转化', prompt: '突出卖点（克重/版型/不褪色）。' },
    ],
    steps: [
      { order: 1, title: '抓取', description: '从源商品拉数据', llmPowered: false },
      { order: 2, title: '标题 SEO（淘宝搜索词）', description: '双策略', llmPowered: true },
      { order: 3, title: 'SKU 矩阵', description: '颜色×尺码', llmPowered: false },
      { order: 4, title: '写入淘宝草稿箱', description: '填表', llmPowered: false },
    ],
    updatedAt: '2026-06-19',
  },
  {
    id: 't-rw-cn-pdd-kids',
    name: '中国 · 拼多多 · 童装（品类 A）',
    country: '中国',
    platform: '拼多多',
    category: '童装',
    active: false,
    targetLocale: 'id-ID',
    categoryMode: 'A',
    systemPrompt: `拼多多童装上品专家。规则：价格优势对比、SKU 简化、爆款标题。`,
    pricing: { multiplier: 1.0, currency: 'CNY', defaultStock: 80, defaultWeight: 200 },
    title: { maxChars: 30, mustInclude: ['纯棉'], mustExclude: ['爆款'] },
    image: { mainCount: 5, aspectRatio: '1:1', removeWatermark: false, translateOverlay: false },
    skuSegments: ['颜色', '尺码'],
    strategyPrompts: [
      { id: 'exposure', label: '高曝光', prompt: '突出价格优势 + 关键词密度。' },
      { id: 'conversion', label: '高转化', prompt: '突出面料 + 亲子场景。' },
    ],
    steps: [
      { order: 1, title: '抓取', description: '从源商品拉数据', llmPowered: false },
      { order: 2, title: '价格对比（淘宝）', description: '对比同款淘宝价', llmPowered: false },
      { order: 3, title: 'SKU 矩阵', description: '颜色×尺码', llmPowered: false },
      { order: 4, title: '写入拼多多草稿箱', description: '填表', llmPowered: false },
    ],
    updatedAt: '2026-06-19',
  },
  {
    id: 't-rw-cn-jd-lamp',
    name: '中国 · 京东 · 灯具（品类 B 简化版）',
    country: '中国',
    platform: '京东',
    category: '灯具',
    active: false,
    targetLocale: 'id-ID',
    categoryMode: 'B',
    systemPrompt: `京东灯具上品专家。规则：3C 认证、保修文案、规格表清晰。`,
    pricing: { multiplier: 1.0, currency: 'CNY', defaultStock: 50, defaultWeight: 600 },
    title: { maxChars: 60, mustInclude: ['LED', '节能'] },
    image: { mainCount: 6, aspectRatio: '1:1', removeWatermark: false, translateOverlay: false },
    skuSegments: ['颜色', '瓦数'],
    strategyPrompts: [
      { id: 'exposure', label: '高曝光', prompt: '突出场景（家用/办公/户外）。' },
      { id: 'conversion', label: '高转化', prompt: '突出 3C 认证 + 质保。' },
    ],
    steps: [
      { order: 1, title: '抓取', description: '采集', llmPowered: false },
      { order: 2, title: '京东 SKU 规则匹配', description: '京东类目映射', llmPowered: false },
      { order: 3, title: '功率参数补全', description: '瓦数/色温/流明', llmPowered: true },
      { order: 4, title: '写入京东草稿箱', description: '填表', llmPowered: false },
    ],
    updatedAt: '2026-06-19',
  },
  {
    id: 't-rw-br-ml-3c',
    name: '巴西 · Mercado Livre · 3C 数码（品类 C 少规格）',
    country: '巴西',
    platform: 'Mercado Livre',
    category: '3C 数码',
    active: false,
    targetLocale: 'id-ID',
    categoryMode: 'C',
    systemPrompt: `巴西 3C 数码上品专家。
品类特征：型号×颜色×容量 组合少，但规格参数复杂。
Mercado Livre 规则：ANATEL 认证必填、葡语翻译、保修政策。`,
    pricing: { multiplier: 1.0, currency: 'BRL', defaultStock: 30, defaultWeight: 500 },
    title: { maxChars: 60, mustInclude: ['original', 'garantia'] },
    image: { mainCount: 6, aspectRatio: '1:1', removeWatermark: true, translateOverlay: true },
    skuSegments: ['型号', '颜色', '容量'],
    strategyPrompts: [
      { id: 'exposure', label: '高曝光', prompt: '突出品牌 + 型号 + 葡语热搜词。' },
      { id: 'conversion', label: '高转化', prompt: '突出 ANATEL 认证 + 保修期。' },
    ],
    steps: [
      { order: 1, title: '抓取商品', description: '采集 3C 商品', llmPowered: false },
      { order: 2, title: '葡语翻译', description: 'LLM 翻译', llmPowered: true },
      { order: 3, title: 'BRL 换算 + 关税预估', description: '价格计算', llmPowered: false },
      { order: 4, title: '认证信息核对', description: 'ANATEL 认证号', llmPowered: false },
      { order: 5, title: '保修文案', description: '12/24 月保修', llmPowered: true },
      { order: 6, title: '写入草稿箱', description: '填表', llmPowered: false },
    ],
    updatedAt: '2026-06-19',
  },
];

