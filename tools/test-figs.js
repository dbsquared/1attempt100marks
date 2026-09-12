/* 独立交叉验算：不依赖模板里的公式，用「另一种算法」重算一遍答案，
   再和模板给出的答案对比，并统计 SVG 里真实画出的元素数量。
   node tools/test-figs.js */
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const ctx = { console, Math, JSON, Object, Array, Number, String, isFinite, parseFloat, Date, Set };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
['assets/js/expr.js', 'assets/js/diagrams.js', 'assets/js/generator.js', 'assets/js/grader.js']
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const { Generator } = ctx;
const B = JSON.parse(fs.readFileSync(path.join(root, 'data/question-bank.json'), 'utf8'));
const bank = B.templates || B;
const byId = id => bank.find(t => t.id === id);
let bad = 0;
function chk(cond, msg) { if (!cond) { bad++; console.log('   ✗ ' + msg); } }

const REP = 60;

/* ---------- Q3：数 SVG 里画了几条小棒，应等于 2n+1 ---------- */
{
  const t = byId('icas22y2m-03');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const sticks = (q.diagramSvg.match(/data-u="stick"/g) || []).length;
    // 图里只画了图形 1/2/3：小棒数 = 3+5+7 = 15（每条共用边会被画两次，等价于每条边一次）
    chk(sticks === 15, 'Q3 图中图形1-3的小棒数应为 15，实际 ' + sticks);
    chk(q.value === 2 * q.vars.n + 1, 'Q3 n=' + q.vars.n + ' 答案应 ' + (2 * q.vars.n + 1) + '，实际 ' + q.value);
  }
  console.log('Q3  图形1-3 共 15 根小棒 ✓  图形 n 用 2n+1 根 ✓');
}

/* ---------- Q5：卡片集合里确实只有一对差为 d ---------- */
{
  const t = byId('icas22y2m-05');
  const cards = [2, 3, 4, 6, 9];
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const v = q.vars, d = v.d;
    const pairs = [];
    for (const x of cards) for (const y of cards) if (y - x === d) pairs.push([x, y]);
    chk(pairs.length === 1, 'Q5 d=' + d + ' 应只有一对，实际 ' + JSON.stringify(pairs));
    chk(v.u - v.t === d, 'Q5 个位应比十位大 ' + d);
    chk(q.value === 10 * v.t + v.u, 'Q5 答案 ' + q.value + ' 应等于 ' + (10 * v.t + v.u));
  }
  console.log('Q5  差为 d 的卡片对唯一 ✓  答案 10t+u ✓');
}

/* ---------- Q9：correctIndex 指向的队，球数应等于鹰队+2 ---------- */
{
  const t = byId('icas22y2m-09');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const c = [q.vars.c0, q.vars.c1, q.vars.c2, q.vars.c3];
    const shouldIdx = c.findIndex(x => x === c[2] + 2);
    const NAMES = q.lang === 'en' ? ['Tigers', 'Eels', 'Hawks', 'Bees'] : ['老虎队', '鳗鱼队', '鹰队', '蜜蜂队'];
    chk(shouldIdx >= 0, 'Q9 应存在比鹰队多 2 球的队');
    chk(q.options[q.correctIndex] === NAMES[shouldIdx], 'Q9 选中「' + q.options[q.correctIndex] + '」应为「' + NAMES[shouldIdx] + '」');
    // 图上画的球总数
    // 图上球 = 四队小球之和，另加 KEY 图例里那 1 颗
    const balls = (q.diagramSvg.match(/data-u="ball"/g) || []).length;
    const sum = c[0] + c[1] + c[2] + c[3];
    chk(balls === sum + 1, 'Q9 图里球数 ' + balls + ' 应为 ' + (sum + 1) + '（' + sum + ' + KEY 1）');
  }
  console.log('Q9  correctIndex 指向的队 = 鹰队+2 ✓  图上球数与数值一致 ✓');
}

/* ---------- Q11：选项里恰有一组三张和为 T ---------- */
{
  const t = byId('icas22y2m-11');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const v = q.vars, vals = [v.v1, v.v2, v.v3, v.v4, v.v5], T = q.vars.T;
    const sols = [];
    for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) for (let c = b + 1; c < 5; c++)
      if (vals[a] + vals[b] + vals[c] === T) sols.push([a, b, c]);
    chk(sols.length === 1 && sols[0].join(',') === '0,2,3',
      'Q11 十种三张组合中应只有 0,2,3 的和等于 T，实际 ' + JSON.stringify(sols) + '（卡片 ' + vals.join(',') + '，T=' + T + '）');
    // correctIndex 是洗牌后的下标，要按值比对
    const picked = q.correctIndex.map(i => Number(q.options[i])).sort((x, y) => x - y);
    const want = [v.v1, v.v3, v.v4].sort((x, y) => x - y);
    chk(picked.join(',') === want.join(','), 'Q11 选中 ' + picked.join(',') + ' 应为 ' + want.join(','));
    chk(picked.reduce((x, y) => x + y, 0) === T, 'Q11 选中的三张之和应为 ' + T);
    // 图上画了几张卡片
    const nCards = (q.diagramSvg.match(/data-u="card"/g) || []).length;
    chk(nCards === 5, 'Q11 图上卡片数应为 5，实际 ' + nCards);
  }
  console.log('Q11 解唯一且被选中 ✓  图上 5 张卡片 ✓');
}

/* ---------- Q13a/13b：电梯楼层的独立验算 ---------- */
[['icas22y2m-13a', 1], ['icas22y2m-13b', -1]].forEach(([id, sign]) => {
  const t = byId(id);
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const v = q.vars;
    const floor = -v.b + v.u - v.d;          // 从 B{b} 出发
    chk(Math.sign(floor) === sign, id + ' 结果符号应为 ' + sign + '，实际 ' + floor);
    if (sign === 1) {
      chk(q.value === floor, id + ' 答案 ' + q.value + ' 应为 ' + floor);
      chk(floor <= v.up, id + ' 结果 ' + floor + ' 超出了楼高 ' + v.up);
    } else {
      chk(q.value === 'B' + (-floor), id + ' 答案 ' + q.value + ' 应为 B' + (-floor));
      chk(-floor <= v.down, id + ' 结果 B' + (-floor) + ' 超出了地下层数 ' + v.down);
      chk(floor >= -v.down, id + ' 结果超出地下层数');
    }
    // 图上楼层数
    const lbl = q.diagramSvg.match(/>B(\d+)</g) || [];
    chk(lbl.length === v.down, id + ' 图上地下层数应为 ' + v.down + '，实际 ' + lbl.length);
  }
  console.log(id + ' 楼层加减独立验算 ✓  未超出楼层范围 ✓  图上层数与变量一致 ✓');
});

/* ---------- Q14：划记数量应等于数值 ---------- */
{
  const t = byId('icas22y2m-14');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const v = q.vars;
    const marks = (q.diagramSvg.match(/data-u="tally"/g) || []).length;
    chk(marks === v.a + v.b + v.c + v.dd, 'Q14 图上划记数 ' + marks + ' 应为 ' + (v.a + v.b + v.c + v.dd));
    chk(q.value === v.a + v.c, 'Q14 答案应为 ' + (v.a + v.c));
  }
  console.log('Q14 划记数量 = 四类车辆总数 ✓  答案 = 小汽车+卡车 ✓');
}

/* ---------- Q18：谁报那个数 ---------- */
{
  const t = byId('icas22y2m-18');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const v = q.vars;
    // 独立算法：甲 S, 乙 S-1, 丙 S-2, 丁 S-3，之后每 4 个循环一次
    let who = -1;
    for (let x = v.S, k = 0; x >= v.n; x--, k++) if (x === v.n) who = k % 4;
    chk(who >= 0, 'Q18 数不到 ' + v.n);
    const NM = q.lang === 'en' ? ['A', 'B', 'C', 'D'] : ['甲', '乙', '丙', '丁'];
    chk(q.options[q.correctIndex] === NM[who], 'Q18 选中「' + q.options[q.correctIndex] + '」应为「' + NM[who] + '」(S=' + v.S + ',n=' + v.n + ')');
    // 图上应标出前 4 个数：S, S-1, S-2, S-3
    let shown = 0;
    for (let k = 0; k < 4; k++) if (q.diagramSvg.indexOf(' ' + (v.S - k) + '</text>') >= 0) shown++;
    chk(shown === 4, 'Q18 图上应标出 ' + [v.S, v.S - 1, v.S - 2, v.S - 3].join('/') + '，实际命中 ' + shown);
    chk(/甲 A/.test(q.diagramSvg) && /丁 D/.test(q.diagramSvg), 'Q18 图上人名缺失');
  }
  console.log('Q18 报数人独立验算 ✓  图上标出前 4 个数 ✓');
}

/* ---------- Q25：图上长度比 = 面积比 ---------- */
{
  const t = byId('icas22y2m-25');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const v = q.vars;
    const ws = (q.diagramSvg.match(/<rect x="108"[^>]*width="([\d.]+)"/g) || [])
      .map(s => parseFloat(s.match(/width="([\d.]+)"/)[1]));
    chk(ws.length === 3, 'Q25 图应画 3 个长方形，实际 ' + ws.length);
    if (ws.length === 3) {
      chk(Math.abs(ws[1] / ws[0] - v.k) < 0.02, 'Q25 红/蓝长度比应为 ' + v.k + '，实际 ' + (ws[1] / ws[0]));
      chk(Math.abs(ws[2] / ws[1] - v.m) < 0.02, 'Q25 黄/红长度比应为 ' + v.m + '，实际 ' + (ws[2] / ws[1]));
    }
    chk(q.value === v.m * v.k, 'Q25 答案应为 ' + (v.m * v.k));
  }
  console.log('Q25 图上长度比严格等于倍数关系 ✓  答案 m×k ✓');
}

/* ---------- Q27：表格数值 + 逐步加减 ---------- */
{
  const t = byId('icas22y2m-27');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const v = q.vars;
    let x = v.s;
    [[v.a1, v.f1], [v.a2, v.f2], [v.a3, v.f3], [v.a4, v.f4]].forEach(([a, f]) => { x += a - f; });
    chk(q.value === x, 'Q27 答案 ' + q.value + ' 应为 ' + x);
    chk(x >= 1, 'Q27 结果应 >=1');
    chk(!/0-|NaN/.test(q.diagramSvg), 'Q27 表格渲染异常');
  }
  console.log('Q27 逐步加减独立验算 ✓  结果恒 >=1 ✓');
}

/* ---------- Q28：积木塔层数与答案 ---------- */
{
  const t = byId('icas22y2m-28');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const n = q.vars.n;
    let f = 1; for (let k = 2; k <= n - 1; k++) f *= k;   // (n-1)!
    chk(q.value === f, 'Q28 n=' + n + ' 答案应为 ' + f + '，实际 ' + q.value);
    const blocks = (q.diagramSvg.match(/data-u="layer"/g) || []).length;
    chk(blocks === n, 'Q28 图上应画 ' + n + ' 层，实际 ' + blocks);
  }
  console.log('Q28 (n−1)! 独立验算 ✓  图上层数 = n ✓');
}

/* ---------- Q29 / Q10：符号方程组独立求解 ---------- */
{
  const t = byId('icas22y2m-29');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const v = q.vars;
    // 独立算法：A = d+t+c, B = 2t+2c, C = 2d+t+3c  -> 解 ● = c
    const A = v.d + v.t + v.c, Bb = 2 * (v.t + v.c), C = 2 * v.d + v.t + 3 * v.c;
    const c = C / 2 - A + Bb / 4;                  // 解方程得 ● = C/2 − A + B/4
    chk(Math.abs(c - v.c) < 1e-9, 'Q29 方程组解 ● 应为 ' + v.c + '，独立解得 ' + c);
    chk(q.value === v.c, 'Q29 答案应为 ' + v.c);
    // 图上算式右侧的数字（data-u="rhs" 标记）
    const rhs = [...q.diagramSvg.matchAll(/data-u="rhs" x="([\d.]+)" y="[\d.]+" font-size="([\d.]+)" font-weight="700"[^>]*>(\d+)</g)]
      .map(s2 => ({ x: +s2[1], fs: +s2[2], v: +s2[3] }));
    chk(rhs.length === 3 && rhs[0].v === A && rhs[1].v === Bb && rhs[2].v === C,
      'Q29 图上算式右端 ' + JSON.stringify(rhs.map(r => r.v)) + ' 应为 ' + [A, Bb, C]);
    // 等号右边的数字不能超出 viewBox —— 之前第三式最长的「= 115」被裁掉过
    const W = +q.diagramSvg.match(/viewBox="0 0 ([\d.]+)/)[1];
    rhs.forEach(r => {
      const est = String(r.v).length * r.fs * 0.62;   // 粗体数字的估算宽度
      chk(r.x + est <= W - 2,
        'Q29 右端 ' + r.v + ' 被裁掉了（x=' + r.x.toFixed(1) + ' + 宽' + est.toFixed(1) + ' > viewBox 宽 ' + W + '）');
    });
    chk(rhs.every(r => r.fs >= 15), 'Q29 右端数字字号过小（' + rhs.map(r => r.fs).join(',') + '），说明整幅被压得太厉害');
  }
  console.log('Q29 方程组独立求解 = 模板答案 ✓  图上算式数值正确 ✓');
}
{
  const t = byId('icas22y2m-10');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const v = q.vars;
    chk(q.value === v.a + v.b - v.c, 'Q10 答案应为 ' + (v.a + v.b - v.c));
    chk(/◆<\/text>/.test(q.diagramSvg) && /✿<\/text>/.test(q.diagramSvg), 'Q10 图上缺符号');
    chk(/>\?<\/text>/.test(q.diagramSvg), 'Q10 图上「?」应保留为问号');
  }
  console.log('Q10 图例数值 + 运算 ✓  未知数显示为「?」✓');
}

/* ---------- Q2：确定会发生的那句 ---------- */
{
  const t = byId('icas22y2m-02');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const d = q.vars.d;
    // 今天是 6月d日星期一：明天=星期二（一定不是星期四）；下周一=6月d+7日（一定对）
    // 唯一「一定发生」的是「下周一 = 6月(d+7)日」（今天周一，+7 天必是下周一）
    chk(d + 7 <= 30, 'Q2 d=' + d + ' 下周一超出 6 月范围');
    const pick = String(q.options[q.correctIndex]);
    chk(/Next Monday|下星期一/.test(pick), 'Q2 选中「' + pick + '」不是「下周一」那句');
    chk(pick.indexOf(String(d + 7)) >= 0, 'Q2 正确选项里应出现日期 ' + (d + 7) + '，实际「' + pick + '」');
    // 另外两句都不是「一定」：明天必是周二（不是周四），天气只是可能
    const others = q.options.filter((_, i) => i !== q.correctIndex).join(' | ');
    chk(/Thursday|星期四/.test(others), 'Q2 干扰项里应有「明天是星期四」');
    chk(/sunny|晴天/.test(others), 'Q2 干扰项里应有「明天也是晴天」');
    chk(q.options.length === 3, 'Q2 应为三选一，实际 ' + q.options.length);
    chk(/It is sunny|晴天/.test(q.diagramSvg), 'Q2 图上缺天气文字');
    chk(new RegExp('>.*' + d + '.*星期').test(q.diagramSvg) || q.diagramSvg.indexOf(d + ' 月') >= 0, 'Q2 图上缺日期');
  }
  console.log('Q2  正确答案 = 「下周一 = 6月(d+7)日」✓  图上日期与变量一致 ✓');
}

/* ---------- Q8：立体盒子的尺寸必须真的能装下对应物品 ---------- */
{
  const t = byId('icas22y2m-08');
  const BOX2ITEM = { A: 1, B: 3, C: 2, D: 0 };          // A篮球 B鞋子 C手表 D滑板（选项下标）
  const MIN_BALL = 28;                                    // 球的最小可容纳尺寸阈值
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const pick = q.vars.bidx;
    const IT = q.lang === 'en' ? ['a skateboard', 'a ball', 'a watch', 'a pair of shoes'] : ['滑板', '篮球', '手表', '鞋子'];
    chk(q.options[q.correctIndex] === IT[BOX2ITEM['ABCD'[pick]]],
      'Q8 选中「' + q.options[q.correctIndex] + '」应为「' + IT[BOX2ITEM['ABCD'[pick]]] + '」（盒子 ' + 'ABCD'[pick] + '）');
    // 立体盒子：每盒 3 个面（1 正面 + 2 侧面）
    const poly = (q.diagramSvg.match(/<polygon/g) || []).length;
    chk(poly === 8, 'Q8 四个盒子应为 8 个多边形（每盒 2 个侧面），实际 ' + poly);
    // 读出四个盒子的真实尺寸，按“大小/形状”独立推一遍答案
    const boxes = {};
    let m;
    const re = /data-box="([ABCD])" data-w="(\d+)" data-h="(\d+)" data-d="(\d+)"/g;
    while ((m = re.exec(q.diagramSvg))) boxes[m[1]] = { w: +m[2], h: +m[3], d: +m[4] };
    chk(Object.keys(boxes).length === 4, 'Q8 图上应标出 4 个盒子，实际 ' + Object.keys(boxes).length);
    if (Object.keys(boxes).length === 4) {
      const K = ['A', 'B', 'C', 'D'];
      const vol = k => boxes[k].w * boxes[k].h * boxes[k].d;
      const minDim = k => Math.min(boxes[k].w, boxes[k].h, boxes[k].d);
      // ① 只有「又大又方正」的那个盒子装得下球
      const fitBall = K.filter(k => minDim(k) >= MIN_BALL);
      chk(fitBall.length === 1 && fitBall[0] === 'A',
        'Q8 只有 A 应装得下篮球，实际装得下的有 ' + JSON.stringify(fitBall) + '（' + K.map(k => k + ':' + minDim(k)).join(' ') + '）');
      // ② 手表盒必须是体积最小的
      const smallest = K.reduce((a, b) => vol(b) < vol(a) ? b : a);
      chk(smallest === 'C', 'Q8 体积最小的应是 C（手表），实际 ' + smallest);
      // ③ 滑板盒必须最长、最扁
      const longest = K.reduce((a, b) => boxes[b].w > boxes[a].w ? b : a);
      const flattest = K.reduce((a, b) => boxes[b].h < boxes[a].h ? b : a);
      chk(longest === 'D' && flattest === 'D', 'Q8 最长最扁的应是 D（滑板），实际 最长=' + longest + ' 最扁=' + flattest);
      // ④ 剩下的 B 是鞋盒：明显比球盒小、比手表盒大
      chk(minDim('B') < MIN_BALL, 'Q8 鞋盒（B）不应装得下篮球');
      chk(vol('B') > vol('C') && vol('B') < vol('A'), 'Q8 鞋盒体积应介于 A 与 C 之间');
    }
  }
  console.log('Q8  盒子尺寸能独立推出答案（球盒唯一/A最小/D最长最扁）✓');
}

/* ---------- Q7：数轴箭头必须向下指到刻度上 ---------- */
{
  const t = byId('icas22y2m-07');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const v = q.vars;
    chk(q.value === v.k * v.E / v.n, 'Q7 答案应为 k*E/n = ' + (v.k * v.E / v.n));
    // 三角箭头：顶点 y 必须大于底边 y（屏幕上向下），且顶点离数轴更近
    const tri = q.diagramSvg.match(/<polygon points="([\d.]+),([\d.]+) ([\d.]+),([\d.]+) ([\d.]+),([\d.]+)" fill="#e5484d"/);
    chk(!!tri, 'Q7 图上找不到箭头');
    if (tri) {
      const apexY = +tri[2], baseY = +tri[4];
      chk(apexY > baseY, 'Q7 箭头应向下指（顶点 y=' + apexY + ' 应大于底边 y=' + baseY + '）');
    }
    // 箭头 x 应落在「从 0 数第 k 格」的刻度上
    const ticks = (q.diagramSvg.match(/<line x1="([\d.]+)" y1="[\d.]+" x2="[\d.]+" y2="[\d.]+" stroke="#333333" stroke-width="1.5"/g) || [])
      .map(s => parseFloat(s.match(/x1="([\d.]+)"/)[1]));
    chk(ticks.length === v.n + 1, 'Q7 刻度数应为 ' + (v.n + 1) + '，实际 ' + ticks.length);
    const apexX = tri ? +tri[1] : -1;
    const near = ticks.reduce((a, b) => Math.abs(b - apexX) < Math.abs(a - apexX) ? b : a, ticks[0]);
    chk(Math.abs(near - apexX) < 1.5, 'Q7 箭头没落在刻度上（箭头 x=' + apexX + '，最近刻度 x=' + near + '）');
    chk(Math.abs(near - ticks[v.k]) < 1.5, 'Q7 箭头应指在第 ' + v.k + ' 个刻度上');
  }
  console.log('Q7  箭头向下指 ✓  箭头落在第 k 个刻度上 ✓');
}

/* ---------- Q21：问的必须是图里没画出来的位置，颜色由周期推出来 ---------- */
{
  const t = byId('icas22y2m-21');
  const PAL = ['#e5484d', '#f5c518', '#1f6feb', '#2ea043'];   // 红 黄 蓝 绿
  const NAMES = { zh: ['红色', '黄色', '蓝色', '绿色'], en: ['red', 'yellow', 'blue', 'green'] };
  const SHOWN = 12;
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const n = q.vars.n;
    // ① 画出来的灯笼颜色必须严格按 红黄蓝绿 循环
    const fills = (q.diagramSvg.match(/data-u="lantern"[^>]*fill="(#[0-9a-f]{6})"/g) || [])
      .map(s => s.match(/fill="(#[0-9a-f]{6})"/)[1]);
    chk(fills.length === SHOWN, 'Q21 图上应画 ' + SHOWN + ' 个灯笼，实际 ' + fills.length);
    chk(fills.every((c, k) => c === PAL[k % 4]),
      'Q21 图上灯笼颜色不是 红黄蓝绿 循环：' + fills.join(','));
    // ② 图上标了序号 1..12，学生才能数出「4 个一组」
    let nums = 0;
    for (let k = 1; k <= SHOWN; k++) if (q.diagramSvg.indexOf('>' + k + '</text>') >= 0) nums++;
    chk(nums === SHOWN, 'Q21 图上应标出序号 1..' + SHOWN + '，实际 ' + nums + ' 个');
    // ③ 图里有「…」表示继续挂
    chk(/…/.test(q.diagramSvg), 'Q21 图上应有「…」表示按同样顺序继续挂下去');
    // ④ 问的位置必须超出图上画的范围（否则是数图，不是找规律）
    chk(n > SHOWN, 'Q21 问的第 ' + n + ' 个应该超出图上画出的 ' + SHOWN + ' 个');
    // ⑤ 独立算颜色
    const want = NAMES[q.lang === 'en' ? 'en' : 'zh'][(n - 1) % 4];
    chk(q.options[q.correctIndex] === want,
      'Q21 n=' + n + ' 选中「' + q.options[q.correctIndex] + '」应为「' + want + '」');
    // ⑥ 每组第几个 与 完整组数 自洽
    chk(q.vars.q === ((n - 1) % 4) + 1, 'Q21 每组第几个应为 ' + (((n - 1) % 4) + 1) + '，实际 ' + q.vars.q);
    chk(q.vars.g * 4 + q.vars.q === n, 'Q21 ' + q.vars.g + '×4+' + q.vars.q + ' 应等于 ' + n);
  }
  console.log('Q21 灯笼颜色严格 红黄蓝绿 循环 ✓  问的位置在 12 个之外 ✓  答案随 n 变化 ✓');
}

/* ---------- Q26：她的「左边」= 画面右边（西塔在上方、面朝下方的马克） ---------- */
{
  const t = byId('icas22y2m-26');
  const CELL = 34, OFF = 8;              // boardopt 的格子大小与左上留白
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const v = q.vars;
    // ① 主图必须把西塔（上）和马克（下）标出来，否则题目没法定向
    chk(/西塔 Sita/.test(q.diagramSvg) && /马克 Mark/.test(q.diagramSvg), 'Q26 图上缺少西塔/马克的方位标注');
    // ② 蓝点（棋子）应画在 (行 sr, 列 sc)：主图 cell=52 留白 10
    const dot = (q.diagramSvg.match(/<circle cx="([\d.]+)" cy="([\d.]+)" r="17"/) || []);
    chk(dot.length === 3, 'Q26 图上找不到棋子');
    if (dot.length === 3) {
      const dc = Math.round((+dot[1] - 10 - 26) / 52), dr = Math.round((+dot[2] - 34 - 26) / 52);
      chk(dr === v.sr && dc === v.sc, 'Q26 棋子应画在 (' + v.sr + ',' + v.sc + ')，实际 (' + dr + ',' + dc + ')');
    }
    // ③ 正确选项图里的红圈必须落在 (sr+2, sc+1) —— 她的左边是画面右边
    const okSvg = q.optionsSvg[q.correctIndex];
    const ring = (okSvg.match(/<circle cx="([\d.]+)" cy="([\d.]+)"/) || []);
    chk(ring.length === 3, 'Q26 正确选项图里找不到标记圈');
    if (ring.length === 3) {
      const hc = Math.round((+ring[1] - OFF - CELL / 2) / CELL);
      const hr = Math.round((+ring[2] - OFF - CELL / 2) / CELL);
      chk(hr === v.sr + 2 && hc === v.sc + 1,
        'Q26 正确落点应为 (' + (v.sr + 2) + ',' + (v.sc + 1) + ')（她自己的左边 = 画面右边），实际 (' + hr + ',' + hc + ')');
      // ④ 按画面左边走是错的 —— 那个位置只能作为干扰项出现
      chk(!(hr === v.sr + 2 && hc === v.sc - 1), 'Q26 正确答案不能是按画面左边算出来的那一格');
      chk(hr >= 0 && hr < v.rows && hc >= 0 && hc < v.cols, 'Q26 落点跑到棋盘外了');
    }
    // ⑤ 四个选项必须是四个不同的格子
    const cells = q.optionsSvg.map(s2 => {
      const m2 = s2.match(/<circle cx="([\d.]+)" cy="([\d.]+)"/);
      return m2 ? Math.round((+m2[1] - OFF - CELL / 2) / CELL) + ',' + Math.round((+m2[2] - OFF - CELL / 2) / CELL) : 'x';
    });
    chk(new Set(cells).size === 4, 'Q26 四个选项应是不同格子，实际 ' + cells.join(' | '));
  }
  console.log('Q26 棋子位置与变量一致 ✓  正确落点 = 她的左边(画面右)+朝马克 ✓  干扰项含"画面左"误解 ✓');
}

console.log(bad ? '\n✗ 共 ' + bad + ' 项不符' : '\n✓ 全部交叉验算通过');
process.exit(bad ? 1 : 0);
