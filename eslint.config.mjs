// ESLint flat config：小程序 TS + Node 脚本。
// 与 Prettier 分工：ESLint 管正确性，Prettier 管排版（eslint-config-prettier 关闭冲突规则）。
import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '.tmp-test/**',
      'coverage/**',
      'dist/**',
      'build/**',
      'miniprogram_npm/**',
      // 微信开发者工具根据 TS 编译出的 JS 与图片资源不参与 lint
      'miniprogram/**/*.js',
      'miniprogram/assets/**',
      'minitest/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    // 构建/校验脚本是 ESM JavaScript，注入 Node 全局变量
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      sourceType: 'module',
    },
  },
  {
    // 小程序与测试代码：类型由 TS 负责，避免 no-undef 误报 wx / Page 等全局
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrors: 'none',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // 全局声明文件只做类型声明，不参与「未使用」判定
    files: ['typings/**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
