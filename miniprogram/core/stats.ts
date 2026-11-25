import {
  SCENES,
  STATUSES,
  type DailyEntry,
  type Scene,
  type SceneCount,
  type Status,
} from './types';
import { addDays, parseDateKey, toDateKey, weekdayIndex, WEEKDAY_LABELS } from './date';

/** 校验未知来源的值是否为已知状态（存储读取 / 事件 data 传入时用）。 */
export function isKnownStatus(value: unknown): value is Status {
  return (STATUSES as readonly unknown[]).includes(value);
}

/** 校验未知来源的值是否为已知场景。 */
export function isKnownScene(value: unknown): value is Scene {
  return (SCENES as readonly unknown[]).includes(value);
}

/**
 * 仅用于「找模式 / 排序」的参考值，不是心理量表。
 * 兴奋 5 → 麻木 0。
 */
export const STATUS_SCORE: Record<Status, number> = {
  兴奋: 5,
  平稳: 4,
  紧绷: 3,
  烦躁: 2,
  低电量: 1,
  麻木: 0,
};

export function statusScore(status: Status): number {
  return STATUS_SCORE[status];
}

export function sortByDate(entries: DailyEntry[]): DailyEntry[] {
  return [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** 闭区间过滤：startKey <= date <= endKey */
export function filterByRange(
  entries: DailyEntry[],
  startKey: string,
  endKey: string,
): DailyEntry[] {
  return sortByDate(entries.filter((entry) => entry.date >= startKey && entry.date <= endKey));
}

export function filterByMonth(entries: DailyEntry[], month: string): DailyEntry[] {
  return sortByDate(entries.filter((entry) => entry.date.slice(0, 7) === month));
}

/** 最近 N 天（含今天） */
export function recentEntries(entries: DailyEntry[], today: Date, days: number): DailyEntry[] {
  const end = toDateKey(today);
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  startDate.setDate(startDate.getDate() - (days - 1));
  return filterByRange(entries, toDateKey(startDate), end);
}

export function uniqueRecordedDays(entries: DailyEntry[]): string[] {
  return Array.from(new Set(entries.map((entry) => entry.date))).sort();
}

/**
 * 连续记录天数（streak）。
 *
 * 以「今天」为起点往回数；若今天还没记录，则从昨天开始数（当天尚未记录时
 * 不把连续记录清零）。中断一天即停止；没有可用记录时返回 0。
 */
export function currentStreak(entries: DailyEntry[], today: Date): number {
  if (entries.length === 0) {
    return 0;
  }
  const recorded = new Set(uniqueRecordedDays(entries));
  let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!recorded.has(toDateKey(cursor))) {
    cursor = addDays(cursor, -1);
  }
  let streak = 0;
  while (recorded.has(toDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function countByStatus(entries: DailyEntry[]): Record<Status, number> {
  const result = {} as Record<Status, number>;
  for (const status of STATUSES) {
    result[status] = 0;
  }
  for (const entry of entries) {
    result[entry.status] += 1;
  }
  return result;
}

export function countByScene(entries: DailyEntry[]): Record<Scene, number> {
  const result = {} as Record<Scene, number>;
  for (const scene of SCENES) {
    result[scene] = 0;
  }
  for (const entry of entries) {
    result[entry.scene] += 1;
  }
  return result;
}

export function topScenes(entries: DailyEntry[], limit = 2): SceneCount[] {
  const counts = countByScene(entries);
  return SCENES.map((scene, index) => ({ scene, count: counts[scene], index }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .slice(0, limit)
    .map(({ scene, count }) => ({ scene, count }));
}

export function averageStatusScore(entries: DailyEntry[]): number | null {
  if (entries.length === 0) {
    return null;
  }
  const total = entries.reduce((sum, entry) => sum + statusScore(entry.status), 0);
  return total / entries.length;
}

export function comboCount(entries: DailyEntry[], status: Status, scene: Scene): number {
  return entries.filter((entry) => entry.status === status && entry.scene === scene).length;
}

export interface ComboCount {
  status: Status;
  scene: Scene;
  count: number;
}

export function comboCounts(entries: DailyEntry[]): ComboCount[] {
  const map = new Map<string, ComboCount>();
  for (const entry of entries) {
    const key = `${entry.status}|${entry.scene}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { status: entry.status, scene: entry.scene, count: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export function dominantStatus(entries: DailyEntry[]): { status: Status; count: number } | null {
  if (entries.length === 0) {
    return null;
  }
  const counts = countByStatus(entries);
  let best: Status = STATUSES[0];
  for (const status of STATUSES) {
    if (counts[status] > counts[best]) {
      best = status;
    }
  }
  return { status: best, count: counts[best] };
}

export interface WeekdayStat {
  /** 1 = 周一 … 7 = 周日 */
  weekday: number;
  count: number;
  average: number;
}

export function weekdayStats(entries: DailyEntry[]): WeekdayStat[] {
  const buckets = new Map<number, DailyEntry[]>();
  for (const entry of entries) {
    const index = weekdayIndex(parseDateKey(entry.date));
    const list = buckets.get(index) ?? [];
    list.push(entry);
    buckets.set(index, list);
  }
  return Array.from(buckets.entries())
    .map(([weekday, list]) => ({
      weekday,
      count: list.length,
      average: averageStatusScore(list) ?? 0,
    }))
    .sort((a, b) => a.weekday - b.weekday);
}

export interface SceneStat {
  scene: Scene;
  count: number;
  average: number;
  min: number;
  max: number;
}

export function sceneStats(entries: DailyEntry[]): SceneStat[] {
  const buckets = new Map<Scene, DailyEntry[]>();
  for (const entry of entries) {
    const list = buckets.get(entry.scene) ?? [];
    list.push(entry);
    buckets.set(entry.scene, list);
  }
  return Array.from(buckets.entries()).map(([scene, list]) => {
    const scores = list.map((entry) => statusScore(entry.status));
    return {
      scene,
      count: list.length,
      average: scores.reduce((sum, value) => sum + value, 0) / scores.length,
      min: Math.min(...scores),
      max: Math.max(...scores),
    };
  });
}

/** 连续自然日内「低状态」（参考值 <= threshold）的最长天数 */
export function maxConsecutiveLowDays(entries: DailyEntry[], threshold = 2): number {
  const byDate = new Map<string, DailyEntry>();
  for (const entry of entries) {
    byDate.set(entry.date, entry);
  }
  const dates = Array.from(byDate.keys()).sort();
  let best = 0;
  let current = 0;
  let previous: Date | null = null;
  for (const dateKey of dates) {
    const entry = byDate.get(dateKey);
    if (!entry || statusScore(entry.status) > threshold) {
      current = 0;
      previous = parseDateKey(dateKey);
      continue;
    }
    const date = parseDateKey(dateKey);
    if (previous) {
      const expected = new Date(previous.getFullYear(), previous.getMonth(), previous.getDate());
      expected.setDate(expected.getDate() + 1);
      current = toDateKey(expected) === dateKey ? current + 1 : 1;
    } else {
      current = 1;
    }
    best = Math.max(best, current);
    previous = date;
  }
  return best;
}

export function percent(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function weekdayName(weekday: number): string {
  return WEEKDAY_LABELS[weekday - 1] ?? '';
}
