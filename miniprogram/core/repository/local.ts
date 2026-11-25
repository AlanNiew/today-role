import { isValidDateKey } from '../date';
import { createFreeEntitlement } from '../entitlement';
import { isKnownScene, isKnownStatus, sortByDate } from '../stats';
import type { DailyEntry, Entitlement, MonthlyCard, WeeklySnapshot } from '../types';
import type {
  ExportBundle,
  KeyValueStorage,
  Repository,
  UpsertEntryInput,
  UpsertEntryResult,
} from './types';

const DEFAULT_PREFIX = 'today-role.v1.';

export interface LocalRepositoryOptions {
  prefix?: string;
  /** 仅测试用：固定 userId */
  userId?: string;
  /** 仅测试用：固定时钟 */
  now?: () => number;
  /** 仅测试用：固定随机 id */
  idFactory?: () => string;
}

type StoredMap<T> = Record<string, T>;

/**
 * 本地仓储：wx.storage（或任意 KeyValueStorage）。
 * 所有数据都在设备本地，不发起网络请求。
 */
export class LocalRepository implements Repository {
  private readonly storage: KeyValueStorage;
  private readonly prefix: string;
  private readonly now: () => number;
  private readonly idFactory: () => string;
  private readonly fixedUserId?: string;
  private userIdCache: string | null = null;

  constructor(storage: KeyValueStorage, options: LocalRepositoryOptions = {}) {
    this.storage = storage;
    this.prefix = options.prefix ?? DEFAULT_PREFIX;
    this.now = options.now ?? (() => Date.now());
    this.idFactory =
      options.idFactory ??
      (() => `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);
    this.fixedUserId = options.userId;
  }

  private key(name: string): string {
    return `${this.prefix}${name}`;
  }

  private readJson<T>(name: string, fallback: T): T {
    const raw = this.storage.get(this.key(name));
    if (!raw) {
      return fallback;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private writeJson(name: string, value: unknown): void {
    this.storage.set(this.key(name), JSON.stringify(value));
  }

  async getUserId(): Promise<string> {
    if (this.userIdCache) {
      return this.userIdCache;
    }
    if (this.fixedUserId) {
      this.userIdCache = this.fixedUserId;
      return this.userIdCache;
    }
    const stored = this.storage.get(this.key('user'));
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as unknown;
        if (typeof parsed === 'string' && parsed.length > 0) {
          this.userIdCache = parsed;
          return parsed;
        }
      } catch {
        // 落到下面重新生成
      }
    }
    // 只读场景不落盘：清空数据后单纯打开页面不会重新留下标识。
    // 真正写入记录 / 权益 / 演示数据时再持久化，见 markUserIdPersisted。
    const created = this.idFactory();
    this.userIdCache = created;
    return created;
  }

  private markUserIdPersisted(userId: string): void {
    this.writeJson('user', userId);
  }

  /** 按键升序裁剪，只保留最近 limit 条，避免本地存储无限增长。 */
  private pruneMap<T>(map: StoredMap<T>, limit: number): void {
    const keys = Object.keys(map).sort();
    while (keys.length > limit) {
      const oldest = keys.shift();
      if (oldest) {
        delete map[oldest];
      }
    }
  }

  private readEntries(): DailyEntry[] {
    const entries = this.readJson<DailyEntry[]>('entries', []);
    if (!Array.isArray(entries)) {
      return [];
    }
    return sortByDate(
      entries.filter(
        (entry) =>
          entry &&
          isValidDateKey(entry.date) &&
          isKnownStatus(entry.status) &&
          isKnownScene(entry.scene),
      ),
    );
  }

  private writeEntries(entries: DailyEntry[]): void {
    this.writeJson('entries', sortByDate(entries));
  }

  async getEntry(date: string): Promise<DailyEntry | null> {
    return this.readEntries().find((entry) => entry.date === date) ?? null;
  }

  async listEntries(): Promise<DailyEntry[]> {
    return this.readEntries();
  }

  async upsertEntry(input: UpsertEntryInput): Promise<UpsertEntryResult> {
    if (!isValidDateKey(input.date)) {
      throw new Error('日期格式必须是 YYYY-MM-DD');
    }
    if (!isKnownStatus(input.status)) {
      throw new Error('未知状态');
    }
    if (!isKnownScene(input.scene)) {
      throw new Error('未知场景');
    }
    const note = (input.note ?? '').trim();
    if (note.length > 100) {
      throw new Error('一句话最多 100 字');
    }

    const userId = await this.getUserId();
    this.markUserIdPersisted(userId);
    const timestamp = this.now();
    const entries = this.readEntries();
    const index = entries.findIndex((entry) => entry.date === input.date);
    if (index >= 0) {
      const existing = entries[index];
      const updated: DailyEntry = {
        ...existing,
        status: input.status,
        scene: input.scene,
        note: note || undefined,
        updatedAt: timestamp,
      };
      entries[index] = updated;
      this.writeEntries(entries);
      return { entry: updated, created: false };
    }

    const created: DailyEntry = {
      id: `${userId}:${input.date}`,
      userId,
      date: input.date,
      status: input.status,
      scene: input.scene,
      note: note || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    entries.push(created);
    this.writeEntries(entries);
    return { entry: created, created: true };
  }

  async replaceEntries(entries: DailyEntry[]): Promise<void> {
    const userId = await this.getUserId();
    this.markUserIdPersisted(userId);
    const timestamp = this.now();
    const byDate = new Map<string, DailyEntry>();
    for (const entry of entries) {
      if (!isValidDateKey(entry.date)) {
        continue;
      }
      if (!isKnownStatus(entry.status)) {
        continue;
      }
      if (!isKnownScene(entry.scene)) {
        continue;
      }
      byDate.set(entry.date, {
        ...entry,
        userId,
        id: `${userId}:${entry.date}`,
        createdAt: entry.createdAt || timestamp,
        updatedAt: entry.updatedAt || timestamp,
      });
    }
    this.writeEntries(Array.from(byDate.values()));
    this.writeJson('weekly', {});
    this.writeJson('monthly', {});
  }

  async getEntitlement(): Promise<Entitlement> {
    const userId = await this.getUserId();
    const stored = this.readJson<Entitlement | null>('entitlement', null);
    if (!stored || typeof stored !== 'object') {
      return createFreeEntitlement(userId);
    }
    const plan = stored.plan === 'mock_pro' ? 'mock_pro' : 'free';
    return {
      userId,
      isPro: stored.isPro === true,
      plan,
      expiresAt: typeof stored.expiresAt === 'number' ? stored.expiresAt : undefined,
    };
  }

  async setEntitlement(entitlement: Entitlement): Promise<void> {
    const userId = await this.getUserId();
    this.markUserIdPersisted(userId);
    this.writeJson('entitlement', {
      userId,
      isPro: entitlement.isPro === true,
      plan: entitlement.plan === 'mock_pro' ? 'mock_pro' : 'free',
      expiresAt: entitlement.expiresAt,
    });
  }

  async getWeeklySnapshot(weekStart: string): Promise<WeeklySnapshot | null> {
    const map = this.readJson<StoredMap<WeeklySnapshot>>('weekly', {});
    return map && typeof map === 'object' ? (map[weekStart] ?? null) : null;
  }

  async saveWeeklySnapshot(snapshot: WeeklySnapshot): Promise<void> {
    const map = this.readJson<StoredMap<WeeklySnapshot>>('weekly', {});
    map[snapshot.weekStart] = snapshot;
    // 只保留最近 8 周
    this.pruneMap(map, 8);
    this.writeJson('weekly', map);
  }

  async getMonthlyCard(month: string): Promise<MonthlyCard | null> {
    const map = this.readJson<StoredMap<MonthlyCard>>('monthly', {});
    return map && typeof map === 'object' ? (map[month] ?? null) : null;
  }

  async saveMonthlyCard(card: MonthlyCard): Promise<void> {
    const map = this.readJson<StoredMap<MonthlyCard>>('monthly', {});
    map[card.month] = card;
    // 保留最近 6 个月
    this.pruneMap(map, 6);
    this.writeJson('monthly', map);
  }

  async clearAll(): Promise<void> {
    for (const key of this.storage.keys()) {
      if (key.startsWith(this.prefix)) {
        this.storage.remove(key);
      }
    }
    this.userIdCache = null;
  }

  async exportAll(): Promise<ExportBundle> {
    const entries = this.readEntries();
    const entitlement = await this.getEntitlement();
    const weeklyMap = this.readJson<StoredMap<WeeklySnapshot>>('weekly', {});
    const monthlyMap = this.readJson<StoredMap<MonthlyCard>>('monthly', {});
    return {
      schemaVersion: 1,
      app: 'today-role',
      exportedAt: new Date(this.now()).toISOString(),
      entries,
      entitlement,
      weeklySnapshots: Object.values(weeklyMap ?? {}).sort((a, b) =>
        a.weekStart < b.weekStart ? -1 : 1,
      ),
      monthlyCards: Object.values(monthlyMap ?? {}).sort((a, b) => (a.month < b.month ? -1 : 1)),
    };
  }
}
