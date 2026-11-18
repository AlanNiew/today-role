import { APP_CONFIG } from './config';
import { createGenerator } from './core/generator';
import { getRepository } from './data/repository';

App<IAppOption>({
  globalData: {
    repository: getRepository(),
    generator: createGenerator(APP_CONFIG.generatorMode),
  },
  onLaunch() {
    // 不登录、不请求网络、不自动写入任何记录。
    // 数据只会在用户主动保存 / 导入演示数据 / 开启 mock 权益时写入本地存储。
  },
});
