/*!
 * store.js — 本地持久化（localStorage）+ 题库装载
 * 所有学生数据只存在本机浏览器，不上传任何服务器。
 *
 * 多学生模型：
 *  - 身份（姓名 / sid / devId）放在 profiles 列表里，不再塞进 settings。
 *  - 每个学生的进度 / 错题 / 历史 / 套卷 按 sid 命名空间隔离：
 *      a1p100:v1:<sid>:progress / :wrong / :history / :papers / :lastSync
 *  - 云端文件因此天然分文件（data/state/<sid>.json），不同学生互不干扰
 *    （sync.js 的 merge 本就按 sid 区分，test-sync.js 已验证）。
 *  - 自定义题库、练习设置（题量/连对次数等）是设备级、所有学生共用。
 */
(function (global) {
  'use strict';

  var PREFIX = 'a1p100:v1:';
  var FIXED_SID = 'a1m1';   // 默认/迁移学生的云端编号，沿用历史 data/state/a1m1.json

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
  function rnd(n) {
    return global.Sync && global.Sync.randomId
      ? global.Sync.randomId(n)
      : ('' + Math.random()).slice(2, 2 + (n || 6));
  }

  /* ---------- 档案迁移：旧的单学生数据 -> 按 sid 命名空间 ---------- */
  function migrateIfNeeded() {
    if (localStorage.getItem(PREFIX + 'profiles') !== null) return;
    var old = read('settings', null) || {};
    var sid = old.sid || FIXED_SID;
    var name = (old.studentName || '').trim() || '学生1';
    var devId = old.devId || rnd(4).toUpperCase();
    // 把旧的“单一学生”数据搬进按 sid 命名空间的键
    var op = read('progress', null), ow = read('wrong', null),
        oh = read('history', null), opa = read('papers', null);
    if (op) write(sid + ':progress', op);
    if (ow) write(sid + ':wrong', ow);
    if (oh) write(sid + ':history', oh);
    if (opa) write(sid + ':papers', opa);
    var ol = localStorage.getItem(PREFIX + 'lastSync');
    if (ol !== null) { try { write(sid + ':lastSync', JSON.parse(ol)); } catch (e) {} }
    var prof = { id: 'p_' + rnd(8), name: name, sid: sid, devId: devId, createdAt: Date.now() };
    write('profiles', [prof]);
    write('current', prof.id);
    // 清理旧 settings 里的身份字段，避免被误用
    if (old && typeof old === 'object') {
      delete old.studentName; delete old.sid; delete old.devId;
      write('settings', old);
    }
  }
  migrateIfNeeded();

  /* 真实姓名判定：空、纯空白、或仍是自动生成的占位名「学生N」都算未填 */
  function isRealName(name) {
    var s = (name == null ? '' : String(name)).trim();
    if (!s) return false;
    if (/^学生\d+$/.test(s)) return false;
    return true;
  }

  /* ---------- 档案读写 ---------- */
  function profiles() { return read('profiles', []) || []; }
  function saveProfiles(list) { write('profiles', list); }
  function currentId() { return read('current', null); }

  function current() {
    var list = profiles(), id = currentId(), p = null;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) { p = list[i]; break; }
    if (!p && list.length) { p = list[0]; write('current', p.id); }
    if (!p) { // 兜底：理论上 migrate 已建默认档案
      p = { id: 'p_' + rnd(8), name: '学生1', sid: FIXED_SID, devId: rnd(4).toUpperCase(), createdAt: Date.now() };
      saveProfiles([p]); write('current', p.id);
    }
    return p;
  }
  function setCurrent(id) {
    if (!profiles().some(function (x) { return x.id === id; })) return false;
    write('current', id); return true;
  }
  function profileBySid(sid) {
    var list = profiles();
    for (var i = 0; i < list.length; i++) if (list[i].sid === sid) return list[i];
    return null;
  }
  // 规范化名字：去首尾空格并转小写，用于「同名」判定（大小写/空格差异都视为同名）
  function normName(name) {
    return (name == null ? '' : String(name)).trim().toLowerCase();
  }
  // 按名字查重。名字不是身份键（身份靠 sid），但为避免 UI 上出现两个长得一样的档案，
  // 新增/改名时据此拒绝重复。忽略大小写与首尾空格。
  function profileByName(name) {
    var t = normName(name);
    if (!t) return null;
    var list = profiles();
    for (var i = 0; i < list.length; i++) if (normName(list[i].name) === t) return list[i];
    return null;
  }
  // 按 sid 找到对应档案，没有就新建并切换过去（用于导入他人同步码）
  function ensureProfileBySid(sid, devId) {
    sid = sid || FIXED_SID;
    var p = profileBySid(sid);
    if (!p) {
      var list = profiles();
      p = {
        id: 'p_' + rnd(8),
        name: '学生' + (list.length + 1),
        sid: sid,
        devId: (devId || rnd(4)).toUpperCase(),
        createdAt: Date.now()
      };
      list.push(p); saveProfiles(list);
    }
    write('current', p.id);
    return p;
  }
  function addProfile(name) {
    if (profileByName(name)) return null;   // 拒绝同名，避免 UI 上出现两个长得一样的档案
    var list = profiles();
    var prof = {
      id: 'p_' + rnd(8),
      name: (name || '').trim() || ('学生' + (list.length + 1)),
      sid: rnd(5),
      devId: rnd(4).toUpperCase(),
      createdAt: Date.now()
    };
    list.push(prof); saveProfiles(list); write('current', prof.id);
    return prof;
  }
  function renameProfile(id, name) {
    // 注意：必须只读一次 profiles()，在同一份数组上改名再写回；
    // 若第二次再调 profiles() 会重新 JSON.parse 出旧数据，改名等于没改。
    var list = profiles(), changed = false;
    list.forEach(function (p) {
      if (p.id !== id) return;
      var t = (name == null ? '' : (name + '')).trim();
      if (!t || t === p.name) return;
      p.name = t; changed = true;
    });
    if (changed) saveProfiles(list);
  }
  function removeProfile(id) {
    var list = profiles();
    if (list.length <= 1) return false; // 至少保留一个学生
    var p = null;
    list.forEach(function (x) { if (x.id === id) p = x; });
    if (!p) return false;
    saveProfiles(list.filter(function (x) { return x.id !== id; }));
    ['progress', 'wrong', 'history', 'papers', 'lastSync'].forEach(function (k) {
      localStorage.removeItem(PREFIX + p.sid + ':' + k);
    });
    if (currentId() === id) write('current', profiles()[0].id);
    return true;
  }
  /** 把某个档案的身份编号(sid)改到新的云端编号，并迁移其本机数据键；
   *  用于「按名字归位到云端同名档案」——同名但本机编号不同的档案，统一收敛到云端那个 sid。 */
  function setProfileSid(id, newSid) {
    if (!newSid) return false;
    var list = profiles();
    var p = null;
    list.forEach(function (x) { if (x.id === id) p = x; });
    if (!p || p.sid === newSid) return false;
    var old = p.sid;
    ['progress', 'wrong', 'history', 'papers', 'lastSync'].forEach(function (k) {
      var val = read(old + ':' + k, null);
      if (val !== null) write(newSid + ':' + k, val);
      localStorage.removeItem(PREFIX + old + ':' + k);
    });
    p.sid = newSid;
    saveProfiles(list);
    return true;
  }

  /* ---------- 练习设置（设备级，所有学生共用） ---------- */
  var DEFAULT_SETTINGS = {
    autoSync: true,
    sessionSize: 10,
    newPerSession: 4,
    masterStreak: 3,
    wrongNeed: 2,
    retryInSession: false,
    shuffle: true,
    parentEmail: ''
  };

  var Store = {
    /* ---------- 学生档案 ---------- */
    profiles: profiles,
    current: current,
    currentId: currentId,
    setCurrent: setCurrent,
    profileBySid: profileBySid,
    profileByName: profileByName,
    ensureProfileBySid: ensureProfileBySid,
    addProfile: addProfile,
    renameProfile: renameProfile,
    removeProfile: removeProfile,
    setProfileSid: setProfileSid,
    isRealName: isRealName,
    currentHasRealName: function () { return isRealName(current().name); },

    /* ---------- 设置 ---------- */
    settings: function () {
      var s = read('settings', null);
      if (!s) { s = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); write('settings', s); }
      var changed = false;
      Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
        if (s[k] === undefined) { s[k] = DEFAULT_SETTINGS[k]; changed = true; }
      });
      if (changed) write('settings', s);
      return s;
    },
    saveSettings: function (s) { write('settings', s); },

    /* ---------- 同步 ---------- */
    lastSync: function () { return read(current().sid + ':lastSync', 0) || 0; },
    setLastSync: function (ts) { write(current().sid + ':lastSync', ts); },
    /** 合并时把本机已记录的"当时原题"历史（instances）按 id 带回来，避免被云端摘要覆盖丢掉 */
    preserveWrongInstances: function (merged, prevWrong) {
      var map = {};
      (prevWrong || []).forEach(function (x) { if (x && x.id && x.instances && x.instances.length) map[x.id] = x.instances; });
      (merged || []).forEach(function (x) { if (map[x.id]) x.instances = map[x.id]; });
      return merged;
    },

    /** 用云端状态更新本机（当前学生）。
     *  replace=true：云端为准，整份覆盖本机。用于「名字已在云端索引中」的学生——名字即身份，
     *    云端是权威记录，整份覆盖可清掉本机遗留的孤立错题，各浏览器都收敛到云端同一份。
     *    空云端不覆盖（保护尚未合并的新学生），交由下面的合并分支兜底。
     *  replace=false：逐条按 updatedAt 合并，用于手动同步码的多设备合并，保留本机未合并进度。 */
    applyCloud: function (cloud, replace) {
      if (replace) {
        // 空云端不覆盖：保护尚未合并到云端的新学生，避免把本机进度清成 0
        var hasData = Object.keys(cloud.p || {}).length || (cloud.w || []).length;
        if (!hasData) return { pNew: 0, pUpd: 0, replaced: false, skippedEmpty: true };
        var local = global.Sync.toLocal(global.Sync.normalize(cloud));
        local.wrong = Store.preserveWrongInstances(local.wrong, Store.wrongAll());
        Store.saveProgress(local.progress);
        Store.saveWrong(local.wrong);
        Store.setLastSync(Date.now());
        return { pNew: 0, pUpd: 0, replaced: true };
      }
      var prevWrong = Store.wrongAll();   // 合并前本机错题（含 instances 历史）
      var n = global.Sync.normalize(cloud);
      var cur = global.Sync.normalize(global.Sync.packLocal(Store.progress(), prevWrong));
      var r = global.Sync.merge(cur, { p: cloud.p, w: cloud.w });
      var out = global.Sync.toLocal(cur);
      out.wrong = Store.preserveWrongInstances(out.wrong, prevWrong);
      Store.saveProgress(out.progress);
      Store.saveWrong(out.wrong);
      Store.setLastSync(Date.now());
      return r;
    },

    /* ---------- 进度（当前学生） ---------- */
    progress: function () { return read(current().sid + ':progress', {}) || {}; },
    saveProgress: function (p) { write(current().sid + ':progress', p); },

    /* ---------- 错题本 ----------
     * 内部保存 need<=0 的"墓碑"记录，这样"已清零"这件事才能同步给别的设备。
     * 对外读取一律用 wrong()（只返回 need>0），需要同步时用 wrongAll()。 */
    wrong: function () { return (read(current().sid + ':wrong', []) || []).filter(function (x) { return x.need > 0; }); },
    wrongAll: function () { return read(current().sid + ':wrong', []) || []; },
    saveWrong: function (w) { write(current().sid + ':wrong', w); },

    /* ---------- 历史 ---------- */
    history: function () { return read(current().sid + ':history', []) || []; },
    pushHistory: function (rec) {
      var h = Store.history();
      h.push(rec);
      if (h.length > 3000) h = h.slice(h.length - 3000);
      write(current().sid + ':history', h);
    },

    /* ---------- 套卷（当前学生） ---------- */
    papers: function () { return read(current().sid + ':papers', []) || []; },
    savePaper: function (p) {
      var ps = Store.papers();
      ps.unshift(p);
      if (ps.length > 30) ps = ps.slice(0, 30);
      write(current().sid + ':papers', ps);
    },
    removePaper: function (id) {
      write(current().sid + ':papers', Store.papers().filter(function (p) { return p.id !== id; }));
    },

    /* ---------- 自定义题库（设备级，跨学生共享） ---------- */
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

    /* ---------- 导入导出 ---------- */
    exportAll: function () {
      var stus = profiles().map(function (p) {
        return {
          sid: p.sid,
          progress: read(p.sid + ':progress', {}),
          wrong: read(p.sid + ':wrong', []),
          history: read(p.sid + ':history', []),
          papers: read(p.sid + ':papers', []),
          lastSync: read(p.sid + ':lastSync', 0)
        };
      });
      return {
        v: 2,
        exportedAt: new Date().toISOString(),
        settings: Store.settings(),
        bank: Store.customBank(),
        profiles: profiles(),
        current: currentId(),
        students: stus
      };
    },
    importAll: function (data) {
      if (!data || typeof data !== 'object') throw new Error('数据格式不正确');
      if (data.settings) write('settings', data.settings);
      if (data.bank) write('bank', data.bank);
      if (Array.isArray(data.students) && Array.isArray(data.profiles)) {
        saveProfiles(data.profiles);
        data.students.forEach(function (st) {
          if (!st || !st.sid) return;
          write(st.sid + ':progress', st.progress || {});
          write(st.sid + ':wrong', st.wrong || []);
          write(st.sid + ':history', st.history || []);
          write(st.sid + ':papers', st.papers || []);
          write(st.sid + ':lastSync', st.lastSync || 0);
        });
        write('current', data.current || (data.profiles[0] && data.profiles[0].id) || null);
      } else if (data.progress) {
        // 老格式（v1）：当作当前学生导入
        Store.saveProgress(data.progress);
        if (data.wrong) Store.saveWrong(data.wrong);
        if (data.history) write(current().sid + ':history', data.history);
        if (data.papers) write(current().sid + ':papers', data.papers);
      }
      return true;
    },
    resetProgress: function () {
      // 只清空“当前学生”的进度/错题/历史（套卷保留）
      var sid = current().sid;
      ['progress', 'wrong', 'history'].forEach(function (k) {
        localStorage.removeItem(PREFIX + sid + ':' + k);
      });
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
