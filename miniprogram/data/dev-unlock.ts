import { DEV_UNLOCK_KEY, isDevUnlocked } from '../core/env';

/**
 * 调试面板（载入演示数据 / Mock Pro）是否在本机解锁。
 *
 * 开发者工具 Console 执行一次即可解锁：
 *   wx.setStorageSync('today-role.dev.unlock', true)
 * 需要隐藏时：
 *   wx.removeStorageSync('today-role.dev.unlock')
 *
 * 解锁值只存在本机 storage，不随代码上传；体验版 / 审核包 / 正式版默认都看不到。
 */
export function readDevUnlock(): boolean {
  try {
    return isDevUnlocked(wx.getStorageSync(DEV_UNLOCK_KEY));
  } catch {
    return false;
  }
}
