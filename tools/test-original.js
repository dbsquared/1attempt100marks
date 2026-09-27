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
  // ---- SEAMO 2025 Paper A ----
  'seamo25a-q01': '31',
  'seamo25a-q02': { svg: ['data-u="shape" data-n="4"'], note: '正方形（4 条边）＝原卷答案 B' },
  'seamo25a-q03': '163',
  'seamo25a-q04': '135',
  'seamo25a-q05': '12',
  'seamo25a-q06': '28',
  'seamo25a-q07': '23',
  'seamo25a-q08': '10',
  'seamo25a-q09': '1',                             // 原卷第 1 个圆圈 = 1（选项就是 1~5）
  'seamo25a-q10': { svg: ['data-u="disc" data-start="3" data-count="3"'], note: '3 个阴影扇形，从 3 点钟起（原卷答案 C）' },
  'seamo25a-q11': '3h 15 min',
  'seamo25a-q12': '$63',
  'seamo25a-q13': '18',
  'seamo25a-q14': 'Tuesday',
  'seamo25a-q15': '22',
  'seamo25a-q16': '420',
  'seamo25a-q17': '21',
  'seamo25a-q18': '20',
  'seamo25a-q19': { svg: ['data-segs="00-20;20-22;22-02;02-00;00-22;20-02"'], note: '正方形＋两条对角线（原卷答案 D）' },
  'seamo25a-q20': '24',
  'seamo25a-q21': '5',
  'seamo25a-q22': '5:00 PM',
  'seamo25a-q23': '121',
  'seamo25a-q24': '9',
  'seamo25a-q25': '19',
  // ---- Mastering Mathematics Book 1 · TEST 1（40 题，官方答案已逐题核对）----
  'mm1t1-01': '0.01',   // 卷 A
  'mm1t1-02': '8',   // 卷 D
  'mm1t1-03': '57.365',   // 卷 D
  'mm1t1-04': 'litres',   // 卷 B
  'mm1t1-05': '60',   // 卷 B
  'mm1t1-06': '1/200',   // 卷 B
  'mm1t1-07': '1600',   // 卷 D
  'mm1t1-08': '13',   // 卷 C
  'mm1t1-09': '5 × n',   // 卷 C
  'mm1t1-10': '500',   // 卷 A
  'mm1t1-11': 'base 5 cm, height 6 cm',   // 卷 A
  'mm1t1-12': 'P1 and P2 have the same perimeter',   // 卷 B
  'mm1t1-13': '(L + 2) × (W + 2)',   // 卷 D
  'mm1t1-14': '132',   // 卷 C
  'mm1t1-15': '160',   // 卷 A
  'mm1t1-16': 'snake',   // 卷 B
  'mm1t1-17': 'The quotient of a positive number and a negative number is negative.',   // 卷 C（正÷负=负；参数化后正确项固定放在 options[0]）
  'mm1t1-18': '4:7',   // 卷 B
  'mm1t1-19': '-19',   // 卷 D
  'mm1t1-20': '7',   // 卷 B
  'mm1t1-21': 'cannot be determined',   // 卷 D
  'mm1t1-22': '104',   // 卷 D
  'mm1t1-23': '21',   // 卷 A
  'mm1t1-24': '9',   // 卷 B
  'mm1t1-25': 'Z',   // 卷 D
  'mm1t1-26': '180',   // 卷 A
  'mm1t1-27': '1',   // 卷 C
  'mm1t1-28': 'B',   // 卷 B
  'mm1t1-29': '3',   // 卷 A
  'mm1t1-30': '1629630000',   // 卷 B
  'mm1t1-31': '69',   // 卷 D
  'mm1t1-32': '16',   // 卷 C
  'mm1t1-33': 'Ben',   // 卷 D
  'mm1t1-34': 'two equal sides and one right angle',   // 卷 C
  'mm1t1-35': '21',   // 卷 B
  'mm1t1-36': '8 and 40',   // 卷 D
  'mm1t1-37': '1800',   // 卷 B
  'mm1t1-38': '24',   // 卷 B
  'mm1t1-39': '14',   // 卷 C
  'mm1t1-40': '9',   // 卷 B
  // ---- Mastering Mathematics Book 1 · TEST 2（40 题，官方答案已逐题核对）----
  'mm1t2-01': '3 11/25',   // 卷 D
  'mm1t2-02': '1/4',   // 卷 C
  'mm1t2-03': '1.666',   // 卷 D
  'mm1t2-04': '72 grams',   // 卷 A
  'mm1t2-05': '7/9',   // 卷 A
  'mm1t2-06': '21',   // 卷 C
  'mm1t2-07': '1000000 mm^2',   // 卷 D
  'mm1t2-08': 'n^2 + 2n',   // 卷 B
  'mm1t2-09': 'South-West',   // 卷 C
  'mm1t2-10': 'North-East',   // 卷 B
  'mm1t2-11': '11',   // 卷 D
  'mm1t2-12': '66.4 m',   // 卷 B
  'mm1t2-13': '720 degrees',   // 卷 D
  'mm1t2-14': '32',   // 卷 C
  'mm1t2-15': '14/32',   // 卷 D
  'mm1t2-16': 'right-angled',   // 卷 C
  'mm1t2-17': '15',   // 卷 D
  'mm1t2-18': '1.25 m',   // 卷 A
  'mm1t2-19': '180',   // 卷 B
  'mm1t2-20': '144',   // 卷 C
  'mm1t2-21': 'All the angles in a parallelogram are equal.',   // 卷 D
  'mm1t2-22': '30 minutes',   // 卷 A
  'mm1t2-23': '35 litres',   // 卷 B
  'mm1t2-24': '6',   // 卷 B
  'mm1t2-25': '12 1/2 cans',   // 卷 C
  'mm1t2-26': '90',   // 卷 C
  'mm1t2-27': '$300',   // 卷 A
  'mm1t2-28': '(4000 x 50)/30',   // 卷 D
  'mm1t2-29': '224',   // 卷 A
  'mm1t2-30': '$3.2',   // 卷 C
  'mm1t2-31': '38',   // 卷 D
  'mm1t2-32': '1200',   // 卷 D
  'mm1t2-33': '2 km',   // 卷 A
  'mm1t2-34': '$40',   // 卷 A
  'mm1t2-35': '64',   // 卷 B
  'mm1t2-36': '3/30',   // 卷 D
  'mm1t2-37': '15/16',   // 卷 B
  'mm1t2-38': '20',   // 卷 A
  'mm1t2-39': '5',   // 卷 B
  'mm1t2-40': '15%',   // 卷 A
  /* ---- Mastering Mathematics Book 1 · TEST 3 ---- */
  'mm1t3-01': '0.43',   // 卷 C
  'mm1t3-02': '12/8',   // 卷 B（[[12/8]] 渲染为分数，即原卷 1 1/2）
  'mm1t3-03': '8217',   // 卷 C
  'mm1t3-04': '3240',   // 卷 D
  'mm1t3-05': 'I and III only',   // 卷 D（空 vars 定性题，回退按 correctIndex 比对）
  'mm1t3-06': '12 cm^2',   // 卷 A
  'mm1t3-07': '3',   // 卷 D
  'mm1t3-08': '29',   // 卷 D
  'mm1t3-09': '8090020.01',   // 卷 D
  'mm1t3-10': '120 cm',   // 卷 C
  'mm1t3-11': '36',   // 卷 B
  'mm1t3-12': '0.318',   // 卷 A
  'mm1t3-13': '3',   // 卷 D
  'mm1t3-14': '25',   // 卷 C
  'mm1t3-15': '2',   // 卷 A（空 vars 定性题）
  'mm1t3-16': '32',   // 卷 D
  'mm1t3-17': 'A = 2, B = 6, C = 3',   // 卷 C（空 vars 定性题）
  'mm1t3-18': '$900',   // 卷 B
  'mm1t3-19': '$1500',   // 卷 C
  'mm1t3-20': '450 games',   // 卷 C
  'mm1t3-21': '0.45 kg',   // 卷 D（阶梯图固定题）
  'mm1t3-22': '75 cm^2',   // 卷 B
  'mm1t3-23': '40',   // 卷 C
  'mm1t3-24': 'The sum of P and Q is a multiple of 6.',   // 卷 D（空 vars 定性题）
  'mm1t3-25': '6.667 %',   // 卷 B
  'mm1t3-26': '27',   // 卷 D
  'mm1t3-27': { svg: 0 },   // 卷 C（选项是图：cur[0] = dec-soft）
  'mm1t3-28': '140 cm^2',   // 卷 D
  'mm1t3-29': '17 x (510/150)',   // 卷 B
  'mm1t3-30': '3 h 5 min',   // 卷 A
  'mm1t3-31': '1/3',   // 卷 A
  'mm1t3-32': '38',   // 卷 B
  'mm1t3-33': '19, 2',   // 卷 D
  'mm1t3-34': '$1170',   // 卷 C
  'mm1t3-35': 'm^2',   // 卷 D
  'mm1t3-36': '15',   // 卷 D
  'mm1t3-37': '2 minutes',   // 卷 C
  'mm1t3-38': '52 kg',   // 卷 A
  'mm1t3-39': '2',   // 卷 D（原卷写作 2/1，等值；参数化后选项统一成最简 2）
  'mm1t3-40': '14',   // 卷 B（figureTodo，固定题）
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
