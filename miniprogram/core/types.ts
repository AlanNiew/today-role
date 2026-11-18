/**
 * 领域类型：与任务书第 6 节的数据模型保持一致。
 * 这里只放纯数据定义，不依赖微信 API，便于 Node 单元测试。
 */

export const STATUSES = ['平稳', '紧绷', '低电量', '兴奋', '烦躁', '麻木'] as const;
export type Status = (typeof STATUSES)[number];

export const SCENES = ['工作', '关系', '独处', '身体', '家庭'] as const;
export type Scene = (typeof SCENES)[number];

export type Plan = 'free' | 'mock_pro';

export interface DailyEntry {
  id: string;
  userId: string;
  /** YYYY-MM-DD，本地时区 */
  date: string;
  status: Status;
  scene: Scene;
  /** 可选，最多 100 字；不参与生成文案 */
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Entitlement {
  userId: string;
  isPro: boolean;
  plan: Plan;
  expiresAt?: number;
}

export interface Pattern {
  title: string;
  /** 必须包含数据锚点（天数、日期、次数等） */
  description: string;
  isCounterIntuitive: boolean;
}

export interface WeeklySnapshot {
  id: string;
  userId: string;
  /** YYYY-MM-DD 周一，仅作为缓存键 */
  weekStart: string;
  patterns: Pattern[];
  generatedAt: number;
}

export interface SceneCount {
  scene: Scene;
  count: number;
}

export interface MonthlyCard {
  id: string;
  userId: string;
  /** YYYY-MM */
  month: string;
  statusDistribution: Record<Status, number>;
  topScenes: SceneCount[];
  /** 例外 / 张力，必须含数据锚点 */
  tension?: string;
  /** 轻量行动建议，必须含数据锚点 */
  actionSuggestion?: string;
  generatedAt: number;
}

export interface TodayFragment {
  date: string;
  label: string;
  explanation: string;
  dataAnchors: string[];
  generatedAt: number;
}

export type GenerationBlockCode = 'not-enough-data';

export interface GenerationBlocked {
  ok: false;
  code: GenerationBlockCode;
  scope: 'weekly' | 'monthly';
  recordedDays: number;
  requiredDays: number;
  message: string;
}

export type GenerationResult<T> = { ok: true; value: T } | GenerationBlocked;

export interface MonthComparison {
  available: boolean;
  previousMonth: string;
  previousRecordedDays: number;
  currentRecordedDays: number;
  summary: string;
  statusShift: string;
  sceneShift: string;
}

/** Pro 深度内容：只按需生成，不写入基础 MonthlyCard */
export interface MonthlyInsights {
  month: string;
  triggers: string[];
  coOccurrence: string;
  comparison: MonthComparison;
  actionPlan: string[];
  generatedAt: number;
}
