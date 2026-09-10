/* 一次性脚本：把「原题有图但没配图」的题改成「参数化 + 简化 SVG」模板。
   原则：图里承载的信息不要再写进题干 —— 从图里读出规律本身就是考点。
   同时修掉 Q3 的规律错误（原题是三角形共用边，2n+1；原来写成了 3n）。 */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const FILES = (process.argv[2] ? [process.argv[2]] : null) || [
  'data/question-bank.json',
  'data/imports/icas-2022-year2-math.json'
];

const next = {
  /* ---------- Q2 天气卡片 + 可能性 ---------- */
  'icas22y2m-02': {
    vars: { d: { type: 'int', min: 1, max: 23 } },
    diagram: { type: 'weathercard', day: 'd', month: 6, weather: 'sunny' },
    stem: {
      zh: '看下图：今天是 6 月 {d} 日，星期一，天气晴朗。下面哪一句说的是「一定」会发生的事？',
      en: 'Look at the picture: today is Monday {d} June and it is sunny. Which statement is CERTAIN to happen?'
    },
    answer: {
      type: 'choice',
      options: [
        { zh: '明天将会是星期四', en: 'Tomorrow will be Thursday' },
        { zh: '下星期一将会是 6 月 {d+7} 日', en: 'Next Monday will be {d+7} June' },
        { zh: '明天也会是晴天', en: 'It will be sunny tomorrow as well' }
      ],
      correctIndex: 1
    },
    solution: {
      zh: '今天是星期一，所以明天是星期二，「明天是星期四」一定不会发生。天气明天可能晴也可能不晴，只是「可能」。但今天是 6 月 {d} 日星期一，再过 7 天（下星期一）一定是 6 月 {d+7} 日 —— 这是「一定」。',
      en: 'Today is Monday, so tomorrow is Tuesday: "Thursday tomorrow" will NOT happen. Tomorrow\'s weather only MIGHT be sunny. But Monday {d} June plus 7 days is always {d+7} June, so that one is certain.'
    }
  },

  /* ---------- Q3 小棒搭图形（修规律 + 加图） ---------- */
  'icas22y2m-03': {
    vars: { n: { type: 'pick', from: [4, 5, 6, 7, 8] } },
    diagram: { type: 'stickrow', shapes: 3 },
    stem: {
      zh: '杰丝用小棒搭图形：图形 1、图形 2、图形 3 的样子如下图。照这个规律，搭图形 {n} 一共要用多少根小棒？',
      en: 'Jess makes shapes with sticks. Shapes 1, 2 and 3 are shown below. Following the same pattern, how many sticks does she need to make shape {n}?'
    },
    answer: { type: 'integer', expr: '2*n + 1', unit: '根', sanity: { integer: true } },
    solution: {
      zh: '仔细看图：每多搭一个三角形，新三角形都和原来的共用一条边，所以只需要再加 2 根小棒。图形 1 用 3 根、图形 2 用 5 根、图形 3 用 7 根……图形 {n} 就是 3 + 2×({n}−1) = {2*n+1} 根。',
      en: 'Each new triangle shares a side with the previous one, so every extra triangle only needs 2 more sticks: 3, 5, 7, … Shape {n} needs 3 + 2×({n}−1) = {2*n+1} sticks.'
    }
  },

  /* ---------- Q5 按规则摆两位数（卡片图） ---------- */
  'icas22y2m-05': {
    vars: { p: { type: 'pick', from: [0, 1, 2, 3] } },
    derived: {
      t: '2*(p==0) + 4*(p==1) + 3*(p==2) + 2*(p==3)',
      d: '4*(p==0) + 5*(p==1) + 6*(p==2) + 7*(p==3)',
      u: 't + d'
    },
    diagram: { type: 'cardrow', cards: [2, 3, 4, 6, 9], slots: 2 },
    stem: {
      zh: '莉兹用下图里的数字卡片摆了一个两位数（每张卡片只能用一次）：个位数字比十位数字大 {d}。她摆的两位数是多少？',
      en: 'Liz used the digit cards below to make a two-digit number (each card used once). The units digit is {d} more than the tens digit. What number did she make?'
    },
    answer: { type: 'integer', expr: '10*t + u', sanity: { integer: true } },
    solution: {
      zh: '从卡片 2、3、4、6、9 里找相差 {d} 的两张：只有 {t} 和 {u} 这一对，所以十位是 {t}、个位是 {u}，两位数是 {10*t+u}。',
      en: 'Among the cards 2, 3, 4, 6 and 9, only {t} and {u} differ by {d}, so the tens digit is {t} and the units digit is {u}: {10*t+u}.'
    }
  },

  /* ---------- Q9 象形统计图 ---------- */
  'icas22y2m-09': {
    vars: {
      c0: { type: 'int', min: 1, max: 8 }, c1: { type: 'int', min: 1, max: 8 },
      c2: { type: 'int', min: 1, max: 8 }, c3: { type: 'int', min: 1, max: 8 }
    },
    derived: {
      T: 'c2 + 2',
      ci: '0*(c0==T) + 1*(c1==T) + 2*(c2==T) + 3*(c3==T)'
    },
    constraints: ['((c0==T)+(c1==T)+(c2==T)+(c3==T)) == 1'],
    diagram: {
      type: 'pictograph',
      labels: ['Tigers 虎', 'Eels 鳗', 'Hawks 鹰', 'Bees 蜂'],
      counts: ['c0', 'c1', 'c2', 'c3'],
      unit: '个进球'
    },
    stem: {
      zh: '下图是四支球队上一场比赛进球数的象形统计图（每个球代表 1 个进球）。哪一支队进的球正好比鹰队多 2 个？',
      en: 'The pictograph below shows the goals four teams scored in their last game (each ball = 1 goal). Which team scored exactly 2 more goals than the Hawks?'
    },
    answer: {
      type: 'choice',
      options: [
        { zh: '老虎队', en: 'Tigers' },
        { zh: '鳗鱼队', en: 'Eels' },
        { zh: '鹰队', en: 'Hawks' },
        { zh: '蜜蜂队', en: 'Bees' }
      ],
      correctIndex: 'ci'
    },
    solution: {
      zh: '先从图上数出鹰队是 {c2} 个球。比 {c2} 多 2 就是 {T} 个，再到图上找进球数是 {T} 的那一队，就是答案。',
      en: 'Read the Hawks from the graph: {c2} goals. Two more than {c2} is {T}; find the column with {T} balls in the graph.'
    }
  },

  /* ---------- Q10 图形符号加减（符号算式图） ---------- */
  'icas22y2m-10': {
    vars: { a: { type: 'int', min: 5, max: 9 }, b: { type: 'int', min: 2, max: 6 }, c: { type: 'int', min: 1, max: 4 } },
    diagram: {
      type: 'symeq',
      legend: [{ s: '◆', v: 'a' }, { s: '✿', v: 'b' }, { s: '❁', v: 'c' }],
      rows: [{ terms: ['◆', '+', '✿', '-', '❁'], rhs: '?' }]
    },
    stem: {
      zh: '看下图的算式（每个图形代表一个数）。◆ ＋ ✿ − ❁ 等于多少？',
      en: 'Look at the equations below (each shape stands for a number). What is ◆ + ✿ − ❁ ?'
    },
    answer: { type: 'integer', expr: 'a + b - c', sanity: { integer: true } },
    solution: {
      zh: '从图上读出 ◆＝{a}、✿＝{b}、❁＝{c}，代入算式：{a}＋{b}−{c}＝{a+b-c}。',
      en: 'From the picture ◆＝{a}, ✿＝{b}, ❁＝{c}, so {a}+{b}−{c}＝{a+b-c}.'
    }
  },

  /* ---------- Q11 选三张卡片（卡片图） ---------- */
  'icas22y2m-11': {
    diagram: { type: 'cardrow', cards: ['v1', 'v2', 'v3', 'v4', 'v5'], slots: 0 },
    stem: {
      zh: '从下图五张卡片中选出「三张」，使三张卡片上的数加起来正好是 {T}。（点选三张卡片）',
      en: 'Choose THREE of the five cards below so that the three numbers add up to exactly {T}.'
    },
    solution: {
      zh: '把三张卡片相加试试：{v1}＋{v3}＋{v4}＝{T}，正好符合，所以选这三张。',
      en: '{v1}+{v3}+{v4}＝{T}, so these three cards are the answer.'
    }
  },

  /* ---------- Q13a 电梯（地上） ---------- */
  'icas22y2m-13a': {
    vars: {
      b: { type: 'pick', from: [1, 2, 3] },
      u: { type: 'int', min: 4, max: 9 },
      d: { type: 'int', min: 1, max: 3 },
      up: { type: 'pick', from: [6, 7] },
      down: { type: 'pick', from: [4, 5] }
    },
    constraints: ['0 - b + u - d >= 1', '0 - b + u - d <= up'],
    diagram: { type: 'building', up: 'up', down: 'down' },
    stem: {
      zh: '卡拉从下图这栋楼的 B{b} 层进了电梯。电梯上升了 {u} 层，又下降了 {d} 层，然后她出了电梯。她是在地上几楼出的电梯？（G 是地面层，地上从 1 楼数起）',
      en: 'Cara got into the lift at level B{b} of the building below. She went up {u} levels, then down {d} levels, and got out. What floor ABOVE ground did she get out at? (G is the ground floor; floors above count from 1.)'
    },
    answer: { type: 'integer', expr: '0 - b + u - d', sanity: { integer: true, min: 1 } },
    solution: {
      zh: '把 B{b} 层当成 −{b}：从 −{b} 出发，上升 {u} 层、下降 {d} 层，就是 −{b}＋{u}−{d}＝{0-b+u-d}。结果是正数，说明在地面以上，也就是地上 {0-b+u-d} 楼。',
      en: 'Treat B{b} as −{b}: −{b}+{u}−{d}＝{0-b+u-d}. A positive answer means above ground, so she got out at floor {0-b+u-d}.'
    }
  },

  /* ---------- Q13b 电梯（地下） ---------- */
  'icas22y2m-13b': {
    vars: {
      b: { type: 'pick', from: [1, 2, 3] },
      u: { type: 'int', min: 1, max: 5 },
      d: { type: 'int', min: 2, max: 6 },
      up: { type: 'pick', from: [6, 7] },
      down: { type: 'pick', from: [4, 5] }
    },
    constraints: ['0 - b + u - d <= -1', '0 - b + u - d >= 0 - down'],
    diagram: { type: 'building', up: 'up', down: 'down' },
    stem: {
      zh: '卡拉从下图这栋楼的 B{b} 层进了电梯。电梯上升了 {u} 层，又下降了 {d} 层，然后她出了电梯。她是在地下哪一层出的电梯？（B1 是地下 1 层）',
      en: 'Cara got into the lift at level B{b} of the building below. She went up {u} levels, then down {d} levels, and got out. What level BELOW ground did she get out at? (B1 is one level below ground.)'
    },
    answer: { type: 'text', expr: 'B{0 - (0 - b + u - d)}' },
    solution: {
      zh: '把 B{b} 层当成 −{b}：−{b}＋{u}−{d}＝{0-b+u-d}。结果是负数，说明仍在地下，就是 B{0-(0-b+u-d)} 层。',
      en: 'Treat B{b} as −{b}: −{b}+{u}−{d}＝{0-b+u-d}. Negative means below ground, i.e. level B{0-(0-b+u-d)}.'
    }
  },

  /* ---------- Q14 划记统计表 ---------- */
  'icas22y2m-14': {
    vars: {
      a: { type: 'int', min: 3, max: 12 }, b: { type: 'int', min: 1, max: 8 },
      c: { type: 'int', min: 2, max: 9 }, dd: { type: 'int', min: 1, max: 8 }
    },
    diagram: {
      type: 'tallychart',
      rows: [
        { kind: 'car', label: '小汽车 Cars', count: 'a' },
        { kind: 'bike', label: '自行车 Bikes', count: 'b' },
        { kind: 'truck', label: '卡车 Trucks', count: 'c' },
        { kind: 'bus', label: '公交车 Buses', count: 'dd' }
      ]
    },
    stem: {
      zh: '下图是玛丽在公交站数到的车（划记统计表，每 5 个一组）。她看到的小汽车和卡车一共有多少辆？',
      en: 'The tally chart below shows the vehicles Mary counted at the bus stop (tally marks in groups of 5). How many cars and trucks did she see altogether?'
    },
    answer: { type: 'integer', expr: 'a + c', unit: '辆', sanity: { integer: true } },
    solution: {
      zh: '从图上数划记：小汽车 {a} 辆，卡车 {c} 辆，一共 {a}＋{c}＝{a+c} 辆。',
      en: 'Count the tallies: {a} cars and {c} trucks, so {a}+{c}＝{a+c}.'
    }
  },

  /* ---------- Q18 轮流倒数（围圈图 + 答案真的会变） ---------- */
  'icas22y2m-18': {
    vars: {
      S: { type: 'pick', from: [20, 24, 28] },
      n: { type: 'int', min: 3, max: 27 }
    },
    constraints: ['n < S', 'n >= S - 16'],
    diagram: { type: 'standcircle', start: 'S' },
    stem: {
      zh: '四个小伙伴围成一圈轮流往下倒数，数数的顺序和头几个数如下图。照这样数下去，「{n}」会轮到谁说？',
      en: 'Four friends take turns counting backwards around a circle; the order and the first few numbers are shown below. Who will say "{n}"?'
    },
    answer: {
      type: 'choice',
      options: [{ zh: '甲', en: 'A' }, { zh: '乙', en: 'B' }, { zh: '丙', en: 'C' }, { zh: '丁', en: 'D' }],
      correctIndex: '(S - n) % 4'
    },
    solution: {
      zh: '从图上看，甲、乙、丙、丁依次报一个数，四个人轮一圈。从 {S} 数到 {n} 一共报了 {S}−{n}＝{S-n} 个数，{S-n}÷4 的余数是 {(S-n)%4}，所以是第 {(S-n)%4+1} 个人报的，也就是答案。',
      en: 'From the picture the turn order is a four-person cycle. From {S} down to {n} is {S}−{n}＝{S-n} numbers; the remainder of {S-n}÷4 is {(S-n)%4}, so it is the {(S-n)%4+1}th person in the cycle.'
    }
  },

  /* ---------- Q25 三张纸（按比例画） ---------- */
  'icas22y2m-25': {
    vars: { m: { type: 'pick', from: [3, 4, 5] }, k: { type: 'pick', from: [2, 3, 4] } },
    diagram: { type: 'papers', m: 'm', k: 'k' },
    stem: {
      zh: '鲍比有三张长方形纸，下图按实际大小画出了它们（同样宽，长度不同）。黄纸的大小是红纸的 {m} 倍，红纸是蓝纸的 {k} 倍。一张黄纸能正好铺满多少张蓝纸？',
      en: 'Bobby has three rectangular sheets, drawn to scale below (same width, different lengths). The yellow sheet is {m} times the size of the red sheet, and the red sheet is {k} times the size of the blue sheet. How many blue sheets exactly cover one yellow sheet?'
    },
    answer: { type: 'integer', expr: 'm * k', unit: '张', sanity: { integer: true } },
    solution: {
      zh: '红纸是蓝纸的 {k} 倍，黄纸又是红纸的 {m} 倍，所以黄纸是蓝纸的 {k}×{m}＝{m*k} 倍 —— 要 {m*k} 张蓝纸才能正好铺满一张黄纸。',
      en: 'Red is {k} times blue and yellow is {m} times red, so yellow is {k}×{m}＝{m*k} times blue: {m*k} blue sheets cover one yellow sheet.'
    }
  },

  /* ---------- Q27 数据表（把散文改成表格图） ---------- */
  'icas22y2m-27': {
    diagram: {
      type: 'datatable',
      cols: ['分钟 min', '飞来 Arrive', '飞走 Fly away'],
      rows: [['5', 'a1', 'f1'], ['10', 'a2', 'f2'], ['15', 'a3', 'f3'], ['20', 'a4', 'f4']]
    },
    stem: {
      zh: '池塘里原有 {s} 只鸟。蒂娜每隔 5 分钟记录一次飞来的和飞走的鸟数（见下表）。20 分钟后池塘里有多少只鸟？',
      en: 'There were {s} birds on the pond. Tina recorded the birds arriving and flying away every 5 minutes (see the table). How many birds are on the pond after 20 minutes?'
    },
    solution: {
      zh: '把表里的每次变化依次算下来：{s}＋{a1}−{f1}＝{s+a1-f1}；{s+a1-f1}＋{a2}−{f2}＝{s+a1+a2-f1-f2}；再 {a3} 进 {f3} 出得 {s+a1+a2+a3-f1-f2-f3}；最后 {a4} 进 {f4} 出，得 {T} 只。',
      en: 'Work through the table step by step: {s}+{a1}−{f1}＝{s+a1-f1}; then +{a2}−{f2}＝{s+a1+a2-f1-f2}; then +{a3}−{f3}＝{s+a1+a2+a3-f1-f2-f3}; finally +{a4}−{f4}＝{T}.'
    }
  },

  /* ---------- Q28 积木塔（3D 图） ---------- */
  'icas22y2m-28': {
    vars: { n: { type: 'pick', from: [4, 5] }, off: { type: 'int', min: 0, max: 5 } },
    diagram: {
      type: 'blockstack',
      labels: ['黄', '蓝', '绿', '粉', '紫'],
      fills: ['#f5c518', '#9fd3f0', '#7bc47f', '#f2a6b3', '#b25be0'],
      count: 'n',
      offset: 'off'
    },
    stem: {
      zh: '吉娜有 {n} 块颜色不同的积木（见下图，每块颜色都不一样）。她想搭一座 {n} 层的高塔，其中绿积木必须在最底层。她能搭出多少座不一样的塔？',
      en: 'Gina has {n} blocks, all different colours (see the picture). She builds towers {n} blocks high, and the green block must be at the bottom. How many different towers can she build?'
    },
    answer: { type: 'integer', expr: '(n-1)*(n-2)*(n-3)', unit: '座', sanity: { integer: true } },
    solution: {
      zh: '绿积木已经固定在最底层，剩下 {n-1} 个位置要把 {n-1} 种颜色的积木排进去：第一个位置有 {n-1} 种选法，第二个有 {n-2} 种，第三个有 {n-3} 种，所以一共 {n-1}×{n-2}×{n-3}＝{(n-1)*(n-2)*(n-3)} 座。',
      en: 'Green is fixed at the bottom; the remaining {n-1} places take the other {n-1} colours: {n-1}×{n-2}×{n-3}＝{(n-1)*(n-2)*(n-3)} towers.'
    }
  },

  /* ---------- Q29 三个算式求符号（符号算式图） ---------- */
  'icas22y2m-29': {
    diagram: {
      type: 'symeq',
      rows: [
        { terms: ['◆', '+', '▲', '+', '●'], rhs: 'A' },
        { terms: ['▲', '+', '▲', '+', '●', '+', '●'], rhs: 'B' },
        { terms: ['◆', '+', '◆', '+', '▲', '+', '●', '+', '●', '+', '●'], rhs: 'C' }
      ]
    },
    stem: {
      zh: '看下图的三道算式（◆、▲、● 各代表一个数）。● 代表的数是多少？',
      en: 'Look at the three equations below (◆, ▲ and ● each stand for a number). What number does ● stand for?'
    },
    solution: {
      zh: '第三式比第二式多了 ◆＋◆＋●，而 {C}−{B}＝{C-B}，所以 ◆＋◆＋●＝{C-B}；第一式知道 ◆＋▲＋●＝{A}，两式相减得 ◆−▲＝{C-B-A}；第二式是 2▲＋2●＝{B}，即 ▲＋●＝{B/2}。由 ◆＋▲＋●＝{A} 得 ◆＝{A-B/2}，代回 ◆−▲＝{C-B-A} 可得 ▲，最后算出 ●＝{c}。',
      en: 'Equation 3 minus equation 2 gives ◆+◆+●＝{C-B} ... solving the system gives ●＝{c}.'
    }
  }
};

/* 原题确实没有图的题，显式标注，避免自检误判 */
const noFigure = {
  'icas22y2m-15': '原题为纯文字应用题（草莓吃一半再吃一半），无图',
  'icas22y2m-20': '原题为纯文字应用题（比多比少求总数），无图'
};

for (const rel of FILES) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) { console.log('跳过（不存在）' + rel); continue; }
  const bank = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = bank.templates || bank;
  let n = 0;
  for (const t of list) {
    const p = next[t.id];
    if (p) {
      Object.keys(p).forEach(k => { t[k] = p[k]; });
      delete t.image;
      delete t.figureTodo;
      n++;
    }
    if (noFigure[t.id]) t.noFigure = noFigure[t.id];
  }
  fs.writeFileSync(file, JSON.stringify(bank, null, 2), 'utf8');
  console.log(rel + '：已改写 ' + n + ' 个模板');
}
