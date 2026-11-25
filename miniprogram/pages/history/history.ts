import { monthLabel, parseDateKey, weekdayLabel } from '../../core/date';
import { groupEntriesByMonthDesc } from '../../core/stats';

interface HistoryRow {
  date: string;
  /** 当月第几天，例如 18 */
  day: string;
  weekday: string;
  status: string;
  scene: string;
  note: string;
}

interface HistoryGroup {
  month: string;
  monthLabel: string;
  rows: HistoryRow[];
}

type TapEvent = { currentTarget: { dataset: { date?: string } } };

Page({
  data: {
    loading: true,
    count: 0,
    groups: [] as HistoryGroup[],
  },

  async onShow() {
    this.setData({ loading: true });
    try {
      const repository = getApp<IAppOption>().globalData.repository;
      const entries = await repository.listEntries();
      const groups = groupEntriesByMonthDesc(entries).map((group) => ({
        month: group.month,
        monthLabel: monthLabel(group.month),
        rows: group.entries.map((entry) => {
          const date = parseDateKey(entry.date);
          return {
            date: entry.date,
            day: String(date.getDate()),
            weekday: weekdayLabel(date),
            status: entry.status,
            scene: entry.scene,
            note: entry.note ?? '',
          };
        }),
      }));
      this.setData({ loading: false, count: entries.length, groups });
    } catch (error) {
      console.error('读取历史记录失败', error);
      this.setData({ loading: false });
      wx.showToast({ title: '本地数据读取失败', icon: 'none' });
    }
  },

  /** 打开某一天的只读回看（mode=history，不提供编辑） */
  onOpenEntry(event: TapEvent) {
    const date = event.currentTarget.dataset.date;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return;
    }
    wx.navigateTo({ url: `/pages/today-result/today-result?date=${date}&mode=history` });
  },

  onGoRecord() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
