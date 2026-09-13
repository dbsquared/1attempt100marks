/* 原题模式自检：node tools/test-original.js
 * 1) 每个带 original 字段的模板，用「原题数值」实例化后，答案必须与官方答案表一致
 *    （数值题比 display；选择题比正确选项文字；选项是图的比正确选项 SVGO 里的关键结构）。
 * 2) 原题数值必须满足模板自己的 constraints（否则原题模式会出「不可能出现」的题）。
 * 3) 列出「有原卷图但未录入原题数值」的模板，避免遗漏。
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
   选择题：期望「正确选项的文字」（比语义，不比原始字母，避免选项顺序差异）；
   选项是图：期望 {svg:[必须出现的关键片段], count:[片段, 次数]}。 */
const EXPECT = {
  // ---- ICAS 2022 Year 2 ----
  'icas22y2m-01': '7',
  'icas22y2m-02': 'Next Monday will be 13 June',   // 正确答案 = 「下周一 = 6月13日」
  'icas22y2m-03': '9',
  'icas22y2m-04': '2',
  'icas22y2m-05': '39',
  'icas22y2m-06': 'triangle',
  'icas22y2m-07': '35',
  'icas22y2m-08': 'a ball',                        // 虚线框 = 最大最方的盒子 = 篮球（答案表：basketball = tallest box）
  'icas22y2m-09': 'Tigers',
  'icas22y2m-10': '11',
  'icas22y2m-11': ['4', '6', '7'],                 // 多选：选出的三张卡片
  'icas22y2m-12': 'bottom-right clock',
  'icas22y2m-14': '14',
  'icas22y2m-15': '32',
  'icas22y2m-16': 'green',                         // 位置 = 上数第 2 层、右数第 3 本（原卷答案：那本斜靠着左倾的书）
  'icas22y2m-17': '4',
  'icas22y2m-18': 'Jim',
  'icas22y2m-19': '16',
  'icas22y2m-20': '36',
  'icas22y2m-22': 'spring',                        // 原卷问的是 November（悉尼春季）
  'icas22y2m-23': '10',
  'icas22y2m-24': 'A',                             // 原卷正确选项就是 A 那块补块
  'icas22y2m-25': '6',
  'icas22y2m-26': 'A',                             // 落到「倒数第 2 行、靠右」的那一格 = 正确项 A
  'icas22y2m-27': '14',
  'icas22y2m-28': '6',
  'icas22y2m-29': '15',
  'icas22y2m-30': '7',                             // 最少搬 7 头
  // ---- ICAS 2021 Year 2 ----
  'icas21y2m-01': '8',
  'icas21y2m-02': 'star',
  'icas21y2m-03': 'Wednesday',
  'icas21y2m-04': '2',
  'icas21y2m-05': 'A and D',
  'icas21y2m-06': '11',
  'icas21y2m-07': ['How many pets do you have?', 'How old are you?'],
  'icas21y2m-08': '31',
  'icas21y2m-09': { svg: ['data-u="optdom" data-a="3" data-b="6"'], note: '6|3 骨牌（原卷答案，和为 9）' },
  'icas21y2m-10': 'blue',                          // 最右第 4 盆 = 蓝色
  'icas21y2m-11': '5',
  'icas21y2m-12': { match: [360, 750, 60, 690], note: '06:00 / 12:30 / 01:00 / 11:30 四组按 key 配对' },
  'icas21y2m-13': '71',
  'icas21y2m-14': { svg: ['data-kind="star"', 'data-kind="circle"'], note: '星 + 圆（原卷答案那一对）' },
  'icas21y2m-15': '40',
  'icas21y2m-17': { svg: ['aria-label="2 rows of 5 bears"'], note: 'Shape4 = 2 行 5 只' },
  'icas21y2m-18': 'yellow',
  'icas21y2m-19': '37',
  'icas21y2m-20': { bars: [9, 3, 6], note: 'Tim 9 / David 3 / Amy 6（原卷三人的真实条高）' },
  'icas21y2m-21': { svg: ['data-u="water" data-level="3"'], note: '水位在第 3 道凹纹 = 半瓶（共 6 道）' },
  'icas21y2m-22': { svg: ['data-u="edge"'], count: ['data-u="edge"', 6], note: '按编号 1→2→…→6→1 连成闭合环' },
  'icas21y2m-23': '2',
  'icas21y2m-24': '35',
  'icas21y2m-25': '33',
  'icas21y2m-27': '6',
  'icas21y2m-28': '39',
  'icas21y2m-29': 'Sita, Ben, Lin, Pete',          // 从左到右
  'icas21y2m-30': '5',
};

const bank = JSON.parse(fs.readFileSync(path.join(root, 'data/question-bank.json'), 'utf8'));
const list = Array.isArray(bank) ? bank : bank.templates;

let fail = 0, checked = 0, consBad = 0;
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

    /* 原题数值必须满足模板约束 */
    const bad = (tpl.constraints || []).filter(c => {
      try { return !ctx.Expr.test(c, q.vars); } catch (e) { return true; }
    });
    if (bad.length) {
      console.log('  FAIL ' + tpl.id + ' 原题数值违反自身约束：' + bad.join('  ;  '));
      consBad++; fail++;
    }

    const exp = EXPECT[tpl.id];
    let got, ok;
    if (Array.isArray(exp)) {                       // 多选 / match
      got = (q.correctIndex || []).map(i => q.options[i]);
      ok = got.length === exp.length && exp.every((x, i) => String(got[i]) === x);
    } else if (exp && typeof exp === 'object' && exp.match) {   // match 连线题：按 key 配对
      const keys = arr => arr.map(x => x.key).sort((a, b) => a - b);
      const L = keys(q.leftItems || []), R = keys(q.rightItems || []), E = exp.match.slice().sort((a, b) => a - b);
      got = 'left=' + JSON.stringify(L) + ' right=' + JSON.stringify(R);
      ok = q.type === 'match' && JSON.stringify(L) === JSON.stringify(E) && JSON.stringify(R) === JSON.stringify(E);
    } else if (exp && typeof exp === 'object' && exp.bars) {    // 柱状图选项：按 data-v 顺序比条高
      const svg = (q.optionsSvg || [])[q.correctIndex] || '';
      const gb = (svg.match(/data-v="(-?\d+)"/g) || []).map(x => +x.replace(/\D+/g, ''));
      got = JSON.stringify(gb);
      ok = JSON.stringify(gb) === JSON.stringify(exp.bars);
    } else if (exp && typeof exp === 'object') {    // 选项是图：查正确选项 SVG 结构
      const svg = (q.optionsSvg || [])[q.correctIndex] || '';
      got = '#' + q.correctIndex + (exp.note ? '（' + exp.note + '）' : '');
      ok = !!svg;
      (exp.svg || []).forEach(needle => { if (svg.indexOf(needle) < 0) ok = false; });
      if (exp.count) ok = ok && (svg.split(exp.count[0]).length - 1) === exp.count[1];
      if (!ok) got = 'SVG 里找不到期望结构';
    } else if (q.type === 'choice') {
      got = q.options[q.correctIndex];
      ok = String(got) === exp;
    } else {
      got = q.display;
      ok = String(got) === exp;
    }
    checked++;
    if (!ok) { console.log('  FAIL ' + tpl.id + '  期望「' + (typeof exp === 'object' ? JSON.stringify(exp.svg || exp) : exp) + '」得到「' + got + '」  vars=' + JSON.stringify(q.vars)); fail++; }
  } else if (hasImg) {
    noOrig.push(tpl.id);
  }
});

console.log('='.repeat(70));
console.log('已校验原题：' + checked + ' 题，失败 ' + fail + ' 题（其中约束不通过 ' + consBad + ' 题）');
if (noExpect.length) console.log('有 original 但缺官方答案对照（必须补）：' + noExpect.join(', '));
if (noOrig.length) console.log('有原卷图但未录入 original（' + noOrig.length + ' 题）：' + noOrig.join(', '));
const noImg = list.filter(t => !t.originalImage && !t.original).length;
console.log('无原卷图、不参与原题模式的模板：' + noImg + ' 条（示例模板等）');
if (fail) { console.log('\n✗ 原题自检未通过'); process.exit(1); }
console.log('\n✓ 原题自检全部通过');
