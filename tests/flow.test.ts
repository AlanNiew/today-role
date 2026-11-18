import assert from 'node:assert/strict';
import test from 'node:test';
import { canUseFeature, createMockProEntitlement } from '../miniprogram/core/entitlement';
import { RuleBasedGenerator } from '../miniprogram/core/generator/rule-based';
import { MemoryRepository } from '../miniprogram/core/repository/memory';
import { STATUSES } from '../miniprogram/core/types';
import type { Scene, Status } from '../miniprogram/core/types';

const STATUS_ROTATION: Status[] = ['平稳', '紧绷', '低电量', '烦躁', '兴奋', '麻木'];
const SCENE_ROTATION: Scene[] = ['工作', '工作', '关系', '独处', '身体', '家庭'];

test('端到端主流程：记录 → 今日碎片 → 周快照 → 月卡 → Pro → 导出 → 清空', async () => {
  let clock = 1_800_000_000_000;
  const repository = new MemoryRepository({
    userId: 'u_flow',
    now: () => clock,
    idFactory: () => 'u_flow',
  });
  const generator = new RuleBasedGenerator();
  const today = new Date(2026, 10, 18);

  // 连续 10 天记录，其中今天先建后改，验证同日更新
  for (let index = 0; index < 10; index += 1) {
    clock += 1000;
    const day = 9 + index;
    await repository.upsertEntry({
      date: `2026-11-${String(day).padStart(2, '0')}`,
      status: STATUS_ROTATION[index % STATUS_ROTATION.length],
      scene: SCENE_ROTATION[index % SCENE_ROTATION.length],
      note: index === 9 ? '今天有点忙' : undefined,
    });
  }
  const firstVersion = await repository.getEntry('2026-11-18');
  clock += 1000;
  const updated = await repository.upsertEntry({
    date: '2026-11-18',
    status: '低电量',
    scene: '工作',
    note: '今天有点忙',
  });
  assert.equal(updated.created, false);
  assert.equal(updated.entry.id, firstVersion?.id);
  assert.equal((await repository.listEntries()).length, 10);

  const entries = await repository.listEntries();
  const todayEntry = await repository.getEntry('2026-11-18');
  assert.ok(todayEntry);
  const fragment = await generator.generateTodayFragment({ entry: todayEntry, entries });
  assert.ok(fragment.explanation.includes('「工作」'));
  assert.ok(fragment.explanation.includes('「低电量」'));

  const weekly = await generator.generateWeeklySnapshot({
    entries,
    today,
    userId: await repository.getUserId(),
  });
  assert.equal(weekly.ok, true);
  if (!weekly.ok) {
    return;
  }
  assert.equal(weekly.value.patterns.length, 2);
  assert.equal(weekly.value.patterns.filter((item) => /\d/.test(item.description)).length, 2);
  await repository.saveWeeklySnapshot(weekly.value);

  const monthly = await generator.generateMonthlyCard({
    entries,
    month: '2026-11',
    today,
    userId: await repository.getUserId(),
  });
  assert.equal(monthly.ok, true);
  if (!monthly.ok) {
    return;
  }
  await repository.saveMonthlyCard(monthly.value);
  assert.equal(
    STATUSES.reduce((sum, status) => sum + monthly.value.statusDistribution[status], 0),
    10,
  );

  const free = await repository.getEntitlement();
  assert.equal(canUseFeature('monthly-deep', free), false);

  await repository.setEntitlement(createMockProEntitlement('u_flow', true));
  const pro = await repository.getEntitlement();
  assert.equal(canUseFeature('monthly-deep', pro), true);
  const insights = await generator.buildMonthlyInsights({
    entries,
    card: monthly.value,
    month: '2026-11',
    today,
  });
  assert.ok(insights.actionPlan.length > 0);
  assert.equal(insights.comparison.available, false);

  const exported = await repository.exportAll();
  const parsed = JSON.parse(JSON.stringify(exported)) as typeof exported;
  assert.equal(parsed.entries.length, 10);
  assert.equal(parsed.weeklySnapshots.length, 1);
  assert.equal(parsed.monthlyCards.length, 1);
  assert.equal(parsed.entitlement?.isPro, true);

  await repository.clearAll();
  assert.deepEqual(repository.memory.snapshot(), {});
  assert.equal((await repository.listEntries()).length, 0);
  const afterClear = await repository.exportAll();
  assert.equal(afterClear.entries.length, 0);
  assert.equal(afterClear.weeklySnapshots.length, 0);
  assert.equal(afterClear.monthlyCards.length, 0);
  assert.equal(afterClear.entitlement?.isPro, false);
  assert.deepEqual(repository.memory.snapshot(), {});
});
