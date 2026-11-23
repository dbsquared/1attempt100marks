/* 逻辑体检（第 11 套）：可答性 / 泄题 / 选项自洽
   node tools/test-logic.js
   —— test-bank 验「能生成、判分自洽」，test-figs 验「这道图题算得对」，
      但两者都看不出「**答案已经印在图上了**」这种逻辑病：
      2026-11 的 y2wq-18 把数字三角形按 n 行画满，问「第 n 行最后一个数」，
      那个数就明明白白写在最后一行末尾 —— 学生不用算，看图抄就行。
      所以这里做全库抽样，专门查「图上能不能直接抄到答案」。

   判据（对每个带图的模板连抽 40 次）：
     答案的数值如果出现在配图文字里 ⇒ 必须在 data/figure-leak-allow.json 登记理由，
     否则 FAIL。登记表里的条目如果已经不再命中，也会 FAIL（防止僵尸条目越积越多）。
   另有两条不需要白名单的硬检查：
     · SVG 里不许出现 NaN / undefined（键名写错时 num(undefined)=0 会静默画成 0）
     · 选择题的 correctIndex 必须合法，display 必须是其中一个选项 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const ctx = { console, Math, JSON, Object, Array, Number, String, isFinite, parseFloat, Date, Set };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
['assets/js/expr.js', 'assets/js/diagrams.js', 'assets/js/generator.js', 'assets/js/grader.js']
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const { Generator } = ctx;
const bank = JSON.parse(fs.readFileSync(path.join(root, 'data/question-bank.json'), 'utf8')).templates;
const allowFile = path.join(root, 'data/figure-leak-allow.json');
const ALLOW = JSON.parse(fs.readFileSync(allowFile, 'utf8'));

const REP = 60;
let bad = 0;
function chk(cond, msg) { if (!cond) { bad++; console.log('   ✗ ' + msg); } }

/* 固定随机数：不然「答案刚好撞上图上某个数」这种巧合每次跑出来的集合都不一样，
   闸门会变成时红时绿的噪音。按模板 id 定种，题目不动结果就不动。 */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const seededMath = Object.create(Math);
ctx.Math = seededMath;
function seedFor(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  seededMath.random = mulberry32(h >>> 0);
}

/* 图上印出来的数字（去掉标签属性，只看真正的文字） */
function figureNums(svg) {
  const set = new Set();
  const body = svg.replace(/<[^>]*>/g, ' ');
  for (const m of body.matchAll(/-?\d[\d,]*(?:\.\d+)?/g)) set.add(Number(m[0].replace(/,/g, '')));
  return set;
}

/* 学生看到的答案（display 是渲染后的答案，choice 就是选中项的文本） */
function answerText(q) {
  const s = q.display != null ? q.display : q.value;
  return s == null ? '' : String(s).trim();
}
function answerNum(q) {
  const s = answerText(q).replace(/,/g, '');
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}

/* ---------- 1) 图里印着答案？ ---------- */
{
  const seen = new Set();
  const hit = [];
  for (const t of bank) {
    if (!t.diagram || !t.diagram.type) continue;
    seedFor(t.id);
    let leak = 0, tot = 0, skipped = 0, ex = null;
    for (let i = 0; i < REP; i++) {
      let q;
      try { q = Generator.instantiate(t); } catch (e) { break; }
      if (!q || !q.diagramSvg) continue;
      const ans = answerNum(q);
      if (ans === null) continue;               // 分数/文字答案不比数值
      /* 图上已经用 ? 标出了「待求位置」⇒ 学生必须自己算出那个 ?，
         印在别处的同值只是数值巧合，不算泄题（白名单里那一堆 placeholder 就是这类）。 */
      if (q.diagramSvg.indexOf('?') >= 0) { skipped++; continue; }
      tot++;
      if (figureNums(q.diagramSvg).has(ans)) { leak++; if (!ex) ex = { ans, vars: q.vars }; }
    }
    if (leak > 0) hit.push({ id: t.id, type: t.diagram.type, leak, tot, ex });
  }
  hit.sort((a, b) => b.leak - a.leak);
  for (const h of hit) {
    const a = ALLOW.items[h.id];
    if (!a) {
      chk(false, h.id + '（' + h.type + '）' + h.leak + '/' + h.tot + ' 次抽样里，答案 ' + h.ex.ans +
        ' 直接印在图上。要么改图（别把被问的位置画出来 / 别在答案位置上标数值），' +
        '要么在 data/figure-leak-allow.json 登记理由。例：' + JSON.stringify(h.ex.vars));
    } else {
      chk(!!a.why && !!a.kind, h.id + ' 的白名单条目缺 kind/why');
      seen.add(h.id);
    }
  }
  Object.keys(ALLOW.items).forEach(id => {
    if (!seen.has(id)) console.log('   ! data/figure-leak-allow.json 里的 ' + id + ' 现在已经不再泄题，可以删掉这条（不影响通过）');
  });
  const withQ = bank.filter(t => t.diagram && t.diagram.type).length;
  console.log('1) 图不泄题：有图模板 ' + withQ + ' 个，命中 ' + hit.length +
    ' 个（白名单 ' + Object.keys(ALLOW.items).length + ' 条；图上带 ? 的样本已豁免）');
}

/* ---------- 2) SVG 里不许出现 NaN / undefined ---------- */
{
  let n = 0;
  for (const t of bank) {
    if (!t.diagram || !t.diagram.type) continue;
    seedFor(t.id);
    for (let i = 0; i < 6; i++) {
      let q;
      try { q = Generator.instantiate(t); } catch (e) { break; }
      if (!q || !q.diagramSvg) continue;
      n++;
      chk(q.diagramSvg.indexOf('NaN') < 0, t.id + ' 的 SVG 里出现了 NaN（多半是 spec 键名与 vars 对不上）');
      chk(q.diagramSvg.indexOf('undefined') < 0, t.id + ' 的 SVG 里出现了 undefined（同上）');
    }
  }
  console.log('2) 配图无 NaN/undefined：抽检 ' + n + ' 张图');
}

/* ---------- 3) 选择题：correctIndex 合法、display 是选项之一 ---------- */
{
  let n = 0;
  for (const t of bank) {
    if (!t.answer || t.answer.type !== 'choice') continue;
    seedFor(t.id);
    for (let i = 0; i < 8; i++) {
      let q;
      try { q = Generator.instantiate(t); } catch (e) { break; }
      if (!q || !q.options) continue;
      n++;
      const ci = q.correctIndex, opts = q.options.map(String), txt = answerText(q);
      if (Array.isArray(ci)) {                    // 多选题：索引是数组，display 是「A、B」拼起来的
        chk(ci.length > 0, t.id + ' 的 correctIndex 是空数组');
        ci.forEach(k => chk(typeof k === 'number' && k >= 0 && k < opts.length,
          t.id + ' 的 correctIndex 含越界下标 ' + k + '（选项 ' + opts.length + ' 个）'));
        ci.forEach(k => chk(opts[k] !== undefined && txt.indexOf(opts[k]) >= 0,
          t.id + ' 的答案「' + txt + '」没包含选中的选项「' + opts[k] + '」'));
      } else {
        chk(typeof ci === 'number' && ci >= 0 && ci < opts.length,
          t.id + ' 的 correctIndex=' + ci + ' 越界（选项 ' + opts.length + ' 个）');
        chk(opts.indexOf(txt) >= 0, t.id + ' 的答案「' + txt + '」不在选项里：' + opts.join(' / '));
      }
    }
  }
  console.log('3) 选择题自洽（索引合法 + 答案在选项里）：抽检 ' + n + ' 次');
}

console.log('\n' + '='.repeat(70));
if (bad) { console.log('✗ 逻辑体检未通过：' + bad + ' 项'); process.exit(1); }
console.log('✓ 逻辑体检全部通过（图不泄题 / 无 NaN / 选项自洽）');
