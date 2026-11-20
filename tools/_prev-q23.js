/* 临时预览：y2wq-23（三台天平 / 葡萄香蕉苹果）——原题 + 若干随机变体，供无头浏览器截图检查。
   重点看：托盘上最多 4 个图标时会不会压到隔壁天平、2 串葡萄/4 根香蕉这类多件排布是否整齐。 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const ctx = { console, Math, JSON, Object, Array, Number, String, isFinite, parseFloat, Date, Set };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
['assets/js/expr.js', 'assets/js/diagrams.js', 'assets/js/generator.js']
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const { Generator } = ctx;
const bank = JSON.parse(fs.readFileSync(path.join(root, 'data/question-bank.json'), 'utf8')).templates;
const tpl = bank.find(t => t.id === 'y2wq-23');

const rows = [{ tag: 'original（原卷：2 苹果=140g、1 蕉=3 苹果、1 串=2 蕉）', q: Generator.instantiate(tpl, null, { original: true, lang: 'en' }) }];
const want = [];                       // 故意挑几组极端：件数最多的、2 串的
let guard = 0;
while (want.length < 5 && guard++ < 400) {
  const q = Generator.instantiate(tpl, null, { lang: 'en' });
  const v = q.vars;
  const maxCnt = Math.max(v.nb, v.na, v.m);
  if (maxCnt >= 4 || v.p === 2) {
    if (want.some(w => w.vars.p === v.p && w.vars.nb === v.nb && w.vars.na === v.na)) continue;
    want.push(q);
  }
}
want.forEach(q => rows.push({ tag: 'p=' + q.vars.p + ' 串→' + q.vars.nb + ' 蕉, r=' + q.vars.r + ' 蕉→' + q.vars.na + ' 果, ' + q.vars.m + ' 果=' + q.vars.W + 'g, 答 ' + q.display, q }));

let html = '<html><head><meta charset="utf-8"><style>body{margin:14px;font:13px/1.5 -apple-system,"Segoe UI",sans-serif;color:#222}'
  + 'h3{font-size:13px;margin:16px 0 6px;color:#555;font-weight:500}svg{width:1040px;height:auto;display:block;border:1px solid #ddd;border-radius:6px;background:#fff}</style></head><body>';
rows.forEach(r => { html += '<h3>' + r.tag + '</h3>' + r.q.diagramSvg; });
html += '</body></html>';
fs.writeFileSync('C:/Users/dbsqu/AppData/Local/Temp/q23prev.html', html);
console.log('rows', rows.length);
