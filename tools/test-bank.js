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
  if (refsFigure(tpl) && !tpl.image && !tpl.diagram) figErr = '题干提到图，但既无 image 也无 diagram';
  else if (tpl.diagram && (!qs.length || !qs.every(q => q.diagramSvg))) figErr = 'diagram 渲染为空';
  if (figErr) {
    fail++;
    console.log(' 缺配图 ' + tpl.id + '：' + figErr);
  }

  const uniq = new Set(qs.map(q => q.sig)).size;
  console.log(((ok && !leftover.length && !figErr) ? '  OK  ' : ' FAIL ') + tpl.id.padEnd(22) +
    '生成 ' + String(qs.length).padStart(3) + '/300  不同数值 ' + String(uniq).padStart(3) +
    '  判分错 ' + gradeErr + (nullCount ? '  生成失败 ' + nullCount : ''));
  if (qs.length) {
    qs.slice(0, 2).forEach(q => console.log('        ' + q.stemText + '   ⇒ ' + q.display + (q.unit ? ' ' + q.unit : '')));
  }
}
console.log('='.repeat(70));
console.log(fail ? '✗ ' + fail + ' 个模板有问题' : '✓ 全部模板通过');
process.exit(fail ? 1 : 0);
