import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addDays,
  daysInMonth,
  formatMonthDay,
  isValidDateKey,
  isValidMonthKey,
  monthKey,
  nextWeekdayKey,
  parseDateKey,
  previousMonthKey,
  startOfWeekMonday,
  toDateKey,
  weekdayIndex,
} from '../miniprogram/core/date';

test('toDateKey 使用本地日期，不因时区截断', () => {
  assert.equal(toDateKey(new Date(2026, 10, 18, 0, 0, 1)), '2026-11-18');
  assert.equal(toDateKey(new Date(2026, 10, 18, 23, 59, 59)), '2026-11-18');
  assert.equal(toDateKey(new Date(2026, 0, 1, 12, 0, 0)), '2026-01-01');
});

test('parseDateKey 拒绝不存在的日期', () => {
  assert.equal(toDateKey(parseDateKey('2026-02-28')), '2026-02-28');
  assert.throws(() => parseDateKey('2026-02-30'));
  assert.throws(() => parseDateKey('2026-13-01'));
  assert.throws(() => parseDateKey('2026-1-1'));
  assert.equal(isValidDateKey('2026-11-18'), true);
  assert.equal(isValidDateKey('2026-11-18T00:00:00'), false);
});

test('周一为一周起点', () => {
  const wednesday = new Date(2026, 10, 18);
  assert.equal(weekdayIndex(wednesday), 3);
  assert.equal(toDateKey(startOfWeekMonday(wednesday)), '2026-11-16');
  assert.equal(toDateKey(startOfWeekMonday(new Date(2026, 10, 22))), '2026-11-16');
  assert.equal(toDateKey(startOfWeekMonday(new Date(2026, 10, 16))), '2026-11-16');
  assert.equal(toDateKey(startOfWeekMonday(new Date(2026, 10, 23))), '2026-11-23');
});

test('月份边界与闰年', () => {
  assert.equal(previousMonthKey('2026-01'), '2025-12');
  assert.equal(previousMonthKey('2026-11'), '2026-10');
  assert.equal(daysInMonth('2028-02'), 29);
  assert.equal(daysInMonth('2026-02'), 28);
  assert.equal(daysInMonth('2026-11'), 30);
  assert.equal(monthKey(new Date(2026, 10, 30)), '2026-11');
  assert.equal(isValidMonthKey('2026-12'), true);
  assert.equal(isValidMonthKey('2026-13'), false);
});

test('addDays 跨月保持本地日历日', () => {
  assert.equal(toDateKey(addDays(new Date(2026, 10, 30), 1)), '2026-12-01');
  assert.equal(toDateKey(addDays(new Date(2026, 0, 1), -1)), '2025-12-31');
  assert.equal(toDateKey(addDays(new Date(2026, 10, 18), -6)), '2026-11-12');
});

test('nextWeekdayKey 严格指向未来', () => {
  assert.equal(nextWeekdayKey('2026-11-18', 1), '2026-11-23');
  assert.equal(nextWeekdayKey('2026-11-18', 3), '2026-11-25');
  assert.equal(nextWeekdayKey('2026-11-18', 5), '2026-11-20');
});

test('展示格式稳定', () => {
  assert.equal(formatMonthDay('2026-11-02'), '11-02');
  assert.equal(formatMonthDay('bad'), 'bad');
});
