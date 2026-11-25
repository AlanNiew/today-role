import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldShowDevTools } from '../miniprogram/core/env';

test('正式版隐藏开发调试区，开发/体验版保留', () => {
  assert.equal(shouldShowDevTools('release'), false);
  assert.equal(shouldShowDevTools('develop'), true);
  assert.equal(shouldShowDevTools('trial'), true);
});

test('环境值缺失时按开发环境处理，不静默隐藏调试入口', () => {
  assert.equal(shouldShowDevTools(''), true);
  assert.equal(shouldShowDevTools(null), true);
  assert.equal(shouldShowDevTools(undefined), true);
  assert.equal(shouldShowDevTools('unknown'), true);
});
