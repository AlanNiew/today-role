import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isLegacyScene,
  migrateEntries,
  migrateScene,
  TAXONOMY_VERSION,
} from '../miniprogram/core/migration';
import { LocalRepository } from '../miniprogram/core/repository/local';
import type { KeyValueStorage } from '../miniprogram/core/repository/types';

class MemoryStorage implements KeyValueStorage {
  private readonly map = new Map<string, string>();

  get(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.map.set(key, value);
  }

  remove(key: string): void {
    this.map.delete(key);
  }

  keys(): string[] {
    return [...this.map.keys()];
  }
}

test('分类版本为 2', () => {
  assert.equal(TAXONOMY_VERSION, 2);
});

test('旧场景值映射：工作→工作/学习、关系→人际', () => {
  assert.equal(migrateScene('工作'), '工作/学习');
  assert.equal(migrateScene('关系'), '人际');
  assert.equal(isLegacyScene('工作'), true);
  assert.equal(isLegacyScene('关系'), true);
});

test('新场景值与未知值原样保留，不误伤', () => {
  assert.equal(migrateScene('工作/学习'), '工作/学习');
  assert.equal(migrateScene('人际'), '人际');
  assert.equal(migrateScene('独处'), '独处');
  assert.equal(migrateScene('身体'), '身体');
  assert.equal(migrateScene('家庭'), '家庭');
  assert.equal(migrateScene('旅行'), '旅行');
  assert.equal(isLegacyScene('旅行'), false);
});

test('迁移记录：只改 scene，其余字段与顺序保持不变，不丢记录', () => {
  const raw = [
    { date: '2026-11-01', status: '紧绷', scene: '工作', note: '开会' },
    { date: '2026-11-02', status: '开心', scene: '关系' },
    { date: '2026-11-03', status: '平稳', scene: '家庭' },
    { date: '2026-11-04', status: '低落', scene: '旅行' },
    null,
  ];
  const result = migrateEntries(raw);

  assert.equal(result.changed, 2);
  assert.equal(result.entries.length, 5);
  assert.deepEqual(result.entries[0], {
    date: '2026-11-01',
    status: '紧绷',
    scene: '工作/学习',
    note: '开会',
  });
  assert.equal((result.entries[1] as { scene: string }).scene, '人际');
  assert.equal((result.entries[2] as { scene: string }).scene, '家庭');
  assert.equal((result.entries[3] as { scene: string }).scene, '旅行');
  assert.equal(result.entries[4], null);
  assert.deepEqual(result.unknownScenes, ['旅行']);
});

test('迁移记录：非数组与空数组安全返回', () => {
  assert.deepEqual(migrateEntries(null), { entries: [], changed: 0, unknownScenes: [] });
  assert.deepEqual(migrateEntries({}), { entries: [], changed: 0, unknownScenes: [] });
  assert.deepEqual(migrateEntries([]), { entries: [], changed: 0, unknownScenes: [] });
});

test('迁移幂等：已是新值时 changed 为 0', () => {
  const result = migrateEntries([
    { date: '2026-11-01', status: '平稳', scene: '工作/学习' },
    { date: '2026-11-02', status: '平稳', scene: '人际' },
  ]);
  assert.equal(result.changed, 0);
  assert.deepEqual(result.unknownScenes, []);
});

test('仓储启动时执行一次迁移：改场景、清缓存、写 meta，且二次启动不再改', async () => {
  const prefix = 'today-role.v1.';
  const storage = new MemoryStorage();
  storage.set(
    `${prefix}entries`,
    JSON.stringify([
      { id: 'u:2026-11-01', userId: 'u', date: '2026-11-01', status: '紧绷', scene: '工作' },
      { id: 'u:2026-11-02', userId: 'u', date: '2026-11-02', status: '开心', scene: '关系' },
    ]),
  );
  storage.set(`${prefix}weekly`, JSON.stringify({ '2026-11-02': { weekStart: '2026-11-02' } }));
  storage.set(`${prefix}monthly`, JSON.stringify({ '2026-11': { month: '2026-11' } }));

  const repository = new LocalRepository(storage, { prefix, userId: 'u', now: () => 1 });
  const entries = await repository.listEntries();

  assert.deepEqual(
    entries.map((item) => item.scene),
    ['工作/学习', '人际'],
  );
  assert.equal(storage.get(`${prefix}weekly`), null);
  assert.equal(storage.get(`${prefix}monthly`), null);
  assert.deepEqual(JSON.parse(storage.get(`${prefix}meta`) ?? '{}'), {
    taxonomyVersion: TAXONOMY_VERSION,
  });

  // 二次启动：已迁移，不再改写 entries
  const before = storage.get(`${prefix}entries`);
  const again = new LocalRepository(storage, { prefix, userId: 'u', now: () => 1 });
  await again.listEntries();
  assert.equal(storage.get(`${prefix}entries`), before);
});
