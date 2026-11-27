import { addDays, toDateKey, weekdayIndex } from './date';
import type { DailyEntry, Scene, Status } from './types';

interface DemoProfile {
  status: Status;
  scene: Scene;
  note?: string;
}

/**
 * 工作日：工作/学习 · 身体 · 人际；周末：独处 · 家庭。
 * 用周次奇偶轮换状态，覆盖 8 个状态；周三固定为最低点（低电量 / 麻木），
 * 便于验证「低点不在周初/周五」规则。
 */
function weekdayProfile(weekday: number, weekIndex: number): DemoProfile {
  const evenWeek = weekIndex % 2 === 0;
  switch (weekday) {
    case 1:
      return { status: evenWeek ? '紧绷' : '平稳', scene: '工作/学习', note: '会议排得比较满' };
    case 2:
      return { status: evenWeek ? '开心' : '平稳', scene: '身体', note: '晚上出去走了走' };
    case 3:
      // 刻意把一周低点放在周三，便于验证「低点不在周初/周五」规则
      return evenWeek
        ? { status: '低电量', scene: '工作/学习', note: '下午效率明显下降' }
        : { status: '麻木', scene: '工作/学习', note: '按流程走完的一天' };
    case 4:
      return evenWeek
        ? { status: '烦躁', scene: '人际', note: '沟通来回比较多' }
        : { status: '开心', scene: '人际', note: '和同事聊得挺顺' };
    case 5:
      return evenWeek
        ? { status: '兴奋', scene: '工作/学习', note: '收尾阶段状态不错' }
        : { status: '平稳', scene: '工作/学习' };
    case 6:
      return weekIndex % 3 === 0
        ? { status: '低落', scene: '独处', note: '一个人待着，缓一缓' }
        : { status: '兴奋', scene: '独处', note: '一个人待着，状态回了一点' };
    default:
      return weekIndex % 4 === 0
        ? { status: '开心', scene: '家庭', note: '和家人一起吃饭' }
        : { status: '平稳', scene: '家庭' };
  }
}

/**
 * 生成最近 45 天的演示记录（仅开发调试）。
 * 覆盖 8 个状态 × 5 个生活领域；周三刻意设为低点。
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
