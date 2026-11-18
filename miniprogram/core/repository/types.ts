import type {
  DailyEntry,
  Entitlement,
  MonthlyCard,
  Scene,
  Status,
  WeeklySnapshot,
} from '../types';

/** 最小 KV 抽象：小程序用 wx.storage，测试用内存实现，云端可实现为远程 API。 */
export interface KeyValueStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
}

export interface UpsertEntryInput {
  date: string;
  status: Status;
  scene: Scene;
  note?: string;
}

export interface UpsertEntryResult {
  entry: DailyEntry;
  created: boolean;
}

export interface ExportBundle {
  schemaVersion: 1;
  app: 'today-role';
  exportedAt: string;
  entries: DailyEntry[];
  entitlement: Entitlement | null;
  weeklySnapshots: WeeklySnapshot[];
  monthlyCards: MonthlyCard[];
}

/**
 * 页面只依赖这个接口。
 * 所有方法返回 Promise，未来切云开发时页面逻辑无需改动。
 */
export interface Repository {
  getUserId(): Promise<string>;
  getEntry(date: string): Promise<DailyEntry | null>;
  listEntries(): Promise<DailyEntry[]>;
  upsertEntry(input: UpsertEntryInput): Promise<UpsertEntryResult>;
  /** 整体替换记录（仅开发演示用），同时清理周/月缓存 */
  replaceEntries(entries: DailyEntry[]): Promise<void>;
  getEntitlement(): Promise<Entitlement>;
  setEntitlement(entitlement: Entitlement): Promise<void>;
  getWeeklySnapshot(weekStart: string): Promise<WeeklySnapshot | null>;
  saveWeeklySnapshot(snapshot: WeeklySnapshot): Promise<void>;
  getMonthlyCard(month: string): Promise<MonthlyCard | null>;
  saveMonthlyCard(card: MonthlyCard): Promise<void>;
  /** 真删除：移除前缀下所有键 */
  clearAll(): Promise<void>;
  exportAll(): Promise<ExportBundle>;
}
