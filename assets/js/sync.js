/*!
 * sync.js — 多设备同步：增量同步码的生成 / 解析 / 幂等合并
 * 浏览器与 Node（tools/merge-sync.js）共用同一份逻辑，保证两端合并结果一致。
 *
 * 同步码形如： A1M1{"v":1,"sid":"s7f3k","dev":"A1B2","ts":...,"full":0,
 *                    "p":[["m6-frac-add",12,9,3,2,1,20315,1789000000],...],
 *                    "w":[["m6-frac-add",2,3,1789000000],...]}
 *   p 记录：[题目id, 已练次数, 对, 错, 连对, 已掌握(0/1), 到期日(天), 更新时间(秒)]
 *   w 记录：[题目id, 还需答对次数, 错过次数, 更新时间(秒)]
 * 解析时会先去掉换行，所以被邮件客户端折行也能用。
 */
(function (root) {
  'use strict';

  var DAY = 86400000;
  var PREFIX = 'A1M1';

  /* ---------- 打包 ---------- */
  function packProgress(progress, fromSec, full) {
    var out = [];
    Object.keys(progress || {}).forEach(function (id) {
      var s = progress[id];
      if (!s || !s.seen) return;
      var u = Math.floor((s.lastTs || 0) / 1000);
      if (!full && fromSec && u <= fromSec) return;
      out.push([id, s.seen, s.ok, s.bad, s.streak || 0, s.mastered ? 1 : 0,
        Math.round((s.due || 0) / DAY), u]);
    });
    return out;
  }
  function packWrong(wrong, fromSec, full) {
    return (wrong || []).filter(function (x) {
      if (full || !fromSec) return true;
      return Math.floor((x.lastTs || 0) / 1000) > fromSec;
    }).map(function (x) {
      return [x.id, x.need, x.times, Math.floor((x.lastTs || 0) / 1000)];
    });
  }

  /* ---------- 规范形式：{ p:{id:rec}, w:{id:rec} } ---------- */
  function normalize(cloud) {
    var n = { p: {}, w: {}, updatedAt: 0 };
    if (!cloud) return n;
    n.updatedAt = cloud.updatedAt || 0;
    (cloud.p || []).forEach(function (a) {
      n.p[a[0]] = { seen: a[1], ok: a[2], bad: a[3], streak: a[4], mastered: !!a[5], due: a[6] * DAY, lastTs: a[7] * 1000 };
    });
    (cloud.w || []).forEach(function (a) {
      n.w[a[0]] = { id: a[0], need: a[1], times: a[2], lastTs: a[3] * 1000 };
    });
    return n;
  }
  /** 本机 Store.progress()/wrong() -> 云端打包格式 */
  function packLocal(progress, wrong) {
    return { p: packProgress(progress, 0, true), w: packWrong(wrong, 0, true) };
  }

  function densify(n) {
    var p = Object.keys(n.p).map(function (id) {
      var s = n.p[id];
      return [id, s.seen, s.ok, s.bad, s.streak || 0, s.mastered ? 1 : 0, Math.round((s.due || 0) / DAY), Math.floor((s.lastTs || 0) / 1000)];
    });
    var w = Object.keys(n.w).map(function (id) {
      var x = n.w[id];
      return [id, x.need, x.times, Math.floor((x.lastTs || 0) / 1000)];
    });
    return p.concat(w); // 仅用于长度统计
  }

  /* ---------- 合并：逐条比 updatedAt，后写胜出；云端没有而本地更旧 -> 视为已清除 ---------- */
  function merge(n, delta) {
    var r = { pNew: 0, pUpd: 0, wNew: 0, wUpd: 0, wDel: 0 };
    if (!delta) return r;

    (delta.p || []).forEach(function (a) {
      var id = a[0], cur = n.p[id];
      var u = a[7] * 1000;
      if (!cur) {
        n.p[id] = { seen: a[1], ok: a[2], bad: a[3], streak: a[4], mastered: !!a[5], due: a[6] * DAY, lastTs: u };
        r.pNew++;
      } else if (u > (cur.lastTs || 0)) {
        cur.seen = a[1]; cur.ok = a[2]; cur.bad = a[3]; cur.streak = a[4];
        cur.mastered = !!a[5]; cur.due = a[6] * DAY; cur.lastTs = u;
        r.pUpd++;
      }
    });

    (delta.w || []).forEach(function (a) {
      var id = a[0], cur = n.w[id];
      var u = a[3] * 1000;
      if (a[1] <= 0) {                       // 该错题已清零（墓碑）
        if (cur && (cur.lastTs || 0) <= u) { delete n.w[id]; r.wDel++; }
        return;
      }
      if (!cur) {
        n.w[id] = { id: id, need: a[1], times: a[2], lastTs: u };
        r.wNew++;
      } else if (u > (cur.lastTs || 0)) {
        cur.need = a[1]; cur.times = a[2]; cur.lastTs = u;
        r.wUpd++;
      }
    });
    return r;
  }

  /* ---------- 同步码 ---------- */
  function makeCode(o) {
    var payload = {
      v: 1,
      sid: o.sid,
      dev: o.dev,
      ts: Math.floor((o.ts || Date.now()) / 1000),
      full: o.full ? 1 : 0,
      p: packProgress(o.progress, o.from, o.full),
      w: packWrong(o.wrong, o.from, o.full).map(function (a) {
        // 已清零的错题也要带墓碑，否则别的设备不会删
        return a;
      })
    };
    // 追加"已清零"墓碑：本地错题本里没有、但 from 之后被清掉的，无法追溯，忽略
    return PREFIX + JSON.stringify(payload);
  }

  function parseCode(str) {
    if (!str) throw new Error('同步码为空');
    var s = String(str).replace(/[\r\n]+/g, '').trim();
    var i = s.indexOf('{');
    if (i < 0) throw new Error('找不到同步码内容');
    s = s.slice(i);
    var o = JSON.parse(s);
    if (!o || o.v !== 1) throw new Error('同步码版本不对');
    return o;
  }

  /* ---------- 云端文件格式 ---------- */
  function toCloud(n, sid) {
    return {
      v: 1,
      sid: sid,
      updatedAt: Date.now(),
      p: Object.keys(n.p).map(function (id) {
        var s = n.p[id];
        return [id, s.seen, s.ok, s.bad, s.streak || 0, s.mastered ? 1 : 0, Math.round((s.due || 0) / DAY), Math.floor((s.lastTs || 0) / 1000)];
      }),
      w: Object.keys(n.w).map(function (id) {
        var x = n.w[id];
        return [id, x.need, x.times, Math.floor((x.lastTs || 0) / 1000)];
      })
    };
  }

  /** 把规范形式转回 Store 需要的 progress / wrong */
  function toLocal(n) {
    var progress = {}, wrong = [];
    Object.keys(n.p).forEach(function (id) {
      var s = n.p[id];
      progress[id] = { id: id, seen: s.seen, ok: s.ok, bad: s.bad, streak: s.streak, best: s.streak, level: 0, due: s.due, lastTs: s.lastTs, mastered: !!s.mastered };
    });
    Object.keys(n.w).forEach(function (id) {
      var x = n.w[id];
      wrong.push({ id: id, need: x.need, times: x.times, firstTs: x.lastTs, lastTs: x.lastTs });
    });
    return { progress: progress, wrong: wrong };
  }

  function randomId(n) {
    var s = '';
    var cs = 'abcdefghijkmnpqrstuvwxyz23456789';
    for (var i = 0; i < (n || 6); i++) s += cs[Math.floor(Math.random() * cs.length)];
    return s;
  }

  var Sync = {
    PREFIX: PREFIX,
    packProgress: packProgress,
    packWrong: packWrong,
    normalize: normalize,
    packLocal: packLocal,
    merge: merge,
    makeCode: makeCode,
    parseCode: parseCode,
    toCloud: toCloud,
    toLocal: toLocal,
    randomId: randomId,
    count: function (n) { return { p: Object.keys(n.p).length, w: Object.keys(n.w).length }; }
  };

  root.Sync = Sync;
  if (typeof module !== 'undefined' && module.exports) module.exports = Sync;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
