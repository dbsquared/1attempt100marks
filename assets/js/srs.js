/*!
 * srs.js — 掌握度追踪 / 错题调度 / 间隔重复抽样检测
 *
 * 规则：
 *  · 答错 -> 该题型进入错题本，下次测试自动携带【新数值】的同型题
 *  · 答对 -> 连续答对 masterStreak 次判定"掌握"，按 1/2/4/7/15/30/60 天递增安排抽样检测
 *  · 已掌握但到期的题，会以"抽样检测"形式不定期出现
 */
(function (global) {
  'use strict';

  var DAY = 86400000;
  var INTERVALS = [1, 2, 4, 7, 15, 30, 60];   // 天

  function now() { return Date.now(); }

  function getState(id) {
    var p = global.Store.progress();
    if (!p[id]) {
      p[id] = { id: id, seen: 0, ok: 0, bad: 0, streak: 0, best: 0, level: 0, due: 0, lastTs: 0, mastered: false };
      global.Store.saveProgress(p);
    }
    return p[id];
  }

  function intervalDays(streak) {
    return INTERVALS[Math.min(Math.max(streak - 1, 0), INTERVALS.length - 1)];
  }

  var SRS = {
    state: getState,
    intervalDays: intervalDays,

    /** 记录一次作答 */
    record: function (id, ok, extra) {
      var s = global.Store.settings();
      var p = global.Store.progress();
      var st = p[id] || { id: id, seen: 0, ok: 0, bad: 0, streak: 0, best: 0, level: 0, due: 0, lastTs: 0, mastered: false };
      st.seen++;
      st.lastTs = now();

      if (ok) {
        st.ok++; st.streak++;
        if (st.streak > st.best) st.best = st.streak;
        if (st.streak >= s.masterStreak) st.mastered = true;
        st.level = Math.min(st.streak, INTERVALS.length);
        st.due = now() + intervalDays(st.streak) * DAY;
      } else {
        st.bad++; st.streak = 0; st.level = 0; st.mastered = false;
        st.due = now();       // 立刻到期 —— 下一次测试就会出现
      }
      p[id] = st;
      global.Store.saveProgress(p);

      // 错题本维护（用 wrongAll，保留 need<=0 的墓碑以便同步"已清零"）
      var w = global.Store.wrongAll();
      var idx = -1;
      for (var i = 0; i < w.length; i++) if (w[i].id === id) { idx = i; break; }
      if (!ok) {
        if (idx < 0) { w.push({ id: id, need: 0, times: 0, firstTs: now(), lastTs: now() }); idx = w.length - 1; }
        w[idx].need = Math.max(w[idx].need, s.wrongNeed);
        w[idx].times++;
        w[idx].lastTs = now();
        if (extra) { w[idx].lastGiven = extra.given; w[idx].lastExpected = extra.expected; w[idx].lastStem = extra.stem; }
      } else if (idx >= 0) {
        w[idx].need -= 1;
        w[idx].lastTs = now();
        if (extra) { w[idx].lastGiven = extra.given; w[idx].lastExpected = extra.expected; }
      }
      global.Store.saveWrong(w);
      return st;
    },

    /** 到期的题（含错题与待抽样检测） */
    dueIds: function () {
      var p = global.Store.progress(), t = now(), out = [];
      Object.keys(p).forEach(function (id) { if ((p[id].due || 0) <= t) out.push(id); });
      return out;
    },

    wrongIds: function () { return global.Store.wrong().map(function (x) { return x.id; }); },

    newIds: function (allIds) {
      var p = global.Store.progress();
      return allIds.filter(function (id) { return !p[id] || !p[id].seen; });
    },

    /**
     * 组一次测试
     * mode: daily(默认) | wrong(只练错题) | review(抽样检测) | topic(按知识点) | random(随机抽测)
     */
    buildSession: function (opts) {
      opts = opts || {};
      var s = global.Store.settings();
      var all = (opts.templates || global.Bank.all()).map(function (t) { return t.id; });
      var size = opts.size || s.sessionSize;
      var p = global.Store.progress();
      var w = global.Store.wrong();
      var t = now();
      var picked = [], used = {};
      function add(id, reason) { if (used[id] || picked.length >= (reason === 'wrong' ? 999 : size)) return; used[id] = 1; picked.push({ id: id, reason: reason }); }

      if (opts.mode === 'wrong') {
        w.slice().sort(function (a, b) { return (a.lastTs || 0) - (b.lastTs || 0); })
          .forEach(function (x) { add(x.id, 'wrong'); });
        return picked;
      }
      if (opts.mode === 'review') {
        Object.keys(p).filter(function (id) { return p[id].mastered && (p[id].due || 0) <= t && all.indexOf(id) >= 0; })
          .sort(function (a, b) { return p[a].due - p[b].due; })
          .forEach(function (id) { add(id, 'review'); });
        return picked.slice(0, size);
      }
      if (opts.mode === 'topic') {
        var pool = all.filter(function (id) {
          var tp = global.Bank.byId(id); return tp && tp.topic === opts.topic;
        });
        shuffle(pool).slice(0, size).forEach(function (id) { add(id, 'topic'); });
        return picked;
      }
      if (opts.mode === 'random') {
        shuffle(all).slice(0, size).forEach(function (id) { add(id, 'random'); });
        return picked;
      }

      // daily：错题 -> 到期复习 -> 新题 -> 补足
      w.slice().sort(function (a, b) { return (a.lastTs || 0) - (b.lastTs || 0); })
        .forEach(function (x) { if (all.indexOf(x.id) >= 0) add(x.id, 'wrong'); });

      var dueP = Object.keys(p).filter(function (id) {
        return (p[id].due || 0) <= t && all.indexOf(id) >= 0 && !used[id];
      }).sort(function (a, b) { return (p[a].due || 0) - (p[b].due || 0); });
      dueP.forEach(function (id) { add(id, p[id].mastered ? 'review' : 'wrong'); });

      var cnt = 0;
      shuffle(SRS.newIds(all)).forEach(function (id) {
        if (cnt >= s.newPerSession) return;
        if (used[id]) return;
        add(id, 'new'); cnt++;
      });

      // 补足顺序：练过但未掌握 -> 已掌握(巩固) -> 完全没见过的新题
      if (picked.length < size) {
        shuffle(all.filter(function (id) { return !used[id] && p[id] && p[id].seen && !p[id].mastered; }))
          .forEach(function (id) { add(id, 'extra'); });
      }
      if (picked.length < size) {
        shuffle(all.filter(function (id) { return !used[id] && p[id] && p[id].mastered; }))
          .forEach(function (id) { add(id, 'review'); });
      }
      if (picked.length < size) {
        shuffle(all.filter(function (id) { return !used[id]; }))
          .forEach(function (id) { add(id, 'new'); });
      }
      // 错题排在最前（当场巩固），其余保持随机
      var wrongPart = picked.filter(function (x) { return x.reason === 'wrong'; });
      var restPart = shuffle(picked.filter(function (x) { return x.reason !== 'wrong'; }));
      return wrongPart.concat(restPart).slice(0, Math.max(size, wrongPart.length));
    },

    /** 掌握度总览 */
    stats: function () {
      var p = global.Store.progress();
      var all = global.Bank.all();
      var w = global.Store.wrong();
      var t = now();
      var mastered = 0, seen = 0, due = 0, ok = 0, bad = 0;
      all.forEach(function (tp) {
        var st = p[tp.id];
        if (!st || !st.seen) return;
        seen++;
        ok += st.ok; bad += st.bad;
        if (st.mastered) mastered++;
        if ((st.due || 0) <= t) due++;
      });
      var h = global.Store.history();
      var last7 = h.filter(function (x) { return t - x.ts < 7 * DAY; });
      return {
        total: all.length,
        seen: seen,
        unseen: all.length - seen,
        mastered: mastered,
        wrong: w.length,
        due: due,
        attempts: ok + bad,
        accuracy: (ok + bad) ? Math.round(ok / (ok + bad) * 100) : 0,
        recent7: last7.length,
        recent7acc: last7.length ? Math.round(last7.filter(function (x) { return x.ok; }).length / last7.length * 100) : 0,
        rate: all.length ? Math.round(mastered / all.length * 100) : 0
      };
    },

    /** 每个知识点的掌握情况 */
    byTopic: function () {
      var p = global.Store.progress();
      var map = {};
      global.Bank.all().forEach(function (tp) {
        var k = (tp.subject || '未分类') + ' / ' + (tp.topic || '未分类');
        if (!map[k]) map[k] = { topic: k, total: 0, mastered: 0, seen: 0, bad: 0, ok: 0 };
        var m = map[k]; m.total++;
        var st = p[tp.id];
        if (st && st.seen) { m.seen++; m.ok += st.ok; m.bad += st.bad; if (st.mastered) m.mastered++; }
      });
      return Object.keys(map).map(function (k) { return map[k]; })
        .sort(function (a, b) { return (b.bad) - (a.bad) || a.topic.localeCompare(b.topic); });
    }
  };

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  global.SRS = SRS;
  global.shuffle = shuffle;
})(window);
