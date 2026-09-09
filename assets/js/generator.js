/*!
 * generator.js — 题目模板实例化引擎
 * 一份真题模板 + 随机变量 => 无限道同思路新题
 *
 * 模板字段（详见 PIPELINE.md）：
 *   vars        { name: {type:'int'|'dec'|'pick', min,max,step,digits,from} }
 *   derived     { name: "表达式" }        —— 由已生成的变量算出
 *   constraints [ "布尔表达式" ]           —— 必须全为真，否则重新抽数
 *   answer      { type, expr, denom, digits, tolerance, options, correctIndex, simplify }
 *   sanity      { integer, nonneg, positive, min, max, maxDigits, maxDen }
 *   stem / solution  支持 {表达式} 占位符 与 [[分子/分母]] 分数排版
 */
(function (global) {
  'use strict';

  var Expr = global.Expr;

  /* ---------- 随机 ---------- */
  function randInt(min, max, step) {
    step = step || 1;
    var span = Math.floor((max - min) / step);
    return min + Math.floor(Math.random() * (span + 1)) * step;
  }
  function randDec(min, max, digits) {
    var p = Math.pow(10, digits || 1);
    return randInt(Math.round(min * p), Math.round(max * p), 1) / p;
  }

  /* ---------- 数值格式化 ---------- */
  function fmtNum(v, digits) {
    if (v === null || v === undefined) return '';
    if (typeof v !== 'number') return String(v);
    if (!isFinite(v)) return String(v);
    if (Number.isInteger(v)) return String(v);
    var s = digits === undefined || digits === null ? String(Math.round(v * 1e9) / 1e9) : v.toFixed(digits);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }
  function gcd(a, b) { a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b)); while (b) { var t = b; b = a % b; a = t; } return a || 1; }

  function simplifyFrac(n, d) {
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d);
    return [n / g, d / g];
  }

  /* ---------- 富文本渲染 ---------- */
  function splitTop(s, ch) {
    var out = [], depth = 0, cur = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      if (c === ch && depth === 0) { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur);
    return out;
  }

  function evalIn(e, vars) {
    e = String(e).trim();
    if (Object.prototype.hasOwnProperty.call(vars, e)) return vars[e];
    return Expr.eval(e, vars);
  }
  function fmtIn(e, vars) {
    var v;
    try { v = evalIn(e, vars); } catch (err) { return '{' + e + '}'; }
    return typeof v === 'number' ? fmtNum(v) : String(v);
  }

  function subPlaceholders(s, vars) {
    return String(s).replace(/\{([^}]+)\}/g, function (m, e) { return fmtIn(e, vars); });
  }

  function renderHtml(s, vars) {
    if (!s) return '';
    // [[分子/分母]] -> 竖排分数
    s = String(s).replace(/\[\[([^\]]*)\]\]/g, function (m, inner) {
      inner = subPlaceholders(inner, vars);
      var parts = splitTop(inner, '/');
      if (parts.length === 2) {
        return '<span class="frac"><span class="num">' + parts[0].trim() + '</span><span class="den">' + parts[1].trim() + '</span></span>';
      }
      return inner;
    });
    s = s.replace(/\{([^}]+)\}/g, function (m, e) { return fmtIn(e, vars); });
    // 上标 / 下标： x^2  x_1
    s = s.replace(/\^\{?([0-9a-zA-Z]+)\}?/g, '<sup>$1</sup>')
         .replace(/_\{?([0-9a-zA-Z]+)\}?/g, '<sub>$1</sub>');
    return s;
  }

  function renderText(s, vars) {
    if (!s) return '';
    s = String(s).replace(/\[\[([^\]]*)\]\]/g, function (m, inner) {
      inner = subPlaceholders(inner, vars);
      var parts = splitTop(inner, '/');
      if (parts.length === 2) return parts[0].trim() + '/' + parts[1].trim();
      return inner;
    });
    s = s.replace(/\{([^}]+)\}/g, function (m, e) { return fmtIn(e, vars); });
    return s.replace(/\^\{?([0-9a-zA-Z]+)\}?/g, '^$1').replace(/_\{?([0-9a-zA-Z]+)\}?/g, '_$1');
  }

  // 双语字段：题干/解析/选项/答案都可能是 {zh,en}，实例化时随机（或由 preferLang 指定）选一种
  function resolveField(f, lang) {
    if (f && typeof f === 'object' && !Array.isArray(f)) {
      if (typeof f.zh !== 'undefined' || typeof f.en !== 'undefined') {
        if (typeof f[lang] !== 'undefined') return f[lang];
        return (typeof f.en !== 'undefined') ? f.en : f.zh;
      }
    }
    return f;
  }
  function pickLang(tpl) {
    if (Generator.preferLang === 'zh' || Generator.preferLang === 'en') return Generator.preferLang;
    return Math.random() < 0.5 ? 'zh' : 'en';
  }

  /* ---------- 变量生成 ---------- */
  function genVars(tpl) {
    var vars = {}, spec = tpl.vars || {};
    Object.keys(spec).forEach(function (k) {
      var s = spec[k];
      if (s.type === 'pick') {
        vars[k] = s.from[Math.floor(Math.random() * s.from.length)];
      } else if (s.type === 'dec') {
        vars[k] = randDec(s.min, s.max, s.digits === undefined ? 1 : s.digits);
      } else {
        vars[k] = randInt(s.min, s.max, s.step || 1);
      }
    });
    var der = tpl.derived || {};
    Object.keys(der).forEach(function (k) { vars[k] = Expr.eval(der[k], vars); });
    return vars;
  }

  function checkConstraints(tpl, vars) {
    var cs = tpl.constraints || [];
    for (var i = 0; i < cs.length; i++) {
      var r;
      try { r = Expr.test(cs[i], vars); } catch (e) { return false; }
      if (!r) return false;
    }
    return true;
  }

  function computeAnswer(tpl, vars, lang) {
    var a = tpl.answer || {};
    var out = { type: a.type || 'number' };

    if (out.type === 'choice') {
      var opts = (a.options || []).map(function (o) { return renderText(resolveField(o, lang), vars); });
      var ci = a.correctIndex;
      var multi = Array.isArray(ci);
      var idxs = opts.map(function (_, i) { return i; });
      // 洗牌
      for (var i = idxs.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = idxs[i]; idxs[i] = idxs[j]; idxs[j] = t; }
      var newOpts = idxs.map(function (i) { return opts[i]; });
      var newCi;
      if (multi) newCi = idxs.map(function (o, pos) { return pos; }).filter(function (pos) { return ci.indexOf(idxs[pos]) >= 0; });
      else newCi = idxs.indexOf(Array.isArray(ci) ? ci[0] : ci);
      out.options = newOpts;
      out.correctIndex = newCi;
      out.value = newCi;
      out.display = multi
        ? newCi.map(function (i) { return newOpts[i]; }).join('、')
        : newOpts[newCi];
      return out;
    }

    if (out.type === 'text') {
      out.value = renderText(resolveField(a.expr, lang), vars);
      out.display = out.value;
      out.alternatives = (a.alternatives || []).map(function (x) { return renderText(resolveField(x, lang), vars); });
      return out;
    }

    var v = Expr.eval(a.expr, vars);
    if (out.type === 'fraction') {
      var n = v, d = Expr.eval(a.denom === undefined ? 1 : a.denom, vars);
      var raw = [n, d];
      var simp = a.simplify === false ? [n, d] : simplifyFrac(n, d);
      out.value = n / d;
      out.num = simp[0]; out.den = simp[1]; out.raw = raw;
      out.display = d === 1 || simp[1] === 1 ? fmtNum(simp[0]) : (simp[0] + '/' + simp[1]);
    } else {
      out.value = v;
      out.display = fmtNum(v, a.digits);
    }
    out.tolerance = a.tolerance;
    out.digits = a.digits;
    out.alternatives = (a.alternatives || []).map(function (x) { return renderText(x, vars); });
    return out;
  }

  function checkSanity(tpl, ans) {
    var s = tpl.sanity || {};
    if (ans.type === 'choice') return true; // choice 的 value 是选项下标（多选为数组），不做数值检查
    var v = ans.display === undefined ? ans.value : ans.value;
    if (typeof v === 'string') return true;
    if (!isFinite(v)) return false;
    if (s.integer && Math.abs(v - Math.round(v)) > 1e-9) return false;
    if (s.nonneg && v < 0) return false;
    if (s.positive && v <= 0) return false;
    if (s.min !== undefined && v < s.min) return false;
    if (s.max !== undefined && v > s.max) return false;
    if (s.maxDigits !== undefined) {
      var r = Math.round(v * Math.pow(10, s.maxDigits)) / Math.pow(10, s.maxDigits);
      if (Math.abs(v - r) > 1e-9) return false;
    }
    if (ans.type === 'fraction') {
      if (s.maxDen && Math.abs(ans.den) > s.maxDen) return false;
      if (s.properFraction && Math.abs(ans.num) >= Math.abs(ans.den)) return false;
    }
    return true;
  }

  function hashCode(s) {
    var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  /**
   * 实例化一道题
   * @param {object} tpl 模板
   * @param {object} [avoid] 可选：{sigSet:Set} 避免与已生成的数值雷同
   */
  function instantiate(tpl, avoid) {
    var last = null;
    for (var attempt = 0; attempt < 400; attempt++) {
      var vars;
      try { vars = genVars(tpl); } catch (e) { continue; }
      if (!checkConstraints(tpl, vars)) continue;
      var lang = pickLang(tpl);
      var ans;
      try { ans = computeAnswer(tpl, vars, lang); } catch (e) { continue; }
      if (!checkSanity(tpl, ans)) continue;

      var sig = hashCode(JSON.stringify(vars));
      if (avoid && avoid.count && avoid.count[sig]) { if (attempt < 300) continue; }
      last = {
        key: tpl.id + '#' + sig,
        sig: sig,
        tplId: tpl.id,
        tpl: tpl,
        vars: vars,
        lang: lang,
        stemHtml: renderHtml(resolveField(tpl.stem, lang), vars),
        stemText: renderText(resolveField(tpl.stem, lang), vars),
        solutionHtml: renderHtml(resolveField(tpl.solution, lang), vars),
        solutionText: renderText(resolveField(tpl.solution, lang), vars),
        type: ans.type,
        value: ans.value,
        display: ans.display,
        options: ans.options,
        correctIndex: ans.correctIndex,
        num: ans.num, den: ans.den,
        tolerance: ans.tolerance,
        digits: ans.digits,
        alternatives: ans.alternatives,
        unit: tpl.unit || '',
        hint: renderHtml(resolveField(tpl.hint, lang), vars)
      };
      break;
    }
    return last;
  }

  global.Generator = {
    instantiate: instantiate,
    renderHtml: renderHtml,
    renderText: renderText,
    fmtNum: fmtNum,
    randInt: randInt,
    hashCode: hashCode,
    preferLang: null // 'zh' | 'en' | null(随机)
  };
})(window);
