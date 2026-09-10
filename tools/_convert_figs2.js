/* 一次性脚本：把 FigureTodo 的 5 道题改成「参数化 + 简化 SVG」模板
   选项里凡是会用文字描述图形（=泄题）的，一律改成 SVG 选项。 */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
/* 同时改 data/question-bank.json 和 data/imports/*.json，
   否则下次 merge-bank.js 会用旧的 imports 把新模板覆盖回去。 */
const FILES = (process.argv[2] ? [process.argv[2]] : null) || [
  'data/question-bank.json',
  'data/imports/icas-2022-year2-math.json'
];

const next = {
  'icas22y2m-08': {
    vars: { bidx: { type: 'pick', from: [0, 1, 2, 3] } },
    stem: {
      zh: '杰克收到四个礼物盒（如下图）。红色虚线框标出的那个盒子，打开后他最可能找到什么？',
      en: 'Jack received four present boxes (diagram below). The box marked with the red dashed outline — what would he most likely find inside?'
    },
    diagram: { type: 'giftboxes', pick: 'bidx' },
    answer: {
      type: 'choice',
      options: [
        { zh: '滑板', en: 'a skateboard' },
        { zh: '篮球', en: 'a ball' },
        { zh: '手表', en: 'a watch' },
        { zh: '鞋子', en: 'a pair of shoes' }
      ],
      correctIndex: 'bidx'
    },
    solution: {
      zh: '看盒子的形状：又长又扁的最大盒子装滑板；又高又窄的装篮球；最小的装手表；中等偏大的装鞋子。',
      en: 'Match the shape: the long flat box holds a skateboard, the tall narrow box a ball, the smallest a watch, the medium box shoes.'
    }
  },

  'icas22y2m-23': {
    vars: { T: { type: 'int', min: 10, max: 30 } },
    derived: { amt: 'T * 5' },
    stem: {
      zh: '安娜的钱包里有很多 5 分、10 分、20 分、50 分的硬币（如下图）。她要正好付 {amt} 分，并且想「用尽可能多的硬币」。她最多要用多少枚硬币？',
      en: 'Anna has plenty of 5c, 10c, 20c and 50c coins (diagram below). She must pay exactly {amt}c and wants to use AS MANY coins as possible. What is the greatest number of coins she can use?'
    },
    diagram: { type: 'coins' },
    answer: { type: 'integer', expr: 'T', unit: '枚', sanity: { integer: true } },
    solution: {
      zh: '想用的硬币最多，就要尽量用最小面值的 5 分硬币：{amt} ÷ 5 = {T}（枚），而且 {amt} 正好是 5 的倍数，所以最多 {T} 枚。',
      en: 'To use the most coins, use the smallest value (5c) as much as possible: {amt} ÷ 5 = {T} coins.'
    }
  },

  'icas22y2m-24': {
    vars: {
      n: { type: 'pick', from: [4, 5, 6] },
      r: { type: 'int', min: 0, max: 4 },
      c: { type: 'int', min: 0, max: 4 }
    },
    constraints: ['r + 2 <= n', 'c + 2 <= n'],
    derived: { rr: 'r + 1', cc: 'c + 1' },
    stem: {
      zh: '本的桌面铺着蓝黄相间的方砖（如下图），红色虚线框里缺了一块 2×2 的补块。补块应该是什么样子的？',
      en: 'Ben\'s table top is tiled in a blue/yellow checker pattern (diagram below); a 2×2 patch is missing inside the red dashed box. What should the missing patch look like?'
    },
    diagram: { type: 'tiling', n: 'n', r: 'r', c: 'c' },
    answer: {
      type: 'choice',
      options: [
        { zh: '甲', en: 'A' }, { zh: '乙', en: 'B' }, { zh: '丙', en: 'C' }, { zh: '丁', en: 'D' }
      ],
      optionsSvg: [
        { type: 'tilepatch', r: 'r', c: 'c', flip: -1 },
        { type: 'tilepatch', r: 'r', c: 'c', flip: 0 },
        { type: 'tilepatch', r: 'r', c: 'c', flip: 1 },
        { type: 'tilepatch', r: 'r', c: 'c', flip: 2 }
      ],
      correctIndex: 0
    },
    solution: {
      zh: '把补块按桌面花纹的行列一格一格接上去：横向、纵向都是蓝黄交替，缺口从第 {rr} 行第 {cc} 列开始，四格的颜色就被唯一确定了。',
      en: 'Line the patch up with the rows and columns: the pattern alternates both ways, and the gap starts at row {rr}, column {cc}, so the four colours are fixed.'
    }
  },

  'icas22y2m-26': {
    vars: {
      rows: { type: 'pick', from: [5, 6] },
      cols: { type: 'pick', from: [5, 6] },
      sr: { type: 'int', min: 0, max: 3 },
      sc: { type: 'int', min: 1, max: 5 }
    },
    constraints: ['sr + 3 <= rows', 'sc <= cols - 1'],
    derived: {
      o0r: 'sr + 2', o0c: 'sc - 1',
      o1r: 'sr + 2', o1c: 'sc',
      o2r: 'sr + 1', o2c: 'sc - 1',
      o3r: 'sr', o3c: 'sc - 1',
      ar: 'sr + 3', ac: 'sc'
    },
    stem: {
      zh: '西塔的棋子（蓝点）在黑白棋盘上，马克站在棋盘的下方（如下图）。她把棋子往左移 1 格，又朝马克的方向前移 2 格。棋子最后停在哪一格？',
      en: 'Sita\'s counter (blue dot) is on a black-and-white board and Mark stands below the board (diagram below). She moves it 1 square left and then 2 squares forward toward Mark. On which square does it land?'
    },
    diagram: { type: 'board', rows: 'rows', cols: 'cols', sr: 'sr', sc: 'sc' },
    answer: {
      type: 'choice',
      options: [
        { zh: '甲', en: 'A' }, { zh: '乙', en: 'B' }, { zh: '丙', en: 'C' }, { zh: '丁', en: 'D' }
      ],
      optionsSvg: [
        { type: 'boardopt', rows: 'rows', cols: 'cols', hr: 'o0r', hc: 'o0c' },
        { type: 'boardopt', rows: 'rows', cols: 'cols', hr: 'o1r', hc: 'o1c' },
        { type: 'boardopt', rows: 'rows', cols: 'cols', hr: 'o2r', hc: 'o2c' },
        { type: 'boardopt', rows: 'rows', cols: 'cols', hr: 'o3r', hc: 'o3c' }
      ],
      correctIndex: 0
    },
    solution: {
      zh: '从棋子出发，先往左 1 格，再朝马克（向下）2 格，落在第 {ar} 行第 {ac} 列（从上往下、从左往右数）。',
      en: 'From the counter, 1 left then 2 toward Mark (downwards) lands on row {ar}, column {ac} (counting from the top-left).'
    }
  },

  'icas22y2m-30': {
    vars: {
      a: { type: 'int', min: 2, max: 6 },
      f1: { type: 'int', min: 0, max: 4 },
      f2: { type: 'int', min: 0, max: 4 },
      f3: { type: 'int', min: 0, max: 4 }
    },
    constraints: ['a + f2 >= f1', 'a + f3 >= f2', 'a >= f3', 'f1 + f2 + f3 >= 1'],
    derived: {
      pA: 'a + f1', pB: 'a + f2 - f1', pC: 'a + f3 - f2', pD: 'a - f3',
      tot: 'a * 4', ans: 'f1 + f2 + f3'
    },
    stem: {
      zh: '农夫乔有 A、B、C、D 四个猪圈（如下图），猪只能按箭头方向从一个圈赶到相邻的下一个圈。他想让每个猪圈的猪一样多，最少要移动多少头猪？',
      en: 'Farmer Joe has four pens A, B, C and D (diagram below); pigs may only be moved in the direction of the arrows into the next pen. He wants every pen to hold the same number of pigs. What is the fewest pigs he must move?'
    },
    diagram: { type: 'pens', pA: 'pA', pB: 'pB', pC: 'pC', pD: 'pD' },
    answer: { type: 'integer', expr: 'ans', unit: '头', sanity: { integer: true } },
    solution: {
      zh: '四个圈一共 {tot} 头猪，平均每个圈 {a} 头。只能按 A→B→C→D 的方向赶：A 多 {f1} 头只能给 B；B 接着多 {f2} 头给 C；C 再多 {f3} 头给 D。一共要移动 {ans} 头。',
      en: 'There are {tot} pigs in all, so {a} per pen. Pigs only move A→B→C→D: A passes {f1} on, B passes {f2}, C passes {f3}. Total moved: {ans}.'
    }
  }
};

for (const rel of FILES) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) { console.log('跳过（不存在）' + rel); continue; }
  const bank = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = bank.templates || bank;
  let n = 0;
  for (const t of list) {
    const p = next[t.id];
    if (!p) continue;
    Object.keys(p).forEach(k => { t[k] = p[k]; });
    delete t.image;          // 静态原题图对不上新数值，不再出现在试卷里
    delete t.figureTodo;     // 已参数化
    n++;
  }
  fs.writeFileSync(file, JSON.stringify(bank, null, 2), 'utf8');
  console.log(rel + '：已改写 ' + n + ' 个模板');
}
