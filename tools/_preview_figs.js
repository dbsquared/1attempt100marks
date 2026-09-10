/* 生成配图核对页：每个配图模板出 2 个随机变式，
   左边是「原题截图」，右边是「简化 SVG + 选项图」，肉眼核对用。
   产物 tools/_figs-preview.html 是生成物，不要提交。 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const ctx = { console, Math, JSON, Object, Array, Number, String, isFinite, parseFloat, Date, Set };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
['assets/js/expr.js', 'assets/js/diagrams.js', 'assets/js/generator.js', 'assets/js/grader.js']
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const { Generator } = ctx;
const bank = JSON.parse(fs.readFileSync(path.join(root, 'data/question-bank.json'), 'utf8'));
const list = bank.templates || bank;

const CSS = `
body{font-family:system-ui,-apple-system,"Microsoft YaHei",sans-serif;background:#15181d;color:#e6e6e6;padding:22px}
h1{font-size:20px;margin:0 0 4px}h3{margin:26px 0 8px;color:#8ab4f8;font-size:15px}
.tip{color:#8b93a1;font-size:13px;margin-bottom:10px}
table{border-collapse:collapse;width:100%}
td{border:1px solid #2c313a;padding:12px;vertical-align:top}
td.orig{width:270px;background:#1a1e24}
td.gen{width:auto}
.tag{font-size:12px;color:#8b93a1;margin:6px 0 2px}
.orig img{width:100%;border-radius:8px;border:1px solid #2c313a;background:#fff}
.d{background:#1d222a;border:1px solid #2c313a;border-radius:10px;padding:8px;margin:6px 0}
.d svg{max-width:400px;height:auto;display:block}
.optsv{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.optsv .d{padding:4px;margin:0;text-align:center}
.optsv svg{max-width:118px}
.optsv b{font-size:11px;color:#8b93a1}
.stem{font-size:14px;line-height:1.6}
.ans{color:#7ee08a;font-weight:700}
.sol{font-size:12px;color:#96a0b0;white-space:pre-wrap;margin-top:6px}
.none{color:#6b7280;font-style:italic}`;

let h = '<!doctype html><meta charset="utf-8"><title>配图核对</title><style>' + CSS + '</style>';
h += '<h1>ICAS 2022 Year 2 · 简化 SVG 配图核对</h1>';
h += '<div class="tip">每题给 2 个随机变式。左边是原题截图，右边是学生实际看到的题干 + SVG 配图。' +
     '重点看：图对不对、和原题是不是同一件事、选项图能不能分辨。</div>';

const figs = list.filter(t => t.diagram && /^icas22y2m/.test(t.id));
figs.forEach(t => {
  h += '<h3>' + t.id + ' · ' + (t.title || '') + ' · <code>' + t.diagram.type + '</code>' +
       (t.answer && t.answer.optionsSvg ? ' + optionsSvg' : '') + '</h3><table><tr>';
  h += '<td class="orig"><div class="tag">原题</div>' +
       (t.originalImage ? '<img src="../' + t.originalImage + '" alt="原题">' : '<span class="none">（无原题图）</span>') + '</td>';
  h += '<td class="gen">';
  for (let i = 0; i < 2; i++) {
    const q = Generator.instantiate(t);
    if (!q) { h += '<div class="none">生成失败</div>'; continue; }
    h += '<div class="stem">' + (i ? '② ' : '① ') + q.stemHtml + ' <span class="ans">⇒ ' +
         (q.display === undefined ? '' : q.display) + (q.unit ? ' ' + q.unit : '') + '</span></div>';
    h += '<div class="d">' + (q.diagramSvg || '（无图）') + '</div>';
    if (q.optionsSvg && q.optionsSvg.length) {
      const ci = Array.isArray(q.correctIndex) ? q.correctIndex[0] : q.correctIndex;
      h += '<div class="tag">4 个图形选项（正确项是 ' + 'ABCDEFGH'[ci] + '）</div><div class="optsv">' +
        q.optionsSvg.map((s, k) => '<div class="d"><b>' + 'ABCDEFGH'[k] + '</b>' + s + '</div>').join('') + '</div>';
    }
    h += '<div class="sol">' + q.solutionText + '</div>';
    if (i === 0) h += '<hr style="border:none;border-top:1px dashed #2c313a;margin:12px 0">';
  }
  h += '</td></tr></table>';
});
const noFig = list.filter(t => t.noFigure);
if (noFig.length) {
  h += '<h3>确认无图的题（已显式标注 noFigure）</h3><div class="tip">' +
    noFig.map(t => t.id + '：' + t.noFigure).join('<br>') + '</div>';
}
h += '<p class="tip">配图模板 ' + figs.length + ' 个</p>';

fs.writeFileSync(path.join(root, 'tools/_figs-preview.html'), h, 'utf8');
console.log('已生成 tools/_figs-preview.html（配图模板 ' + figs.length + ' 个）');
