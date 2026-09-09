/*!
 * store.js — 本地持久化（localStorage）+ 题库装载
 * 所有学生数据只存在本机浏览器，不上传任何服务器。
 */
(function (global) {
  'use strict';

  var PREFIX = 'a1p100:v1:';

  function read(key, def) {
    try {
      var raw = localStorage.getItem(PREFIX + key);
      if (raw === null || raw === undefined) return def;
      return JSON.parse(raw);
    } catch (e) { return def; }
  }
  function write(key, val) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); return true; }
    catch (e) { console.warn('写入失败', e); return false; }
  }

  var DEFAULT_SETTINGS = {
    studentName: '',
    sid: '',            // 学生 ID，多设备共用一个才能同步
    devId: '',          // 本机标识
    autoSync: true,     // 打开页面时自动拉取云端进度
    agentMail: '',      // WorkBuddy 智能体邮箱地址（用于"发到 WorkBuddy 自动同步"）
    sessionSize: 10,        // 每次测试题量
    newPerSession: 4,       // 每次最多引入的新题型
    masterStreak: 3,        // 连续答对多少次算"掌握"
    wrongNeed: 2,           // 错题需要额外答对多少次才移出错题本
    retryInSession: false,  // 错题是否当场换数重练
    shuffle: true
  };

  var Store = {
    /* ---------- 设置 ---------- */
    settings: function () {
      var s = read('settings', null);
      if (!s) { s = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); write('settings', s); }
      // 补齐新增字段
      var changed = false;
      Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
        if (s[k] === undefined) { s[k] = DEFAULT_SETTINGS[k]; changed = true; }
      });
      if (!s.sid || !s.devId) {
        s.sid = s.sid || ('s' + global.Sync.randomId(5));
        s.devId = s.devId || global.Sync.randomId(4).toUpperCase();
        changed = true;
      }
      if (changed) write('settings', s);
      return s;
    },
    saveSettings: function (s) { write('settings', s); },

    /* ---------- 同步 ---------- */
    lastSync: function () { return read('lastSync', 0) || 0; },
    setLastSync: function (ts) { write('lastSync', ts); },
    /** 用云端状态合并本机；返回统计 */
    applyCloud: function (cloud) {
      var n = global.Sync.normalize(cloud);
      var cur = global.Sync.normalize(global.Sync.packLocal(Store.progress(), Store.wrongAll()));
      var r = global.Sync.merge(cur, { p: cloud.p, w: cloud.w });
      var out = global.Sync.toLocal(cur);
      Store.saveProgress(out.progress);
      Store.saveWrong(out.wrong);
      Store.setLastSync(Date.now());
      return r;
    },

    /* ---------- 进度 ---------- */
    progress: function () { return read('progress', {}) || {}; },
    saveProgress: function (p) { write('progress', p); },

    /* ---------- 错题本 ----------
     * 内部保存 need<=0 的"墓碑"记录，这样"已清零"这件事才能同步给别的设备。
     * 对外读取一律用 wrong()（只返回 need>0），需要同步时用 wrongAll()。 */
    wrong: function () { return (read('wrong', []) || []).filter(function (x) { return x.need > 0; }); },
    wrongAll: function () { return read('wrong', []) || []; },
    saveWrong: function (w) { write('wrong', w); },

    /* ---------- 历史 ---------- */
    history: function () { return read('history', []) || []; },
    pushHistory: function (rec) {
      var h = Store.history();
      h.push(rec);
      if (h.length > 3000) h = h.slice(h.length - 3000);
      write('history', h);
    },

    /* ---------- 自定义题库（由 WorkBuddy 生成后导入） ---------- */
    customBank: function () { return read('bank', []) || []; },
    saveCustomBank: function (list) { write('bank', list); },
    mergeCustomBank: function (list) {
      var cur = Store.customBank();
      var map = {};
      cur.forEach(function (t) { map[t.id] = t; });
      var added = 0, updated = 0;
      (list || []).forEach(function (t) {
        if (!t || !t.id) return;
        if (map[t.id]) { map[t.id] = t; updated++; } else { map[t.id] = t; added++; }
      });
      var out = Object.keys(map).map(function (k) { return map[k]; });
      Store.saveCustomBank(out);
      return { added: added, updated: updated, total: out.length };
    },
    clearCustomBank: function () { write('bank', []); },

    /* ---------- 套卷 ---------- */
    papers: function () { return read('papers', []) || []; },
    savePaper: function (p) {
      var ps = Store.papers();
      ps.unshift(p);
      if (ps.length > 30) ps = ps.slice(0, 30);
      write('papers', ps);
    },
    removePaper: function (id) {
      write('papers', Store.papers().filter(function (p) { return p.id !== id; }));
    },

    /* ---------- 导入导出 ---------- */
    exportAll: function () {
      return {
        v: 1,
        exportedAt: new Date().toISOString(),
        settings: Store.settings(),
        progress: Store.progress(),
        wrong: Store.wrong(),
        history: Store.history(),
        bank: Store.customBank()
      };
    },
    importAll: function (data) {
      if (!data || typeof data !== 'object') throw new Error('数据格式不正确');
      if (data.settings) write('settings', data.settings);
      if (data.progress) write('progress', data.progress);
      if (data.wrong) write('wrong', data.wrong);
      if (data.history) write('history', data.history);
      if (data.bank) write('bank', data.bank);
      return true;
    },
    resetProgress: function () {
      ['progress', 'wrong', 'history'].forEach(function (k) { localStorage.removeItem(PREFIX + k); });
    },
    wipe: function () {
      Object.keys(localStorage).filter(function (k) { return k.indexOf(PREFIX) === 0; })
        .forEach(function (k) { localStorage.removeItem(k); });
    }
  };

  /* ---------- 题库：远端 JSON + 本地自定义 合并 ---------- */
  var Bank = {
    base: [],
    loaded: false,
    load: function (url) {
      url = url || 'data/question-bank.json';
      return fetch(url, { cache: 'no-store' })
        .then(function (r) {
          if (!r.ok) throw new Error('题库加载失败 HTTP ' + r.status);
          return r.json();
        })
        .then(function (j) {
          Bank.base = (j && j.templates) ? j.templates : [];
          Bank.meta = j || {};
          Bank.loaded = true;
          return Bank.all();
        });
    },
    all: function () {
      var map = {};
      Bank.base.forEach(function (t) { map[t.id] = t; });
      Store.customBank().forEach(function (t) { map[t.id] = t; });   // 自定义覆盖同 id
      return Object.keys(map).map(function (k) { return map[k]; });
    },
    byId: function (id) {
      var all = Bank.all();
      for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
      return null;
    },
    subjects: function () {
      var s = {}; Bank.all().forEach(function (t) { s[t.subject || '未分类'] = 1; });
      return Object.keys(s);
    },
    topics: function (subject) {
      var s = {};
      Bank.all().forEach(function (t) { if (!subject || (t.subject || '未分类') === subject) s[t.topic || '未分类'] = 1; });
      return Object.keys(s);
    }
  };

  global.Store = Store;
  global.Bank = Bank;
})(window);
