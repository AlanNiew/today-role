import type {
  DailyEntry,
  GenerationResult,
  MonthlyCard,
  MonthlyInsights,
  TodayFragment,
  WeeklySnapshot,
} from '../types';

export interface TodayFragmentInput {
  entry: DailyEntry;
  /** 全部记录，生成器自行截取最近 7 天 */
  entries: DailyEntry[];
  now?: number;
}

export interface WeeklySnapshotInput {
  entries: DailyEntry[];
  today: Date;
  userId: string;
  now?: number;
}

export interface MonthlyCardInput {
  entries: DailyEntry[];
  month: string;
  today: Date;
  userId: string;
  now?: number;
}

export interface MonthlyInsightsInput {
  entries: DailyEntry[];
  card: MonthlyCard;
  month: string;
  today: Date;
  now?: number;
}

/**
 * 所有生成文案的唯一出口。
 * MVP 用 RuleBasedGenerator；未来换 LLM 时页面与门控逻辑不变。
 */
export interface RoleGenerator {
  generateTodayFragment(input: TodayFragmentInput): Promise<TodayFragment>;
  generateWeeklySnapshot(input: WeeklySnapshotInput): Promise<GenerationResult<WeeklySnapshot>>;
  generateMonthlyCard(input: MonthlyCardInput): Promise<GenerationResult<MonthlyCard>>;
  /** Pro 专属深度内容，按需生成，不写入基础月卡 */
  buildMonthlyInsights(input: MonthlyInsightsInput): Promise<MonthlyInsights>;
}
