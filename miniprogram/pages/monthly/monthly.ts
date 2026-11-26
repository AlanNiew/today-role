import { monthKey, monthLabel } from '../../core/date';
import { isProActive, planLabel } from '../../core/entitlement';
import { filterByMonth, percent, uniqueRecordedDays } from '../../core/stats';
import type { MonthlyInsights, SceneCount, Status } from '../../core/types';
import { STATUSES } from '../../core/types';
import { readDevUnlock } from '../../data/dev-unlock';

interface DistributionRow {
  status: Status;
  count: number;
  percent: number;
  color: string;
}

interface SceneRow extends SceneCount {
  percent: number;
}

const STATUS_COLORS: Record<Status, string> = {
  平稳: '#5f8a6e',
  紧绷: '#c17a58',
  低电量: '#6f87a6',
  兴奋: '#d99a3d',
  烦躁: '#b4635f',
  麻木: '#948c7e',
};

Page({
  data: {
    loading: true,
    blocked: false,
    error: '',
    month: '',
    monthLabel: '',
    monthShort: '',
    recordedDays: 0,
    requiredDays: 10,
    progress: 0,
    message: '',
    distribution: [] as DistributionRow[],
    topScenes: [] as SceneRow[],
    tension: '',
    actionSuggestion: '',
    isPro: false,
    planText: '免费版',
    /** Mock Pro 只在开发者工具 / 体验版可见，正式版隐藏深度内容与 Pro 文案 */
    showPro: false,
    insights: null as MonthlyInsights | null,
  },

  async onShow() {
    this.setData({
      loading: true,
      blocked: false,
      error: '',
      distribution: [],
      topScenes: [],
      tension: '',
      actionSuggestion: '',
      isPro: false,
      planText: '免费版',
      showPro: false,
      insights: null,
    });
    try {
      const app = getApp<IAppOption>();
      const repository = app.globalData.repository;
      const today = new Date();
      const month = monthKey(today);
      const userId = await repository.getUserId();
      const entries = await repository.listEntries();
      const result = await app.globalData.generator.generateMonthlyCard({
        entries,
        month,
        today,
        userId,
      });

      if (!result.ok) {
        this.setData({
          loading: false,
          blocked: true,
          month,
          monthLabel: monthLabel(month),
          monthShort: month.replace('-', '.'),
          recordedDays: result.recordedDays,
          requiredDays: result.requiredDays,
          progress: percent(result.recordedDays, result.requiredDays),
          message: result.message,
        });
        return;
      }

      const card = result.value;
      await repository.saveMonthlyCard(card);
      const entitlement = await repository.getEntitlement();
      const showPro = readDevUnlock();
      const pro = showPro && isProActive(entitlement);

      let insights: MonthlyInsights | null = null;
      if (pro) {
        try {
          insights = await app.globalData.generator.buildMonthlyInsights({
            entries,
            card,
            month,
            today,
          });
        } catch (error) {
          console.error('生成 Pro 深度内容失败', error);
          wx.showToast({ title: '深度内容生成失败', icon: 'none' });
        }
      }

      const days = uniqueRecordedDays(filterByMonth(entries, month)).length;
      const distribution = STATUSES.map((status) => ({
        status,
        count: card.statusDistribution[status],
        percent: percent(card.statusDistribution[status], days),
        color: STATUS_COLORS[status],
      }));
      const scenes = card.topScenes.map((item) => ({
        scene: item.scene,
        count: item.count,
        percent: percent(item.count, days),
      }));

      this.setData({
        loading: false,
        blocked: false,
        month,
        monthLabel: monthLabel(month),
        monthShort: month.replace('-', '.'),
        recordedDays: days,
        distribution,
        topScenes: scenes,
        tension: card.tension ?? '',
        actionSuggestion: card.actionSuggestion ?? '',
        isPro: pro,
        planText: showPro ? planLabel(entitlement) : '免费版',
        showPro,
        insights,
      });
    } catch (error) {
      console.error('生成月卡失败', error);
      this.setData({ loading: false, blocked: false, error: '生成失败，请稍后重试。' });
    }
  },

  onRefresh() {
    this.onShow();
  },

  onGoRecord() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onOpenPaywall() {
    if (!this.data.showPro) {
      return;
    }
    wx.navigateTo({ url: '/pages/paywall/paywall' });
  },
});
