#!/usr/bin/env node
/**
 * build-paper-archive.js
 * 把 papers/ 下的「整卷归档 JSON」生成两个可读产物：
 *   1) 同名 .md   —— 纯文本归档（按题号顺序，便于检索/复制）
 *   2) 同名 .html —— 可浏览的索引页（题目 + 原题配图 + 选项，答案解析默认折叠）
 *
 * 用法：
 *   node tools/build-paper-archive.js papers/2025-SEAMO-Paper-A.json
 *   node tools/build-paper-archive.js            # 不带参数则处理 papers/*.json
 *
 * JSON 结构见 papers/2025-SEAMO-Paper-A.json（set / sections / answerKey / questions[]）。
 * 题目的 figure.image 是相对仓库根目录的路径，HTML 里原样引用，所以页面要放在仓库内打开。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 图片内嵌成 data: URI。
 * 原因：IDE 内置预览是把 HTML 复制进沙箱目录再通过 127.0.0.1/static-html/<hash>/ 打开的，
 * 相对路径的 assets/**.png 会 404。内嵌后产物自包含，也能直接拖进浏览器/发给别人看。
 */
function dataUri(rel) {
  try {
    const p = path.join(ROOT, rel.split('/').join(path.sep));
    if (!fs.existsSync(p)) return rel;   // 找不到就退回相对路径，别把页面做坏
    const ext = path.extname(p).slice(1).toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'application/octet-stream';
    return `data:${mime};base64,${fs.readFileSync(p).toString('base64')}`;
  } catch (e) {
    return rel;
  }
}

function secLabel(paper, q) {
  const s = (paper.sections || []).find(s => s.id === q.section);
  return s ? `${s.id} 部分（每题 ${s.marks} 分）` : `${q.section} 部分`;
}

function letterOf(q) {
  return q.answer && q.answer.key ? q.answer.key : null;
}

/* ---------------- Markdown ---------------- */
function buildMarkdown(paper) {
  const L = [];
  L.push(`# ${paper.setZh || paper.set}`);
  L.push('');
  L.push(`> 英文原名：${paper.fullName || paper.set}`);
  L.push(`> 共 ${paper.totalQuestions} 题　|　原卷：\`${paper.sourceFile}\`　|　答案页：\`${paper.answerSheetImage}\``);
  L.push('');
  L.push('## 试卷结构');
  L.push('');
  L.push('| 部分 | 题号 | 每题分值 | 题型 | 说明 |');
  L.push('|---|---|---|---|---|');
  (paper.sections || []).forEach(s => {
    L.push(`| ${s.id} | ${s.range} | ${s.marks} | ${s.type === 'choice' ? '五选一' : '填空'} | ${s.note || ''} |`);
  });
  L.push('');
  L.push('## 答案一览');
  L.push('');
  const ks = Object.keys(paper.answerKey || {}).sort((a, b) => +a - +b);
  L.push('| ' + ks.map(k => 'Q' + k).join(' | ') + ' |');
  L.push('|' + ks.map(() => '---').join('|') + '|');
  L.push('| ' + ks.map(k => paper.answerKey[k]).join(' | ') + ' |');
  L.push('');
  L.push('---');
  L.push('');
  L.push('## 逐题归档');
  L.push('');
  (paper.questions || []).forEach(q => {
    L.push(`### Q${q.no}　${q.topic}　（${secLabel(paper, q)}，${q.difficulty ? '难度 ' + q.difficulty + '/5' : ''}）`);
    L.push('');
    L.push(`**题干（英文原文）**：${q.stem}`);
    L.push('');
    if (q.stemZh) { L.push(`**题干（中文）**：${q.stemZh}`); L.push(''); }
    if (q.options) {
      L.push('**选项**：');
      L.push('');
      Object.keys(q.options).forEach(k => {
        const mark = letterOf(q) === k ? ' ✅' : '';
        L.push(`- (${k}) ${q.options[k]}${mark}`);
      });
      L.push('');
    }
    L.push(`**答案**：${q.answer && q.answer.value ? q.answer.value : (letterOf(q) || '—')}${letterOf(q) ? `（选 ${letterOf(q)}）` : ''}`);
    L.push('');
    if (q.solutionZh) { L.push(`**解析**：${q.solutionZh}`); L.push(''); }
    if (q.figure && q.figure.image) {
      L.push(`**原题配图**：\`${q.figure.image}\``);
      L.push('');
      L.push(`![Q${q.no}](${q.figure.image})`);
      L.push('');
    }
    if (q.figure && q.figure.desc) { L.push(`**图注**：${q.figure.desc}`); L.push(''); }
    if (q.verified) { L.push(`**校验**：${q.verified}`); L.push(''); }
    L.push('---');
    L.push('');
  });
  return L.join('\n');
}

/* ---------------- HTML ---------------- */
function buildHtml(paper) {
  const cards = (paper.questions || []).map(q => {
    const sec = (paper.sections || []).find(s => s.id === q.section) || {};
    const key = letterOf(q);
    const opts = q.options ? `<ul class="opts">${
      Object.keys(q.options).map(k =>
        `<li class="${key === k ? 'hit' : ''}"><b>(${k})</b> ${esc(q.options[k])}${key === k ? ' <span class="tick">✓</span>' : ''}</li>`
      ).join('')
    }</ul>` : '';
    const fig = (q.figure && q.figure.image)
      ? `<figure><img src="${dataUri(q.figure.image)}" alt="Q${q.no} 原题配图"><figcaption>原题配图：${esc(q.figure.image.split('/').pop())}</figcaption></figure>`
      : '';
    const optFig = q.optionsAreFigures ? '<p class="flag">⚠ 选项本身是图形，请看上方原题图里的 (A)–(E)。</p>' : '';
    return `
<article class="card" id="q${q.no}">
  <header>
    <span class="no">Q${q.no}</span>
    <span class="topic">${esc(q.topic || '')}</span>
    <span class="meta">${esc(sec.id || '')} 部分 · ${sec.marks || ''} 分 · 难度 ${q.difficulty || '?'}/5</span>
  </header>
  <p class="stem"><span class="tag">EN</span>${esc(q.stem)}</p>
  ${q.stemZh ? `<p class="stem zh">${esc(q.stemZh)}</p>` : ''}
  ${fig}
  ${q.figure && q.figure.desc ? `<p class="figdesc"><b>图注：</b>${esc(q.figure.desc)}</p>` : ''}
  ${optFig}
  ${opts}
  <details>
    <summary>查看答案解析</summary>
    <p class="ans"><b>答案：</b>${esc(q.answer && q.answer.value ? q.answer.value : '—')}${key ? `（选 ${key}）` : ''}</p>
    ${q.solutionZh ? `<p class="sol"><b>解析：</b>${esc(q.solutionZh)}</p>` : ''}
    ${q.verified ? `<p class="ver"><b>校验：</b>${esc(q.verified)}</p>` : ''}
  </details>
</article>`;
  }).join('\n');

  const ks = Object.keys(paper.answerKey || {}).sort((a, b) => +a - +b);
  const keyRows = ks.map(k => `<td><span class="qk">Q${k}</span><span class="kv">${esc(paper.answerKey[k])}</span></td>`).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(paper.setZh || paper.set)} · 整卷归档</title>
<style>
  :root{
    --ink:#1c2430; --muted:#65758b; --line:#e2e7ee; --bg:#f6f8fb; --card:#fff;
    --accent:#2563a8; --hit:#e8f5e9; --hitline:#43a047;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font-family:-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",Roboto,sans-serif;
    line-height:1.7;-webkit-text-size-adjust:100%}
  .wrap{max-width:900px;margin:0 auto;padding:28px 18px 80px}
  h1{font-size:24px;margin:0 0 6px}
  .sub{color:var(--muted);font-size:13px;margin:0 0 18px}
  .sub code{background:#eef2f7;padding:1px 5px;border-radius:4px}
  .panel{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:0 0 18px}
  .panel h2{font-size:15px;margin:0 0 10px;color:var(--accent)}
  table{border-collapse:collapse;width:100%;font-size:13px}
  th,td{border:1px solid var(--line);padding:6px 8px;text-align:left}
  th{background:#f0f4f9;font-weight:600}
  .keytbl td{text-align:center;padding:6px 2px}
  .qk{display:block;font-size:11px;color:var(--muted)}
  .kv{display:block;font-weight:700;font-size:15px}
  .toc{display:flex;flex-wrap:wrap;gap:6px}
  .toc a{display:inline-block;min-width:40px;text-align:center;padding:4px 8px;border:1px solid var(--line);
    border-radius:8px;text-decoration:none;color:var(--ink);font-size:13px;background:#fff}
  .toc a:hover{border-color:var(--accent);color:var(--accent)}
  .card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:0 0 16px;scroll-margin-top:14px}
  .card header{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;border-bottom:1px dashed var(--line);padding-bottom:8px;margin-bottom:12px}
  .no{font-weight:800;font-size:17px;color:var(--accent)}
  .topic{font-size:13px;background:#eef4fb;color:var(--accent);border-radius:20px;padding:2px 10px}
  .meta{font-size:12px;color:var(--muted);margin-left:auto}
  .stem{margin:0 0 8px;font-size:15px}
  .stem .tag{display:inline-block;font-size:10px;font-weight:700;color:#fff;background:#94a3b8;
    border-radius:4px;padding:1px 5px;margin-right:8px;vertical-align:2px}
  .stem.zh{color:#334155;background:#f7fafc;border-left:3px solid #cbd5e1;padding:6px 10px;border-radius:0 6px 6px 0}
  figure{margin:12px 0;text-align:center}
  figure img{max-width:100%;border:1px solid var(--line);border-radius:8px;background:#fff}
  figcaption{font-size:12px;color:var(--muted);margin-top:4px}
  .figdesc,.flag{font-size:13px;color:#475569;background:#f8fafc;border:1px dashed var(--line);
    border-radius:8px;padding:8px 10px;margin:8px 0}
  .flag{color:#8a5a00;background:#fff8e6;border-color:#f0d9a0}
  .opts{list-style:none;margin:10px 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px}
  .opts li{border:1px solid var(--line);border-radius:8px;padding:6px 10px;font-size:14px;background:#fcfdff}
  .opts li.hit{background:var(--hit);border-color:var(--hitline)}
  .tick{color:var(--hitline);font-weight:800}
  details{border-top:1px dashed var(--line);padding-top:8px;margin-top:10px}
  summary{cursor:pointer;font-size:13px;color:var(--accent);font-weight:600;outline:none}
  .ans,.sol,.ver{font-size:14px;margin:8px 0 0}
  .ver{color:var(--muted);font-size:12.5px}
  footer{color:var(--muted);font-size:12px;text-align:center;margin-top:26px}
  @media print{
    body{background:#fff}
    .card{break-inside:avoid;border-color:#ccc}
    details{display:block}
    details>summary{list-style:none}
    .panel,.toc{break-inside:avoid}
  }
</style>
</head>
<body>
<div class="wrap">
  <h1>${esc(paper.setZh || paper.set)} · 整卷归档</h1>
  <p class="sub">
    英文原名：${esc(paper.fullName || paper.set)}　共 ${paper.totalQuestions} 题<br>
    原卷 PDF：<code>${esc(paper.sourceFile)}</code>　答案页：<code>${esc(paper.answerSheetImage)}</code>
  </p>

  <section class="panel">
    <h2>试卷结构</h2>
    <table>
      <tr><th>部分</th><th>题号</th><th>每题分值</th><th>题型</th><th>说明</th></tr>
      ${(paper.sections || []).map(s => `<tr><td>${esc(s.id)}</td><td>${esc(s.range)}</td><td>${esc(s.marks)}</td><td>${s.type === 'choice' ? '五选一' : '填空'}</td><td>${esc(s.note || '')}</td></tr>`).join('\n      ')}
    </table>
  </section>

  <section class="panel">
    <h2>答案一览</h2>
    <table class="keytbl"><tr>${keyRows}</tr></table>
  </section>

  <section class="panel">
    <h2>快速跳转</h2>
    <div class="toc">${(paper.questions || []).map(q => `<a href="#q${q.no}">${q.no}</a>`).join('')}</div>
  </section>

  ${cards}

  <footer>由 tools/build-paper-archive.js 从 ${esc(paper.__file || 'JSON')} 生成</footer>
</div>
</body>
</html>`;
}

/* ---------------- main ---------------- */
function process_(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const paper = JSON.parse(raw);
  paper.__file = path.relative(ROOT, file).replace(/\\/g, '/');
  const base = file.replace(/\.json$/i, '');
  fs.writeFileSync(base + '.md', buildMarkdown(paper), 'utf8');
  fs.writeFileSync(base + '.html', buildHtml(paper), 'utf8');
  console.log('✓', path.relative(ROOT, base) + '.md', '+', path.relative(ROOT, base) + '.html');
}

const args = process.argv.slice(2);
let files = args;
if (!files.length) {
  const dir = path.join(ROOT, 'papers');
  files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => path.join(dir, f)) : [];
}
if (!files.length) { console.log('没有找到要处理的 JSON'); process.exit(0); }
files.forEach(process_);
