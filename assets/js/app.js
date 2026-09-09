/*!
 * app.js — 一次一百分 主界面逻辑
 */
(function (global) {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var session = null;     // {mode, queue:[{id,reason}], idx, results:[], sigCount:{}}
  var curQ = null;        // 当前题目实例
  var curChoice = null;   // 选择题当前选项
  var locked = false;
  var paper = null;       // {questions:[], answers:{}, graded:false}
  var lastResults = null; // 最近一轮的作答结果（用于生成可读答卷汇总邮件）

  /* ---------------- 基础工具 ---------------- */
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('show'); }, 2000);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function fmtDate(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  function fmtDue(ts) {
    var diff = ts - Date.now();
    if (diff <= 0) return '待检测';
    var d = Math.ceil(diff / 86400000);
    return d + ' 天后';
  }
  function reasonPill(r) {
    var map = {
      wrong: ['wrong', '错题重练'], new: ['new', '新题型'], review: ['review', '抽样检测'],
      topic: ['', '专项'], random: ['', '抽测'], extra: ['', '巩固']
    };
    var m = map[r] || ['', ''];
    return '<span class="pill ' + m[0] + '">' + m[1] + '</span>';
  }
  function stars(n) { return '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n)); }

  /* ---------------- Tab 切换 ---------------- */
  function switchView(name) {
    $$('#tabs button').forEach(function (b) { b.classList.toggle('active', b.dataset.view === name); });
    ['practice', 'paper', 'wrong', 'stats', 'bank'].forEach(function (v) {
      $('#view-' + v).classList.toggle('hidden', v !== name);
    });
    if (name === 'stats') renderStats();
    if (name === 'wrong') renderWrong();
    if (name === 'bank') renderBank();
    window.scrollTo(0, 0);
  }

  /* ---------------- 练习：开始 ---------------- */
  function renderStart() {
    var s = SRS.stats(), st = Store.settings();
    $('#pStats').innerHTML = [
      stat(s.mastered, '已掌握题型'),
      stat(s.wrong, '待清错题'),
      stat(s.due, '到期待检测'),
      stat(s.accuracy + '%', '总正确率')
    ].join('');
    $('#wrongCount').textContent = s.wrong;
    $('#dueCount').textContent = s.due;
    $('#mStreak').textContent = st.masterStreak;

    var topics = Bank.topics();
    $('#topicBtns').innerHTML = topics.length
      ? topics.map(function (t) { return '<button class="btn sm" data-topic="' + esc(t) + '">' + esc(t) + '</button>'; }).join('')
      : '<span class="small muted">题库为空，先在「题库管理」导入题目。</span>';
  }
  function stat(n, l) { return '<div class="stat"><div class="n">' + n + '</div><div class="l">' + l + '</div></div>'; }

  function startSession(mode, topic) {
    var st = Store.settings();
    var list = SRS.buildSession({ mode: mode, topic: topic });
    if (!list.length) { toast(mode === 'wrong' ? '错题本是空的，先去练一轮吧' : '题库里没有可用题目'); return; }
    session = { mode: mode, topic: topic, queue: list, idx: 0, results: [], sigCount: {}, startedAt: Date.now() };
    locked = false;
    $('#pStart').classList.add('hidden');
    $('#pResult').classList.add('hidden');
    $('#pQuiz').classList.remove('hidden');
    nextQuestion();
  }

  /* ---------------- 练习：出题 ---------------- */
  function nextQuestion() {
    if (!session) return;
    if (session.idx >= session.queue.length) { finishSession(); return; }
    var item = session.queue[session.idx];
    var tpl = Bank.byId(item.id);
    if (!tpl) { session.idx++; return nextQuestion(); }

    var q = null, tries = 0;
    while (tries++ < 6 && !q) {
      var cand = Generator.instantiate(tpl, { count: session.sigCount });
      if (cand && !session.results.some(function (r) { return r.sig === cand.sig; })) q = cand;
      else if (cand) q = cand;
    }
    if (!q) { session.idx++; return nextQuestion(); }

    curQ = q; curChoice = null; locked = false;
    session.sigCount[q.sig] = (session.sigCount[q.sig] || 0) + 1;

    var st = SRS.state(tpl.id);
    $('#qProgress').textContent = (session.idx + 1) + ' / ' + session.queue.length;
    $('#qBar').style.width = ((session.idx) / session.queue.length * 100) + '%';
    $('#qBadges').innerHTML =
      reasonPill(item.reason) +
      '<span class="pill">' + esc(tpl.subject || '') + ' · ' + esc(tpl.topic || '') + '</span>' +
      '<span class="pill">' + stars(tpl.difficulty || 2) + '</span>' +
      (st.seen ? '<span class="pill ' + (st.mastered ? 'ok' : '') + '">已练 ' + st.seen + ' 次 · 连对 ' + st.streak + '</span>' : '');

    renderQuestionCard(q, tpl);
    $('#qfb').innerHTML = '';
    window.scrollTo(0, 0);
  }

  function renderQuestionCard(q, tpl) {
    var h = '<div class="stem">' + q.stemHtml + '</div>';
    if (q.type === 'choice') {
      var multi = Array.isArray(q.correctIndex);
      h += '<div class="opts">' + q.options.map(function (o, i) {
        return '<div class="opt" data-i="' + i + '"><span class="k">' + 'ABCDEFGH'[i] + '</span><span>' + o + '</span></div>';
      }).join('') + '</div>';
      if (multi) h += '<div class="small muted">本题为多选</div>';
      h += '<div class="row"><button class="btn primary" id="btnSubmit">提交答案</button></div>';
    } else {
      var ph = q.type === 'fraction' ? '如 3/4 或 0.75' : (q.type === 'expression' ? '如 3x+5' : '填写答案');
      h += '<div class="answer-box">' +
        '<input type="text" id="ansInput" autocomplete="off" placeholder="' + ph + '">' +
        (q.unit ? '<span class="unit">' + esc(q.unit) + '</span>' : '') +
        '<button class="btn primary" id="btnSubmit">提交</button>' +
        '</div>';
      if (q.hint) h += '<p class="small muted" style="margin-top:10px">提示：' + q.hint + '</p>';
    }
    if (tpl.image) h += '<p class="small" style="margin-top:12px"><a href="javascript:;" id="lnkOrig">📷 查看原题</a>' +
      '<div id="origImg" class="hidden"><img src="' + esc(tpl.image) + '" alt="原题" style="max-width:100%;margin-top:8px;border:1px solid var(--border);border-radius:10px"></div></p>';
    if (tpl.source) h += '<p class="small muted" style="margin-top:14px">来源：' + esc(tpl.source) + '</p>';
    $('#qcard').innerHTML = h;
    var lk = $('#lnkOrig');
    if (lk) lk.addEventListener('click', function () { $('#origImg').classList.toggle('hidden'); });

    $$('#qcard .opt').forEach(function (el) {
      el.addEventListener('click', function () {
        if (locked) return;
        var i = +el.dataset.i;
        if (Array.isArray(q.correctIndex)) {
          curChoice = curChoice || [];
          var p = curChoice.indexOf(i);
          if (p >= 0) curChoice.splice(p, 1); else curChoice.push(i);
          $$('#qcard .opt').forEach(function (e2) { e2.classList.toggle('sel', curChoice.indexOf(+e2.dataset.i) >= 0); });
        } else {
          curChoice = i;
          $$('#qcard .opt').forEach(function (e2) { e2.classList.toggle('sel', +e2.dataset.i === i); });
        }
        var b = $('#btnSubmit'); if (b) b.disabled = false;
      });
    });
    var bs = $('#btnSubmit');
    if (bs && q.type === 'choice') bs.disabled = true;
    if (bs) bs.addEventListener('click', submitAnswer);
    var inp = $('#ansInput');
    if (inp) {
      inp.focus();
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') submitAnswer(); });
    }
  }

  function submitAnswer() {
    if (locked || !curQ) return;
    var input;
    if (curQ.type === 'choice') {
      if (curChoice === null || (Array.isArray(curChoice) && !curChoice.length)) { toast('先选一个答案'); return; }
      input = curChoice;
    } else {
      input = ($('#ansInput').value || '').trim();
      if (!input) { toast('请先填写答案'); return; }
    }
    locked = true;
    var res = Grader.grade(curQ, input);
    var tpl = curQ.tpl;

    SRS.record(tpl.id, res.ok, { given: res.given, expected: res.expected, stem: curQ.stemText });
    Store.pushHistory({
      ts: Date.now(), tid: tpl.id, ok: res.ok, given: res.given, expected: res.expected,
      stem: curQ.stemText, topic: tpl.topic || '', mode: session ? session.mode : 'paper'
    });

    session.results.push({
      tid: tpl.id, sig: curQ.sig, ok: res.ok, given: res.given, expected: res.expected,
      stem: curQ.stemText, stemHtml: curQ.stemHtml, solution: curQ.solutionHtml, type: curQ.type
    });

    // 错题当场换数重练
    if (!res.ok && Store.settings().retryInSession) {
      session.queue.push({ id: tpl.id, reason: 'wrong' });
      $('#qProgress').textContent = (session.idx + 1) + ' / ' + session.queue.length;
    }

    renderFeedback(res, curQ);
  }

  function renderFeedback(res, q) {
    var h = '<div class="feedback ' + (res.ok ? 'ok' : 'bad') + '">' +
      '<div class="title">' + (res.ok ? '✓ 答对了' : '✗ 再想想') + (res.comment ? '（' + esc(res.comment) + '）' : '') + '</div>' +
      '<div class="kv"><span>你的答案：<b>' + esc(res.given) + '</b></span>' +
      (res.ok ? '' : '<span>正确答案：<b>' + esc(res.expected) + (q.unit ? ' ' + esc(q.unit) : '') + '</b></span>') + '</div>';
    if (!res.ok && q.solutionHtml) h += '<div class="solution"><b>解题思路</b><br>' + q.solutionHtml + '</div>';
    else if (q.solutionHtml) h += '<div class="solution">' + q.solutionHtml + '</div>';

    var st = SRS.state(q.tplId);
    h += '<div class="small muted" style="margin-top:10px">' +
      (res.ok
        ? '连续答对 ' + st.streak + ' 次' + (st.mastered ? ' · 已掌握，将在 ' + fmtDue(st.due) + '抽样检测' : '（连对 ' + Store.settings().masterStreak + ' 次即掌握）')
        : '已加入错题本，下次测试会换一组数值再考你') +
      '</div>';
    h += '<div class="row" style="margin-top:12px"><button class="btn primary" id="btnNext">' +
      (session && session.idx + 1 < session.queue.length ? '下一题' : '查看成绩') + '</button></div></div>';
    $('#qfb').innerHTML = h;
    $('#btnNext').addEventListener('click', function () { session.idx++; nextQuestion(); });
    $('#btnNext').focus();
  }

  function finishSession() {
    $('#pQuiz').classList.add('hidden');
    $('#pResult').classList.remove('hidden');
    var rs = session.results;
    var ok = rs.filter(function (r) { return r.ok; }).length;
    var pct = rs.length ? Math.round(ok / rs.length * 100) : 0;
    $('#rStats').innerHTML = [
      stat(pct, '本轮得分'),
      stat(ok + '/' + rs.length, '答对题数'),
      stat(rs.filter(function (r) { return !r.ok; }).length, '本轮错题'),
      stat(Math.round((Date.now() - session.startedAt) / 1000) + 's', '用时')
    ].join('');
    $('#rList').innerHTML = rs.map(function (r, i) {
      return '<div class="list-item">' +
        '<div class="t">' + (i + 1) + '. <span class="pill ' + (r.ok ? 'ok' : 'wrong') + '">' + (r.ok ? '对' : '错') + '</span> ' + r.stemHtml + '</div>' +
        (r.ok ? '' : '<div class="small">你写了 <b>' + esc(r.given) + '</b>；正确答案 <b>' + esc(r.expected) + '</b></div>' +
          (r.solution ? '<div class="small muted">' + r.solution + '</div>' : '')) +
        '</div>';
    }).join('') || '<p class="muted">本轮没有作答记录。</p>';
    lastResults = rs;
    session = null;
  }

  /* ---------------- 组卷 ---------------- */
  function fillPaperSelects() {
    var subs = Bank.subjects();
    $('#ppSubject').innerHTML = '<option value="">全部</option>' + subs.map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('');
    refreshTopics();
    renderSourceChecklist('#ppSources', '#ppSrcCount', '#ppSrcAll', '#ppSrcNone');
  }
  function refreshTopics() {
    var sub = $('#ppSubject').value;
    var ts = Bank.topics(sub || null);
    $('#ppTopic').innerHTML = '<option value="">全部</option>' + ts.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('');
  }
  function sourceSetOf(t) {
    if (t.sourceSet) return t.sourceSet;
    var s = t.source || '';
    return s.replace(/\s*Q\d+[a-z]?$/i, '') || '(未标注来源)';
  }
  function renderSourceChecklist(boxId, countId, allId, noneId) {
    var seen = {}, list = [];
    Bank.all().forEach(function (t) {
      var s = sourceSetOf(t);
      if (!seen[s]) { seen[s] = 1; list.push(s); }
    });
    list.sort();
    var box = $(boxId);
    box.innerHTML = list.map(function (s) {
      return '<label class="srcitem"><input type="checkbox" value="' + esc(s) + '"> ' + esc(s) + '</label>';
    }).join('');
    if (countId) $(countId).textContent = list.length + ' 个来源';
    if (allId) $(allId).onclick = function () { Array.prototype.forEach.call(box.querySelectorAll('input'), function (c) { c.checked = true; }); };
    if (noneId) $(noneId).onclick = function () { Array.prototype.forEach.call(box.querySelectorAll('input'), function (c) { c.checked = false; }); };
  }
  function checkedSources(boxId) {
    return Array.prototype.slice.call($$(boxId + ' input:checked')).map(function (c) { return c.value; });
  }

  function genPaper() {
    var size = Math.max(1, Math.min(60, +$('#ppSize').value || 10));
    var scope = $('#ppScope').value, sub = $('#ppSubject').value, topic = $('#ppTopic').value;
    var all = Bank.all().filter(function (t) { return !sub || (t.subject || '') === sub; });
    var ids = all.map(function (t) { return t.id; });
    var p = Store.progress(), w = Store.wrong().map(function (x) { return x.id; });

    if (scope === 'wrong') ids = w.filter(function (id) { return ids.indexOf(id) >= 0; });
    else if (scope === 'topic') ids = all.filter(function (t) { return (t.topic || '') === topic; }).map(function (t) { return t.id; });
    else if (scope === 'unmastered') ids = ids.filter(function (id) { return !p[id] || !p[id].mastered; });
    else if (scope === 'new') ids = SRS.newIds(ids);
    if (topic && scope !== 'topic') ids = ids.filter(function (id) { var t = Bank.byId(id); return t && (t.topic || '') === topic; });

    var srcs = checkedSources('#ppSources');
    if (srcs.length) ids = ids.filter(function (id) { var t = Bank.byId(id); return t && srcs.indexOf(sourceSetOf(t)) >= 0; });

    if (!ids.length) { toast('该条件下没有题目'); return; }
    shuffle(ids);
    var picked = [], sigs = {};
    for (var i = 0; i < size * 3 && picked.length < size; i++) {
      var id = ids[i % ids.length];
      var tpl = Bank.byId(id); if (!tpl) continue;
      var q = Generator.instantiate(tpl, { count: sigs });
      if (!q) continue;
      if (picked.some(function (x) { return x.sig === q.sig; })) continue;
      sigs[q.sig] = 1;
      picked.push(q);
    }
    if (!picked.length) { toast('生成失败，请检查题库模板'); return; }

    paper = { questions: picked, answers: {}, graded: false, createdAt: Date.now(), id: 'P' + Date.now() };
    renderPaper();
    $('#btnPrintPaper').classList.remove('hidden');
    $('#btnSubmitPaper').classList.remove('hidden');
  }

  function renderPaper() {
    var h = '<div class="card"><div class="row"><h2 style="margin:0">卷子 · ' + paper.questions.length + ' 题</h2>' +
      '<span class="spacer"></span><span class="small muted">' + fmtDate(paper.createdAt) + ' 生成</span></div>';
    if (paper.graded) {
      var ok = paper.questions.filter(function (q) { return paper.answers[q.key] && paper.answers[q.key].ok; }).length;
      h += '<div class="grid" style="margin:12px 0">' + stat(Math.round(ok / paper.questions.length * 100), '得分') +
        stat(ok + '/' + paper.questions.length, '答对') + '</div>';
    }
    h += '<hr style="border:none;border-top:1px solid var(--border);margin:12px 0">';

    paper.questions.forEach(function (q, i) {
      var a = paper.answers[q.key];
      h += '<div class="paper-q"><div><span class="no">' + (i + 1) + '.</span>' +
        '<span class="pill">' + esc(q.tpl.topic || '') + '</span> ' + q.stemHtml +
        (q.unit ? ' <span class="unit">（' + esc(q.unit) + '）</span>' : '') +
        '<span class="print-only"> ______________________</span></div>';
      if (q.type === 'choice') {
        h += '<div class="opts" style="margin-top:8px">' + q.options.map(function (o, k) {
          var cls = 'opt';
          if (paper.graded) {
            var ci = q.correctIndex;
            var isC = Array.isArray(ci) ? ci.indexOf(k) >= 0 : ci === k;
            var isS = a && a.picked && (Array.isArray(a.picked) ? a.picked.indexOf(k) >= 0 : a.picked === k);
            if (isC) cls += ' correct'; else if (isS) cls += ' wrongsel';
          } else if (a && a.picked && (Array.isArray(a.picked) ? a.picked.indexOf(k) >= 0 : a.picked === k)) cls += ' sel';
          return '<div class="' + cls + '" data-q="' + q.key + '" data-i="' + k + '"><span class="k">' + 'ABCDEFGH'[k] + '</span><span>' + o + '</span></div>';
        }).join('') + '</div>';
      } else {
        var val = a && a.raw !== undefined ? a.raw : '';
        h += '<div class="answer-box" style="margin-top:8px">' +
          '<input type="text" class="pinput" data-q="' + q.key + '" value="' + esc(val) + '" placeholder="答案" style="max-width:200px">' +
          (paper.graded ? '<span class="pill ' + (a && a.ok ? 'ok' : 'wrong') + '">' + (a && a.ok ? '✓' : '✗ 正确答案 ' + esc(q.display)) + '</span>' : '') +
          '</div>';
      }
      if (paper.graded && a && !a.ok && q.solutionHtml) h += '<div class="solution">' + q.solutionHtml + '</div>';
      h += '</div>';
    });
    h += '</div>';
    $('#paperArea').innerHTML = h;

    $$('#paperArea .opt').forEach(function (el) {
      el.addEventListener('click', function () {
        if (paper.graded) return;
        var key = el.dataset.q, i = +el.dataset.i;
        var q = paper.questions.filter(function (x) { return x.key === key; })[0];
        var cur = paper.answers[key] || { picked: null, raw: '' };
        if (Array.isArray(q.correctIndex)) {
          cur.picked = cur.picked || [];
          var p = cur.picked.indexOf(i);
          if (p >= 0) cur.picked.splice(p, 1); else cur.picked.push(i);
        } else cur.picked = i;
        paper.answers[key] = cur;
        renderPaper();
      });
    });
    $$('#paperArea .pinput').forEach(function (el) {
      el.addEventListener('input', function () {
        var key = el.dataset.q;
        paper.answers[key] = paper.answers[key] || { picked: null, raw: '' };
        paper.answers[key].raw = el.value;
      });
    });
  }

  function submitPaper() {
    if (!paper || paper.graded) return;
    paper.questions.forEach(function (q) {
      var a = paper.answers[q.key];
      var input = q.type === 'choice' ? (a ? a.picked : null) : (a ? a.raw : '');
      var res = Grader.grade(q, input);
      paper.answers[q.key] = { picked: a ? a.picked : null, raw: a ? a.raw : '', ok: res.ok, given: res.given, expected: res.expected };
      SRS.record(q.tplId, res.ok, { given: res.given, expected: res.expected, stem: q.stemText });
      Store.pushHistory({ ts: Date.now(), tid: q.tplId, ok: res.ok, given: res.given, expected: res.expected, stem: q.stemText, topic: q.tpl.topic || '', mode: 'paper' });
    });
    paper.graded = true;
    Store.savePaper({ id: paper.id, createdAt: paper.createdAt, size: paper.questions.length, score: 0 });
    renderPaper();
    toast('已交卷');
    window.scrollTo(0, 0);
  }

  /* ---------------- 错题本 ---------------- */
  function renderWrong() {
    var w = Store.wrong();
    if (!w.length) { $('#wrongList').innerHTML = '<p class="muted">错题本是空的 —— 保持住 👍</p>'; return; }
    w.sort(function (a, b) { return (b.lastTs || 0) - (a.lastTs || 0); });
    $('#wrongList').innerHTML = w.map(function (x) {
      var tpl = Bank.byId(x.id);
      if (!tpl) return '';
      var st = SRS.state(x.id);
      return '<div class="list-item">' +
        '<div class="t">' + esc(tpl.subject || '') + ' · ' + esc(tpl.topic || '') + ' <span class="pill wrong">还需答对 ' + x.need + ' 次</span>' +
        ' <span class="pill">错过 ' + x.times + ' 次</span></div>' +
        '<div class="small muted">' + esc(tpl.title || Generator.renderText(tpl.stem, {})) + '</div>' +
        (x.lastStem ? '<div class="small">上次：' + esc(x.lastStem) + ' &nbsp;你写了 <b>' + esc(x.lastGiven || '') + '</b>，正确答案 <b>' + esc(x.lastExpected || '') + '</b></div>' : '') +
        '<div class="row" style="margin-top:8px"><button class="btn sm primary" data-redo="' + esc(x.id) + '">换组数字重练</button>' +
        '<span class="small muted">最近 ' + fmtDate(x.lastTs) + '</span></div>' +
        '</div>';
    }).join('');
    $$('#wrongList [data-redo]').forEach(function (b) {
      b.addEventListener('click', function () {
        switchView('practice');
        startSession('topic', null);
        // 直接进入该题型单题重练
        session = { mode: 'topic', queue: [{ id: b.dataset.redo, reason: 'wrong' }], idx: 0, results: [], sigCount: {}, startedAt: Date.now() };
        $('#pStart').classList.add('hidden'); $('#pResult').classList.add('hidden'); $('#pQuiz').classList.remove('hidden');
        nextQuestion();
      });
    });
  }

  /* ---------------- 掌握度 ---------------- */
  function renderStats() {
    var s = SRS.stats();
    $('#sStats').innerHTML = [
      stat(s.mastered + '/' + s.total, '已掌握 / 总题型'),
      stat(s.rate + '%', '题库掌握率'),
      stat(s.wrong, '待清错题'),
      stat(s.accuracy + '%', '总正确率'),
      stat(s.attempts, '累计作答'),
      stat(s.recent7 + ' / ' + s.recent7acc + '%', '近 7 天 / 正确率')
    ].join('');

    var topics = SRS.byTopic();
    $('#sTopics').innerHTML = '<table class="tbl"><thead><tr><th>知识点</th><th>掌握</th><th style="width:140px">进度</th><th>正确率</th></tr></thead><tbody>' +
      topics.map(function (t) {
        var pct = t.total ? Math.round(t.mastered / t.total * 100) : 0;
        var acc = (t.ok + t.bad) ? Math.round(t.ok / (t.ok + t.bad) * 100) : 0;
        return '<tr><td>' + esc(t.topic) + '</td><td>' + t.mastered + '/' + t.total + '</td>' +
          '<td><div class="bar"><i style="width:' + pct + '%"></i></div></td>' +
          '<td>' + (t.ok + t.bad ? acc + '%' : '—') + '</td></tr>';
      }).join('') + '</tbody></table>';

    var h = Store.history().slice(-60).reverse();
    $('#sHistory').innerHTML = h.length ? '<table class="tbl"><thead><tr><th>时间</th><th>题目</th><th>结果</th></tr></thead><tbody>' +
      h.map(function (x) {
        return '<tr><td class="small muted">' + fmtDate(x.ts) + '</td><td class="small">' + esc(x.stem || '') +
          (x.ok ? '' : '<br><span class="small">写 ' + esc(x.given) + '，应 ' + esc(x.expected) + '</span>') + '</td>' +
          '<td><span class="pill ' + (x.ok ? 'ok' : 'wrong') + '">' + (x.ok ? '对' : '错') + '</span></td></tr>';
      }).join('') + '</tbody></table>' : '<p class="muted">还没有作答记录。</p>';
  }

  /* ---------------- 题库管理 ---------------- */
  function renderBankSources() {
    var seen = {}, list = [];
    Bank.all().forEach(function (t) { var s = sourceSetOf(t); if (!seen[s]) { seen[s] = 1; list.push(s); } });
    list.sort();
    var box = $('#bankSrcBox');
    var sig = list.join('');
    if (box.dataset.sig === sig) return; // 来源集合没变，保留已勾选状态
    var prev = {};
    Array.prototype.forEach.call(box.querySelectorAll('input'), function (c) { if (c.checked) prev[c.value] = 1; });
    box.innerHTML = list.map(function (s) {
      return '<label class="srcitem"><input type="checkbox" value="' + esc(s) + '"' + (prev[s] ? ' checked' : '') + '> ' + esc(s) + '</label>';
    }).join('');
    box.dataset.sig = sig;
    $('#bankSrcCount').textContent = list.length + ' 个来源';
  }
  function renderBankList() {
    var srcs = checkedSources('#bankSrcBox');
    var allBank = Bank.all();
    var all = allBank.filter(function (t) { return !srcs.length || srcs.indexOf(sourceSetOf(t)) >= 0; });
    var custom = Store.customBank().map(function (t) { return t.id; });
    $('#bankInfo').innerHTML = '共 ' + all.length + ' / ' + allBank.length + ' 个题型模板（内置 ' + Bank.base.length + '，本机导入 ' + custom.length + '）' + (srcs.length ? ' · 已按来源筛选' : '');
    if (!all.length) { $('#bankList').innerHTML = '<p class="muted">该来源下没有题型。</p>'; return; }
    var p = Store.progress();
    $('#bankList').innerHTML = all.map(function (t) {
      var st = p[t.id];
      return '<div class="list-item"><div class="t">' + esc(t.subject || '') + ' · ' + esc(t.topic || '') +
        ' <span class="pill">' + stars(t.difficulty || 2) + '</span>' +
        (st && st.mastered ? ' <span class="pill ok">已掌握</span>' : (st && st.seen ? ' <span class="pill">练过 ' + st.seen + ' 次</span>' : ' <span class="pill new">未练</span>')) +
        (custom.indexOf(t.id) >= 0 ? ' <span class="pill review">本机</span>' : '') + '</div>' +
        '<div class="small muted">' + esc(t.title || Generator.renderText(t.stem, {})) + '</div>' +
        '<div class="row" style="margin-top:6px"><code class="small muted">' + esc(t.id) + '</code>' +
        '<span class="spacer"></span>' +
        '<button class="btn sm" data-preview="' + esc(t.id) + '">预览变式</button>' +
        (custom.indexOf(t.id) >= 0 ? '<button class="btn sm" data-del="' + esc(t.id) + '">删除</button>' : '') +
        '</div><div class="small" data-pv="' + esc(t.id) + '"></div></div>';
    }).join('');
    $$('#bankList [data-preview]').forEach(function (b) {
      b.addEventListener('click', function () {
        var tpl = Bank.byId(b.dataset.preview);
        var out = [];
        for (var i = 0; i < 3; i++) {
          var q = Generator.instantiate(tpl);
          out.push(q ? Generator.renderText(tpl.stem, q.vars) + ' = ' + q.display : '（生成失败）');
        }
        $('[data-pv="' + b.dataset.preview + '"]').innerHTML = '<div style="margin-top:6px" class="small">' +
          out.map(function (o) { return esc(o); }).join('<br>') + '</div>';
      });
    });
    $$('#bankList [data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!confirm('删除这个本机导入的题型？')) return;
        Store.saveCustomBank(Store.customBank().filter(function (t) { return t.id !== b.dataset.del; }));
        renderBank();
      });
    });
  }
  function renderBank() {
    renderBankSources();
    renderBankList();
  }

  function doImport(text) {
    var data;
    try { data = JSON.parse(text); } catch (e) { $('#importMsg').innerHTML = '<span style="color:var(--bad)">JSON 解析失败：' + esc(e.message) + '</span>'; return; }
    var list = Array.isArray(data) ? data : (data.templates ? data.templates : [data]);
    var bad = list.filter(function (t) { return !t || !t.id || !t.stem || !t.answer; });
    if (bad.length) { $('#importMsg').innerHTML = '<span style="color:var(--bad)">有 ' + bad.length + ' 条模板缺少 id / stem / answer 字段</span>'; return; }
    var r = Store.mergeCustomBank(list);
    $('#importMsg').innerHTML = '<span style="color:var(--ok)">导入成功：新增 ' + r.added + ' 条，更新 ' + r.updated + ' 条，本机题库共 ' + r.total + ' 条</span>';
    toast('导入成功');
    renderStart(); fillPaperSelects();
  }

  /* ---------------- 多设备同步 ---------------- */
  function syncCode(full) {
    var s = Store.settings();
    return Sync.makeCode({
      sid: s.sid, dev: s.devId, ts: Date.now(), full: !!full,
      from: Store.lastSync(),
      progress: Store.progress(), wrong: Store.wrongAll()
    });
  }
  function importCode(text) {
    var d = Sync.parseCode(text);
    var cur = Sync.normalize(Sync.packLocal(Store.progress(), Store.wrongAll()));
    var r = Sync.merge(cur, d);
    var out = Sync.toLocal(cur);
    Store.saveProgress(out.progress);
    Store.saveWrong(out.wrong);
    return r;
  }
  function pullCloud(quiet) {
    var s = Store.settings();
    return fetch('data/state/' + s.sid + '.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j) { if (!quiet) toast('云端还没有这个编号的进度'); return null; }
        var r = Store.applyCloud(j);
        renderSyncInfo(); renderStart();
        if (!quiet) toast('已合并云端：新增 ' + r.pNew + ' 题，更新 ' + r.pUpd + ' 题');
        return r;
      })
      .catch(function (e) { if (!quiet) toast('拉取失败：' + e.message); return null; });
  }
  function renderSyncInfo() {
    var s = Store.settings();
    if ($('#syncSid')) {
      $('#syncSid').value = s.sid || '';
      $('#syncMail').value = s.parentEmail || '';
      $('#syncDev').textContent = '本机：' + (s.devId || '-');
      var ls = Store.lastSync();
      $('#syncLast').textContent = ls ? '上次同步 ' + fmtDate(ls) : '尚未同步过';
      $('#setAutoSync').checked = s.autoSync !== false;
    }
  }
  function showCode(code, where) {
    var ta = where === 'result' ? $('#sendCode') : $('#syncBox');
    ta.value = code;
    ta.classList.remove('hidden');
    if (where === 'result') {
      $('#sendBox').classList.remove('hidden');
      $('#sendInfo').textContent = code.length + ' 字符';
    } else {
      $('#syncBoxRow').classList.remove('hidden');
      $('#syncMsg').innerHTML = '<span class="muted">已生成 ' + code.length + ' 字符，可复制或发邮件。</span>';
    }
    ta.select();
  }
  function copyText(el) {
    if (!el) return;
    el.select(); el.setSelectionRange(0, 999999);
    try {
      if (navigator.clipboard) { navigator.clipboard.writeText(el.value); toast('已复制'); return; }
    } catch (e) { }
    try { document.execCommand('copy'); toast('已复制'); } catch (e) { toast('请手动全选复制'); }
  }
  function mailCode(code) {
    var s = Store.settings();
    var to = (s.parentEmail || '').trim();
    if (!to) {
      to = prompt('家长邮箱（用于接收同步码）', '');
      if (!to) return;
      s.parentEmail = to.trim(); Store.saveSettings(s); renderSyncInfo();
    }
    var subject = '一次一百分 同步码 ' + (s.sid || '');
    var body = code + '\n\n—— 把这串码交给 WorkBuddy 合并即可同步进度。';
    window.location.href = 'mailto:' + encodeURIComponent(to) +
      '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  /* 把一轮作答整理成家长/老师能直接读的文字 */
  function roundSummaryText(results) {
    if (!results || !results.length) return '';
    var ok = results.filter(function (r) { return r.ok; }).length;
    var lines = ['本轮答卷汇总', '──────────────'];
    results.forEach(function (r, i) {
      var mark = r.ok ? '✓ 对' : '✗ 错';
      var line = (i + 1) + '. [' + mark + '] ' + (r.stemText || '').replace(/\s+/g, ' ').slice(0, 80);
      if (!r.ok) line += '　你写：' + r.given + '　正确答案：' + r.expected;
      else if (r.given) line += '　你写：' + r.given;
      lines.push(line);
    });
    lines.push('');
    lines.push('共 ' + results.length + ' 题，答对 ' + ok + ' 题（' + Math.round(ok / results.length * 100) + '%）');
    return lines.join('\n');
  }

  /* 直接把答卷 + 同步码发到 WorkBuddy 的智能体邮箱，由我自动合并 */
  function mailWB(code) {
    var s = Store.settings();
    var to = (s.agentMail || '').trim();
    if (!to) {
      alert('WorkBuddy 邮箱尚未配置。请先在 WorkBuddy 里开通「我的邮箱」，或改用「发邮件」发到你自己的邮箱再粘给 WorkBuddy。');
      return;
    }
    var stats = SRS.stats();
    var head = '一次一百分 同步（学生 ' + (s.studentName || s.sid || '?') + '）\n' +
      '已掌握 ' + stats.mastered + ' / 待清错题 ' + stats.wrong + ' / 到期待检测 ' + stats.due + '\n';
    var summary = roundSummaryText(lastResults);
    var body = head + (summary ? (summary + '\n\n') : '') +
      '── 同步码（WorkBuddy 自动读取合并，无需手动处理）──\n' + code;
    var subject = '[1a1m-sync] ' + (s.sid || '');
    window.location.href = 'mailto:' + encodeURIComponent(to) +
      '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  /* ---------------- 设置 ---------------- */
  function fillSettings() {
    var s = Store.settings();
    $('#setSize').value = s.sessionSize;
    $('#setNew').value = s.newPerSession;
    $('#setStreak').value = s.masterStreak;
    $('#setNeed').value = s.wrongNeed;
    $('#setRetry').checked = !!s.retryInSession;
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    // 主题
    var theme = localStorage.getItem('a1p100:theme');
    if (theme) document.documentElement.dataset.theme = theme;

    Bank.load().then(function () {
      renderStart(); fillPaperSelects(); fillSettings(); updateWho(); renderSyncInfo();
      if (Store.settings().autoSync !== false) pullCloud(true);
    }).catch(function (e) {
      console.error(e);
      renderStart();
      toast('题库加载失败：' + e.message);
    });

    $$('#tabs button').forEach(function (b) { b.addEventListener('click', function () { switchView(b.dataset.view); }); });

    $$('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () { startSession(b.dataset.mode); });
    });
    $('#topicBtns').addEventListener('click', function (e) {
      var t = e.target.closest('[data-topic]'); if (t) startSession('topic', t.dataset.topic);
    });
    $('#btnQuit').addEventListener('click', function () { if (confirm('结束本轮并查看成绩？')) finishSession(); });
    $('#btnAgain').addEventListener('click', function () { $('#pResult').classList.add('hidden'); $('#pStart').classList.remove('hidden'); renderStart(); });
    $('#btnBackHome').addEventListener('click', function () { $('#pResult').classList.add('hidden'); $('#pStart').classList.remove('hidden'); renderStart(); });

    $('#ppSubject').addEventListener('change', refreshTopics);
    $('#btnGenPaper').addEventListener('click', genPaper);
    $('#btnPrintPaper').addEventListener('click', function () { window.print(); });
    $('#btnSubmitPaper').addEventListener('click', submitPaper);

    $('#btnImport').addEventListener('click', function () { doImport($('#bankInput').value); $('#bankInput').value = ''; renderBank(); });
    $('#btnImportFile').addEventListener('click', function () { $('#fileInput').click(); });
    $('#fileInput').addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () { $('#bankInput').value = fr.result; doImport(fr.result); renderBank(); };
      fr.readAsText(f, 'utf-8');
      e.target.value = '';
    });
    $('#btnBankReload').addEventListener('click', function () { Bank.load().then(function () { renderBank(); toast('已重新加载'); }); });
    $('#bankSrcBox').addEventListener('change', renderBankList);

    /* ---- 多设备同步：结果页 + 题库管理页 ---- */
    $('#btnSendResult').addEventListener('click', function () {
      if ($('#sendBox').classList.contains('hidden')) showCode(syncCode(false), 'result');
      else { $('#sendBox').classList.add('hidden'); $('#sendCode').classList.add('hidden'); }
    });
    $('#btnCopyCode').addEventListener('click', function () { copyText($('#sendCode')); });
    $('#btnMailCode').addEventListener('click', function () { mailCode($('#sendCode').value); });

    $('#syncSid').addEventListener('input', function () {
      var s = Store.settings(); s.sid = $('#syncSid').value.trim(); Store.saveSettings(s);
    });
    $('#syncMail').addEventListener('input', function () {
      var s = Store.settings(); s.parentEmail = $('#syncMail').value.trim(); Store.saveSettings(s);
    });
    $('#btnPull').addEventListener('click', function () { pullCloud(false); });
    $('#btnMakeDelta').addEventListener('click', function () { showCode(syncCode(false), 'sync'); });
    $('#btnMakeFull').addEventListener('click', function () { showCode(syncCode(true), 'sync'); });
    $('#setAutoSync').addEventListener('change', function () {
      var s = Store.settings(); s.autoSync = $('#setAutoSync').checked; Store.saveSettings(s);
    });
    $('#btnCopySync').addEventListener('click', function () { copyText($('#syncBox')); });
    $('#btnMailSync').addEventListener('click', function () { mailCode($('#syncBox').value); });
    $('#btnMailWB').addEventListener('click', function () { mailWB(syncCode(true)); });
    $('#btnMailWBSync').addEventListener('click', function () { mailWB(syncCode(true)); });
    $('#btnImportSync').addEventListener('click', function () {
      var text = $('#syncBox').value;
      if (!text || !text.trim()) { toast('框里还没有同步码'); return; }
      try {
        var r = importCode(text);
        Store.setLastSync(Date.now());
        renderStart(); renderSyncInfo();
        $('#syncMsg').innerHTML = '<span style="color:var(--ok)">已导入：新增 ' + r.pNew + ' 题、更新 ' + r.pUpd +
          ' 题，新增错题 ' + r.wNew + '、更新错题 ' + r.wUpd + (r.wDel ? '、删除错题 ' + r.wDel : '') + '</span>';
        toast('已导入同步码');
      } catch (e) {
        $('#syncMsg').innerHTML = '<span style="color:var(--bad)">导入失败：' + esc(e.message) + '</span>';
      }
    });

    $('#btnExport').addEventListener('click', function () {
      var box = $('#ioBox'); box.classList.remove('hidden');
      box.value = JSON.stringify(Store.exportAll(), null, 2);
      box.select();
    });
    $('#btnExportFile').addEventListener('click', function () { download('一次一百分-备份-' + Date.now() + '.json', JSON.stringify(Store.exportAll(), null, 2)); });
    $('#btnExportBank').addEventListener('click', function () {
      download('question-bank-' + Date.now() + '.json', JSON.stringify({ v: 1, templates: Bank.all() }, null, 2));
    });
    $('#btnImportAll').addEventListener('click', function () { $('#ioBox').classList.remove('hidden'); $('#ioRow').classList.remove('hidden'); $('#ioBox').value = ''; });
    $('#btnCancelImport').addEventListener('click', function () { $('#ioBox').classList.add('hidden'); $('#ioRow').classList.add('hidden'); });
    $('#btnDoImportAll').addEventListener('click', function () {
      try { Store.importAll(JSON.parse($('#ioBox').value)); toast('导入完成'); location.reload(); }
      catch (e) { toast('导入失败：' + e.message); }
    });

    $('#btnSaveSet').addEventListener('click', function () {
      var s = Store.settings();
      s.sessionSize = Math.max(3, Math.min(50, +$('#setSize').value || 10));
      s.newPerSession = Math.max(0, Math.min(20, +$('#setNew').value || 4));
      s.masterStreak = Math.max(2, Math.min(6, +$('#setStreak').value || 3));
      s.wrongNeed = Math.max(1, Math.min(5, +$('#setNeed').value || 2));
      s.retryInSession = $('#setRetry').checked;
      Store.saveSettings(s); toast('设置已保存'); renderStart();
    });
    $('#btnResetProg').addEventListener('click', function () { if (confirm('清空所有学习进度（错题本、掌握度、历史）？题库保留。')) { Store.resetProgress(); location.reload(); } });
    $('#btnWipe').addEventListener('click', function () { if (confirm('清空全部数据，包括本机导入的题库？')) { Store.wipe(); location.reload(); } });

    $('#btnTheme').addEventListener('click', function () {
      var t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = t;
      localStorage.setItem('a1p100:theme', t);
    });
    $('#btnWho').addEventListener('click', function () {
      var s = Store.settings();
      var n = prompt('学生姓名（用于本机显示）', s.studentName || '');
      if (n !== null) { s.studentName = n.trim(); Store.saveSettings(s); updateWho(); }
    });

    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.key === 'Enter') { var b = $('#btnNext'); if (b) b.click(); }
    });
  }

  function updateWho() {
    var n = Store.settings().studentName;
    $('#btnWho').textContent = n ? ('👤 ' + n) : '👤';
  }
  function download(name, text) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  document.addEventListener('DOMContentLoaded', boot);
})(window);
