/* 选项质量体检：node tools/test-options.js [<bank.json> ...]
   默认扫 data/question-bank.json。可传多个卷文件。
   —— 这是「答案正确性」的第一道自动闸门：现有 test-bank 只验「能生成 + 判分自洽」，
      完全抓不到「两个选项一模一样」「答案和干扰项等值」这类会让学生无法作答的错误。
   分级：
     FAIL  O1 选项【字面完全相同】（含答案项）——学生面对两个一样的选项，选哪个都可能被判错
           O5 选项里出现 undefined / NaN / 未替换的 {占位符}
           O6 correctIndex 越界或未定义
           O7 图形选项（optionsSvg）出现重复图案
     WARN  O2 答案与某干扰项【数值等值】（问「最简形式」类题目属正常，需人工确认）
           O3 干扰项之间数值等值
           O4 答案里出现「小数/整数」的分数式（如 18.5/20）——多半是「半个学生」这类语义错
   用法：node tools/test-options.js data/imports/mm-book1-test02.json */
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const ctx = { console, Math, JSON, Object, Array, Number, String, isFinite, parseFloat, Date, Set };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
['assets/js/expr.js', 'assets/js/diagrams.js', 'assets/js/generator.js', 'assets/js/grader.js'].forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
});
const { Generator } = ctx;

const N = 400;

/* 选项文本 → 数值（剥掉常见单位后解析；解析不了返回 null，不参与等值比较） */
const UNIT_RE = /[¥$]|元|角|克|千克|公斤|吨|米|厘米|毫米|千米|平方厘米|平方毫米|平方米|立方厘米|立方米|分|秒|小时|分钟|天|升|毫升|个|人|名|位|块|条|张|场|页|年|月|倍|件|支|只|盒|包|罐|本|袋|箱|棵|颗|岁|元\/|%/g;
function valOf(txt) {
  if (txt == null) return null;
  let s = String(txt).trim();
  if (!s) return null;
  const pct = /%\s*$/.test(s);
  s = s.replace(UNIT_RE, '').trim();
  let m;
  if ((m = /^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/.exec(s))) return pct ? null : (+m[1]) / (+m[2]);
  if ((m = /^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(s))) return pct ? null : (+m[1]) + (+m[2]) / (+m[3]);
  if ((m = /^(-?\d+(?:\.\d+)?)$/.exec(s))) return parseFloat(m[1]);
  return null;
}
const optText = o => (typeof o === 'string' ? o : (o && (o.zh || o.en) || ''));
const nearEq = (a, b) => a != null && b != null && Math.abs(a - b) < 1e-9;

const files = process.argv.slice(2).length ? process.argv.slice(2) : ['data/question-bank.json'];
let anyFail = 0;

for (const fp of files) {
  const bank = JSON.parse(fs.readFileSync(path.join(root, fp), 'utf8'));
  const list = Array.isArray(bank) ? bank : bank.templates;
  console.log('\n' + '='.repeat(78));
  console.log('== ' + fp + '  (' + list.length + ' 题)');
  console.log('='.repeat(78));
  let failN = 0, warnN = 0;
  for (const tpl of list) {
    const t = tpl.answer || {};
    if (t.type !== 'choice') continue;
    const F = [], W = [];
    const seen = new Set();
    const langs = (tpl.stem && typeof tpl.stem === 'object' && typeof tpl.stem.en !== 'undefined') ? ['en', 'zh'] : ['zh', 'en'];
    for (const lg of langs) {
      for (let n = 0; n < N; n++) {
        const q = Generator.instantiate(tpl, null, { lang: lg });
        if (!q) continue;
        const key = lg + '#' + q.sig;
        if (seen.has(key)) continue;
        seen.add(key);
        const opts = (q.options || []).map(optText);
        const ci = q.correctIndex;
        const where = tpl.id + ' [' + lg + '] vars=' + JSON.stringify(q.vars);
        // O6
        if (!Array.isArray(ci) && (ci === undefined || ci === null || ci < 0 || ci >= opts.length)) {
          F.push({ k: 'O6 correctIndex 越界', d: where + ' ci=' + ci + ' 选项数=' + opts.length });
          continue;
        }
        // O5
        opts.forEach((s, i) => {
          if (s == null || /undefined|NaN|\{[A-Za-z_]/.test(String(s)))
            F.push({ k: 'O5 选项脏值', d: where + ' 第' + (i + 1) + '项=' + JSON.stringify(s) });
        });
        // O1 字面完全相同 / O2 O3 数值等值
        for (let a = 0; a < opts.length; a++) for (let b = a + 1; b < opts.length; b++) {
          if (!opts[a] || !opts[b]) continue;
          const isAns = Array.isArray(ci) ? (ci.indexOf(a) >= 0 || ci.indexOf(b) >= 0) : (a === ci || b === ci);
          if (opts[a] === opts[b]) F.push({ k: 'O1 选项字面完全相同', d: where + ' 第' + (a + 1) + '项 ≡ 第' + (b + 1) + '项 = "' + opts[a] + '"' + (isAns ? '  ★含正确项' : '') });
          else if (nearEq(valOf(opts[a]), valOf(opts[b]))) {
            const msg = where + ' "' + opts[a] + '" ≈ "' + opts[b] + '"';
            if (isAns) W.push({ k: 'O2 答案与干扰项数值等值', d: msg });
            else W.push({ k: 'O3 干扰项之间数值等值', d: msg });
          }
        }
        // O4 小数分数
        [q.display].concat(opts).forEach(s => {
          const m = /(^|[^\d.])(\d+\.\d+)\s*\/\s*(\d+)/.exec(String(s || ''));
          if (m) W.push({ k: 'O4 分数式含小数', d: where + ' "' + s + '"' });
        });
        // O7 图形选项重复
        if (Array.isArray(q.optionsSvg)) {
          const u = new Set(q.optionsSvg.map(x => String(x)));
          if (u.size !== q.optionsSvg.length) F.push({ k: 'O7 图形选项重复', d: where });
        }
      }
    }
    if (F.length || W.length) {
      const uniqF = [...new Map(F.map(x => [x.k + x.d, x])).values()].slice(0, 4);
      const uniqW = [...new Map(W.map(x => [x.k + x.d, x])).values()].slice(0, 4);
      if (F.length) { failN++; anyFail++; }
      if (W.length) warnN++;
      console.log('\n' + (F.length ? '✗ FAIL ' : '⚠ WARN ') + tpl.id + '  ' + (tpl.title || ''));
      uniqF.forEach(x => console.log('   [FAIL] ' + x.k + '：' + x.d));
      uniqW.forEach(x => console.log('   [WARN] ' + x.k + '：' + x.d));
      if (F.length > 4) console.log('   …还有 ' + (F.length - 4) + ' 条 FAIL');
      if (W.length > 4) console.log('   …还有 ' + (W.length - 4) + ' 条 WARN');
    }
  }
  console.log('\n-- ' + fp + '：FAIL 题 ' + failN + ' / WARN 题 ' + warnN);
}
console.log('\n' + '='.repeat(78));
console.log(anyFail ? '✗ 有 ' + anyFail + ' 道题的选项存在硬错误' : '✓ 选项层无硬错误');
process.exit(anyFail ? 1 : 0);
