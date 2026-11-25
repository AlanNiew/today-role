/**
 * 运行环境规则。core 保持纯 TS：这里只做判断，真实环境值由页面通过
 * `wx.getAccountInfoSync().miniProgram.envVersion` 读取后传入。
 */

export type EnvVersion = 'develop' | 'trial' | 'release';

/** 是否正式版环境（无法识别时按非正式版处理）。 */
export function isReleaseEnv(envVersion: string | null | undefined): boolean {
  return envVersion === 'release';
}

/**
 * 是否展示「开发调试」区块（载入演示数据）。
 *
 * - develop：开发者工具，日常开发需要
 * - trial：体验版，验收时需要
 * - release：正式版，隐藏，避免真实用户误触覆盖自己的记录
 *
 * 未知或读取失败时按开发环境处理（宁可多显示，不静默隐藏调试入口）。
 */
export function shouldShowDevTools(envVersion: string | null | undefined): boolean {
  return !isReleaseEnv(envVersion);
}

/**
 * 是否展示 Mock Pro 相关入口（付费页、设置页 Mock 权益行、月卡深度内容）。
 *
 * 正式版隐藏：免费层本就完整可用，Mock 权益只用于开发与体验版验证，
 * 避免正式用户看到「模拟开通 / 开发测试」这类占位内容。
 */
export function shouldShowMockPro(envVersion: string | null | undefined): boolean {
  return !isReleaseEnv(envVersion);
}
