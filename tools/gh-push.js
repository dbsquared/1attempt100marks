/*!
 * gh-push.js — 当本机 git 走 HTTPS 被卡住时，用 GitHub Git Data API 直接提交整个工作区
 * 用法：GITHUB_TOKEN=ghp_xxx node tools/gh-push.js "提交说明"
 */
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');

const REPO = 'dbsquared/1attempt100marks';
const TOKEN = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN ||
  (fs.existsSync(path.join(os.homedir(), '.gh_token_1a1m'))
    ? fs.readFileSync(path.join(os.homedir(), '.gh_token_1a1m'), 'utf8').trim() : ''));
const MSG = process.argv[2] || 'update from WorkBuddy';
const root = path.join(__dirname, '..');

if (!TOKEN) { console.error('缺少 GITHUB_TOKEN'); process.exit(1); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghpush-'));
function curl(method, url, body) {
  const args = ['-s', '-m', '60', '-X', method,
    '-H', 'Authorization: Bearer ' + TOKEN,
    '-H', 'Accept: application/vnd.github+json',
    '-H', 'X-GitHub-Api-Version: 2022-11-28'];
  let f = null;
  if (body !== undefined) {
    f = path.join(tmp, 'body.json');
    fs.writeFileSync(f, JSON.stringify(body));
    args.push('-d', '@' + f.replace(/\\/g, '/'));
  }
  args.push(url);
  const out = execFileSync('curl', args, { maxBuffer: 64 * 1024 * 1024 }).toString();
  try { return JSON.parse(out); } catch (e) { return { raw: out }; }
}
const API = 'https://api.github.com/repos/' + REPO;

/* 0. 仓库为空时，先用 Contents API 建一个初始提交（Git Data API 不能操作空仓库） */
const meta = curl('GET', 'https://api.github.com/repos/' + REPO);
const BRANCH = (meta && meta.default_branch) || 'main';
if (!curl('GET', API + '/git/ref/heads/' + BRANCH).object) {
  const first = { path: 'README.md', message: 'init', content: Buffer.from('# ' + REPO + '\n').toString('base64') };
  const r0 = curl('PUT', API + '/contents/README.md', first);
  if (!r0.commit) { console.error('初始化空仓库失败: ' + JSON.stringify(r0).slice(0, 300)); process.exit(1); }
  console.log('空仓库已初始化（分支 ' + BRANCH + '）');
}

/* 1. 收集文件 */
const SKIP = new Set(['.git', 'node_modules', '.workbuddy', '.chromeprofile']);
const files = [];
(function walk(dir, rel) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = path.join(dir, name), r = rel ? rel + '/' + name : name;
    if (fs.statSync(full).isDirectory()) walk(full, r);
    else files.push({ path: r, full });
  }
})(root, '');
console.log('待提交文件 ' + files.length + ' 个');

/* 2. 逐个建 blob */
const tree = [];
for (const f of files) {
  const content = fs.readFileSync(f.full).toString('base64');
  const r = curl('POST', API + '/git/blobs', { content, encoding: 'base64' });
  if (!r.sha) { console.error('blob 失败 ' + f.path + ': ' + JSON.stringify(r).slice(0, 200)); process.exit(1); }
  tree.push({ path: f.path.replace(/\\/g, '/'), mode: '100644', type: 'blob', sha: r.sha });
  process.stdout.write('.');
}
console.log('\nblob 完成');

/* 3. 建 tree */
const t = curl('POST', API + '/git/trees', { tree });
if (!t.sha) { console.error('tree 失败: ' + JSON.stringify(t).slice(0, 300)); process.exit(1); }

/* 4. 当前分支指向 */
const ref = curl('GET', API + '/git/ref/heads/' + BRANCH);
const parents = ref.object && ref.object.sha ? [ref.object.sha] : [];

/* 5. 提交 */
const c = curl('POST', API + '/git/commits', { message: MSG, tree: t.sha, parents });
if (!c.sha) { console.error('commit 失败: ' + JSON.stringify(c).slice(0, 300)); process.exit(1); }

/* 6. 移动分支指针 */
let r2 = curl('PATCH', API + '/git/refs/heads/' + BRANCH, { sha: c.sha });
if (!r2.object) r2 = curl('POST', API + '/git/refs', { ref: 'refs/heads/' + BRANCH, sha: c.sha });
if (!r2.object) { console.error('更新 ref 失败: ' + JSON.stringify(r2).slice(0, 300)); process.exit(1); }

console.log('✓ 已提交 ' + c.sha.slice(0, 7) + ' → ' + BRANCH + '（' + files.length + ' 个文件）');
console.log('  https://github.com/' + REPO + '/commit/' + c.sha);
