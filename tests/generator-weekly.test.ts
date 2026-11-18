import assert from 'node:assert/strict';
import test from 'node:test';
import { RuleBasedGenerator } from '../miniprogram/core/generator/rule-based';
import type { DailyEntry, WeeklySnapshot } from '../miniprogram/core/types';
import { BANNED_COPY, entry } from './helpers';

const generator = new RuleBasedGenerator();
const SUNDAY = new Date(2026, 10, 22);

async function weekly(entries: DailyEntry[] = []) {
  return generator.generateWeeklySnapshot({
    entries,
    today: SUNDAY,
    userId: 'u_test',
    now: 999,
  });
}

function snapshotOf(value: unknown): WeeklySnapshot {
  return value as WeeklySnapshot;
}

test('最近 7 天不足 3 天时返回门控信息', async () => {
  const result = await weekly([entry('2026-11-21', '平稳', '工作'), entry('2026-11-22', '兴奋', '独处')]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, 'not-enough-data');
    assert.equal(result.recordedDays, 2);
    assert.equal(result.requiredDays, 3);
    assert.ok(result.message.includes('还差 1 天'));
  }
});

test('7 天满 3 天生成 2 个 Pattern，低点在周三时标为反常识', async () => {
  const result = await weekly([
    entry('2026-11-16', '平稳', '工作'),
    entry('2026-11-17', '平稳', '工作'),
    entry('2026-11-18', '低电量', '工作'),
    entry('2026-11-19', '平稳', '工作'),
    entry('2026-11-20', '烦躁', '关系'),
    entry('2026-11-21', '兴奋', '独处'),
    entry('2026-11-22', '平稳', '家庭'),
  ]);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  const snapshot = snapshotOf(result.value);
  assert.equal(snapshot.patterns.length, 2);
  assert.equal(snapshot.weekStart, '2026-11-16');
  assert.equal(snapshot.userId, 'u_test');
  assert.equal(snapshot.generatedAt, 999);
  assert.ok(snapshot.patterns[1].title.includes('低点不在周初或周五'));
  assert.equal(snapshot.patterns[1].isCounterIntuitive, true);
  for (const pattern of snapshot.patterns) {
    assert.match(pattern.description, /\d/);
    assert.doesNotMatch(pattern.description, BANNED_COPY);
  }
});

test('低点落在周五时改用场景落差规则', async () => {
  const result = await weekly([
    entry('2026-11-16', '兴奋', '关系'),
    entry('2026-11-17', '低电量', '工作'),
    entry('2026-11-18', '兴奋', '独处'),
    entry('2026-11-19', '低电量', '工作'),
    entry('2026-11-20', '低电量', '工作'),
    entry('2026-11-21', '平稳', '独处'),
  ]);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  const second = snapshotOf(result.value).patterns[1];
  assert.ok(second.title.includes('场景落差'));
  assert.equal(second.isCounterIntuitive, true);
  assert.match(second.description, /3 天/);
});

test('没有明显反常识时输出稳定 / 波动场景，并明确不硬编', async () => {
  const result = await weekly([
    entry('2026-11-16', '烦躁', '工作'),
    entry('2026-11-17', '兴奋', '独处'),
    entry('2026-11-18', '兴奋', '独处'),
    entry('2026-11-19', '兴奋', '独处'),
    entry('2026-11-20', '兴奋', '家庭'),
    entry('2026-11-21', '兴奋', '家庭'),
    entry('2026-11-22', '兴奋', '家庭'),
  ]);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  const second = snapshotOf(result.value).patterns[1];
  assert.ok(second.title.includes('最稳定'));
  assert.equal(second.isCounterIntuitive, false);
  assert.ok(second.description.includes('未出现更强的反常识模式'));
  assert.match(second.description, /\d/);
});

test('窗口外的旧记录不参与周快照', async () => {
  const result = await weekly([
    entry('2026-10-01', '低电量', '工作'),
    entry('2026-10-02', '低电量', '工作'),
    entry('2026-11-21', '平稳', '工作'),
    entry('2026-11-22', '兴奋', '独处'),
  ]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.recordedDays, 2);
  }
});
