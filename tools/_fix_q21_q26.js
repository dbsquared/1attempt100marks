/* 一次性补丁：修 Q21（问图里没画出来的位置）与 Q26（「往左」按西塔自己的视角）。
   注意：question-bank.json 会被 merge-bank.js 用 imports/ 覆盖，
   所以两个文件必须同时改。 */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const FILES = ['data/question-bank.json', 'data/imports/icas-2022-year2-math.json'];

const ORDER = ['id', 'subject', 'topic', 'grade', 'difficulty', 'title', 'tags', 'source', 'stem',
  'vars', 'derived', 'constraints', 'answer', 'sanity', 'solution', 'sourceSet', 'unit',
  'originalImage', 'image', 'diagram', 'noFigure', 'todo', 'figureTodo', 'noVariantReason'];

function reorder(o) {
  const out = {};
  ORDER.forEach(k => { if (o[k] !== undefined) out[k] = o[k]; });
  Object.keys(o).forEach(k => { if (!(k in out)) out[k] = o[k]; });
  return out;
}

/* ---------------- Q21：灯笼周期规律 ----------------
   原来 n ∈ {5,9,13,17,21,25} 恒等于 1 (mod 4)，答案永远是红色；
   而且图里画了 12 个灯笼，问的却是第 5/9 个 —— 那个位置图上直接看得见，
   等于让学生"数图"而不是"找规律"。现在改成问图里没有的位置。 */
function patchQ21(t) {
  t.title = '灯笼按顺序重复';
  t.topic = '周期规律';
  t.tags = ['找规律', '周期', '推理'];
  t.stem = {
    zh: '杰米按同一个顺序不停重复地挂灯笼（如下图）。第 {n} 个灯笼是什么颜色？',
    en: 'Jamie hangs lanterns, repeating the same order over and over (see the diagram below). What colour is the {n}th lantern?'
  };
  t.vars = {
    /* 全部 > 图上画出的 12 个：答案必须由「每 4 个一组」的规律推出来，不能直接数图。
       四种颜色都留了取值，避免答案永远是同一种颜色。 */
    n: { type: 'pick', from: [14, 15, 16, 17, 22, 23, 25, 28, 33, 34, 35, 40, 41, 46, 47] }
  };
  t.derived = {
    q: '((n - 1) % 4) + 1',      // 是每组的第几个（1..4）
    g: '(n - ((n - 1) % 4) - 1) / 4'   // 前面有多少个完整的 4 个一组
  };
  t.answer = {
    type: 'choice',
    options: [
      { en: 'red', zh: '红色' },
      { en: 'yellow', zh: '黄色' },
      { en: 'blue', zh: '蓝色' },
      { en: 'green', zh: '绿色' }
    ],
    /* 颜色顺序固定是 红→黄→蓝→绿：(n-1)%4 = 0 红 / 1 黄 / 2 蓝 / 3 绿 */
    correctIndex: '(n - 1) % 4'
  };
  t.solution = {
    zh: '看图中的灯笼串：颜色 4 个一组不停重复（第 1 个红、第 2 个黄、第 3 个蓝、第 4 个绿，第 5 个又回到红）。\n' +
        '第 {n} 个灯笼，前面已经有 {g} 个完整的 4 个一组（{g}×4＝{g*4} 个），所以它是下一组里的第 {q} 个。\n' +
        '对照顺序：每组第 1 个红、第 2 个黄、第 3 个蓝、第 4 个绿 —— 第 {q} 个对应的颜色就是答案。',
    en: 'In the picture the colours repeat in a group of 4 (1st red, 2nd yellow, 3rd blue, 4th green; the 5th is red again).\n' +
        'Before the {n}th lantern there are {g} complete groups of 4 ({g}×4＝{g*4}), so it is number {q} in the next group.\n' +
        'In each group: 1st red, 2nd yellow, 3rd blue, 4th green — read off the colour for position {q}.'
  };
  t.diagram = { type: 'lanterns', count: 12 };   // 正好画 3 组，规律一目了然，末位用「…」示意继续
  return t;
}

/* ---------------- Q26：棋盘上走子 ----------------
   原来把"往左"算成了画面左边（= 马克/答题人的左边）。
   西塔站在棋盘上方、面朝下方的马克，她自己面对画面下方时左手边正是画面右边，
   所以「向左 1 格」应该是列 +1。图上现在把西塔（上）和马克（下）都标了出来。 */
function patchQ26(t) {
  t.stem = {
    zh: '西塔的棋子（蓝点）在黑白棋盘上，西塔站在棋盘的上方、马克站在下方（如下图）。' +
        '她把棋子往「自己的」左边移 1 格，再朝马克的方向前移 2 格。棋子最后停在哪一格？',
    en: 'Sita\'s counter (blue dot) is on the black-and-white board. Sita stands above the board and Mark stands below it (see the diagram). ' +
        'She moves the counter 1 square to her own left, then 2 squares forward toward Mark. On which square does it land?'
  };
  t.vars = {
    rows: { type: 'pick', from: [5, 6] },
    cols: { type: 'pick', from: [5, 6] },
    sr: { type: 'int', min: 0, max: 3 },
    sc: { type: 'int', min: 1, max: 4 }
  };
  t.constraints = ['sr + 2 <= rows - 1', 'sc + 1 <= cols - 1', 'sc - 1 >= 0'];
  t.derived = {
    /* 正确的落点：她的左边 = 画面右边（列 +1），朝马克 = 向下（行 +2） */
    o0r: 'sr + 2', o0c: 'sc + 1',
    /* 干扰项①：按画面左边走（这正是同学们最容易犯的错，也是原来模板算出来的错答案） */
    o1r: 'sr + 2', o1c: 'sc - 1',
    /* 干扰项②：只顾往前，忘了往左移 */
    o2r: 'sr + 2', o2c: 'sc',
    /* 干扰项③：往左移了，但只前移 1 格 */
    o3r: 'sr + 1', o3c: 'sc + 1',
    ar: 'sr + 2', ac: 'sc + 1'
  };
  t.answer.correctIndex = 0;
  t.answer.optionsSvg = [
    { type: 'boardopt', rows: 'rows', cols: 'cols', hr: 'o0r', hc: 'o0c' },
    { type: 'boardopt', rows: 'rows', cols: 'cols', hr: 'o1r', hc: 'o1c' },
    { type: 'boardopt', rows: 'rows', cols: 'cols', hr: 'o2r', hc: 'o2c' },
    { type: 'boardopt', rows: 'rows', cols: 'cols', hr: 'o3r', hc: 'o3c' }
  ];
  t.solution = {
    zh: '西塔站在棋盘上方、面朝下方的马克，所以她自己的「左边」就是画面的右边。\n' +
        '从蓝点出发：先向右（她的左边）1 格，再向下（朝马克的方向）2 格 —— 落到从上数第 {ar} 行、从左数第 {ac} 列。',
    en: 'Sita stands above the board facing Mark below, so her own left is the right-hand side of the picture.\n' +
        'From the blue dot: 1 square to the right (her left), then 2 squares down (toward Mark) — landing on row {ar}, column {ac} counting down and from the left.'
  };
  t.diagram = { type: 'board', rows: 'rows', cols: 'cols', sr: 'sr', sc: 'sc' };
  return t;
}

let touched = 0;
FILES.forEach(rel => {
  const p = path.join(root, rel);
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const list = j.templates || j;
  let n = 0;
  list.forEach((t, i) => {
    if (t.id === 'icas22y2m-21') { list[i] = reorder(patchQ21(t)); n++; }
    if (t.id === 'icas22y2m-26') { list[i] = reorder(patchQ26(t)); n++; }
  });
  fs.writeFileSync(p, JSON.stringify(j, null, 2), 'utf8');
  touched += n;
  console.log('已更新 ' + rel + '：' + n + ' 个模板');
});
if (touched !== FILES.length * 2) { console.error('✗ 没有全部命中，请检查 id'); process.exit(1); }
console.log('✓ Q21 / Q26 补丁完成（两个数据文件已同步）');
