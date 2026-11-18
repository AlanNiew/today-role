import assert from 'node:assert/strict';
import test from 'node:test';
import { RuleBasedGenerator } from '../miniprogram/core/generator/rule-based';
import type { DailyEntry } from '../miniprogram/core/types';
import { BANNED_COPY, entry } from './helpers';

const generator = new RuleBasedGenerator();

function generate(entries: DailyEntry[], target: DailyEntry) {
  return generator.generateTodayFragment({ entries, entry: target, now: 123 });
}

test('今日碎片引用当天状态与场景，并带最近 7 天锚点', async () => {
  const target = entry('2026-11-18', '紧绷', '工作');
  const entries = [
    entry('2026-11-12', '平稳', '工作'),
    entry('2026-11-13', '紧绷', '工作'),
    entry('2026-11-14', '紧绷', '工作'),
    entry('2026-11-15', '低电量', '身体'),
    target,
  ];
  const fragment = await generate(entries, target);
  assert.equal(fragment.date, '2026-11-18');
  assert.equal(fragment.label, '硬撑的协调者');
  assert.ok(fragment.explanation.includes('「工作」'));
  assert.ok(fragment.explanation.includes('「紧绷」'));
  assert.ok(fragment.explanation.includes('这个组合出现 3 天'));
  assert.ok(fragment.explanation.includes('共出现 3 天'));
  assert.equal(fragment.dataAnchors.length, 3);
  assert.equal(fragment.generatedAt, 123);
  assert.doesNotMatch(fragment.explanation, BANNED_COPY);
  assert.doesNotMatch(fragment.label, BANNED_COPY);
});

test('今日碎片不读取、不回显 note', async () => {
  const target = entry('2026-11-18', '烦躁', '关系', '和同事吵了一架，很生气');
  const fragment = await generate([target], target);
  assert.equal(fragment.label, '耐心告急的回应者');
  assert.ok(!fragment.explanation.includes('同事'));
  assert.ok(!fragment.explanation.includes('生气'));
  assert.ok(fragment.explanation.includes('1 天'));
});

test('最近 7 天窗口外的手动记录不参与计数', async () => {
  const target = entry('2026-11-18', '平稳', '独处');
  const entries = [
    entry('2026-11-01', '平稳', '独处'),
    entry('2026-11-10', '平稳', '独处'),
    target,
  ];
  const fragment = await generate(entries, target);
  assert.ok(fragment.explanation.includes('这个组合出现 1 天'));
});

test('缺少记录时仍能生成当天碎片（以当天为窗口末端）', async () => {
  const target = entry('2026-11-18', '兴奋', '家庭');
  const fragment = await generate([target], target);
  assert.equal(fragment.label, '带动气氛的召集人');
  assert.ok(fragment.explanation.includes('「兴奋」共出现 1 天'));
});
