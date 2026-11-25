import type { GeneratorMode } from './core/generator/index';

export type DataMode = 'local' | 'cloud';

export interface AppConfig {
  /** MVP 默认 local；切云开发时改成 cloud 并实现 CloudRepository */
  dataMode: DataMode;
  /** MVP 默认 rule；接入 LLM 后改成 llm */
  generatorMode: GeneratorMode;
  storagePrefix: string;
  /** 展示用版本号；发版时与小程序后台提交的版本保持一致 */
  appVersion: string;
}

export const APP_CONFIG: AppConfig = {
  dataMode: 'local',
  generatorMode: 'rule',
  storagePrefix: 'today-role.v1.',
  appVersion: '1.0.0',
};
