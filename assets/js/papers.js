/*!
 * papers.js — 试卷级「官方限时」属性 + 按题量比例折算答题时间
 * 浏览器与 Node（tools/test-papers.js）共用同一份逻辑，保证两端折算结果一致。
 *
 * 数据来自 data/papers.json（WorkBuddy 联网检索官方规则后填写，流程见 PIPELINE.md §10）：
 *   set / idPrefix 把题库模板认到某一份「真题卷」上；timeLimit 给整卷时长与官方题数。
 *
 * 折算规则（用户要求）：本次题量少于试卷总题数时，按比例缩减整卷时间——
 *   限时(分钟) = round(整卷分钟 × 本次题量 ÷ 试卷总题数)
 * 多份卷混组（例如「全部来源」）时：先按 Σ官方分钟 ÷ Σ官方题数 求平均节奏，再乘本次题量。
 * 官方数据缺失的卷子用 defaultRate（每题 1 分钟）兜底，并标 estimated，前端会显示为「估算」。
 */
(function (root) {
  'use strict';

  var DEFAULT_RATE = { minutes: 1, questions: 1 };

  /* 与 app.js 的 sourceSetOf 同一规则（这里独立一份，避免 Node 端依赖 app.js；
     两边规则若要改，请同时改 app.js 的 sourceSetOf 与本函数） */
  function setOf(tpl) {
    if (!tpl) return '(未标注来源)';
    if (tpl.sourceSet) return tpl.sourceSet;
    var s = tpl.source || '';
    return s.replace(/\s*Q\d+[a-z]?$/i, '') || '(未标注来源)';
  }

  function limitOf(p) {
    var t = (p && p.timeLimit) || {};
    var minutes = t.minutes > 0 ? t.minutes : (t.suggestedMinutes > 0 ? t.suggestedMinutes : 0);
    return {
      minutes: minutes,
      official: !!t.official,
      label: !minutes ? '无' : (t.official ? '官方 ' + minutes + ' 分钟' : '推算 ' + minutes + ' 分钟'),
      source: t.source || t.basis || '',
      url: t.url || '',
      checkedAt: t.checkedAt || ''
    };
  }

  var Papers = {
    list: [],
    meta: {},
    loaded: false,
    DEFAULT_RATE: DEFAULT_RATE,
    limitOf: limitOf,
    setOf: setOf,

    /* ---------- 装载 ---------- */
    setData: function (j) {
      Papers.meta = j || {};
      Papers.list = ((j && j.papers) || []).map(function (p) {
        var lim = limitOf(p);
        p.minutes = lim.minutes;
        p.official = lim.official;
        return p;
      });
      Papers.loaded = true;
      return Papers.list;
    },
    load: function (url) {
      url = url || 'data/papers.json';
      if (typeof fetch !== 'function') return Promise.resolve(Papers.list);
      return fetch(url, { cache: 'no-store' })
        .then(function (r) {
          if (!r.ok) throw new Error('试卷限时数据加载失败 HTTP ' + r.status);
          return r.json();
        })
        .then(function (j) { return Papers.setData(j); })
        .catch(function (e) {
          console.warn('[papers] ' + e.message + ' —— 按每题 ' + DEFAULT_RATE.minutes + ' 分钟估算');
          return Papers.setData(null);
        });
    },

    /* ---------- 认卷 ---------- */
    all: function () { return Papers.list.slice(); },
    bySet: function (name) {
      if (!name) return null;
      for (var i = 0; i < Papers.list.length; i++) {
        var p = Papers.list[i];
        if (p.set === name || p.setZh === name) return p;
        if (p.alias && p.alias.indexOf(name) >= 0) return p;
      }
      return null;
    },
    /* 模板 → 试卷：先按 sourceSet 名精确匹配，再退回 id 前缀 */
    forTemplate: function (tpl) {
      if (!tpl) return null;
      var byName = Papers.bySet(setOf(tpl));
      if (byName) return byName;
      var id = String(tpl.id || '');
      for (var i = 0; i < Papers.list.length; i++) {
        var pre = Papers.list[i].idPrefix;
        if (pre && id.indexOf(pre) === 0) return Papers.list[i];
      }
      return null;
    },
    /* 一批模板 → 去重后的试卷列表（保持出现顺序） */
    forTemplates: function (tpls) {
      var seen = {}, out = [];
      (tpls || []).forEach(function (t) {
        var p = Papers.forTemplate(t);
        if (p && !seen[p.set]) { seen[p.set] = 1; out.push(p); }
      });
      return out;
    },

    /* ---------- 折算 ---------- */
    /* opts: { templates:[模板…] | papers:[试卷…], picked: 本次题量, override: 手动分钟数 } */
    plan: function (opts) {
      opts = opts || {};
      var picked = Math.floor(+opts.picked || 0);
      if (picked < 0) picked = 0;
      var papers = opts.papers || Papers.forTemplates(opts.templates || []);
      var known = papers.filter(function (p) { return p.minutes > 0 && p.totalQuestions > 0; });
      var fullMinutes = 0, fullQuestions = 0;
      known.forEach(function (p) { fullMinutes += p.minutes; fullQuestions += p.totalQuestions; });

      var estimated = !known.length;
      var rate = estimated ? (DEFAULT_RATE.minutes / DEFAULT_RATE.questions) : (fullMinutes / fullQuestions);
      var minutes = picked > 0 ? Math.max(1, Math.round(rate * picked)) : 0;
      /* 单卷且选满整卷：直接用官方原值，避免浮点做除法再乘回去的零头 */
      if (known.length === 1 && picked === known[0].totalQuestions) minutes = known[0].minutes;

      var custom = false;
      if (+opts.override > 0) { minutes = Math.max(1, Math.round(+opts.override)); custom = true; }

      return {
        minutes: minutes,
        rate: rate,                       // 分钟/题
        papers: papers,
        known: known,
        picked: picked,
        fullMinutes: fullMinutes,         // 相关试卷的官方整卷分钟合计
        fullQuestions: fullQuestions,     // 相关试卷的官方题数合计
        custom: custom,
        estimated: !custom && estimated,
        official: !custom && known.length > 0 && known.every(function (p) { return p.official; }),
        scaled: !custom && known.length > 0 && picked > 0 && minutes < fullMinutes,
        extended: !custom && known.length > 0 && picked > fullQuestions,
        rateText: (Math.round(rate * 100) / 100) + ' 分钟/题'
      };
    },

    /* 给人看的一句话（组卷面板 + 卷头都用它，措辞保持一致） */
    explain: function (plan) {
      if (!plan || !plan.minutes) return '未启用限时。';
      if (plan.estimated) {
        return '题库里还没查到这些卷的官方限时，按每题 ' + DEFAULT_RATE.minutes + ' 分钟估算：' +
          plan.picked + ' 题 → 限时 ' + plan.minutes + ' 分钟。';
      }
      var names = plan.known.map(function (p) { return p.set; });
      var head;
      if (plan.known.length === 1) {
        head = plan.known[0].set + '（' + (plan.known[0].official ? '官方' : '推算') + ' ' +
          plan.known[0].minutes + ' 分钟 / ' + plan.known[0].totalQuestions + ' 题）';
      } else {
        head = '混合 ' + plan.known.length + ' 份卷（官方合计 ' + plan.fullMinutes + ' 分钟 / ' +
          plan.fullQuestions + ' 题，平均 ' + plan.rateText + '）';
      }
      var tail;
      if (plan.custom) tail = '已手动设为 ' + plan.minutes + ' 分钟。';
      else if (plan.picked >= plan.fullQuestions) {
        tail = '本次 ' + plan.picked + ' 题 → 限时 ' + plan.minutes + ' 分钟（不缩减）。';
      } else {
        tail = '本次只选 ' + plan.picked + ' 题 → 按比例缩减为 ' + plan.minutes + ' 分钟' +
          (plan.official ? '' : '（推算时长）') + '。';
      }
      return head + '：' + tail + (names.length > 1 ? ' 涉及：' + names.join('、') : '');
    },

    /* ---------- 格式化 ---------- */
    formatMMSS: function (sec) {
      sec = Math.floor(+sec || 0);
      if (sec < 0) sec = 0;
      var m = Math.floor(sec / 60), s = sec % 60;
      return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    },
    humanMinutes: function (min) {
      min = Math.round(+min || 0);
      if (min < 60) return min + ' 分钟';
      var h = Math.floor(min / 60), m = min % 60;
      return h + ' 小时' + (m ? ' ' + m + ' 分钟' : '');
    }
  };

  root.Papers = Papers;
  if (typeof module !== 'undefined' && module.exports) module.exports = Papers;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
