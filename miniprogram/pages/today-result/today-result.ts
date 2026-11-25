import { formatDateLabel, toDateKey } from '../../core/date';
import type { DailyEntry } from '../../core/types';

interface AnchorItem {
  label: string;
  value: string;
}

function toAnchorItems(anchors: string[]): AnchorItem[] {
  return anchors.map((text) => {
    const index = text.indexOf('：');
    if (index <= 0) {
      return { label: text, value: '' };
    }
    return { label: text.slice(0, index), value: text.slice(index + 1) };
  });
}

Page({
  data: {
    loading: true,
    missing: false,
    error: '',
    date: '',
    dateLabel: '',
    label: '',
    explanation: '',
    anchors: [] as AnchorItem[],
    note: '',
    savedText: '',
  },

  async onLoad(options: Record<string, string | undefined>) {
    const date =
      options.date && /^\d{4}-\d{2}-\d{2}$/.test(options.date)
        ? options.date
        : toDateKey(new Date());
    const savedText =
      options.saved === 'updated'
        ? '今天的记录已更新'
        : options.saved === 'created'
          ? '已记下今天的状态'
          : '';
    this.setData({ date, dateLabel: formatDateLabel(date), savedText });

    try {
      const app = getApp<IAppOption>();
      const repository = app.globalData.repository;
      const entry: DailyEntry | null = await repository.getEntry(date);
      if (!entry) {
        this.setData({ loading: false, missing: true });
        return;
      }
      const entries = await repository.listEntries();
      const fragment = await app.globalData.generator.generateTodayFragment({ entry, entries });
      this.setData({
        loading: false,
        label: fragment.label,
        explanation: fragment.explanation,
        anchors: toAnchorItems(fragment.dataAnchors),
        note: entry.note ?? '',
      });
    } catch (error) {
      console.error('生成今日碎片失败', error);
      this.setData({ loading: false, missing: false, error: '生成失败，请返回后重试。' });
    }
  },

  onEdit() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onOpenWeekly() {
    wx.switchTab({ url: '/pages/weekly/weekly' });
  },

  onOpenMonthly() {
    wx.navigateTo({ url: '/pages/monthly/monthly' });
  },
});
