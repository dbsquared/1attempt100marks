/*!
 * mail-sync.js — 从「邮件正文」里抠出同步码并合并入库（后台自动汇报用）
 *
 * 背景：交卷后前端用 FormSubmit 把「答卷汇总 + A1M1 同步码」发到 Agent Mail。
 * FormSubmit 会把正文包成 HTML，且把同步码里的 " 转义成 &quot; ——  direct
 * JSON.parse 会失败。本脚本先做 HTML 反转义，再抠出所有同步码，合并逻辑
 * 完全复用 merge-sync.js（幂等）。
 *
 * 用法：
 *   node tools/mail-sync.js 邮件正文1.html [邮件正文2.html ...]
 *   cat mail.html | node tools/mail-sync.js          # 从 stdin 读
 *   node tools/mail-sync.js --dry 邮件正文.html      # 只抠码预览，不写盘
 *
 * 设计：合并交给 merge-sync.js，本脚本只负责「把邮件正文变成干净的同步码文件」。
 */
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const mergeSync = path.join(__dirname, 'merge-sync.js');

/* ---------- 收集参数 ---------- */
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const files = args.filter(a => a !== '--dry' && !a.startsWith('-'));
if (!files.length && !process.stdin.isTTY) {
  try { const s = fs.readFileSync(0, 'utf8'); if (s.trim()) files.push('(stdin)'); } catch (e) { }
}

/* ---------- HTML 实体反转义 ----------
 * FormSubmit 把 " → &quot;，也可能有 &lt;/&gt;/&amp;/&#39;。顺序很重要：
 * &amp; 必须最后替换，否则双重转义（&amp;quot;）会被提前解成 &quot; 再留下引号。 */
function htmlUnescape(s) {
  return String(s)
    .replace(/&#x27;|&#39;|&apos;/gi, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/gi, '/')
    .replace(/&amp;/g, '&');
}

/* ---------- 抠同步码 ---------- */
function extractCodes(text) {
  const clean = htmlUnescape(text);
  const re = /A1M1\s*\{[^\n]*?\]\}/g;
  const codes = [];
  let m;
  while ((m = re.exec(clean))) codes.push(m[0].replace(/[\r\n]+/g, ''));
  return codes;
}

/* ---------- 读取输入 ---------- */
let raw = '';
for (const f of files) {
  try {
    if (f === '(stdin)') raw += fs.readFileSync(0, 'utf8') + '\n';
    else raw += fs.readFileSync(f, 'utf8') + '\n';
  } catch (e) { console.error('× 读输入失败 ' + f + '：' + e.message); }
}

if (!raw.trim()) {
  console.error('没有邮件正文输入。用法：node tools/mail-sync.js 邮件.html  或  cat mail.html | node tools/mail-sync.js');
  process.exit(1);
}

const codes = extractCodes(raw);
if (!codes.length) {
  console.log('邮件正文里没有同步码（可能不是汇报邮件，或已被处理）。');
  process.exit(0);
}
console.log('从邮件正文抠出 ' + codes.length + ' 段同步码');

/* ---------- 交给 merge-sync.js 合并（幂等） ---------- */
const tmp = path.join(os.tmpdir(), 'a1m1-mail-codes-' + process.pid + '.txt');
fs.writeFileSync(tmp, codes.join('\n') + '\n', 'utf8');
try {
  const mergeArgs = [mergeSync].concat(dry ? ['--dry'] : [], ['-f', tmp]);
  const out = execFileSync(process.execPath, mergeArgs, { cwd: root, encoding: 'utf8' });
  process.stdout.write(out);
} catch (e) {
  process.stdout.write((e.stdout || '') + (e.stderr || ''));
  console.error('合并失败（exit ' + e.status + '）');
  process.exitCode = e.status || 1;
} finally {
  try { fs.unlinkSync(tmp); } catch (e) { }
}
