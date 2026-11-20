import {
  addDays,
  formatMonthDay,
  parseDateKey,
  startOfWeekMonday,
  toDateKey,
  weekdayLabel,
} from '../../core/date';
import { percent, recentEntries, uniqueRecordedDays } from '../../core/stats';
import type { Pattern } from '../../core/types';

interface WeekDot {
  date: string;
  label: string;
  recorded: boolean;
  isToday: boolean;
}

function buildWeekDots(entries: { date: string }[], todayKey: string): WeekDot[] {
  const today = parseDateKey(todayKey);
  const recorded = new Set(entries.map((entry) => entry.date));
  const dots: WeekDot[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset);
    const dateKey = toDateKey(date);
    dots.push({
      date: dateKey,
      label: weekdayLabel(date).replace('周', ''),
      recorded: recorded.has(dateKey),
      isToday: dateKey === todayKey,
    });
  }
  return dots;
}

Page({
  data: {
    loading: true,
    blocked: false,
    error: '',
    recordedDays: 0,
    requiredDays: 3,
    progress: 0,
    message: '',
    patterns: [] as Pattern[],
    counterCount: 0,
    rangeLabel: '',
    weekDots: [] as WeekDot[],
  },

  async onShow() {
    this.setData({
      loading: true,
      blocked: false,
      error: '',
      patterns: [],
      counterCount: 0,
      recordedDays: 0,
      progress: 0,
      message: '',
      weekDots: [],
    });
    try {
      const app = getApp<IAppOption>();
      const repository = app.globalData.repository;
      const today = new Date();
      const todayKey = toDateKey(today);
      const todayDate = parseDateKey(todayKey);
      const userId = await repository.getUserId();
      const entries = await repository.listEntries();
      const weekDots = buildWeekDots(entries, todayKey);
      const recordedDays = uniqueRecordedDays(recentEntries(entries, today, 7)).length;
      const rangeLabel = `${formatMonthDay(toDateKey(addDays(todayDate, -6)))} — ${formatMonthDay(todayKey)}`;

      // 优先复用「今天生成且此后没有新记录」的缓存快照，避免每次进入页面都重算。
      // 演示数据 / 清空会整体清理周缓存，这里一定能感知并重新生成。
      const weekStart = toDateKey(startOfWeekMonday(todayDate));
      const cached = await repository.getWeeklySnapshot(weekStart);
      const latestUpdate = entries.reduce((max, entry) => Math.max(max, entry.updatedAt), 0);
      if (
        cached &&
        toDateKey(new Date(cached.generatedAt)) === todayKey &&
        cached.generatedAt >= latestUpdate
      ) {
        this.setData({
          loading: false,
          blocked: false,
          recordedDays,
          patterns: cached.patterns,
          counterCount: cached.patterns.filter((pattern) => pattern.isCounterIntuitive).length,
          rangeLabel,
          weekDots,
        });
        return;
      }

      const result = await app.globalData.generator.generateWeeklySnapshot({
        entries,
        today,
        userId,
      });

      if (!result.ok) {
        this.setData({
          loading: false,
          blocked: true,
          recordedDays: result.recordedDays,
          requiredDays: result.requiredDays,
          progress: percent(result.recordedDays, result.requiredDays),
          message: result.message,
          rangeLabel,
          weekDots,
        });
        return;
      }

      await repository.saveWeeklySnapshot(result.value);
      this.setData({
        loading: false,
        blocked: false,
        recordedDays,
        patterns: result.value.patterns,
        counterCount: result.value.patterns.filter((pattern) => pattern.isCounterIntuitive).length,
        rangeLabel,
        weekDots,
      });
    } catch (error) {
      console.error('生成周快照失败', error);
      this.setData({ loading: false, blocked: false, error: '生成失败，请稍后重试。' });
    }
  },

  onGoRecord() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onOpenMonthly() {
    wx.navigateTo({ url: '/pages/monthly/monthly' });
  },
});
