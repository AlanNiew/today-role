import { isKnownScene } from './stats';
import type { Scene } from './types';

/** v1.1 分类版本：写入 storage meta，保证迁移只执行一次。 */
export const TAXONOMY_VERSION = 2;

/** v1.0 场景值 → v1.1 场景值。 */
const LEGACY_SCENE_MAP: Record<string, Scene> = {
  工作: '工作/学习',
  关系: '人际',
};

/** 旧场景值迁移到 v1.1；非旧值原样返回。 */
export function migrateScene(value: string): Scene {
  return LEGACY_SCENE_MAP[value] ?? (value as Scene);
}

/** 是否为需要迁移的 v1.0 场景值。 */
export function isLegacyScene(value: string): boolean {
  return Object.prototype.hasOwnProperty.call(LEGACY_SCENE_MAP, value);
}

export interface EntryMigration {
  entries: unknown[];
  changed: number;
  /** 无法识别且未被映射的场景值，便于日志排查 */
  unknownScenes: string[];
}

/**
 * 只改 scene，其余字段原样保留；不丢弃任何记录。
 * 纯函数，便于 Node 单测。
 */
export function migrateEntries(raw: unknown): EntryMigration {
  if (!Array.isArray(raw)) {
    return { entries: [], changed: 0, unknownScenes: [] };
  }

  const unknownScenes = new Set<string>();
  let changed = 0;

  const entries = raw.map((item) => {
    if (!item || typeof item !== 'object') {
      return item;
    }
    const scene = (item as { scene?: unknown }).scene;
    if (typeof scene !== 'string') {
      return item;
    }
    const next = migrateScene(scene);
    if (next === scene) {
      if (!isKnownScene(scene)) {
        unknownScenes.add(scene);
      }
      return item;
    }
    changed += 1;
    return { ...(item as Record<string, unknown>), scene: next };
  });

  return { entries, changed, unknownScenes: [...unknownScenes] };
}
