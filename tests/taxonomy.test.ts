import assert from 'node:assert/strict';
import test from 'node:test';
import { parseDateKey } from '../miniprogram/core/date';
import { RuleBasedGenerator } from '../miniprogram/core/generator/rule-based';
import {
  SCENES,
  STATUSES,
  type DailyEntry,
  type Scene,
  type Status,
} from '../miniprogram/core/types';
import { BANNED_COPY } from './helpers';

function entry(date: string, status: Status, scene: Scene): DailyEntry {
  return {
    id: `u:${date}`,
    userId: 'u',
    date,
    status,
    scene,
    createdAt: 0,
    updatedAt: 0,
  };
}

test('分类规模：8 个状态 × 5 个场景', () => {
  assert.equal(STATUSES.length, 8);
  assert.equal(SCENES.length, 5);
  assert.equal(STATUSES.length * SCENES.length, 40);
});

test('40 个组合都有标签，且全部通过文案红线', async () => {
  const generator = new RuleBasedGenerator();
  const labels = new Set<string>();

  for (const status of STATUSES) {
    for (const scene of SCENES) {
      const target = entry('2026-11-20', status, scene);
      const fragment = await generator.generateTodayFragment({
        entry: target,
        entries: [target],
        now: 1,
      });

      assert.ok(fragment.label.length > 0, `${status} × ${scene} 缺标签`);
      assert.doesNotMatch(fragment.label, BANNED_COPY);
      assert.doesNotMatch(fragment.explanation, BANNED_COPY);
      assert.ok(fragment.explanation.includes(`「${scene}」`));
      assert.ok(fragment.explanation.includes(`「${status}」`));
      assert.equal(fragment.dataAnchors.length, 3);
      labels.add(fragment.label);
    }
  }

  // 同一状态×场景的标签是固定的；不同组合之间标签不重复
  assert.equal(labels.size, 40);
});

test('标签随状态与场景变化：同场景不同状态不等于同标签', async () => {
  const generator = new RuleBasedGenerator();
  const labelOf = async (status: Status) => {
    const target = entry('2026-11-20', status, '独处');
    const fragment = await generator.generateTodayFragment({
      entry: target,
      entries: [target],
      now: 1,
    });
    return fragment.label;
  };
  assert.notEqual(await labelOf('低落'), await labelOf('平稳'));
  assert.notEqual(await labelOf('开心'), await labelOf('兴奋'));
});

test('迁移后的场景值可直接写入并生成', async () => {
  const generator = new RuleBasedGenerator();
  const target = entry('2026-11-20', '低电量', '人际');
  const fragment = await generator.generateTodayFragment({ entry: target, entries: [target] });
  assert.equal(fragment.label, '先给自己留电的回应者');
  assert.ok(fragment.explanation.includes('「人际」'));
  assert.equal(parseDateKey(target.date).getMonth(), 10);
});
