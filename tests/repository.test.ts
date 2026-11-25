import assert from 'node:assert/strict';
import test from 'node:test';
import { createMockProEntitlement, isProActive } from '../miniprogram/core/entitlement';
import { MemoryRepository } from '../miniprogram/core/repository/memory';
import { entry } from './helpers';

function makeRepo() {
  let clock = 1_700_000_000_000;
  const repository = new MemoryRepository({
    userId: 'u_test',
    now: () => clock,
    idFactory: () => 'u_test',
  });
  return {
    repository,
    tick: () => {
      clock += 1000;
    },
  };
}

test('同一天重复提交是更新，不新增记录', async () => {
  const { repository, tick } = makeRepo();
  const created = await repository.upsertEntry({
    date: '2026-11-18',
    status: '紧绷',
    scene: '工作',
    note: '开会',
  });
  assert.equal(created.created, true);
  assert.equal(created.entry.createdAt, 1_700_000_000_000);
  assert.equal(created.entry.id, 'u_test:2026-11-18');

  tick();
  const updated = await repository.upsertEntry({
    date: '2026-11-18',
    status: '平稳',
    scene: '独处',
    note: '',
  });
  assert.equal(updated.created, false);
  assert.equal(updated.entry.id, 'u_test:2026-11-18');
  assert.equal(updated.entry.createdAt, 1_700_000_000_000);
  assert.equal(updated.entry.updatedAt, 1_700_000_001_000);
  assert.equal(updated.entry.status, '平稳');
  assert.equal(updated.entry.scene, '独处');
  assert.equal(updated.entry.note, undefined);

  const all = await repository.listEntries();
  assert.equal(all.length, 1);
});

test('记录校验：日期 / 状态 / 场景 / 备注长度', async () => {
  const { repository } = makeRepo();
  await assert.rejects(() =>
    repository.upsertEntry({ date: '2026-02-30', status: '平稳', scene: '工作' }),
  );
  await assert.rejects(() =>
    repository.upsertEntry({ date: '2026-11-18', status: '开心' as never, scene: '工作' }),
  );
  await assert.rejects(() =>
    repository.upsertEntry({ date: '2026-11-18', status: '平稳', scene: '公司' as never }),
  );
  await assert.rejects(() =>
    repository.upsertEntry({
      date: '2026-11-18',
      status: '平稳',
      scene: '工作',
      note: '字'.repeat(101),
    }),
  );
  const ok = await repository.upsertEntry({
    date: '2026-11-18',
    status: '平稳',
    scene: '工作',
    note: '字'.repeat(100),
  });
  assert.equal(ok.entry.note?.length, 100);
});

test('列表按日期升序，replaceEntries 去重并清理缓存', async () => {
  const { repository } = makeRepo();
  await repository.upsertEntry({ date: '2026-11-18', status: '平稳', scene: '工作' });
  await repository.upsertEntry({ date: '2026-11-16', status: '紧绷', scene: '工作' });
  const sorted = await repository.listEntries();
  assert.deepEqual(
    sorted.map((item) => item.date),
    ['2026-11-16', '2026-11-18'],
  );

  await repository.saveWeeklySnapshot({
    id: 'u_test:2026-11-16',
    userId: 'u_test',
    weekStart: '2026-11-16',
    patterns: [],
    generatedAt: 1,
  });
  await repository.replaceEntries([
    entry('2026-11-17', '兴奋', '独处'),
    entry('2026-11-17', '平稳', '家庭'),
  ]);
  const replaced = await repository.listEntries();
  assert.equal(replaced.length, 1);
  assert.equal(replaced[0].status, '平稳');
  assert.equal(replaced[0].userId, 'u_test');
  assert.equal(await repository.getWeeklySnapshot('2026-11-16'), null);
});

test('清空数据删除前缀下全部键，不影响其他应用键', async () => {
  const { repository } = makeRepo();
  await repository.upsertEntry({
    date: '2026-11-18',
    status: '平稳',
    scene: '工作',
    note: '私人内容',
  });
  await repository.setEntitlement(createMockProEntitlement('u_test', true));
  await repository.saveWeeklySnapshot({
    id: 'u_test:2026-11-16',
    userId: 'u_test',
    weekStart: '2026-11-16',
    patterns: [],
    generatedAt: 1,
  });
  repository.memory.set('other.app', 'keep-me');
  assert.ok(repository.memory.snapshot()['today-role.v1.entries']);

  await repository.clearAll();
  assert.deepEqual(repository.memory.snapshot(), { 'other.app': 'keep-me' });
  assert.equal((await repository.listEntries()).length, 0);
  // 清空后单纯读取（含导出）不应重新生成 user 键
  await repository.exportAll();
  assert.deepEqual(repository.memory.snapshot(), { 'other.app': 'keep-me' });
});

test('导出 JSON 结构可读且包含记录 / 权益 / 快照', async () => {
  const { repository } = makeRepo();
  await repository.upsertEntry({
    date: '2026-11-18',
    status: '低电量',
    scene: '身体',
    note: '早睡',
  });
  await repository.setEntitlement(createMockProEntitlement('u_test', true));
  const bundle = await repository.exportAll();
  assert.equal(bundle.schemaVersion, 1);
  assert.equal(bundle.app, 'today-role');
  assert.equal(bundle.entries.length, 1);
  assert.equal(bundle.entitlement?.isPro, true);
  assert.equal(bundle.entitlement?.plan, 'mock_pro');
  assert.ok(bundle.exportedAt.includes('T'));

  const parsed = JSON.parse(JSON.stringify(bundle)) as typeof bundle;
  assert.equal(parsed.entries[0].note, '早睡');
});

test('Mock 权益开关与过期判定', async () => {
  const { repository } = makeRepo();
  assert.equal((await repository.getEntitlement()).isPro, false);

  await repository.setEntitlement(createMockProEntitlement('u_test', true));
  const pro = await repository.getEntitlement();
  assert.equal(pro.isPro, true);
  assert.equal(pro.plan, 'mock_pro');
  assert.equal(isProActive(pro, 1000), true);

  const expired = { ...pro, expiresAt: 500 };
  assert.equal(isProActive(expired, 1000), false);

  await repository.setEntitlement(createMockProEntitlement('u_test', false));
  assert.equal((await repository.getEntitlement()).isPro, false);
});
