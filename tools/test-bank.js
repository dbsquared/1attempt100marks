/* 题库自检：node tools/test-bank.js  —— 验证每个模板都能生成合法题目且判分正确 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const ctx = { console, Math, JSON, Object, Array, Number, String, isFinite, parseFloat, Date, Set };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
['assets/js/expr.js', 'assets/js/diagrams.js', 'assets/js/generator.js', 'assets/js/grader.js'].forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
});
const { Generator, Grader } = ctx;

/* 题干提到"图"时，模板必须有 image（静态原题图）或 diagram（可变量 SVG），
   否则学生看到的题干会引用一张不存在的图 —— 这正是之前漏掉的一类错误。 */
function refsFigure(tpl) {
  const s = tpl.stem;
  const txt = typeof s === 'string' ? s : (((s && s.zh) || '') + ' ' + ((s && s.en) || ''));
  return /原题图|如下图|图中|下图中|看图|见.{0,4}图/.test(txt) ||
         /original picture|see the (diagram|picture|figure)|diagram below|shown below/i.test(txt);
}
const bankPath = process.argv[2] || path.join(root, 'data/question-bank.json');
const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
const list = Array.isArray(bank) ? bank : bank.templates;

let fail = 0;
console.log('模板数：' + list.length + '\n' + '='.repeat(70));
for (const tpl of list) {
  const qs = [];
  let nullCount = 0;
  for (let i = 0; i < 300; i++) {
    const q = Generator.instantiate(tpl);
    if (!q) { nullCount++; continue; }
    qs.push(q);
  }
  const bad = qs.filter(q => {
    if (q.type === 'choice') return q.correctIndex === undefined || q.correctIndex < 0 || q.options.length < 2;
    if (q.type === 'text') return !q.value;
    if (q.type === 'fraction') return !isFinite(q.value) || q.den === 0;
    return !isFinite(q.value);
  });
  // 判分自检：用正确答案应判对，用错误答案应判错
  let gradeErr = 0;
  qs.slice(0, 60).forEach(q => {
    let correctInput, wrongInput;
    if (q.type === 'choice') {
      correctInput = q.correctIndex;
      wrongInput = (Array.isArray(q.correctIndex) ? [] : [(q.correctIndex + 1) % q.options.length])[0];
      if (Array.isArray(q.correctIndex)) return;
    } else if (q.type === 'fraction') {
      correctInput = q.den === 1 ? String(q.num) : (q.num + '/' + q.den);
      wrongInput = correctInput === '1' ? '2' : '1';
    } else if (q.type === 'text') { correctInput = q.value; wrongInput = 'zzz'; }
    else { correctInput = String(q.value); wrongInput = String(q.value + 7); }
    if (!Grader.grade(q, correctInput).ok) gradeErr++;
    if (/^0$/.test(wrongInput) && /^0$/.test(String(q.value))) return;
    if (Grader.grade(q, wrongInput).ok) gradeErr++;
  });

  const ok = nullCount === 0 && bad.length === 0 && gradeErr === 0;
  if (!ok) fail++;
  // 渲染冒烟：题干/解析的 HTML 里不应残留未替换的 {xx} 或 [[ ]]
  const leftover = qs.filter(q =>
    /\{[A-Za-z_]/.test(q.stemHtml) || /\{[A-Za-z_]/.test(q.solutionHtml || '') ||
    /\[\[|\]\]/.test(q.stemHtml) || /\[\[|\]\]/.test(q.solutionHtml || ''));
  if (leftover.length) {
    fail++;
    console.log(' 渲染残留 ' + tpl.id + '：' + leftover[0].stemHtml + ' | ' + leftover[0].solutionHtml);
  }

  // 配图一致性：题干说到"图"就必须有 image 或 diagram；写了 diagram 就必须真能渲染
  let figErr = '';
  // 真题导入的题（有 originalImage）只要原题带图，就必须自己画图；
  // 确实无图的应用题要显式写 noFigure 说明原因，否则 FAIL —— 防止把图"退化成文字"。
  if (tpl.originalImage && !tpl.diagram && !tpl.image && !tpl.noFigure) {
    figErr = '真题模板缺少配图：请加 diagram（简化 SVG），或写 noFigure 说明原题确实无图';
  }
  else if (refsFigure(tpl) && !tpl.image && !tpl.diagram) figErr = '题干提到图，但既无 image 也无 diagram';
  else if (tpl.diagram && (!qs.length || !qs.every(q => q.diagramSvg))) figErr = 'diagram 渲染为空';
  else if ((tpl.answer && tpl.answer.optionsSvg) &&
           !qs.every(q => Array.isArray(q.optionsSvg) && q.optionsSvg.length === q.options.length && q.optionsSvg.every(Boolean))) {
    figErr = 'optionsSvg 渲染为空或数量不匹配';
  }
  if (figErr) {
    fail++;
    console.log(' 缺配图 ' + tpl.id + '：' + figErr);
  }

  /* 变式检查：一份模板必须能生成 ≥2 种不同数值/形式的题，否则就是"死题"。
     确实无法参数化（图依赖、题面固定）的，必须显式写 todo/figureTodo，否则 FAIL。 */
  const uniq = new Set(qs.map(q => q.sig)).size;
  let varErr = '';
  if (uniq < 2 && !tpl.todo && !tpl.figureTodo && !tpl.noVariantReason) {
    varErr = '只有 1 个变式（未参数化）；无法参数化请显式标记 todo/figureTodo';
    fail++;
  }

  console.log(((ok && !leftover.length && !figErr && !varErr) ? '  OK  ' : ' FAIL ') + tpl.id.padEnd(22) +
    '生成 ' + String(qs.length).padStart(3) + '/300  不同数值 ' + String(uniq).padStart(3) +
    '  判分错 ' + gradeErr + (nullCount ? '  生成失败 ' + nullCount : ''));
  if (varErr) console.log(' ! 变式 ' + tpl.id + '：' + varErr);
  if (qs.length) {
    qs.slice(0, 2).forEach(q => console.log('        ' + q.stemText + '   ⇒ ' + q.display + (q.unit ? ' ' + q.unit : '')));
  }
}
console.log('='.repeat(70));
const todoList = list.filter(t => t.figureTodo || t.todo);
if (todoList.length) {
  console.log('待办（已显式标记，暂缓参数化）：' + todoList.length + ' 题');
  todoList.forEach(t => console.log('   · ' + t.id + '  ' + (t.figureTodo || t.todo)));
}
console.log(fail ? '✗ ' + fail + ' 个模板有问题' : '✓ 全部模板通过');
process.exit(fail ? 1 : 0);
