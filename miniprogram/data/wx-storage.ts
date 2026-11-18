import type { KeyValueStorage } from '../core/repository/types';

/** 把 wx.storage 适配成可测试的最小 KV 接口 */
export class WxStorage implements KeyValueStorage {
  get(key: string): string | null {
    const value: unknown = wx.getStorageSync(key);
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  set(key: string, value: string): void {
    wx.setStorageSync(key, value);
  }

  remove(key: string): void {
    wx.removeStorageSync(key);
  }

  keys(): string[] {
    try {
      return wx.getStorageInfoSync().keys;
    } catch {
      return [];
    }
  }
}
