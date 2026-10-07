/* 试卷限时自检：node tools/test-papers.js
 *
 * 查两件事：
 *  1. data/papers.json 的元数据完整性 + 与题库的真实对应关系
 *     （每份卷能不能认到模板、官方题数与题库模板数是否对得上、出处/核对日期有没有留）
 *  2. 「按题量比例缩减限时」的折算算得对不对（含混组、选超、手动改、无数据兜底）
 *
 * 这是纯逻辑自检：不需要浏览器，也不会写任何文件。
 */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const Papers = require(path.join(root, 'assets/js/papers.js'));

const papersJson = JSON.parse(fs.readFileSync(path.join(root, 'data/papers.json'), 'utf8'));
const bank = JSON.parse(fs.readFileSync(path.join(root, 'data/question-bank.json'), 'utf8'));
const tpls = bank.templates || [];

Papers.setData(papersJson);
const list = Papers.all();

let fail = 0, pass = 0;
function chk(name, cond, extra) {
  if (cond) { pass++; console.log('  OK   ' + name + (extra ? '  ' + extra : '')); }
  else { fail++; console.log(' FAIL  ' + name + (extra ? '  ' + extra : '')); }
}

/* ---------- 1. 元数据结构 ---------- */
console.log('1) data/papers.json 结构');
chk('papers.json 有 papers 数组且非空', Array.isArray(list) && list.length > 0, list.length + ' 份');
chk('默认节奏已定义', !!papersJson.defaultRate && papersJson.defaultRate.minutes > 0);
list.forEach(p => {
  const t = p.timeLimit || {};
  chk(p.set + ' · 有 set/totalQuestions', !!p.set && p.totalQuestions > 0, p.totalQuestions + ' 题');
  if (t.official) {
    chk(p.set + ' · 官方限时给了分钟数 + 出处 + 链接',
      t.minutes > 0 && !!t.source && /^https?:/.test(t.url || ''), t.minutes + ' 分钟');
    chk(p.set + ' · 官方限时不该同时写 suggestedMinutes', t.suggestedMinutes === undefined);
  } else {
    chk(p.set + ' · 无官方限时时给了推算值 + 依据 + 链接',
      t.suggestedMinutes > 0 && !!t.basis && /^https?:/.test(t.url || ''), t.suggestedMinutes + ' 分钟（推算）');
  }
  chk(p.set + ' · 留了核对日期', /^\d{4}-\d{2}-\d{2}$/.test(t.checkedAt || ''), t.checkedAt || '—');
});

/* ---------- 2. 与题库的对应 ---------- */
console.log('2) 试卷 ↔ 题库模板');
const byPaper = {};
tpls.forEach(t => {
  const p = Papers.forTemplate(t);
  const k = p ? p.set : '(未收录)';
  byPaper[k] = (byPaper[k] || 0) + 1;
});
list.forEach(p => {
  const n = byPaper[p.set] || 0;
  chk(p.set + ' · 题库里认得到模板', n > 0, n + ' 个模板');
  /* 模板数应 ≥ 官方题数；多出来的只允许是「一题拆成两三个模板」的情况（如 13a/13b） */
  chk(p.set + ' · 模板数 ≥ 官方题数且不超出 3 个（拆分变体）',
    n >= p.totalQuestions && n <= p.totalQuestions + 3, '模板 ' + n + ' / 官方 ' + p.totalQuestions);
  chk(p.set + ' · idPrefix 能认到模板',
    tpls.some(t => String(t.id).indexOf(p.idPrefix) === 0));
});
const orphans = tpls.filter(t => !Papers.forTemplate(t));
/* 认不到卷的只能是「示例模板」这类没有真题出处的（有真卷出处却没登记限时 → 是漏登记，要报出来） */
const orphanBad = orphans.filter(t => !/示例|未标注来源|^$/.test(String(t.sourceSet || t.source || '')));
chk('除示例模板外，题库里的卷都能认到 papers.json（漏登记会在这里报出来）',
  orphanBad.length === 0,
  orphans.length ? ('未登记 ' + orphans.length + ' 个模板：' + orphans.slice(0, 3).map(t => t.id).join(',') + '…') : '全部已登记');
console.log('   按卷分布：' + Object.keys(byPaper).sort().map(k => k + '=' + byPaper[k]).join('，'));

/* ---------- 3. 折算算法 ---------- */
console.log('3) 按题量比例折算');
function planOf(setName, picked, override) {
  const p = Papers.bySet(setName);
  return Papers.plan({ papers: p ? [p] : [], picked: picked, override: override });
}
const SEAMO = 'SEAMO 2025 Paper A', ICAS21 = 'ICAS 2021 Year 2 Mathematics', MM1 = 'Mastering Mathematics Book 1 Test 1';

chk('SEAMO 25 题整卷 = 90 分钟（官方值原样，不做除法零头）', planOf(SEAMO, 25).minutes === 90, planOf(SEAMO, 25).minutes + '′');
chk('SEAMO 只选 10 题 → 90×10/25 = 36 分钟', planOf(SEAMO, 10).minutes === 36, planOf(SEAMO, 10).minutes + '′');
chk('SEAMO 只选 5 题 → 90×5/25 = 18 分钟', planOf(SEAMO, 5).minutes === 18, planOf(SEAMO, 5).minutes + '′');
chk('SEAMO 选超（30 题 > 25 题）按同节奏延长 = 108 分钟', planOf(SEAMO, 30).minutes === 108, planOf(SEAMO, 30).minutes + '′');
chk('ICAS 30 题整卷 = 35 分钟', planOf(ICAS21, 30).minutes === 35);
chk('ICAS 只选 10 题 → 35×10/30 ≈ 12 分钟', planOf(ICAS21, 10).minutes === 12, planOf(ICAS21, 10).minutes + '′');
chk('MM（推算 46 分钟/40 题）选 20 题 → 23 分钟', planOf(MM1, 20).minutes === 23, planOf(MM1, 20).minutes + '′');
chk('题量为 0 不给时间', planOf(SEAMO, 0).minutes === 0);

const seamo = Papers.bySet(SEAMO), icas = Papers.bySet(ICAS21);
const blend = Papers.plan({ papers: [seamo, icas], picked: 10 });
chk('混组：按 Σ分钟 ÷ Σ题数 求平均节奏',
  blend.minutes === Math.round((90 + 35) / (25 + 30) * 10), blend.minutes + '′（速率 ' + blend.rateText + '）');
chk('混组不会比」全部按最快卷」还短',
  blend.minutes >= Math.round(35 / 30 * 10) - 1 && blend.minutes <= Math.round(90 / 25 * 10) + 1);

const custom = planOf(SEAMO, 10, 20);
chk('手动改时长：以手动的 20 分钟为准', custom.minutes === 20 && custom.custom === true);

const none = Papers.plan({ papers: [], picked: 12 });
chk('查不到试卷时按 1 分钟/题兜底并标 estimated', none.minutes === 12 && none.estimated === true);

/* 单调性：题量越多，限时不能反而变少 */
let prev = -1, mono = true;
for (let n = 0; n <= 40; n++) { const m = planOf(SEAMO, n).minutes; if (m < prev) mono = false; prev = m; }
chk('限时随题量单调不减', mono);

/* 标记位 */
chk('官方卷标 official', planOf(SEAMO, 10).official === true);
chk('推算卷不标 official', planOf(MM1, 10).official === false);
chk('缩减时标 scaled', planOf(SEAMO, 10).scaled === true && planOf(SEAMO, 25).scaled === false);
chk('选超时标 extended', planOf(SEAMO, 30).extended === true);

/* ---------- 4. 格式化与说明文案 ---------- */
console.log('4) 格式化 / 说明文案');
chk('formatMMSS(0) = 00:00', Papers.formatMMSS(0) === '00:00');
chk('formatMMSS(65) = 01:05', Papers.formatMMSS(65) === '01:05');
chk('formatMMSS(3600) = 60:00', Papers.formatMMSS(3600) === '60:00');
chk('formatMMSS(负数) = 00:00（不出现 -00:01）', Papers.formatMMSS(-7) === '00:00');
chk('formatMMSS(59.8) 不进位成 01:00', Papers.formatMMSS(59.8) === '00:59');
const saySeamo = Papers.explain(planOf(SEAMO, 10));
chk('说明文案提到卷名与折算结果', saySeamo.indexOf('SEAMO 2025 Paper A') >= 0 && saySeamo.indexOf('36') >= 0, saySeamo);
const sayMM = Papers.explain(planOf(MM1, 20));
chk('推算卷的文案写明是推算', /推算/.test(sayMM), sayMM);
const sayMany = Papers.explain(blend);
chk('混组文案说明是混合卷', /混合/.test(sayMany), sayMany);

/* ---------- 5. 认卷健壮性 ---------- */
console.log('5) 认卷健壮性');
chk('未知来源 + 未知 id 前缀 → 认不到卷', Papers.forTemplate({ id: 'zzz-01', sourceSet: '不存在的卷' }) === null);
chk('只给 source（没 sourceSet）也能认到',
  (Papers.forTemplate({ id: 'x', source: 'SEAMO 2025 Paper A Q7' }) || {}).set === SEAMO);
chk('只给 id 前缀也能认到', (Papers.forTemplate({ id: 'mm1t3-07' }) || {}).set === 'Mastering Mathematics Book 1 Test 3');
chk('一题两模板（13a/13b）都认到 ICAS 2022',
  Papers.forTemplates([{ id: 'icas22y2m-13a' }, { id: 'icas22y2m-13b' }]).length === 1);
chk('forTemplates 去重', Papers.forTemplates(tpls).length === list.length,
  Papers.forTemplates(tpls).length + ' / ' + list.length);

/* ---------- 汇总 ---------- */
console.log('='.repeat(70));
console.log('试卷限时一览：');
list.forEach(p => {
  const n = byPaper[p.set] || 0;
  console.log('  ' + (p.official ? '【官方】' : '【推算】') + p.set + '：' +
    p.minutes + ' 分钟 / 官方 ' + p.totalQuestions + ' 题（题库 ' + n + ' 模板）');
});
console.log('='.repeat(70));
console.log(fail === 0 ? ('✓ 通过 ' + pass + ' 项断言') : ('✗ 失败 ' + fail + ' 项（通过 ' + pass + '）'));
process.exit(fail === 0 ? 0 : 1);
