import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canUseFeature,
  createFreeEntitlement,
  createMockProEntitlement,
} from '../miniprogram/core/entitlement';
import { RuleBasedGenerator } from '../miniprogram/core/generator/rule-based';
import { buildDemoEntries } from '../miniprogram/core/seed';
import { BANNED_COPY } from './helpers';

const TODAY = new Date(2026, 10, 18);
const generator = new RuleBasedGenerator();

test('演示数据覆盖最近 45 天，满足周 / 月门控且周内低点在周三', async () => {
  const entries = buildDemoEntries('u_demo', TODAY);
  assert.equal(entries.length, 45);
  assert.equal(new Set(entries.map((item) => item.date)).size, 45);
  assert.equal(entries[entries.length - 1].date, '2026-11-18');
  assert.equal(entries[entries.length - 1].status, '低电量');
  assert.equal(entries[entries.length - 1].scene, '工作');

  const november = entries.filter((item) => item.date.slice(0, 7) === '2026-11');
  const october = entries.filter((item) => item.date.slice(0, 7) === '2026-10');
  assert.equal(november.length, 18);
  assert.ok(october.length >= 3);

  const weekly = await generator.generateWeeklySnapshot({
    entries,
    today: TODAY,
    userId: 'u_demo',
  });
  assert.equal(weekly.ok, true);
  if (weekly.ok) {
    assert.equal(weekly.value.patterns.length, 2);
    assert.equal(weekly.value.patterns.filter((item) => item.isCounterIntuitive).length, 1);
    assert.ok(weekly.value.patterns[1].title.includes('低点不在周初或周五'));
  }

  const monthly = await generator.generateMonthlyCard({
    entries,
    month: '2026-11',
    today: TODAY,
    userId: 'u_demo',
  });
  assert.equal(monthly.ok, true);
  if (monthly.ok) {
    const insights = await generator.buildMonthlyInsights({
      entries,
      card: monthly.value,
      month: '2026-11',
      today: TODAY,
    });
    assert.equal(insights.comparison.available, true);
  }
});

test('演示数据 + 全部生成结果通过文案红线扫描，且带数字锚点', async () => {
  const entries = buildDemoEntries('u_demo', TODAY);
  const todayEntry = entries[entries.length - 1];
  const fragment = await generator.generateTodayFragment({ entries, entry: todayEntry });
  const weekly = await generator.generateWeeklySnapshot({
    entries,
    today: TODAY,
    userId: 'u_demo',
  });
  const monthly = await generator.generateMonthlyCard({
    entries,
    month: '2026-11',
    today: TODAY,
    userId: 'u_demo',
  });

  assert.equal(weekly.ok, true);
  assert.equal(monthly.ok, true);
  if (!weekly.ok || !monthly.ok) {
    return;
  }
  const insights = await generator.buildMonthlyInsights({
    entries,
    card: monthly.value,
    month: '2026-11',
    today: TODAY,
  });

  const copy = [
    fragment.label,
    fragment.explanation,
    ...fragment.dataAnchors,
    ...weekly.value.patterns.flatMap((item) => [item.title, item.description]),
    monthly.value.tension ?? '',
    monthly.value.actionSuggestion ?? '',
    ...insights.triggers,
    insights.coOccurrence,
    insights.comparison.summary,
    insights.comparison.statusShift,
    insights.comparison.sceneShift,
    ...insights.actionPlan,
  ];
  for (const text of copy) {
    assert.doesNotMatch(text, BANNED_COPY, `命中红线词：${text}`);
  }
  for (const text of [
    fragment.explanation,
    ...weekly.value.patterns.map((item) => item.description),
    monthly.value.tension ?? '',
    monthly.value.actionSuggestion ?? '',
    ...insights.triggers,
    insights.coOccurrence,
    insights.comparison.summary,
    ...insights.actionPlan,
  ]) {
    assert.match(text, /\d/, `缺少数据锚点：${text}`);
  }
  assert.ok(!fragment.explanation.includes('效率'));
});

test('免费 / Mock Pro 能力矩阵', () => {
  const free = createFreeEntitlement('u_test');
  const pro = createMockProEntitlement('u_test', true);
  const expired = { ...pro, expiresAt: 100 };

  assert.equal(canUseFeature('monthly-deep', free, 1000), false);
  assert.equal(canUseFeature('monthly-history', free, 1000), false);
  assert.equal(canUseFeature('monthly-action-plan', free, 1000), false);
  assert.equal(canUseFeature('monthly-deep', pro, 1000), true);
  assert.equal(canUseFeature('monthly-history', pro, 1000), true);
  assert.equal(canUseFeature('monthly-action-plan', pro, 1000), true);
  assert.equal(canUseFeature('monthly-deep', expired, 1000), false);
});
