import { parseDateKey, toDateKey, weekdayLabel } from '../../core/date';
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
    if (!value || !(STATUSES as readonly string[]).includes(value)) {
      return;
    }
    this.setData({ selectedStatus: value as Status });
  },

  onSelectScene(event: TapEvent) {
    if (this.data.loading) {
      return;
    }
    const value = event.currentTarget.dataset.value;
    if (!value || !(SCENES as readonly string[]).includes(value)) {
      return;
    }
    this.setData({ selectedScene: value as Scene });
  },

  onNoteInput(event: NoteEvent) {
    this.setData({ note: event.detail.value.slice(0, 100) });
  },

  async onSave() {
    if (this.data.saving) {
      return;
    }
    const { selectedStatus, selectedScene, note, todayKey, hasEntry } = this.data;
    if (!selectedStatus) {
      wx.showToast({ title: '先选一个状态', icon: 'none' });
      return;
    }
    if (!selectedScene) {
      wx.showToast({ title: '再选一个场景', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    try {
      const repository = getApp<IAppOption>().globalData.repository;
      await repository.upsertEntry({
        date: todayKey,
        status: selectedStatus,
        scene: selectedScene,
        note,
      });
      this.setData({ hasEntry: true, saving: false });
      wx.navigateTo({
        url: `/pages/today-result/today-result?date=${todayKey}&saved=${hasEntry ? 'updated' : 'created'}`,
      });
    } catch (error) {
      console.error('保存记录失败', error);
      this.setData({ saving: false });
      const message = error instanceof Error ? error.message : '保存失败，请重试';
      wx.showToast({ title: message, icon: 'none' });
    }
  },
});
