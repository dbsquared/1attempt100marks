/*!
 * merge-sync.js — 把学生设备生成的同步码合并进 data/state/<sid>.json
 *
 * 用法：
 *   node tools/merge-sync.js "A1M1{...}"                 # 直接跟同步码（可多个）
 *   node tools/merge-sync.js -f 收到的邮件.txt            # 从文件里自动抠出所有 A1M1{...}
 *   cat mail.txt | node tools/merge-sync.js               # 从 stdin 读
 *   node tools/merge-sync.js --dry "A1M1{...}"            # 只看结果不写盘
 *
 * 合并是幂等的：同一段同步码重复合并不会产生任何变化。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const stateDir = path.join(root, 'data', 'state');

/* 在最小沙箱里加载浏览器端同一份 sync.js，保证两端逻辑一致 */
const ctx = { console, Math, JSON, Object, Array, Number, String, Date, isFinite };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/sync.js'), 'utf8'), ctx);
const Sync = ctx.Sync;

/* ---------- 收集同步码 ---------- */
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const codes = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dry') continue;
  if (args[i] === '-f' && args[i + 1]) { collect(fs.readFileSync(args[i + 1], 'utf8')); i++; continue; }
  if (args[i].startsWith('-')) continue;
  collect(args[i]);
}
if (!codes.length && !process.stdin.isTTY) {
  try { collect(fs.readFileSync(0, 'utf8')); } catch (e) { /* 无 stdin */ }
}
function collect(text) {
  const re = /A1M1\s*\{[^\n]*?\]\}/g;
  let m;
  while ((m = re.exec(text))) codes.push(m[0]);
  if (!codes.length && text.includes('A1M1')) {
    const i = text.indexOf('A1M1');
    codes.push(text.slice(i).replace(/\s+$/, ''));
  }
}
if (!codes.length) {
  console.error('没有找到同步码。用法：node tools/merge-sync.js "A1M1{...}"  或  -f 邮件.txt');
  process.exit(1);
}

/* ---------- 逐个合并 ---------- */
const bySid = {};
let fail = 0;
for (const code of codes) {
  let d;
  try { d = Sync.parseCode(code); } catch (e) { console.error('× 解析失败：' + e.message); fail++; continue; }
  if (!bySid[d.sid]) {
    const f = path.join(stateDir, d.sid + '.json');
    const base = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
    bySid[d.sid] = { norm: Sync.normalize(base), file: f, existed: !!base };
  }
  const s = bySid[d.sid];
  const r = Sync.merge(s.norm, d);
  const c = Sync.count(s.norm);
  console.log('  ' + d.sid + ' ← 设备 ' + d.dev + (d.full ? '（全量）' : '（增量）') +
    '  进度 新增' + r.pNew + '/更新' + r.pUpd + '  错题 新增' + r.wNew + '/更新' + r.wUpd + '/清除' + r.wDel +
    '  合并后：' + c.p + ' 个题型、' + c.w + ' 条错题');
}

if (dry) { console.log('[dry-run] 未写盘'); process.exit(0); }

if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
for (const sid of Object.keys(bySid)) {
  const s = bySid[sid];
  fs.writeFileSync(s.file, JSON.stringify(Sync.toCloud(s.norm, sid), null, 2) + '\n');
  console.log('✓ 已写入 ' + path.relative(root, s.file) + (s.existed ? '' : '（新建）'));
}
console.log('\n下一步：node tools/gh-push.js "同步学生进度"');
process.exit(fail ? 1 : 0);
