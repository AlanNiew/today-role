/**
 * 本地时区日期工具。
 * 「哪一天」始终以设备本地时区的 YYYY-MM-DD 为准，不用 UTC 截断。
 */

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY_PATTERN = /^(\d{4})-(\d{2})$/;

export const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const match = DATE_KEY_PATTERN.exec(key);
  if (!match) {
    throw new Error(`无效日期：${key}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`无效日期：${key}`);
  }
  return date;
}

export function isValidDateKey(key: unknown): key is string {
  if (typeof key !== 'string') {
    return false;
  }
  try {
    parseDateKey(key);
    return true;
  } catch {
    return false;
  }
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function daysAgoKey(today: Date, days: number): string {
  return toDateKey(addDays(today, -days));
}

/** 1 = 周一 … 7 = 周日 */
export function weekdayIndex(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export function weekdayLabel(date: Date): string {
  return WEEKDAY_LABELS[weekdayIndex(date) - 1];
}

/** 以周一为一周起点，返回本地 00:00 */
export function startOfWeekMonday(date: Date): Date {
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = weekdayIndex(current) - 1;
  return addDays(current, -offset);
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function isValidMonthKey(key: unknown): key is string {
  if (typeof key !== 'string') {
    return false;
  }
  const match = MONTH_KEY_PATTERN.exec(key);
  if (!match) {
    return false;
  }
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

export function previousMonthKey(month: string): string {
  if (!isValidMonthKey(month)) {
    throw new Error(`无效月份：${month}`);
  }
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  if (monthNumber === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${pad2(monthNumber - 1)}`;
}

export function monthLabel(month: string): string {
  if (!isValidMonthKey(month)) {
    return month;
  }
  const [year, monthText] = month.split('-');
  return `${year}年${Number(monthText)}月`;
}

export function daysInMonth(month: string): number {
  if (!isValidMonthKey(month)) {
    throw new Error(`无效月份：${month}`);
  }
  const [yearText, monthText] = month.split('-');
  return new Date(Number(yearText), Number(monthText), 0).getDate();
}

export function isDateInMonth(dateKey: string, month: string): boolean {
  return typeof dateKey === 'string' && dateKey.slice(0, 7) === month;
}

/** 11月12日 周三 */
export function formatDateLabel(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdayLabel(date)}`;
}

/** 2026-11-12 → 11-12 */
export function formatMonthDay(dateKey: string): string {
  const match = DATE_KEY_PATTERN.exec(dateKey);
  if (!match) {
    return dateKey;
  }
  return `${match[2]}-${match[3]}`;
}

/** 严格晚于 todayKey 的下一个目标星期（1=周一…7=周日） */
export function nextWeekdayKey(todayKey: string, targetWeekday: number): string {
  const today = parseDateKey(todayKey);
  const diff = (targetWeekday - weekdayIndex(today) + 7) % 7;
  return toDateKey(addDays(today, diff === 0 ? 7 : diff));
}

export function compareDateKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
