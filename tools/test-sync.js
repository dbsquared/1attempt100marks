/* 同步自检：node tools/test-sync.js —— 多设备增量同步、幂等、冲突、墓碑、折行容错 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const ctx = { console, Math, JSON, Object, Array, Number, String, Date, isFinite };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/sync.js'), 'utf8'), ctx);
const S = ctx.Sync;

const log = [];
let ok = true;
function chk(name, cond, extra) { if (!cond) ok = false; log.push((cond ? '  OK  ' : ' FAIL ') + name + (extra ? '  ' + extra : '')); }
const T0 = Date.UTC(2026, 8, 1);

/* 造两台设备的本地状态 */
function dev(sid, devId) { return { sid, devId, p: {}, w: [] }; }
function ans(d, id, okFlag, t) {
  const s = d.p[id] || { id, seen: 0, ok: 0, bad: 0, streak: 0, mastered: false, due: 0, lastTs: 0 };
  s.seen++; s.lastTs = t;
  if (okFlag) { s.ok++; s.streak++; if (s.streak >= 3) s.mastered = true; s.due = t + s.streak * 86400000; }
  else { s.bad++; s.streak = 0; s.mastered = false; s.due = t; }
  d.p[id] = s;
  const wi = d.w.findIndex(x => x.id === id);
  if (!okFlag) {
    if (wi < 0) d.w.push({ id, need: 2, times: 1, lastTs: t });
    else { d.w[wi].need = Math.max(d.w[wi].need, 2); d.w[wi].times++; d.w[wi].lastTs = t; }
  } else if (wi >= 0) {
    d.w[wi].need--; d.w[wi].lastTs = t;   // 保留 need<=0 的墓碑，不删除
  }
}
const active = d => d.w.filter(x => x.need > 0);
function code(d, from, full) { return S.makeCode({ sid: d.sid, dev: d.devId, ts: Date.now(), full: full, from: from, progress: d.p, wrong: d.w }); }

/* 1. 往返一致 */
const A = dev('s7f3k', 'AAAA');
ans(A, 'm6-frac-add', false, T0 + 1000);
ans(A, 'm5-travel', true, T0 + 2000);
const c1 = code(A, 0, true);
const p1 = S.parseCode(c1);
chk('同步码往返：进度条数一致', p1.p.length === 2, JSON.stringify(p1.p.map(x => x[0])));
chk('同步码往返：错题条数一致', p1.w.length === 1);
chk('同步码往返：字段无损',
  p1.p.find(x => x[0] === 'm6-frac-add')[1] === 1 && p1.p.find(x => x[0] === 'm6-frac-add')[4] === 0 &&
  p1.p.find(x => x[0] === 'm5-travel')[4] === 1);

/* 2. 云端合并 + 另一台设备拉取 */
let cloud = S.normalize(null);
S.merge(cloud, p1);
chk('云端合并后含 2 个题型', S.count(cloud).p === 2);
const B = dev('s7f3k', 'BBBB');
const merged = S.toLocal(cloud);
chk('设备 B 拉到 A 的进度', merged.progress['m6-frac-add'] && merged.progress['m6-frac-add'].bad === 1);
chk('设备 B 拉到 A 的错题', merged.wrong.length === 1 && merged.wrong[0].id === 'm6-frac-add');
B.p = merged.progress; B.w = merged.wrong;   // 真实流程：先同步再练

/* 3. 幂等：同一段码重复合并无变化 */
const before = JSON.stringify(S.toCloud(cloud, 's7f3k').p);
const r2 = S.merge(cloud, p1);
S.merge(cloud, p1);
chk('重复合并：无新增无更新', r2.pNew === 0 && r2.pUpd === 0 && r2.wNew === 0 && r2.wUpd === 0);
chk('重复合并：内容不变', JSON.stringify(S.toCloud(cloud, 's7f3k').p) === before);

/* 4. 双向：B 在更晚时间练了新题型，A 也练了别的，合并后两边都在 */
ans(B, 'm5-travel', true, T0 + 9000);       // B 让 m5-travel 连对 1 次（晚于 A）
ans(B, 'm4-order-ops', false, T0 + 9500);
const cB = S.parseCode(code(B, Math.floor((T0 + 2000) / 1000), false));
chk('增量只带变化的题（1-2 条）', cB.p.length >= 1 && cB.p.length <= 2, '实际 ' + cB.p.length + ' 条');
S.merge(cloud, cB);
chk('合并后云端共 3 个题型', S.count(cloud).p === 3, JSON.stringify(Object.keys(cloud.p)));
chk('冲突时后写胜出（B 的连对 2 覆盖 A 的 1）', cloud.p['m5-travel'].streak === 2, 'streak=' + cloud.p['m5-travel'].streak);

/* 5. 墓碑：A 把错题清零后导出，云端应删掉该错题 */
ans(A, 'm6-frac-add', true, T0 + 20000);
ans(A, 'm6-frac-add', true, T0 + 21000);   // 连对 2 次 -> need 2->0
chk('A 本地错题已清零', active(A).filter(x => x.id === 'm6-frac-add').length === 0);
chk('A 保留了墓碑（供同步用）', A.w.some(x => x.id === 'm6-frac-add' && x.need <= 0));
const cA2 = S.parseCode(code(A, Math.floor((T0 + 2000) / 1000), false));
const rT = S.merge(cloud, cA2);
chk('已清零的错题在云端被删除', !cloud.w['m6-frac-add'], 'wDel=' + rT.wDel);

/* 6. 邮件折行容错 */
const wrapped = c1.replace(/(.{60})/g, '$1\n');
let parsedWrapped = null;
try { parsedWrapped = S.parseCode(wrapped); } catch (e) { }
chk('同步码被折行后仍能解析', !!parsedWrapped && parsedWrapped.p.length === 2);

/* 7. 体积：增量同步码要短到能塞进 mailto */
const big = dev('s7f3k', 'CCCC');
for (let i = 0; i < 200; i++) ans(big, 'tpl-' + i, i % 3 !== 0, T0 + i * 1000);
const cFull = code(big, 0, true);
const cDelta = code(big, Math.floor((T0 + 190 * 1000) / 1000), false);
chk('全量同步码（200 题型）长度合理', cFull.length < 20000, cFull.length + ' 字符');
chk('增量同步码足够短（可进 mailto）', cDelta.length < 1200, cDelta.length + ' 字符 / ' + S.parseCode(cDelta).p.length + ' 条');

/* 8. 不同 sid 互不干扰 */
const D = dev('zz999', 'DDDD');
ans(D, 'm6-frac-add', true, T0 + 30000);
const cloud2 = S.normalize(null);
S.merge(cloud2, S.parseCode(code(D, 0, true)));
chk('不同学生 ID 分文件存放互不干扰', S.count(cloud2).p === 1 && !cloud2.w['m6-frac-add']);

console.log(log.join('\n'));
console.log('-'.repeat(64));
console.log(ok ? '✓ 同步逻辑全部通过' : '✗ 存在失败项');
process.exit(ok ? 0 : 1);
