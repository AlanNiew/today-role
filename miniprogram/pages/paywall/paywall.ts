import { createMockProEntitlement, isProActive, planLabel } from '../../core/entitlement';
import { shouldShowMockPro } from '../../core/env';
import { readEnvVersion } from '../../data/runtime-env';

Page({
  data: {
    loading: true,
    toggling: false,
    isPro: false,
    planText: '免费版',
  },

  async onShow() {
    // 正式版不提供 Mock Pro：入口已全部隐藏，这里防御直接打开
    if (!shouldShowMockPro(readEnvVersion())) {
      wx.switchTab({ url: '/pages/settings/settings' });
      return;
    }
    this.setData({ loading: true });
    try {
      const repository = getApp<IAppOption>().globalData.repository;
      const entitlement = await repository.getEntitlement();
      const pro = isProActive(entitlement);
      this.setData({ loading: false, isPro: pro, planText: planLabel(entitlement) });
    } catch (error) {
      console.error('读取权益失败', error);
      this.setData({ loading: false });
    }
  },

  onToggle() {
    if (this.data.toggling) {
      return;
    }
    const next = !this.data.isPro;
    wx.showModal({
      title: next ? '模拟开通 Pro' : '关闭 Mock Pro',
      content: next
        ? '仅在本机写入 mock 权益，不接微信支付，不会产生任何费用。'
        : '将恢复免费版展示；已有记录不会被删除。',
      confirmText: next ? '模拟开通' : '关闭',
      success: async (result) => {
        if (!result.confirm) {
          return;
        }
        this.setData({ toggling: true });
        try {
          const repository = getApp<IAppOption>().globalData.repository;
          const userId = await repository.getUserId();
          const nextEntitlement = createMockProEntitlement(userId, next);
          await repository.setEntitlement(nextEntitlement);
          this.setData({
            toggling: false,
            isPro: next,
            planText: planLabel(nextEntitlement),
          });
          wx.showToast({ title: next ? '已模拟开通' : '已关闭', icon: 'success' });
        } catch (error) {
          console.error('更新权益失败', error);
          this.setData({ toggling: false });
          wx.showToast({ title: '操作失败，请重试', icon: 'none' });
        }
      },
    });
  },

  onBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: '/pages/settings/settings' });
    }
  },
});
