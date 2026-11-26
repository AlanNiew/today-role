import assert from 'node:assert/strict';
import test from 'node:test';
import { DEV_UNLOCK_KEY, isDevUnlocked } from '../miniprogram/core/env';

test('调试开关 key 固定，避免和业务数据前缀混在一起', () => {
  assert.equal(DEV_UNLOCK_KEY, 'today-role.dev.unlock');
});

test('解锁值判定：boolean / number / string 三种写入方式都识别', () => {
  assert.equal(isDevUnlocked(true), true);
  assert.equal(isDevUnlocked(1), true);
  assert.equal(isDevUnlocked('1'), true);
});

test('未解锁与异常值一律按未解锁处理', () => {
  assert.equal(isDevUnlocked(false), false);
  assert.equal(isDevUnlocked(0), false);
  assert.equal(isDevUnlocked('0'), false);
  assert.equal(isDevUnlocked(''), false);
  assert.equal(isDevUnlocked(null), false);
  assert.equal(isDevUnlocked(undefined), false);
  assert.equal(isDevUnlocked('true'), false);
  assert.equal(isDevUnlocked({}), false);
});
