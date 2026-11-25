import { APP_CONFIG } from '../../config';
import { formatDateLabel, monthKey, pad2, toDateKey } from '../../core/date';
import { isProActive, planLabel } from '../../core/entitlement';
import { shouldShowDevTools, shouldShowMockPro } from '../../core/env';
import { buildDemoEntries } from '../../core/seed';
import { currentStreak, filterByMonth, uniqueRecordedDays } from '../../core/stats';
import { readEnvVersion } from '../../data/runtime-env';

Page({
  data: {
    loading: true,
    recordedDays: 0,
    currentMonthDays: 0,
    streak: 0,
    firstDateLabel: '还没有记录',
    isPro: false,
    planText: '免费版',
    appVersion: APP_CONFIG.appVersion,
    /** 仅开发者工具 / 体验版展示「载入演示数据」，正式版隐藏 */
    showDevTools: false,
    /** Mock Pro 只在开发者工具 / 体验版可见，正式版隐藏全部入口 */
    showPro: false,
    exporting: false,
    clearing: false,
    seeding: false,
  },

  async onShow() {
    const envVersion = readEnvVersion();
    this.setData({
      showDevTools: shouldShowDevTools(envVersion),
      showPro: shouldShowMockPro(envVersion),
    });
    await this.reloadSummary();
  },

  async reloadSummary() {
    try {
      const repository = getApp<IAppOption>().globalData.repository;
      const entries = await repository.listEntries();
      const entitlement = await repository.getEntitlement();
      const today = new Date();
      const month = monthKey(today);
      const showPro = this.data.showPro;
      this.setData({
        loading: false,
        recordedDays: uniqueRecordedDays(entries).length,
        currentMonthDays: filterByMonth(entries, month).length,
        streak: currentStreak(entries, today),
        firstDateLabel: entries.length > 0 ? formatDateLabel(entries[0].date) : '还没有记录',
        isPro: showPro && isProActive(entitlement),
        planText: showPro ? planLabel(entitlement) : '免费版',
      });
    } catch (error) {
      console.error('读取本地统计失败', error);
      this.setData({ loading: false });
      wx.showToast({ title: '本地数据读取失败', icon: 'none' });
    }
  },

  async onExport() {
    if (this.data.exporting) {
      return;
    }
    this.setData({ exporting: true });
    try {
      const repository = getApp<IAppOption>().globalData.repository;
      const bundle = await repository.exportAll();
      const json = JSON.stringify(bundle, null, 2);
      const now = new Date();
      const stamp = `${toDateKey(now).replace(/-/g, '')}-${pad2(now.getHours())}${pad2(
        now.getMinutes(),
      )}${pad2(now.getSeconds())}`;
      const fileName = `today-role-export-${stamp}.json`;
      let fileSaved = false;
      try {
        const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
        wx.getFileSystemManager().writeFileSync(filePath, json, 'utf8');
        fileSaved = true;
      } catch (error) {
        console.error('写入导出文件失败，仅复制到剪贴板', error);
      }

      wx.setClipboardData({
        data: json,
        success: () => {
          const size = Math.max(1, Math.round(json.length / 1024));
          wx.showModal({
            title: '导出完成',
            content: `已复制 ${size} KB JSON 到剪贴板${fileSaved ? `，并写入本机临时文件 ${fileName}` : ''}。数据没有上传。`,
            showCancel: false,
            confirmText: '知道了',
          });
        },
        fail: () => {
          wx.showToast({ title: '复制失败，请重试', icon: 'none' });
        },
      });
    } catch (error) {
      console.error('导出失败', error);
      wx.showToast({ title: '导出失败，请重试', icon: 'none' });
    } finally {
      this.setData({ exporting: false });
    }
  },

  onClearAll() {
    if (this.data.clearing) {
      return;
    }
    wx.showModal({
      title: '清空全部数据？',
      content: '将删除本机所有记录、周/月缓存和 Mock 权益，无法恢复。建议先导出 JSON。',
      confirmText: '清空',
      confirmColor: '#9c4a35',
      success: async (result) => {
        if (!result.confirm) {
          return;
        }
        this.setData({ clearing: true });
        try {
          const repository = getApp<IAppOption>().globalData.repository;
          await repository.clearAll();
          this.setData({
            clearing: false,
            recordedDays: 0,
            currentMonthDays: 0,
            streak: 0,
            firstDateLabel: '还没有记录',
            isPro: false,
            planText: '免费版',
          });
          wx.showToast({ title: '已清空', icon: 'success' });
        } catch (error) {
          console.error('清空数据失败', error);
          this.setData({ clearing: false });
          wx.showToast({ title: '清空失败，请重试', icon: 'none' });
        }
      },
    });
  },

  onSeedDemo() {
    if (this.data.seeding) {
      return;
    }
    // 双重保险：UI 已在正式版隐藏入口，这里再按环境拦截一次。
    if (!shouldShowDevTools(readEnvVersion())) {
      wx.showToast({ title: '正式版不提供演示数据', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '载入演示数据？',
      content: '会用最近 45 天的演示记录覆盖现有记录（Mock 权益保留），仅用于开发测试。',
      confirmText: '覆盖并载入',
      success: async (result) => {
        if (!result.confirm) {
          return;
        }
        this.setData({ seeding: true });
        try {
          const repository = getApp<IAppOption>().globalData.repository;
          const userId = await repository.getUserId();
          await repository.replaceEntries(buildDemoEntries(userId, new Date()));
          await this.reloadSummary();
          wx.showToast({ title: '演示数据已载入', icon: 'success' });
        } catch (error) {
          console.error('载入演示数据失败', error);
          wx.showToast({ title: '载入失败，请重试', icon: 'none' });
        } finally {
          this.setData({ seeding: false });
        }
      },
    });
  },

  onOpenHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  },

  onOpenPaywall() {
    // 正式版不提供 Mock Pro，入口已隐藏；这里再做一次防御
    if (!this.data.showPro) {
      return;
    }
    wx.navigateTo({ url: '/pages/paywall/paywall' });
  },

  onOpenWeekly() {
    wx.switchTab({ url: '/pages/weekly/weekly' });
  },

  onOpenMonthly() {
    wx.navigateTo({ url: '/pages/monthly/monthly' });
  },
});
