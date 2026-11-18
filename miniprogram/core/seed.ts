import { addDays, toDateKey, weekdayIndex } from './date';
import type { DailyEntry, Scene, Status } from './types';

interface DemoProfile {
  status: Status;
  scene: Scene;
  note?: string;
}

function weekdayProfile(weekday: number, weekIndex: number): DemoProfile {
  switch (weekday) {
    case 1:
      return { status: '紧绷', scene: '工作', note: '会议排得比较满' };
    case 2:
      return { status: '平稳', scene: '工作' };
    case 3:
      // 刻意把一周低点放在周三，便于验证「低点不在周初/周五」规则
      return { status: '低电量', scene: '工作', note: '下午效率明显下降' };
    case 4:
      return { status: '烦躁', scene: '工作' };
    case 5:
      return { status: '平稳', scene: '工作' };
    case 6:
      return weekIndex % 2 === 0
        ? { status: '兴奋', scene: '独处', note: '一个人待着，状态回了一点' }
        : { status: '平稳', scene: '独处' };
    default:
      return weekIndex % 3 === 0
        ? { status: '低电量', scene: '身体', note: '睡得不太够' }
        : { status: '平稳', scene: '家庭' };
  }
}

/**
 * 生成最近 45 天的演示记录（仅开发调试）。
 * 规律：工作日多为「工作 × 紧绷/烦躁」，周三刻意设为低点，周末回到独处/家庭。
 * 不写入权益状态；调用方负责覆盖记录前二次确认。
 */
export function buildDemoEntries(userId: string, today: Date): DailyEntry[] {
  const entries: DailyEntry[] = [];
  for (let offset = 44; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset);
    const dateKey = toDateKey(date);
    const weekday = weekdayIndex(date);
    const weekIndex = Math.floor(offset / 7);
    const profile = weekdayProfile(weekday, weekIndex);
    const timestamp = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      20,
      0,
      0,
    ).getTime();
    entries.push({
      id: `${userId}:${dateKey}`,
      userId,
      date: dateKey,
      status: profile.status,
      scene: profile.scene,
      note: profile.note,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
  return entries;
}
