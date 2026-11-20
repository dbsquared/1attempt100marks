/* 临时预览：把 y2wq-31 的原题图与两个随机变体渲染成 HTML，供无头浏览器截图检查。 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const ctx = { console, Math, JSON, Object, Array, Number, String, isFinite, parseFloat, Date, Set };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
['assets/js/expr.js', 'assets/js/diagrams.js', 'assets/js/generator.js']
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const { Generator } = ctx;
const bank = JSON.parse(fs.readFileSync(path.join(root, 'data/question-bank.json'), 'utf8')).templates;
const tpl = bank.find(t => t.id === 'y2wq-31');

const rows = [];
const orig = Generator.instantiate(tpl, null, { original: true });
rows.push({ tag: 'original（原题 6,7,11 / 5,8,3 / 9,5,?）', q: orig });
for (let i = 0; i < 3; i++) {
  const q = Generator.instantiate(tpl);
  rows.push({ tag: '变体 vars=' + JSON.stringify(q.vars), q });
}

let html = '<html><head><meta charset="utf-8"><style>body{margin:16px;font:14px/1.55 -apple-system,"Segoe UI",sans-serif;color:#222}'
  + 'h3{font-size:14px;margin:18px 0 6px;color:#555}svg{width:520px;height:auto;display:block;border:1px solid #ddd;border-radius:6px;background:#fff}'
  + '.opts{display:flex;gap:10px;margin-top:6px}.opts div{border:1px solid #ddd;border-radius:6px;padding:4px 10px;font-size:15px}'
  + '.opts .ok{border-color:#3a9b41;background:#eef7ee;font-weight:700}</style></head><body>';
rows.forEach(r => {
  html += '<h3>' + r.tag + '</h3>' + r.q.diagramSvg;
  html += '<div class="opts">' + r.q.options.map((o, i) =>
    '<div class="' + (i === r.q.correctIndex ? 'ok' : '') + '">' + 'ABCDE'[i] + '. ' + o + '</div>').join('') + '</div>';
  html += '<div style="color:#666;margin-top:4px">picked=' + r.q.display + '</div>';
});
html += '</body></html>';
fs.writeFileSync('C:/Users/dbsqu/AppData/Local/Temp/q15prev.html', html);
console.log('ok', rows.length, 'rows');
