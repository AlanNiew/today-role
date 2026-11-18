import type { DailyEntry, Scene, Status } from '../miniprogram/core/types';

let sequence = 0;

export function entry(
  date: string,
  status: Status,
  scene: Scene,
  note?: string,
  userId = 'u_test',
): DailyEntry {
  sequence += 1;
  return {
    id: `${userId}:${date}`,
    userId,
    date,
    status,
    scene,
    note,
    createdAt: 1_700_000_000_000 + sequence,
    updatedAt: 1_700_000_000_000 + sequence,
  };
}

/** 诊断 / 人格定性 / 医疗建议类词汇，生成文案里一个都不能出现 */
export const BANNED_COPY = /抑郁|焦虑|诊断|治疗|人格|障碍|症|药|病|你就是|你属于/;

export function assertHasNumber(label: string, value: string): void {
  if (!/\d/.test(value)) {
    throw new Error(`${label} 缺少数据锚点：${value}`);
  }
}
