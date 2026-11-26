/**
 * 本机调试开关（载入演示数据 / Mock Pro）的纯规则。
 *
 * 为什么不按 envVersion 判断：官方文档写明「提交代码审核时默认使用开发版进行审核」，
 * 审核员看到的 envVersion 是 develop；只按 release 隐藏会让审核版暴露调试入口。
 * 因此调试面板改为「本机 storage 解锁」：解锁值只存在于开发者自己的设备，
 * 不会随代码上传，体验版 / 审核包 / 正式版默认都看不到。
 */

export const DEV_UNLOCK_KEY = 'today-role.dev.unlock';

/** 解锁值判定（wx.storage 可能返回 boolean / number / string）。 */
export function isDevUnlocked(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}
