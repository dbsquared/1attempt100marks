/*!
 * grader.js — 判分
 * 支持：number / integer / fraction / expression / choice / text
 */
(function (global) {
  'use strict';

  function toHalfWidth(s) {
    return String(s)
      .replace(/[！-～]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/　/g, ' ')
      .replace(/×/g, '*').replace(/÷/g, '/').replace(/（/g, '(').replace(/）/g, ')')
      .replace(/，/g, ',').replace(/。/g, '.').replace(/－/g, '-')
      .replace(/／/g, '/');
  }

  /** 从"3/4" "0.75" "0.75米" "75%" 中解析出数值；失败返回 NaN */
  function parseNumberLoose(raw) {
    if (raw === null || raw === undefined) return NaN;
    var s = toHalfWidth(String(raw)).trim().replace(/\s+/g, '');
    if (!s) return NaN;
    var pct = false;
    if (/%$/.test(s)) { pct = true; s = s.replace(/%$/, ''); }
    var m = s.match(/^[-+]?\d+(\.\d+)?(\/[-+]?\d+(\.\d+)?)?/);
    if (!m) return NaN;
    var t = m[0];
    var v;
    if (t.indexOf('/') > 0) {
      var p = t.split('/');
      var d = parseFloat(p[1]);
      if (!d) return NaN;
      v = parseFloat(p[0]) / d;
    } else {
      v = parseFloat(t);
    }
    if (pct) v = v / 100;
    return v;
  }

  function normText(raw) {
    return toHalfWidth(String(raw == null ? '' : raw))
      .replace(/\s+/g, '')
      .replace(/\^/g, '')
      .toLowerCase();
  }

  function normExpr(raw) {
    return normText(raw)
      .replace(/·/g, '*')
      .replace(/[{}]/g, '')
      .replace(/\)\(/g, ')*(')
      .replace(/(\d)([a-z(])/g, '$1*$2');
  }

  function toleranceOf(q) {
    if (q.tolerance !== undefined && q.tolerance !== null) return q.tolerance;
    if (q.digits !== undefined && q.digits !== null) return 0.5 * Math.pow(10, -q.digits);
    return 1e-6;
  }

  /**
   * @returns {{ok:boolean, given:string, expected:string, comment:string}}
   */
  function grade(q, input) {
    var expected = q.display;
    var given = input;
    var ok = false, comment = '';

    if (q.type === 'choice') {
      var picked = input;
      if (Array.isArray(q.correctIndex)) {
        var set = {}; (picked || []).forEach(function (i) { set[i] = 1; });
        var need = q.correctIndex;
        ok = need.length === (picked || []).length && need.every(function (i) { return set[i]; });
        given = (picked || []).map(function (i) { return q.options[i]; }).join('、');
      } else {
        ok = Number(picked) === Number(q.correctIndex);
        given = picked === undefined || picked === null ? '' : q.options[picked];
      }
      expected = Array.isArray(q.correctIndex)
        ? q.correctIndex.map(function (i) { return q.options[i]; }).join('、')
        : q.options[q.correctIndex];
      return { ok: ok, given: given || '（未作答）', expected: expected, comment: comment };
    }

    if (q.type === 'text') {
      var g = normText(input);
      var alts = [q.value].concat(q.alternatives || []);
      ok = alts.some(function (a) { return normText(a) === g; });
      return { ok: ok, given: String(input || '').trim() || '（未作答）', expected: expected, comment: comment };
    }

    if (q.type === 'expression') {
      ok = normExpr(input) === normExpr(q.value);
      return { ok: ok, given: String(input || '').trim() || '（未作答）', expected: expected, comment: comment };
    }

    // 数值类
    var v = parseNumberLoose(input);
    if (isNaN(v)) {
      return { ok: false, given: String(input || '').trim() || '（未作答）', expected: expected, comment: '无法识别为数字' };
    }
    var tol = toleranceOf(q);
    if (q.type === 'integer') {
      ok = Math.abs(v - Math.round(q.value)) < 1e-6 && Math.abs(v - Math.round(v)) < 1e-6;
    } else {
      ok = Math.abs(v - q.value) <= tol + 1e-12;
    }
    given = String(input).trim();
    return { ok: ok, given: given, expected: expected, comment: comment };
  }

  global.Grader = { grade: grade, parseNumberLoose: parseNumberLoose, normText: normText };
})(window);
