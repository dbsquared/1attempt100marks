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
const { Generator, Grader } = ctx;
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

/* ---------- 21Q10：从图上走到哪盆花，就读哪盆的颜色（图上不画脚印点，答案靠学生自己数）---------- */
{
  const t = byId('icas21y2m-10');
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const v = q.vars;
    /* 4 盆花：data-j + 颜色 + 中心 x（potIcon 的 path 起点为 cx-18） */
    const pots = [];
    mAll(q.diagramSvg, /<g data-u="pot" data-j="(\d+)" data-fill="([^"]+)"><path d="M([\d.]+),/g)
      .forEach(m => { pots[+m[1]] = { fill: m[2], x: +m[3] + 18 }; });
    chk(pots.length === 4 && pots.every(Boolean), '21Q10 图上应有 4 盆花，实际 ' + pots.length);
    chk(!!q.diagramSvg.match(/<circle[^>]*r="[\d.]+"/), '21Q10 图上应有房子的位置参照');
    /* 箭头：data-dir 方向，data-n 步数，x1 为起点（startX = houseX + dir*34） */
    const arrow = q.diagramSvg.match(/<line data-u="arrow" data-dir="(-?\d+)" data-n="(\d+)" x1="([\d.]+)"/);
    chk(!!arrow, '21Q10 图上缺少箭头');
    const dir = +arrow[1], n0v = +arrow[2], startX = +arrow[3];
    chk(n0v === v.n0, '21Q10 箭头标注的步数 ' + n0v + ' 应为 ' + v.n0);
    const houseX = startX - dir * 34;
    /* 沿箭头方向数 n0 盆：取箭头那一侧、按方向排序后的第 n0 盆 */
    const side = pots.filter(p => (p.x - houseX) * dir > 0)
                     .sort((a, b) => dir > 0 ? a.x - b.x : b.x - a.x);
    chk(side.length >= n0v, '21Q10 箭头一侧花盆只有 ' + side.length + ' 盆，不够走 ' + n0v + ' 盆');
    const stop = side[n0v - 1];
    chk(!!stop, '21Q10 沿箭头走 ' + n0v + ' 盆没有对应花盆');
    chk(q.options[q.correctIndex] === stop.fill,
      '21Q10 沿箭头走 ' + n0v + ' 盆停在「' + stop.fill + '」(x=' + stop.x + ')，正确选项应为它，实际选中「' +
      q.options[q.correctIndex] + '」');
    chk(new Set(q.options).size === 4, '21Q10 选项颜色应互不相同：' + q.options.join(','));
  }
  console.log('21Q10 箭头方向/步数正确 ✓ 沿箭头数 n0 盆停下的颜色 = 正确选项 ✓');
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

/* ---------- 21Q12：连线配对题 —— 左列 4 钟面表针角度独立验算，右列 4 数字钟，key(h*60+m) 一一对应 ---------- */
{
  const t = byId('icas21y2m-12');
  const pad2 = x => (x < 10 ? '0' + x : String(x));
  const norm = d => ((d % 360) + 360) % 360;
  const circ = (a, b) => { const d = Math.abs(a - b); return Math.min(d, 12 - d); };
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const L = q.leftItems || [], R = q.rightItems || [];
    chk(L.length === 4 && R.length === 4, '21Q12 左右两列应各 4 项，实际 L=' + L.length + ' R=' + R.length);
    chk(L.every(x => x.svg && /data-u="clock" /.test(x.svg)), '21Q12 左列每项应是模拟钟面 SVG');
    chk(R.every(x => x.svg && /data-text="\d{1,2}:\d{2}"/.test(x.svg)), '21Q12 右列每项应是数字钟 SVG');
    /* 表针角度自己算一遍（cx=80, cy=80, r=70） */
    const FACE = [];
    L.forEach((it, j) => {
      const m = String(it.svg).match(/<g data-u="clock" data-h="(\d+)" data-m="(\d+)">([\s\S]*?)<\/g>/);
      if (!m) { chk(false, '21Q12 左列第 ' + (j + 1) + ' 项缺钟面标签'); return; }
      const h = +m[1], mm = +m[2], cx = 80, cy = 80;
      const hands = mAll(m[3], /<line x1="[\d.]+" y1="[\d.]+" x2="([\d.]+)" y2="([\d.]+)" stroke="[^"]+" stroke-width="(\d+)" stroke-linecap="round"\/>/g)
        .map(x => ({ x: +x[1], y: +x[2], w: +x[3] }));
      const hh = hands.filter(x => x.w === 4), mmH = hands.filter(x => x.w === 3);
      chk(hh.length === 1 && mmH.length === 1, '21Q12 左列第 ' + (j + 1) + ' 钟面应各有一根时针/分针');
      const deg = x => norm(Math.atan2(x.x - cx, -(x.y - cy)) * 180 / Math.PI);
      if (hh.length === 1 && mmH.length === 1) {
        const mDeg = deg(mmH[0]);
        chk(Math.abs(mDeg / 6 - mm) < 1.6, '21Q12 左列第 ' + (j + 1) + ' 分针指向 ' + (mDeg / 6).toFixed(1) + ' 分，标注 ' + mm + ' 分');
        const hVal = deg(hh[0]) / 30, want = (h % 12) + mm / 60;
        chk(circ(hVal, want) < 0.15, '21Q12 左列第 ' + (j + 1) + ' 时针指向 ' + hVal.toFixed(2) + ' 点，标注 ' + h + ':' + pad2(mm));
        FACE.push(pad2(h) + ':' + pad2(mm));
      }
    });
    /* key 一一对应：左右各 4 个互不相同、且两列时刻集合一致 */
    const lk = L.map(x => String(x.key)), rk = R.map(x => String(x.key));
    chk(new Set(lk).size === 4, '21Q12 左列 4 个时刻应互不相同：' + lk.join(','));
    chk(new Set(rk).size === 4, '21Q12 右列 4 个时刻应互不相同：' + rk.join(','));
    chk(lk.slice().sort().join(',') === rk.slice().sort().join(','), '21Q12 左右两列时刻集合应一致：' + lk.join(',') + ' vs ' + rk.join(','));
    /* 数字钟文字 = 对应 key 的时刻 */
    R.forEach((it, j) => {
      const txt = (String(it.svg).match(/data-text="([^"]+)"/) || [])[1];
      const mins = +it.key, h = Math.floor(mins / 60), mm = mins % 60;
      chk(txt === pad2(h) + ':' + pad2(mm), '21Q12 右列第 ' + (j + 1) + ' 电子钟显示 ' + txt + '，key 应为 ' + pad2(h) + ':' + pad2(mm));
    });
    /* 独立判分：正确配对判对；错连一条判错 */
    const correct = L.map((it, i2) => {
      let ri = -1;
      for (let j = 0; j < R.length; j++) if (String(R[j].key) === String(it.key)) { ri = j; break; }
      return [i2, ri];
    });
    const wrong = correct.map(x => x.slice());
    if (wrong.length) wrong[0][1] = (wrong[0][1] + 1) % R.length;
    chk(Grader.grade(q, correct).ok, '21Q12 正确配对应判对');
    chk(!Grader.grade(q, wrong).ok, '21Q12 错连一条应判错');
    chk(!Grader.grade(q, correct.slice(0, 3)).ok, '21Q12 少连一条应判错');
  }
  console.log('21Q12 左右 4+4 配对 ✓ 表针角度=标注 ✓ key 一一对应 ✓ 判分（对/错连/少连）✓');
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

/* ---------- 21Q16：立体方块 —— 按 ni 复刻四种排布，逐列高度与图上一致，总数独立用 8h−2ni 验算 ---------- */
{
  const t = byId('icas21y2m-16');
  /* 与模板 derived 同一张排布表：P0 长方体 / P1 前层缺口 / P2 双层凹口 / P3 前后错位阶梯。
     偏移量是相对 h 的差值 —— 图上每列画几个必须和这张表一致。 */
  const OFF = [
    { F: [0, 0, 0, 0],   B: [0, 0, 0, 0] },
    { F: [0, 0, -1, -1], B: [0, 0, 0, 0] },
    { F: [-1, 0, 0, -1], B: [-1, 0, 0, -1] },
    { F: [-1, -1, -1, 0], B: [0, -1, -1, -1] }
  ];
  let sawIrregular = 0;
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    const v = q.vars, h = v.h, ni = v.ni;
    const cubes = mAll(q.diagramSvg, /<rect data-u="cube" x="([\d.]+)" y="([\d.]+)"/g).map(m => ({ x: +m[1], y: +m[2] }));
    chk(cubes.length === q.value, '21Q16 答案 ' + q.value + ' 应等于图上画的小方块数 ' + cubes.length);
    chk(q.value === 8 * h - 2 * ni, '21Q16 答案 ' + q.value + ' 应为 8×' + h + ' − 2×' + ni + ' = ' + (8 * h - 2 * ni));
    /* 画法常量：s0=40，dx=20（后排比前排同列右移 20）。前后排 x 交错排列，
       用 (x−minX)%40 区分：=0 是前排，=20 是后排。 */
    const xs = [...new Set(cubes.map(c => c.x))];
    chk(xs.length === 8, '21Q16 前后两层共应有 8 列，实际 ' + xs.length);
    const perCol = {};
    cubes.forEach(c => { perCol[c.x] = (perCol[c.x] || 0) + 1; });
    const minX = Math.min.apply(null, xs);
    const frontX = xs.filter(x => (x - minX) % 40 === 0).sort((a, b) => a - b);
    const backX = xs.filter(x => (x - minX) % 40 === 20).sort((a, b) => a - b);
    chk(frontX.length === 4 && backX.length === 4, '21Q16 前/后层各应 4 列，实际 前 ' + frontX.length + ' 后 ' + backX.length);
    const exp = OFF[ni];
    frontX.forEach((x, c) => chk(perCol[x] === h + exp.F[c], '21Q16 前层第 ' + (c + 1) + ' 列画了 ' + perCol[x] + ' 块，应为 ' + (h + exp.F[c])));
    backX.forEach((x, c) => chk(perCol[x] === h + exp.B[c], '21Q16 后层第 ' + (c + 1) + ' 列画了 ' + perCol[x] + ' 块，应为 ' + (h + exp.B[c])));
    if (ni !== 0) sawIrregular++;
  }
  /* 不规则排布要真的出现：40 次抽样里 P0 之外的出现次数必须过半（均匀四选一，纯长方体占 1/4） */
  chk(sawIrregular > REP21 / 2, '21Q16 不规则排布出现 ' + sawIrregular + '/' + REP21 + ' 次，应过半（长方体只占 1/4）');
  console.log('21Q16 四种排布（含不规则体）逐列高度 = 排布表 ✓ 总数 = 8h−2ni ✓ 图上块数 = 答案 ✓');
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

/* ---------- 21Q22：主图只有 6 个随机摆放的编号点（不画线）；
     从图上读点坐标，独立重算「按 1→2→…→6→1 连成的闭合环」，验证唯一命中 ---------- */
{
  const t = byId('icas21y2m-22');
  const EDGES = /<line data-u="edge" x1="(-?[\d.]+)" y1="(-?[\d.]+)" x2="(-?[\d.]+)" y2="(-?[\d.]+)"/g;
  const ed = s => mAll(s, EDGES).map(m => {
    const a = [(+m[1]).toFixed(1), (+m[2]).toFixed(1)], b = [(+m[3]).toFixed(1), (+m[4]).toFixed(1)];
    return [a.join(), b.join()].sort().join('>');
  }).sort();
  const ends = s => mAll(s, EDGES).reduce((acc, m) => acc.concat(
    [[(+m[1]).toFixed(1), (+m[2]).toFixed(1)].join(), [(+m[3]).toFixed(1), (+m[4]).toFixed(1)].join()]), []);
  for (let i = 0; i < REP21; i++) {
    const q = Generator.instantiate(t);
    /* 主图：只能有点，不能有任何连线（原本那条「6–1 已画好」的线已按用户要求去掉） */
    chk(!/data-u="given"/.test(q.diagramSvg) && q.diagramSvg.indexOf('<line') < 0,
      '21Q22 主图不该画任何连线');
    const dots = mAll(q.diagramSvg, /<g data-u="dot" data-n="(\d)" data-x="(-?[\d.]+)" data-y="(-?[\d.]+)"/g)
      .map(m => ({ n: +m[1], x: (+m[2]).toFixed(1), y: (+m[3]).toFixed(1) }));
    chk(dots.length === 6, '21Q22 图上应有 6 个编号点，实际 ' + dots.length);
    chk(new Set(dots.map(d => d.n)).size === 6, '21Q22 编号应 1..6 各一个：' + dots.map(d => d.n).join(','));
    const pos = [];
    for (let n2 = 1; n2 <= 6; n2++) { const d = dots.find(x => x.n === n2); if (d) pos[n2 - 1] = [d.x, d.y].join(); }
    chk(pos.length === 6 && pos.every(Boolean), '21Q22 有编号对不上位置');
    /* 点位不能退化：两两间距够大、整体铺得开，否则图形读不出来 */
    let mind = Infinity;
    const xs = dots.map(d => +d.x), ys = dots.map(d => +d.y);
    for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) {
      mind = Math.min(mind, Math.hypot(+dots[a].x - +dots[b].x, +dots[a].y - +dots[b].y));
    }
    chk(mind >= 58, '21Q22 点位太挤（最近两点 ' + mind.toFixed(1) + 'px）');
    chk(Math.max(...xs) - Math.min(...xs) >= 160 && Math.max(...ys) - Math.min(...ys) >= 110,
      '21Q22 点位铺得太窄/太扁：' + (Math.max(...xs) - Math.min(...xs)) + '×' + (Math.max(...ys) - Math.min(...ys)));
    /* 按编号 1→2→…→5→6 再加 6→1，算出应有的 6 条边 */
    const want = [];
    for (let k = 0; k < 6; k++) want.push([pos[k], pos[(k + 1) % 6]].sort().join('>'));
    want.sort();
    const got = (q.optionsSvg || []).map(ed);
    chk(got.length === 4, '21Q22 应有 4 个选项图');
    got.forEach((g, j) => chk(g.length === 6, '21Q22 选项 ' + j + ' 应是 6 条边的闭合环，实际 ' + g.length));
    /* 4 个选项必须画在主图那一组点上，否则没法逐点比对 */
    (q.optionsSvg || []).forEach((s, j) => {
      chk(ends(s).every(v => pos.indexOf(v) >= 0), '21Q22 选项 ' + j + ' 的点不在主图那 6 个点上');
    });
    const hit = got.map((g, j) => g.join('|') === want.join('|') ? j : -1).filter(j => j >= 0);
    chk(hit.length === 1, '21Q22 应恰好有一个选项是按图上编号连出来的，实际 ' + hit.length);
    chk(hit.length === 1 && hit[0] === q.correctIndex, '21Q22 按编号连出来的是选项 ' + hit[0] + '，模板选了 ' + q.correctIndex);
    chk(new Set(got.map(g => g.join('|'))).size === 4, '21Q22 四个选项的连线应互不相同（否则有多个正确答案）');
  }
  console.log('21Q22 主图只有 6 个随机点（无连线）✓ 点位不退化 ✓ 四图同一组点且互不相同 ✓ 唯一命中「按编号连成闭合环」✓');
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
    /* 原卷一致性：外环红、红白相间、靶心红里白 5、1-4 黑字齐全 */
    const fillOf = {};
    mAll(q.diagramSvg, /<circle data-u="ring" data-i="(\d+)"[^>]*fill="(#[0-9a-f]{6})"/g).forEach(m => { fillOf[m[1]] = m[2]; });
    chk(fillOf[1] === '#d0342c', '21Q25 外环（1 分）应为红色 #d0342c，实际 ' + fillOf[1]);
    chk(fillOf[2] === '#ffffff' && fillOf[3] === '#d0342c' && fillOf[4] === '#ffffff' && fillOf[5] === '#d0342c',
      '21Q25 环带应红白相间，实际 ' + JSON.stringify(fillOf));
    const nums = mAll(q.diagramSvg, /<text [^>]*>(\d)<\/text>/g).map(m => m[1]);
    chk(nums.join('') === '12345', '21Q25 图上应依次写 1-5，实际 ' + nums.join(','));
    const t5 = mAll(q.diagramSvg, /<text [^>]*fill="#ffffff"[^>]*>5<\/text>/g);
    chk(t5.length === 1, '21Q25 靶心里的 5 应用白字，实际出现 ' + t5.length + ' 次');
  }
  console.log('21Q25 环半径随分数递减 ✓ 最高分从图上读出 = 5 ✓ 红白配色/数字照原卷 ✓ 算式独立算 ✓');
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
    /* 车色必须跟行标签一致（Red 行红车 / Green 行绿车 / Blue 行蓝车）：
       单元按列序出现（先第 1 列全部、再第 2 列…），逐个核对 fill。 */
    const fills = t.diagram.fills;
    chk(Array.isArray(fills) && fills.length === 3, '21Q26 模板应给 3 个 fills');
    const unitGroups = mAll(q.diagramSvg, /<g data-u="unit">([\s\S]*?)<\/g>/g);
    const colOf = k => (k < q.vars.a ? 0 : (k < q.vars.a + q.vars.b ? 1 : 2));
    unitGroups.forEach((m, k) => {
      const fill = (m[1].match(/fill="(#[0-9a-f]{6})"/) || [])[1];
      chk(fill === fills[colOf(k)], '21Q26 第 ' + (k + 1) + ' 辆小车颜色 ' + fill + ' 应为所在行的 ' + fills[colOf(k)]);
    });
    const kf = (mAll(q.diagramSvg, /<g data-u="keyunit">([\s\S]*?)<\/g>/g)[0] || [''])[0].match(/fill="(#[0-9a-f]{6})"/);
    chk(kf && !fills.includes(kf[1]), '21Q26 KEY 示例车 ' + (kf && kf[1]) + ' 不应与任何行同色（避免像第 4 行）');
  }
  console.log('21Q26 数图上小汽车个数 ✓ 读 KEY 的倍数 ✓ 车色=行标签 ✓ 相乘得答案 ✓');
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

/* =====================================================================
   SEAMO 2025 Paper A（seamo25a-q01 … q25）
   全部从图上挂的 data-* 重新读一遍，用「另一种算法」算答案（不引用模板公式）。
   ===================================================================== */
const SE = id => byId('seamo25a-' + id);
const ansText = q => (q.type === 'choice' && Array.isArray(q.options)) ? String(q.options[q.correctIndex]) : String(q.display);
const ansNum = q => { const m = String(ansText(q)).match(/-?\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : NaN; };
const UNIQ = a => Array.from(new Set(a));
const SETEQ = (a, b) => a.length === b.length && a.every(x => b.indexOf(x) >= 0);

/* 表针角度：0 = 12 点方向，顺时针为正（strokeWidth 4 = 时针、3 = 分针） */
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };
function handAngle(svg, cx, cy, strokeW) {
  const m = mAll(svg, new RegExp('x1="' + cx + '" y1="' + cy + '" x2="([\\d.]+)" y2="([\\d.]+)" stroke="[^"]+" stroke-width="' + strokeW + '"', 'g'))[0];
  return m ? Math.atan2(+m[1] - cx, -(+m[2] - cy)) : null;
}
function clockOk(svg, cx, cy, h, m, tag) {
  const ah = handAngle(svg, cx, cy, 4), am = handAngle(svg, cx, cy, 3);
  const wantH = (((h % 12) + m / 60) * Math.PI / 6), wantM = (m % 60) * Math.PI / 30;
  chk(ah !== null && angDiff(ah, wantH) < 0.02, tag + ' 时针角度与 ' + h + ':' + m + ' 不符');
  chk(am !== null && angDiff(am, wantM) < 0.02, tag + ' 分针角度与 ' + h + ':' + m + ' 不符');
}

/* ---------- SEAMO Q1：前 3 座屋顶独立验算，末座画「?」 ---------- */
{
  const t = SE('q01');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t), svg = q.diagramSvg;
    const roofs = mAll(svg, /data-u="roof" data-v="([^"]*)"/g).map(m => m[1]);
    const L = mAll(svg, /data-u="cell" data-side="l" data-v="(-?\d+)"/g).map(m => +m[1]);
    const R = mAll(svg, /data-u="cell" data-side="r" data-v="(-?\d+)"/g).map(m => +m[1]);
    chk(roofs.length === 4 && L.length === 4 && R.length === 4, 'SEAMO Q1 图上应有 4 座小房子');
    if (roofs.length === 4 && L.length === 4 && R.length === 4) {
      for (let k = 0; k < 3; k++) {
        chk(+roofs[k] === L[k] * R[k] - 1, 'SEAMO Q1 第 ' + (k + 1) + ' 座屋顶 ' + roofs[k] + ' ≠ ' + L[k] + '×' + R[k] + '−1');
      }
      chk(roofs[3] === '?', 'SEAMO Q1 最后一座屋顶该画「?」，实际「' + roofs[3] + '」');
      chk(ansNum(q) === L[3] * R[3] - 1, 'SEAMO Q1 答案 ' + ansText(q) + ' 应等于图上第 4 座算出的 ' + (L[3] * R[3] - 1));
    }
  }
  console.log('SEAMO Q1  前 3 座屋顶 = 左×右−1 ✓  末座画「?」✓  答案 = 图上算式 ✓');
}

/* ---------- SEAMO Q2：图上线段数逐格 +1，正确选项 = 下一项 ---------- */
{
  const t = SE('q02');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const ns = mAll(q.diagramSvg, /<g data-u="step" data-n="(\d+)">/g).map(m => +m[1]);
    chk(ns.length >= 2, 'SEAMO Q2 图上至少要画 2 个图形');
    chk(ns.every((v, k) => k === 0 || v === ns[k - 1] + 1), 'SEAMO Q2 图上线段数应每次 +1，实际 ' + JSON.stringify(ns));
    chk(/>\?<\/text>/.test(q.diagramSvg), 'SEAMO Q2 图末应画「?」');
    const want = ns[ns.length - 1] + 1;                  // 由图上的递增规律推下一个
    const optN = (q.optionsSvg || []).map(s => +((s.match(/data-n="(\d+)"/) || [])[1]));
    chk(UNIQ(optN).length === optN.length, 'SEAMO Q2 选项图形线段数有重复：' + JSON.stringify(optN));
    chk(optN.indexOf(want) >= 0, 'SEAMO Q2 选项里没有 ' + want + ' 条线的图形');
    chk(optN[q.correctIndex] === want, 'SEAMO Q2 正确选项是 ' + optN[q.correctIndex] + ' 条线，应由图上规律推出 ' + want + ' 条');
  }
  console.log('SEAMO Q2  图上线段数逐格 +1 ✓  正确选项 = 图上规律的下一项 ✓');
}

/* ---------- SEAMO Q3：逐页拼出 1..N 再数位数 ---------- */
{
  const t = SE('q03');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t), N = q.vars.N;
    let pages = '';
    for (let k = 1; k <= N; k++) pages += k;
    chk(ansNum(q) === pages.length, 'SEAMO Q3 页码 1..' + N + ' 共 ' + pages.length + ' 个数字，答案却是 ' + ansText(q));
  }
  console.log('SEAMO Q3  逐页拼出 1..N 数位数 ✓');
}

/* ---------- SEAMO Q4：9 个连续整数逐项相加 ---------- */
{
  const t = SE('q04');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t), a = q.vars.a;
    let s = 0; for (let k = 0; k < 9; k++) s += a + k;
    chk(ansNum(q) === s, 'SEAMO Q4 ' + a + '…' + (a + 8) + ' 之和应为 ' + s + '，答案 ' + ansText(q));
  }
  console.log('SEAMO Q4  9 个连续整数逐项相加 ✓');
}

/* ---------- SEAMO Q5：图上标出的距离 ÷ 题干里的速度 ---------- */
{
  const t = SE('q05');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t), v = q.vars.v, k = q.vars.k;
    const d = +(mAll(q.diagramSvg, /data-u="dist" data-v="(\d+)"/g)[0] || [])[1];
    chk(d === v * k, 'SEAMO Q5 图上标的距离 ' + d + ' 应 = 速度×时间 ' + v + '×' + k);
    chk(q.stemText.indexOf(String(v)) >= 0, 'SEAMO Q5 题干里应出现速度 ' + v);
    chk(ansNum(q) === d / v, 'SEAMO Q5 答案应为 ' + (d / v) + ' 分钟，实际 ' + ansText(q));
    chk(d > 0 && String(d).length >= 3, 'SEAMO Q5 距离 ' + d + ' 太小，不像「家离奶奶家」的距离');
  }
  console.log('SEAMO Q5  图上距离 ÷ 题干速度 = 答案 ✓');
}

/* ---------- SEAMO Q6：图上只画前 k 行，答案必须超出去 ---------- */
{
  const t = SE('q06');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t), k = q.vars.k, e = q.vars.e;
    const drawn = mAll(q.diagramSvg, /data-u="num" data-v="(\d+)"/g).map(m => +m[1]);
    chk(drawn.length === k * (k + 1) / 2, 'SEAMO Q6 图上应画 ' + k + ' 行共 ' + (k * (k + 1) / 2) + ' 个数，实际 ' + drawn.length);
    chk(drawn.every((v, idx) => v === idx + 1), 'SEAMO Q6 图上数字应是 1 开始的连续整数');
    const n = k + e, T = n * (n + 1) / 2;
    chk(ansNum(q) === T, 'SEAMO Q6 第 ' + n + ' 行末位应为 ' + T);
    chk(T > drawn.length, 'SEAMO Q6 答案必须超出图上画出的范围（否则等于把答案画出来了）');
  }
  console.log('SEAMO Q6  图上只画前 k 行 ✓  答案 = 第 n 行末位（超出图外）✓');
}

/* ---------- SEAMO Q7：两种分法解出孩子数，再算糖数 ---------- */
{
  const t = SE('q07');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t), p = q.vars.p, r = q.vars.r, s = q.vars.s;
    const c = r + s;                                      // 两次相差 r+s 颗 = 每个孩子多 1 颗 → 孩子数
    chk(p * c + r === (p + 1) * c - s, 'SEAMO Q7 盈亏关系不成立：' + p + '×' + c + '+' + r + ' vs ' + (p + 1) + '×' + c + '−' + s);
    chk(ansNum(q) === p * c + r, 'SEAMO Q7 糖数应为 ' + (p * c + r) + '，答案 ' + ansText(q));
  }
  console.log('SEAMO Q7  两种分法数量相等解出孩子数 → 糖数 ✓');
}

/* ---------- SEAMO Q8：鸡兔同笼，腿数独立验算 ---------- */
{
  const t = SE('q08');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t), A = q.vars.A, R = q.vars.R;
    chk(2 * (A - R) + 4 * R === 2 * A + 2 * R, 'SEAMO Q8 腿数对不上');
    chk(ansNum(q) === R, 'SEAMO Q8 兔子应为 ' + R + ' 只，答案 ' + ansText(q));
    chk(q.stemText.indexOf(String(2 * A + 2 * R)) >= 0, 'SEAMO Q8 题干里应出现总腿数 ' + (2 * A + 2 * R));
    chk(R > 0 && R < A, 'SEAMO Q8 兔子数 ' + R + ' 不合理（应 0 < R < ' + A + '）');
  }
  console.log('SEAMO Q8  腿数 2(A−R)+4R ✓  题干含总腿数 ✓');
}
/* ---------- SEAMO Q9：按图上圆圈与箭头倒推（再从答案正向复核一遍） ---------- */
{
  const t = SE('q09');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t), svg = q.diagramSvg;
    const nodes = mAll(svg, /data-u="node" data-i="(\d+)" data-v="([^"]*)"/g);
    const ops = mAll(svg, /data-u="op" data-sym="([^"]*)" data-v="(\d+)"/g).map(m => [m[1], +m[2]]);
    chk(nodes.length === ops.length + 1, 'SEAMO Q9 圆圈数应比运算数多 1');
    chk(ops.length === 4, 'SEAMO Q9 图上应有 4 个运算，实际 ' + ops.length);
    chk(nodes[0] && nodes[0][2] === '?', 'SEAMO Q9 第 1 个圆圈该画「?」');
    const final = +nodes[nodes.length - 1][2];
    chk(Number.isInteger(final), 'SEAMO Q9 图末圆圈里应是整数，实际「' + nodes[nodes.length - 1][2] + '」');
    let x = final, ok = true;
    for (let k = ops.length - 1; k >= 0; k--) {
      const sym = ops[k][0], v = ops[k][1];
      x = sym === '+' ? x - v : sym === '×' ? x / v : sym === '−' ? x + v : sym === '÷' ? x * v : NaN;
      if (!Number.isInteger(x)) ok = false;
    }
    chk(ok, 'SEAMO Q9 倒推过程中出现除不尽/非整数：' + JSON.stringify(ops));
    chk(x === ansNum(q), 'SEAMO Q9 从图末 ' + final + ' 倒推应得 ' + x + '，答案 ' + ansText(q));
    let y = ansNum(q);
    for (let k = 0; k < ops.length; k++) {
      const sym = ops[k][0], v = ops[k][1];
      y = sym === '+' ? y + v : sym === '×' ? y * v : sym === '−' ? y - v : y / v;
    }
    chk(y === final, 'SEAMO Q9 正向走一遍得 ' + y + '，图上写的是 ' + final);
    chk(ansText(q) !== nodes[0][2], 'SEAMO Q9 选项里等于「?」');
  }
  console.log('SEAMO Q9  按图上圆圈/箭头倒推 ✓ 正向复核回到图末的数 ✓ 首圈画「?」✓');
}

/* ---------- SEAMO Q10：从圆盘阵还原「每行 1/2/3 格、逐行顺时针挪 1 格」 ---------- */
{
  const t = SE('q10');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t), svg = q.diagramSvg;
    const cells = mAll(svg, /data-u="disc" data-r="(\d+)" data-c="(\d+)" data-start="(\d+)" data-count="(\d+)"/g)
      .map(m => ({ r: +m[1], c: +m[2], start: +m[3], count: +m[4], greens: 0 }));
    const blank = mAll(svg, /data-u="blank" data-r="(\d+)" data-c="(\d+)"/g).map(m => [+m[1], +m[2]]);
    chk(cells.length === 8 && blank.length === 1, 'SEAMO Q10 应是 3×3 盘面缺一格，实际 ' + cells.length + ' 盘 + ' + blank.length + ' 空格');
    chk(blank[0] && blank[0][0] === 2 && blank[0][1] === 2, 'SEAMO Q10 缺的应是第 3 行第 3 格');
    const base = (cells.find(c => c.r === 0 && c.c === 0) || {}).start;
    chk(base >= 1, 'SEAMO Q10 读不出盘阵的起始钟点');
    cells.forEach(c => {
      chk(c.count === c.c + 1, 'SEAMO Q10 第 ' + (c.r + 1) + ' 行第 ' + (c.c + 1) + ' 格阴影数应是 ' + (c.c + 1) + '，图上 ' + c.count);
      chk(c.start === ((base + c.r - 1) % 12) + 1, 'SEAMO Q10 ' + (c.r + 1) + '行' + (c.c + 1) + '格起点应是 ' + (((base + c.r - 1) % 12) + 1) + ' 点，图上 ' + c.start);
    });
    /* 阴影格真的涂了对应扇数（直接数绿色扇形；缺格那个绿底方块也占 1 次） */
    const greenAll = (svg.match(/fill="#6cbf72"/g) || []).length;
    const wantGreen = cells.reduce((s, c) => s + c.count, 0) + blank.length;
    chk(greenAll === wantGreen, 'SEAMO Q10 图上绿色扇区应有 ' + wantGreen + ' 个，实际 ' + greenAll);
    const wantStart = ((base + 2 - 1) % 12) + 1;
    const opt = q.optionsSvg[q.correctIndex] || '';
    const om = opt.match(/data-u="disc" data-start="(-?\d+)" data-count="(\d+)"/) || [];
    chk(+om[1] === wantStart && +om[2] === 3, 'SEAMO Q10 正确选项应是「从 ' + wantStart + ' 点起涂 3 格」，实际 ' + om[1] + ' 点 / ' + om[2] + ' 格');
    chk((opt.match(/fill="#6cbf72"/g) || []).length === 3, 'SEAMO Q10 正确选项的圆盘没涂够 3 个扇形');
    const pairs = UNIQ((q.optionsSvg || []).map(s => {
      const m = s.match(/data-start="(-?\d+)" data-count="(\d+)"/) || [];
      return m[1] + '/' + m[2];
    }));
    chk(pairs.length === 5, 'SEAMO Q10 选项圆盘里有重复：' + JSON.stringify(pairs));
  }
  console.log('SEAMO Q10  阴影数按列递增、起点逐行顺时针挪 1 ✓  绿色扇区逐格数过 ✓  正确选项 = 缺格的起点/格数 ✓');
}

/* ---------- SEAMO Q11：两个钟面独立读数（表针角度 = 标注），差 = 答案 ---------- */
{
  const t = SE('q11');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t), svg = q.diagramSvg;
    const cl = mAll(svg, /data-u="clock" data-h="(\d+)" data-m="(\d+)"/g).map(m => [+m[1], +m[2]]);
    chk(cl.length === 2, 'SEAMO Q11 应有两个钟面，实际 ' + cl.length);
    clockOk(svg, 100, 88, cl[0][0], cl[0][1], 'SEAMO Q11 左钟');
    clockOk(svg, 300, 88, cl[1][0], cl[1][1], 'SEAMO Q11 右钟');
    const diff = (cl[1][0] * 60 + cl[1][1]) - (cl[0][0] * 60 + cl[0][1]);
    chk(diff > 0, 'SEAMO Q11 右钟应晚于左钟');
    const txt = Math.floor(diff / 60) + 'h ' + (diff % 60) + ' min';
    chk(ansText(q) === txt, 'SEAMO Q11 两钟面独立算得「' + txt + '」，答案却是「' + ansText(q) + '」');
    chk(UNIQ(q.options).length === q.options.length, 'SEAMO Q11 选项有重复：' + JSON.stringify(q.options));
  }
  console.log('SEAMO Q11  表针角度 = 钟面标注 ✓  右钟−左钟 = 答案 ✓');
}

/* ---------- SEAMO Q12：倍数与一半，直接照题意算 ---------- */
{
  const t = SE('q12');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t), y = q.vars.y, x = 2 * y;
    chk(q.stemText.indexOf(String(x)) >= 0, 'SEAMO Q12 题干里应出现 Adeline 的钱数 ' + x);
    chk(ansNum(q) === x + 2 * x + y, 'SEAMO Q12 三人合计应为 ' + (x + 2 * x + y) + '，答案 ' + ansText(q));
    chk(ansText(q).indexOf('$') >= 0, 'SEAMO Q12 答案应带 $ 符号，实际「' + ansText(q) + '」');
  }
  console.log('SEAMO Q12  题干钱数 → ×2 / ÷2 → 三人合计 ✓  答案带 $ ✓');
}

/* ---------- SEAMO Q13：直接从题干算式逐项求和（不套公式） ---------- */
{
  const t = SE('q13');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const toks = q.stemText.match(/\d+|[+\u2212-]/g) || [];
    chk(toks.length >= 7, 'SEAMO Q13 题干算式解析失败：' + q.stemText);
    let sum = +toks[0];
    for (let k = 1; k + 1 < toks.length; k += 2) sum += (toks[k] === '+' ? 1 : -1) * (+toks[k + 1]);
    chk(ansNum(q) === sum, 'SEAMO Q13 照题干逐项算得 ' + sum + '，答案 ' + ansText(q));
  }
  console.log('SEAMO Q13  从题干算式逐项求和 ✓');
}

/* ---------- SEAMO Q14：从题干读出「2 月 1 日星期几 / 2 月几天」，照周历表推 ---------- */
{
  const t = SE('q14');
  const AB = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const ZH = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const dow = mAll(q.diagramSvg, /data-u="dow" data-d="([^"]+)"/g).map(m => m[1]);
    chk(dow.join(',') === AB.join(','), 'SEAMO Q14 表头应是 Sun..Sat，实际 ' + JSON.stringify(dow));
    chk(q.options.length === 7, 'SEAMO Q14 选项应是完整的一周 7 天，实际 ' + q.options.length + ' 个');
    const mD = q.stemText.match(/(\d+)\s*days in February/) || q.stemText.match(/2\s*月有\s*(\d+)\s*天/);
    const mN = q.stemText.match(/fell on an?\s+([A-Z][a-z]+day)/) || q.stemText.match(/2\s*月\s*1\s*日是\s*([A-Za-z]+day|星期[一二三四五六日])/);
    chk(!!mD && !!mN, 'SEAMO Q14 题干里读不出「2 月有几天 / 2 月 1 日星期几」：' + q.stemText);
    if (!mD || !mN) continue;
    const D = +mD[1];
    let w = EN.indexOf(mN[1]);
    if (w < 0) w = ZH.indexOf(mN[1]);
    chk(w >= 0, 'SEAMO Q14 认不出星期名「' + mN[1] + '」');
    chk(D === 28 || D === 29 || D === 30 || D === 31, 'SEAMO Q14 2 月天数不合理：' + D);
    const idx = (w + D) % 7;                             // 3 月 1 日 = 2 月 1 日往后 D 天
    const want = q.lang === 'en' ? EN[idx] : ZH[idx];
    chk(ansText(q) === want, 'SEAMO Q14 从题干独立推出 3 月 1 日是 ' + want + '，答案却是「' + ansText(q) + '」');
    chk(q.solutionText.indexOf(q.lang === 'en' ? EN[w] : ZH[w]) >= 0, 'SEAMO Q14 解析里应提到 2 月 1 日的星期名');
  }
  console.log('SEAMO Q14  题干 → 2/1 星期 + 2 月天数 → 3/1 星期 ✓  表头 Sun..Sat ✓  选项 = 完整一周 ✓');
}

/* ---------- SEAMO Q15：从图上解出 base/step，再按缺格的几何位置补数 ---------- */
{
  const t = SE('q15');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t), svg = q.diagramSvg;
    const cells = mAll(svg, /data-u="cell" data-r="(\d+)" data-c="(\d+)" data-v="(-?\d+)" x="([\d.]+)" y="([\d.]+)"/g)
      .map(m => ({ r: +m[1], c: +m[2], v: +m[3], x: +m[4], y: +m[5] }));
    chk(cells.length === 8, 'SEAMO Q15 应画出 8 个数字（缺 1 格），实际 ' + cells.length);
    /* 先用两个格子解出「每右一格/下一格加多少」 */
    const a = cells.reduce((m, x) => (x.r + x.c < m.r + m.c ? x : m), cells[0]);
    const b = cells.filter(x => x.r + x.c > a.r + a.c)[0];
    const steps = (b.v - a.v) / ((b.r + b.c) - (a.r + a.c));
    const base = a.v - (a.r + a.c) * steps;
    chk(Number.isInteger(steps) && steps > 0, 'SEAMO Q15 从图上读出的公差不对：' + steps);
    chk(cells.every(x => x.v === base + (x.r + x.c) * steps), 'SEAMO Q15 图上的数不是等差：' + JSON.stringify(cells.map(x => x.v)));
    /* 缺的那格：用格子中心坐标反推行列（不读变量） */
    const x0 = cells.find(x => x.r === 0 && x.c === 0).x, x1 = cells.find(x => x.r === 0 && x.c === 1).x;
    const y0 = cells.find(x => x.r === 0 && x.c === 0).y, y1 = cells.find(x => x.r === 1 && x.c === 0).y;
    const cw = x1 - x0, ch = y1 - y0, padx = x0 - cw / 2, pady = y0 - ch / 2 - 9;
    const bm = svg.match(/<rect x="([\d.]+)" y="([\d.]+)" width="\d+" height="\d+" fill="#ffe9a8"/);
    chk(!!bm, 'SEAMO Q15 图上找不到缺的那一格');
    if (!bm) continue;
    const mc = Math.round((+bm[1] - padx) / cw), mr = Math.round((+bm[2] - pady) / ch);
    chk(mr >= 0 && mr < 3 && mc >= 0 && mc < 3, 'SEAMO Q15 缺格位置反推失败 r=' + mr + ' c=' + mc);
    const T = base + (mr + mc) * steps;
    chk(ansNum(q) === T, 'SEAMO Q15 按图上规律补出的数应是 ' + T + '（缺 ' + mr + '行' + mc + '列），答案 ' + ansText(q));
  }
  console.log('SEAMO Q15  图上解出公差 + 缺格几何位置 → 补数 ✓');
}

/* ---------- SEAMO Q16：三架天平逐级代换，独立算出葡萄质量 ---------- */
{
  const t = SE('q16');
  const cnt = s => { const o = {}; String(s).split('+').filter(Boolean).forEach(p => { const a = p.split(':'); o[a[0]] = +a[1]; }); return o; };
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const bs = mAll(q.diagramSvg, /data-u="balance" data-arm="\d+" data-side-l="([^"]*)" data-side-r="([^"]*)" data-w="([^"]*)"/g)
      .map(m => ({ l: cnt(m[1]), r: cnt(m[2]), w: m[3] }));
    chk(bs.length === 3, 'SEAMO Q16 应画三架天平，实际 ' + bs.length);
    if (bs.length !== 3) continue;
    const b0 = bs[0], b1 = bs[1], b2 = bs.find(x => x.w);
    chk(!!b2 && b2.w !== '' && b2.r.weight === 1, 'SEAMO Q16 带砝码的那架天平读数缺失');
    const grapes = b0.l.grape, bananas = b0.r.banana;
    const nb = b1.r.apple, na = b2.l.apple, W = +b2.w;
    chk(grapes === 1 && b1.l.banana === 1, 'SEAMO Q16 三架天平应能逐级代换');
    chk(W % na === 0, 'SEAMO Q16 ' + W + ' g 没法均分成 ' + na + ' 个苹果');
    const apple = W / na, banana = nb * apple, grape = bananas * banana;
    chk(ansNum(q) === grape, 'SEAMO Q16 独立代换得葡萄 ' + bananas + ' 根香蕉 × ' + banana + ' g = ' + grape + ' g，答案 ' + ansText(q));
    chk(UNIQ(q.options).length === q.options.length, 'SEAMO Q16 选项有重复');
  }
  console.log('SEAMO Q16  苹果←砝码、香蕉←苹果、葡萄←香蕉 逐级代换 ✓');
}
/* ---------- 几何枚举三角形（Q20 用）：只认图上画出的线段，不套模板公式 ---------- */
function triGeoCount(lines) {
  const K = p => Math.round(p[0] * 1e6) + ',' + Math.round(p[1] * 1e6);
  const EPS = 1e-9;
  const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const inter = (p1, p2, p3, p4) => {
    const d = cross(sub(p2, p1), sub(p4, p3));
    if (Math.abs(d) < EPS) return null;
    const w = sub(p3, p1);
    const t = cross(w, sub(p4, p3)) / d, u = cross(w, sub(p2, p1)) / d;
    if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;
    return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
  };
  const nodes = [];
  const addNode = p => { if (!nodes.some(q => K(q) === K(p))) nodes.push(p); };
  lines.forEach(L => { addNode(L[0]); addNode(L[1]); });
  for (let a = 0; a < lines.length; a++) for (let b = a + 1; b < lines.length; b++) {
    const x = inter(lines[a][0], lines[a][1], lines[b][0], lines[b][1]);
    if (x) addNode(x);
  }
  /* 候选边 = 同一条画出的线段上任意两个交点之间的部分（三角形的一条边可以跨多个交点） */
  const cand = [];
  lines.forEach(L => {
    const d = sub(L[1], L[0]), len2 = d[0] * d[0] + d[1] * d[1];
    const on = nodes.filter(n => {
      if (K(n) === K(L[0]) || K(n) === K(L[1])) return true;
      if (Math.abs(cross(d, sub(n, L[0]))) > 1e-9) return false;
      const pr = (n[0] - L[0][0]) * d[0] + (n[1] - L[0][1]) * d[1];
      return pr > -1e-9 && pr < len2 + 1e-9;
    });
    for (let i = 0; i < on.length; i++) for (let k = i + 1; k < on.length; k++) cand.push([on[i], on[k]]);
  });
  const found = new Set();
  for (let i = 0; i < cand.length; i++) for (let k = i + 1; k < cand.length; k++) {
    const v = inter(cand[i][0], cand[i][1], cand[k][0], cand[k][1]);
    if (!v) continue;
    for (let m = k + 1; m < cand.length; m++) {
      const v2 = inter(cand[i][0], cand[i][1], cand[m][0], cand[m][1]);
      const v3 = inter(cand[k][0], cand[k][1], cand[m][0], cand[m][1]);
      if (!v2 || !v3) continue;
      const ks = [K(v), K(v2), K(v3)];
      if (ks[0] === ks[1] || ks[1] === ks[2] || ks[0] === ks[2]) continue;
      found.add(ks.slice().sort().join('|'));
    }
  }
  return found.size;
}

/* ---------- SEAMO Q17：从图上的格线重建格点图，DP 重算最短路条数 ---------- */
{
  const t = SE('q17');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t), svg = q.diagramSvg;
    const n = +((svg.match(/data-u="grid" data-n="(\d+)"/) || [])[1]);
    const edges = new Set();
    mAll(svg, /data-u="edge" data-x1="(-?\d+)" data-y1="(-?\d+)" data-x2="(-?\d+)" data-y2="(-?\d+)"/g).forEach(m => {
      edges.add(m[1] + ',' + m[2] + '|' + m[3] + ',' + m[4]);
      edges.add(m[3] + ',' + m[4] + '|' + m[1] + ',' + m[2]);
    });
    const A = mAll(svg, /data-u="pt" data-name="A" data-x="(-?\d+)" data-y="(-?\d+)"/g)[0];
    const B = mAll(svg, /data-u="pt" data-name="B" data-x="(-?\d+)" data-y="(-?\d+)"/g)[0];
    chk(!!A && !!B, 'SEAMO Q17 图上应标出 A、B 两点');
    if (!A || !B) continue;
    const ax = +A[1], ay = +A[2], bx = +B[1], by = +B[2];
    const memo = {};
    const P = (x, y) => {
      if (x === ax && y === ay) return 1;
      const key = x + ',' + y;
      if (key in memo) return memo[key];
      let v = 0;
      if (x > ax && edges.has((x - 1) + ',' + y + '|' + x + ',' + y)) v += P(x - 1, y);
      if (y > ay && edges.has(x + ',' + (y - 1) + '|' + x + ',' + y)) v += P(x, y - 1);
      return (memo[key] = v);
    };
    const cnt = P(bx, by);
    chk(n === q.vars.n, 'SEAMO Q17 图上台阶级数 ' + n + ' 与题干 ' + q.vars.n + ' 不一致');
    let squares = 0;
    for (let x = 0; x <= n + 1; x++) for (let y = 0; y <= n; y++) {
      if (edges.has(x + ',' + y + '|' + (x + 1) + ',' + y) && edges.has(x + ',' + (y + 1) + '|' + (x + 1) + ',' + (y + 1)) &&
          edges.has(x + ',' + y + '|' + x + ',' + (y + 1)) && edges.has((x + 1) + ',' + y + '|' + (x + 1) + ',' + (y + 1))) squares++;
    }
    chk(squares === 2 * n, 'SEAMO Q17 台阶应由 ' + (2 * n) + ' 个小方格拼成，实际 ' + squares);
    chk(cnt === ansNum(q), 'SEAMO Q17 从图上格线独立数得 ' + cnt + ' 条最短路，答案 ' + ansText(q));
    chk(squares === 2 * n && cnt > 0, 'SEAMO Q17 图形或路径计数异常');
  }
  console.log('SEAMO Q17  从图上格线重建 + DP 重算最短路 ✓（并核对 2n 个小方格）');
}

/* ---------- SEAMO Q18：从图上 3 行示范独立找出规律，再算第 4 行 ---------- */
{
  const t = SE('q18');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t), svg = q.diagramSvg;
    const rows = mAll(svg, /data-u="srow" data-r="(\d+)" data-terms="([^"]*)" data-rhs="([^"]*)"/g)
      .map(m => ({ terms: m[2], rhs: m[3] }));
    chk(rows.length === 4, 'SEAMO Q18 应有 4 行（3 行示范 + 1 行提问），实际 ' + rows.length);
    if (rows.length !== 4) continue;
    const parse = s => { const m = s.match(/^(\d+)\D+(\d+)$/); return m ? [+m[1], +m[2]] : null; };
    for (let k = 0; k < 3; k++) {
      const ab = parse(rows[k].terms);
      chk(!!ab, 'SEAMO Q18 第 ' + (k + 1) + ' 行读不出「a⊗b」：' + rows[k].terms);
      if (!ab) continue;
      chk(+rows[k].rhs === ab[1] * (ab[0] + 1), 'SEAMO Q18 第 ' + (k + 1) + ' 行 ' + ab[0] + '⊗' + ab[1] + '=' + rows[k].rhs + ' 不符合 b×(a+1)');
    }
    const last = parse(rows[3].terms);
    chk(rows[3].rhs === '?', 'SEAMO Q18 第 4 行右边该画「?」，实际「' + rows[3].rhs + '」');
    chk(!!last, 'SEAMO Q18 第 4 行读不出「a⊗b」');
    if (last) chk(ansNum(q) === last[1] * (last[0] + 1), 'SEAMO Q18 按图上规律应得 ' + (last[1] * (last[0] + 1)) + '，答案 ' + ansText(q));
  }
  console.log('SEAMO Q18  3 行示范独立验出 a⊗b = b×(a+1) ✓ 第 4 行画「?」✓ 答案按规律算出 ✓');
}

/* ---------- SEAMO Q19：逐行验「第 3 格 = 前两格线段并集」，缺格 = 最后一行并集 ---------- */
{
  const t = SE('q19');
  const SEG = s => String(s || '').split(';').filter(Boolean).sort();
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t), svg = q.diagramSvg;
    const cells = {};
    mAll(svg, /data-u="fig" data-r="(\d+)" data-c="(\d+)" data-segs="([^"]*)"/g).forEach(m => { cells[m[1] + ',' + m[2]] = SEG(m[3]); });
    const blank = mAll(svg, /data-u="blank" data-r="(\d+)" data-c="(\d+)"/g).map(m => m[1] + ',' + m[2]);
    chk(blank.length === 1 && blank[0] === '2,2', 'SEAMO Q19 缺的应是第 3 行第 3 格，实际 ' + JSON.stringify(blank));
    const uni = (a, b) => UNIQ(a.concat(b)).sort();
    for (let r = 0; r < 3; r++) {
      const c0 = cells[r + ',0'], c1 = cells[r + ',1'], c2 = cells[r + ',2'];
      chk(!!c0 && !!c1 && c0.length > 0 && c1.length > 0, 'SEAMO Q19 第 ' + (r + 1) + ' 行前两格没画出线段');
      if (!c0 || !c1) continue;
      chk(c0.filter(x => c1.indexOf(x) >= 0).length > 0, 'SEAMO Q19 第 ' + (r + 1) + ' 行两图没有公共线段（叠加/异或分不清）');
      if (c2) chk(SETEQ(c2, uni(c0, c1)), 'SEAMO Q19 第 ' + (r + 1) + ' 行第 3 格不是前两格的线段并集');
    }
    const want = uni(cells['2,0'] || [], cells['2,1'] || []);
    const opt = (q.optionsSvg || []).map(s => SEG((s.match(/data-segs="([^"]*)"/) || [])[1]));
    chk(opt.every(o => o.length > 0), 'SEAMO Q19 有选项没画出线段');
    chk(SETEQ(opt[q.correctIndex], want), 'SEAMO Q19 正确选项不是第 3 行前两格的并集');
    chk(UNIQ(opt.map(o => o.join(';'))).length === opt.length, 'SEAMO Q19 选项图形有重复（等于两个正确答案）');
  }
  console.log('SEAMO Q19  逐行验「第 3 格 = 前两格并集」✓ 缺格 = 最后一行并集 ✓ 选项互不相同 ✓');
}

/* ---------- SEAMO Q20：按图上线段做几何枚举，重数一遍三角形 ---------- */
{
  const t = SE('q20');
  const memo = {};
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t), svg = q.diagramSvg;
    const tm = svg.match(/data-u="tri" data-j="(\d+)" data-extra="(\d+)"/) || [];
    const j = +tm[1], ex = +tm[2];
    chk(j === q.vars.j, 'SEAMO Q20 图上引线数 ' + j + ' 与题干 ' + q.vars.j + ' 不一致');
    chk(ex === 1, 'SEAMO Q20 原卷那条额外斜线必须在图上（extra=' + ex + '）');
    const kinds = mAll(svg, /data-u="line" data-kind="(\w+)"/g).map(m => m[1]);
    chk(kinds.filter(k => k === 'side').length === 3, 'SEAMO Q20 三角形应有 3 条边');
    chk(kinds.filter(k => k === 'div').length === j, 'SEAMO Q20 应有 ' + j + ' 条分割线，实际 ' + kinds.filter(k => k === 'div').length);
    chk(kinds.filter(k => k === 'extra').length === 1, 'SEAMO Q20 应有 1 条额外斜线');
    const key = kinds.join(',');
    if (!memo[key]) {
      const lines = mAll(svg, /data-u="line" data-kind="\w+" data-x1="([\d.]+)" data-y1="([\d.]+)" data-x2="([\d.]+)" data-y2="([\d.]+)"/g)
        .map(m => [[+m[1], +m[2]], [+m[3], +m[4]]]);
      memo[key] = triGeoCount(lines);
    }
    chk(memo[key] === ansNum(q), 'SEAMO Q20 按图上线段几何枚举得 ' + memo[key] + ' 个三角形，答案 ' + ansText(q));
    chk(memo[key] === (j + 1) * (j + 3), 'SEAMO Q20 几何枚举 ' + memo[key] + ' ≠ (j+1)(j+3) = ' + ((j + 1) * (j + 3)));
  }
  console.log('SEAMO Q20  按图上线段几何枚举（三条边两两相交成三顶点）✓ 与答案一致 ✓');
}
/* ---------- SEAMO Q21：楼梯走法递推（1 级或 2 级） ---------- */
{
  const t = SE('q21');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t), n = q.vars.n;
    const f = [0, 1, 2];
    for (let k = 3; k <= n; k++) f[k] = f[k - 1] + f[k - 2];
    chk(ansNum(q) === f[n], 'SEAMO Q21 上 ' + n + ' 级有 ' + f[n] + ' 种走法，答案 ' + ansText(q));
    chk(f[n] === f[n - 1] + f[n - 2], 'SEAMO Q21 递推关系不成立');
  }
  console.log('SEAMO Q21  递推 f(k)=f(k−1)+f(k−2) 独立算一遍 ✓');
}

/* ---------- SEAMO Q22：三个钟面读数 + 标注，间隔每次多 10 分钟，推第 4 个钟 ---------- */
{
  const t = SE('q22');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t), svg = q.diagramSvg;
    const cl = mAll(svg, /data-u="clock" data-h="(\d+)" data-m="(\d+)"/g).map(m => [+m[1], +m[2]]);
    const labels = mAll(svg, /data-u="clabel" data-t="([^"]*)"/g).map(m => m[1]);
    chk(cl.length === 3 && labels.length === 3, 'SEAMO Q22 应画出前三个钟面 + 标注，实际 ' + cl.length + '/' + labels.length);
    chk(/data-u="blank"/.test(svg), 'SEAMO Q22 第 4 个钟应画成「?」');
    if (cl.length !== 3) continue;
    for (let k = 0; k < 3; k++) {
      clockOk(svg, 14 + 44 + k * 116, 84, cl[k][0], cl[k][1], 'SEAMO Q22 第 ' + (k + 1) + ' 个钟');
      const h12 = ((cl[k][0] + 11) % 12) + 1, m2 = cl[k][1] < 10 ? '0' + cl[k][1] : String(cl[k][1]);
      chk(labels[k] === h12 + ':' + m2 + ' PM', 'SEAMO Q22 第 ' + (k + 1) + ' 个钟标注「' + labels[k] + '」与钟面 ' + cl[k][0] + ':' + cl[k][1] + ' 不符');
    }
    const mins = cl.map(c => c[0] * 60 + c[1]);
    const g1 = mins[1] - mins[0], g2 = mins[2] - mins[1];
    chk(g1 > 0 && g2 > 0, 'SEAMO Q22 钟面时刻应递增');
    chk(g2 - g1 === 10, 'SEAMO Q22 图上间隔应每次多 10 分钟：' + g1 + ' / ' + g2);
    const t4 = mins[2] + g2 + 10;
    const h12 = ((Math.floor(t4 / 60) + 11) % 12) + 1, mm = t4 % 60;
    const txt = h12 + ':' + (mm < 10 ? '0' + mm : mm) + ' PM';
    chk(ansText(q) === txt, 'SEAMO Q22 按图上规律推出第 4 个钟是 ' + txt + '，答案 ' + ansText(q));
  }
  console.log('SEAMO Q22  钟面读数 = 标注 ✓ 间隔每次多 10 分钟 ✓ 第 4 个钟 = 答案 ✓');
}

/* ---------- SEAMO Q23：从题干数列独立找规律（平方数） ---------- */
{
  const t = SE('q23');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t);
    const seq = (q.stemText.match(/\d+/g) || []).map(Number);
    chk(seq.length >= 10, 'SEAMO Q23 题干里应列出至少 10 个数：' + q.stemText);
    if (seq.length < 10) continue;
    const ten = seq.slice(0, 10);
    const roots = ten.map(v => Math.round(Math.sqrt(v)));
    chk(roots.every((r, k) => r * r === ten[k]), 'SEAMO Q23 题干里的数不都是平方数：' + JSON.stringify(ten));
    chk(roots.every((r, k) => k === 0 || r === roots[k - 1] + 1), 'SEAMO Q23 题干里的平方数底数不连续：' + JSON.stringify(roots));
    const nxt = (roots[9] + 1) * (roots[9] + 1);
    chk(ansNum(q) === nxt, 'SEAMO Q23 下一项应是 ' + nxt + '，答案 ' + ansText(q));
  }
  console.log('SEAMO Q23  题干数列逐项开平方验连续 ✓ 下一项 = 下一个平方数 ✓');
}

/* ---------- SEAMO Q24：抽屉原理「最不利情况 + 1」 ---------- */
{
  const t = SE('q24');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t), v = q.vars;
    const cs = [v.c1, v.c2, v.c3, v.c4], n = v.n;
    const worst = cs.reduce((s, c) => s + Math.min(c, n - 1), 0);
    chk(Math.max.apply(null, cs) >= n, 'SEAMO Q24 没有任何颜色够 ' + n + ' 个，题目无解');
    chk(worst + 1 <= cs.reduce((a, b) => a + b, 0), 'SEAMO Q24 需要的球数超过袋里总数');
    chk(ansNum(q) === worst + 1, 'SEAMO Q24 最坏情况取 ' + worst + ' 个还不够，再 +1 = ' + (worst + 1) + '，答案 ' + ansText(q));
    chk(q.stemText.indexOf(String(cs[0])) >= 0, 'SEAMO Q24 题干里应出现第一种颜色的个数 ' + cs[0]);
  }
  console.log('SEAMO Q24  最不利原则 Σmin(c,n−1)+1 ✓（并验题目有解）');
}

/* ---------- SEAMO Q25：三式相加独立解出每个符号（问哪个比哪个） ---------- */
{
  const t = SE('q25');
  for (let i = 0; i < REP; i++) {
    const q = Generator.instantiate(t), svg = q.diagramSvg;
    const rows = mAll(svg, /data-u="srow" data-r="(\d+)" data-terms="([^"]*)" data-rhs="([^"]*)"/g)
      .map(m => ({ terms: m[2], rhs: +m[3] }));
    chk(rows.length === 3, 'SEAMO Q25 应有三行等式，实际 ' + rows.length);
    if (rows.length !== 3) continue;
    const syms = UNIQ(rows.map(r => r.terms).join('').split('').filter(c => '+\u2212-='.indexOf(c) < 0));
    chk(syms.length === 3, 'SEAMO Q25 应出现 3 个符号，实际 ' + JSON.stringify(syms));
    const sumAll = rows.reduce((s, r) => s + r.rhs, 0);
    chk(sumAll % 2 === 0, 'SEAMO Q25 三式之和应为偶数（每个符号出现 2 次），实际 ' + sumAll);
    const tot = sumAll / 2;
    const val = {};
    syms.forEach(s => {
      chk(rows.filter(r => r.terms.indexOf(s) >= 0).length === 2, 'SEAMO Q25 符号 ' + s + ' 应在 2 式里出现');
      const without = rows.filter(r => r.terms.indexOf(s) < 0);
      chk(without.length === 1, 'SEAMO Q25 符号 ' + s + ' 应恰好缺席 1 式');
      val[s] = without.length === 1 ? tot - without[0].rhs : NaN;
      chk(Number.isInteger(val[s]) && val[s] > 0, 'SEAMO Q25 符号 ' + s + ' 解出 ' + val[s] + '，不合理');
    });
    chk(UNIQ(syms.map(s => val[s])).length === 3, 'SEAMO Q25 三个符号的值应互不相同：' + JSON.stringify(val));
    const asked = (q.stemText.match(/value of\s*(\S)/) || q.stemText.match(/求\s*(\S)\s*的值/) || [])[1];
    chk(!!asked && val[asked] !== undefined, 'SEAMO Q25 认不出题干问的是哪个符号：' + q.stemText);
    if (asked && val[asked] !== undefined) {
      chk(ansNum(q) === val[asked], 'SEAMO Q25 题干问「' + asked + '」，独立解出 ' + val[asked] + '，答案 ' + ansText(q));
    }
  }
  console.log('SEAMO Q25  三式相加独立解出每个符号 ✓ 答案 = 题干所问符号的值 ✓');
}

/* ---------- SEAMO 配图文字一律用原卷英文（英文卷不许出现中文） ---------- */
{
  const CASES = [
    ['q01', []], ['q02', []], ['q05', ['Cindy', 'Granny']], ['q06', []],
    ['q09', []], ['q10', []], ['q11', []],
    ['q14', ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']],
    ['q15', []], ['q16', []], ['q17', ['A', 'B']], ['q18', []], ['q19', []],
    ['q20', []], ['q22', ['PM']], ['q25', []]
  ];
  CASES.forEach(function (cs) {
    const t = SE(cs[0]);
    for (let i = 0; i < 10; i++) {
      const q = Generator.instantiate(t);
      const svg = (q.diagramSvg || '') + (q.optionsSvg || []).join('');
      chk(!/[\u4e00-\u9fff]/.test(svg), 'SEAMO ' + cs[0] + ' 配图里出现了中文');
      cs[1].forEach(w => chk(svg.indexOf(w) >= 0, 'SEAMO ' + cs[0] + ' 图里应出现「' + w + '」'));
    }
  });
  console.log('SEAMO 配图文字 = 原卷英文 ✓（16 道带图题抽查）');
}
/* ---------- 选项图形两两不同（否则等于有两个正确答案）---------- */
{
  let n = 0;
  ['icas21y2m-02', 'icas21y2m-09', 'icas21y2m-12', 'icas21y2m-14', 'icas21y2m-17', 'icas21y2m-20', 'icas21y2m-21', 'icas21y2m-22',
   'seamo25a-q02', 'seamo25a-q10', 'seamo25a-q19']
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
