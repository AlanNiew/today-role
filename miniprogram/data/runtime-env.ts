/**
 * 读取小程序运行环境。仅此文件触碰 wx，core 保持纯函数，便于单测。
 * 读取失败（如插件环境）时按开发环境处理，避免误隐藏调试入口。
 */
export function readEnvVersion(): string {
  try {
    return wx.getAccountInfoSync().miniProgram.envVersion;
  } catch {
    return 'develop';
  }
}
