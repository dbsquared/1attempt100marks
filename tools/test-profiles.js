/* 多学生档案自检：node tools/test-profiles.js
 * 验证：默认档案、命名空间隔离、按 sid 路由导入、导出再导入、删除、旧数据迁移 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const PREFIX = 'a1p100:v1:';

function makeCtx(seed) {
  const ctx = { console, Math, JSON, Object, Array, Number, String, Date, isFinite, parseInt, parseFloat, Set };
  ctx.window = ctx; ctx.globalThis = ctx;
  const _ls = new Map();
  if (seed) Object.keys(seed).forEach(k => _ls.set(k, seed[k]));
  ctx.localStorage = {
    getItem: k => _ls.has(k) ? _ls.get(k) : null,
    setItem: (k, v) => _ls.set(k, String(v)),
    removeItem: k => _ls.delete(k),
    get length() { return _ls.size; },
    key: i => Array.from(_ls.keys())[i]
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/sync.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/store.js'), 'utf8'), ctx);
  ctx._ls = _ls;
  return ctx;
}

const log = []; let ok = true;
function chk(name, cond, extra) { if (!cond) ok = false; log.push((cond ? '  OK  ' : ' FAIL ') + name + (extra !== undefined ? '  ' + extra : '')); }

/* ---------- A. 全新启动 ---------- */
let c = makeCtx(); let S = c.Store;
let profs = S.profiles();
chk('全新启动：自动建 1 个默认学生', profs.length === 1, JSON.stringify(profs.map(p => p.name)));
chk('默认学生名为 学生1', profs[0].name === '学生1');
chk('默认学生沿用 sid a1m1（云端连续）', profs[0].sid === 'a1m1');
chk('默认学生即为当前', S.current().id === profs[0].id);
chk('当前学生进度初始为空', Object.keys(S.progress()).length === 0);

/* ---------- A2. 真实姓名判定 ---------- */
chk('默认档案名 学生1 不算已填真名', !S.isRealName('学生1'));
chk('空白名不算已填', !S.isRealName('   '));
chk('空名不算已填', !S.isRealName(''));
chk('真实姓名算已填', S.isRealName('小明'));
chk('当前默认学生尚未填真名', !S.currentHasRealName());

/* ---------- B. 多学生操作 ---------- */
let defId = profs[0].id;
let m = S.addProfile('小明');
chk('添加后共 2 个学生', S.profiles().length === 2);
chk('添加真实姓名后当前已填真名', S.currentHasRealName());
chk('添加后自动切换到新学生', S.current().name === '小明');
chk('新学生 sid 与默认不同', S.current().sid !== 'a1m1');
S.saveProgress({ 'x1': { seen: 3 } });
S.saveWrong([{ id: 'x1', need: 2 }]);
chk('小明进度已写入', !!S.progress()['x1']);
S.setCurrent(defId);
chk('切回默认后进度为空（命名空间隔离）', Object.keys(S.progress()).length === 0);
S.saveProgress({ 'y1': { seen: 1 } });
S.setCurrent(m.id);
chk('切回小明后看不到默认的进度', !S.progress()['y1'] && !!S.progress()['x1']);

/* ---------- B2. 改名（回归：曾因把 profiles() 读两次、第二次写回旧数据而失效） ---------- */
S.renameProfile(defId, '小红');
chk('改名写回本地', S.profileBySid('a1m1').name === '小红', S.profileBySid('a1m1').name);
chk('改名不波及其他学生', S.profileBySid(m.sid).name === '小明', S.profileBySid(m.sid).name);
S.renameProfile(m.id, '  小刚  ');
chk('改名自动 trim 空白', S.profileBySid(m.sid).name === '小刚', S.profileBySid(m.sid).name);
S.renameProfile(m.id, '');
chk('空名不改动（保留原名）', S.profileBySid(m.sid).name === '小刚', S.profileBySid(m.sid).name);

/* ---------- B3. 同名拒绝（避免手滑/跨设备造成同名副本） ---------- */
let beforeB3 = S.profiles().length;
let dupAdd = S.addProfile('小刚');             // 小刚 已存在（B2 把小明改名而来）
chk('同名添加被拒绝（返回 null）', dupAdd === null);
chk('同名添加不增加档案数', S.profiles().length === beforeB3, '' + S.profiles().length);
chk('profileByName 精确命中已存在档案', S.profileByName('小刚') && S.profileByName('小刚').sid === m.sid);
chk('profileByName 忽略首尾空格', !!S.profileByName('  小刚 '));
chk('profileByName 查不存在的名字返回 null', S.profileByName('不存在的人') === null);

/* ---------- B4. setProfileSid 迁移 + applyCloud 整份覆盖（修复「同名不同浏览器看到 7/42/0」） ---------- */
let c4 = makeCtx(); let S4 = c4.Store;
// 模拟一个浏览器：本地「丘小团」编号是随机的 abcde，且带着 42 条孤立错题（历史测试数据）
let q4 = S4.addProfile('丘小团');
let fakeSid = q4.sid;
S4.saveWrong(Array.from({ length: 42 }, (_, i) => ({ id: 'junk' + i, need: 2 })));
chk('本地丘小团带着 42 条错题', S4.wrongAll().length === 42, '' + S4.wrongAll().length);
S4.setProfileSid(q4.id, '43bgr');
chk('setProfileSid 改了编号', S4.profileByName('丘小团').sid === '43bgr', S4.profileByName('丘小团').sid);
chk('setProfileSid 迁移数据键（旧键删除/新键写入）',
  c4._ls.get(PREFIX + fakeSid + ':wrong') === undefined && c4._ls.has(PREFIX + '43bgr:wrong'));
// 云端权威记录：7 条错题 + 31 条进度
let cloud43 = {
  v: 1, sid: '43bgr', name: '丘小团',
  p: Array.from({ length: 31 }, (_, i) => ['p' + i, 1, 1, 0, 3, 1, 0, 1000]),
  w: Array.from({ length: 7 }, (_, i) => ['c' + i, 2, 1, 1000])
};
S4.setCurrent(q4.id);
let r4 = S4.applyCloud(cloud43, true);
chk('整份覆盖后：本机错题收敛到云端 7 条', S4.wrongAll().length === 7, '' + S4.wrongAll().length);
chk('整份覆盖后：本机进度收敛到云端 31 条', Object.keys(S4.progress()).length === 31, '' + Object.keys(S4.progress()).length);
// 空云端不覆盖：保护尚未合并到云端的新学生
let c5 = makeCtx(); let S5 = c5.Store;
S5.addProfile('新生'); S5.setCurrent(S5.profileByName('新生').id);
S5.saveWrong([{ id: 'local1', need: 2 }]);
let r5 = S5.applyCloud({ v: 1, sid: 'x', p: [], w: [] }, true);
chk('空云端整份覆盖不会抹掉本机进度', S5.wrongAll().length === 1 && r5.skippedEmpty === true, '' + S5.wrongAll().length);
// 合并模式（replace=false）对空云端保持原状
let r6 = S5.applyCloud({ v: 1, sid: 'x', p: [], w: [] }, false);
chk('合并模式对空云端保持本机进度', S5.wrongAll().length === 1, '' + S5.wrongAll().length);

/* ---------- C. 按 sid 路由导入 ---------- */
let s2 = S.ensureProfileBySid('kid99', 'AB12');
chk('ensureProfileBySid 新建并切换', S.current().sid === 'kid99' && S.profiles().length === 3);
S.ensureProfileBySid('kid99', 'ZZZZ');
chk('相同 sid 不重复建档案', S.profiles().length === 3 && S.current().sid === 'kid99');

/* ---------- D. 导出再导入（模拟另一台设备） ---------- */
let dump = S.exportAll();
chk('导出含 profiles 与 students', Array.isArray(dump.profiles) && Array.isArray(dump.students) && dump.profiles.length === 3);
let d = makeCtx(); let di = true;
try { d.Store.importAll(dump); } catch (e) { di = false; log.push('  FAIL 导入抛错 ' + e.message); }
chk('导入未抛错', di);
chk('导入后学生数一致', d.Store.profiles().length === 3, '' + d.Store.profiles().length);
let xiao = d.Store.profileBySid(m.sid); d.Store.setCurrent(xiao.id);
chk('导入后小明进度保留', !!d.Store.progress()['x1'] && d.Store.wrongAll().some(w => w.id === 'x1'));
let def = d.Store.profileBySid('a1m1'); d.Store.setCurrent(def.id);
chk('导入后默认学生进度保留', !!d.Store.progress()['y1']);

/* ---------- E. 删除 ---------- */
let cntBefore = S.profiles().length;
chk('删除学生成功', S.removeProfile(defId) === true);
chk('删除后少一个', S.profiles().length === cntBefore - 1);
chk('被删的 a1m1:progress 已不存在', !c._ls.has(PREFIX + 'a1m1:progress'));
S.removeProfile(S.profiles()[0].id);
S.removeProfile(S.profiles()[0].id); // 试图删最后一个
chk('不能删到少于 1 个学生', S.profiles().length >= 1, '' + S.profiles().length);

/* ---------- F. 旧单学生数据迁移 ---------- */
let seed = {};
seed[PREFIX + 'settings'] = JSON.stringify({ studentName: '老王', sid: 'a1m1', devId: 'ZZZZ', sessionSize: 10, newPerSession: 4 });
seed[PREFIX + 'progress'] = JSON.stringify({ 'm5-travel': { seen: 2, ok: 1 } });
seed[PREFIX + 'wrong'] = JSON.stringify([{ id: 'm5-travel', need: 1, times: 1 }]);
seed[PREFIX + 'lastSync'] = JSON.stringify(1700000000000);
let m2 = makeCtx(seed); let S2 = m2.Store;
let p2 = S2.profiles();
chk('迁移：建 1 个档案', p2.length === 1);
chk('迁移：姓名取自旧 studentName', p2[0].name === '老王', p2[0].name);
chk('迁移：沿用旧 sid a1m1', p2[0].sid === 'a1m1');
chk('迁移：devId 沿用', p2[0].devId === 'ZZZZ');
chk('迁移：旧进度已搬入命名空间', !!S2.progress()['m5-travel']);
chk('迁移：旧错题已搬入', S2.wrongAll().some(w => w.id === 'm5-travel'));
chk('迁移：lastSync 已搬入', S2.lastSync() === 1700000000000, '' + S2.lastSync());
chk('迁移：旧 settings 身份字段已清除', JSON.parse(m2._ls.get(PREFIX + 'settings')).studentName === undefined);

console.log(log.join('\n'));
console.log('-'.repeat(64));
console.log(ok ? '✓ 多学生档案逻辑全部通过' : '✗ 存在失败项');
process.exit(ok ? 0 : 1);
