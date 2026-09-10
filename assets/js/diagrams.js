/*!
 * diagrams.js — 可变量图形模板（内联 SVG）
 *
 * 目的：真题里的图如果跟"变量"有关（比如小棍被分成 k 段、数轴箭头在第 k 格），
 *       静态原题截图必然对不上新数值。这里用 SVG 按当前变量实时画图，
 *       数值/形式都能随题目变化。
 *
 * 模板里写：  "diagram": { "type": "stick", "parts": "k" }
 * 参数值可以是变量名（字符串）或直接的数字。
 *
 * 可用类型：
 *   stick       { parts }                     小棍平均分成 parts 小段，红白相间
 *   numberline  { E, n, k }                   0..E 分成 n 等份，箭头指第 k 格
 *   hexagon     { drawn }                     六边形，画了 drawn 条边（其余虚线）
 *   squareposts { p }                         正方形围栏，每边 p 根柱子（四角共用）
 *   lanterns    { count }                     红黄蓝绿循环的灯笼串，下标 1..count
 */
(function (global) {
  'use strict';

  var INK = '#333333', RED = '#e5484d', YELLOW = '#f5c518',
      BLUE = '#1f6feb', GREEN = '#2ea043', WHITE = '#ffffff', GREY = '#b9bec7';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v, vars) {
    if (typeof v === 'number') return v;
    if (v === null || v === undefined) return 0;
    var s = String(v);
    if (vars && Object.prototype.hasOwnProperty.call(vars, s)) return vars[s];
    var n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }
  function svgOpen(w, h, label) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="diagram" role="img" aria-label="' + esc(label) + '" preserveAspectRatio="xMidYMid meet">';
  }

  var TYPES = {
    /* 小棍：平均分成 parts 小段，红白相间（Q17） */
    stick: function (spec, vars) {
      var parts = Math.max(1, Math.min(40, Math.round(num(spec.parts, vars))));
      var W = 420, H = 74, x0 = 20, x1 = 400, y0 = 26, y1 = 56;
      var w = (x1 - x0) / parts, s = svgOpen(W, H, 'stick ' + parts + ' parts');
      if (parts <= 12) {
        for (var i = 0; i < parts; i++) {
          s += '<rect x="' + (x0 + i * w).toFixed(2) + '" y="' + y0 + '" width="' + w.toFixed(2) + '" height="' + (y1 - y0) +
               '" fill="' + (i % 2 === 0 ? RED : WHITE) + '" stroke="' + INK + '" stroke-width="1.5"/>';
        }
      }
      s += '<rect x="' + x0 + '" y="' + y0 + '" width="' + (x1 - x0) + '" height="' + (y1 - y0) + '" fill="none" stroke="' + INK + '" stroke-width="2.5"/>';
      s += '</svg>';
      return s;
    },

    /* 数轴：0..E 平均分成 n 格，箭头指从 0 数第 k 格（Q7） */
    numberline: function (spec, vars) {
      var E = num(spec.E, vars), n = Math.max(1, Math.min(30, Math.round(num(spec.n, vars))));
      var k = Math.max(1, Math.min(n, Math.round(num(spec.k, vars))));
      var W = 480, H = 106, x0 = 30, x1 = 450, y = 64, step = (x1 - x0) / n;
      var s = svgOpen(W, H, 'number line 0 to ' + E);
      s += '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="' + INK + '" stroke-width="2"/>';
      for (var i = 0; i <= n; i++) {
        var x = x0 + i * step;
        s += '<line x1="' + x.toFixed(2) + '" y1="' + (y - 9) + '" x2="' + x.toFixed(2) + '" y2="' + (y + 9) + '" stroke="' + INK + '" stroke-width="1.5"/>';
      }
      s += '<text x="' + x0 + '" y="' + (y + 32) + '" font-size="17" text-anchor="middle" fill="' + INK + '">0</text>';
      s += '<text x="' + x1 + '" y="' + (y + 32) + '" font-size="17" text-anchor="middle" fill="' + INK + '">' + esc(E) + '</text>';
      var kx = x0 + k * step;
      s += '<polygon points="' + kx.toFixed(2) + ',' + (y - 34) + ' ' + (kx - 9).toFixed(2) + ',' + (y - 17) + ' ' + (kx + 9).toFixed(2) + ',' + (y - 17) + '" fill="' + BLUE + '"/>';
      s += '<line x1="' + kx.toFixed(2) + '" y1="' + (y - 17) + '" x2="' + kx.toFixed(2) + '" y2="' + (y - 10) + '" stroke="' + BLUE + '" stroke-width="2.5"/>';
      s += '</svg>';
      return s;
    },

    /* 六边形：已经画了 drawn 条边，其余用虚线（Q4） */
    hexagon: function (spec, vars) {
      var drawn = Math.max(0, Math.min(6, Math.round(num(spec.drawn, vars))));
      var cx = 120, cy = 112, r = 72, pts = [];
      for (var i = 0; i < 6; i++) {
        var ang = -Math.PI / 2 + i * Math.PI / 3;
        pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
      }
      var s = svgOpen(240, 224, 'hexagon');
      for (var j = 0; j < 6; j++) {
        var p1 = pts[j], p2 = pts[(j + 1) % 6], solid = j < drawn;
        s += '<line x1="' + p1[0].toFixed(1) + '" y1="' + p1[1].toFixed(1) + '" x2="' + p2[0].toFixed(1) + '" y2="' + p2[1].toFixed(1) +
             '" stroke="' + (solid ? INK : GREY) + '" stroke-width="' + (solid ? 3 : 2) + '"' + (solid ? '' : ' stroke-dasharray="7 6"') + '/>';
      }
      pts.forEach(function (p) { s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.5" fill="' + INK + '"/>'; });
      s += '</svg>';
      return s;
    },

    /* 正方形围栏：每边 p 根柱子，四角共用（Q19） */
    squareposts: function (spec, vars) {
      var p = Math.max(2, Math.min(12, Math.round(num(spec.p, vars))));
      var W = 240, H = 240, a = 42, b = 198;
      var seen = {}, pts = [];
      function add(x, y) {
        var key = Math.round(x) + ',' + Math.round(y);
        if (!seen[key]) { seen[key] = 1; pts.push([x, y]); }
      }
      for (var i = 0; i < p; i++) {
        var t = p === 1 ? 0 : i / (p - 1);
        add(a + t * (b - a), b);
        add(b, b - t * (b - a));
        add(b - t * (b - a), a);
        add(a, a + t * (b - a));
      }
      var s = svgOpen(W, H, 'square paddock ' + p + ' posts per side');
      s += '<rect x="' + a + '" y="' + a + '" width="' + (b - a) + '" height="' + (b - a) + '" fill="none" stroke="' + INK + '" stroke-width="2"/>';
      pts.forEach(function (pt) {
        s += '<circle cx="' + pt[0].toFixed(1) + '" cy="' + pt[1].toFixed(1) + '" r="6" fill="' + BLUE + '" stroke="#ffffff" stroke-width="1.5"/>';
      });
      s += '</svg>';
      return s;
    },

    /* 灯笼串：红黄蓝绿循环，下标从 1 开始（Q21） */
    lanterns: function (spec, vars) {
      var count = Math.max(4, Math.min(24, Math.round(num(spec.count, vars) || 12)));
      var palette = [RED, YELLOW, BLUE, GREEN];
      var W = 40 + count * 34, H = 108, pad = 20;
      var cw = (W - pad * 2) / count;
      var s = svgOpen(W, H, 'lantern pattern');
      for (var i = 0; i < count; i++) {
        var cx = pad + cw * (i + 0.5), col = palette[i % palette.length];
        s += '<line x1="' + cx.toFixed(1) + '" y1="10" x2="' + cx.toFixed(1) + '" y2="26" stroke="' + INK + '" stroke-width="1.5"/>';
        s += '<rect x="' + (cx - 2).toFixed(1) + '" y="26" width="4" height="6" fill="' + INK + '"/>';
        s += '<ellipse cx="' + cx.toFixed(1) + '" cy="52" rx="' + Math.min(15, cw * 0.36).toFixed(1) + '" ry="19" fill="' + col + '" stroke="' + INK + '" stroke-width="1"/>';
        s += '<text x="' + cx.toFixed(1) + '" y="92" font-size="13" text-anchor="middle" fill="' + INK + '">' + (i + 1) + '</text>';
      }
      s += '</svg>';
      return s;
    }
  };

  function render(spec, vars) {
    if (!spec || !spec.type) return '';
    var fn = TYPES[spec.type];
    if (!fn) return '';
    try { return fn(spec, vars || {}); } catch (e) { return ''; }
  }

  global.Diagrams = { render: render, types: Object.keys(TYPES) };
})(window);
