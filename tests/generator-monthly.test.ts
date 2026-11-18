import assert from 'node:assert/strict';
import test from 'node:test';
import { RuleBasedGenerator } from '../miniprogram/core/generator/rule-based';
import { STATUSES } from '../miniprogram/core/types';
import type { MonthlyCard } from '../miniprogram/core/types';
import { BANNED_COPY, assertHasNumber, entry } from './helpers';

const generator = new RuleBasedGenerator();
const TODAY = new Date(2026, 10, 18);

function novemberEntries() {
  return [
    entry('2026-11-01', '紧绷', '工作'),
    entry('2026-11-02', '紧绷', '工作'),
    entry('2026-11-03', '烦躁', '工作'),
    entry('2026-11-04', '平稳', '独处'),
    entry('2026-11-05', '兴奋', '独处'),
    entry('2026-11-06', '平稳', '家庭'),
    entry('2026-11-07', '平稳', '关系'),
    entry('2026-11-08', '低电量', '身体'),
    entry('2026-11-09', '低电量', '工作'),
    entry('2026-11-10', '平稳', '独处'),
  ];
}

async function monthly(entries = novemberEntries()) {
  return generator.generateMonthlyCard({
    entries,
    month: '2026-11',
    today: TODAY,
    userId: 'u_test',
    now: 777,
  });
}

test('当月不足 10 天时返回门控信息', async () => {
  const result = await monthly(novemberEntries().slice(0, 9));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.scope, 'monthly');
    assert.equal(result.recordedDays, 9);
    assert.equal(result.requiredDays, 10);
    assert.ok(result.message.includes('还差 1 天'));
  }
});

test('满 10 天生成基础月卡：分布 / Top2 场景 / 张力 / 建议', async () => {
  const result = await monthly();
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  const card: MonthlyCard = result.value;
  assert.equal(card.month, '2026-11');
  assert.equal(card.id, 'u_test:2026-11');
  assert.equal(card.generatedAt, 777);

  const total = STATUSES.reduce((sum, status) => sum + card.statusDistribution[status], 0);
  assert.equal(total, 10);
  assert.equal(card.statusDistribution['平稳'], 4);
  assert.equal(card.statusDistribution['紧绷'], 2);
  assert.equal(card.statusDistribution['兴奋'], 1);
  assert.equal(card.topScenes.length, 2);
  assert.deepEqual(card.topScenes[0], { scene: '工作', count: 4 });
  assert.deepEqual(card.topScenes[1], { scene: '独处', count: 3 });

  assert.ok(card.tension);
  assert.ok(card.actionSuggestion);
  assertHasNumber('tension', card.tension ?? '');
  assertHasNumber('actionSuggestion', card.actionSuggestion ?? '');
  assert.ok((card.actionSuggestion ?? '').includes('11-23'));
  assert.doesNotMatch(card.tension ?? '', BANNED_COPY);
  assert.doesNotMatch(card.actionSuggestion ?? '', BANNED_COPY);
});

test('月卡只统计当月记录', async () => {
  const entries = [
    ...novemberEntries(),
    entry('2026-10-31', '低电量', '工作'),
    entry('2026-12-01', '低电量', '工作'),
  ];
  const result = await monthly(entries);
  assert.equal(result.ok, true);
  if (result.ok) {
    const total = STATUSES.reduce((sum, status) => sum + result.value.statusDistribution[status], 0);
    assert.equal(total, 10);
  }
});

test('Pro 深度内容包含共现、历史对比与 3 条行动建议', async () => {
  const previous = [
    entry('2026-10-20', '平稳', '工作'),
    entry('2026-10-21', '兴奋', '独处'),
    entry('2026-10-22', '平稳', '家庭'),
    entry('2026-10-23', '低电量', '身体'),
    entry('2026-10-24', '紧绷', '工作'),
  ];
  const entries = [...previous, ...novemberEntries()];
  const cardResult = await monthly(entries);
  assert.equal(cardResult.ok, true);
  if (!cardResult.ok) {
    return;
  }
  const insights = await generator.buildMonthlyInsights({
    entries,
    card: cardResult.value,
    month: '2026-11',
    today: TODAY,
    now: 888,
  });

  assert.equal(insights.generatedAt, 888);
  assert.ok(insights.triggers.length >= 2 && insights.triggers.length <= 3);
  assert.ok(insights.triggers.every((text) => /\d/.test(text)));
  assertHasNumber('coOccurrence', insights.coOccurrence);
  assert.ok(insights.coOccurrence.includes('不代表因果'));
  assert.equal(insights.comparison.available, true);
  assert.equal(insights.comparison.previousMonth, '2026-10');
  assert.equal(insights.comparison.previousRecordedDays, 5);
  assert.equal(insights.comparison.currentRecordedDays, 10);
  assertHasNumber('comparison.summary', insights.comparison.summary);
  assertHasNumber('statusShift', insights.comparison.statusShift);
  assertHasNumber('sceneShift', insights.comparison.sceneShift);
  // 本月口径必须只算当月：平稳 4/10 天，工作 4 天；不能混入上月记录
  assert.ok(insights.comparison.statusShift.includes('4/10 天'));
  assert.ok(insights.comparison.statusShift.includes('2/5 天'));
  assert.ok(insights.comparison.sceneShift.includes('（4 天）'));
  assert.ok(insights.comparison.sceneShift.includes('（2 天）'));
  assert.equal(insights.actionPlan.length, 3);
  assert.ok(insights.actionPlan.every((text) => /\d/.test(text)));

  const allText = [
    ...insights.triggers,
    insights.coOccurrence,
    insights.comparison.summary,
    insights.comparison.statusShift,
    insights.comparison.sceneShift,
    ...insights.actionPlan,
  ].join('\n');
  assert.doesNotMatch(allText, BANNED_COPY);
});

test('上月记录不足 3 天时明确说明无法对比', async () => {
  const entries = [...novemberEntries(), entry('2026-10-01', '平稳', '工作')];
  const cardResult = await monthly(entries);
  assert.equal(cardResult.ok, true);
  if (!cardResult.ok) {
    return;
  }
  const insights = await generator.buildMonthlyInsights({
    entries,
    card: cardResult.value,
    month: '2026-11',
    today: TODAY,
  });
  assert.equal(insights.comparison.available, false);
  assert.equal(insights.comparison.previousRecordedDays, 1);
  assert.ok(insights.comparison.summary.includes('少于 3 天'));
});

test('月卡所有公开文案都不含诊断 / 定性词，且均有锚点', async () => {
  const result = await monthly();
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  const card = result.value;
  for (const text of [card.tension ?? '', card.actionSuggestion ?? '', ...card.topScenes.map((item) => item.scene)]) {
    assert.doesNotMatch(text, BANNED_COPY);
  }
});
