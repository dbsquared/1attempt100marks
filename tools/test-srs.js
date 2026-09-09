/* SRS 自检：node tools/test-srs.js —— 模拟"错题重练→掌握→抽样检测"完整链路 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');

const mem = {};
const localStorage = {
  getItem: k => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: k => { delete mem[k]; },
  key: i => Object.keys(mem)[i],
  get length() { return Object.keys(mem).length; }
};
const ctx = { console, Math, JSON, Object, Array, Number, String, isFinite, parseFloat, Date, Set, localStorage };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
['assets/js/expr.js', 'assets/js/generator.js', 'assets/js/grader.js', 'assets/js/sync.js', 'assets/js/store.js', 'assets/js/srs.js'].forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
});
const { Store, Bank, SRS } = ctx;

const bank = JSON.parse(fs.readFileSync(path.join(root, 'data/question-bank.json'), 'utf8'));
Bank.base = bank.templates;
Store.saveSettings(Object.assign(Store.settings(), { sessionSize: 5, newPerSession: 2, masterStreak: 3, wrongNeed: 2 }));

const log = [];
function chk(name, cond, extra) { log.push((cond ? '  OK  ' : ' FAIL ') + name + (extra ? '  ' + extra : '')); return cond; }
let ok = true;

// 1. 首次练习：应给出 sessionSize 道题，且都是新题
let s1 = SRS.buildSession({ mode: 'daily' });
ok &= chk('首轮出满 5 道题', s1.length === 5, JSON.stringify(s1.map(x => x.reason)));
ok &= chk('首轮不含错题/复习标记', !s1.some(x => x.reason === 'wrong' || x.reason === 'review'));

// 2. 第 1 题答错，其余答对
SRS.record(s1[0].id, false, { given: 'x', expected: 'y' });
s1.slice(1).forEach(x => SRS.record(x.id, true, {}));
const w = Store.wrong();
ok &= chk('错题进入错题本（需再答对 2 次）', w.length === 1 && w[0].id === s1[0].id && w[0].need === 2, JSON.stringify(w));

// 3. 第二轮：错题必须出现在最前面
let s2 = SRS.buildSession({ mode: 'daily' });
ok &= chk('错题出现在第二轮首位', s2.length > 0 && s2[0].id === s1[0].id && s2[0].reason === 'wrong');
ok &= chk('第二轮仍补足到 5 题', s2.length >= 5, '实际 ' + s2.length);

// 4. 错题连答对 2 次 -> 移出错题本
SRS.record(s1[0].id, true, {});
ok &= chk('答对 1 次后 need 降为 1', Store.wrong()[0].need === 1);
SRS.record(s1[0].id, true, {});
ok &= chk('答对 2 次后移出错题本', Store.wrong().filter(x => x.id === s1[0].id).length === 0);

// 5. 再答对 1 次 -> 连续 3 次 -> 标记掌握，并安排抽样日期
SRS.record(s1[0].id, true, {});
const st = SRS.state(s1[0].id);
ok &= chk('连续答对 3 次判定掌握', st.mastered && st.streak === 3, JSON.stringify(st));
ok &= chk('安排 4 天后抽样检测', Math.round((st.due - Date.now()) / 86400000) === 4, new Date(st.due).toISOString());

// 6. 掌握后短期不再出现在日常练习里
let s3 = SRS.buildSession({ mode: 'daily' });
ok &= chk('已掌握题不进入日常练习', !s3.some(x => x.id === s1[0].id));

// 7. 把到期末来模拟"时间快进" -> 应进入抽样检测队列
let s4Before = SRS.buildSession({ mode: 'review' });
ok &= chk('未到期时不进入抽样检测', !s4Before.some(x => x.id === s1[0].id));
const prog = Store.progress();
prog[s1[0].id].due = Date.now() - 1000;   // 快进到到期
Store.saveProgress(prog);
let s4 = SRS.buildSession({ mode: 'review' });
ok &= chk('到期后进入抽样检测', s4.some(x => x.id === s1[0].id), JSON.stringify(s4.map(x => x.id)));

// 8. 抽样检测答错 -> 打回错题本、取消掌握
SRS.record(s1[0].id, false, {});
const st2 = SRS.state(s1[0].id);
ok &= chk('抽样答错 -> 取消掌握并重回错题本', !st2.mastered && st2.streak === 0 && Store.wrong().some(x => x.id === s1[0].id));

// 9. 每个模板都能被调度到（轮数按题库规模自适应：需约 n·ln n 次新题抽取才能覆盖全部）
let covered = new Set();
const N = bank.templates.length;
const rounds = Math.ceil((N * (Math.log(N) + 5)) / 2 / 10) * 10;
for (let i = 0; i < rounds; i++) SRS.buildSession({ mode: 'daily' }).forEach(x => covered.add(x.id));
ok &= chk(rounds + ' 轮日常练习可覆盖全部题型', covered.size === N, covered.size + '/' + N);

console.log(log.join('\n'));
console.log('-'.repeat(60));
console.log(ok ? '✓ SRS 调度全部通过' : '✗ 存在失败项');
process.exit(ok ? 0 : 1);
