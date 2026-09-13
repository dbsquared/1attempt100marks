/* 独立交叉验算：不依赖模板里的公式，用「另一种算法」重算一遍答案，
   再和模板给出的答案对比，并统计 SVG 里真实画出的元素数量。
   覆盖 ICAS 2022 + 2021 两批（2021 部分的说明见文件下半段的分区标题）。
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
    // 图里用的就是原卷队名（英文），中英两种模式都一样
    const NAMES = ['Tigers', 'Eels', 'Hawks', 'Bees'];
    chk(shouldIdx >= 0, 'Q9 应存在比 Hawks 多 2 球的队');
    chk(q.options[q.correctIndex] === NAMES[shouldIdx], 'Q9 选中「' + q.options[q.correctIndex] + '」应为「' + NAMES[shouldIdx] + '」');
    // 图上球 = 四队小球之和，另加 KEY 里那 1 颗
    const balls = (q.diagramSvg.match(/data-u="ball"/g) || []).length;
    const sum = c[0] + c[1] + c[2] + c[3];
    chk(balls === sum + 1, 'Q9 图里球数 ' + balls + ' 应为 ' + (sum + 1) + '（' + sum + ' + KEY 1）');
    // 图里的队名 / KEY 说明都用原卷英文
    chk(NAMES.every(n2 => q.diagramSvg.indexOf(n2) >= 0), 'Q9 图上应出现全部英文队名');
    chk(/KEY/.test(q.diagramSvg) && /= 1 goal/.test(q.diagramSvg), 'Q9 图上 KEY 应写 "= 1 goal"');
  }
  console.log('Q9  correctIndex 指向的队 = Hawks+2 ✓  图上球数与数值一致 ✓  队名/KEY 为原卷英文 ✓');
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
    // 独立算法：Sue S, Jim S-1, Dave S-2, Kate S-3，之后每 4 个循环一次
    let who = -1;
    for (let x = v.S, k = 0; x >= v.n; x--, k++) if (x === v.n) who = k % 4;
    chk(who >= 0, 'Q18 数不到 ' + v.n);
    // 图里用的是原卷人名，选项也是同一批名字（中英一致），顺序 = 图上的轮转顺序
    const NM = ['Sue', 'Jim', 'Dave', 'Kate'];
    chk(q.options[q.correctIndex] === NM[who], 'Q18 选中「' + q.options[q.correctIndex] + '」应为「' + NM[who] + '」(S=' + v.S + ',n=' + v.n + ')');
    // 图上应标出前 4 个数：S, S-1, S-2, S-3
    let shown = 0;
    for (let k = 0; k < 4; k++) if (q.diagramSvg.indexOf(' ' + (v.S - k) + '</text>') >= 0) shown++;
    chk(shown === 4, 'Q18 图上应标出 ' + [v.S, v.S - 1, v.S - 2, v.S - 3].join('/') + '，实际命中 ' + shown);
    chk(NM.every(n2 => q.diagramSvg.indexOf(n2) >= 0), 'Q18 图上人名缺失（应为原卷的 Sue/Jim/Dave/Kate）');
  }
  console.log('Q18 报数人独立验算 ✓  图上标出前 4 个数 ✓  人名为原卷英文 ✓');
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
    chk(/It is sunny/.test(q.diagramSvg), 'Q2 图上缺天气文字');
    // 原卷卡片上写的是「Today is Monday 6 June」，所以图上要有当天的 "d June"
    chk(q.diagramSvg.indexOf(d + ' June') >= 0, 'Q2 图上应出现「' + d + ' June」，实际没有');
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
    // ① 主图必须把 Sita（上）和 Mark（下）标出来，否则题目没法定向
    chk(/Sita/.test(q.diagramSvg) && /Mark/.test(q.diagramSvg), 'Q26 图上缺少 Sita / Mark 的方位标注');
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

/* ---------- 配图文字一律用原试卷的语言（ICAS = 英文），不许翻成中文 ---------- */
{
  /* 逐题抽查关键文字是否与原卷一致（全量"无中文"由 test-bank.js 的闸门兜底） */
  const CASES = [
    ['icas22y2m-02', ['Today is Monday', 'It is sunny.', 'June']],
    ['icas22y2m-09', ['Tigers', 'Eels', 'Hawks', 'Bees', 'KEY', '= 1 goal']],
    ['icas22y2m-14', ['Cars', 'Bikes', 'Trucks', 'Buses']],
    ['icas22y2m-18', ['Sue', 'Jim', 'Dave', 'Kate']],
    ['icas22y2m-21', ['and so on']],
    ['icas22y2m-22', ['spring', 'summer', 'autumn', 'winter']],
    ['icas22y2m-23', ['purse']],
    ['icas22y2m-25', ['blue', 'red', 'yellow']],
    ['icas22y2m-26', ['Sita', 'Mark']],
    ['icas22y2m-27', ['Minutes after Tina starts counting', 'Number of birds', 'Arrive', 'Fly away']],
    ['icas22y2m-28', ['yellow', 'blue', 'green', 'pink']],
    ['icas22y2m-13a', ['Ground']],
    ['icas22y2m-30', ['arrows']]
  ];
  CASES.forEach(([id, words]) => {
    const t = byId(id);
    for (let i = 0; i < 12; i++) {
      const q = Generator.instantiate(t);
      chk(!/[\u4e00-\u9fff]/.test(q.diagramSvg || ''), id + ' 配图里出现了中文');
      words.forEach(w => chk(q.diagramSvg.indexOf(w) >= 0, id + ' 图里应出现「' + w + '」'));
    }
  });
  console.log('配图文字 = 原卷英文 ✓（Q2/9/13/14/18/21/22/23/25/26/27/28/30 抽查）');
}


/* =====================================================================
   ICAS 2021 Year 2 Mathematics（30 题）：同样「不看模板公式、照图重算一遍」
   ===================================================================== */
const REP21 = 40;
const mAll = (s, re) => [...String(s || '').matchAll(re)];

/* ---------- 21Q1：图上笑脸数 = 答案 ---------- */
{
  const t = byId('icas21y2m-01');
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const n = (q.diagramSvg.match(/data-u="item"/g) || []).length;
    chk(n === q.vars.n, '21Q1 图上笑脸 ' + n + ' 个，题干 n=' + q.vars.n);
    chk(q.value === n, '21Q1 答案 ' + q.value + ' 应等于图上笑脸数 ' + n);
  }
  console.log('21Q1 图上笑脸数 = 答案 ✓');
}

/* ---------- 21Q2：从图上还原「4 个一循环」，推出问号格该填什么 ---------- */
{
  const t = byId('icas21y2m-02');
  const ZH = { square: '正方形', triangle: '三角形', circle: '圆形', star: '星形' };
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const cells = mAll(q.diagramSvg, /<(?:g|rect) data-u="shape"([^>]*)>/g);
    const kinds = cells.map(m => (m[1].match(/data-kind="([^"]+)"/) || [])[1] || null);
    chk(kinds.length === q.vars.total, '21Q2 图上格子 ' + kinds.length + ' 个，应为 ' + q.vars.total);
    const blank = kinds.indexOf(null);
    chk(blank === q.vars.mark - 1, '21Q2 问号在第 ' + (blank + 1) + ' 格，mark=' + q.vars.mark);
    const cyc = [];
    kinds.forEach((k, j) => { if (k) cyc[j % 4] = k; });
    chk(cyc.filter(Boolean).length === 4, '21Q2 从图上还原不出 4 个一循环：' + JSON.stringify(cyc));
    const want = cyc[blank % 4];
    const expect = q.lang === 'en' ? want : ZH[want];
    chk(q.options[q.correctIndex] === expect, '21Q2 问号格应填「' + expect + '」，选中「' + q.options[q.correctIndex] + '」');
    chk(new RegExp('data-kind="' + want + '"').test(q.optionsSvg[q.correctIndex] || ''), '21Q2 正确选项画的是别的图形');
    chk(/>\?<\/text>/.test(q.diagramSvg), '21Q2 图上没有画「?」');
  }
  console.log('21Q2 从图上还原循环顺序 ✓ 问号格与正确选项一致 ✓');
}

/* ---------- 21Q3：深色那格 = 今天，往后数 d 格 ---------- */
{
  const t = byId('icas21y2m-03');
  const NM = { zh: ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'],
               en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] };
  const AB = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const cells = mAll(q.diagramSvg, /<rect data-u="day" data-i="(\d+)"[^>]*fill="([^"]+)"/g);
    chk(cells.length === 7, '21Q3 图上应有 7 格，实际 ' + cells.length);
    const hi = cells.filter(c => c[2] === '#1f6feb').map(c => +c[1]);
    chk(hi.length === 1, '21Q3 应有且只有 1 格是「今天」，实际 ' + hi.length);
    chk(hi[0] === q.vars.t, '21Q3 深色格在第 ' + hi[0] + ' 格，today 变量是 ' + q.vars.t);
    AB.forEach((d, j) => chk(new RegExp('<' + 'text[^>]*>' + d + '</text>').test(q.diagramSvg), '21Q3 图上缺 ' + d));
    const idx = (hi[0] + q.vars.d) % 7;
    chk(q.options[q.correctIndex] === NM[q.lang === 'en' ? 'en' : 'zh'][idx],
      '21Q3 从第 ' + hi[0] + ' 格往后 ' + q.vars.d + ' 格是 ' + NM.zh[idx] + '，选中「' + q.options[q.correctIndex] + '」');
    chk(/>Today</.test(q.diagramSvg), '21Q3 图上缺少 Today 标注');
  }
  console.log('21Q3 今天的位置 + 往后数 d 格 ✓ 答案与图上星期一致 ✓');
}

/* ---------- 21Q4：划记表逐列数出来，做减法 ---------- */
{
  const t = byId('icas21y2m-04');
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const body = mAll(q.diagramSvg, /<rect x="(\d+)" y="54" width="150" height="56"/g).map(m => +m[1]);
    const marks = mAll(q.diagramSvg, /<line data-u="tally" x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)
      .map(m => ({ a: Math.max(+m[1], +m[3]), x1: +m[1], x2: +m[3] }));
    chk(marks.length === q.vars.a + q.vars.b, '21Q4 图上划记 ' + marks.length + ' 笔，应为 ' + (q.vars.a + q.vars.b));
    chk(body.length === 2, '21Q4 应是两列表格，实际 ' + body.length);
    const c = [0, 0];
    marks.forEach(m => { const j = m.a < body[1] ? 0 : 1; c[j]++; });
    chk(c[0] === q.vars.a && c[1] === q.vars.b, '21Q4 两列划记数 ' + c.join(' / ') + '，应为 ' + q.vars.a + ' / ' + q.vars.b);
    const diag = marks.filter(m => m.x1 !== m.x2).length;   /* 竖笔 x1=x2；每满五个的第五笔是横划过去 */
    chk(diag === Math.floor(q.vars.a / 5) + Math.floor(q.vars.b / 5),
      '21Q4 横划 ' + diag + ' 笔，应为 ' + (Math.floor(q.vars.a / 5) + Math.floor(q.vars.b / 5)) + '（每五个一组的第五笔）');
    chk(String(q.options[q.correctIndex]) === String(q.vars.a - q.vars.b),
      '21Q4 答案 ' + q.options[q.correctIndex] + ' 应为 ' + (q.vars.a - q.vars.b));
    chk(/Kate/.test(q.diagramSvg) && /Pete/.test(q.diagramSvg), '21Q4 图上应有原卷的 Kate / Pete');
  }
  console.log('21Q4 两列划记数独立数出 ✓ 每五个一组（第五笔横划）✓ 减法答案对 ✓');
}

/* ---------- 21Q5：边长自己算一遍，看两个正方形是否真的一样大 ---------- */
{
  const t = byId('icas21y2m-05');
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const sh = mAll(q.diagramSvg, /<g data-u="shape" data-kind="([^"]+)" data-half="([\d.]+)"/g)
      .map(m => ({ k: m[1], h: +m[2] }));
    chk(sh.length === 4, '21Q5 图上应有 4 个图形，实际 ' + sh.length);
    const L = s => s.k === 'square' ? 2 * s.h : (s.k === 'squareRot' ? s.h * Math.SQRT2 : null);
    const iA = sh.findIndex(s => s.k === 'square'), iB = sh.findIndex(s => s.k === 'squareRot');
    chk(iA >= 0 && iB >= 0, '21Q5 应有一个正放正方形 + 一个转 45° 的正方形');
    if (iA >= 0 && iB >= 0) {
      chk(Math.abs(L(sh[iA]) - L(sh[iB])) < 0.02,
        '21Q5 两个正方形边长应相等：' + L(sh[iA]).toFixed(1) + ' vs ' + L(sh[iB]).toFixed(1));
      const pick = String(q.options[q.correctIndex]).replace(/\s*和\s*/, ' and ');
      const want = ['A', 'B', 'C', 'D'][iA] + ' and ' + ['A', 'B', 'C', 'D'][iB];
      chk(pick === want, '21Q5 选中「' + pick + '」应为「' + want + '」（边长同为 ' + L(sh[iA]).toFixed(0) + '）');
    }
  }
  console.log('21Q5 两个正方形的边长独立算出且相等 ✓ 正确选项点名的正是这两个 ✓');
}

/* ---------- 21Q9：示例那对「总数相同」照图验一遍，再数圆点找和「拿起这张」总数相同的那张 ---------- */
{
  const t = byId('icas21y2m-09');
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const v = q.vars;
    const exA = q.diagramSvg.match(/data-u="exA" data-a="(\d+)" data-b="(\d+)"/);
    const exB = q.diagramSvg.match(/data-u="exB" data-a="(\d+)" data-b="(\d+)"/);
    const pk = q.diagramSvg.match(/data-u="picked" data-a="(\d+)" data-b="(\d+)"/);
    chk(!!exA && !!exB && !!pk, '21Q9 主图应画出「示范那一对」和「吉姆拿起的这张」');
    if (!exA || !exB || !pk) continue;
    /* 规则全靠示范传达：示范那两张的总点数必须相等 */
    chk(+exA[1] + +exA[2] === +exB[1] + +exB[2],
      '21Q9 示范那两张应总点数相同：' + exA[1] + '|' + exA[2] + '=' + (+exA[1] + +exA[2]) +
      '，' + exB[1] + '|' + exB[2] + '=' + (+exB[1] + +exB[2]));
    chk(/matches/.test(q.diagramSvg), '21Q9 示范两张之间应写 matches');
    chk(/Jim picked up this domino/.test(q.diagramSvg), '21Q9 应写出 Jim picked up this domino');
    const P = +pk[1] + +pk[2];
    chk(P === v.pa + v.pb, '21Q9 图上「拿起的那张」是 ' + pk[1] + '|' + pk[2] + ' = ' + P + '，变量是 ' + v.pa + '|' + v.pb);
    /* 选项：一个字一个字地数圆点，得到每张的总点数 */
    const sums = (q.optionsSvg || []).map(s => (s.match(/data-u="pip"/g) || []).length);
    chk(sums.length === 4 && sums.every(x => x > 0), '21Q9 四个骨牌选项都应画出圆点：' + sums.join(','));
    chk(sums.length === 4 && sums[q.correctIndex] === P,
      '21Q9 正确选项总点数应为 ' + P + '（和拿起这张一样），实际 ' +
      (sums[q.correctIndex]) + '（四张 = ' + sums.join(', ') + '）');
    chk(sums.filter(x => x === P).length === 1, '21Q9 只有一张的总点数等于 ' + P + '：' + sums.join(','));
    chk(new Set(sums).size === 4, '21Q9 四张骨牌总点数应互不相同（否则有多个正确答案）：' + sums.join(','));
    chk(sums.every(x => x >= 2 && x <= 12), '21Q9 骨牌总点数应在 2..12 之间：' + sums.join(','));
  }
  console.log('21Q9 示范那对总数相同 ✓ 逐张数圆点 ✓ 与「拿起这张」总数相同的唯一那张 = 正确选项 ✓');
}

/* ---------- 21Q10：从图上走到哪盆花，就读哪盆的颜色 ---------- */
{
  const t = byId('icas21y2m-10');
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const v = q.vars;
    const pots = [];
    mAll(q.diagramSvg, /<g data-u="pot" data-j="(\d+)" data-fill="([^"]+)"/g).forEach(m => { pots[+m[1]] = { fill: m[2] }; });
    chk(pots.length === 4 && pots.every(Boolean), '21Q10 图上应有 4 盆花，实际 ' + pots.length);
    const node = q.diagramSvg.match(/<circle cx="([\d.]+)" cy="[\d.]+" r="[\d.]+"/);
    chk(!!node, '21Q10 图上应有房子的位置参照');
    /* 花盆 x 坐标（potIcon 的 path 起点 cx-18） */
    const potX = [];
    mAll(q.diagramSvg, /<g data-u="pot" data-j="(\d+)" data-fill="[^"]+"><path d="M([\d.]+),/g)
      .forEach(m => { potX[+m[1]] = +m[2] + 18; });
    /* 房子画在中间两盆之间（houseIcon 的墙宽 190，以 houseX 为中心） */
    const wall = q.diagramSvg.match(/<g data-u="pot"[\s\S]*?$/) ? null : null;
    const houseX = (potX[1] + potX[2]) / 2 + 0;   /* 165 / 305 的中间 = 235 */
    const arrow = q.diagramSvg.match(/<line data-u="arrow" data-dir="(-?\d+)" data-n="(\d+)"/);
    chk(!!arrow, '21Q10 图上缺少箭头');
    chk(+arrow[2] === v.n0, '21Q10 箭头标注的步数 ' + arrow[2] + ' 应为 ' + v.n0);
    const steps = mAll(q.diagramSvg, /<ellipse data-u="step" cx="([\d.]+)"/g).map(m => +m[1]);
    chk(steps.length === v.n0, '21Q10 脚印点 ' + steps.length + ' 个，应为 ' + v.n0);
    const dir = +arrow[1];
    chk(steps.every(x => dir > 0 ? x > houseX : x < houseX),
      '21Q10 脚印方向与箭头相反（dir=' + dir + '，脚印 ' + steps.join(',') + '，房子 x=' + houseX + '）');
    chk(steps.every((x, j) => j === 0 || (dir > 0 ? x > steps[j - 1] : x < steps[j - 1])),
      '21Q10 脚印应按箭头方向递进：' + steps.join(','));
    /* 停下的一盆 = 最后一个脚印正对的那盆 */
    const last = steps[steps.length - 1];
    let stop = -1, best = 1e9;
    potX.forEach((x, j) => { if (Math.abs(x - last) < best) { best = Math.abs(x - last); stop = j; } });
    chk(best < 2, '21Q10 最后一个脚印没对上任何一盆花（脚印 x=' + last + '）');
    const col = pots[stop].fill;
    chk(q.options[q.correctIndex] === col,
      '21Q10 停在 ' + potX.map((x, j) => 'pot' + j + '(' + pots[j].fill + '@' + x + ')').join(' ') +
      ' 的 ' + stop + ' 号盆，颜色应为 ' + col + '，选中「' + q.options[q.correctIndex] + '」');
    /* 四个选项颜色互不相同 */
    chk(new Set(q.options).size === 4, '21Q10 选项颜色应互不相同：' + q.options.join(','));
  }
  console.log('21Q10 脚印方向/步数与箭头一致 ✓ 停下的花盆颜色 = 正确选项 ✓');
}

/* ---------- 21Q11：数出蔬菜个数，再拿走 t 个 ---------- */
{
  const t = byId('icas21y2m-11');
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const n = (q.diagramSvg.match(/data-u="item"/g) || []).length;
    chk(n === q.vars.n, '21Q11 图上蔬菜 ' + n + ' 个，题干用的 ' + q.vars.n + '（应为 6×r）');
    chk(n === 6 * q.vars.r, '21Q11 图上蔬菜 ' + n + ' 个，应为 6 行×…… 6×' + q.vars.r);
    chk(q.value === n - q.vars.t, '21Q11 答案 ' + q.value + ' 应为 ' + (n - q.vars.t));
    chk(q.value > 0, '21Q11 结果应为正数');
  }
  console.log('21Q11 图上蔬菜数 = 6r ✓ 答案 = 总数 − t ✓');
}

/* ---------- 21Q12：表针的角度自己算一遍，看钟面和数字时间是否一致 ---------- */
{
  const t = byId('icas21y2m-12');
  const pad2 = x => (x < 10 ? '0' + x : String(x));
  const norm = d => ((d % 360) + 360) % 360;
  const circ = (a, b) => { const d = Math.abs(a - b); return Math.min(d, 12 - d); };
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const grp = mAll(q.diagramSvg, /<g data-u="clock" data-h="(\d+)" data-m="(\d+)">([\s\S]*?)<\/g>/g);
    chk(grp.length === 4, '21Q12 图上应有 4 个钟面，实际 ' + grp.length);
    const FACE = [];
    grp.forEach((m, j) => {
      const h = +m[1], mm = +m[2], cy = 78 + j * 116, cx = 146;
      const hands = mAll(m[3], /<line x1="[\d.]+" y1="[\d.]+" x2="([\d.]+)" y2="([\d.]+)" stroke="[^"]+" stroke-width="(\d+)" stroke-linecap="round"\/>/g)
        .map(x => ({ x: +x[1], y: +x[2], w: +x[3] }));
      const hh = hands.filter(x => x.w === 4), mmH = hands.filter(x => x.w === 3);
      chk(hh.length === 1 && mmH.length === 1, '21Q12 第 ' + (j + 1) + ' 个钟面应各有一根时针/分针');
      const deg = x => norm(Math.atan2(x.x - cx, -(x.y - cy)) * 180 / Math.PI);
      if (hh.length === 1 && mmH.length === 1) {
        const mDeg = deg(mmH[0]);
        chk(Math.abs(mDeg / 6 - mm) < 1.6, '21Q12 第 ' + (j + 1) + ' 个钟面分针指向 ' + (mDeg / 6).toFixed(1) + ' 分，标注 ' + mm + ' 分');
        const hVal = deg(hh[0]) / 30, want = (h % 12) + mm / 60;
        chk(circ(hVal, want) < 0.15, '21Q12 第 ' + (j + 1) + ' 个钟面时针指向 ' + hVal.toFixed(2) + ' 点，标注 ' + h + ':' + pad2(mm));
        FACE.push(pad2(h) + ':' + pad2(mm));
      }
    });
    /* 正确选项的电子钟文字 = 1 号钟面 */
    const txt = (q.optionsSvg || []).map(s => (s.match(/data-text="([^"]+)"/) || [])[1]);
    chk(txt.every(Boolean), '21Q12 电子钟选项缺少时间文字：' + JSON.stringify(txt));
    chk(new Set(txt).size === 4, '21Q12 四个电子钟应互不相同：' + txt.join(','));
    const want1 = grp.length ? pad2(+grp[0][1]) + ':' + pad2(+grp[0][2]) : '';
    chk(txt[q.correctIndex] === want1,
      '21Q12 选中「' + txt[q.correctIndex] + '」应为 1 号钟面的 ' + want1);
    chk(FACE[0] === want1, '21Q12 1 号钟面画的是 ' + FACE[0] + '，应是 ' + want1);
  }
  console.log('21Q12 表针角度独立算出 = 标注时间 ✓ 正确选项 = 1 号钟面 ✓ 四个电子钟互不相同 ✓');
}

/* ---------- 21Q13：数轴按「平均分」独立算每格（考点是等分，不是每格数 1） ---------- */
{
  const t = byId('icas21y2m-13');
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const v = q.vars;
    const ticks = mAll(q.diagramSvg, /<line data-u="tick" x1="([\d.]+)"/g).map(m => +m[1]);
    chk(ticks.length === v.n + 1, '21Q13 刻度 ' + ticks.length + ' 条，应为 ' + (v.n + 1));
    const labels = mAll(q.diagramSvg, /<text[^>]*font-size="19"[^>]*>(\d+)<\/text>/g).map(m => +m[1]);
    chk(labels.length === 2, '21Q13 数轴上只应标出两端两个数（多标就等于把答案写出来），实际 ' + labels.length + ' 个：' + labels.join(','));
    chk(labels[0] === v.B && labels[1] === v.E, '21Q13 两端应标 ' + v.B + ' / ' + v.E + '，实际 ' + labels.join(' / '));
    /* 图上刻度必须真的等距，否则「平均分」这条信息读不出来 */
    const ds = ticks.slice(1).map((x, j) => x - ticks[j]);
    chk(ds.every(d => Math.abs(d - ds[0]) < 0.05), '21Q13 刻度间距不等，读不出「平均分」：' + ds.map(d => d.toFixed(1)).join(','));
    const span = v.E - v.B;
    chk(span % v.n === 0, '21Q13 ' + v.E + ' − ' + v.B + ' = ' + span + ' 不能被 ' + v.n + ' 整除');
    const step = span / v.n;
    chk(step === v.s, '21Q13 每格应为 ' + v.s + '，实际 ' + step);
    chk(step !== 1, '21Q13 每格正好是 1 个单位，考不出「平均分」（原题每格不是 1）');
    const arrow = q.diagramSvg.match(/<line data-u="arrow" data-k="(\d+)" x1="([\d.]+)"/);
    chk(!!arrow, '21Q13 图上缺少箭头');
    chk(+arrow[1] === v.k, '21Q13 箭头在第 ' + arrow[1] + ' 格，变量 k=' + v.k);
    chk(Math.abs(+arrow[2] - ticks[v.k]) < 0.01, '21Q13 箭头没落在第 ' + v.k + ' 条刻度上（箭头 x=' + arrow[2] + '，刻度 x=' + ticks[v.k] + '）');
    const ans = v.B + v.k * step;
    chk(String(q.options[q.correctIndex]) === String(ans),
      '21Q13 答案 ' + q.options[q.correctIndex] + ' 应为 ' + v.B + ' + ' + v.k + '×' + step + ' = ' + ans);
    chk(new Set(q.options.map(String)).size === 4, '21Q13 四个选项应互不相同：' + q.options.join(','));
    /* 「一格数 1」这个学生最容易犯的错，必须做成干扰项，而且不能碰巧等于正确答案 */
    const opts = q.options.map(String);
    chk(opts.indexOf(String(v.B + v.k)) >= 0, '21Q13 应把「每格数 1」的答案 ' + (v.B + v.k) + ' 做成干扰项：' + opts.join(','));
    chk(String(v.B + v.k) !== String(ans), '21Q13 干扰项「每格数 1」和正确答案撞了：' + ans);
  }
  console.log('21Q13 刻度等距 ✓ 每格 = (E−B)/n 且 ≠ 1 ✓ 箭头落在第 k 格 ✓ 答案 = B + k×每格 ✓');
}

/* ---------- 21Q14：从两个盒子里拿，哪一对根本拿不到 ---------- */
{
  const t = byId('icas21y2m-14');
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const kinds = mAll(q.diagramSvg, /<g data-u="shape" data-kind="([^"]+)">/g).map(m => m[1]);
    chk(kinds.length === 8, '21Q14 图上应有 2 盒 × 4 个图形，实际 ' + kinds.length);
    const box1 = kinds.slice(0, 4), box2 = kinds.slice(4);
    chk(/Box 1/.test(q.diagramSvg) && /Box 2/.test(q.diagramSvg), '21Q14 图上应有 Box 1 / Box 2 标签');
    const pairs = (q.optionsSvg || []).map(s => mAll(s, /<g data-u="shape" data-kind="([^"]+)">/g).map(m => m[1]));
    chk(pairs.length === 4 && pairs.every(p => p.length === 2), '21Q14 每个选项应画两个图形');
    const impossible = pairs.map((p, j) => (box2.indexOf(p[1]) < 0 ? j : -1)).filter(j => j >= 0);
    chk(impossible.length === 1, '21Q14 应恰好有一对的后一个图形不在 Box 2 里，实际 ' + impossible.length +
      '（Box 2 = ' + box2.join(',') + '）');
    chk(impossible[0] === q.correctIndex, '21Q14 唯一拿不到的是选项 ' + impossible[0] + '，模板却选了 ' + q.correctIndex);
    chk(pairs[q.correctIndex].every(k => box1.indexOf(k) >= 0), '21Q14 正确选项的第一个图形也不在 Box 1 里');
    pairs.forEach((p, j) => chk(box1.indexOf(p[0]) >= 0, '21Q14 选项 ' + j + ' 的第一个图形不在 Box 1 里（题干说第一个必须来自 Box 1）'));
  }
  console.log('21Q14 Box 里画出的图形独立读一遍 ✓ 唯一「拿不到」的那对 = 正确选项 ✓');
}

/* ---------- 21Q15：n 辆车 + (n−1) 个间隔 ---------- */
{
  const t = byId('icas21y2m-15');
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const n = (q.diagramSvg.match(/data-u="car"/g) || []).length;
    const gaps = (q.diagramSvg.match(/data-u="gap"/g) || []).length;
    chk(n === q.vars.n, '21Q15 图上汽车 ' + n + ' 辆，题干 n=' + q.vars.n);
    if (gaps) chk(gaps === n - 1, '21Q15 图上间隔 ' + gaps + ' 个，应为 ' + (n - 1));
    chk(/>5 cm</.test(q.diagramSvg) && />2 cm</.test(q.diagramSvg), '21Q15 图上应标出 5 cm / 2 cm');
    chk(q.value === 5 * n + 2 * (n - 1), '21Q15 答案 ' + q.value + ' 应为 5×' + n + ' + 2×' + (n - 1));
  }
  console.log('21Q15 车辆数 = n ✓ 答案 = 5n + 2(n−1) ✓');
}

/* ---------- 21Q16：立体图形的小方块 —— 按行/列/层自己数一遍 ---------- */
{
  const t = byId('icas21y2m-16');
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const v = q.vars;
    const cubes = mAll(q.diagramSvg, /<rect data-u="cube" x="([\d.]+)" y="([\d.]+)"/g).map(m => ({ x: +m[1], y: +m[2] }));
    chk(cubes.length === q.value, '21Q16 答案 ' + q.value + ' 应等于图上画的小方块数 ' + cubes.length);
    const xs = [...new Set(cubes.map(c => c.x))];
    chk(xs.length === 2 * v.w, '21Q16 前后两层共应有 ' + (2 * v.w) + ' 列，实际 ' + xs.length);
    const perCol = {};
    cubes.forEach(c => { perCol[c.x] = (perCol[c.x] || 0) + 1; });
    Object.keys(perCol).forEach(x => chk(perCol[x] === v.h, '21Q16 x=' + x + ' 这列有 ' + perCol[x] + ' 块，前/后层高都应为 ' + v.h));
    chk(cubes.length === 2 * v.w * v.h, '21Q16 总数应为 2×' + v.w + '×' + v.h);
  }
  console.log('21Q16 从图里数出的方块数 = 答案 ✓ 每列高度 = h、列数 = 2w ✓');
}

/* ---------- 21Q17：只画了前两组，第三组要自己推 ---------- */
{
  const t = byId('icas21y2m-17');
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const ted = (q.diagramSvg.match(/data-u="teddy"/g) || []).length;
    const labels = mAll(q.diagramSvg, />Shape (\d)</g).map(m => m[1]);
    chk(labels.length === 2 && labels.join('') === '12', '21Q17 图上只应画第 1、2 组（画了第 3 组就等于给答案），实际标了 ' + labels.join(','));
    chk(ted === 4 * q.vars.c0 + 2, '21Q17 图上泰迪 ' + ted + ' 只，应为 2×c0 + 2×(c0+1) = ' + (4 * q.vars.c0 + 2));
    /* 独立推：每组比前一组多 2 只 → 第 3 组 = 第 2 组 + 2 = 2×(c0+2) */
    const c0 = (ted - 2) / 4;
    chk(Number.isInteger(c0), '21Q17 从图上数出的泰迪数 ' + ted + ' 推不出整数 c0（应为 4c0+2）');
    const want = 2 * (c0 + 2);
    const cnt = (q.optionsSvg || []).map(s => (s.match(/data-u="teddy"/g) || []).length);
    chk(cnt.length === 4, '21Q17 应有 4 个选项图');
    chk(cnt.filter(x => x === want).length === 1, '21Q17 四个选项的泰迪数 ' + cnt.join(',') + ' 中应只有一个等于 ' + want);
    chk(cnt[q.correctIndex] === want, '21Q17 选中第 ' + q.correctIndex + ' 个（' + cnt[q.correctIndex] + ' 只），应为 ' + want + ' 只');
    /* 正确选项必须是「2 行、每行 c0+2 只」 */
    const box = (q.optionsSvg[q.correctIndex].match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/) || []);
    if (box.length === 3) {
      chk((+box[2] - 16) / 34 === 2, '21Q17 正确选项应画 2 行，实际 ' + ((+box[2] - 16) / 34) + ' 行');
      chk((+box[1] - 16) / 34 === c0 + 2, '21Q17 正确选项每行应 ' + (c0 + 2) + ' 只，实际 ' + ((+box[1] - 16) / 34));
    }
  }
  console.log('21Q17 图上只有两组 ✓ 由图上只数推出第 3 组 ✓ 正确选项 = 2 行×(c0+2) ✓');
}

/* ---------- 21Q18：方格纸上数面积（半格算法） ---------- */
{
  const t = byId('icas21y2m-18');
  const COLOR = { '#f7c948': 'yellow', '#3b82f6': 'blue', '#e5484d': 'red' };
  const ZH = { yellow: '黄色', blue: '蓝色', red: '红色' };
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const area = {};
    mAll(q.diagramSvg, /data-u="sq" [^>]*fill="(#[0-9a-f]{6})"/g).forEach(m => { area[m[1]] = (area[m[1]] || 0) + 2; });
    mAll(q.diagramSvg, /data-u="tri" [^>]*fill="(#[0-9a-f]{6})"/g).forEach(m => { area[m[1]] = (area[m[1]] || 0) + 1; });
    const keys = Object.keys(area);
    chk(keys.length === 3, '21Q18 图上应有 3 个图形，实际 ' + keys.length + '（' + keys.join(',') + '）');
    const vals = keys.map(k => area[k]);
    const mn = Math.min.apply(null, vals);
    chk(vals.filter(x => x === mn).length === 1,
      '21Q18 面积最小必须唯一（否则不止一个正确答案）：' + keys.map(k => COLOR[k] + '=' + area[k]).join(' '));
    const win = keys[vals.indexOf(mn)];
    const name = q.lang === 'en' ? COLOR[win] : ZH[COLOR[win]];
    chk(q.options[q.correctIndex] === name,
      '21Q18 面积最小的是 ' + COLOR[win] + '（' + mn + ' 个半格，' + keys.map(k => COLOR[k] + '=' + area[k]).join(' ') + '），选中「' + q.options[q.correctIndex] + '」');
  }
  console.log('21Q18 从图上数整格+半格 ✓ 最小面积唯一 ✓ 与正确选项一致 ✓');
}

/* ---------- 21Q20：先自己把三个数算出来，再逐张读柱高 ---------- */
{
  const t = byId('icas21y2m-20');
  const NAMES = ['Tim', 'David', 'Amy'];
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const v = q.vars;
    chk(!q.diagramSvg, '21Q20 不该再有主图（会和正确选项重复，等于把答案摆在眼前）');
    /* 独立算：David = dv；Amy = David 的 kk 倍；Tim 比 Amy 多 mm */
    const dv = v.dv, amy = dv * v.kk, tim = amy + v.mm;
    chk(amy !== dv && tim !== amy && tim !== dv, '21Q20 三个人摘的个数应互不相同：' + tim + '/' + dv + '/' + amy);
    const bars = (q.optionsSvg || []).map(s => mAll(s, /<rect data-u="bar" data-v="([\d.]+)"/g).map(m => +m[1]));
    chk(bars.length === 4 && bars.every(b => b.length === 3), '21Q20 每个选项应有 3 根柱子');
    const names = (q.optionsSvg || []).map(s => mAll(s, /<text[^>]*y="147"[^>]*>(\w+)<\/text>/g).map(m => m[1]));
    chk(names.length === 4 && names.every(n => n.join(',') === NAMES.join(',')),
      '21Q20 每张图柱子的次序都应是 Tim / David / Amy：' + JSON.stringify(names));
    const want = [tim, dv, amy];
    const hit = bars.map((b, j) => b.join(',') === want.join(',') ? j : -1).filter(j => j >= 0);
    chk(hit.length === 1, '21Q20 应恰好有一张图的柱高 = 算出来的 ' + want.join(',') + '，实际 ' + hit.length +
      '（' + bars.map(b => b.join('|')).join(' / ') + '）');
    chk(hit.length === 1 && hit[0] === q.correctIndex, '21Q20 柱高全对的是选项 ' + hit[0] + '，模板选了 ' + q.correctIndex);
    chk(new Set(bars.map(b => b.join(','))).size === 4, '21Q20 四张图应互不相同：' + bars.map(b => b.join('|')).join(' / '));
    chk(Math.max(tim, amy, dv) <= v.ax, '21Q20 最高的柱子 ' + Math.max(tim, amy, dv) + ' 超出纵轴上限 ' + v.ax);
    const all = (q.optionsSvg || []).join('');
    NAMES.forEach(n => chk(all.indexOf(n) >= 0, '21Q20 选项图上应出现原卷人名 ' + n));
    chk(all.indexOf('Number of apples') >= 0, '21Q20 纵轴应标原卷英文 Number of apples');
    chk(!/[\u4e00-\u9fff]/.test(all), '21Q20 选项图里出现了中文');
  }
  console.log('21Q20 独立算出 David/Amy/Tim 的个数 ✓ 只有一张柱高全对 ✓ 四张互不相同 ✓');
}

/* ---------- 21Q21：数瓶颈上的凹纹，水面正好在半瓶 ---------- */
{
  const t = byId('icas21y2m-21');
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const lv = (q.optionsSvg || []).map(s => +((s.match(/data-u="water" data-level="(\d+)"/) || [])[1]));
    chk(lv.every(x => !isNaN(x)), '21Q21 选项里读不到水位：' + JSON.stringify(lv));
    const grey = (q.optionsSvg || []).map(s => (s.match(/stroke="#b9bec7" stroke-width="1.6"/g) || []).length);
    const ridges = grey.map(g => g + 1);          /* 凹纹条数 + 1 = 分成的格数 */
    chk(new Set(ridges).size === 1, '21Q21 四个瓶子应一样大（凹纹数相同）：' + ridges.join(','));
    const R = ridges[0], half = R / 2;
    const hit = lv.map((x, j) => x === half ? j : -1).filter(j => j >= 0);
    chk(lv.filter(x => x === half).length === 1, '21Q21 应只有一个瓶子是半瓶（' + half + '/' + R + '），实际水位 ' + lv.join(','));
    chk(hit[0] === q.correctIndex, '21Q21 半瓶的是选项 ' + hit[0] + '，模板选了 ' + q.correctIndex);
    chk(lv[q.correctIndex] > 0 && lv[q.correctIndex] < R, '21Q21 半瓶的位置应严格在途中：' + lv[q.correctIndex] + '/' + R);
  }
  console.log('21Q21 从图上数凹纹定总格数 ✓ 恰好一瓶水面在半瓶 ✓');
}

/* ---------- 21Q22：从图上读编号位置，独立算出「按 1→2→…→6 连线」的边集 ---------- */
{
  const t = byId('icas21y2m-22');
  const ed = s => mAll(s, /<line data-u="edge" x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)
    .map(m => { const a = [(+m[1]).toFixed(1), (+m[2]).toFixed(1)], b = [(+m[3]).toFixed(1), (+m[4]).toFixed(1)];
                return [a.join(), b.join()].sort().join('>'); }).sort();
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const dots = mAll(q.diagramSvg, /<g data-u="dot" data-n="(\d)"><circle cx="([\d.]+)" cy="([\d.]+)"/g)
      .map(m => ({ n: +m[1], x: (+m[2]).toFixed(1), y: (+m[3]).toFixed(1) }));
    chk(dots.length === 6, '21Q22 图上应有 6 个编号点，实际 ' + dots.length);
    chk(new Set(dots.map(d => d.n)).size === 6, '21Q22 编号应 1..6 各一个：' + dots.map(d => d.n).join(','));
    const pos = [];
    for (let n2 = 1; n2 <= 6; n2++) { const d = dots.find(x => x.n === n2); if (d) pos[n2 - 1] = [d.x, d.y].join(); }
    chk(pos.length === 6 && pos.every(Boolean), '21Q22 有编号对不上位置');
    /* 图上已经画好的那条线必须是 6–1（题干说的「这条已经画好」） */
    const gv = q.diagramSvg.match(/<line data-u="given" data-a="1" data-b="6" x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/);
    chk(!!gv, '21Q22 图上应先把 6–1 那条线画好');
    if (gv) {
      const ga = [(+gv[1]).toFixed(1), (+gv[2]).toFixed(1)].join(), gb = [(+gv[3]).toFixed(1), (+gv[4]).toFixed(1)].join();
      chk([ga, gb].sort().join('>') === [pos[0], pos[5]].sort().join('>'),
        '21Q22 那条已画好的线不是连在编号 1 和 6 上的');
    }
    /* 按编号 1→2→…→5→6 再加 6→1，算出应有的 6 条边 */
    const want = [];
    for (let k = 0; k < 6; k++) want.push([pos[k], pos[(k + 1) % 6]].sort().join('>'));
    want.sort();
    const got = (q.optionsSvg || []).map(ed);
    chk(got.length === 4, '21Q22 应有 4 个选项图');
    const hit = got.map((g, j) => g.join('|') === want.join('|') ? j : -1).filter(j => j >= 0);
    chk(hit.length === 1, '21Q22 应恰好有一个选项是按图上编号连出来的，实际 ' + hit.length);
    chk(hit.length === 1 && hit[0] === q.correctIndex, '21Q22 按编号连出来的是选项 ' + hit[0] + '，模板选了 ' + q.correctIndex);
    chk(new Set(got.map(g => g.join('|'))).size === 4, '21Q22 四个选项的连线应互不相同（否则有多个正确答案）');
  }
  console.log('21Q22 从图上读编号位置 ✓ 已给的 6–1 线对得上 ✓ 唯一命中「按编号连线」的选项 ✓');
}

/* ---------- 21Q23：前三个三角形验证规律，第四个自己补 ---------- */
{
  const t = byId('icas21y2m-23');
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const txt = mAll(q.diagramSvg, /<text[^>]*>([^<]*)<\/text>/g).map(m => m[1].trim());
    chk(txt.length === 16, '21Q23 4 个三角形 × 4 个数 = 16 个数字，实际 ' + txt.length);
    for (let k = 0; k < 3; k++) {
      const g = txt.slice(k * 4, k * 4 + 4).map(Number);
      chk(g[0] + g[1] + g[2] === g[3],
        '21Q23 第 ' + (k + 1) + ' 个三角形外面 ' + g[0] + '+' + g[1] + '+' + g[2] + ' 应等于里面 ' + g[3]);
    }
    const last = txt.slice(12, 16);
    chk(last[0] === '?', '21Q23 最后一个三角形的顶角应写「?」，实际「' + last[0] + '」');
    const inside = Number(last[3]), bl = Number(last[1]), br = Number(last[2]);
    const ans = inside - bl - br;
    chk(ans > 0, '21Q23 缺的数应为正数，实际 ' + ans);
    chk(String(q.options[q.correctIndex]) === String(ans),
      '21Q23 图上写着 ' + bl + ' 和 ' + br + '、里面是 ' + inside + '，缺的应是 ' + ans + '，选中「' + q.options[q.correctIndex] + '」');
    chk(new Set(q.options.map(String)).size === 4, '21Q23 四个选项应互不相同：' + q.options.join(','));
  }
  console.log('21Q23 前三个三角形自洽 ✓ 第四个数完全由图上的数推出 ✓');
}

/* ---------- 21Q25：靶环从外到内 1..5，最高分自己读 ---------- */
{
  const t = byId('icas21y2m-25');
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const rings = mAll(q.diagramSvg, /<circle data-u="ring" data-i="(\d+)"[^>]*r="([\d.]+)"/g)
      .map(m => ({ i: +m[1], r: +m[2] }));
    chk(rings.length === 5, '21Q25 靶盘应有 5 个环，实际 ' + rings.length);
    const sorted = rings.slice().sort((a, b) => a.i - b.i);
    chk(sorted.every((x, j) => j === 0 || x.r < sorted[j - 1].r), '21Q25 分数越高的环半径应越小：' + sorted.map(x => x.i + ':' + x.r).join(' '));
    const top = Math.max.apply(null, rings.map(x => x.i));
    chk(top === 5, '21Q25 最高分环应是 5 分，实际 ' + top);
    chk(new RegExp('<text[^>]*>' + top + '</text>').test(q.diagramSvg), '21Q25 图上没把最高分 ' + top + ' 写出来');
    const v = q.vars;
    chk(q.value === v.k * top + v.b - v.m, '21Q25 答案 ' + q.value + ' 应为 ' + v.k + '×' + top + ' + ' + v.b + ' − ' + v.m);
  }
  console.log('21Q25 环半径随分数递减 ✓ 最高分从图上读出 = 5 ✓ 算式独立算 ✓');
}

/* ---------- 21Q26：象形统计图 —— 数图形个数 × KEY ---------- */
{
  const t = byId('icas21y2m-26');
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const units = (q.diagramSvg.match(/<g data-u="unit">/g) || []).length;
    const key = mAll(q.diagramSvg, /<text data-u="keytext"[^>]*>= (\d+) (\w+)</g);
    chk(key.length === 1, '21Q26 KEY 说明应有且只有一条，实际 ' + key.length);
    const per = +key[0][1];
    chk(units === q.vars.a + q.vars.b + q.vars.c, '21Q26 图上小汽车 ' + units + ' 个，应为 ' + (q.vars.a + q.vars.b + q.vars.c));
    chk((q.diagramSvg.match(/data-u="keyunit"/g) || []).length === 1, '21Q26 KEY 框里应只有一个示例图形');
    chk(q.value === units * per, '21Q26 答案 ' + q.value + ' 应为 ' + units + ' × ' + per + '（图上个数 × KEY）');
    chk(key[0][2] === 'cars', '21Q26 KEY 文字应为英文 cars，实际 ' + key[0][2]);
  }
  console.log('21Q26 数图上小汽车个数 ✓ 读 KEY 的倍数 ✓ 相乘得答案 ✓');
}

/* ---------- 21Q27：蜂巢密铺 —— 用「中心距 = √3·R」独立重建邻接关系，数只接 3 个的块 ---------- */
{
  const t = byId('icas21y2m-27');
  const parse = svg => mAll(svg,
    /<polygon data-u="hex" data-r="(\d+)" data-c="(\d+)" data-x="([\d.]+)" data-y="([\d.]+)" points="([^"]+)" fill="([^"]+)"/g)
    .map(m => {
      const pts = m[5].split(' ').map(p => p.split(',').map(Number));
      return { r: +m[1], c: +m[2], x: +m[3], y: +m[4],
               R: Math.hypot(pts[0][0] - +m[3], pts[0][1] - +m[4]), fill: m[6] };
    });
  /* 两块共用一条边 ⇔ 中心距 = √3·R */
  const adjOf = hex => {
    const step = Math.sqrt(3) * hex[0].R;
    return hex.map(h => hex.filter(o => o !== h && Math.abs(Math.hypot(o.x - h.x, o.y - h.y) - step) < 1.0));
  };
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const hex = parse(q.diagramSvg);
    chk(hex.length >= 6, '21Q27 图上六边形太少：' + hex.length);
    /* 原题是「同色密铺」，不能把某一块涂色 —— 涂了就变成「数涂色块的邻居」这道完全不同的题 */
    chk(new Set(hex.map(h => h.fill)).size === 1,
      '21Q27 六边形必须全部同色，实际有 ' + new Set(hex.map(h => h.fill)).size + ' 种颜色：' + hex.map(h => h.fill).filter((f, j, a) => a.indexOf(f) === j).join(','));
    chk(hex.every(h => Math.abs(h.R - hex[0].R) < 0.05), '21Q27 六边形大小应完全一致');
    const rows = {};
    hex.forEach(h => rows[h.r] = (rows[h.r] || 0) + 1);
    const rowKeys = Object.keys(rows).map(Number).sort((a, b) => a - b);
    chk(rowKeys.length >= 2, '21Q27 至少要有两行才拼得成蜂巢：' + rowKeys.join(','));
    rowKeys.forEach(r => chk(rows[r] >= 1, '21Q27 第 ' + r + ' 行是空的'));
    const adj = adjOf(hex), nb = adj.map(a => a.length);
    chk(nb.every(v => v <= 6), '21Q27 一个六边形最多只能和 6 个相接：' + nb.join(','));
    chk(nb.every(v => v >= 1), '21Q27 有六边形孤零零没和任何一块相接，不成一坨：' + nb.join(','));
    /* 连通性：从第 1 块出发能不能走到所有块 */
    const vis = [0], stk = [0];
    while (stk.length) {
      const k = stk.pop();
      adj[k].forEach(o => { const j = hex.indexOf(o); if (vis.indexOf(j) < 0) { vis.push(j); stk.push(j); } });
    }
    chk(vis.length === hex.length, '21Q27 图形不连通（有块飘在外面）：' + vis.length + '/' + hex.length);
    const only3 = nb.filter(v => v === 3).length;
    chk(only3 === q.value, '21Q27 图上只和 3 个相接的六边形有 ' + only3 + ' 个，模板答案 ' + q.value +
      '（每块邻居数 ' + nb.join(',') + '）');
    /* 判定要稳：不能有块落在「共边距离」和「同排隔一块」之间的模糊带上 */
    const amb = [], step = Math.sqrt(3) * hex[0].R, R = hex[0].R;
    hex.forEach(h => hex.forEach(o => {
      if (o === h) return;
      const d = Math.hypot(o.x - h.x, o.y - h.y);
      if (d > step + 1 && d < 2 * R - 1) amb.push(d);
    }));
    chk(!amb.length, '21Q27 有六边形落在模糊距离带上，邻居判定不稳：' + amb.slice(0, 3).map(v => v.toFixed(1)).join(','));
    const hist = {};
    nb.forEach(v => hist[v] = (hist[v] || 0) + 1);
    chk(Object.keys(hist).length >= 2, '21Q27 所有六边形的邻居数都一样，题目没有区分度：' + JSON.stringify(hist));
  }
  /* 变式抽查：每种排布 → 答案必须对得上，而且四种排布要给出四个不同答案
     （否则「换个变式答案还是同一个」，等于没变） */
  const P2A = {};
  for (let i = 0; i < 240; i++) {
    const q = Generator.instantiate(t);
    const hex = parse(q.diagramSvg);
    const geom = adjOf(hex).map(a => a.length).filter(v => v === 3).length;
    const pat = q.vars.pat;
    chk(geom === q.value, '21Q27 排布 ' + pat + ' 的图上只有 ' + geom + ' 块只接 3 个，答案却是 ' + q.value);
    if (P2A[pat] === undefined) P2A[pat] = q.value;
    else chk(P2A[pat] === q.value, '21Q27 同一排布 ' + pat + ' 给出了不同答案：' + P2A[pat] + ' / ' + q.value);
  }
  const pats = Object.keys(P2A);
  chk(pats.length === 4, '21Q27 应有 4 种排布，实际 ' + pats.length + '：' + pats.join(' '));
  chk(new Set(pats.map(p => P2A[p])).size === 4,
    '21Q27 四种排布必须给出四个不同答案：' + pats.map(p => p + '→' + P2A[p]).join('，'));
  chk(P2A['343'] === 6, '21Q27 原卷那个 3-4-3 的图形应得 6（原卷选项 4/6/7/8 里正解就是 6），实际 ' + P2A['343']);
  console.log('21Q27 全同色密铺 ✓ 中心距 √3R 独立重建邻接 ✓ 只接 3 个的块数 = 答案 ✓ 四种排布答案互不相同 ✓');
}

/* ---------- 21Q29：房子**不等距** —— 用图上量到的位置独立解出唯一排序 ---------- */
{
  const t = byId('icas21y2m-29');
  const NAMES4 = ['Pete', 'Sita', 'Lin', 'Ben'];
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const v = q.vars;
    const hp = mAll(q.diagramSvg, /<g data-u="house" data-i="(\d+)" data-x="([\d.]+)"/g).map(m => ({ i: +m[1], x: +m[2] }));
    chk(hp.length === 4, '21Q29 图上应有 4 栋房子，实际 ' + hp.length);
    const gp = mAll(q.diagramSvg, /<line data-u="gap" data-i="(\d+)" data-units="(\d+)"/g).map(m => ({ i: +m[1], u: +m[2] }));
    chk(gp.length === 3, '21Q29 图上应画出 3 段间距，实际 ' + gp.length);
    /* 名字绝不能画在图上（写了就等于把答案印出来）——原卷是让学生把名字拖进去 */
    NAMES4.forEach(n => chk(q.diagramSvg.indexOf(n) < 0, '21Q29 图上不能出现名字，却写了 ' + n));
    chk((q.diagramSvg.match(/data-u="namebox"/g) || []).length === 4, '21Q29 应留出 4 个空名字框');
    /* 图上量到的间距必须和 data-units 成正比，否则「宽的那段」读不出来 */
    const wall = 52, unit = 38, ds = [], us = [];
    for (let j = 0; j < 3; j++) { ds.push(hp[j + 1].x - hp[j].x - wall); us.push(gp[j].u); }
    chk(ds.every((d, j) => Math.abs(d - us[j] * unit) < 0.6),
      '21Q29 图上间距和标称份数不成比例：' + ds.map((d, j) => d.toFixed(0) + 'px/' + us[j] + '份').join(' '));
    chk(new Set(us).size > 1, '21Q29 三段间距的份数应不完全相同（原题就是不等距的）：' + us.join(','));
    /* 大树必须站在最宽的那段空隙里 —— 这是「哪一头宽」的唯一线索 */
    const tg = +(q.diagramSvg.match(/<g data-u="tree" data-gap="(\d+)"/) || [])[1];
    const widest = us.indexOf(Math.max.apply(null, us));
    chk(tg === widest, '21Q29 大树应站在最宽的那段（第 ' + widest + ' 段），实际站在第 ' + tg + ' 段');
    /* 独立解：把四栋房子从 0 起按份数排开，1 份 = u 步，穷举 24 种安排，要求解唯一 */
    const cum = [0];
    for (let j = 0; j < 3; j++) cum.push(cum[j] + us[j]);
    const k1 = v.U1 / v.u, k2 = v.U2 / v.u;
    chk(Number.isInteger(k1) && Number.isInteger(k2), '21Q29 步数不是 u 的整数倍：U1=' + v.U1 + ', U2=' + v.U2 + ', u=' + v.u);
    const kids = [v.X, v.Y, v.Z, v.W];
    const all = [];
    const walk = (rest, cur) => {
      if (!rest.length) { all.push(cur.slice()); return; }
      rest.forEach((n, j) => walk(rest.filter((x, k) => k !== j), cur.concat([n])));
    };
    walk(kids, []);
    const ok = all.filter(a => {
      const at = n => cum[a.indexOf(n)];                     /* 住在第 j 栋 → 坐标 cum[j]（单位：份） */
      return Math.abs(at(v.X) - at(v.Z)) === k1 && Math.abs(at(v.Y) - at(v.Z)) === k1 &&
             Math.abs(at(v.Z) - at(v.W)) === k2 && Math.abs(at(v.Y) - at(v.W)) === k2;
    });
    chk(ok.length === 1, '21Q29 按图上间距解出的排法有 ' + ok.length + ' 种（应唯一）：' +
      ok.map(a => a.join(',')).join(' | ') + '（份数 ' + us.join('') + '，U1=' + v.U1 + '，U2=' + v.U2 + '，u=' + v.u + '）');
    if (ok.length === 1) {
      chk(String(q.options[q.correctIndex]) === ok[0].join(', '),
        '21Q29 独立推出 ' + ok[0].join(', ') + '，选中「' + q.options[q.correctIndex] + '」');
    }
    chk(new Set(q.options.map(String)).size === 4, '21Q29 四个选项应互不相同：' + q.options.join(' | '));
  }
  console.log('21Q29 名字未画在图上 ✓ 间距不等距 + 大树在宽段 ✓ 距离条件解唯一 = 正确选项 ✓');
}

/* ---------- 21Q30：等差数列 —— 读表验证「每天多 d 枚」，再逐天累加 ---------- */
{
  const t = byId('icas21y2m-30');
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const v = q.vars;
    /* 宝箱上的金币只是装饰，不能挂标记（挂了就会被当成条件去数） */
    chk(!/data-u="coin"/.test(q.diagramSvg), '21Q30 宝箱上的金币只是装饰，不该挂 coin 标记');
    chk(/Day/.test(q.diagramSvg), '21Q30 表头应有 Day');
    chk(/Number of gold pieces taken out/.test(q.diagramSvg), '21Q30 表头应有 Number of gold pieces taken out');
    chk(!/[\u4e00-\u9fff]/.test(q.diagramSvg), '21Q30 配图里出现了中文');
    const cells = {};
    mAll(q.diagramSvg, /<text data-u="cell" data-r="(\d+)" data-c="(\d+)"[^>]*>([^<]*)<\/text>/g)
      .forEach(m => { cells[m[1] + '-' + m[2]] = m[3]; });
    chk(Object.keys(cells).length === 6, '21Q30 表格应是 3 天 × 2 列 = 6 格，实际 ' + Object.keys(cells).length);
    const t1 = +cells['0-1'], t2 = +cells['1-1'], t3 = +cells['2-1'];
    chk(t1 === v.a, '21Q30 表里第 1 天取 ' + t1 + ' 枚，应等于 a=' + v.a);
    chk(t2 - t1 === v.d, '21Q30 第 2 天比第 1 天多 ' + (t2 - t1) + ' 枚，应为 d=' + v.d);
    chk(t3 - t2 === v.d, '21Q30 第 3 天比第 2 天多 ' + (t3 - t2) + ' 枚，应为 d=' + v.d);
    chk(v.d >= 1, '21Q30 每天多取的枚数 d 必须为正（否则不是「越来越多」）');
    /* 独立累加：每天取 a、a+d、a+2d……，看哪天累计正好等于 T */
    let sum = 0, day = 0, hitDay = -1;
    while (day < 80) {
      day++; sum += v.a + (day - 1) * v.d;
      if (sum >= v.T) { hitDay = (sum === v.T ? day : -1); break; }
    }
    chk(hitDay === v.n, '21Q30 逐天累加：第 ' + hitDay + ' 天正好取空 ' + v.T + ' 枚，模板答案 ' + v.n);
    chk(v.T === v.n * v.a + v.d * v.n * (v.n - 1) / 2, '21Q30 T 应等于等差前 ' + v.n + ' 项和：' + v.T);
    chk(Number.isInteger(v.T) && v.T > 0, '21Q30 T 不是正整数：' + v.T);
    chk(q.value === v.n, '21Q30 答案 ' + q.value + ' 应为天数 ' + v.n);
    /* 若按「每天都取一样多」算，天数不同 —— 说明题目真的在考等差 */
    const flat = v.T / v.a;
    chk(!Number.isInteger(flat) || flat !== v.n, '21Q30 按「每天取 a 枚」也能整除得同一天数，考不出等差');
  }
  console.log('21Q30 表里是等差数列（公差 d）✓ 逐天累加恰好第 n 天取空 ✓ 金币不被当条件 ✓');
}

/* ---------- 选项图形两两不同（否则等于有两个正确答案）---------- */
{
  let n = 0;
  ['icas21y2m-02', 'icas21y2m-09', 'icas21y2m-12', 'icas21y2m-14', 'icas21y2m-17', 'icas21y2m-20', 'icas21y2m-21', 'icas21y2m-22']
    .forEach(id => {
      const t = byId(id);
      for (let i = 0; i < 25; i++) {
        const q = Generator.instantiate(t);
        const svg = (q.optionsSvg || []).map(s => String(s).replace(/viewBox="[^"]*"/, ''));
        chk(new Set(svg).size === svg.length, id + ' 有两个选项画出来一模一样（学生看到两个正确答案）');
        n++;
      }
    });
  console.log('选项图形互不相同 ✓（' + n + ' 次抽样）');
}

/* ---------- 2021 配图文字一律用原卷英文 ---------- */
{
  const CASES = [
    ['icas21y2m-03', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Today']],
    ['icas21y2m-04', ['Kate', 'Pete']],
    ['icas21y2m-09', ['matches', 'Jim picked up this domino.']],
    ['icas21y2m-10', ['red', 'blue', 'green', 'yellow', 'walk this way']],
    ['icas21y2m-14', ['Box 1', 'Box 2']],
    ['icas21y2m-15', ['5 cm', '2 cm']],
    ['icas21y2m-17', ['Shape 1', 'Shape 2']],
    ['icas21y2m-20', ['Tim', 'David', 'Amy', 'Number of apples']],
    ['icas21y2m-26', ['KEY', 'Red', 'Green', 'Blue', 'cars']],
    ['icas21y2m-30', ['Day', 'Number of gold pieces taken out']],
    /* 这几道题的图里只有数字/几何图形，没有文字 —— 只查「不许出现中文」
       （Q29 的人名必须**不**出现在图上，已在上面单列校验） */
    ['icas21y2m-13', []],
    ['icas21y2m-22', []],
    ['icas21y2m-27', []],
    ['icas21y2m-29', []]
  ];
  CASES.forEach(([id, words]) => {
    const t = byId(id);
    for (let i = 0; i < 10; i++) {
      const q = Generator.instantiate(t);
      const svg = (q.diagramSvg || '') + (q.optionsSvg || []).join('');
      chk(!/[\u4e00-\u9fff]/.test(svg), id + ' 配图里出现了中文');
      words.forEach(w => chk(svg.indexOf(w) >= 0, id + ' 图里应出现「' + w + '」'));
    }
  });
  /* 第 3 组不能画出来 */
  const t17 = byId('icas21y2m-17');
  for (let i = 0; i < 10; i++) {
    const q = Generator.instantiate(t17);
    chk(q.diagramSvg.indexOf('Shape 3') < 0, '21Q17 图里不能画出第 3 组（等于给答案）');
  }
  console.log('2021 配图文字 = 原卷英文 ✓ 第 3 组未被画出 ✓');
}

/* ---------- 图形类型表不能有重复 key（重复时后者静默覆盖，改前面那个等于白改） ---------- */
{
  const src = fs.readFileSync(path.join(root, 'assets/js/diagrams.js'), 'utf8');
  const seen = {}, dup = [];
  let m;
  const re = /^\s{4}([a-zA-Z][\w]*): function \(spec, vars\)/gm;
  while ((m = re.exec(src))) {
    if (seen[m[1]]) dup.push(m[1]);
    seen[m[1]] = 1;
  }
  chk(dup.length === 0, 'diagrams.js 里有重复定义的图形类型（前面的会被静默覆盖）：' + dup.join(', '));
  console.log('diagrams.js 图形类型 ' + Object.keys(seen).length + ' 个，无重复定义 ✓');
}

console.log(bad ? '\n✗ 共 ' + bad + ' 项不符' : '\n✓ 全部交叉验算通过');
process.exit(bad ? 1 : 0);
