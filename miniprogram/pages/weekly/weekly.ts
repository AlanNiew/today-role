import { addDays, formatMonthDay, parseDateKey, toDateKey } from '../../core/date';
import type { Pattern } from '../../core/types';

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
    });
    try {
      const app = getApp<IAppOption>();
      const repository = app.globalData.repository;
      const today = new Date();
      const todayKey = toDateKey(today);
      const todayDate = parseDateKey(todayKey);
      const userId = await repository.getUserId();
      const entries = await repository.listEntries();
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
          rangeLabel: `${formatMonthDay(toDateKey(addDays(todayDate, -6)))} — ${formatMonthDay(todayKey)}`,
        });
        return;
      }

      await repository.saveWeeklySnapshot(result.value);
      this.setData({
        loading: false,
        blocked: false,
        recordedDays: this.countDays(entries, todayKey),
        patterns: result.value.patterns,
        counterCount: result.value.patterns.filter((pattern) => pattern.isCounterIntuitive).length,
        rangeLabel: `${formatMonthDay(toDateKey(addDays(todayDate, -6)))} — ${formatMonthDay(todayKey)}`,
      });
    } catch (error) {
      console.error('生成周快照失败', error);
      this.setData({ loading: false, blocked: false, error: '生成失败，请稍后重试。' });
    }
  },

  countDays(entries: { date: string }[], todayKey: string): number {
    const start = addDays(parseDateKey(todayKey), -6);
    const dates = new Set(
      entries
        .filter((entry) => entry.date >= toDateKey(start) && entry.date <= todayKey)
        .map((entry) => entry.date),
    );
    return dates.size;
  },

  onGoRecord() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onOpenMonthly() {
    wx.navigateTo({ url: '/pages/monthly/monthly' });
  },
});
