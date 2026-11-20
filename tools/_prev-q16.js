/* 临时预览：seamo25a-q16（2025 SEAMO Paper A 三架天平 / 葡萄）—— 原题 + 随机变体。
   检查：原题模式仍是「1 串 = 2 香蕉、1 香蕉 = 3 苹果、2 苹果 = 140g」；变体里串数/根数变了图不糊。 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const ctx = { console, Math, JSON, Object, Array, Number, String, isFinite, parseFloat, Date, Set };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
['assets/js/expr.js', 'assets/js/diagrams.js', 'assets/js/generator.js']
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const { Generator } = ctx;
const bank = JSON.parse(fs.readFileSync(path.join(root, 'data/question-bank.json'), 'utf8')).templates;
const tpl = bank.find(t => t.id === 'seamo25a-q16');

const rows = [{ tag: 'original（原卷：2 苹果=140g、1 蕉=3 苹果、1 串=2 蕉）', q: Generator.instantiate(tpl, null, { original: true, lang: 'en' }) }];
const seenKey = new Set();
let guard = 0;
while (rows.length < 6 && guard++ < 800) {
  const q = Generator.instantiate(tpl, null, { lang: 'en' });
  const v = q.vars;
  const key = v.p + '|' + v.r;
  const maxCnt = Math.max(v.bL, v.aL, v.na);
  if (maxCnt < 5 && !(v.p === 2 && v.r === 2)) continue;
  if (seenKey.has(key)) continue;
  seenKey.add(key);
  rows.push({ tag: 'p=' + v.p + ' 串→' + v.bL + ' 蕉，r=' + v.r + ' 蕉→' + v.aL + ' 果，' + v.na + ' 果=' + v.W + 'g，答 ' + q.display, q });
}

let html = '<html><head><meta charset="utf-8"><style>body{margin:14px;font:13px/1.5 -apple-system,"Segoe UI",sans-serif;color:#222}'
  + 'h3{font-size:13px;margin:14px 0 6px;color:#555;font-weight:500}svg{width:1060px;height:auto;display:block;border:1px solid #ddd;border-radius:6px;background:#fff}</style></head><body>';
rows.forEach(r => { html += '<h3>' + r.tag + '</h3>' + r.q.diagramSvg; });
html += '</body></html>';
fs.writeFileSync('C:/Users/dbsqu/AppData/Local/Temp/q16prev.html', html);
console.log('rows', rows.length);
