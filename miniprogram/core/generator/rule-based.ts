import {
  formatMonthDay,
  isValidMonthKey,
  monthLabel,
  nextWeekdayKey,
  parseDateKey,
  previousMonthKey,
  startOfWeekMonday,
  toDateKey,
  weekdayIndex,
  weekdayLabel,
} from '../date';
import {
  averageStatusScore,
  comboCount,
  comboCounts,
  countByScene,
  countByStatus,
  dominantStatus,
  filterByMonth,
  maxConsecutiveLowDays,
  percent,
  recentEntries,
  round1,
  sceneStats,
  statusScore,
  topScenes,
  uniqueRecordedDays,
  weekdayName,
  weekdayStats,
} from '../stats';
import {
  SCENES,
  STATUSES,
  type DailyEntry,
  type GenerationResult,
  type MonthlyCard,
  type MonthlyInsights,
  type Pattern,
  type Scene,
  type Status,
  type TodayFragment,
  type WeeklySnapshot,
} from '../types';
import type {
  MonthlyCardInput,
  MonthlyInsightsInput,
  RoleGenerator,
  TodayFragmentInput,
  WeeklySnapshotInput,
} from './types';

/** 状态 × 场景的今日碎片标签。只描述当天角色，不给人贴固定标签。 */
const TODAY_LABELS: Record<Status, Record<Scene, string>> = {
  兴奋: {
    '工作/学习': '全速推进的发起者',
    人际: '主动靠近的连接者',
    家庭: '带动气氛的召集人',
    独处: '灵感在线的探索者',
    身体: '想动起来的行动派',
  },
  开心: {
    '工作/学习': '越做越顺的人',
    人际: '愿意多聊两句的人',
    家庭: '好脾气的相处者',
    独处: '乐在其中的自处者',
    身体: '走路带风的人',
  },
  紧绷: {
    '工作/学习': '硬撑的协调者',
    人际: '小心拿捏的沟通者',
    家庭: '顾全各方的调度员',
    独处: '停不下来的复盘者',
    身体: '绷着弦的赶路人',
  },
  烦躁: {
    '工作/学习': '反复切回来的推进者',
    人际: '耐心在排队的回应者',
    家庭: '先稳住场面的家人',
    独处: '想先关掉弹窗的人',
    身体: '一路小跑的救火队员',
  },
  平稳: {
    '工作/学习': '按节奏推进的人',
    人际: '稳稳在场的陪伴者',
    家庭: '维持日常的定心丸',
    独处: '自得其乐的整理者',
    身体: '留意信号的观察者',
  },
  低落: {
    '工作/学习': '撑着做完的坚持者',
    人际: '话变少了的人',
    家庭: '安静在场的家人',
    独处: '慢慢消化的独处者',
    身体: '想先歇一歇的人',
  },
  低电量: {
    '工作/学习': '省电模式的工作者',
    人际: '先给自己留电的回应者',
    家庭: '低音量参与的家人',
    独处: '安静充电的休整者',
    身体: '提前收工的照顾者',
  },
  麻木: {
    '工作/学习': '按部就班的打卡者',
    人际: '暂时离线的倾听者',
    家庭: '照常运转的家人',
    独处: '放空中的待机者',
    身体: '把身体调成静音的人',
  },
};

interface SceneWithCount {
  scene: Scene;
  count: number;
}

function topSceneOf(entries: DailyEntry[]): SceneWithCount | null {
  const counts = countByScene(entries);
  let best: SceneWithCount | null = null;
  for (const scene of SCENES) {
    const count = counts[scene];
    if (count > 0 && (!best || count > best.count)) {
      best = { scene, count };
    }
  }
  return best;
}

function countText(count: number): string {
  return `${count} 天`;
}

function buildPatternHighFrequency(entries: DailyEntry[], days: number): Pattern {
  const combos = comboCounts(entries);
  const top = combos[0];
  if (!top) {
    return {
      title: '高频组合：暂缺',
      description: `最近 7 天记录了 ${days} 天，但还没有可用于统计的组合。`,
      isCounterIntuitive: false,
    };
  }
  return {
    title: `高频组合：${top.status} × ${top.scene}`,
    description: `最近 7 天记录了 ${days} 天。出现最多的是「${top.scene} × ${top.status}」，共 ${countText(
      top.count,
    )}，占 ${percent(top.count, days)}%。`,
    isCounterIntuitive: false,
  };
}

function buildPatternCounterIntuitive(entries: DailyEntry[], days: number): Pattern {
  const sortedByScore = [...entries].sort((a, b) => {
    const diff = statusScore(a.status) - statusScore(b.status);
    if (diff !== 0) {
      return diff;
    }
    return a.date < b.date ? 1 : -1;
  });
  const lowest = sortedByScore[0];
  if (lowest) {
    const lowestDate = parseDateKey(lowest.date);
    const weekday = weekdayIndex(lowestDate);
    if (weekday !== 1 && weekday !== 5) {
      return {
        title: '低点不在周初或周五',
        description: `最近 7 天有 ${days} 天记录，状态参考值最低的一天是${weekdayLabel(
          lowestDate,
        )}（${formatMonthDay(lowest.date)}，「${lowest.scene} × ${lowest.status}」），不在通常以为的周一或周五。`,
        isCounterIntuitive: true,
      };
    }
  }

  const overallAverage = averageStatusScore(entries);
  if (overallAverage !== null) {
    const deviations = sceneStats(entries)
      .filter((item) => item.count >= 2 && overallAverage - item.average >= 0.8)
      .sort((a, b) => a.average - b.average);
    const strongest = deviations[0];
    if (strongest) {
      return {
        title: `场景落差：${strongest.scene}`,
        description: `最近 7 天有 ${days} 天记录，「${strongest.scene}」共 ${countText(
          strongest.count,
        )}，平均状态参考值 ${round1(strongest.average)}，比整体 ${round1(overallAverage)} 低 ${round1(
          overallAverage - strongest.average,
        )}。`,
        isCounterIntuitive: true,
      };
    }
  }

  const multiDayScenes = sceneStats(entries)
    .filter((item) => item.count >= 2)
    .sort((a, b) => (a.scene < b.scene ? -1 : 1));
  if (multiDayScenes.length >= 2) {
    const byRange = [...multiDayScenes].sort(
      (a, b) => a.max - a.min - (b.max - b.min) || (a.scene < b.scene ? -1 : 1),
    );
    const stable = byRange[0];
    const volatile = byRange[byRange.length - 1];
    return {
      title: '最稳定与最波动的场景',
      description: `最近 7 天有 ${days} 天记录，「${stable.scene}」的 ${stable.count} 天状态最集中（跨度 ${
        stable.max - stable.min
      }）；「${volatile.scene}」的 ${volatile.count} 天跨度最大（${
        volatile.max - volatile.min
      }）。本周未出现更强的反常识模式。`,
      isCounterIntuitive: false,
    };
  }

  const mainScene = topSceneOf(entries);
  return {
    title: '暂无可验证的反常识模式',
    description: `最近 7 天有 ${days} 天记录，暂未出现可验证的反常识模式；记录最多的是「${
      mainScene ? mainScene.scene : '暂无'
    }」（${mainScene ? mainScene.count : 0} 天）。`,
    isCounterIntuitive: false,
  };
}

function buildTension(entries: DailyEntry[], distribution: Record<Status, number>): string {
  let concentration: {
    status: Status;
    total: number;
    scene: Scene;
    count: number;
    ratio: number;
  } | null = null;
  for (const status of STATUSES) {
    const total = distribution[status];
    if (total < 2) {
      continue;
    }
    const statusEntries = entries.filter((entry) => entry.status === status);
    const main = topSceneOf(statusEntries);
    if (!main || main.count < 2) {
      continue;
    }
    const ratio = main.count / total;
    if (
      ratio >= 0.7 &&
      (!concentration ||
        ratio > concentration.ratio ||
        (ratio === concentration.ratio && total < concentration.total))
    ) {
      concentration = { status, total, scene: main.scene, count: main.count, ratio };
    }
  }
  if (concentration) {
    return `本月「${concentration.status}」出现 ${countText(
      concentration.total,
    )}，其中 ${countText(concentration.count)}集中在「${concentration.scene}」。`;
  }

  const overallAverage = averageStatusScore(entries);
  if (overallAverage !== null) {
    const deviations = sceneStats(entries)
      .filter((item) => item.count >= 3)
      .map((item) => ({ ...item, diff: overallAverage - item.average }))
      .filter((item) => Math.abs(item.diff) >= 0.7)
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    const strongest = deviations[0];
    if (strongest) {
      return `「${strongest.scene}」场景 ${countText(strongest.count)}的平均状态参考值 ${round1(
        strongest.average,
      )}，整体为 ${round1(overallAverage)}，相差 ${round1(Math.abs(strongest.diff))}。`;
    }
  }

  const dominant = dominantStatus(entries);
  if (dominant && dominant.count >= 5) {
    const rare = STATUSES.filter(
      (status) =>
        status !== dominant.status && distribution[status] > 0 && distribution[status] <= 2,
    ).sort((a, b) => distribution[a] - distribution[b])[0];
    if (rare) {
      const rareEntries = entries.filter((entry) => entry.status === rare);
      const scenes = Array.from(new Set(rareEntries.map((entry) => entry.scene)));
      const sceneText = scenes.length === 1 ? `，且都在「${scenes[0]}」` : '';
      return `本月以「${dominant.status}」为主（${countText(dominant.count)}），「${rare}」只出现 ${countText(
        distribution[rare],
      )}${sceneText}。`;
    }
  }

  if (dominant) {
    const rest = uniqueRecordedDays(entries).length - dominant.count;
    if (rest <= 0) {
      return `本月 ${uniqueRecordedDays(entries).length} 天记录都标记为「${dominant.status}」，暂未出现例外。`;
    }
    return `本月 ${uniqueRecordedDays(entries).length} 天记录里，「${dominant.status}」出现 ${countText(
      dominant.count,
    )}，其余状态较分散，暂未出现明显例外。`;
  }
  return '本月记录不足，暂未形成例外 / 张力观察。';
}

function buildActionSuggestion(entries: DailyEntry[], today: Date): string {
  const stats = weekdayStats(entries).filter((item) => item.count >= 2);
  if (stats.length > 0) {
    const lowest = [...stats].sort((a, b) => a.average - b.average || a.weekday - b.weekday)[0];
    const nextDate = nextWeekdayKey(toDateKey(today), lowest.weekday);
    return `下${weekdayName(lowest.weekday)}（${formatMonthDay(
      nextDate,
    )}）如果安排偏满，可以预留 15 分钟空档；本月${weekdayName(
      lowest.weekday,
    )}的平均状态参考值最低（${round1(lowest.average)}，共 ${countText(lowest.count)}）。`;
  }
  const main = topSceneOf(entries);
  if (main) {
    return `下次进入「${main.scene}」场景前，先留 1 分钟确认当下状态；本月该场景出现 ${countText(
      main.count,
    )}，是最高频场景。`;
  }
  return `本月已记录 ${uniqueRecordedDays(entries).length} 天，可以在每天记录后停 10 秒，看看当天最常出现的组合是否和预期一致。`;
}

function buildComparison(
  entries: DailyEntry[],
  month: string,
  days: number,
): MonthlyInsights['comparison'] {
  const previousMonth = previousMonthKey(month);
  const previousEntries = filterByMonth(entries, previousMonth);
  const previousDays = uniqueRecordedDays(previousEntries).length;
  if (previousDays < 3) {
    return {
      available: false,
      previousMonth,
      previousRecordedDays: previousDays,
      currentRecordedDays: days,
      summary: `上月（${monthLabel(previousMonth)}）有效记录 ${previousDays} 天，少于 3 天，暂不做对比。`,
      statusShift: '上月记录不足 3 天，无法比较主导状态。',
      sceneShift: '上月记录不足 3 天，无法比较高频场景。',
    };
  }

  const currentEntries = filterByMonth(entries, month);
  const previousDominant = dominantStatus(previousEntries);
  const currentDominant = dominantStatus(currentEntries);
  const previousScene = topScenes(previousEntries, 1)[0];
  const currentScene = topScenes(currentEntries, 1)[0];
  return {
    available: true,
    previousMonth,
    previousRecordedDays: previousDays,
    currentRecordedDays: days,
    summary: `上月（${monthLabel(previousMonth)}）记录 ${previousDays} 天，本月记录 ${days} 天，相差 ${Math.abs(
      days - previousDays,
    )} 天。`,
    statusShift:
      previousDominant && currentDominant
        ? `上月以「${previousDominant.status}」为主（${previousDominant.count}/${previousDays} 天），` +
          `本月以「${currentDominant.status}」为主（${currentDominant.count}/${days} 天）。`
        : '主导状态数据不足，暂不比较。',
    sceneShift:
      previousScene && currentScene
        ? `上月最高频场景是「${previousScene.scene}」（${previousScene.count} 天），` +
          `本月是「${currentScene.scene}」（${currentScene.count} 天）。`
        : '高频场景数据不足，暂不比较。',
  };
}

function buildProInsights(input: MonthlyInsightsInput): MonthlyInsights {
  const { entries, month, today } = input;
  const monthEntries = filterByMonth(entries, month);
  const days = uniqueRecordedDays(monthEntries).length;
  const triggers: string[] = [];

  const mainScene = topScenes(monthEntries, 1)[0];
  if (mainScene) {
    const sceneEntries = monthEntries.filter((entry) => entry.scene === mainScene.scene);
    const sceneDistribution = countByStatus(sceneEntries);
    const ranked = STATUSES.filter((status) => sceneDistribution[status] > 0).sort(
      (a, b) => sceneDistribution[b] - sceneDistribution[a],
    );
    const first = ranked[0];
    const second = ranked[1];
    if (first) {
      const secondText = second
        ? `，其次是「${second}」（${countText(sceneDistribution[second])}）`
        : '';
      triggers.push(
        `「${mainScene.scene}」的 ${countText(mainScene.count)}里，出现最多的是「${first}」（${countText(
          sceneDistribution[first],
        )}）${secondText}。这是共现观察，不代表因果。`,
      );
    }
  }

  const lowEntries = monthEntries.filter((entry) => statusScore(entry.status) <= 2);
  const lowScene = topSceneOf(lowEntries);
  if (lowScene && lowScene.count >= 2) {
    triggers.push(
      `状态参考值较低的 ${countText(lowEntries.length)}里，有 ${countText(lowScene.count)}在「${
        lowScene.scene
      }」。这是共现观察，不代表因果。`,
    );
  }

  const combos = comboCounts(monthEntries);
  if (combos[0]) {
    triggers.push(
      `「${combos[0].scene} × ${combos[0].status}」出现 ${countText(
        combos[0].count,
      )}，占本月 ${days} 天的 ${percent(combos[0].count, days)}%，是本月最集中的组合。`,
    );
  }

  if (triggers.length < 2) {
    const dominant = dominantStatus(monthEntries);
    if (dominant) {
      triggers.push(
        `本月出现最多的是「${dominant.status}」（${countText(dominant.count)}），占 ${percent(
          dominant.count,
          days,
        )}%。`,
      );
    }
  }

  const firstCombo = combos[0];
  const secondCombo = combos[1];
  const coOccurrence = firstCombo
    ? `「${firstCombo.scene} × ${firstCombo.status}」${countText(firstCombo.count)}，占本月 ${days} 天的 ${percent(
        firstCombo.count,
        days,
      )}%；${
        secondCombo
          ? `其次是「${secondCombo.scene} × ${secondCombo.status}」（${countText(secondCombo.count)}）。`
          : '没有第二个重复出现的组合。'
      }以上仅表示共现，不代表因果。`
    : `本月记录 ${days} 天，暂未形成可统计的组合。`;

  const actionPlan: string[] = [];
  const weekdayCandidates = weekdayStats(monthEntries).filter((item) => item.count >= 2);
  if (weekdayCandidates.length > 0) {
    const lowestWeekday = [...weekdayCandidates].sort(
      (a, b) => a.average - b.average || a.weekday - b.weekday,
    )[0];
    const nextDate = nextWeekdayKey(toDateKey(today), lowestWeekday.weekday);
    actionPlan.push(
      `把${weekdayName(lowestWeekday.weekday)}（${formatMonthDay(
        nextDate,
      )}）的安排留出 15 分钟空档；本月该星期平均状态参考值最低（${round1(
        lowestWeekday.average,
      )}，共 ${countText(lowestWeekday.count)}）。`,
    );
  }

  if (mainScene) {
    const sceneDistribution = countByStatus(
      monthEntries.filter((entry) => entry.scene === mainScene.scene),
    );
    const topSceneStatus = STATUSES.filter((status) => sceneDistribution[status] > 0).sort(
      (a, b) => sceneDistribution[b] - sceneDistribution[a],
    )[0];
    actionPlan.push(
      `进入「${mainScene.scene}」前做一次 1 分钟状态确认；本月它为最高频场景（${countText(
        mainScene.count,
      )}）${topSceneStatus ? `，也是「${topSceneStatus}」出现最多的地方（${countText(sceneDistribution[topSceneStatus])}）` : ''}。`,
    );
  }

  const lowRun = maxConsecutiveLowDays(monthEntries);
  if (lowRun >= 2) {
    actionPlan.push(
      `本月出现过连续 ${lowRun} 天的低状态记录；下一次连续到第 2 天时，主动减掉一件非必要事项。`,
    );
  } else {
    const bestScene = sceneStats(monthEntries)
      .filter((item) => item.count >= 2)
      .sort((a, b) => b.average - a.average)[0];
    if (bestScene) {
      actionPlan.push(
        `「${bestScene.scene}」是本月平均状态参考值最高的场景（${round1(
          bestScene.average,
        )}，共 ${countText(bestScene.count)}），可以在连续工作日后主动留出类似时段。`,
      );
    } else {
      actionPlan.push(`本月记录 ${days} 天，继续保持每天 5 秒的记录节奏，月底再看分布变化。`);
    }
  }

  return {
    month,
    triggers: triggers.slice(0, 3),
    coOccurrence,
    comparison: buildComparison(entries, month, days),
    actionPlan: actionPlan.slice(0, 3),
    generatedAt: input.now ?? Date.now(),
  };
}

/**
 * MVP 规则模板生成器。
 * 所有描述都带数量 / 日期 / 次数锚点；不读取 note；不给人下结论。
 */
export class RuleBasedGenerator implements RoleGenerator {
  async generateTodayFragment(input: TodayFragmentInput): Promise<TodayFragment> {
    const { entry } = input;
    const windowEntries = recentEntries(input.entries, parseDateKey(entry.date), 7);
    const sameCombo = comboCount(windowEntries, entry.status, entry.scene);
    const statusDays = windowEntries.filter((item) => item.status === entry.status).length;
    const sceneDays = windowEntries.filter((item) => item.scene === entry.scene).length;

    const explanation =
      `今天你在「${entry.scene}」场景下记录为「${entry.status}」。` +
      `最近 7 天（含今天）里，这个组合出现 ${sameCombo} 天；` +
      `「${entry.status}」共出现 ${statusDays} 天，「${entry.scene}」共出现 ${sceneDays} 天。`;

    return {
      date: entry.date,
      label: TODAY_LABELS[entry.status][entry.scene],
      explanation,
      dataAnchors: [
        `近 7 天同组合：${sameCombo} 天`,
        `近 7 天「${entry.status}」：${statusDays} 天`,
        `近 7 天「${entry.scene}」：${sceneDays} 天`,
      ],
      generatedAt: input.now ?? Date.now(),
    };
  }

  async generateWeeklySnapshot(
    input: WeeklySnapshotInput,
  ): Promise<GenerationResult<WeeklySnapshot>> {
    const windowEntries = recentEntries(input.entries, input.today, 7);
    const days = uniqueRecordedDays(windowEntries).length;
    if (days < 3) {
      return {
        ok: false,
        code: 'not-enough-data',
        scope: 'weekly',
        recordedDays: days,
        requiredDays: 3,
        message: `最近 7 天已记录 ${days} 天，还差 ${3 - days} 天可生成周快照。`,
      };
    }

    const weekStart = toDateKey(startOfWeekMonday(input.today));
    const patterns = [
      buildPatternHighFrequency(windowEntries, days),
      buildPatternCounterIntuitive(windowEntries, days),
    ];
    return {
      ok: true,
      value: {
        id: `${input.userId}:${weekStart}`,
        userId: input.userId,
        weekStart,
        patterns,
        generatedAt: input.now ?? Date.now(),
      },
    };
  }

  async generateMonthlyCard(input: MonthlyCardInput): Promise<GenerationResult<MonthlyCard>> {
    if (!isValidMonthKey(input.month)) {
      throw new Error(`无效月份：${input.month}`);
    }
    const monthEntries = filterByMonth(input.entries, input.month);
    const days = uniqueRecordedDays(monthEntries).length;
    if (days < 10) {
      return {
        ok: false,
        code: 'not-enough-data',
        scope: 'monthly',
        recordedDays: days,
        requiredDays: 10,
        message: `本月已记录 ${days} 天，还差 ${10 - days} 天可生成月角色卡。`,
      };
    }

    const statusDistribution = countByStatus(monthEntries);
    return {
      ok: true,
      value: {
        id: `${input.userId}:${input.month}`,
        userId: input.userId,
        month: input.month,
        statusDistribution,
        topScenes: topScenes(monthEntries, 2),
        tension: buildTension(monthEntries, statusDistribution),
        actionSuggestion: buildActionSuggestion(monthEntries, input.today),
        generatedAt: input.now ?? Date.now(),
      },
    };
  }

  async buildMonthlyInsights(input: MonthlyInsightsInput): Promise<MonthlyInsights> {
    return buildProInsights(input);
  }
}
