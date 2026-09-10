import type { LoadReasonCode, PetMood } from '../domain/models';

export const messageCatalog = {
  'app.loading': '正在准备小窝…',
  'app.defaultName': '团团',
  'app.level': 'TABBIT · 等级 {level}',
  'app.settings': '设置',
  'app.loadLabel': '浏览负载',
  'app.loadAria': '浏览负载 {score}%',
  'app.loadHint': '这是浏览节奏提示，不是效率评分。',
  'app.noLoadFactors': '目前没有明显的负载因素。',
  'app.loadReasonsAria': '浏览负载原因',
  'app.reasonContribution': '+{contribution}',
  'app.focusButton': '开始 25 分钟专注',
  'app.organizeButton': '整理标签页',
  'app.focusDisabled': '专注计时将在后续开发任务中启用',
  'app.organizeReady': '打开整理助手',
  'app.footer': '🍃 {leaves} · XP {xp}',
  'app.spriteLabel': '标签兔状态：{title}',
  'mood.sleeping.title': '睡着啦',
  'mood.calm.title': '轻轻松松',
  'mood.curious.title': '正在探险',
  'mood.busy.title': '有点忙碌',
  'mood.overwhelmed.title': '被标签页埋住了',
  'mood.focused.title': '专注中',
  'mood.celebrating.title': '整理成功',
  'mood.sleeping.day.0': '今天先到这里也可以。',
  'mood.sleeping.lateNight.0': '今晚先到这里，明天再继续也可以。',
  'mood.calm.day.0': '桌面很清爽，适合专心做一件事。',
  'mood.calm.day.1': '今天的标签森林很安静。',
  'mood.calm.lateNight.0': '今晚可以慢慢收尾，让标签森林安静下来。',
  'mood.curious.day.0': '我闻到了几个新标签页的味道。',
  'mood.curious.day.1': '刚才来了好多新页面，我先帮你记着节奏。',
  'mood.curious.lateNight.0': '今晚先留一点探索空间，剩下的明天再看。',
  'mood.busy.day.0': '今天这里有点热闹。',
  'mood.busy.day.1': '要不要先送走 5 个已经看完的标签？',
  'mood.busy.lateNight.0': '已经很晚了，先把整理留到明天也可以。',
  'mood.overwhelmed.day.0': '救救我——先整理五个就很棒。',
  'mood.overwhelmed.day.1': '我们先找出五个看完的页面，不用一次整理完。',
  'mood.overwhelmed.lateNight.0': '今晚不用硬撑，先让标签森林安静下来。',
  'mood.focused.day.0': '我替你守着门，先完成眼前这件事。',
  'mood.focused.lateNight.0': '我替你守着门，时间到了就休息。',
  'mood.celebrating.day.0': '呼！又看见桌面啦。',
  'mood.celebrating.lateNight.0': '呼，今天的整理先收好啦。',
  'mood.curious.openBurst.day.0': '刚才来了好多新页面，我先帮你记着节奏。',
  'mood.curious.openBurst.lateNight.0': '新页面先记在这里，今晚不用继续扩张森林。',
  'mood.busy.openBurst.day.0': '刚才连续打开了不少新页面，要不要先停一下？',
  'mood.busy.openBurst.lateNight.0': '刚才来了不少新页面，今晚先不再加新的啦。',
  'mood.busy.staleRatio.day.0': '有些页面已经安静很久了，可以先看看哪些还需要。',
  'mood.busy.staleRatio.lateNight.0': '有些页面已经安静很久，明天再决定也不迟。',
  'mood.overwhelmed.tabCount.day.0': '标签页有点挤，我们先整理五个就很棒。',
  'mood.overwhelmed.tabCount.lateNight.0': '标签页有点挤，今晚先停在这里，明天再整理。',
  'reason.TAB_COUNT.day': '标签页数量是当前的主要负载',
  'reason.TAB_COUNT.lateNight': '标签页数量有点多，明天再慢慢整理也可以',
  'reason.OPEN_BURST.day': '刚才连续打开了不少新标签页',
  'reason.OPEN_BURST.lateNight': '刚才连续打开了不少新标签页，今晚先停一下',
  'reason.STALE_RATIO.day': '有一部分标签页很久没有访问',
  'reason.STALE_RATIO.lateNight': '有一部分标签页很久没有访问，明天再看看',
  'reason.AUDIO.day': '同时有多个标签页正在发声',
  'reason.AUDIO.lateNight': '同时有多个标签页正在发声，可以先关掉不需要的声音',
  'adoption.progressAria': '领养流程，第 {step} 步，共 3 步',
  'adoption.progress': '领养流程',
  'adoption.hello': 'HELLO, I’M TABBIT',
  'adoption.welcomeTitle': '有只小家伙想住进你的侧边栏',
  'adoption.welcomeBody': '它会根据标签页的整体节奏作出反应，偶尔提醒你休息或整理。',
  'adoption.privacyTitle': '默认只看聚合状态',
  'adoption.privacyBody': '它不知道你正在浏览什么：不会读取网页正文、标题、网址、表单或历史记录。',
  'adoption.meet': '认识一下',
  'adoption.stepTwo': 'STEP 2',
  'adoption.nameTitle': '先给它起个名字',
  'adoption.nameBody': '默认叫团团。名字只保存在这台浏览器里。',
  'adoption.nameLabel': '宠物名字',
  'adoption.nameHelp': '1–12 个可见字符；会自动移除换行和不可见控制字符。',
  'adoption.previous': '上一步',
  'adoption.next': '继续',
  'adoption.stepThree': 'STEP 3',
  'adoption.rhythmTitle': '让 {name} 适应你的节奏',
  'adoption.rhythmBody': '标签页多不等于效率低。这里只是决定它什么时候该温柔地提醒你。',
  'adoption.presetsAria': '标签页节奏预设',
  'adoption.custom': '自定义数量',
  'adoption.softLimit': '舒适数量',
  'adoption.hardLimit': '拥挤数量',
  'adoption.softLabel': '{value} 舒适',
  'adoption.hardLabel': '{value} 拥挤',
  'adoption.preset.light.label': '轻装',
  'adoption.preset.light.description': '适合习惯随手关标签的人',
  'adoption.preset.daily.label': '日常',
  'adoption.preset.daily.description': '适合一般工作和学习节奏',
  'adoption.preset.heavy.label': '重度',
  'adoption.preset.heavy.description': '适合研究、开发和资料收集',
  'adoption.saving': '正在安顿…',
  'adoption.finish': '完成领养',
  'adoption.saveError': '暂时没能记住设置，请再试一次。',
  'adoption.spriteCalm': '平静的标签兔',
  'adoption.spriteCurious': '好奇的标签兔',
  'validation.name': '名字请使用 1–12 个可见字符。',
  'validation.softLimit': '舒适数量需在 5 到 300 之间。',
  'validation.hardLimit': '拥挤数量需在 10 到 300 之间。',
  'validation.limitOrder': '拥挤数量需要大于舒适数量。',
  'options.title': 'Tabbit 设置',
  'options.softLimit': '舒适标签页数量',
  'options.hardLimit': '拥挤标签页数量',
  'options.reducedMotion': '减少动画',
  'options.roamingTitle': '网页小兔子',
  'options.roamingHint': '小兔子只在普通 HTTP/HTTPS 页面上活动；只检测文字的显示位置用于避让，不读取文字内容、标题、网址或表单。',
  'options.roamingEnabled': '让小兔子在网页上自由活动',
  'options.staleRemindersEnabled': '提醒我有很久没动的标签页',
  'options.roamingOpacity': '小兔子透明度：{value}%',
  'options.save': '保存设置',
  'options.saving': '正在保存…',
  'options.saved': '已保存',
  'options.loadError': '暂时没能读取设置，请重新打开页面。',
  'options.saveError': '暂时没能保存设置，请再试一次。',
  'options.futureVersionError': '检测到由更新版 Tabbit 保存的数据。为保护它，本版本不会修改这部分内容。',
  'options.adoptionTitle': '重新领养',
  'options.adoptionHint': '不会删除名称、成长或设置；下次打开侧边栏时会重新显示领养流程。',
  'options.adoptionButton': '重新打开领养流程',
  'options.adoptionReady': '已准备好',
  'options.privacyHint': '默认只保存聚合数字，不读取网页正文，也不会把数据上传到服务器。',
  'organizer.title': '整理标签页',
  'organizer.back': '关闭整理页',
  'organizer.permissionTitle': '先由你决定要不要查看候选',
  'organizer.permissionBody': '为了找出重复或长时间未访问的标签页，Tabbit 需要在此页读取标签标题和网址。分析只在这台设备上完成，不会上传。',
  'organizer.permissionButton': '允许分析标签页',
  'organizer.permissionDenied': '没有获得权限，因此没有读取任何标签标题或网址。你可以随时再试一次。',
  'organizer.permissionError': '暂时无法请求权限，请检查浏览器设置后重试。',
  'organizer.privacyNote': '默认不勾选任何候选；当前页面、固定标签、正在发声和最近活动的标签都会被保护。',
  'organizer.scanned': '已在本地检查 {count} 个标签页，保护了 {protected} 个。',
  'organizer.emptyTitle': '现在没有可安全建议关闭的标签',
  'organizer.emptyBody': 'Tabbit 没有自动关闭任何页面。之后可以重新分析。',
  'organizer.candidates': '建议你自行确认',
  'organizer.selected': '已选择 {count} 个',
  'organizer.selectAll': '选择全部建议',
  'organizer.clearSelection': '清空选择',
  'organizer.refresh': '重新分析',
  'organizer.reason.stale': '很久未访问',
  'organizer.reason.duplicate': '重复网址',
  'organizer.domainSummary': '标签较多的网站',
  'organizer.domainCount': '{count} 个标签页',
  'organizer.closeSelected': '预览关闭 {count} 个标签页',
  'organizer.confirmTitle': '确认关闭 {count} 个标签页？',
  'organizer.confirmBody': '这些标签页会关闭，但 Tabbit 会在本地保留网址 24 小时，供你一键恢复。不会上传这些网址。',
  'organizer.confirmClose': '确认关闭',
  'organizer.cancel': '返回检查',
  'organizer.closeResult': '已关闭 {closed} 个标签页。',
  'organizer.closePartial': '已关闭 {closed} 个，另有 {failed} 个没有关闭。',
  'organizer.closeError': '没有关闭任何标签页；请重新分析后再试。',
  'organizer.recoveryReady': '可恢复上一次关闭的 {count} 个标签页（剩余 {hours} 小时）。',
  'organizer.restore': '恢复刚才关闭的标签页',
  'organizer.restoreResult': '已恢复 {restored} 个标签页。',
  'organizer.restorePartial': '已恢复 {restored} 个，另有 {failed} 个需要手动打开。',
  'organizer.restoreEmpty': '没有可恢复的最近整理操作。',
  'organizer.operationError': '操作没有完成，请稍后重试。',
  'roaming.petAria': '{name} 正在网页上散步。左键让它逃跑，右键打开菜单。',
  'roaming.arrived': '{name} 出来散步啦。',
  'roaming.flee': '嘿嘿，抓不到我～',
  'roaming.calm': '这里很安静，我慢慢逛逛。',
  'roaming.curious': '这个页面闻起来很新鲜。',
  'roaming.busy': '今天有点热闹，我跑两圈。',
  'roaming.overwhelmed': '标签森林有点挤，我先抖抖耳朵。',
  'roaming.sleeping': 'Zzz…我先眯一小会儿。',
  'roaming.celebrating': '完成啦！跳一下！',
  'roaming.staleReminder': '有 {count} 个标签页很久没动了，要不要找时间看看？',
  'roaming.selected': '已选中 {name}',
  'roaming.closeMenu': '关闭小兔子菜单',
  'roaming.menuHint': '左键点击它会逃跑。',
  'roaming.remindersOn': '关闭休眠标签提醒',
  'roaming.remindersOff': '开启休眠标签提醒',
  'roaming.openSettings': '打开完整设置',
  'roaming.hide': '收起网页小兔子',
  'roaming.updateError': '刚才的设置没有保存成功。'
} as const;

export type MessageKey = keyof typeof messageCatalog;
export type TimeOfDay = 'day' | 'lateNight';
export type FlavorHistory = Record<string, number>;

const moodTitleKeys: Record<PetMood, MessageKey> = {
  sleeping: 'mood.sleeping.title',
  calm: 'mood.calm.title',
  curious: 'mood.curious.title',
  busy: 'mood.busy.title',
  overwhelmed: 'mood.overwhelmed.title',
  focused: 'mood.focused.title',
  celebrating: 'mood.celebrating.title'
};

const defaultMoodLineKeys: Record<PetMood, Record<TimeOfDay, MessageKey[]>> = {
  sleeping: { day: ['mood.sleeping.day.0'], lateNight: ['mood.sleeping.lateNight.0'] },
  calm: { day: ['mood.calm.day.0', 'mood.calm.day.1'], lateNight: ['mood.calm.lateNight.0'] },
  curious: { day: ['mood.curious.day.0', 'mood.curious.day.1'], lateNight: ['mood.curious.lateNight.0'] },
  busy: { day: ['mood.busy.day.0', 'mood.busy.day.1'], lateNight: ['mood.busy.lateNight.0'] },
  overwhelmed: { day: ['mood.overwhelmed.day.0', 'mood.overwhelmed.day.1'], lateNight: ['mood.overwhelmed.lateNight.0'] },
  focused: { day: ['mood.focused.day.0'], lateNight: ['mood.focused.lateNight.0'] },
  celebrating: { day: ['mood.celebrating.day.0'], lateNight: ['mood.celebrating.lateNight.0'] }
};

const causeMoodLineKeys: Partial<Record<PetMood, Partial<Record<LoadReasonCode, Record<TimeOfDay, MessageKey[]>>>>> = {
  curious: {
    OPEN_BURST: { day: ['mood.curious.openBurst.day.0'], lateNight: ['mood.curious.openBurst.lateNight.0'] }
  },
  busy: {
    OPEN_BURST: { day: ['mood.busy.openBurst.day.0'], lateNight: ['mood.busy.openBurst.lateNight.0'] },
    STALE_RATIO: { day: ['mood.busy.staleRatio.day.0'], lateNight: ['mood.busy.staleRatio.lateNight.0'] }
  },
  overwhelmed: {
    TAB_COUNT: { day: ['mood.overwhelmed.tabCount.day.0'], lateNight: ['mood.overwhelmed.tabCount.lateNight.0'] }
  }
};

export function t(key: MessageKey, variables: Record<string, string | number> = {}): string {
  const template = messageCatalog[key];
  if (template === undefined) {
    if (import.meta.env?.DEV) throw new Error(`Missing i18n key: ${String(key)}`);
    return '—';
  }
  return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(variables[name] ?? `{${name}}`));
}

export function getTimeOfDay(now = new Date()): TimeOfDay {
  const hour = now.getHours();
  return hour >= 23 || hour < 6 ? 'lateNight' : 'day';
}

export function selectMoodCopy(
  mood: PetMood,
  cause: LoadReasonCode | undefined,
  now = Date.now(),
  history: FlavorHistory = {}
): { titleKey: MessageKey; lineKey: MessageKey; history: FlavorHistory } {
  const timeOfDay = getTimeOfDay(new Date(now));
  const causeLines = cause ? causeMoodLineKeys[mood]?.[cause] : undefined;
  const candidates = causeLines?.[timeOfDay] ?? defaultMoodLineKeys[mood][timeOfDay];
  const eligible = candidates.filter((key) => now - (history[key] ?? Number.NEGATIVE_INFINITY) >= 6 * 60 * 60 * 1000);
  const lineKey = (eligible[0] ?? candidates[0])!;
  return { titleKey: moodTitleKeys[mood], lineKey, history: { ...history, [lineKey]: now } };
}

export function reasonMessageKey(code: LoadReasonCode, now = Date.now()): MessageKey {
  return `reason.${code}.${getTimeOfDay(new Date(now))}` as MessageKey;
}

export function presetLabelKey(id: 'light' | 'daily' | 'heavy'): MessageKey {
  return `adoption.preset.${id}.label` as MessageKey;
}

export function presetDescriptionKey(id: 'light' | 'daily' | 'heavy'): MessageKey {
  return `adoption.preset.${id}.description` as MessageKey;
}
