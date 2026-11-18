import { monthKey, monthLabel } from '../../core/date';
import { isProActive } from '../../core/entitlement';
import {
  percent,
  uniqueRecordedDays,
} from '../../core/stats';
import type { MonthlyInsights, SceneCount, Status } from '../../core/types';
import { STATUSES } from '../../core/types';

interface DistributionRow {
  status: Status;
  count: number;
  percent: number;
}

interface SceneRow extends SceneCount {
  percent: number;
}

Page({
  data: {
    loading: true,
    blocked: false,
    error: '',
    month: '',
    monthLabel: '',
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
          recordedDays: result.recordedDays,
          requiredDays: result.requiredDays,
          progress: Math.round((result.recordedDays / result.requiredDays) * 100),
          message: result.message,
        });
        return;
      }

      const card = result.value;
      await repository.saveMonthlyCard(card);
      const entitlement = await repository.getEntitlement();
      const pro = isProActive(entitlement);

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

      const days = uniqueRecordedDays(entries.filter((entry) => entry.date.slice(0, 7) === month)).length;
      const distribution = STATUSES.map((status) => ({
        status,
        count: card.statusDistribution[status],
        percent: percent(card.statusDistribution[status], days),
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
        recordedDays: days,
        distribution,
        topScenes: scenes,
        tension: card.tension ?? '',
        actionSuggestion: card.actionSuggestion ?? '',
        isPro: pro,
        planText: pro ? 'Mock Pro' : '免费版',
        insights,
      });
    } catch (error) {
      console.error('生成月卡失败', error);
      this.setData({ loading: false, blocked: false, error: '生成失败，请稍后重试。' });
    }
  },

  onGoRecord() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onOpenPaywall() {
    wx.navigateTo({ url: '/pages/paywall/paywall' });
  },
});
