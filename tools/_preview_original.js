/* 生成「原题模式」核对页：左边原卷截图，右边是原题模式实际渲染出的题干 + 图 + 答案。
   用来肉眼确认「勾选原题后出的题」和原卷是同一道（数值 / 图形 / 答案一致）。
   产物是生成物，不要提交（默认 tools/_original-preview.html）。

   用法：
     node tools/_preview_original.js                       默认 2022 批
     node tools/_preview_original.js <输出路径> --set=icas21y2m
     node tools/_preview_original.js <输出路径> --only=13,21 --inline
*/
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const ctx = { console, Math, JSON, Object, Array, Number, String, isFinite, parseFloat, Date, Set };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
['assets/js/expr.js', 'assets/js/diagrams.js', 'assets/js/generator.js']
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const { Generator } = ctx;
const bank = JSON.parse(fs.readFileSync(path.join(root, 'data/question-bank.json'), 'utf8'));
const list = bank.templates || bank;

const args = process.argv.slice(2);
const outArg = args.find(a => !a.startsWith('--'));
const onlyArg = (args.find(a => a.startsWith('--only=')) || '').split('=')[1];
const setArg = (args.find(a => a.startsWith('--set=')) || '').split('=')[1];
const OUT = outArg ? path.resolve(outArg) : path.join(root, 'tools/_original-preview.html');
const SET = setArg || 'icas22y2m';
const SETNAME = { icas22y2m: 'ICAS 2022 Year 2', icas21y2m: 'ICAS 2021 Year 2' }[SET] || SET;
const ONLY = onlyArg ? onlyArg.split(',').map(s => SET + '-' + s.trim().padStart(2, '0')) : null;
const INLINE = args.indexOf('--inline') >= 0;
const IMG = (path.relative(path.dirname(OUT), root) || '.').replace(/\\/g, '/');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };
function imgSrc(rel) {
  if (!INLINE) return IMG + '/' + rel;
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return IMG + '/' + rel;
  return 'data:' + (MIME[path.extname(p).toLowerCase()] || 'image/png') + ';base64,' + fs.readFileSync(p).toString('base64');
}
const CSS = `
body{font-family:system-ui,-apple-system,"Microsoft YaHei",sans-serif;background:#15181d;color:#e6e6e6;padding:22px}
h1{font-size:20px;margin:0 0 4px}h3{margin:26px 0 8px;color:#8ab4f8;font-size:15px}
.tip{color:#8b93a1;font-size:13px;margin-bottom:10px}
table{border-collapse:collapse;width:100%}
td{border:1px solid #2c313a;padding:12px;vertical-align:top}
td.orig{width:300px;background:#1a1e24}
.tag{font-size:12px;color:#8b93a1;margin:6px 0 2px}
.orig img{width:100%;border-radius:8px;border:1px solid #2c313a;background:#fff}
.d{background:#1d222a;border:1px solid #2c313a;border-radius:10px;padding:8px;margin:6px 0}
.d svg{max-width:470px;height:auto;display:block}
.optsv{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.optsv .d{padding:4px;margin:0;text-align:center}
.optsv svg{max-width:118px}
.optsv b{font-size:11px;color:#8b93a1}
.stem{font-size:14px;line-height:1.6}
.ans{color:#7ee08a;font-weight:700}
.sol{font-size:12px;color:#96a0b0;white-space:pre-wrap;margin-top:6px}
.none{color:#6b7280;font-style:italic}
.miss{color:#f5a97f}`;

let h = '<!doctype html><meta charset="utf-8"><title>原题模式核对</title><style>' + CSS + '</style>';
h += '<h1>' + SETNAME + ' · 原题模式核对</h1>';
h += '<div class="tip">左边 = 原卷截图，右边 = 勾选「原题」后实际出的题（固定数值、固定答案）。' +
     '重点看：数值是否与原卷一致、答案是否等于原卷答案。</div>';

let figs = list.filter(t => new RegExp('^' + SET).test(t.id) && t.original);
if (ONLY) figs = figs.filter(t => ONLY.indexOf(t.id) >= 0);
const miss = list.filter(t => new RegExp('^' + SET).test(t.id) && t.originalImage && !t.original).map(t => t.id);

figs.forEach(t => {
  const q = Generator.instantiate(t, null, { original: true });
  h += '<h3>' + t.id + ' · ' + (t.title || '') + ' · <code>' + (t.diagram ? t.diagram.type : '无主图') + '</code></h3><table><tr>';
  h += '<td class="orig"><div class="tag">原卷</div>' +
    (t.originalImage ? '<img src="' + imgSrc(t.originalImage) + '" alt="原卷">' : '<span class="none">（无原卷图）</span>') + '</td>';
  h += '<td class="gen"><div class="tag">原题模式生成</div>';
  if (!q) { h += '<div class="none">生成失败</div></td></tr></table>'; return; }
  h += '<div class="stem">' + q.stemHtml + '</div>';
  h += '<div class="d">' + (q.diagramSvg || '（无主图）') + '</div>';
  if (q.optionsSvg && q.optionsSvg.length) {
    const ci = Array.isArray(q.correctIndex) ? q.correctIndex[0] : q.correctIndex;
    h += '<div class="tag">' + q.optionsSvg.length + ' 个图形选项（正确项 ' + 'ABCDEFGH'[ci] + '）</div><div class="optsv">' +
      q.optionsSvg.map((s, k) => '<div class="d"><b>' + 'ABCDEFGH'[k] + '</b>' + s + '</div>').join('') + '</div>';
  } else if (q.options && q.options.join('').length) {
    const ci = Array.isArray(q.correctIndex) ? q.correctIndex : [q.correctIndex];
    h += '<div class="tag">选项</div><div>' +
      q.options.map((o, k) => (ci.indexOf(k) >= 0 ? '<span class="ans">' : '') + 'ABCDEFGH'[k] + '. ' + o + (ci.indexOf(k) >= 0 ? '</span>' : '')).join('　') + '</div>';
  } else {
    h += '<div class="tag">答案</div><div><span class="ans">' + (q.display !== undefined ? q.display : '') + (q.unit ? ' ' + q.unit : '') + '</span></div>';
  }
  h += '<div class="tag">原题数值</div><div class="sol">' + JSON.stringify(t.original) + '</div>';
  h += '<div class="sol">' + q.solutionText + '</div>';
  h += '</td></tr></table>';
});
if (miss.length) {
  h += '<h3 class="miss">未录入原题数值（原题模式会跳过）：' + miss.join(', ') + '</h3>' +
       '<div class="tip">这些模板的问法/图形与原卷不同，用原题数值会得到与原卷答案不符的题，所以不收录。</div>';
}
h += '<p class="tip">本次核对 ' + figs.length + ' 题</p>';

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, h, 'utf8');
console.log('已生成 ' + OUT + '（' + figs.length + ' 题，未录入 ' + miss.length + ' 题）');
