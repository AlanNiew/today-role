import { parseDateKey, toDateKey, weekdayLabel } from '../../core/date';
import { isKnownScene, isKnownStatus } from '../../core/stats';
import { SCENES, STATUSES, type Scene, type Status } from '../../core/types';

type TapEvent = { currentTarget: { dataset: { value?: string } } };
type NoteEvent = { detail: { value: string } };

const STATUS_TONES: Record<Status, string> = {
  平稳: 'calm',
  紧绷: 'tense',
  低电量: 'low',
  兴奋: 'excited',
  烦躁: 'irritated',
  麻木: 'numb',
};

const STATUS_OPTIONS = STATUSES.map((label) => ({ label, tone: STATUS_TONES[label] }));
const SCENE_OPTIONS = SCENES.map((label) => ({ label }));

function greetingOf(hour: number): string {
  if (hour < 6) {
    return '夜深了';
  }
  if (hour < 11) {
    return '早上好';
  }
  if (hour < 14) {
    return '中午好';
  }
  if (hour < 18) {
    return '下午好';
  }
  return '晚上好';
}

Page({
  data: {
    todayKey: '',
    todayMonthDay: '',
    todayWeekday: '',
    greeting: '你好',
    statusOptions: STATUS_OPTIONS,
    sceneOptions: SCENE_OPTIONS,
    selectedStatus: '' as Status | '',
    selectedScene: '' as Scene | '',
    note: '',
    /** 已记录时展示「状态 × 场景」，方便扫一眼今天记了什么 */
    todayCombo: '',
    /** 备注默认收起，把主按钮留在首屏 */
    noteExpanded: false,
    hasEntry: false,
    saving: false,
    loading: true,
  },

  async onShow() {
    const today = new Date();
    const todayKey = toDateKey(today);
    const todayDate = parseDateKey(todayKey);
    this.setData({
      todayKey,
      todayMonthDay: `${todayDate.getMonth() + 1}月${todayDate.getDate()}日`,
      todayWeekday: weekdayLabel(todayDate),
      greeting: greetingOf(today.getHours()),
      loading: true,
    });
    try {
      const repository = getApp<IAppOption>().globalData.repository;
      const entry = await repository.getEntry(todayKey);
      this.setData({
        selectedStatus: entry ? entry.status : '',
        selectedScene: entry ? entry.scene : '',
        note: entry && entry.note ? entry.note : '',
        todayCombo: entry ? `${entry.status} × ${entry.scene}` : '',
        noteExpanded: Boolean(entry && entry.note),
        hasEntry: Boolean(entry),
        loading: false,
      });
    } catch (error) {
      console.error('读取今日记录失败', error);
      this.setData({ loading: false });
      wx.showToast({ title: '本地数据读取失败', icon: 'none' });
    }
  },

  onSelectStatus(event: TapEvent) {
    if (this.data.loading) {
      return;
    }
    const value = event.currentTarget.dataset.value;
    if (!value || !isKnownStatus(value)) {
      return;
    }
    this.setData({ selectedStatus: value });
  },

  onSelectScene(event: TapEvent) {
    if (this.data.loading) {
      return;
    }
    const value = event.currentTarget.dataset.value;
    if (!value || !isKnownScene(value)) {
      return;
    }
    this.setData({ selectedScene: value });
  },

  onNoteInput(event: NoteEvent) {
    this.setData({ note: event.detail.value.slice(0, 100) });
  },

  onExpandNote() {
    this.setData({ noteExpanded: true });
  },

  onCollapseNote() {
    this.setData({ noteExpanded: false });
  },

  /** 已记录时直接查看今日碎片，不必再保存一次 */
  onOpenTodayResult() {
    wx.navigateTo({ url: `/pages/today-result/today-result?date=${this.data.todayKey}` });
  },

  async onSave() {
    if (this.data.saving) {
      return;
    }
    const { selectedStatus, selectedScene, note } = this.data;
    if (!selectedStatus) {
      wx.showToast({ title: '先选一个状态', icon: 'none' });
      return;
    }
    if (!selectedScene) {
      wx.showToast({ title: '再选一个场景', icon: 'none' });
      return;
    }

    // 跨天保护：页面可能在前一天打开、过零点后才点保存。
    // 这时按「此刻的日期」落库并刷新页头，避免把记录写到昨天。
    const now = new Date();
    const saveDate = toDateKey(now);
    const crossedDay = saveDate !== this.data.todayKey;

    this.setData({ saving: true });
    try {
      const repository = getApp<IAppOption>().globalData.repository;
      let hasEntry = this.data.hasEntry;
      if (crossedDay) {
        const existing = await repository.getEntry(saveDate);
        hasEntry = Boolean(existing);
        const saveDateValue = parseDateKey(saveDate);
        this.setData({
          todayKey: saveDate,
          todayMonthDay: `${saveDateValue.getMonth() + 1}月${saveDateValue.getDate()}日`,
          todayWeekday: weekdayLabel(saveDateValue),
          greeting: greetingOf(now.getHours()),
          todayCombo: existing ? `${existing.status} × ${existing.scene}` : '',
          hasEntry,
        });
      }

      await repository.upsertEntry({
        date: saveDate,
        status: selectedStatus,
        scene: selectedScene,
        note,
      });
      this.setData({ hasEntry: true, saving: false });
      if (crossedDay) {
        wx.showToast({ title: '已跨天，记录到今天', icon: 'none' });
      }
      wx.navigateTo({
        url: `/pages/today-result/today-result?date=${saveDate}&saved=${hasEntry ? 'updated' : 'created'}`,
      });
    } catch (error) {
      console.error('保存记录失败', error);
      this.setData({ saving: false });
      const message = error instanceof Error ? error.message : '保存失败，请重试';
      wx.showToast({ title: message, icon: 'none' });
    }
  },
});
