import { LocalRepository, type LocalRepositoryOptions } from './local';
import type { KeyValueStorage } from './types';

/** 测试 / 本地预览用的内存 KV */
export class MemoryStorage implements KeyValueStorage {
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
    return Array.from(this.map.keys());
  }

  snapshot(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of this.map.entries()) {
      result[key] = value;
    }
    return result;
  }
}

export class MemoryRepository extends LocalRepository {
  readonly memory: MemoryStorage;

  constructor(options: LocalRepositoryOptions = {}) {
    const storage = new MemoryStorage();
    super(storage, options);
    this.memory = storage;
  }
}
