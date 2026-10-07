/* 限时答题链路自检：node tools/test-papertimer.js
 *
 * 本机没有可用的无头浏览器（Chrome/Edge 的 --headless --dump-dom 静默退出、输出 0 字节），
 * 倒计时这条链路没法端到端冒烟，所以这里用「假 DOM + 假时钟」把 app.js 里**真实的函数**抠出来跑：
 *   1. 剩余不足 10% → 温和提醒只触发一次（颜色类 + 文案 + toast 各一次）
 *   2. 到点 → 自动锁定（paper-locked / timer-bar.over）、弹提示、把状态落盘
 *   3. 刷新续答 → encodeAnswer / decodeAnswer 必须「抗重新洗牌」：选项重排后学生的选择不能跟着变
 *   4. 组卷面板折算 → 题量/来源/手动改 联动分钟框与标签
 *
 * 属于 test-bankui.js 的同类做法：验的是 app.js 里的真代码，不是另写一份"等价实现"。
 * 抽取器只支持「不含正则字面量」的函数；一旦哪天给这些函数加了正则，抽取会报错而不是静默通过。
 */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const appSrc = fs.readFileSync(path.join(root, 'assets/js/app.js'), 'utf8');
const Papers = require(path.join(root, 'assets/js/papers.js'));
Papers.setData(JSON.parse(fs.readFileSync(path.join(root, 'data/papers.json'), 'utf8')));

let fail = 0, pass = 0;
function chk(name, cond, extra) {
  if (cond) { pass++; console.log('  OK   ' + name + (extra ? '  ' + extra : '')); }
  else { fail++; console.log(' FAIL  ' + name + (extra ? '  ' + extra : '')); }
}

/* ---- 极简函数抽取（花括号配对，跳过字符串与行注释；不含正则字面量） ---- */
function grab(name) {
  const m = new RegExp('function\\s+' + name + '\\s*\\(').exec(appSrc);
  if (!m) throw new Error('app.js 里找不到函数 ' + name);
  const start = appSrc.indexOf('{', m.index);
  let depth = 0, q = null;
  for (let j = start; j < appSrc.length; j++) {
    const c = appSrc[j];
    if (q) { if (c === '\\') { j++; continue; } if (c === q) q = null; continue; }
    if (c === '/' && appSrc[j + 1] === '/') { while (j < appSrc.length && appSrc[j] !== '\n') j++; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { const out = appSrc.slice(m.index, j + 1);
      if (!/^function\s/.test(out) || !/\}$/.test(out.trim())) throw new Error(name + ' 抽取结果不完整');
      if (/\/[^/*\s][^\n]*\/[gimsuy]*\s*[;,)]/.test(out.replace(/\/\/.*/g, ''))) throw new Error(name + ' 里可能有正则字面量，请改用 test-bankui 的抽取器');
      return out; } }
  }
  throw new Error('函数 ' + name + ' 花括号不配对');
}

/* ---------- 假 DOM ---------- */
function mkNode(id) {
  const cls = new Set();
  return {
    id, textContent: '', innerHTML: '', value: '', title: '', checked: false,
    style: {}, dataset: {}, disabled: false,
    classList: {
      add: c => cls.add(c), remove: c => cls.delete(c),
      contains: c => cls.has(c),
      toggle: (c, on) => { if (on === undefined) { cls.has(c) ? cls.delete(c) : cls.add(c); } else if (on) cls.add(c); else cls.delete(c); }
    },
    _cls: cls, addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }
  };
}

/* ---------- 把 app.js 的相关函数装进沙箱 ---------- */
const CLOCK = { now: Date.UTC(2026, 9, 7, 10, 0, 0) };
const fakeDate = { now: () => CLOCK.now };
let toasts = [];
let saved = null;

const M = new Map();
const get = id => { if (!M.has(id)) M.set(id, mkNode(id)); return M.get(id); };
const $stub = sel => { const m = /^#([\w-]+)$/.exec(sel); return m ? get(m[1]) : null; };
const documentStub = { body: get('@body'), querySelector: $stub, querySelectorAll: () => [] };
const StoreStub = {
  savePaperRun: r => { saved = JSON.parse(JSON.stringify(r)); },
  clearPaperRun: () => { saved = null; },
  paperRun: () => saved
};
const BankStub = { all: () => [], byId: () => null };
let intervals = [];
const src = `
  var paper = null, paperTimer = null, ppTimerTouched = false, saveRunTimer = null;
  ${grab('clearPaperTick')}
  ${grab('timerEls')}
  ${grab('paperLimitInfoText')}
  ${grab('tickPaperTimer')}
  ${grab('lockPaper')}
  ${grab('showTimeUpDialog')}
  ${grab('hideTimeUpDialog')}
  ${grab('onPaperTimeUp')}
  ${grab('startPaperTimer')}
  ${grab('stopPaperTimer')}
  ${grab('encodeAnswer')}
  ${grab('decodeAnswer')}
  ${grab('paperRunSnapshot')}
  ${grab('savePaperRun')}
  ${grab('paperLimitTemplates')}
  ${grab('paperTimerOn')}
  ${grab('refreshPaperTimerUI')}
  ${grab('paperLimitMinutesFor')}
  return {
    startPaperTimer: startPaperTimer, stopPaperTimer: stopPaperTimer, tick: tickPaperTimer,
    lockPaper: lockPaper, onPaperTimeUp: onPaperTimeUp, start: startPaperTimer,
    encodeAnswer: encodeAnswer, decodeAnswer: decodeAnswer, snapshot: paperRunSnapshot,
    saveRun: savePaperRun, refreshUI: refreshPaperTimerUI, limitFor: paperLimitMinutesFor,
    setPaper: function (p) { paper = p; }, getPaper: function () { return paper; },
    state: function () { return { timer: paperTimer, touched: ppTimerTouched, saveTimer: saveRunTimer }; },
    setTouched: function (v) { ppTimerTouched = v; }, setSaveTimer: function (v) { saveRunTimer = v; }
  };
`;
const app = new Function('$', 'document', 'Papers', 'Bank', 'Store', 'checkedSources', 'esc',
  'toast', 'setInterval', 'clearInterval', 'Date', 'console', 'sourceSetOf', src)(
  $stub, documentStub, Papers, BankStub, StoreStub,
  () => [],                      // checkedSources：默认不勾来源 → 用全部模板
  s => String(s),                // esc
  m => toasts.push(m),           // toast
  fn => { intervals.push(fn); return intervals.length; },
  () => { intervals = []; },
  fakeDate, console, t => (t && (t.sourceSet || t.source)) || ''
);

/* ---------- 造一份纸面数据 ---------- */
const SEAMO_TPL = [{ id: 'seamo25a-q01', sourceSet: 'SEAMO 2025 Paper A', subject: '数学', topic: '找规律' }];
function mkPaper(minutes, extra) {
  return Object.assign({
    id: 'P1', createdAt: CLOCK.now, questions: [{ key: 't#1', tplId: 't', tpl: SEAMO_TPL[0], vars: { a: 1 }, lang: 'en', type: 'choice', options: ['甲', '乙', '丙', '丁'], correctIndex: 2 }],
    answers: {}, marks: {}, graded: false, limitMinutes: minutes, limitPlan: { known: [], rateText: '1 分钟/题' },
    deadline: CLOCK.now + minutes * 60000, timedOut: false
  }, extra || {});
}

/* ---------- 1. 不足 10% 温和提醒 ---------- */
console.log('1) 剩余不足 10% 的温和提醒');
toasts = []; intervals = [];
let p = mkPaper(10);
app.setPaper(p);
app.startPaperTimer(true);
chk('起表后底栏显示出来', !get('paperTimer').classList.contains('hidden'));
chk('底栏占位类加在 body 上（内容不会被遮）', documentStub.body.classList.contains('has-timer'));
chk('起表时提示语写明限时时长', /限时 10 分钟/.test(get('timerInfo').textContent), get('timerInfo').textContent);

CLOCK.now = p.deadline - 61000;                 // 还剩 61 秒（10.17%，还没到 10%）
app.tick();
chk('还剩 61 秒（>10%）不提醒', !get('paperTimer').classList.contains('warn') && get('timerClock').textContent === '01:01', get('timerClock').textContent);
CLOCK.now = p.deadline - 59000;                 // 还剩 59 秒（<10%）
app.tick();
chk('越过 10% 就温和提醒（暖色类）', get('paperTimer').classList.contains('warn'));
chk('提醒文案提到不足 10%', /不到 10%/.test(get('timerMsg').textContent), get('timerMsg').textContent);
chk('提醒只 toast 一次', toasts.length === 1, JSON.stringify(toasts));
CLOCK.now = p.deadline - 30000;
app.tick();
chk('继续倒计时不会反复提醒', toasts.length === 1 && get('paperTimer').classList.contains('warn'));
chk('倒计时数字随剩余时间走', get('timerClock').textContent === '00:30', get('timerClock').textContent);

/* ---------- 2. 到点：自动停止作答 + 提示提交 ---------- */
console.log('2) 时间到：自动停答 + 提示交卷');
CLOCK.now = p.deadline + 900;
toasts = [];
app.tick();
chk('标记为已超时', app.getPaper().timedOut === true);
chk('时钟归零', get('timerClock').textContent === '00:00');
chk('底栏切成红色态', get('paperTimer').classList.contains('over') && !get('paperTimer').classList.contains('warn'));
chk('底栏提示「已自动停止作答，请交卷」', /停止作答/.test(get('timerMsg').textContent) && /交卷/.test(get('timerMsg').textContent), get('timerMsg').textContent);
chk('卷面被锁定（paper-locked）', get('paperArea').classList.contains('paper-locked'));
chk('交卷按钮改成醒目态', /时间到/.test(get('btnSubmitPaper').textContent), get('btnSubmitPaper').textContent);
chk('弹出「时间到」提示框', !get('timeUpMask').classList.contains('hidden'));
chk('提示框写明限时时长', /限时 10 分钟已用完/.test(get('timeUpText').textContent), get('timeUpText').textContent);
chk('超时状态已落盘（刷新后仍是锁定卷）', !!saved && saved.timedOut === true && saved.limitMinutes === 10);
chk('超时只 toast 一次', toasts.length === 1, JSON.stringify(toasts));
app.tick();
chk('再次 tick 不重复弹提示', toasts.length === 1);

/* ---------- 3. 刷新续答：答案必须抗「重新洗牌」 ---------- */
console.log('3) 刷新续答：选项重排后学生的选择不能跟着变');
const q1 = { type: 'choice', options: ['甲', '乙', '丙', '丁'] };
const e1 = app.encodeAnswer(q1, { picked: 2, raw: '' });
chk('单选按下标 → 存成内容', JSON.stringify(e1.picks) === JSON.stringify(['丙']), JSON.stringify(e1.picks));
const q2 = { type: 'choice', options: ['丁', '丙', '乙', '甲'] };     // 重新实例化会重新洗牌
const d1 = app.decodeAnswer(q2, e1);
chk('洗牌后仍指向同一个选项（内容不变）', d1.picked === 1 && q2.options[d1.picked] === '丙', '下标 ' + d1.picked);

const e2 = app.encodeAnswer(q1, { picked: [0, 2], raw: '' });
const d2 = app.decodeAnswer(q2, Object.assign({}, e2, { multi: true }));
chk('多选也跟着洗牌重映射',
  d2.picked.length === 2 && d2.picked.map(i => q2.options[i]).sort().join('') === '丙甲',
  JSON.stringify(d2.picked.map(i => q2.options[i])));

const mq1 = { type: 'match', leftItems: [{ key: 5 }, { key: 7 }], rightItems: [{ key: 7 }, { key: 5 }] };
const e3 = app.encodeAnswer(mq1, { links: [[0, 1], [1, 0]] });
chk('连线题存成 key 对', JSON.stringify(e3.linkKeys) === JSON.stringify([[5, 5], [7, 7]]), JSON.stringify(e3.linkKeys));
const mq2 = { type: 'match', leftItems: [{ key: 7 }, { key: 5 }], rightItems: [{ key: 5 }, { key: 7 }] };
const d3 = app.decodeAnswer(mq2, e3);
chk('洗牌后连线仍连到同一个钟面',
  d3.links.length === 2 && d3.links.every(lk => mq2.leftItems[lk[0]].key === mq2.rightItems[lk[1]].key),
  JSON.stringify(d3.links));

const blank = app.decodeAnswer(q2, null);
chk('没存过答案的题不会凭空多出一个选择', blank === null);

/* ---------- 4. 组卷面板折算 ---------- */
console.log('4) 组卷面板：官方限时 → 本次题量 → 分钟框');
BankStub.all = () => SEAMO_TPL;
get('ppTimerOn').checked = true;
get('ppSize').value = 10;
app.setTouched(false);
app.refreshUI(true);
chk('默认按官方折算填 90×10/25 = 36 分钟', String(get('ppTimerMin').value) === '36', String(get('ppTimerMin').value));
chk('标签标「官方限时」', get('ppTimerTag').textContent === '官方限时', get('ppTimerTag').textContent);
chk('说明文案含官方分钟与折算结果', /官方 90 分钟/.test(get('ppTimerInfo').innerHTML) && /36 分钟/.test(get('ppTimerInfo').innerHTML), get('ppTimerInfo').innerHTML);
get('ppSize').value = 25;
app.refreshUI(true);
chk('选满整卷就是官方原值 90 分钟', String(get('ppTimerMin').value) === '90');
get('ppTimerMin').value = 20;
app.setTouched(true);
app.refreshUI();
chk('手动改过 → 标「自定义」，不再被覆盖', get('ppTimerTag').textContent === '自定义' && String(get('ppTimerMin').value) === '20');
get('ppTimerOn').checked = false;
app.refreshUI();
chk('关掉限时 → 标「不限时」', get('ppTimerTag').textContent === '不限时', get('ppTimerTag').textContent);
chk('关掉限时 → 出卷时不下发时长', app.limitFor([{ tpl: SEAMO_TPL[0] }]).minutes === 0);
get('ppTimerOn').checked = true;
get('ppTimerMin').value = 20;
app.setTouched(true);
chk('开着限时 + 手动 20 → 就按 20 分钟出卷',
  app.limitFor([{ tpl: SEAMO_TPL[0] }]).minutes === 20, app.limitFor([{ tpl: SEAMO_TPL[0] }]).minutes + ' 分钟');

/* ---------- 5. 落盘快照（刷新续答的原料） ---------- */
console.log('5) 落盘快照（刷新续答的原料）');
const snapPaper = mkPaper(10, { answers: { 't#1': { picked: 2, raw: '' } }, marks: { 't#1': true } });
snapPaper.limitPlan = Papers.plan({ templates: [SEAMO_TPL[0]], picked: 1 });
app.setPaper(snapPaper);
app.saveRun();
chk('快照里有题序（模板 id + 变量取值）',
  saved.items.length === 1 && saved.items[0].tplId === 't' && saved.items[0].vars.a === 1, JSON.stringify(saved.items));
chk('快照里答案存成选项内容而不是下标', JSON.stringify(saved.answers[0].picks) === JSON.stringify(['丙']));
chk('快照带截止时刻（续答按原 deadline 算，不是重新计时）', saved.deadline === snapPaper.deadline && !!saved.deadline);
chk('快照带限时摘要（续答后卷头才说得清怎么折算的）',
  saved.limitPlan.minutes === 4 && saved.limitPlan.picked === 1, JSON.stringify({ m: saved.limitPlan.minutes, p: saved.limitPlan.picked }));
chk('快照保留标记', saved.marks['t#1'] === true);
snapPaper.graded = true;
app.saveRun();
chk('交卷后快照被清掉（下次打开不会又冒出旧卷）', saved === null);

/* ---------- 汇总 ---------- */
console.log('='.repeat(70));
console.log(fail === 0 ? ('✓ 通过 ' + pass + ' 项断言') : ('✗ 失败 ' + fail + ' 项（通过 ' + pass + '）'));
process.exit(fail === 0 ? 0 : 1);
