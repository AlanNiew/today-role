import assert from 'node:assert/strict';
import test from 'node:test';
import { isReleaseEnv, shouldShowDevTools, shouldShowMockPro } from '../miniprogram/core/env';

test('正式版判定：只有 release 为真，其余按非正式版处理', () => {
  assert.equal(isReleaseEnv('release'), true);
  assert.equal(isReleaseEnv('develop'), false);
  assert.equal(isReleaseEnv('trial'), false);
  assert.equal(isReleaseEnv(''), false);
  assert.equal(isReleaseEnv(null), false);
  assert.equal(isReleaseEnv(undefined), false);
});

test('开发调试区：正式版隐藏，开发/体验版保留', () => {
  assert.equal(shouldShowDevTools('release'), false);
  assert.equal(shouldShowDevTools('develop'), true);
  assert.equal(shouldShowDevTools('trial'), true);
});

test('Mock Pro 入口：正式版隐藏，开发/体验版保留', () => {
  assert.equal(shouldShowMockPro('release'), false);
  assert.equal(shouldShowMockPro('develop'), true);
  assert.equal(shouldShowMockPro('trial'), true);
});

test('环境值缺失时按开发环境处理，不静默隐藏调试入口', () => {
  assert.equal(shouldShowDevTools(''), true);
  assert.equal(shouldShowDevTools(null), true);
  assert.equal(shouldShowDevTools(undefined), true);
  assert.equal(shouldShowDevTools('unknown'), true);
  assert.equal(shouldShowMockPro(''), true);
  assert.equal(shouldShowMockPro(null), true);
});
