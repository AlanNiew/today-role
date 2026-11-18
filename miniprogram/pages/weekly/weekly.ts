import { addDays, formatMonthDay, parseDateKey, toDateKey, weekdayLabel } from '../../core/date';
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
      const recordedDays = weekDots.filter((item) => item.recorded).length;
      const rangeLabel = `${formatMonthDay(toDateKey(addDays(todayDate, -6)))} — ${formatMonthDay(todayKey)}`;
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
          progress: Math.round((result.recordedDays / result.requiredDays) * 100),
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
