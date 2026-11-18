import { APP_CONFIG } from '../config';
import { LocalRepository } from '../core/repository/local';
import type { Repository } from '../core/repository/types';
import { WxStorage } from './wx-storage';

let instance: Repository | null = null;

/**
 * 数据层唯一入口。页面不直接使用 wx.storage。
 * 切换到云开发时，只需在这里返回 CloudRepository。
 */
export function getRepository(): Repository {
  if (instance) {
    return instance;
  }
  if (APP_CONFIG.dataMode === 'cloud') {
    throw new Error('CloudRepository 尚未实现，请先在 miniprogram/data/repository.ts 接入云开发。');
  }
  instance = new LocalRepository(new WxStorage(), { prefix: APP_CONFIG.storagePrefix });
  return instance;
}
