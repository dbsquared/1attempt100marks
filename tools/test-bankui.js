/*!
 * test-bankui.js — 「题库管理」界面渲染自检
 * 用法：node tools/test-bankui.js [题库JSON]
 *
 * 为什么要有这个文件：本机没有可用的无头浏览器（Chrome/Edge 的 --headless --dump-dom 静默退出、
 * 输出 0 字节），没法对 index.html 做真正的端到端冒烟测试。替代做法是——
 * 把 app.js 里「题库管理」那几个**纯渲染函数原文抠出来**，在 Node 沙箱里喂真题库数据跑，
 * 再断言渲染出的 HTML 结构。验的是真代码，不是另写一份"等价实现"。
 *
 * 覆盖的都是踩过的坑：
 *   1. tplQNo 能算出 SEAMO / ICAS / 示例模板的题号（SEAMO 那批曾整批不显示题号）
 *   2. 每个模板都能被 Generator 实例化，且 choice 题的 options / optionsSvg / correctIndex 自洽
 *   3. variantHtml：choice 题必须渲染出**选项**，正确项必须打钩
 *      （「预览变式看不到选项」就是老代码只输出 stemText + 答案、整段漏掉选项造成的）
 *   4. 图形选项题必须把选项图（optionsSvg）真的画进 HTML
 *   5. tplInfoHtml 必须带出 id / 变量 / 约束
 *   6. index.html 里 bank 视图用到的 id，在 app.js 与 index.html 两侧都真实存在
 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const appSrc = fs.readFileSync(path.join(root, 'assets/js/app.js'), 'utf8');
const htmlSrc = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

/* ---- 从 app.js 原文里抠一个函数（按花括号配对） ----
   要跳过：字符串字面量、模板串、行/块注释、以及**正则字面量**。
   正则那一条不能省：esc() 里有 /[&<>"]/g，里面的 " 会被当成字符串开头，整个配对就串位了。 */
function extractFn(src, name) {
  const m = new RegExp('function\\s+' + name + '\\s*\\(').exec(src);
  if (!m) throw new Error('app.js 里找不到函数 ' + name);
  const start = src.indexOf('{', m.index);
  if (start < 0) throw new Error('函数 ' + name + ' 没有函数体');
  const KW = /^(return|typeof|case|in|of|new|delete|void|instanceof|do|else|yield|await)$/;
  let depth = 0, q = null, lastSig = '';
  for (let j = start; j < src.length; j++) {
    const c = src[j];
    if (q) { if (c === '\\') { j++; continue; } if (c === q) q = null; continue; }
    if (c === '/' && src[j + 1] === '/') { while (j < src.length && src[j] !== '\n') j++; continue; }
    if (c === '/' && src[j + 1] === '*') { j = src.indexOf('*/', j + 2) + 1; continue; }
    if (c === '/') {
      // 上一个有效字符是标识符/数字/右括号 ⇒ 这是除号；否则（或在 return 之后）是正则
      let isRe = !/[A-Za-z0-9_$)\]]/.test(lastSig);
      if (!isRe) {
        let k = j - 1, w = '';
        while (k >= 0 && /[A-Za-z]/.test(src[k])) w = src[k--] + w;
        isRe = KW.test(w);
      }
      if (isRe) {
        let k = j + 1, inCls = false;
        for (; k < src.length; k++) {
          const d = src[k];
          if (d === '\\') { k++; continue; }
          if (d === '\n') break;
          if (d === '[') inCls = true;
          else if (d === ']') inCls = false;
          else if (d === '/' && !inCls) break;
        }
        j = k; lastSig = '/'; continue;
      }
    }
    if (c === '"' || c === "'" || c === '`') { q = c; lastSig = c; continue; }
    if (c === '{') { depth++; lastSig = '{'; continue; }
    if (c === '}') { depth--; lastSig = '}'; if (depth === 0) return src.slice(m.index, j + 1); continue; }
    if (!/\s/.test(c)) lastSig = c;
  }
  throw new Error('函数 ' + name + ' 花括号不配对');
}

const pieces = [
  "var LETTERS = 'ABCDEFGH';",
  'esc', 'stars', 'sourceSetOf', 'tplQNo', 'tplStemText',
  'stemLangHtml', 'variantHtml', 'tplInfoHtml', 'matchQuery', 'bankQuery',
].map(n => (n.indexOf('var ') === 0 ? n : extractFn(appSrc, n))).join('\n');

const factory = new Function('Generator',
  pieces + '\nreturn { esc: esc, tplQNo: tplQNo, variantHtml: variantHtml, tplInfoHtml: tplInfoHtml, matchQuery: matchQuery, stemLangHtml: stemLangHtml };');

/* 用来把真实的 renderBankList 也抠出来跑（做 --html 预览页时用），
   需要一个极小的"假 DOM"：只支持 $('#id') 取节点 + 记录 innerHTML。 */
const renderFactory = new Function('Generator', 'Bank', 'Store', 'checkedSources', '$', '$$',
  pieces + '\n' + extractFn(appSrc, 'renderBankStats') + '\n' + extractFn(appSrc, 'renderBankList') +
  '\nreturn { renderBankList: renderBankList, renderBankStats: renderBankStats };');

/* ---- 浏览器侧模块（expr / diagrams / generator） ---- */
const ctx = { console, Math, JSON, Object, Array, Number, String, isFinite, parseFloat, Date, Set };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
['assets/js/expr.js', 'assets/js/diagrams.js', 'assets/js/generator.js'].forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
});
const UI = factory(ctx.Generator);
const Generator = ctx.Generator;

const bankPath = process.argv.slice(2).find(a => a.indexOf('--') !== 0) || path.join(root, 'data/question-bank.json');
const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
const list = Array.isArray(bank) ? bank : bank.templates;

let fail = 0, pass = 0;
function chk(ok, msg) { if (ok) { pass++; } else { fail++; console.log('  ✗ ' + msg); } }

console.log('题库：' + bankPath + '　模板数：' + list.length);
console.log('='.repeat(70));

/* ---- 1. 题号识别 ---- */
console.log('1) tplQNo 题号识别');
[['seamo25a-q01', 1], ['seamo25a-q07', 7], ['seamo25a-q25', 25],
 ['icas21y2m-09', 9], ['icas22y2m-13a', 13], ['icas22y2m-13b', 13],
 ['m6-frac-add', null], ['demo-1', null]].forEach(([id, want]) => {
  const got = UI.tplQNo({ id: id });
  chk(got === want, 'tplQNo("' + id + '") = ' + got + '，应为 ' + want);
});
const noQno = list.filter(t => UI.tplQNo(t) == null);
const withQno = list.filter(t => UI.tplQNo(t) != null);
console.log('   有题号的模板 ' + withQno.length + ' 条，无题号（示例模板）' + noQno.length + ' 条');
chk(withQno.length >= 80, '有题号的模板太少（' + withQno.length + '），题号识别可能又坏了');
// 同一来源内题号不应出现两次（ICAS 的 13a/13b 属同一题的两个变体，用 source 区分不了，故只做提示）
const bySrcNo = {};
list.forEach(t => {
  const n = UI.tplQNo(t); if (n == null) return;
  const k = (t.sourceSet || t.source || '') + ' #' + n;
  (bySrcNo[k] = bySrcNo[k] || []).push(t.id);
});
const dupNo = Object.keys(bySrcNo).filter(k => bySrcNo[k].length > 1);
if (dupNo.length) console.log('   （同来源同题号：' + dupNo.map(k => k + ' → ' + bySrcNo[k].join('/')).join('；') + '）');

/* ---- 2~5. 逐模板渲染 ---- */
console.log('2) 逐模板实例化 + 题卡渲染');
let nFigOpt = 0, nChoice = 0, nBlank = 0;
for (const tpl of list) {
  let problems = [];
  for (let round = 0; round < 3; round++) {
    let q = null;
    try { q = Generator.instantiate(tpl); } catch (e) { problems.push('实例化抛异常 ' + e.message); break; }
    if (!q) { problems.push('生成不出变式'); break; }

    // choice 题自洽性
    if (q.type === 'choice') {
      nChoice++;
      if (!Array.isArray(q.options) || q.options.length < 2) problems.push('choice 但 options 少于 2 项');
      else if (q.optionsSvg && q.optionsSvg.length !== q.options.length) problems.push('optionsSvg 长度与 options 不一致');
      const ci = q.correctIndex;
      const okCi = Array.isArray(ci) ? ci.every(i => i >= 0 && i < q.options.length)
        : (typeof ci === 'number' && ci >= 0 && ci < q.options.length);
      if (!okCi) problems.push('correctIndex 越界：' + JSON.stringify(ci));
    }

    // —— 渲染 ——
    const html = UI.variantHtml(q, '变式示例');
    if (/bk-flag/.test(html) && /生成不出变式/.test(html)) problems.push('variantHtml 报告生成失败');
    if (!/<section class="bk-v">/.test(html)) problems.push('variantHtml 少了 .bk-v 外层');
    if (html.indexOf(q.stemHtml) < 0) problems.push('variantHtml 没输出题干');
    if (html.indexOf('bk-ans') < 0) problems.push('variantHtml 没输出答案行');

    if (q.type === 'choice') {
      // 注意：不能写成 /class="bk-opt/ —— 那会把容器 .bk-opts / .bk-optxt / .bk-optsvg 一起算进来
      const optCount = (html.match(/class="bk-opt(?: hit)?"/g) || []).length;
      if (optCount !== q.options.length) problems.push('选项没渲染全：' + optCount + '/' + q.options.length);
      const hitCount = (html.match(/class="bk-opt hit"/g) || []).length;
      const wantHit = Array.isArray(q.correctIndex) ? q.correctIndex.length : 1;
      if (hitCount !== wantHit) problems.push('正确项打钩数不对：' + hitCount + '，应为 ' + wantHit);
      // 关键回归点：选项是图形时，选项 SVG 必须真的画出来
      if (q.optionsSvg && q.optionsSvg.length) {
        nFigOpt++;
        const cells = (html.match(/<span class="bk-optsvg">/g) || []).length;
        if (cells !== q.optionsSvg.length) problems.push('图形选项没画全：' + cells + '/' + q.optionsSvg.length);
        if (html.indexOf('bk-opts-svg') < 0) problems.push('图形选项没加 bk-opts-svg 类');
        // 图形选项题的 options 是「A/甲」这类占位标签，不该再显示出来跟左侧字母重复
        if (/class="bk-optxt">[A-E甲乙丙丁戊]</.test(html)) problems.push('图形选项题仍在显示占位标签文字');
      }
      // 答案行必须写「正确项的字母」，且与打钩的字母一致（图形选项题的 display 只是占位标签，会对不上）
      const wantLetters = (Array.isArray(q.correctIndex) ? q.correctIndex : [q.correctIndex])
        .map(i => 'ABCDEFGH'[i]).join('、');
      const ansM = /<p class="bk-ans"><b>答案：<\/b>([^<（]*)/.exec(html);
      if (!ansM) problems.push('答案行渲染不出来');
      else if (ansM[1] !== wantLetters) problems.push('答案字母「' + ansM[1] + '」与打钩项「' + wantLetters + '」不一致');
      else if (html.indexOf('bk-tick') < 0) problems.push('没有打钩标记');
    }
    if (q.diagramSvg) {
      if (html.indexOf('<figure class="bk-fig">') < 0) problems.push('有配图但没渲染 .bk-fig');
    }
  }
  if (!tpl.diagram && !(tpl.answer && tpl.answer.optionsSvg)) nBlank++;

  // tplInfoHtml
  const info = UI.tplInfoHtml(tpl);
  if (info.indexOf(UI.esc(tpl.id)) < 0) problems.push('模板信息里没有 id');
  if (!tpl.diagram && !/没有录入原卷截图/.test(info) && !tpl.originalImage) problems.push('模板信息既没图也没说明');

  if (problems.length) {
    fail++;
    console.log('  ✗ ' + tpl.id + ' → ' + Array.from(new Set(problems)).join('；'));
  } else pass++;
}
console.log('   选择题抽样 ' + nChoice + ' 次，图形选项题抽样 ' + nFigOpt + ' 次，无图无选项的题 ' + nBlank + ' 条');

/* ---- 6. index.html 与 app.js 的 id 交叉校验 ---- */
console.log('3) bank 视图 id 交叉校验');
const idRefs = Array.from(new Set((appSrc.match(/#(bank[A-Za-z]*|btnBankReload)/g) || []).map(s => s.slice(1)))).sort();
const missing = idRefs.filter(id => htmlSrc.indexOf('id="' + id + '"') < 0);
idRefs.forEach(id => chk(htmlSrc.indexOf('id="' + id + '"') >= 0, 'app.js 引用了 #' + id + '，但 index.html 里没有这个元素'));
console.log('   引用 ' + idRefs.length + ' 个 id：' + idRefs.join(', '));

/* ---- 7. 搜索过滤（matchQuery）---- */
console.log('4) 搜索过滤');
const seamo = list.filter(t => /seamo/i.test(t.id));
if (seamo.length) {
  const got = seamo.filter(t => UI.matchQuery(t, 'q7'));
  const want = seamo.filter(t => UI.tplQNo(t) === 7);
  chk(got.length === want.length && want.length > 0, '搜「q7」命中数 ' + got.length + '，应为 ' + want.length);
  chk(seamo.filter(t => UI.matchQuery(t, 'seamo')).length === seamo.length, '搜「seamo」应命中全部 SEAMO 模板');
}
chk(list.filter(t => UI.matchQuery(t, 'zzzz-不存在-zzzz')).length === 0, '无用关键词应命中 0 条');
chk(list.filter(t => UI.matchQuery(t, '')).length === list.length, '空关键词应命中全部');

/* ---- 可选：把真实的题卡渲染结果导出成静态预览页 ----
   本机没有无头浏览器，改动外观后没法截图核对，就用它生成一个能直接打开的页面。
   跑的是 app.js 里真实的 renderBankList / renderBankStats / variantHtml，样式内联 style.css。 */
const args = process.argv.slice(2);
const htmlOut = (args.find(a => a.indexOf('--html=') === 0) || '').slice(7);
if (htmlOut) {
  const only = (args.find(a => a.indexOf('--only=') === 0) || '').slice(7);
  const lim = parseInt((args.find(a => a.indexOf('--limit=') === 0) || '').slice(8), 10) || 0;
  let picked = list.filter(t => !only || t.id.indexOf(only) >= 0 || String(t.sourceSet || t.source || '').indexOf(only) >= 0);
  if (lim) picked = picked.slice(0, lim);

  const nodes = {};
  const mkNode = id => ({
    id, _html: '', value: '', dataset: {}, textContent: '', disabled: false,
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; },
    get innerHTML() { return this._html; }, set innerHTML(v) { this._html = String(v); },
  });
  const $stub = sel => { const m = /^#([\w-]+)$/.exec(sel); if (!m) return mkNode('?'); nodes[m[1]] = nodes[m[1]] || mkNode(m[1]); return nodes[m[1]]; };
  const Bank = { all: () => picked, base: list.filter(t => !(t.sourceSet || t.source)), byId: id => list.find(t => t.id === id) };
  const Store = { progress: () => ({}), customBank: () => [] };
  const R = renderFactory(Generator, Bank, Store, () => [], $stub, () => []);
  R.renderBankList();

  const css = fs.readFileSync(path.join(root, 'assets/css/style.css'), 'utf8');
  let body = '<h1>题库管理 · 题卡样式预览</h1>' +
    '<p class="small muted">由 <code>tools/test-bankui.js --html</code> 导出：跑的是 app.js 里真实的 ' +
    'renderBankList / renderBankStats / variantHtml，样式内联 assets/css/style.css。共 ' + picked.length + ' 张卡。</p>' +
    (nodes.bankStats ? nodes.bankStats.innerHTML : '') +
    '<div class="bank-list">' + (nodes.bankList ? nodes.bankList.innerHTML : '') + '</div>';
  let page = '<!DOCTYPE html>\n<html lang="zh-CN"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>题库管理 · 题卡样式预览</title><style>\n' + css +
    '\nbody{padding:16px} .bank-list{max-height:none}</style></head><body><div class="wrap">' +
    body + '</div></body></html>';

  /* --inline：把原卷截图换成 base64 内嵌。
     IDE 内置预览是把单文件复制进沙箱再用 127.0.0.1/static-html/<hash>/ 打开的，
     相对路径的 assets/originals/*.png 必然 404（跟 build-paper-archive.js 一个道理）。 */
  let inlined = 0;
  if (args.indexOf('--inline') >= 0) {
    page = page.replace(/(src|href)="(assets\/[^"]+\.(?:png|jpe?g|webp|gif))"/g, (m0, attr, rel) => {
      const f = path.join(root, rel);
      if (!fs.existsSync(f)) return m0;
      inlined++;
      const ext = /\.jpe?g$/i.test(rel) ? 'jpeg' : rel.slice(rel.lastIndexOf('.') + 1).toLowerCase();
      return attr + '="data:image/' + ext + ';base64,' + fs.readFileSync(f).toString('base64') + '"';
    });
  }
  fs.writeFileSync(htmlOut, page);
  console.log('已导出预览页：' + htmlOut + '（' + page.length + ' 字节，' + picked.length + ' 张卡' +
    (inlined ? '，内嵌 ' + inlined + ' 张原卷截图' : '') + '）');
}

console.log('='.repeat(70));
console.log(fail === 0 ? '✓ 题库管理界面自检全部通过' : ('✗ 失败 ' + fail + ' 项'));
process.exit(fail === 0 ? 0 : 1);
