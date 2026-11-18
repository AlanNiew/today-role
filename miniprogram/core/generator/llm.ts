import type {
  GenerationResult,
  MonthlyCard,
  MonthlyInsights,
  TodayFragment,
  WeeklySnapshot,
} from '../types';
import type {
  MonthlyCardInput,
  MonthlyInsightsInput,
  RoleGenerator,
  TodayFragmentInput,
  WeeklySnapshotInput,
} from './types';

const NOT_CONFIGURED =
  'LLMGenerator 尚未接入。请继续使用 rule 模式，或先实现服务端代理后再切换。';

/**
 * LLM 生成器占位。
 *
 * 接入约定：
 * 1. 只把结构化记录发给自有服务端，不在小程序端保存模型密钥；
 * 2. 返回结果仍要经过数据锚点与文案红线校验；
 * 3. 服务不可用时回退到 RuleBasedGenerator，保证每日记录主流程可用。
 */
export class LLMGenerator implements RoleGenerator {
  async generateTodayFragment(_input: TodayFragmentInput): Promise<TodayFragment> {
    throw new Error(NOT_CONFIGURED);
  }

  async generateWeeklySnapshot(_input: WeeklySnapshotInput): Promise<GenerationResult<WeeklySnapshot>> {
    throw new Error(NOT_CONFIGURED);
  }

  async generateMonthlyCard(_input: MonthlyCardInput): Promise<GenerationResult<MonthlyCard>> {
    throw new Error(NOT_CONFIGURED);
  }

  async buildMonthlyInsights(_input: MonthlyInsightsInput): Promise<MonthlyInsights> {
    throw new Error(NOT_CONFIGURED);
  }
}
