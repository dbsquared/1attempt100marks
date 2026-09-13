/* 原题模式自检：node tools/test-original.js
 * 校验每个带 original 字段的模板，用「原题数值」实例化后，
 * 得到的答案必须与官方答案表一致（数值题比 display，选择题比正确选项文字）。
 * 同时列出「有原卷图但未录入原题数值」的模板，避免遗漏。
 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const ctx = { console, Math, JSON, Object, Array, Number, String, isFinite, parseFloat, Date, Set };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
['assets/js/expr.js', 'assets/js/diagrams.js', 'assets/js/generator.js'].forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
});
const { Generator } = ctx;

/* 官方答案表（来自 ICAS 官方 Answer Sheet）。
   数值题：期望 q.display 的字符串；
   选择题：期望「正确选项的文字」（比语义，不比原始字母，避免选项顺序差异）。 */
const EXPECT = {
  // ---- ICAS 2022 Year 2 ----
  'icas22y2m-01': '7',
  'icas22y2m-02': 'Next Monday will be 13 June',   // 正确答案 = 「下周一 = 6月13日」
  'icas22y2m-03': '9',
  'icas22y2m-04': '2',
  'icas22y2m-05': '39',
  'icas22y2m-06': 'triangle',
  'icas22y2m-07': '35',
  'icas22y2m-09': 'Tigers',
  'icas22y2m-10': '11',
  'icas22y2m-11': ['4', '6', '7'],                 // 多选：选出的三张卡片
  'icas22y2m-12': 'bottom-right clock',
  'icas22y2m-14': '14',
  'icas22y2m-15': '32',
  'icas22y2m-17': '4',
  'icas22y2m-18': 'Jim',
  'icas22y2m-19': '16',
  'icas22y2m-20': '36',
  'icas22y2m-22': 'spring',                        // 原卷问的是 November（悉尼春季）
  'icas22y2m-23': '10',
  'icas22y2m-25': '6',
  'icas22y2m-27': '14',
  'icas22y2m-28': '6',
  'icas22y2m-29': '15',
};

const bank = JSON.parse(fs.readFileSync(path.join(root, 'data/question-bank.json'), 'utf8'));
const list = Array.isArray(bank) ? bank : bank.templates;

let fail = 0, checked = 0;
const noOrig = [], noExpect = [];

list.forEach(tpl => {
  const hasImg = !!tpl.originalImage;
  if (tpl.original) {
    if (!EXPECT[tpl.id]) { noExpect.push(tpl.id); fail++; return; }
    const prev = Generator.preferLang;
    Generator.preferLang = 'en';                    // ICAS 原题是英文卷
    const q = Generator.instantiate(tpl, null, { original: true });
    Generator.preferLang = prev;
    if (!q) { console.log('  FAIL ' + tpl.id + ' 无法用原题数值实例化'); fail++; return; }
    const exp = EXPECT[tpl.id];
    let got, ok;
    if (Array.isArray(exp)) {
      got = (q.correctIndex || []).map(i => q.options[i]);
      ok = got.length === exp.length && exp.every((x, i) => String(got[i]) === x);
    } else if (q.type === 'choice') {
      got = q.options[q.correctIndex];
      ok = String(got) === exp;
    } else {
      got = q.display;
      ok = String(got) === exp;
    }
    checked++;
    if (!ok) { console.log('  FAIL ' + tpl.id + '  期望「' + exp + '」得到「' + got + '」'); fail++; }
  } else if (hasImg) {
    noOrig.push(tpl.id);
  }
});

console.log('='.repeat(70));
console.log('已校验原题：' + checked + ' 题，失败 ' + fail + ' 题');
if (noExpect.length) console.log('有 original 但缺官方答案对照（必须补）：' + noExpect.join(', '));
if (noOrig.length) console.log('有原卷图但未录入 original（' + noOrig.length + ' 题）：' + noOrig.join(', '));
const noImg = list.filter(t => !t.originalImage && !t.original).length;
console.log('无原卷图、不参与原题模式的模板：' + noImg + ' 条（示例模板等）');
if (fail) { console.log('\n✗ 原题自检未通过'); process.exit(1); }
console.log('\n✓ 原题自检全部通过');
