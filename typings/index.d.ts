/// <reference types="miniprogram-api-typings" />

interface IAppOption {
  globalData: {
    repository: import('../miniprogram/core/repository/types').Repository;
    generator: import('../miniprogram/core/generator/types').RoleGenerator;
  };
}
