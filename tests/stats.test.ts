import assert from 'node:assert/strict';
import test from 'node:test';
import { currentStreak, groupEntriesByMonthDesc } from '../miniprogram/core/stats';
import { entry } from './helpers';

const TODAY = new Date(2026, 10, 18);

test('连续记录：无记录返回 0', () => {
  assert.equal(currentStreak([], TODAY), 0);
});

test('连续记录：今天和之前连续 3 天', () => {
  const entries = [
    entry('2026-11-16', '平稳', '工作/学习'),
    entry('2026-11-17', '紧绷', '工作/学习'),
    entry('2026-11-18', '低电量', '身体'),
  ];
  assert.equal(currentStreak(entries, TODAY), 3);
});

test('连续记录：今天还没记录时，从昨天往回数不清零', () => {
  const entries = [
    entry('2026-11-16', '平稳', '工作/学习'),
    entry('2026-11-17', '紧绷', '工作/学习'),
  ];
  assert.equal(currentStreak(entries, TODAY), 2);
});

test('连续记录：今天和昨天都空则归零', () => {
  const entries = [entry('2026-11-16', '平稳', '工作/学习')];
  assert.equal(currentStreak(entries, TODAY), 0);
});

test('连续记录：中间断一天就停止', () => {
  const entries = [
    entry('2026-11-14', '平稳', '工作/学习'),
    entry('2026-11-17', '紧绷', '工作/学习'),
    entry('2026-11-18', '兴奋', '独处'),
  ];
  assert.equal(currentStreak(entries, TODAY), 2);
});

test('连续记录：未来日期的记录不影响当前连续天数', () => {
  const entries = [entry('2026-11-18', '平稳', '工作/学习'), entry('2026-11-19', '兴奋', '独处')];
  assert.equal(currentStreak(entries, TODAY), 1);
});

test('连续记录：可跨月连续', () => {
  const entries = [
    entry('2026-10-31', '平稳', '工作/学习'),
    entry('2026-11-01', '平稳', '独处'),
    entry('2026-11-02', '低电量', '身体'),
  ];
  assert.equal(currentStreak(entries, new Date(2026, 10, 2)), 3);
});

test('连续记录：同一天重复记录只算一天', () => {
  const entries = [
    entry('2026-11-17', '平稳', '工作/学习'),
    entry('2026-11-18', '紧绷', '工作/学习'),
    entry('2026-11-18', '兴奋', '独处'),
  ];
  assert.equal(currentStreak(entries, TODAY), 2);
});

test('历史分组：空记录返回空数组', () => {
  assert.deepEqual(groupEntriesByMonthDesc([]), []);
});

test('历史分组：月份新的在前，组内日期倒序', () => {
  const entries = [
    entry('2026-10-31', '低电量', '身体'),
    entry('2026-11-01', '平稳', '工作/学习'),
    entry('2026-10-02', '紧绷', '工作/学习'),
    entry('2026-11-18', '兴奋', '独处'),
    entry('2026-11-05', '烦躁', '人际'),
  ];
  const groups = groupEntriesByMonthDesc(entries);
  assert.deepEqual(
    groups.map((group) => group.month),
    ['2026-11', '2026-10'],
  );
  assert.deepEqual(
    groups[0].entries.map((item) => item.date),
    ['2026-11-18', '2026-11-05', '2026-11-01'],
  );
  assert.deepEqual(
    groups[1].entries.map((item) => item.date),
    ['2026-10-31', '2026-10-02'],
  );
  // 分组不丢记录
  assert.equal(
    groups.reduce((sum, group) => sum + group.entries.length, 0),
    entries.length,
  );
});

test('历史分组：只有一个月时也按日期倒序', () => {
  const entries = [
    entry('2026-11-02', '平稳', '工作/学习'),
    entry('2026-11-20', '兴奋', '家庭'),
    entry('2026-11-15', '低电量', '身体'),
  ];
  const groups = groupEntriesByMonthDesc(entries);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].month, '2026-11');
  assert.deepEqual(
    groups[0].entries.map((item) => item.date),
    ['2026-11-20', '2026-11-15', '2026-11-02'],
  );
});
