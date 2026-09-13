/* gh-audit.js — 推送前审计：对比「本地工作区」和「GitHub 上的 main」，
   列出 (a) 远程有、本地没有的文件（推送会被删掉）、(b) 内容不同的文件。
   用法：node tools/gh-audit.js [--json]
   背景：gh-push.js 是把整个工作区建成一棵 tree 直接替换远程的，
   所以先跑这个检查，避免把另一个会话提交的文件覆盖掉。 */
const fs = require('fs'), path = require('path'), os = require('os');
const crypto = require('crypto');

const REPO = 'dbsquared/1attempt100marks';
const TOKEN = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN ||
  (fs.existsSync(path.join(os.homedir(), '.gh_token_1a1m'))
    ? fs.readFileSync(path.join(os.homedir(), '.gh_token_1a1m'), 'utf8').trim() : ''));
const root = path.join(__dirname, '..');
if (!TOKEN) { console.error('缺少 GITHUB_TOKEN'); process.exit(1); }

function api(url) {
  const out = require('child_process').execFileSync('curl', ['-s', '-m', '90',
    '-H', 'Authorization: Bearer ' + TOKEN,
    '-H', 'Accept: application/vnd.github+json',
    '-H', 'X-GitHub-Api-Version: 2022-11-28', url], { maxBuffer: 256 * 1024 * 1024 }).toString();
  return JSON.parse(out);
}

/* 本地：git blob sha = sha1("blob <len>\0" + content) */
function blobSha(buf) {
  return crypto.createHash('sha1').update('blob ' + buf.length + '\0').update(buf).digest('hex');
}

const SKIP = new Set(['.git', 'node_modules', '.workbuddy', '.chromeprofile']);
/* 与 gh-push.js 保持一致：生成物不提交 */
const SKIP_RE = [/^tools\/_[^/]*preview[^/]*\.html$/i];
const local = new Map();
(function walk(dir, rel) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = path.join(dir, name), r = (rel ? rel + '/' + name : name).replace(/\\/g, '/');
    if (fs.statSync(full).isDirectory()) walk(full, rel ? rel + '/' + name : name);
    else if (!SKIP_RE.some(re => re.test(r))) local.set(r, blobSha(fs.readFileSync(full)));
  }
})(root, '');

const ref = api('https://api.github.com/repos/' + REPO + '/git/ref/heads/main');
const treeSha = ref.object.sha;
const commit = api('https://api.github.com/repos/' + REPO + '/git/commits/' + treeSha);
const tree = api('https://api.github.com/repos/' + REPO + '/git/trees/' + commit.tree.sha + '?recursive=1');
const remote = new Map();
(tree.tree || []).forEach(x => { if (x.type === 'blob') remote.set(x.path, x.sha); });

console.log('远程 main = ' + treeSha.slice(0, 7) + '（' + remote.size + ' 个文件）');
console.log('本地工作区 = ' + local.size + ' 个文件');

const onlyRemote = [], differ = [], onlyLocal = [];
remote.forEach((sha, p) => {
  if (!local.has(p)) onlyRemote.push(p);
  else if (local.get(p) !== sha) differ.push(p);
});
local.forEach((sha, p) => { if (!remote.has(p)) onlyLocal.push(p); });

const isPreview = p => /_preview\w*\.html$|_figs-preview/.test(p);
if (onlyRemote.length) {
  console.log('\n⚠ 远程有、本地没有（推送会删掉这些！）：');
  onlyRemote.forEach(p => console.log('   - ' + p));
} else console.log('\n✓ 没有「远程有本地没有」的文件');

console.log('\n内容不同的文件（' + differ.length + '）：');
differ.forEach(p => console.log('   * ' + p + (isPreview(p) ? '   ← 生成物，建议不要提交' : '')));

if (onlyLocal.length) {
  console.log('\n只在本地（会新增）：' + onlyLocal.length);
  onlyLocal.slice(0, 40).forEach(p => console.log('   + ' + p + (isPreview(p) ? '   ← 生成物，建议不要提交' : '')));
  if (onlyLocal.length > 40) console.log('   ...共 ' + onlyLocal.length + ' 个');
}
if (process.argv.indexOf('--json') >= 0) {
  console.log('\n' + JSON.stringify({ onlyRemote, differ, onlyLocal }));
}
