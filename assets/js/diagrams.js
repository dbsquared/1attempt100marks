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
  /* 字符串 spec 里的 {占位符} 用 vars 解析（如 labels: "{lJ},{rJ},{bJ}"）。
     为什么需要：图内文字要随变量变（韦恩图三个圆的岗位名随机互换），
     而 num() 只处理数值。 */
  function strSpec(v, vars) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/\{(\w+)\}/g, function (m, k) {
      return (vars && Object.prototype.hasOwnProperty.call(vars, k)) ? String(vars[k]) : m;
    });
  }
  function svgOpen(w, h, label) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="diagram" role="img" aria-label="' + esc(label) + '" preserveAspectRatio="xMidYMid meet">';
  }

  /* 简化钟面：cx,cy 圆心，r 半径，hh 小时(0-11)，mm 分钟 */
  function clockFace(cx, cy, r, hh, mm) {
    var s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#ffffff" stroke="' + INK + '" stroke-width="2"/>';
    for (var t = 0; t < 12; t++) {
      var a = t * Math.PI / 6, r1 = r - 9, r2 = r - 2;
      s += '<line x1="' + (cx + r1 * Math.sin(a)).toFixed(1) + '" y1="' + (cy - r1 * Math.cos(a)).toFixed(1) +
           '" x2="' + (cx + r2 * Math.sin(a)).toFixed(1) + '" y2="' + (cy - r2 * Math.cos(a)).toFixed(1) +
           '" stroke="' + INK + '" stroke-width="2"/>';
    }
    var ha = ((hh % 12) + mm / 60) * Math.PI / 6, ma = (mm % 60) * Math.PI / 30;
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + r * 0.48 * Math.sin(ha)).toFixed(1) + '" y2="' + (cy - r * 0.48 * Math.cos(ha)).toFixed(1) + '" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>';
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + r * 0.76 * Math.sin(ma)).toFixed(1) + '" y2="' + (cy - r * 0.76 * Math.cos(ma)).toFixed(1) + '" stroke="' + BLUE + '" stroke-width="3" stroke-linecap="round"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="' + INK + '"/>';
    return s;
  }

  /* 悉尼四季：月份 -> 季节下标（0春 1夏 2秋 3冬），与模板 derived 保持同一公式 */
  function seasonOf(mm) { return Math.floor((((mm + 3) % 12)) / 3); }
  var SEASON_COLORS = ['#2ea043', '#e5484d', '#d97706', '#1f6feb'];
  /* 月份名（图里一律用原试卷的英文，不写中文） */
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

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
      var k = (spec.k === undefined || spec.k === null) ? null : Math.max(1, Math.min(n, Math.round(num(spec.k, vars))));
      var letters = strSpec(spec.letters, vars);
      var labs = letters ? letters.split(',') : null;
      var W = 460, H = 106, x0 = 28, x1 = 432, y = 64, step = (x1 - x0) / n;
      var s = svgOpen(W, H, 'number line 0 to ' + E);
      s += '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="' + INK + '" stroke-width="2"/>';
      for (var i = 0; i <= n; i++) {
        var x = x0 + i * step;
        s += '<line x1="' + x.toFixed(2) + '" y1="' + (y - 9) + '" x2="' + x.toFixed(2) + '" y2="' + (y + 9) + '" stroke="' + INK + '" stroke-width="1.5"/>';
      }
      /* 刻度上方的字母（原卷 Q28：A–H 标在每个刻度上，紧贴刻度、醒目） */
      if (labs) {
        for (var li = 0; li < n && li < labs.length; li++) {
          var lx = x0 + (li + 1) * step;
          s += '<circle cx="' + lx.toFixed(2) + '" cy="' + (y - 20) + '" r="11" fill="#ffffff" stroke="' + INK + '" stroke-width="1.2"/>';
          s += '<text x="' + lx.toFixed(2) + '" y="' + (y - 15) + '" font-size="14" font-weight="bold" text-anchor="middle" fill="' + INK + '">' + esc(labs[li]) + '</text>';
        }
      }
      s += '<text x="' + x0 + '" y="' + (y + 32) + '" font-size="17" text-anchor="middle" fill="' + INK + '">0</text>';
      /* 每两格标一个数值（原卷：0.5 / 1.0 / 1.5 / 2.0），末格若已标就不再单独画 E */
      var lastLabeled = false;
      for (var vi = 2; vi <= n; vi += 2) {
        var vx = x0 + vi * step;
        var val = E * vi / n;
        var vs = (Math.abs(val - Math.round(val)) < 1e-9) ? String(Math.round(val)) : String(+val.toFixed(2));
        s += '<text x="' + vx.toFixed(2) + '" y="' + (y + 32) + '" font-size="15" text-anchor="middle" fill="' + INK + '">' + esc(vs) + '</text>';
        if (vi === n) lastLabeled = true;
      }
      if (!lastLabeled) s += '<text x="' + x1 + '" y="' + (y + 32) + '" font-size="17" text-anchor="middle" fill="' + INK + '">' + esc(E) + '</text>';
      /* 箭头可选：只有显式传 k 才画（Q28 这类「字母点」题不传，避免泄答案） */
      if (k !== null) {
        var kx = x0 + k * step;
        s += '<line x1="' + kx.toFixed(2) + '" y1="' + (y - 48) + '" x2="' + kx.toFixed(2) + '" y2="' + (y - 20) + '" stroke="' + RED + '" stroke-width="3"/>';
        s += '<polygon points="' + kx.toFixed(2) + ',' + (y - 8) + ' ' + (kx - 8).toFixed(2) + ',' + (y - 22) + ' ' + (kx + 8).toFixed(2) + ',' + (y - 22) + '" fill="' + RED + '"/>';
      }
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

    /* 灯笼串：红黄蓝绿循环，下标从 1 开始（Q21）。
       末尾画「…」表示按同样顺序继续挂下去 —— 题目问的是图里没有画出来的那一个，
       规律必须从图里读出来，不能把「红黄蓝绿」写进题干。 */
    lanterns: function (spec, vars) {
      var count = Math.max(4, Math.min(20, Math.round(num(spec.count, vars) || 12)));
      var palette = [RED, YELLOW, BLUE, GREEN];
      var pad = 20, tail = 30, step = 34, H = 112;
      if (pad * 2 + count * step + tail > 478) {
        step = Math.max(20, Math.floor((478 - pad * 2 - tail) / count));   // 太宽就压缩间距，别超过 480
      }
      var s = svgOpen(pad * 2 + count * step + tail, H, 'lantern pattern: red yellow blue green repeating');
      for (var i = 0; i < count; i++) {
        var cx = pad + step * (i + 0.5), col = palette[i % palette.length];
        s += '<line x1="' + cx.toFixed(1) + '" y1="10" x2="' + cx.toFixed(1) + '" y2="26" stroke="' + INK + '" stroke-width="1.5"/>';
        s += '<rect x="' + (cx - 2).toFixed(1) + '" y="26" width="4" height="6" fill="' + INK + '"/>';
        s += '<ellipse data-u="lantern" cx="' + cx.toFixed(1) + '" cy="52" rx="' + Math.min(15, step * 0.36).toFixed(1) +
             '" ry="19" fill="' + col + '" stroke="' + INK + '" stroke-width="1"/>';
        s += '<text x="' + cx.toFixed(1) + '" y="92" font-size="13" text-anchor="middle" fill="' + INK + '">' + (i + 1) + '</text>';
      }
      s += '<text x="' + (pad + step * count + 2).toFixed(1) + '" y="62" font-size="26" fill="' + INK + '">…</text>';
      s += '<text x="' + (pad + step * count / 2).toFixed(1) + '" y="' + (H - 4) + '" font-size="12" text-anchor="middle" fill="' + INK + '">and so on, in the same order</text>';
      s += '</svg>';
      return s;
    },

    /* 花瓶里的花：count 朵，答案就是朵数（Q1，可变） */
    vase: function (spec, vars) {
      var n = Math.max(1, Math.min(12, Math.round(num(spec.count, vars))));
      var W = 320, H = 250, pal = [RED, YELLOW, BLUE, GREEN, '#b25be0', '#f2708a'];
      var per = 5, i, row, cnt, x, y;
      var s = svgOpen(W, H, 'vase with ' + n + ' flowers');
      s += '<rect x="112" y="142" width="96" height="16" rx="4" fill="#5aa860" stroke="' + INK + '" stroke-width="2"/>';
      s += '<path d="M120,158 L200,158 L188,236 Q160,246 132,236 Z" fill="#7bc47f" stroke="' + INK + '" stroke-width="2"/>';
      for (i = 0; i < n; i++) {   // 先画茎
        row = Math.floor(i / per); cnt = Math.min(per, n - row * per);
        x = 160 + ((i % per) - (cnt - 1) / 2) * 34; y = 108 - row * 40;
        s += '<line x1="' + x + '" y1="' + (y + 6) + '" x2="160" y2="152" stroke="#3f8f4a" stroke-width="2"/>';
      }
      for (i = 0; i < n; i++) {   // 再画花（盖住茎）
        row = Math.floor(i / per); cnt = Math.min(per, n - row * per);
        x = 160 + ((i % per) - (cnt - 1) / 2) * 34; y = 108 - row * 40;
        s += '<circle cx="' + x + '" cy="' + y + '" r="11" fill="' + pal[i % pal.length] + '" stroke="' + INK + '" stroke-width="1.5"/>';
        s += '<circle cx="' + x + '" cy="' + y + '" r="4" fill="#fff3b0" stroke="' + INK + '" stroke-width="1"/>';
      }
      s += '</svg>';
      return s;
    },

    /* 房子：随机"少用一种形状"（0三角形 1正方形 2长方形 3圆形），其余三种都出现（Q6，可变） */
    house: function (spec, vars) {
      var omit = Math.round(num(spec.omit, vars));
      var s = svgOpen(300, 260, 'house picture');
      s += '<line x1="20" y1="228" x2="280" y2="228" stroke="' + INK + '" stroke-width="2"/>';
      if (omit === 0) s += '<polygon points="52,120 100,66 200,66 248,120" fill="#c98b5b" stroke="' + INK + '" stroke-width="2"/>';
      else s += '<polygon points="52,120 150,58 248,120" fill="#c98b5b" stroke="' + INK + '" stroke-width="2"/>';
      s += '<rect x="60" y="120" width="180" height="108" fill="#f2e6c9" stroke="' + INK + '" stroke-width="2"/>';
      s += '<rect x="128" y="164" width="44" height="64" fill="#a9743f" stroke="' + INK + '" stroke-width="2"/>';
      if (omit === 1) {
        s += '<circle cx="92" cy="150" r="15" fill="#bfe3ff" stroke="' + INK + '" stroke-width="2"/>';
        s += '<circle cx="208" cy="150" r="15" fill="#bfe3ff" stroke="' + INK + '" stroke-width="2"/>';
      } else {
        s += '<rect x="77" y="135" width="30" height="30" fill="#bfe3ff" stroke="' + INK + '" stroke-width="2"/>';
        s += '<rect x="193" y="135" width="30" height="30" fill="#bfe3ff" stroke="' + INK + '" stroke-width="2"/>';
      }
      if (omit !== 3) s += '<circle cx="164" cy="196" r="5" fill="#f5c518" stroke="' + INK + '" stroke-width="1.5"/>';
      s += '</svg>';
      return s;
    },

    /* 四个钟面 A/B/C/D：correctCell 那个显示 baseH:30，其余显示 :00/:15/:45（Q12，可变） */
    clocks: function (spec, vars) {
      var h = ((Math.round(num(spec.baseH, vars)) % 12) + 12) % 12 || 12;
      var cell = Math.max(0, Math.min(3, Math.round(num(spec.correctCell, vars))));
      var others = [[h, 0], [h, 15], [h, 45]], times = [], oi = 0, i;
      for (i = 0; i < 4; i++) times[i] = (i === cell) ? [h, 30] : others[oi++];
      var pos = [[84, 74], [236, 74], [84, 216], [236, 216]];
      var s = svgOpen(320, 300, 'four clocks');
      for (i = 0; i < 4; i++) s += clockFace(pos[i][0], pos[i][1], 52, times[i][0] % 12, times[i][1]);
      s += '</svg>';
      return s;
    },

    /* 书架：rows 层 × cols 本，颜色按 索引%4 循环；不标出目标，学生自己定位（Q16，可变） */
    bookshelf: function (spec, vars) {
      var rows = Math.max(1, Math.min(6, Math.round(num(spec.rows, vars)) || 3));
      var cols = Math.max(1, Math.min(8, Math.round(num(spec.cols, vars)) || 5));
      var pal = [RED, YELLOW, BLUE, GREEN];
      var W = 44 + cols * 44, H = 26 + rows * 56, r, c;
      var s = svgOpen(W, H, 'bookshelf');
      for (r = 0; r < rows; r++) {
        var y = 18 + r * 56;
        s += '<rect x="12" y="' + y + '" width="' + (W - 24) + '" height="50" fill="#f7f1e3" stroke="' + INK + '" stroke-width="2"/>';
        for (c = 0; c < cols; c++) {
          s += '<rect x="' + (22 + c * 44) + '" y="' + (y + 6) + '" width="28" height="40" rx="3" fill="' + pal[(r * cols + c) % pal.length] + '" stroke="' + INK + '" stroke-width="1.5"/>';
        }
      }
      s += '</svg>';
      return s;
    },

    /* 悉尼四季圆盘：12 个月按季节着色 + 月份数字 + 图例（Q22，可变） */
    seasonwheel: function (spec, vars) {
      var W = 340, H = 330, cx = 170, cy = 150, R = 112;
      var s = svgOpen(W, H, 'season wheel');
      for (var i = 0; i < 12; i++) {
        var c0 = (i * 30 - 90 - 15) * Math.PI / 180, c1 = (i * 30 - 90 + 15) * Math.PI / 180, cm = (i * 30 - 90) * Math.PI / 180;
        s += '<path d="M' + cx + ',' + cy +
             ' L' + (cx + R * Math.cos(c0)).toFixed(1) + ',' + (cy + R * Math.sin(c0)).toFixed(1) +
             ' A' + R + ',' + R + ' 0 0 1 ' + (cx + R * Math.cos(c1)).toFixed(1) + ',' + (cy + R * Math.sin(c1)).toFixed(1) + ' Z"' +
             ' fill="' + SEASON_COLORS[seasonOf(i + 1)] + '" stroke="#ffffff" stroke-width="1.5"/>';
        s += '<text x="' + (cx + R * 0.72 * Math.cos(cm)).toFixed(1) + '" y="' + (cy + R * 0.72 * Math.sin(cm) + 5).toFixed(1) +
             '" font-size="14" text-anchor="middle" fill="#ffffff" font-weight="700">' + (i + 1) + '</text>';
      }
      /* 图里出现的一切文字都用**原试卷的语言**（ICAS 是英文卷），不要翻成中文。
         标签尽量照抄原卷：spring/summer/autumn/winter。 */
      var names = ['spring Sep-Nov', 'summer Dec-Feb', 'autumn Mar-May', 'winter Jun-Aug'];
      for (var k = 0; k < 4; k++) {
        s += '<rect x="' + (38 + k * 76) + '" y="288" width="14" height="14" rx="3" fill="' + SEASON_COLORS[k] + '" stroke="' + INK + '" stroke-width="1"/>';
        s += '<text x="' + (38 + k * 76) + '" y="316" font-size="12" fill="' + INK + '">' + names[k] + '</text>';
      }
      s += '</svg>';
      return s;
    }
  };

  /* 小猪：cx,cy 中心，s 半尺寸（Q30） */
  function pig(cx, cy, s) {
    var p = '#f2a6b3', d = '#c9748a', o = '';
    o += '<ellipse cx="' + cx + '" cy="' + (cy + s * 0.36).toFixed(1) + '" rx="' + (s * 0.52).toFixed(1) + '" ry="' + (s * 0.30).toFixed(1) + '" fill="' + p + '" stroke="' + INK + '" stroke-width="1"/>';
    o += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (s * 0.38).toFixed(1) + '" fill="' + p + '" stroke="' + INK + '" stroke-width="1"/>';
    o += '<polygon points="' + (cx - s * 0.34).toFixed(1) + ',' + (cy - s * 0.16).toFixed(1) + ' ' + (cx - s * 0.10).toFixed(1) + ',' + (cy - s * 0.54).toFixed(1) + ' ' + (cx - s * 0.01).toFixed(1) + ',' + (cy - s * 0.18).toFixed(1) + '" fill="' + p + '" stroke="' + INK + '" stroke-width="1"/>';
    o += '<polygon points="' + (cx + s * 0.34).toFixed(1) + ',' + (cy - s * 0.16).toFixed(1) + ' ' + (cx + s * 0.10).toFixed(1) + ',' + (cy - s * 0.54).toFixed(1) + ' ' + (cx + s * 0.01).toFixed(1) + ',' + (cy - s * 0.18).toFixed(1) + '" fill="' + p + '" stroke="' + INK + '" stroke-width="1"/>';
    o += '<ellipse cx="' + cx + '" cy="' + (cy + s * 0.13).toFixed(1) + '" rx="' + (s * 0.17).toFixed(1) + '" ry="' + (s * 0.12).toFixed(1) + '" fill="' + d + '" stroke="' + INK + '" stroke-width="0.8"/>';
    o += '<circle cx="' + (cx - s * 0.15).toFixed(1) + '" cy="' + (cy - s * 0.06).toFixed(1) + '" r="' + (s * 0.06).toFixed(1) + '" fill="' + INK + '"/>';
    o += '<circle cx="' + (cx + s * 0.15).toFixed(1) + '" cy="' + (cy - s * 0.06).toFixed(1) + '" r="' + (s * 0.06).toFixed(1) + '" fill="' + INK + '"/>';
    return o;
  }

  /* 棋盘格颜色：(行+列) 偶数 -> 蓝，奇数 -> 黄 */
  function checker(r, c) { return ((r + c) % 2 === 0) ? BLUE : YELLOW; }

  var TYPES2 = {
    /* （原来的平面礼物盒已删除：TYPES2 里同名 key 会静默覆盖，只保留下面那个 3D 版） */

    /* 钱包里可用的硬币面值（Q23） */
    coins: function (spec, vars) {
      var vals = [5, 10, 20, 50], r = [22, 27, 33, 40];
      var W = 440, H = 150, s = svgOpen(W, H, 'coins 5 10 20 50');
      s += '<path d="M22,78 Q22,44 78,44 Q134,44 134,78 Q134,116 78,116 Q22,116 22,78 Z" fill="#e0c9a6" stroke="' + INK + '" stroke-width="2"/>';
      s += '<path d="M46,46 Q78,20 110,46" fill="none" stroke="' + INK + '" stroke-width="3"/>';
      s += '<text x="78" y="86" font-size="17" font-weight="700" text-anchor="middle" fill="' + INK + '">purse</text>';
      for (var i = 0; i < 4; i++) {
        var cx = 200 + r[i] + i * 2 + (i ? r[i - 1] : 0) + i * 12, cy = 76;
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r[i] + '" fill="#f5d67b" stroke="' + INK + '" stroke-width="2"/>';
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r[i] - 7) + '" fill="none" stroke="' + INK + '" stroke-width="1" stroke-dasharray="4 4"/>';
        s += '<text x="' + cx + '" y="' + (cy + 6) + '" font-size="15" font-weight="700" text-anchor="middle" fill="' + INK + '">' + vals[i] + 'c</text>';
      }
      s += '</svg>';
      return s;
    },

    /* 蓝黄方砖桌面，2×2 虚线缺口在 (r,c)（Q24 主图） */
    tiling: function (spec, vars) {
      var n = Math.max(3, Math.min(7, Math.round(num(spec.n, vars)) || 5));
      var r = Math.max(0, Math.min(n - 2, Math.round(num(spec.r, vars))));
      var c = Math.max(0, Math.min(n - 2, Math.round(num(spec.c, vars))));
      var cell = 52, W = n * cell + 20, H = n * cell + 20, i, j;
      var s = svgOpen(W, H, 'tiled table with a missing patch');
      for (i = 0; i < n; i++) for (j = 0; j < n; j++) {
        var hole = (i >= r && i <= r + 1 && j >= c && j <= c + 1);
        s += '<rect x="' + (10 + j * cell) + '" y="' + (10 + i * cell) + '" width="' + cell + '" height="' + cell +
             '" fill="' + (hole ? '#ffffff' : checker(i, j)) + '" stroke="' + INK + '" stroke-width="1.5"/>';
      }
      s += '<rect x="' + (10 + c * cell) + '" y="' + (10 + r * cell) + '" width="' + (cell * 2) + '" height="' + (cell * 2) +
           '" fill="none" stroke="' + RED + '" stroke-width="3" stroke-dasharray="9 6"/>';
      s += '</svg>';
      return s;
    },

    /* 2×2 补块候选：按 (r,c) 位置算正确配色，flip>=0 时把第 flip 格反过来（Q24 选项） */
    tilepatch: function (spec, vars) {
      var r = Math.round(num(spec.r, vars)), c = Math.round(num(spec.c, vars));
      var f = Math.round(num(spec.flip, vars));
      var cell = 40, W = 2 * cell + 16, H = 2 * cell + 16, i, j;
      var s = svgOpen(W, H, 'patch option');
      for (i = 0; i < 2; i++) for (j = 0; j < 2; j++) {
        var k = i * 2 + j, col = checker(r + i, c + j);
        if (k === f) col = (col === BLUE) ? YELLOW : BLUE;
        s += '<rect x="' + (8 + j * cell) + '" y="' + (8 + i * cell) + '" width="' + cell + '" height="' + cell +
             '" fill="' + col + '" stroke="' + INK + '" stroke-width="2"/>';
      }
      s += '<rect x="8" y="8" width="' + (cell * 2) + '" height="' + (cell * 2) + '" fill="none" stroke="' + INK + '" stroke-width="3"/>';
      s += '</svg>';
      return s;
    },

    /* 黑白棋盘 + 西塔的棋子；马克在下方（Q26 主图） */
    board: function (spec, vars) {
      var rows = Math.max(3, Math.min(7, Math.round(num(spec.rows, vars)) || 5));
      var cols = Math.max(3, Math.min(7, Math.round(num(spec.cols, vars)) || 6));
      var sr = Math.max(0, Math.min(rows - 1, Math.round(num(spec.sr, vars))));
      var sc = Math.max(0, Math.min(cols - 1, Math.round(num(spec.sc, vars))));
      /* 西塔在棋盘上方、马克在下方 —— 西塔面朝马克（画面下方），
         所以"她自己的左边"是画面的右边。方位必须画出来，否则题目没法定向。 */
      var cell = 52, top = 34, W = cols * cell + 20, H = rows * cell + top + 46, i, j;
      var s = svgOpen(W, H, 'checker board with Sita above and Mark below');
      s += '<text x="' + (W / 2) + '" y="22" font-size="18" font-weight="700" text-anchor="middle" fill="' + BLUE + '">↑ Sita ↑</text>';
      for (i = 0; i < rows; i++) for (j = 0; j < cols; j++) {
        s += '<rect x="' + (10 + j * cell) + '" y="' + (top + i * cell) + '" width="' + cell + '" height="' + cell +
             '" fill="' + (((i + j) % 2 === 0) ? '#3a3f45' : '#f2f2f2') + '" stroke="' + INK + '" stroke-width="1.5"/>';
      }
      s += '<circle cx="' + (10 + sc * cell + cell / 2) + '" cy="' + (top + sr * cell + cell / 2) + '" r="17" fill="' + BLUE + '" stroke="#ffffff" stroke-width="3"/>';
      s += '<text x="' + (W / 2) + '" y="' + (top + rows * cell + 30) + '" font-size="18" font-weight="700" text-anchor="middle" fill="' + INK + '">↓ Mark ↓</text>';
      s += '</svg>';
      return s;
    },

    /* 棋盘候选：在 (hr,hc) 画红圈（Q26 选项） */
    boardopt: function (spec, vars) {
      var rows = Math.max(3, Math.min(7, Math.round(num(spec.rows, vars)) || 5));
      var cols = Math.max(3, Math.min(7, Math.round(num(spec.cols, vars)) || 6));
      var hr = Math.max(0, Math.min(rows - 1, Math.round(num(spec.hr, vars))));
      var hc = Math.max(0, Math.min(cols - 1, Math.round(num(spec.hc, vars))));
      var cell = 34, W = cols * cell + 16, H = rows * cell + 16, i, j;
      var s = svgOpen(W, H, 'board option');
      for (i = 0; i < rows; i++) for (j = 0; j < cols; j++) {
        s += '<rect x="' + (8 + j * cell) + '" y="' + (8 + i * cell) + '" width="' + cell + '" height="' + cell +
             '" fill="' + (((i + j) % 2 === 0) ? '#3a3f45' : '#f2f2f2') + '" stroke="' + INK + '" stroke-width="1"/>';
      }
      s += '<circle cx="' + (8 + hc * cell + cell / 2) + '" cy="' + (8 + hr * cell + cell / 2) + '" r="' + (cell * 0.34).toFixed(1) +
           '" fill="none" stroke="' + RED + '" stroke-width="4"/>';
      s += '</svg>';
      return s;
    },

    /* 四个猪圈成一排，箭头只能 A→B→C→D，圈内是猪（Q30） */
    pens: function (spec, vars) {
      var p = [0, 1, 2, 3].map(function (k) {
        return Math.max(0, Math.min(12, Math.round(num(spec['p' + 'ABCD'[k]], vars))));
      });
      var pw = 92, ph = 150, gap = 28, x0 = 10, y0 = 22, i, j, k;
      var W = 4 * pw + 3 * gap + 20, H = ph + 60;
      var s = svgOpen(W, H, 'four pig pens');
      for (k = 0; k < 4; k++) {
        var bx = x0 + k * (pw + gap);
        s += '<rect x="' + bx + '" y="' + y0 + '" width="' + pw + '" height="' + ph + '" fill="#f3f7ef" stroke="' + INK + '" stroke-width="2.5" rx="6"/>';
        s += '<text x="' + (bx + pw / 2) + '" y="' + (y0 + ph + 26) + '" font-size="17" font-weight="700" text-anchor="middle" fill="' + INK + '">' + 'ABCD'[k] + '</text>';
        for (i = 0; i < p[k]; i++) {
          var col = i % 3, rowi = Math.floor(i / 3);
          s += pig(bx + 24 + col * 27, y0 + 28 + rowi * 30, 11);
        }
        if (k < 3) {
          var ax = bx + pw + 3;
          s += '<line x1="' + ax + '" y1="' + (y0 + ph / 2) + '" x2="' + (ax + gap - 12) + '" y2="' + (y0 + ph / 2) + '" stroke="' + INK + '" stroke-width="2.5"/>';
          s += '<polygon points="' + (ax + gap - 12) + ',' + (y0 + ph / 2) + ' ' + (ax + gap - 24) + ',' + (y0 + ph / 2 - 7) + ' ' + (ax + gap - 24) + ',' + (y0 + ph / 2 + 7) + '" fill="' + INK + '"/>';
        }
      }
      s += '<text x="' + (W / 2) + '" y="' + (y0 + ph + 52) + '" font-size="14" text-anchor="middle" fill="#666">pigs move only in the direction of the arrows</text>';
      s += '</svg>';
      return s;
    }
  };

  /* 单元格文本：数字/变量名 -> 数字；其它（如 "?"）原样输出 */
  function cellText(v, vars) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return fmt(v);
    var s = String(v);
    if (vars && Object.prototype.hasOwnProperty.call(vars, s)) return fmt(vars[s]);
    /* 也接受 {a} 占位写法（与 stem 里的占位符一致），按 vars['a'] 取值 */
    var m = s.match(/^\s*\{([A-Za-z_][A-Za-z0-9_]*)\}\s*$/);
    if (m && vars && Object.prototype.hasOwnProperty.call(vars, m[1])) return fmt(vars[m[1]]);
    if (/^\s*-?[\d.]+\s*$/.test(s)) return fmt(parseFloat(s));
    return s;
  }

  /* 颜色明暗（amt>0 变亮，<0 变暗） */
  function shade(hex, amt) {
    var n = parseInt(String(hex).slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    function f(c) { var v = amt >= 0 ? c + (255 - c) * amt : c * (1 + amt); return Math.max(0, Math.min(255, Math.round(v))); }
    return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }

  /* 立体盒子：(x,y) 正面左上角，w/h 正面宽高，d 进深（右上方向）
     tag 会写在正面矩形上，方便自检脚本按“大小是否真的能装下某物”做断言 */
  function box3d(x, y, w, h, d, fill, tag) {
    var dx = d, dy = -d * 0.62, o = '';
    o += '<polygon points="' + x + ',' + y + ' ' + (x + dx) + ',' + (y + dy) + ' ' + (x + w + dx) + ',' + (y + dy) + ' ' + (x + w) + ',' + y +
         '" fill="' + shade(fill, 0.3) + '" stroke="' + INK + '" stroke-width="1.6"/>';
    o += '<polygon points="' + (x + w) + ',' + y + ' ' + (x + w + dx) + ',' + (y + dy) + ' ' + (x + w + dx) + ',' + (y + h + dy) + ' ' + (x + w) + ',' + (y + h) +
         '" fill="' + shade(fill, -0.2) + '" stroke="' + INK + '" stroke-width="1.6"/>';
    o += '<rect' + (tag ? ' data-box="' + tag + '" data-w="' + w + '" data-h="' + h + '" data-d="' + d + '"' : '') +
         ' x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '" stroke="' + INK + '" stroke-width="1.6"/>';
    o += '<rect x="' + (x + w / 2 - 6) + '" y="' + y + '" width="12" height="' + h + '" fill="#e5484d" opacity="0.8"/>';
    o += '<rect x="' + x + '" y="' + (y + h / 2 - 6) + '" width="' + w + '" height="12" fill="#e5484d" opacity="0.8"/>';
    return o;
  }

  /* 小球（象形统计图里的一个单位） */
  function ballIcon(cx, cy, r) {
    var o = '<circle data-u="ball" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#ffffff" stroke="' + INK + '" stroke-width="1.6"/>';
    o += '<polygon points="' + (cx - r * 0.42).toFixed(1) + ',' + (cy - r * 0.28).toFixed(1) + ' ' + (cx + r * 0.42).toFixed(1) + ',' + (cy - r * 0.28).toFixed(1) +
         ' ' + (cx + r * 0.6).toFixed(1) + ',' + (cy + r * 0.42).toFixed(1) + ' ' + cx + ',' + (cy + r * 0.78).toFixed(1) + ' ' +
         (cx - r * 0.6).toFixed(1) + ',' + (cy + r * 0.42).toFixed(1) + '" fill="' + INK + '"/>';
    var angs = [-54, 54, 18, 90, 162];
    for (var i = 0; i < angs.length; i++) {
      var a = (angs[i] - 90) * Math.PI / 180;
      o += '<line x1="' + (cx + r * 0.42 * Math.cos(a) * 1.0).toFixed(1) + '" y1="' + (cy + r * 0.42 * Math.sin(a)).toFixed(1) +
           '" x2="' + (cx + r * 0.95 * Math.cos(a)).toFixed(1) + '" y2="' + (cy + r * 0.95 * Math.sin(a)).toFixed(1) +
           '" stroke="' + INK + '" stroke-width="1.2"/>';
    }
    return o;
  }

  /* 划记法：5 个一组（4 竖 + 1 斜）。groupW/step 可压缩，避免超出表格列宽 */
  function tally(cx0, cy, n, groupW, step) {
    groupW = groupW || 46; step = step || 9;
    var o = '', i, gx;
    for (i = 0; i < n; i++) {
      gx = cx0 + Math.floor(i / 5) * groupW + (i % 5) * step;
      if (i % 5 === 4) {
        o += '<line data-u="tally" x1="' + (gx - groupW * 0.65) + '" y1="' + (cy + 12) + '" x2="' + (gx + 2) + '" y2="' + (cy - 14) + '" stroke="' + INK + '" stroke-width="2.6"/>';
      } else {
        o += '<line data-u="tally" x1="' + gx + '" y1="' + (cy - 14) + '" x2="' + gx + '" y2="' + (cy + 14) + '" stroke="' + INK + '" stroke-width="2.6"/>';
      }
    }
    return o;
  }

  var TYPES3 = {
    /* 天气卡片：今天几月几日星期几 + 天气（Q2） */
    weathercard: function (spec, vars) {
      var d = Math.round(num(spec.day, vars)), mm = Math.round(num(spec.month, vars)) || 6;
      var sunny = spec.weather !== 'rain';
      var W = 420, H = 200, s = svgOpen(W, H, 'today weather card');
      s += '<rect x="8" y="8" width="404" height="184" rx="14" fill="#eaf4ff" stroke="' + INK + '" stroke-width="2"/>';
      // 太阳 / 云
      if (sunny) {
        s += '<circle cx="102" cy="86" r="34" fill="' + YELLOW + '" stroke="' + INK + '" stroke-width="1.6"/>';
        for (var i = 0; i < 8; i++) {
          var a = i * Math.PI / 4;
          s += '<line x1="' + (102 + 42 * Math.cos(a)).toFixed(1) + '" y1="' + (86 + 42 * Math.sin(a)).toFixed(1) +
               '" x2="' + (102 + 56 * Math.cos(a)).toFixed(1) + '" y2="' + (86 + 56 * Math.sin(a)).toFixed(1) +
               '" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>';
        }
        s += '<circle cx="92" cy="80" r="3" fill="' + INK + '"/><circle cx="112" cy="80" r="3" fill="' + INK + '"/>';
        s += '<path d="M90,96 Q102,108 114,96" fill="none" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>';
      } else {
        s += '<ellipse cx="102" cy="92" rx="46" ry="28" fill="#cfd8e3" stroke="' + INK + '" stroke-width="1.6"/>';
        for (var r = 0; r < 4; r++) s += '<line x1="' + (78 + r * 16) + '" y1="124" x2="' + (72 + r * 16) + '" y2="142" stroke="' + BLUE + '" stroke-width="2.6" stroke-linecap="round"/>';
      }
      s += '<rect x="186" y="52" width="204" height="96" rx="12" fill="#ffffff" stroke="' + RED + '" stroke-width="3"/>';
      s += '<text x="288" y="80" font-size="18" font-weight="700" text-anchor="middle" fill="' + INK + '">Today is Monday</text>';
      s += '<text x="288" y="112" font-size="20" font-weight="700" text-anchor="middle" fill="' + RED + '">' + d + ' ' + MONTHS[(mm - 1) % 12] + '</text>';
      s += '<text x="102" y="172" font-size="22" font-weight="700" text-anchor="middle" fill="' + INK + '">' + (sunny ? 'It is sunny.' : 'It is raining.') + '</text>';
      s += '</svg>';
      return s;
    },

    /* 小棒搭图形：连成一串、相邻三角形共用一条边（Q3，第 k 个图形用 2k+1 根） */
    stickrow: function (spec, vars) {
      var shown = Math.max(1, Math.min(5, Math.round(num(spec.shapes, vars) || 3)));
      var u = 56, h = u * 0.86, B = 132, T = B - h, pad = 16, gap = 30;
      var span = function (k) { return (k + 1) * u / 2; };   // 图形 k 的总跨度
      var W = pad * 2 + gap * (shown - 1), k;
      for (k = 1; k <= shown; k++) W += span(k);
      var s = svgOpen(Math.max(320, W), 200, 'stick shapes in a pattern');
      var x0 = pad, i;
      for (k = 1; k <= shown; k++) {
        var seen = {};   // 相邻三角形共用的边只算一根小棒
        for (i = 0; i < k; i++) {
          var tri;
          if (i % 2 === 0) {                       // 尖朝上的三角形
            var xl = x0 + (i / 2) * u;
            tri = [[xl, B], [xl + u, B], [xl + u / 2, T]];
          } else {                                  // 尖朝下、与上一个共用一条边
            var xb = x0 + ((i + 1) / 2) * u;
            tri = [[xb, B], [xb - u / 2, T], [xb + u / 2, T]];
          }
          for (var e = 0; e < 3; e++) {
            var p = tri[e], q = tri[(e + 1) % 3];
            var a1 = p[0].toFixed(1) + ',' + p[1].toFixed(1), b1 = q[0].toFixed(1) + ',' + q[1].toFixed(1);
            var key = a1 < b1 ? a1 + '|' + b1 : b1 + '|' + a1;
            if (seen[key]) continue;
            seen[key] = 1;
            s += '<line data-u="stick" x1="' + p[0].toFixed(1) + '" y1="' + p[1].toFixed(1) + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) +
                 '" stroke="#a9743f" stroke-width="6" stroke-linecap="round"/>';
          }
        }
        s += '<text x="' + (x0 + span(k) / 2).toFixed(1) + '" y="176" font-size="17" font-weight="700" text-anchor="middle" fill="' + INK + '">shape ' + k + '</text>';
        x0 += span(k) + gap;
      }
      s += '</svg>';
      return s;
    },

    /* 数字卡片排（Q5 摆两位数 / Q11 选三张） */
    cardrow: function (spec, vars) {
      var cards = spec.cards || [];
      var slots = Math.max(0, Math.round(num(spec.slots, vars) || 0));
      var cw = 52, ch = 80, gap = 12, pad = 14;
      var W = pad * 2 + (cards.length + slots) * cw + (cards.length + slots - 1) * gap;
      var H = 132, s = svgOpen(W, H, 'number cards'), pal = ['#f4f6c8', '#f7d774', '#f6ccd8', '#bfe3ff', '#dcd8f5'];
      var x = pad, i;
      for (i = 0; i < cards.length; i++) {
        s += '<rect data-u="card" x="' + x + '" y="14" width="' + cw + '" height="' + ch + '" rx="8" fill="' + pal[i % pal.length] + '" stroke="' + INK + '" stroke-width="2.4"/>';
        s += '<rect x="' + (x + 5) + '" y="19" width="' + (cw - 10) + '" height="' + (ch - 10) + '" rx="5" fill="none" stroke="' + BLUE + '" stroke-width="1.6"/>';
        s += '<text x="' + (x + cw / 2) + '" y="' + (14 + ch / 2 + 12) + '" font-size="32" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(fmt(num(cards[i], vars))) + '</text>';
        x += cw + gap;
      }
      for (i = 0; i < slots; i++) {
        s += '<rect x="' + x + '" y="14" width="' + cw + '" height="' + ch + '" rx="8" fill="#ffffff" stroke="' + BLUE + '" stroke-width="2.6" stroke-dasharray="8 6"/>';
        x += cw + gap;
      }
      s += '</svg>';
      return s;
    },

    /* 四个礼物盒，立体（3D）——大小/形状是解题关键（Q8） */
    giftboxes: function (spec, vars) {
      var pick = Math.max(0, Math.min(3, Math.round(num(spec.pick, vars))));
      var W = 478, H = 244, base = 202, cols = ['#f2a6b3', '#9fd3f0', '#f7d774', '#b7e3a8'];
      /* 四个盒子的尺寸必须让「大小/形状」本身就能推出答案：
         A 又大又方正（最小边 38，唯一装得下球）→ 篮球
         B 中等、略长略扁（鞋盒比例）            → 鞋子
         C 最小                                  → 手表
         D 最长最扁（滑板盒比例）                → 滑板
         注意 B 的最短边只有 20，明显放不进球；C 是体积最小的。 */
      var boxes = [
        { x: 8, w: 96, h: 92, d: 38, t: 'A' },
        { x: 126, w: 88, h: 44, d: 20, t: 'B' },
        { x: 240, w: 40, h: 36, d: 16, t: 'C' },
        { x: 306, w: 136, h: 22, d: 20, t: 'D' }
      ];
      var s = svgOpen(W, H, 'four present boxes in 3D');
      s += '<line x1="6" y1="' + (base + 2) + '" x2="' + (W - 8) + '" y2="' + (base + 2) + '" stroke="' + INK + '" stroke-width="2"/>';
      boxes.forEach(function (b, i) {
        var y = base - b.h;
        if (i === pick) s += '<rect x="' + (b.x - 8) + '" y="' + (y - b.d * 0.62 - 8) + '" width="' + (b.w + b.d + 16) + '" height="' + (b.h + b.d * 0.62 + 16) +
          '" fill="none" stroke="' + RED + '" stroke-width="3" stroke-dasharray="9 6" rx="4"/>';
        s += box3d(b.x, y, b.w, b.h, b.d, cols[i], b.t);
        s += '<text x="' + (b.x + b.w / 2 + b.d / 2) + '" y="' + (base + 32) + '" font-size="20" font-weight="700" text-anchor="middle" fill="' + (i === pick ? RED : INK) + '">' + b.t + '</text>';
      });
      s += '</svg>';
      return s;
    },

    /* 象形统计图：每列 label，count 个单位，附 KEY（Q9）
       icon:'car' 时用小汽车代替小球（Q26）；key:false 时不画 KEY（原卷就没有） */
    pictograph: function (spec, vars) {
      var labels = spec.labels || [], counts = spec.counts || [];
      var maxC = 1, i, j, useCar = spec.icon === 'car', showKey = spec.key !== false;
      var keyN = Math.max(1, Math.round(num(spec.keyN, vars) || 1));
      counts.forEach(function (c) { maxC = Math.max(maxC, Math.round(num(c, vars))); });
      var r = 12, stepY = 26, colW = useCar ? 84 : 72, pad = 18, baseY = 38 + maxC * stepY;
      var W = pad * 2 + labels.length * colW + (showKey ? 142 : 20);
      var s = svgOpen(W, baseY + 76, 'pictograph');
      s += '<line x1="' + (pad - 6) + '" y1="' + (baseY + 8) + '" x2="' + (pad + labels.length * colW + 4) + '" y2="' + (baseY + 8) + '" stroke="' + INK + '" stroke-width="2"/>';
      s += '<line x1="' + (pad - 6) + '" y1="' + (baseY + 8) + '" x2="' + (pad - 6) + '" y2="' + (baseY - maxC * stepY + 6) + '" stroke="' + INK + '" stroke-width="2"/>';
      for (i = 0; i < labels.length; i++) {
        var cx = pad + i * colW + colW / 2, n = Math.round(num(counts[i], vars));
        for (j = 0; j < n; j++) {
          if (useCar) s += '<g data-u="unit">' + carIcon(cx, baseY - 16 - j * 30, 54, spec.fills ? spec.fills[i] : '#7bc47f') + '</g>';
          else s += ballIcon(cx, baseY - 6 - j * stepY, r);
        }
        s += '<text x="' + cx + '" y="' + (baseY + 32) + '" font-size="16" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(labels[i]) + '</text>';
      }
      if (showKey) {
        var kx = pad + labels.length * colW + 14;
        s += '<rect x="' + kx + '" y="26" width="132" height="86" rx="8" fill="#ffffff" stroke="' + INK + '" stroke-width="2"/>';
        s += '<text x="' + (kx + 66) + '" y="50" font-size="15" font-weight="700" text-anchor="middle" fill="' + INK + '">KEY</text>';
        if (useCar) s += '<g data-u="keyunit">' + carIcon(kx + 34, 66, 44, '#b9bec7') + '</g>';
        else s += ballIcon(kx + 30, 76, 11);
        s += '<text data-u="keytext" x="' + (kx + (useCar ? 62 : 50)) + '" y="' + (useCar ? 72 : 82) + '" font-size="13" fill="' + INK + '">= ' + keyN + ' ' + esc(spec.unit || 'goal') + '</text>';
      }
      s += '</svg>';
      return s;
    },

    /* 楼层剖面：地面 G，地上 1..up，地下 B1..Bdown（Q13） */
    building: function (spec, vars) {
      var up0 = Math.max(2, Math.min(8, Math.round(num(spec.up, vars) || 6)));
      var down0 = Math.max(1, Math.min(6, Math.round(num(spec.down, vars) || 4)));
      /* 电梯最高到达的地上楼层 = 从 B{b} 上 u 层 = u - b。
         原题只约束了「终点楼层 ≤ up」，但图画必须高到能放下整个行程（含峰值），
         否则图里楼层不够、学生数不出来。这里把楼画到至少峰值那层。 */
      var peak = Math.max(1, num('u', vars) - num('b', vars));
      var up = Math.max(up0, Math.min(9, peak));
      var down = down0;
      var rowH = 30, w = 132, x = 24, padT = 16;
      var H = padT * 2 + (up + down) * rowH + 34;
      var s = svgOpen(w + 48, H, 'building floors');
      var y = padT, i;
      for (i = up; i >= 1; i--) {
        s += '<text x="' + (x - 8) + '" y="' + (y + 20) + '" font-size="14" text-anchor="end" fill="' + INK + '">' + i + '</text>';
        for (var c = 0; c < 4; c++) s += '<rect x="' + (x + 8 + c * 30) + '" y="' + (y + 3) + '" width="20" height="20" fill="#fdf3c0" stroke="' + INK + '" stroke-width="1.2"/>';
        s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + rowH + '" fill="none" stroke="' + INK + '" stroke-width="1.4"/>';
        y += rowH;
      }
      // 地面层
      s += '<text x="' + (x - 8) + '" y="' + (y + 20) + '" font-size="15" font-weight="700" text-anchor="end" fill="' + INK + '">G</text>';
      s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + rowH + '" fill="#d9f0d4" stroke="' + INK + '" stroke-width="1.4"/>';
      s += '<text x="' + (x + w / 2) + '" y="' + (y + 20) + '" font-size="14" text-anchor="middle" fill="' + INK + '">Ground</text>';
      y += rowH;
      s += '<line x1="' + (x - 34) + '" y1="' + y + '" x2="' + (x + w + 14) + '" y2="' + y + '" stroke="#8a6b45" stroke-width="4"/>';
      s += '<path d="M' + (x + w + 8) + ',' + y + ' l16,-20 l10,20 z" fill="#4f9a4f"/>';
      for (i = 1; i <= down; i++) {
        s += '<text x="' + (x - 8) + '" y="' + (y + 20) + '" font-size="14" text-anchor="end" fill="' + INK + '">B' + i + '</text>';
        for (var c2 = 0; c2 < 4; c2++) s += '<rect x="' + (x + 8 + c2 * 30) + '" y="' + (y + 3) + '" width="20" height="20" fill="#cfd8e3" stroke="' + INK + '" stroke-width="1.2"/>';
        s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + rowH + '" fill="#efe6d6" stroke="' + INK + '" stroke-width="1.4"/>';
        y += rowH;
      }
      s += '</svg>';
      return s;
    },

    /* 车辆划记统计表（Q14）。原卷这张表**没有**表头，
       只有「车辆图 + 名称 + 划记」，所以这里也不写表头。 */
    tallychart: function (spec, vars) {
      var rows = spec.rows || [];
      var rowH = 58, w = 470, headH = 8;
      var H = headH + rows.length * rowH + 20;
      var s = svgOpen(w, H, 'tally chart of vehicles');
      s += '<rect x="8" y="8" width="' + (w - 16) + '" height="' + (H - 16) + '" fill="#ffffff" stroke="' + INK + '" stroke-width="2"/>';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i], ry = 8 + headH + i * rowH;
        if (i) s += '<line x1="8" y1="' + ry + '" x2="' + (w - 8) + '" y2="' + ry + '" stroke="' + GREY + '" stroke-width="1"/>';
        s += vehicleIcon(50, ry + rowH / 2, r.kind || 'car');
        s += '<text x="90" y="' + (ry + rowH / 2 + 6) + '" font-size="16" font-weight="700" fill="' + INK + '">' + esc(r.label || '') + '</text>';
        s += tally(206, ry + rowH / 2, Math.round(num(r.count, vars)));
      }
      s += '</svg>';
      return s;
    },

    /* 四个人围成一圈轮流数数（Q18） */
    standcircle: function (spec, vars) {
      var S = Math.round(num(spec.start, vars));
      var boxR = 136, R = 80, arcR = 104;
      var W = 2 * boxR + 92, cx = W / 2, cy = boxR + 26, H = cy + boxR + 30;
      /* 图里一律用原卷的英文名（ICAS Q18：Sue / Jim / Dave / Kate），不写"甲乙丙丁" */
      var names = ['Sue', 'Jim', 'Dave', 'Kate'];
      var s = svgOpen(W, H, 'four friends counting in a circle');
      for (var i = 0; i < 4; i++) {
        var a0 = (i * 90 - 90 + 30) * Math.PI / 180, a1 = ((i + 1) * 90 - 90 - 30) * Math.PI / 180;
        s += '<path d="M' + (cx + arcR * Math.cos(a0)).toFixed(1) + ',' + (cy + arcR * Math.sin(a0)).toFixed(1) +
             ' A' + arcR + ',' + arcR + ' 0 0 1 ' + (cx + arcR * Math.cos(a1)).toFixed(1) + ',' + (cy + arcR * Math.sin(a1)).toFixed(1) +
             '" fill="none" stroke="' + BLUE + '" stroke-width="2.5"/>';
        var am = (i * 90 - 90 + 45) * Math.PI / 180;
        var mx = cx + arcR * Math.cos(am), my = cy + arcR * Math.sin(am);
        var t1 = am + Math.PI / 2;
        s += '<polygon points="' + (mx + 10 * Math.cos(am)).toFixed(1) + ',' + (my + 10 * Math.sin(am)).toFixed(1) + ' ' +
             (mx - 9 * Math.cos(t1)).toFixed(1) + ',' + (my - 9 * Math.sin(t1)).toFixed(1) + ' ' +
             (mx + 9 * Math.cos(t1)).toFixed(1) + ',' + (my + 9 * Math.sin(t1)).toFixed(1) + '" fill="' + BLUE + '"/>';
      }
      for (var k = 0; k < 4; k++) {
        var a = (k * 90 - 90) * Math.PI / 180;
        var px = cx + R * Math.cos(a), py = cy + R * Math.sin(a);
        var bx = cx + boxR * Math.cos(a), by = cy + boxR * Math.sin(a);
        s += '<line x1="' + (px + 22 * Math.cos(a)).toFixed(1) + '" y1="' + (py + 22 * Math.sin(a)).toFixed(1) + '" x2="' + (bx - 24 * Math.cos(a)).toFixed(1) + '" y2="' + (by - 24 * Math.sin(a)).toFixed(1) + '" stroke="' + GREY + '" stroke-width="1.6" stroke-dasharray="5 4"/>';
        s += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="21" fill="#ffe6c9" stroke="' + INK + '" stroke-width="2"/>';
        s += '<circle cx="' + (px - 7).toFixed(1) + '" cy="' + (py - 4).toFixed(1) + '" r="2.4" fill="' + INK + '"/><circle cx="' + (px + 7).toFixed(1) + '" cy="' + (py - 4).toFixed(1) + '" r="2.4" fill="' + INK + '"/>';
        s += '<path d="M' + (px - 7).toFixed(1) + ',' + (py + 8).toFixed(1) + ' Q' + px.toFixed(1) + ',' + (py + 15).toFixed(1) + ' ' + (px + 7).toFixed(1) + ',' + (py + 8).toFixed(1) + '" fill="none" stroke="' + INK + '" stroke-width="1.8"/>';
        s += '<rect x="' + (bx - 46).toFixed(1) + '" y="' + (by - 16).toFixed(1) + '" width="92" height="32" rx="8" fill="#fdf3a0" stroke="' + INK + '" stroke-width="1.6"/>';
        s += '<text x="' + bx.toFixed(1) + '" y="' + (by + 5).toFixed(1) + '" font-size="15" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(names[k]) + ' ' + (S - k) + '</text>';
      }
      s += '</svg>';
      return s;
    },

    /* 三张长方形纸按面积比例（Q25） */
    papers: function (spec, vars) {
      var m = Math.round(num(spec.m, vars)), k = Math.round(num(spec.k, vars));
      var labelW = 92, pad = 16, h = 50, avail = 336;
      var unit = Math.min(44, avail / (m * k)), i;
      var items = [
        { label: 'blue', w: unit, fill: '#bfe3ff' },
        { label: 'red', w: unit * k, fill: '#e5484d' },
        { label: 'yellow', w: unit * k * m, fill: '#f5c518' }
      ];
      var W = pad * 2 + labelW + items[2].w, H = pad * 2 + items.length * (h + 20);
      var s = svgOpen(W, H, 'three sheets of paper');
      for (i = 0; i < items.length; i++) {
        var y = pad + i * (h + 20), x = pad + labelW;
        s += '<text x="' + (pad + labelW - 10) + '" y="' + (y + h / 2 + 6) + '" font-size="16" font-weight="700" text-anchor="end" fill="' + INK + '">' + items[i].label + '</text>';
        s += '<rect x="' + x + '" y="' + y + '" width="' + items[i].w.toFixed(1) + '" height="' + h + '" fill="' + items[i].fill + '" stroke="' + INK + '" stroke-width="2"/>';
      }
      s += '</svg>';
      return s;
    },

    /* 数据表格（Q27）。支持原卷那种两级表头：
       cols    每列的（第二级）表头文字
       widths  每列宽度（可选，默认 118）
       groups  跨列表头 [{ label, from, to }]，画在最上面一行（可选） */
    datatable: function (spec, vars) {
      var cols = spec.cols || [], rows = spec.rows || [];
      var widths = spec.widths || cols.map(function () { return 118; });
      var groups = spec.groups || [];
      var rowH = 30, pad = 14, headRows = 1 + (groups.length ? 1 : 0);
      var total = widths.reduce(function (a, b) { return a + b; }, 0);
      var xOf = function (c) { var x = pad; for (var i = 0; i < c; i++) x += widths[i]; return x; };
      var W = pad * 2 + total;
      var H = pad * 2 + (rows.length + headRows) * rowH;
      var s = svgOpen(W, H, 'data table');
      s += '<rect x="' + pad + '" y="' + pad + '" width="' + total + '" height="' + ((rows.length + headRows) * rowH) + '" fill="#ffffff" stroke="' + INK + '" stroke-width="2"/>';
      var hy = pad, c, g;
      if (groups.length) {                       // 第一行：跨列表头
        for (g = 0; g < groups.length; g++) {
          var gr = groups[g], gx = xOf(gr.from), gw = 0;
          for (c = gr.from; c <= gr.to; c++) gw += widths[c];
          s += '<rect x="' + gx + '" y="' + hy + '" width="' + gw + '" height="' + rowH + '" fill="#f7d774" stroke="' + INK + '" stroke-width="1.4"/>';
          s += '<text x="' + (gx + gw / 2) + '" y="' + (hy + rowH - 9) + '" font-size="14" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(gr.label) + '</text>';
        }
        /* 没被 groups 覆盖的列，标题写在第一行（相当于跨满两行） */
        var covered = {};
        groups.forEach(function (gg) { for (var q = gg.from; q <= gg.to; q++) covered[q] = 1; });
        for (c = 0; c < cols.length; c++) {
          if (covered[c]) continue;
          s += '<rect x="' + xOf(c) + '" y="' + hy + '" width="' + widths[c] + '" height="' + (rowH * 2) + '" fill="#f7d774" stroke="' + INK + '" stroke-width="1.4"/>';
          s += '<text x="' + (xOf(c) + widths[c] / 2) + '" y="' + (hy + rowH + 6) + '" font-size="14" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(cols[c]) + '</text>';
        }
        hy += rowH;
      }
      for (c = 0; c < cols.length; c++) {        // 最后一行表头：各列自己的标题
        if (groups.length) {
          var inGroup = false;
          groups.forEach(function (gg) { if (c >= gg.from && c <= gg.to) inGroup = true; });
          if (!inGroup) continue;                // 已在跨列表头那一行画过（占两行）
        }
        s += '<rect x="' + xOf(c) + '" y="' + hy + '" width="' + widths[c] + '" height="' + rowH + '" fill="#f7d774" stroke="' + INK + '" stroke-width="1.4"/>';
        s += '<text x="' + (xOf(c) + widths[c] / 2) + '" y="' + (hy + rowH - 9) + '" font-size="14" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(cols[c]) + '</text>';
      }
      for (var r = 0; r < rows.length; r++) {
        for (var c2 = 0; c2 < cols.length; c2++) {
          s += '<rect x="' + xOf(c2) + '" y="' + (pad + (r + headRows) * rowH) + '" width="' + widths[c2] + '" height="' + rowH + '" fill="none" stroke="' + INK + '" stroke-width="1"/>';
          s += '<text x="' + (xOf(c2) + widths[c2] / 2) + '" y="' + (pad + (r + headRows + 1) * rowH - 9) + '" font-size="15" text-anchor="middle" fill="' + INK + '">' + esc(cellText(rows[r][c2], vars)) + '</text>';
        }
      }
      s += '</svg>';
      return s;
    },

    /* 四色积木塔（3D）（Q28）。原卷把颜色名写在积木上（yellow/blue/green/pink），
       没有"第几层"这种标注，所以这里也不写；`data-u="layer"` 挂在颜色标签上，
       自检脚本靠它数层数（每层正好一块）。 */
    blockstack: function (spec, vars) {
      var labels = spec.labels || ['yellow', 'blue', 'green', 'pink'];
      var fills = spec.fills || ['#f5c518', '#9fd3f0', '#7bc47f', '#f2a6b3'];
      var off = Math.round(num(spec.offset, vars)) || 0;
      var want = spec.count === undefined ? labels.length : Math.round(num(spec.count, vars));
      var n = Math.max(2, Math.min(labels.length, want));
      var bw = 96, bh = 40, d = 24, pad = 26;
      var W = bw + d + pad * 2 + 110, H = n * bh + d * 0.62 + pad * 2 + 16;
      var s = svgOpen(W, H, 'tower of coloured blocks');
      for (var i = 0; i < n; i++) {
        var idx = (i + off) % n;
        var y = pad + 8 + (n - 1 - i) * bh;
        s += box3d(pad + 40, y, bw, bh, d, fills[idx]);
        s += '<text data-u="layer" x="' + (pad + 40 + bw / 2) + '" y="' + (y + bh / 2 + 6) + '" font-size="15" font-weight="700" text-anchor="middle" fill="#1a1a1a">' + esc(labels[idx]) + '</text>';
      }
      s += '<line x1="' + (pad + 34) + '" y1="' + (pad + 8 + n * bh + 2) + '" x2="' + (pad + 40 + bw + d + 4) + '" y2="' + (pad + 8 + n * bh + 2) + '" stroke="' + INK + '" stroke-width="2"/>';
      s += '</svg>';
      return s;
    },

    /* 图形符号算式：legend 图例 + rows 每行算式（Q10 / Q29） */
    /* 图形符号算式：legend 图例 + rows 每行算式（Q10 / Q29）
       先量出最宽一行再定 viewBox 宽度并整幅居中 —— 否则长式子（如 Q29 第三式）
       的等号右边会被裁掉。 */
    symeq: function (spec, vars) {
      var legend = spec.legend || [], rows = spec.rows || [];
      var MAXW = 470, pad = 18;
      var FS_SYM = 30, FS_OP = 23, FS_NUM = 28, A_SYM = 44, A_OP = 30, A_EQ = 34;
      function rhsOf(v) {
        return (v === undefined || v === null || v === '') ? '' : cellText(v, vars);
      }
      function rowW(terms, rhs) {
        var w = 0;
        (terms || []).forEach(function (t) { w += (t === '+' || t === '-' || t === '=') ? A_OP : A_SYM; });
        var rt = rhsOf(rhs);
        if (rt) w += A_EQ + rt.length * 17;
        return w;
      }
      var legendTxt = [], legendW = 0;
      legend.forEach(function (g) {
        var t = cellText(g.v, vars);
        legendTxt.push(t);
        legendW += 38 + 26 + 30 + t.length * 16 + 34;
      });
      var widest = legendW;
      rows.forEach(function (r) { widest = Math.max(widest, rowW(r.terms, r.rhs)); });
      var avail = MAXW - pad * 2;
      var k = widest > avail ? avail / widest : 1;         // 过长时整幅等比缩小
      var W = Math.round(pad * 2 + widest * k + 4);
      var rowH = Math.max(44, 56 * k);
      var H = Math.round(pad * 2 + (legend.length ? rowH : 0) + rows.length * rowH + 4);
      var s = svgOpen(W, H, 'symbol equations');
      var y = pad + rowH * 0.7;
      var fs = function (v) { return (v * k).toFixed(1); };
      if (legend.length) {
        var lx = (W - legendW * k) / 2;
        legend.forEach(function (g, idx) {
          var t = legendTxt[idx];
          s += '<text x="' + lx.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + fs(FS_SYM) + '" fill="' + INK + '">' + esc(g.s) + '</text>';
          lx += 38 * k;
          s += '<text x="' + lx.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + fs(FS_OP + 4) + '" fill="' + INK + '">=</text>';
          lx += 26 * k;
          s += '<text x="' + lx.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + fs(FS_NUM) + '" font-weight="700" fill="' + INK + '">' + esc(t) + '</text>';
          lx += (30 + t.length * 16 + 34) * k;
        });
        y += rowH;
      }
      rows.forEach(function (row, idx) {
        var base = y + idx * rowH;
        var tx = (W - rowW(row.terms, row.rhs) * k) / 2;
        /* data-terms/data-rhs 供 test-figs.js 独立重算（不依赖模板公式；符号与数字都要**求值**） */
        s += '<g data-u="srow" data-r="' + idx + '" data-terms="' + esc((row.terms || []).map(function (t) { return cellText(t, vars); }).join('')) + '" data-rhs="' + esc(rhsOf(row.rhs)) + '">';
        (row.terms || []).forEach(function (t) {
          var isOp = (t === '+' || t === '-' || t === '=');
          s += '<text x="' + tx.toFixed(1) + '" y="' + base.toFixed(1) + '" font-size="' + fs(isOp ? FS_OP : FS_SYM) + '" fill="' + INK + '">' + esc(t) + '</text>';
          tx += (isOp ? A_OP : A_SYM) * k;
        });
        var rt = rhsOf(row.rhs);
        if (rt) {
          s += '<text x="' + tx.toFixed(1) + '" y="' + base.toFixed(1) + '" font-size="' + fs(FS_OP + 4) + '" fill="' + INK + '">=</text>';
          tx += A_EQ * k;
          s += '<text data-u="rhs" x="' + tx.toFixed(1) + '" y="' + base.toFixed(1) + '" font-size="' + fs(FS_NUM) + '" font-weight="700" fill="' + INK + '">' + esc(rt) + '</text>';
        }
        s += '</g>';
      });
      s += '</svg>';
      return s;
    },

    /* 车辆图标 */
    vehicleIcon: function () { return ''; }
  };

  /* ==================================================================
     第二批（ICAS 2021 Year 2）用到的图元与图形类型
     原则同上：图里承载的信息不写进题干；图上文字一律用原卷语言（英文）。
     ================================================================== */

  /* 取 spec 里的值：可能是数字、数字字符串，也可能是"字符串变量名" */
  function str(v, vars) {
    if (typeof v === 'string' && vars && Object.prototype.hasOwnProperty.call(vars, v)) return String(vars[v]);
    return (v === null || v === undefined) ? '' : String(v);
  }

  /* 基本形状：kind -> SVG（cx,cy 中心，s 半尺寸） */
  function shapeGlyph(kind, cx, cy, s, fill) {
    var o = '', p = [], i, r, ang;
    switch (kind) {
      case 'triangle':
        o = '<polygon points="' + cx + ',' + (cy - s) + ' ' + (cx + s) + ',' + (cy + s * 0.8) + ' ' + (cx - s) + ',' + (cy + s * 0.8) + '"'; break;
      case 'triangleDown':
        o = '<polygon points="' + cx + ',' + (cy + s) + ' ' + (cx + s) + ',' + (cy - s * 0.8) + ' ' + (cx - s) + ',' + (cy - s * 0.8) + '"'; break;
      case 'circle':
        o = '<circle cx="' + cx + '" cy="' + cy + '" r="' + s + '"'; break;
      case 'star':
        for (i = 0; i < 10; i++) {
          r = (i % 2 === 0) ? s : s * 0.44; ang = -Math.PI / 2 + i * Math.PI / 5;
          p.push((cx + r * Math.cos(ang)).toFixed(1) + ',' + (cy + r * Math.sin(ang)).toFixed(1));
        }
        o = '<polygon points="' + p.join(' ') + '"'; break;
      case 'trapezoid':
        o = '<polygon points="' + (cx - s) + ',' + (cy + s * 0.68) + ' ' + (cx + s) + ',' + (cy + s * 0.68) + ' ' +
            (cx + s * 0.5) + ',' + (cy - s * 0.68) + ' ' + (cx - s * 0.5) + ',' + (cy - s * 0.68) + '"'; break;
      case 'rect':
        o = '<rect x="' + (cx - s * 0.45) + '" y="' + (cy - s) + '" width="' + (s * 0.9) + '" height="' + (s * 2) + '" rx="2"'; break;
      case 'rhombus':     /* 又高又窄的菱形：不是正方形 */
        o = '<polygon points="' + cx + ',' + (cy - s) + ' ' + (cx + s * 0.55) + ',' + cy + ' ' + cx + ',' + (cy + s) + ' ' +
            (cx - s * 0.55) + ',' + cy + '"'; break;
      case 'squareRot':   /* 正方形转 45°：和正方形全等 */
        o = '<polygon points="' + cx + ',' + (cy - s) + ' ' + (cx + s) + ',' + cy + ' ' + cx + ',' + (cy + s) + ' ' +
            (cx - s) + ',' + cy + '"'; break;
      default:            /* square */
        o = '<rect x="' + (cx - s) + '" y="' + (cy - s) + '" width="' + (s * 2) + '" height="' + (s * 2) + '"';
    }
    return o + ' fill="' + fill + '" stroke="' + INK + '" stroke-width="2"/>';
  }

  /* 泰迪熊（Q17） */
  function teddyIcon(cx, cy, s) {
    var b = '#7b2b1d', o = '';
    o += '<circle cx="' + (cx - s * 0.42) + '" cy="' + (cy - s * 0.92) + '" r="' + (s * 0.22) + '" fill="' + b + '"/>';
    o += '<circle cx="' + (cx + s * 0.42) + '" cy="' + (cy - s * 0.92) + '" r="' + (s * 0.22) + '" fill="' + b + '"/>';
    o += '<circle cx="' + cx + '" cy="' + (cy - s * 0.60) + '" r="' + (s * 0.32) + '" fill="' + b + '"/>';
    o += '<ellipse cx="' + cx + '" cy="' + (cy + s * 0.14) + '" rx="' + (s * 0.58) + '" ry="' + (s * 0.62) + '" fill="' + b + '"/>';
    o += '<ellipse cx="' + cx + '" cy="' + (cy + s * 0.22) + '" rx="' + (s * 0.34) + '" ry="' + (s * 0.36) + '" fill="#c98b5b"/>';
    o += '<ellipse cx="' + (cx - s * 0.50) + '" cy="' + (cy + s * 0.30) + '" rx="' + (s * 0.17) + '" ry="' + (s * 0.27) + '" fill="' + b + '"/>';
    o += '<ellipse cx="' + (cx + s * 0.50) + '" cy="' + (cy + s * 0.30) + '" rx="' + (s * 0.17) + '" ry="' + (s * 0.27) + '" fill="' + b + '"/>';
    o += '<ellipse cx="' + (cx - s * 0.70) + '" cy="' + (cy + s * 0.76) + '" rx="' + (s * 0.24) + '" ry="' + (s * 0.17) + '" fill="' + b + '"/>';
    o += '<ellipse cx="' + (cx + s * 0.70) + '" cy="' + (cy + s * 0.76) + '" rx="' + (s * 0.24) + '" ry="' + (s * 0.17) + '" fill="' + b + '"/>';
    o += '<circle cx="' + (cx - s * 0.20) + '" cy="' + (cy - s * 0.65) + '" r="' + (s * 0.07) + '" fill="#ffffff"/>';
    o += '<circle cx="' + (cx + s * 0.20) + '" cy="' + (cy - s * 0.65) + '" r="' + (s * 0.07) + '" fill="#ffffff"/>';
    o += '<circle cx="' + cx + '" cy="' + (cy - s * 0.42) + '" r="' + (s * 0.09) + '" fill="#1a1a1a"/>';
    return o;
  }

  /* 小汽车（Q15 / Q26）：cx,cy 中心，w 宽 */
  function carIcon(cx, cy, w, fill) {
    var o = '', s = w / 60;
    o += '<path d="M' + (cx - 30 * s) + ',' + (cy + 6 * s) + ' q4,-16 16,-16 h18 q12,0 16,16 z" fill="' + fill + '" stroke="' + INK + '" stroke-width="1.6"/>';
    o += '<rect x="' + (cx - 32 * s) + '" y="' + (cy + 4 * s) + '" width="' + (64 * s) + '" height="' + (12 * s) + '" rx="' + (4 * s) + '" fill="' + fill + '" stroke="' + INK + '" stroke-width="1.6"/>';
    o += '<circle cx="' + (cx - 18 * s) + '" cy="' + (cy + 17 * s) + '" r="' + (6 * s) + '" fill="' + INK + '"/>';
    o += '<circle cx="' + (cx + 18 * s) + '" cy="' + (cy + 17 * s) + '" r="' + (6 * s) + '" fill="' + INK + '"/>';
    return o;
  }

  /* 骨牌半边的点位布局（0-6） */
  var PIPS = {
    0: [],
    1: [[0.5, 0.5]],
    2: [[0.3, 0.3], [0.7, 0.7]],
    3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
    4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
    5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
    6: [[0.26, 0.26], [0.5, 0.26], [0.74, 0.26], [0.26, 0.74], [0.5, 0.74], [0.74, 0.74]]
  };

  /* 一张骨牌：x,y 左上角；w 总宽（两半各 w/2），h 高 */
  function dominoTile(x, y, w, h, a, b) {
    var hw = w / 2, o = '', i, pts, px, py, rr = Math.min(hw, h) * 0.075;
    o += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" fill="#fbfbd0" stroke="' + INK + '" stroke-width="2.2"/>';
    o += '<line x1="' + (x + hw) + '" y1="' + (y + 3) + '" x2="' + (x + hw) + '" y2="' + (y + h - 3) + '" stroke="' + INK + '" stroke-width="1.8"/>';
    [[a, 0], [b, hw]].forEach(function (pair) {
      pts = PIPS[Math.max(0, Math.min(6, Math.round(pair[0])))] || [];
      for (i = 0; i < pts.length; i++) {
        px = x + pair[1] + 6 + pts[i][0] * (hw - 12);
        py = y + 6 + pts[i][1] * (h - 12);
        o += '<circle data-u="pip" cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="' + rr.toFixed(1) + '" fill="#111111"/>';
      }
    });
    return o;
  }

  /* 花盆（Q10）：cx 中心，baseY 盆底，s 半尺寸 */
  function potIcon(cx, baseY, s, fill) {
    var o = '';
    o += '<path d="M' + (cx - s * 0.9) + ',' + (baseY - s * 0.9) + ' L' + (cx + s * 0.9) + ',' + (baseY - s * 0.9) +
         ' L' + (cx + s * 0.7) + ',' + baseY + ' L' + (cx - s * 0.7) + ',' + baseY + ' Z" fill="' + fill + '" stroke="' + INK + '" stroke-width="2"/>';
    for (var i = 0; i < 2; i++) {
      var fx = cx + (i ? s * 0.42 : -s * 0.42);
      o += '<line x1="' + fx + '" y1="' + (baseY - s * 0.9) + '" x2="' + fx + '" y2="' + (baseY - s * 1.5) + '" stroke="#3f8f4a" stroke-width="2"/>';
      o += '<circle cx="' + fx + '" cy="' + (baseY - s * 1.62) + '" r="' + (s * 0.30) + '" fill="#f5c518" stroke="' + INK + '" stroke-width="1.4"/>';
      o += '<circle cx="' + fx + '" cy="' + (baseY - s * 1.62) + '" r="' + (s * 0.11) + '" fill="#a9743f"/>';
    }
    return o;
  }

  /* 一棵树（Q29） */
  function treeIcon(cx, baseY, s) {
    var o = '';
    o += '<rect x="' + (cx - s * 0.10) + '" y="' + (baseY - s * 0.86) + '" width="' + (s * 0.20) + '" height="' + (s * 0.86) + '" fill="#7b4a2d" stroke="' + INK + '" stroke-width="1.4"/>';
    o += '<circle cx="' + (cx - s * 0.32) + '" cy="' + (baseY - s * 1.06) + '" r="' + (s * 0.34) + '" fill="#5aa860" stroke="' + INK + '" stroke-width="1.4"/>';
    o += '<circle cx="' + (cx + s * 0.32) + '" cy="' + (baseY - s * 1.06) + '" r="' + (s * 0.34) + '" fill="#5aa860" stroke="' + INK + '" stroke-width="1.4"/>';
    o += '<circle cx="' + cx + '" cy="' + (baseY - s * 1.24) + '" r="' + (s * 0.44) + '" fill="#6cbf72" stroke="' + INK + '" stroke-width="1.4"/>';
    return o;
  }

  /* 小房子（Q10 / Q29）：cx 中心，baseY 墙底，w 宽 h 墙高 */
  function houseIcon(cx, baseY, w, h, wall, roof) {
    var o = '';
    o += '<rect x="' + (cx - w / 2) + '" y="' + (baseY - h) + '" width="' + w + '" height="' + h + '" fill="' + wall + '" stroke="' + INK + '" stroke-width="2"/>';
    o += '<polygon points="' + (cx - w / 2 - 7) + ',' + (baseY - h) + ' ' + cx + ',' + (baseY - h - w * 0.46) + ' ' + (cx + w / 2 + 7) + ',' + (baseY - h) + '" fill="' + roof + '" stroke="' + INK + '" stroke-width="2"/>';
    o += '<rect x="' + (cx - 9) + '" y="' + (baseY - h * 0.58) + '" width="18" height="' + (h * 0.58) + '" fill="#7b4a2d" stroke="' + INK + '" stroke-width="1.6"/>';
    o += '<rect x="' + (cx - w * 0.40) + '" y="' + (baseY - h * 0.80) + '" width="15" height="15" fill="#bfe3ff" stroke="' + INK + '" stroke-width="1.4"/>';
    o += '<rect x="' + (cx + w * 0.16) + '" y="' + (baseY - h * 0.80) + '" width="15" height="15" fill="#bfe3ff" stroke="' + INK + '" stroke-width="1.4"/>';
    return o;
  }

  /* 指北（保证 viewBox 宽 ≤ 480 时字还看得清）：把整幅等比缩放到目标宽度 */
  var TYPES4 = {
    /* 一堆笑脸（Q1）：答案就是个数 */
    faces: function (spec, vars) {
      var n = Math.max(1, Math.min(14, Math.round(num(spec.count, vars))));
      var per = 3, step = 58, W = 200, rows = Math.ceil(n / per), H = 30 + rows * step, i;
      var s = svgOpen(W, H, n + ' smiley faces');
      for (i = 0; i < n; i++) {
        var row = Math.floor(i / per), cnt = Math.min(per, n - row * per);
        var cx = W / 2 + ((i % per) - (cnt - 1) / 2) * step, cy = 40 + row * step;
        s += '<g data-u="item"><circle cx="' + cx + '" cy="' + cy + '" r="24" fill="#ffd93b" stroke="' + INK + '" stroke-width="2"/>' +
             '<circle cx="' + (cx - 8) + '" cy="' + (cy - 6) + '" r="3.4" fill="' + INK + '"/>' +
             '<circle cx="' + (cx + 8) + '" cy="' + (cy - 6) + '" r="3.4" fill="' + INK + '"/>' +
             '<path d="M' + (cx - 12) + ',' + (cy + 6) + ' Q' + cx + ',' + (cy + 20) + ' ' + (cx + 12) + ',' + (cy + 6) + '" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/></g>';
      }
      s += '</svg>';
      return s;
    },

    /* 四个形状循环往复，第 mark 个位置画成「?」（Q2）。
       格子宽度随总数自适应，保证 viewBox 宽 ≤480（total=16 时固定 36px 会到 608）。 */
    patternrow: function (spec, vars) {
      var cycle = spec.cycle || ['square', 'triangle', 'circle', 'star'];
      var total = Math.max(4, Math.min(16, Math.round(num(spec.total, vars) || 12)));
      var mark = Math.max(1, Math.min(total, Math.round(num(spec.mark, vars) || 8)));
      var fills = { square: '#f2a6b3', triangle: '#b7e3a8', circle: '#f5a623', star: '#7fd3c8' };
      var pad = 16, cw = Math.min(36, (480 - pad * 2) / total);
      var gw = Math.min(30, cw * 0.84), W = Math.round(pad * 2 + total * cw), H = 128, i;
      var s = svgOpen(W, H, 'repeating pattern of four shapes');
      for (i = 1; i <= total; i++) {
        var cx = pad + (i - 0.5) * cw, cy = 62, kind = cycle[(i - 1) % cycle.length];
        if (i === mark) {
          s += '<rect data-u="shape" x="' + (cx - gw / 2 - 1) + '" y="' + (cy - gw * 0.64) + '" width="' + (gw + 2) + '" height="' + (gw * 1.28) + '" rx="3" fill="#e5484d" stroke="' + INK + '" stroke-width="2"/>';
          s += '<text x="' + cx + '" y="' + (cy + gw * 0.34) + '" font-size="' + (gw * 0.9).toFixed(1) + '" font-weight="700" text-anchor="middle" fill="#ffffff">?</text>';
        } else {
          s += '<g data-u="shape" data-kind="' + esc(kind) + '">' + shapeGlyph(kind, cx, cy, gw * 0.5, fills[kind] || '#dddddd') + '</g>';
        }
        s += '<text x="' + cx.toFixed(1) + '" y="118" font-size="13" text-anchor="middle" fill="#666">' + i + '</text>';
      }
      s += '</svg>';
      return s;
    },

    /* 划记对比表（Q4）：labels[c] 与 counts[c] 两行 */
    tallytable: function (spec, vars) {
      var labels = spec.labels || [], counts = spec.counts || [];
      var cw = 150, pad = 14, headH = 40, bodyH = 56, i;
      var W = pad * 2 + labels.length * cw, H = pad * 2 + headH + bodyH;
      var maxC = 1;
      counts.forEach(function (c) { maxC = Math.max(maxC, Math.round(num(c, vars))); });
      var groupW = Math.min(46, (cw - 56) / Math.max(1, Math.ceil(maxC / 5)));
      var step = Math.min(9, groupW / 5);
      var s = svgOpen(W, H, 'tally table');
      for (i = 0; i < labels.length; i++) {
        var x = pad + i * cw;
        s += '<rect x="' + x + '" y="' + pad + '" width="' + cw + '" height="' + headH + '" fill="#f7d774" stroke="' + INK + '" stroke-width="2"/>';
        s += '<text x="' + (x + cw / 2) + '" y="' + (pad + 27) + '" font-size="18" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(labels[i]) + '</text>';
        s += '<rect x="' + x + '" y="' + (pad + headH) + '" width="' + cw + '" height="' + bodyH + '" fill="#ffffff" stroke="' + INK + '" stroke-width="2"/>';
        s += tally(x + 30, pad + headH + bodyH / 2, Math.round(num(counts[i], vars)), groupW, step);
      }
      s += '</svg>';
      return s;
    },

    /* 单个形状（Q2 选项）：kind 为形状名 */
    glyph: function (spec, vars) {
      var kind = str(spec.kind, vars) || 'square';
      var W = 96, H = 78, s = svgOpen(W, H, kind);
      var fills = { square: '#f2a6b3', triangle: '#b7e3a8', circle: '#f5a623', star: '#7fd3c8',
                    triangleDown: '#cbb2e0', rect: '#9fd0e8', rhombus: '#f5c518', squareRot: '#7fd3c8' };
      s += '<g data-u="shape" data-kind="' + esc(kind) + '">' + shapeGlyph(kind, W / 2, H / 2, 22, fills[kind] || '#dddddd') + '</g>';
      s += '</svg>';
      return s;
    },

    /* 一周七天横排，today 是今天的位置（0=Monday）（Q3） */
    weekstrip: function (spec, vars) {
      var t = Math.max(0, Math.min(6, Math.round(num(spec.today, vars))));
      var days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      var cw = 60, pad = 12, W = pad * 2 + 7 * cw, H = 92, i;
      var s = svgOpen(W, H, 'days of the week');
      for (i = 0; i < 7; i++) {
        var x = pad + i * cw;
        s += '<rect data-u="day" data-i="' + i + '" x="' + x + '" y="30" width="' + (cw - 6) + '" height="46" rx="8" fill="' +
             (i === t ? '#1f6feb' : '#ffffff') + '" stroke="' + INK + '" stroke-width="2"/>';
        s += '<text x="' + (x + (cw - 6) / 2) + '" y="60" font-size="17" font-weight="700" text-anchor="middle" fill="' +
             (i === t ? '#ffffff' : INK) + '">' + days[i] + '</text>';
      }
      s += '<text x="' + (pad + t * cw + (cw - 6) / 2) + '" y="22" font-size="15" font-weight="700" text-anchor="middle" fill="#1f6feb">Today</text>';
      s += '</svg>';
      return s;
    },

    /* 四个形状候选，其中恰好两个全等（Q5）。pair 指定全等的那一对占哪个格。
       全等的一对 = 一个正放的正方形 + 一个转 45° 的正方形（边长相同）；
       另外两格放「明显不是正方形」的菱形和长方形。 */
    sameshapes: function (spec, vars) {
      var pair = Math.max(0, Math.min(2, Math.round(num(spec.pair, vars))));
      var SQ = 24;                                   /* 正放正方形：半边长 24 -> 边长 48 */
      var rotS = SQ * Math.SQRT2;                    /* 转 45° 后顶点到中心 = 边长/√2 = 24√2 */
      var rest = [['rhombus', 40], ['rect', 33]];    /* 菱形的半高 40 > 半宽 22；长方形 30×66 */
      var cells = [['square', SQ]], ri = 0, k;
      for (k = 1; k <= 3; k++) cells.push(k === pair + 1 ? ['squareRot', rotS] : rest[ri++]);
      var pos = [[92, 84], [272, 84], [92, 258], [272, 258]];
      var W = 364, H = 360, s = svgOpen(W, H, 'four shapes, two of them identical');
      for (k = 0; k < 4; k++) {
        s += '<g data-u="shape" data-kind="' + cells[k][0] + '" data-half="' + cells[k][1].toFixed(2) + '">' +
             shapeGlyph(cells[k][0], pos[k][0], pos[k][1], cells[k][1], '#2a7fd4') + '</g>';
        s += '<text x="' + pos[k][0] + '" y="' + (pos[k][1] < 150 ? 186 : 342) + '" font-size="20" font-weight="700" text-anchor="middle" fill="' + INK + '">' + 'ABCD'[k] + '</text>';
      }
      s += '</svg>';
      return s;
    },

    /* 若干张骨牌：a/b 是两半点数（Q9） */
    domino: function (spec, vars) {
      var a = Math.round(num(spec.a, vars)), b = Math.round(num(spec.b, vars));
      var W = 150, H = 84, s = svgOpen(W, H, 'domino');
      s += dominoTile(8, 8, 134, 68, a, b);
      s += '</svg>';
      return s;
    },

    /* 四张骨牌横排（Q9 选项）。骨牌两半的点数写进 data-a/data-b，
       自检脚本据此独立核对「每半不超过 6 点」「画出来的圆点数 = 两半之和」。 */
    dominorow: function (spec, vars) {
      var a = Math.round(num(spec.a, vars)), b = Math.round(num(spec.b, vars));
      var W = 168, H = 92, s = svgOpen(W, H, 'domino option');
      s += '<g data-u="optdom" data-a="' + a + '" data-b="' + b + '">' + dominoTile(9, 10, 150, 72, a, b) + '</g>';
      s += '</svg>';
      return s;
    },

    /* 房子 + 四盆花（Q10）。perm 决定四种颜色在 4 个花盆上的循环排列
       （第 j 个花盆取 COLS[(j+perm)%4]）；s=0 从房子向右走、s=1 向左走；
       n = 走过几个花盆（画成路上 n 个脚印点）。题目问「停在第几个花盆、什么颜色」。
       颜色名照原卷写在每盆花下方（英文，图里不许出现中文）；花盆下面**不画空方框**——
       原卷那四个方框是 A/B/C/D 选项格，我们这里选项是颜色词，画空框会让人以为要选框。 */
    housepots: function (spec, vars) {
      var COLS = ['red', 'blue', 'green', 'yellow'];
      var perm = Math.max(0, Math.min(3, Math.round(num(spec.perm, vars) || 0)));
      var sdir = Math.max(0, Math.min(1, Math.round(num(spec.start, vars) || 0)));
      var n = Math.max(1, Math.min(2, Math.round(num(spec.n, vars) || 1)));
      var labels = spec.labels !== false;
      var W = 470, H = 362, base = 232, i;
      var xs = [90, 165, 305, 380], houseX = 235, s = svgOpen(W, H, 'house with four pots of flowers');
      s += houseIcon(houseX, base, 190, 132, '#eef2f6', '#7b1f1f');
      s += '<line x1="20" y1="' + (base + 4) + '" x2="' + (W - 20) + '" y2="' + (base + 4) + '" stroke="#8a6b45" stroke-width="5"/>';
      for (i = 0; i < 4; i++) {
        var col = COLS[(i + perm) % 4];
        s += '<g data-u="pot" data-j="' + i + '" data-fill="' + col + '">' + potIcon(xs[i], base, 20, col) + '</g>';
        if (labels) s += '<text x="' + xs[i] + '" y="' + (base + 30) + '" font-size="13" text-anchor="middle" fill="' + INK + '">' + col + '</text>';
      }
      /* 行走方向：从房子出发的箭头（不沿途画脚印点，避免直接提示考生走了哪几盆）。
         考点就是「按箭头方向数 n 盆花」，答案由学生在图上自己数出来。 */
      var ay = base + 88, dir = sdir === 0 ? 1 : -1;
      var startX = houseX + dir * 34, tipX = dir > 0 ? 412 : 58;
      s += '<line data-u="arrow" data-dir="' + dir + '" data-n="' + n + '" x1="' + startX + '" y1="' + ay +
           '" x2="' + tipX + '" y2="' + ay + '" stroke="#c62828" stroke-width="3.4"/>';
      s += '<polygon points="' + (tipX + dir * 15) + ',' + ay + ' ' + tipX + ',' + (ay - 9) + ' ' + tipX + ',' + (ay + 9) + '" fill="#c62828"/>';
      s += '<text x="' + (dir > 0 ? 300 : 172) + '" y="' + (ay + 30) + '" font-size="15" font-weight="700" text-anchor="middle" fill="#c62828">walk this way</text>';
      s += '</svg>';
      return s;
    },

    /* 一堆蔬菜（Q11）：答案由个数决定 */
    veggies: function (spec, vars) {
      var n = Math.max(6, Math.min(20, Math.round(num(spec.count, vars))));
      var per = 6, cw = 62, ch = 68, pad = 20, rows = Math.ceil(n / per), i;
      var W = pad * 2 + per * cw, H = pad * 2 + rows * ch;
      var pal = ['#8b5e3c', '#d9a03c', '#b03a3a', '#3f8f4a', '#c96b1f', '#7a4b8f'];
      var s = svgOpen(W, H, n + ' vegetables');
      for (i = 0; i < n; i++) {
        var r = Math.floor(i / per), c = i % per, cx = pad + c * cw + cw / 2, cy = pad + r * ch + ch / 2;
        var k = i % 4;
        s += '<g data-u="item">';
        if (k === 0) {          /* 胡萝卜 */
          s += '<polygon points="' + (cx - 9) + ',' + (cy - 14) + ' ' + (cx + 9) + ',' + (cy - 14) + ' ' + cx + ',' + (cy + 18) + '" fill="' + pal[4] + '" stroke="' + INK + '" stroke-width="1.4"/>';
          s += '<path d="M' + (cx - 5) + ',' + (cy - 20) + ' q5,-8 10,0" fill="none" stroke="#3f8f4a" stroke-width="2"/>';
        } else if (k === 1) {   /* 圆根菜 */
          s += '<circle cx="' + cx + '" cy="' + (cy + 2) + '" r="15" fill="' + pal[0] + '" stroke="' + INK + '" stroke-width="1.4"/>';
          s += '<line x1="' + cx + '" y1="' + (cy - 13) + '" x2="' + cx + '" y2="' + (cy - 24) + '" stroke="#3f8f4a" stroke-width="2"/>';
        } else if (k === 2) {   /* 番茄 */
          s += '<circle cx="' + cx + '" cy="' + (cy + 2) + '" r="14" fill="' + pal[2] + '" stroke="' + INK + '" stroke-width="1.4"/>';
          s += '<path d="M' + (cx - 6) + ',' + (cy - 12) + ' l6,-6 l6,6" fill="none" stroke="#3f8f4a" stroke-width="2"/>';
        } else {                /* 叶菜 */
          s += '<ellipse cx="' + cx + '" cy="' + (cy + 4) + '" rx="15" ry="13" fill="' + pal[3] + '" stroke="' + INK + '" stroke-width="1.4"/>';
          s += '<circle cx="' + cx + '" cy="' + (cy + 4) + '" r="6" fill="#8fd18f" stroke="' + INK + '" stroke-width="1"/>';
        }
        s += '</g>';
      }
      s += '</svg>';
      return s;
    },

    /* 一列四个钟面，最上面是第 1 个（Q12）：h0..h3 是小时，m0..m3 是分钟(0/30) */
    clocksmatch: function (spec, vars) {
      var hs = ['h0', 'h1', 'h2', 'h3'].map(function (k) { return Math.round(num(spec[k], vars)); });
      var ms = ['m0', 'm1', 'm2', 'm3'].map(function (k) { return Math.round(num(spec[k], vars)); });
      var W = 232, rowH = 116, H = 20 + 4 * rowH, i;
      var s = svgOpen(W, H, 'four clocks');
      for (i = 0; i < 4; i++) {
        var cy = 20 + i * rowH + rowH / 2;
        s += '<text x="16" y="' + (cy + 6) + '" font-size="20" font-weight="700" fill="' + INK + '">' + (i + 1) + '</text>';
        s += '<g data-u="clock" data-h="' + hs[i] + '" data-m="' + ms[i] + '">' + clockFace(146, cy, 46, hs[i] % 12, ms[i]) + '</g>';
      }
      s += '</svg>';
      return s;
    },

    /* 数字钟（Q12 选项）：h/m 为小时分钟，内部补足两位 —— "6:00" "01:30" */
    digitalclock: function (spec, vars) {
      var h = Math.round(num(spec.h, vars)), m = Math.round(num(spec.m, vars));
      if (h <= 0) h = 12; if (h > 12) h = ((h - 1) % 12) + 1;
      var t = (h < 10 ? '0' + h : String(h)) + ':' + (m < 10 ? '0' + m : String(m));
      var W = 168, H = 62, s = svgOpen(W, H, 'digital clock ' + t);
      s += '<rect data-u="dclock" data-text="' + t + '" x="6" y="6" width="156" height="50" rx="10" fill="#1b1b1b" stroke="' + INK + '" stroke-width="2"/>';
      s += '<rect x="14" y="13" width="140" height="36" rx="6" fill="none" stroke="#3a3a3a" stroke-width="1.5"/>';
      s += '<text x="84" y="42" font-size="30" font-weight="700" text-anchor="middle" fill="#ffe600">' + t + '</text>';
      s += '</svg>';
      return s;
    },

    /* 单个模拟钟面（Q12 match 题型左列用）：h/m 为小时分钟，内部画出时针/分针 */
    clock: function (spec, vars) {
      var h = Math.round(num(spec.h, vars)), m = Math.round(num(spec.m, vars));
      if (h <= 0) h = 12; if (h > 12) h = ((h - 1) % 12) + 1;
      var r = 70, cx = 80, cy = 80, W = 160, H = 160;
      var s = svgOpen(W, H, 'analog clock ' + h + ' ' + m);
      s += '<g data-u="clock" data-h="' + h + '" data-m="' + m + '">' + clockFace(cx, cy, r, h % 12, m) + '</g>';
      s += '</svg>';
      return s;
    },

    /* 数轴：从 B 到 E 分成 n 格，箭头向下指第 k 格（Q13） */
    numline: function (spec, vars) {
      var B = num(spec.B, vars), E = num(spec.E, vars);
      var n = Math.max(1, Math.min(12, Math.round(num(spec.n, vars))));
      var k = Math.max(0, Math.min(n, Math.round(num(spec.k, vars))));
      var W = 460, H = 118, x0 = 40, x1 = 420, y = 66, step = (x1 - x0) / n, i;
      var s = svgOpen(W, H, 'number line ' + fmt(B) + ' to ' + fmt(E));
      s += '<line x1="' + (x0 - 22) + '" y1="' + y + '" x2="' + (x1 + 22) + '" y2="' + y + '" stroke="' + INK + '" stroke-width="2"/>';
      s += '<polygon points="' + (x0 - 22) + ',' + y + ' ' + (x0 - 10) + ',' + (y - 6) + ' ' + (x0 - 10) + ',' + (y + 6) + '" fill="' + INK + '"/>';
      s += '<polygon points="' + (x1 + 22) + ',' + y + ' ' + (x1 + 10) + ',' + (y - 6) + ' ' + (x1 + 10) + ',' + (y + 6) + '" fill="' + INK + '"/>';
      for (i = 0; i <= n; i++) {
        var x = x0 + i * step;
        s += '<line data-u="tick" x1="' + x.toFixed(1) + '" y1="' + (y - 10) + '" x2="' + x.toFixed(1) + '" y2="' + (y + 10) + '" stroke="' + INK + '" stroke-width="2"/>';
      }
      s += '<text x="' + x0 + '" y="' + (y + 34) + '" font-size="19" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(fmt(B)) + '</text>';
      s += '<text x="' + x1 + '" y="' + (y + 34) + '" font-size="19" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(fmt(E)) + '</text>';
      var kx = x0 + k * step;
      s += '<line data-u="arrow" data-k="' + k + '" x1="' + kx.toFixed(1) + '" y1="' + (y - 50) + '" x2="' + kx.toFixed(1) + '" y2="' + (y - 22) + '" stroke="' + RED + '" stroke-width="3.4"/>';
      s += '<polygon points="' + kx.toFixed(1) + ',' + (y - 10) + ' ' + (kx - 9).toFixed(1) + ',' + (y - 24) + ' ' + (kx + 9).toFixed(1) + ',' + (y - 24) + '" fill="' + RED + '"/>';
      s += '</svg>';
      return s;
    },

    /* 两个盒子各装 4 个图形（Q14） */
    twoboxes: function (spec, vars) {
      var b1 = (spec.box1 || []).map(function (k) { return str(k, vars); });
      var b2 = (spec.box2 || []).map(function (k) { return str(k, vars); });
      var bw = 138, bh = 138, gap = 34, pad = 12, W = pad * 2 + bw * 2 + gap, H = bh + 62;
      var fills = ['#2ea043', '#d9a03c', '#1f6feb', '#e5484d', '#7a4b8f', '#f5c518', '#0aa2a2'];
      var pos = [[40, 40], [98, 40], [40, 98], [98, 98]], i;
      var s = svgOpen(W, H, 'two boxes of shapes');
      [[b1, pad, 'Box 1'], [b2, pad + bw + gap, 'Box 2']].forEach(function (bx) {
        var x = bx[1];
        s += '<rect x="' + x + '" y="6" width="' + bw + '" height="' + bh + '" fill="#ffffff" stroke="' + INK + '" stroke-width="2"/>';
        s += '<text x="' + (x + bw / 2) + '" y="' + (bh + 34) + '" font-size="19" font-weight="700" text-anchor="middle" fill="' + INK + '">' + bx[2] + '</text>';
        for (i = 0; i < 4; i++) {
          var kind = bx[0][i] || 'square', idx = Math.abs(hashStr(kind)) % fills.length;
          s += '<g data-u="shape" data-kind="' + esc(kind) + '">' + shapeGlyph(kind, x + pos[i][0], pos[i][1], 19, fills[idx]) + '</g>';
        }
      });
      s += '</svg>';
      return s;
    },

    /* 两个图形中间写 and（Q14 选项） */
    shapepair: function (spec, vars) {
      var a = str(spec.a, vars), b = str(spec.b, vars);
      var fa = ['#2ea043', '#d9a03c', '#1f6feb', '#e5484d', '#7a4b8f', '#f5c518', '#0aa2a2'];
      var W = 172, H = 74, s = svgOpen(W, H, 'pair of shapes');
      s += '<g data-u="shape" data-kind="' + esc(a) + '">' + shapeGlyph(a, 40, 37, 24, fa[Math.abs(hashStr(a)) % fa.length]) + '</g>';
      s += '<text x="86" y="46" font-size="18" text-anchor="middle" fill="' + INK + '">and</text>';
      s += '<g data-u="shape" data-kind="' + esc(b) + '">' + shapeGlyph(b, 136, 37, 24, fa[Math.abs(hashStr(b)) % fa.length]) + '</g>';
      s += '</svg>';
      return s;
    },

    /* 一排汽车，按真实比例画长度与间隔（Q15） */
    carrow: function (spec, vars) {
      var n = Math.max(2, Math.min(8, Math.round(num(spec.n, vars))));
      var L = Math.max(1, Math.round(num(spec.L, vars))), g = Math.max(0, Math.round(num(spec.g, vars)));
      var total = n * L + (n - 1) * g, ppc = 420 / total, i;
      if (L * ppc < 16) ppc = 16 / L;                 /* 车太小会看不清，保证至少 16px 宽 */
      var cw = L * ppc, gw = g * ppc, span = n * cw + (n - 1) * gw;
      if (span > 428) { ppc *= 428 / span; cw = L * ppc; gw = g * ppc; span = n * cw + (n - 1) * gw; }
      var W = Math.round(span + 48), y = 60;
      var x0 = (W - span) / 2;
      var pal = ['#3f8f4a', '#e5484d', '#d9a03c', '#1f6feb', '#7a4b8f', '#0aa2a2'];
      var s = svgOpen(W, 160, 'a row of ' + n + ' toy cars');
      for (i = 0; i < n; i++) {
        var cx = x0 + i * (cw + gw) + cw / 2;
        s += '<g data-u="car">' + carIcon(cx, y, cw, pal[i % pal.length]) + '</g>';
      }
      s += '<line x1="' + x0 + '" y1="' + (y + 30) + '" x2="' + (x0 + cw) + '" y2="' + (y + 30) + '" stroke="' + INK + '" stroke-width="1.6"/>';
      s += '<line x1="' + x0 + '" y1="' + (y + 24) + '" x2="' + x0 + '" y2="' + (y + 36) + '" stroke="' + INK + '" stroke-width="1.6"/>';
      s += '<line x1="' + (x0 + cw) + '" y1="' + (y + 24) + '" x2="' + (x0 + cw) + '" y2="' + (y + 36) + '" stroke="' + INK + '" stroke-width="1.6"/>';
      s += '<text x="' + (x0 + cw / 2) + '" y="' + (y + 50) + '" font-size="15" text-anchor="middle" fill="' + INK + '">' + L + ' cm</text>';
      if (g > 0 && n > 1) {
        s += '<line x1="' + (x0 + cw) + '" y1="' + (y + 70) + '" x2="' + (x0 + cw + gw) + '" y2="' + (y + 70) + '" stroke="' + INK + '" stroke-width="1.6"/>';
        s += '<line x1="' + (x0 + cw) + '" y1="' + (y + 64) + '" x2="' + (x0 + cw) + '" y2="' + (y + 76) + '" stroke="' + INK + '" stroke-width="1.6"/>';
        s += '<line x1="' + (x0 + cw + gw) + '" y1="' + (y + 64) + '" x2="' + (x0 + cw + gw) + '" y2="' + (y + 76) + '" stroke="' + INK + '" stroke-width="1.6"/>';
        s += '<text x="' + (x0 + cw + gw / 2) + '" y="' + (y + 90) + '" font-size="15" text-anchor="middle" fill="' + INK + '">' + g + ' cm</text>';
      }
      s += '</svg>';
      return s;
    },

    /* 单位小立方体堆成的立体图形（Q16）：前 hFront 层、后 hBack 层的 w 宽墙 */
    /* 立体方块（Q16）：小方块搭成的立体。
       hF/hB 传标量 = 前后两层各自等高（规整长方体）；
       传**数组**（逐列高度表达式/变量名）= 不规则体 —— 原题正是不规则堆叠，
       不能只会画长方体。答案 = 图上 data-u="cube" 总数，test-figs 独立数一遍。 */
    solidcubes: function (spec, vars) {
      function colHeights(v, fallback) {
        var arr = Array.isArray(v) ? v : [v === undefined || v === null ? fallback : v];
        return arr.map(function (e) { return Math.max(1, Math.min(4, Math.round(num(e, vars)))); });
      }
      var hF = colHeights(spec.hF, spec.hFront);
      var hB = colHeights(spec.hB, spec.hBack);
      var w = Math.max(1, Math.min(5, Math.max(hF.length, hB.length)));
      while (hF.length < w) hF.push(hF[hF.length - 1]);
      while (hB.length < w) hB.push(hB[hB.length - 1]);
      var s0 = 40, dx = s0 * 0.5, dy = s0 * 0.34, pad = 34;
      var maxH = Math.max.apply(null, hF.concat(hB));
      var W = pad * 2 + w * s0 + dx, H = pad * 2 + maxH * s0 + dy + 10;
      var baseY = H - pad, s = svgOpen(W, H, 'solid made of stacked cubes'), row, lev, col;
      for (row = 1; row >= 0; row--) {
        var hs = row === 0 ? hF : hB;
        for (col = 0; col < w; col++) {
          for (lev = 0; lev < hs[col]; lev++) {
            var x = pad + col * s0 + row * dx, yy = baseY - (lev + 1) * s0 - row * dy;
            s += '<polygon points="' + x + ',' + yy + ' ' + (x + dx) + ',' + (yy - dy) + ' ' + (x + s0 + dx) + ',' + (yy - dy) + ' ' + (x + s0) + ',' + yy +
                 '" fill="#3f9d4a" stroke="' + INK + '" stroke-width="1.6"/>';
            s += '<polygon points="' + (x + s0) + ',' + yy + ' ' + (x + s0 + dx) + ',' + (yy - dy) + ' ' + (x + s0 + dx) + ',' + (yy + s0 - dy) + ' ' + (x + s0) + ',' + (yy + s0) +
                 '" fill="#2b7034" stroke="' + INK + '" stroke-width="1.6"/>';
            s += '<rect data-u="cube" x="' + x + '" y="' + yy + '" width="' + s0 + '" height="' + s0 + '" fill="#54b95f" stroke="' + INK + '" stroke-width="1.6"/>';
          }
        }
      }
      s += '</svg>';
      return s;
    },

    /* 形状 1/2/3 三组泰迪（Q17）：每组 rows 行，列数从 c0 起每次 +1。
       groups 控制画几组 —— 问「第 3 组」时只画 2 组，否则图里就把答案画出来了。
       每组占的横向格位 = max(泰迪宽度, 标签宽度)，标签居中放每组正上方
       （放左侧会压到上一组；列数少时标签比图形宽，格子太窄会写到画布外）。 */
    teddyseries: function (spec, vars) {
      var rows = Math.max(1, Math.min(4, Math.round(num(spec.rows, vars))));
      var c0 = Math.max(1, Math.min(5, Math.round(num(spec.c0, vars))));
      var gN = Math.max(1, Math.min(3, Math.round(num(spec.groups, vars) || 3)));
      var padX = 10, labelH = 26, cols = [], slot = [], i, r, c;
      for (i = 0; i < gN; i++) cols.push(c0 + i);
      var u = 34, gap = 26, lfs = 17, W = 0;
      var labelNeed = function (f) { return f * 3.5; };   /* "Shape 1" 的实际宽度 ≈ 3.5×字号 */
      var layout = function (uu, ff) { return cols.map(function (cc) { return Math.max(cc * uu, labelNeed(ff)); }); };
      var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
      for (var pass = 0; pass < 4; pass++) {
        slot = layout(u, lfs);
        W = padX * 2 + sum(slot) + gap * (gN - 1);
        if (W <= 470) break;
        var k2 = (470 - padX * 2 - gap * (gN - 1)) / sum(slot);
        u = Math.max(16, u * k2); lfs = Math.max(11, lfs * k2); labelH = 24;
      }
      slot = layout(u, lfs);
      W = padX * 2 + sum(slot) + gap * (gN - 1);
      var ss = u * 15 / 34, H = labelH + rows * u + 8;
      var s = svgOpen(W, H, 'bears arranged in a pattern');
      var gx = padX;
      for (i = 0; i < gN; i++) {
        var mid = gx + slot[i] / 2, tx = gx + (slot[i] - cols[i] * u) / 2;
        s += '<text x="' + mid.toFixed(1) + '" y="' + (labelH - 8) + '" font-size="' + lfs.toFixed(1) +
             '" font-weight="700" text-anchor="middle" fill="' + INK + '">Shape ' + (i + 1) + '</text>';
        for (r = 0; r < rows; r++) for (c = 0; c < cols[i]; c++) {
          s += '<g data-u="teddy">' + teddyIcon(tx + c * u + u / 2, labelH + r * u + u / 2, ss) + '</g>';
        }
        gx += slot[i] + gap;
      }
      s += '</svg>';
      return s;
    },

    /* 一组泰迪（Q17 选项）：rows 行 cols 列 */
    teddygrid: function (spec, vars) {
      var rows = Math.max(1, Math.min(6, Math.round(num(spec.rows, vars))));
      var cols = Math.max(1, Math.min(7, Math.round(num(spec.cols, vars))));
      var u = 34, ss = 15, W = cols * u + 16, H = rows * u + 16, r, c;
      var s = svgOpen(W, H, rows + ' rows of ' + cols + ' bears');
      for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
        s += '<g data-u="teddy">' + teddyIcon(8 + c * u + u / 2, 8 + r * u + u / 2, ss) + '</g>';
      }
      s += '</svg>';
      return s;
    },

    /* 方格纸上的三个图形（Q18）：shapes = [{r,c,s,t,fill}]，s 个整格 + t 个半格三角。
       网格行列按图形的实际位置自动放大，避免图形伸出纸外。 */
    areagrid: function (spec, vars) {
      var shapes = spec.shapes || [], cell = 44, pad = 14, i, j, k;
      var rows = 6, cols = 6;
      shapes.forEach(function (sh) {
        rows = Math.max(rows, Math.round(num(sh.r, vars)) + Math.round(num(sh.s, vars)));
        cols = Math.max(cols, Math.round(num(sh.c, vars)) + 2);
      });
      var W = pad * 2 + cols * cell, H = pad * 2 + rows * cell;
      var s = svgOpen(W, H, 'three shapes on grid paper');
      for (i = 0; i < rows; i++) for (j = 0; j < cols; j++) {
        s += '<rect x="' + (pad + j * cell) + '" y="' + (pad + i * cell) + '" width="' + cell + '" height="' + cell + '" fill="#ffffff" stroke="' + GREY + '" stroke-width="1.2"/>';
      }
      shapes.forEach(function (sh) {
        var sN = Math.round(num(sh.s, vars)), tN = Math.round(num(sh.t, vars));
        var r0 = Math.round(num(sh.r, vars)), c0c = Math.round(num(sh.c, vars));
        for (k = 0; k < sN; k++) {
          s += '<rect data-u="sq" x="' + (pad + c0c * cell) + '" y="' + (pad + (r0 + k) * cell) + '" width="' + cell + '" height="' + cell +
               '" fill="' + sh.fill + '" stroke="' + INK + '" stroke-width="1.6"/>';
        }
        for (k = 0; k < tN; k++) {
          var px = pad + (c0c + 1) * cell, py = pad + (r0 + k) * cell;
          s += '<polygon data-u="tri" points="' + px + ',' + py + ' ' + (px + cell) + ',' + py + ' ' + (px + cell) + ',' + (py + cell) +
               '" fill="' + sh.fill + '" stroke="' + INK + '" stroke-width="1.6"/>';
        }
      });
      s += '</svg>';
      return s;
    },

    /* 单独一个图形（Q18 选项） */
    areashape: function (spec, vars) {
      var sN = Math.max(1, Math.min(4, Math.round(num(spec.s, vars))));
      var tN = Math.max(0, Math.min(2, Math.round(num(spec.t, vars))));
      var cell = 38, cols = 2, pad = 12, k;
      var W = pad * 2 + cols * cell, H = pad * 2 + sN * cell;
      var s = svgOpen(W, H, 'area option');
      for (k = 0; k < sN; k++) {
        s += '<rect data-u="sq" x="' + pad + '" y="' + (pad + k * cell) + '" width="' + cell + '" height="' + cell +
             '" fill="' + spec.fill + '" stroke="' + INK + '" stroke-width="1.6"/>';
      }
      for (k = 0; k < tN; k++) {
        var px = pad + cell, py = pad + k * cell;
        s += '<polygon data-u="tri" points="' + px + ',' + py + ' ' + (px + cell) + ',' + py + ' ' + (px + cell) + ',' + (py + cell) +
             '" fill="' + spec.fill + '" stroke="' + INK + '" stroke-width="1.6"/>';
      }
      s += '</svg>';
      return s;
    },

    /* 柱状图（Q20 选项）：labels / values / axis（纵轴最大值） */
    barchart: function (spec, vars) {
      var labels = spec.labels || [], values = (spec.values || []).map(function (v) { return num(v, vars); });
      var axis = Math.max(1, Math.round(num(spec.axis, vars)) || 10);
      var x0 = 62, x1 = 190, y0 = 132, y1 = 26, bw = 30, i;
      var W = 200, H = 176;
      var s = svgOpen(W, H, 'bar graph');
      s += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x0 + '" y2="' + y1 + '" stroke="' + INK + '" stroke-width="1.8"/>';
      s += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y0 + '" stroke="' + INK + '" stroke-width="1.8"/>';
      for (i = 0; i <= 5; i++) {
        var gy = y0 - (y0 - y1) * i / 5, gv = axis * i / 5;
        s += '<line x1="' + x0 + '" y1="' + gy.toFixed(1) + '" x2="' + x1 + '" y2="' + gy.toFixed(1) + '" stroke="#cfd8e3" stroke-width="1"/>';
        s += '<text x="' + (x0 - 5) + '" y="' + (gy + 5).toFixed(1) + '" font-size="12" text-anchor="end" fill="' + INK + '">' + fmt(gv) + '</text>';
      }
      s += '<text x="30" y="112" font-size="12" fill="' + INK + '" transform="rotate(-90 30 112)">Number of apples</text>';
      for (i = 0; i < labels.length; i++) {
        var hgt = (y0 - y1) * Math.min(1, values[i] / axis), bx = x0 + 12 + i * ((x1 - x0 - 16) / labels.length);
        s += '<rect data-u="bar" data-v="' + values[i] + '" x="' + bx.toFixed(1) + '" y="' + (y0 - hgt).toFixed(1) + '" width="' + bw + '" height="' + hgt.toFixed(1) + '" fill="#9aa4b2" stroke="' + INK + '" stroke-width="1.4"/>';
        s += '<text x="' + (bx + bw / 2).toFixed(1) + '" y="' + (y0 + 15) + '" font-size="11" text-anchor="middle" fill="' + INK + '">' + esc(labels[i]) + '</text>';
      }
      s += '</svg>';
      return s;
    },

    /* 水瓶：总共 ridges 个凸纹，水面到第 level 个凸纹（Q21） */
    bottle: function (spec, vars) {
      var ridges = Math.max(4, Math.min(10, Math.round(num(spec.ridges, vars) || 8)));
      var lv = Math.max(0, Math.min(ridges, Math.round(num(spec.level, vars))));
      var W = 108, H = 300, bx = 26, bw = 56, top = 76, bot = 286, rh = (bot - top) / ridges, i;
      var wy = bot - lv * rh;
      var s = svgOpen(W, H, 'water bottle');
      s += '<rect x="40" y="20" width="28" height="14" rx="3" fill="#cfd8e3" stroke="' + INK + '" stroke-width="2"/>';
      s += '<path d="M42,34 L66,34 L74,' + top + ' L26,' + top + ' Z" fill="#ffffff" stroke="' + INK + '" stroke-width="2"/>';
      s += '<rect x="' + bx + '" y="' + top + '" width="' + bw + '" height="' + (bot - top) + '" rx="10" fill="#ffffff" stroke="' + INK + '" stroke-width="2"/>';
      s += '<rect data-u="water" data-level="' + lv + '" x="' + (bx + 4) + '" y="' + wy.toFixed(1) + '" width="' + (bw - 8) + '" height="' + (bot - wy - 4).toFixed(1) + '" rx="7" fill="#1f6feb" stroke="none"/>';
      for (i = 1; i < ridges; i++) {
        var ry = top + i * rh;
        s += '<line x1="' + (bx + 2) + '" y1="' + ry.toFixed(1) + '" x2="' + (bx + bw - 2) + '" y2="' + ry.toFixed(1) + '" stroke="' + GREY + '" stroke-width="1.6"/>';
      }
      s += '<rect x="' + bx + '" y="' + top + '" width="' + bw + '" height="' + (bot - top) + '" rx="10" fill="none" stroke="' + INK + '" stroke-width="2.4"/>';
      s += '</svg>';
      return s;
    },

    /* 点连图主图（Q22）：只画 6 个带编号的点，**一条线都不画**。
       点的位置每次随机（由 seed 决定），每点上的编号也是随机排列。
       每个点挂 data-n / data-x / data-y，自检脚本据此独立重算「按编号连成的闭合环」。 */
    dotfig: function (spec, vars) {
      var seed = Math.round(num(spec.seed, vars)) || 1;
      var L = q22Build(seed), s = svgOpen(Q22_W, Q22_H, 'numbered dots'), i;
      for (i = 0; i < 6; i++) {
        s += '<g data-u="dot" data-n="' + L.num[i] + '" data-x="' + L.pts[i][0] + '" data-y="' + L.pts[i][1] + '">' +
             '<circle cx="' + L.pts[i][0] + '" cy="' + L.pts[i][1] + '" r="7.5" fill="' + RED + '"/>' +
             '<text x="' + L.pts[i][0] + '" y="' + (L.pts[i][1] - 15) + '" font-size="19" font-weight="700" text-anchor="middle" fill="' + INK + '">' + L.num[i] + '</text></g>';
      }
      s += '</svg>';
      return s;
    },

    /* 点连图的四种画法（Q22 选项）：which = 0 是按编号 1→2→…→6→1 连（正确项），
       1..3 是干扰项。画法由 q22Pick(seed) 统一给出，且和主图共用同一组点，
       所以选项之间、选项与主图都能逐点对上。 */
    dotjoin: function (spec, vars) {
      var seed = Math.round(num(spec.seed, vars)) || 1;
      var which = Math.round(num(spec.which, vars)) || 0;
      var L = q22Build(seed), pick = q22Pick(seed);
      var seq = pick[which] || pick[0];
      var s = svgOpen(Q22_W, Q22_H, 'joined dots'), i;
      for (i = 0; i < seq.length; i++) {
        var p1 = L.pts[seq[i]], p2 = L.pts[seq[(i + 1) % seq.length]];
        s += '<line data-u="edge" x1="' + p1[0] + '" y1="' + p1[1] + '" x2="' + p2[0] + '" y2="' + p2[1] + '" stroke="#1f3f8f" stroke-width="3.2"/>';
      }
      for (i = 0; i < 6; i++) s += '<circle cx="' + L.pts[i][0] + '" cy="' + L.pts[i][1] + '" r="6.5" fill="' + RED + '"/>';
      s += '</svg>';
      return s;
    },

    /* 四个三角形（Q23）：tri = [[top,bl,br,inside], ...]，某一组的 top 写 '?'。
       x0/x1 留出 26px 内边距，否则第一组左下角数字框会越出画布左边界。 */
    trianglepuz: function (spec, vars) {
      var tri = spec.tri || [], tw = 108, W = tw * tri.length + 12, H = 186, s = svgOpen(W, H, 'triangle number puzzles'), i;
      for (i = 0; i < tri.length; i++) {
        var t = tri[i], x0 = i * tw + 26, x1 = i * tw + tw - 14, yb = 132, ya = 52, cx = (x0 + x1) / 2;
        s += '<polygon data-u="tri" points="' + cx + ',' + ya + ' ' + x1 + ',' + yb + ' ' + x0 + ',' + yb + '" fill="none" stroke="' + INK + '" stroke-width="2"/>';
        s += '<circle cx="' + cx + '" cy="' + ya + '" r="17" fill="' + (cellText(t[0], vars) === '?' ? '#e5484d' : '#2ea043') + '" stroke="' + INK + '" stroke-width="1.6"/>';
        s += '<text x="' + cx + '" y="' + (ya + 6) + '" font-size="18" font-weight="700" text-anchor="middle" fill="#ffffff">' + esc(cellText(t[0], vars)) + '</text>';
        s += '<rect x="' + (x0 - 16) + '" y="' + (yb - 16) + '" width="34" height="32" fill="#dfe3a0" stroke="' + INK + '" stroke-width="1.6"/>';
        s += '<text x="' + (x0 + 1) + '" y="' + (yb + 7) + '" font-size="18" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(cellText(t[1], vars)) + '</text>';
        s += '<rect x="' + (x1 - 18) + '" y="' + (yb - 16) + '" width="34" height="32" fill="#dfe3a0" stroke="' + INK + '" stroke-width="1.6"/>';
        s += '<text x="' + (x1 - 1) + '" y="' + (yb + 7) + '" font-size="18" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(cellText(t[2], vars)) + '</text>';
        s += '<text data-u="inside" x="' + cx + '" y="' + (yb - 22) + '" font-size="22" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(cellText(t[3], vars)) + '</text>';
      }
      s += '</svg>';
      return s;
    },

    /* 靶盘：1 环在最外面、5 环在中心（Q25） */
    /* 靶盘（Q25）：照原卷画 —— 从外到内红白相间（外环红）、环带较厚，
       数字 1-4 黑色放在**环带中线**（原先挤在顶部边缘、且外环画成白色，和原卷相反），
       5 在红色靶心内用白字。半径比例取自原卷：外环最厚、靶心略大。 */
    targetboard: function (spec, vars) {
      var W = 300, H = 304, cx = 150, cy = 152, R = 126;
      var rs = [1, 0.79, 0.585, 0.40, 0.235].map(function (k) { return R * k; });
      var s = svgOpen(W, H, 'target board 1 to 5 points'), i;
      for (i = 0; i < 5; i++) {
        s += '<circle data-u="ring" data-i="' + (i + 1) + '" cx="' + cx + '" cy="' + cy + '" r="' + rs[i].toFixed(1) +
             '" fill="' + (i % 2 ? '#ffffff' : '#d0342c') + '" stroke="' + INK + '" stroke-width="' + (i === 0 ? 3 : 2) + '"/>';
      }
      for (i = 0; i < 4; i++) {
        var mid = (rs[i] + rs[i + 1]) / 2;
        s += '<text x="' + cx + '" y="' + (cy - mid + 6).toFixed(1) + '" font-size="17" font-weight="700" text-anchor="middle" fill="' + INK + '">' + (i + 1) + '</text>';
      }
      s += '<text x="' + cx + '" y="' + (cy - rs[4] / 2 + 6).toFixed(1) + '" font-size="17" font-weight="700" text-anchor="middle" fill="#ffffff">5</text>';
      s += '</svg>';
      return s;
    },

    /* 蜂巢密铺（Q27）：pat 是「每行几个」的数字串，如 "343" = 上 3、中 4、下 3。
       **摆放规则（不重叠的必要条件）**：同一排等高横排，相邻两排必须错开半个六边形
       （半个宽 = w/2），否则两块会压在一起、图形就废了。
       行数相差 1 时，居中摆放本身恰好错开 w/2（原卷那个 3-4-3 就是这样，保持原样）；
       行数相同或相差 ≥2 时，居中摆放会**完全对齐**（会重叠），所以下面按取模算出一个
       0 或 w/2 的补正量，让任何 pat 都能铺成不重叠的一坨。
       整幅按实际范围重新居中，宽度按范围算，避免被裁掉。
       **所有六边形同色**：原题问的是「有几块只和 3 个其它块相接」，
       所以不能把某一块涂成高亮（涂了就变成「数涂色块的邻居」这道完全不同的题）。
       每块挂 data-r/data-c/data-x/data-y，自检脚本按「中心距 ≈ √3·side」独立重建邻接关系，
       并检查图形连通、任意两块中心距 ≥ √3·side（不重叠）。 */
    hexcomb: function (spec, vars) {
      var code = String(str(spec.pattern, vars) || '343').replace(/[^0-9]/g, '') || '343';
      var rows = code.split('').map(function (ch) { return parseInt(ch, 10); })
        .filter(function (n) { return n >= 1 && n <= 6; });
      if (rows.length < 2) rows = [3, 4, 3];
      var side = 26, w = Math.sqrt(3) * side, half = w / 2, pad = 18, i, r;
      /* 先算每行的左端偏移（不含整幅平移）：居中偏移 + 补正量 */
      var off = [], n, minX = Infinity, maxX = -Infinity;
      for (r = 0; r < rows.length; r++) {
        n = rows[r];
        var mid = -(n - 1) * half, add = 0;
        if (r > 0) {
          /* 与上一行的错位必须是 w/2 的奇数倍：算出来是偶数就补 w/2 */
          var u = Math.round((off[r - 1] + half - mid) / half);
          add = (((u % 2) + 2) % 2) ? half : 0;
        }
        off.push(mid + add);
        minX = Math.min(minX, off[r]);
        maxX = Math.max(maxX, off[r] + (n - 1) * w);
      }
      var W = Math.round((maxX - minX) + w + pad * 2);
      var H = Math.round(pad * 2 + side * 2 + (rows.length - 1) * 1.5 * side);
      var dx = pad + half - minX;                 /* 整幅水平居中 */
      function hexPts(cx, cy) {
        var out = [], t;
        for (t = 0; t < 6; t++) {
          var ang = -Math.PI / 2 + t * Math.PI / 3;
          out.push((cx + side * Math.cos(ang)).toFixed(1) + ',' + (cy + side * Math.sin(ang)).toFixed(1));
        }
        return out.join(' ');
      }
      var s = svgOpen(W, H, 'hexagon tessellation');
      for (r = 0; r < rows.length; r++) {
        n = rows[r];
        var cy = pad + side + r * 1.5 * side;
        for (i = 0; i < n; i++) {
          var cx = off[r] + dx + i * w;
          s += '<polygon data-u="hex" data-r="' + r + '" data-c="' + i + '" data-x="' + cx.toFixed(1) + '" data-y="' + cy.toFixed(1) +
               '" points="' + hexPts(cx, cy) + '" fill="#a9662f" stroke="' + INK + '" stroke-width="1.8"/>';
        }
      }
      s += '</svg>';
      return s;
    },

    /* 一排四栋房子 + 一棵树（Q29）。房子之间**不等距**：gaps 是每两栋之间距离的
       「份数」串，如 "112" = 第1段 1 份、第2段 1 份、第3段 2 份。
       树默认立在最宽的那段空隙里（空隙够大才放得下树，原卷也是这么画的）。
       房子上面**不写名字**、下面画空方框（原卷是拖名字的框）——
       名字必须让学生按距离条件推出来，写在图上就等于把答案印出来了。
       每栋挂 data-u/data-i/data-x，每段挂 data-u="gap" data-i/data-units。 */
    houses: function (spec, vars) {
      var gc = String(str(spec.gaps, vars) || '112').replace(/[^0-9]/g, '') || '112';
      var gaps = gc.split('').map(function (c) { return parseInt(c, 10); });
      if (gaps.length !== 3 || gaps.some(function (g) { return g < 1 || g > 3; })) gaps = [1, 1, 2];
      var hw = 52, hh = 58, pad = 36, unit = 38, baseY = 166, i;
      var xs = [], x = pad + hw / 2;
      xs.push(x);
      for (i = 0; i < 3; i++) { x += hw / 2 + gaps[i] * unit + hw / 2; xs.push(x); }
      var W = Math.round(xs[3] + hw / 2 + pad);
      if (W > 480) { pad = 24; W = Math.round(xs[3] + hw / 2 + pad); }
      /* 树站在哪段空隙：默认最宽的那段 */
      var tg = Math.max(0, Math.min(2, Math.round(num(spec.tree, vars) || 0)));
      if (spec.tree === undefined) {
        tg = 0;
        for (i = 1; i < 3; i++) if (gaps[i] > gaps[tg]) tg = i;
      }
      var walls = ['#dbe9f5', '#fbe6c6', '#f6d6dd', '#e6e2f0'];
      var s = svgOpen(W, 240, 'four houses, not equally spaced');
      s += '<line x1="8" y1="' + (baseY + 4) + '" x2="' + (W - 8) + '" y2="' + (baseY + 4) + '" stroke="#8a6b45" stroke-width="5"/>';
      for (i = 0; i < 4; i++) {
        s += '<g data-u="house" data-i="' + i + '" data-x="' + xs[i] + '">' +
             houseIcon(xs[i], baseY, hw, hh, walls[i], '#c62828') + '</g>';
        s += '<rect class="namebox" data-u="namebox" x="' + (xs[i] - 26) + '" y="' + (baseY + 20) + '" width="52" height="26" rx="3" fill="#ffffff" stroke="#1f6feb" stroke-width="2"/>';
      }
      for (i = 0; i < 3; i++) {
        var ga = xs[i] + hw / 2, gb = xs[i + 1] - hw / 2;
        s += '<line data-u="gap" data-i="' + i + '" data-units="' + gaps[i] + '" x1="' + ga + '" y1="' + (baseY + 58) +
             '" x2="' + gb + '" y2="' + (baseY + 58) + '" stroke="' + GREY + '" stroke-width="1.8"/>';
        s += '<line x1="' + ga + '" y1="' + (baseY + 53) + '" x2="' + ga + '" y2="' + (baseY + 63) + '" stroke="' + GREY + '" stroke-width="1.8"/>';
        s += '<line x1="' + gb + '" y1="' + (baseY + 53) + '" x2="' + gb + '" y2="' + (baseY + 63) + '" stroke="' + GREY + '" stroke-width="1.8"/>';
      }
      var tx = (xs[tg] + hw / 2 + xs[tg + 1] - hw / 2) / 2;
      s += '<g data-u="tree" data-gap="' + tg + '">' + treeIcon(tx, baseY + 4, 34) + '</g>';
      s += '</svg>';
      return s;
    },


    /* 宝箱 + 天数表（Q30）。原卷那张图 = 宝箱卡通 + 「前三天取了几枚」的表格，
       真正要读的是**表格**，所以这里的重点是表格必须画得出来（chest 只是装饰）。
       表格每格的值由 cellText 从 vars 取名（传变量名，如 't1'，不能传表达式 'a+d'）。
       硬币只画一小堆装饰，**不挂 data-u="coin"**，免得「图上的枚数」被当成条件去数。 */
    chest: function (spec, vars) {
      var cols = spec.cols || ['Day', 'Number of gold pieces taken out'];
      var rows = spec.rows || [];
      var widths = spec.widths || [92, 300];
      var hasTable = rows.length > 0;
      var pad = 16, rowH = 32, bw = 176, bh = 104;
      var total = widths.reduce(function (a, b) { return a + b; }, 0);
      var W = Math.round(Math.max(total + pad * 2, bw + pad * 2));
      var headH = hasTable ? 14 + (rows.length + 1) * rowH : 0;
      var H = pad + bh + 26 + headH + pad;
      var cxm = W / 2, i, c;
      var s = svgOpen(W, H, 'treasure chest and a table');
      /* --- 宝箱（装饰） --- */
      var tx = cxm - bw / 2, ty = pad;
      s += '<path d="M' + tx + ',' + (ty + 40) + ' Q' + tx + ',' + ty + ' ' + (tx + bw / 2) + ',' + ty +
           ' Q' + (tx + bw) + ',' + ty + ' ' + (tx + bw) + ',' + (ty + 40) + ' Z" fill="#8a5a2b" stroke="' + INK + '" stroke-width="2.4"/>';
      s += '<rect x="' + tx + '" y="' + (ty + 40) + '" width="' + bw + '" height="64" fill="#a9743f" stroke="' + INK + '" stroke-width="2.4"/>';
      s += '<rect x="' + tx + '" y="' + (ty + 40) + '" width="' + bw + '" height="12" fill="#7b4a2d" stroke="' + INK + '" stroke-width="1.6"/>';
      /* 露出来的一小堆金币（固定 5 枚，仅装饰） */
      var pile = [[-34, 6], [-17, 2], [0, 0], [17, 2], [34, 6]];
      for (i = 0; i < pile.length; i++) {
        s += '<circle cx="' + (cxm + pile[i][0]) + '" cy="' + (ty + 36 + pile[i][1]) + '" r="10" fill="#f5c518" stroke="' + INK + '" stroke-width="1.6"/>';
      }
      s += '<rect x="' + (cxm - 11) + '" y="' + (ty + 44) + '" width="22" height="28" rx="3" fill="#f5c518" stroke="' + INK + '" stroke-width="2"/>';
      /* --- 天数表 --- */
      if (hasTable) {
        var y = ty + bh + 26, xOf = function (cc) { var xx = (W - total) / 2; for (var q = 0; q < cc; q++) xx += widths[q]; return xx; };
        s += '<rect x="' + ((W - total) / 2) + '" y="' + y + '" width="' + total + '" height="' + ((rows.length + 1) * rowH) + '" fill="#ffffff" stroke="' + INK + '" stroke-width="2"/>';
        for (c = 0; c < cols.length; c++) {
          s += '<rect x="' + xOf(c) + '" y="' + y + '" width="' + widths[c] + '" height="' + rowH + '" fill="#f7d774" stroke="' + INK + '" stroke-width="1.4"/>';
          s += '<text x="' + (xOf(c) + widths[c] / 2) + '" y="' + (y + rowH - 10) + '" font-size="14" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(cols[c]) + '</text>';
        }
        for (i = 0; i < rows.length; i++) {
          for (c = 0; c < cols.length; c++) {
            s += '<rect x="' + xOf(c) + '" y="' + (y + (i + 1) * rowH) + '" width="' + widths[c] + '" height="' + rowH + '" fill="none" stroke="' + INK + '" stroke-width="1"/>';
            s += '<text data-u="cell" data-r="' + i + '" data-c="' + c + '" x="' + (xOf(c) + widths[c] / 2) +
                 '" y="' + (y + (i + 2) * rowH - 10) + '" font-size="15" text-anchor="middle" fill="' + INK + '">' +
                 esc(cellText(rows[i][c], vars)) + '</text>';
          }
        }
      }
      s += '</svg>';
      return s;
    },

    /* 骨牌配对（Q9）：上面画「示例」（两张总点数相同的骨牌，中间写 matches），
       下面写一句 Jim picked up this domino. 再画他拿到的那张。
       示例是原卷给的、必须画出来 ——「加起来一样多」这条规则全靠示例传达。 */
    dominomatch: function (spec, vars) {
      var ea = Math.round(num(spec.ea, vars)), eb = Math.round(num(spec.eb, vars));
      var fa = Math.round(num(spec.fa, vars)), fb = Math.round(num(spec.fb, vars));
      var pa = Math.round(num(spec.pa, vars)), pb = Math.round(num(spec.pb, vars));
      var dw = 130, dh = 64, W = 470, s = svgOpen(W, 296, 'dominoes that match');
      var ax = 12, gap = 84, bx = ax + dw + gap;
      s += '<g data-u="exA" data-a="' + ea + '" data-b="' + eb + '">' + dominoTile(ax, 18, dw, dh, ea, eb) + '</g>';
      s += '<text x="' + (ax + dw + gap / 2) + '" y="' + (18 + dh / 2 + 6) + '" font-size="16" text-anchor="middle" fill="' + INK + '">matches</text>';
      s += '<g data-u="exB" data-a="' + fa + '" data-b="' + fb + '">' + dominoTile(bx, 18, dw, dh, fa, fb) + '</g>';
      s += '<text x="' + ax + '" y="' + (18 + dh + 32) + '" font-size="15" fill="' + INK + '">Jim picked up this domino.</text>';
      s += '<g data-u="picked" data-a="' + pa + '" data-b="' + pb + '">' + dominoTile(ax, 18 + dh + 54, dw, dh, pa, pb) + '</g>';
      s += '</svg>';
      return s;
    }
  };

  /* 字符串哈希（图形颜色按名字固定取色，保证同名同色） */
  function hashStr(s) {
    var h = 0;
    s = String(s);
    for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return h;
  }

  /* 车辆简笔图标：cx,cy 中心 */
  function vehicleIcon(cx, cy, kind) {
    var o = '';
    if (kind === 'bike') {
      o += '<circle cx="' + (cx - 16) + '" cy="' + (cy + 8) + '" r="11" fill="none" stroke="' + INK + '" stroke-width="2.4"/>';
      o += '<circle cx="' + (cx + 16) + '" cy="' + (cy + 8) + '" r="11" fill="none" stroke="' + INK + '" stroke-width="2.4"/>';
      o += '<path d="M' + (cx - 16) + ',' + (cy + 8) + ' L' + (cx - 2) + ',' + (cy - 10) + ' L' + (cx + 16) + ',' + (cy - 10) + '" fill="none" stroke="' + RED + '" stroke-width="2.4"/>';
      o += '<path d="M' + (cx - 16) + ',' + (cy + 8) + ' L' + (cx + 2) + ',' + (cy + 8) + '" fill="none" stroke="' + RED + '" stroke-width="2.4"/>';
      return o;
    }
    if (kind === 'truck') {
      o += '<rect x="' + (cx - 30) + '" y="' + (cy - 4) + '" width="34" height="22" fill="#cfd8e3" stroke="' + INK + '" stroke-width="2"/>';
      o += '<path d="M' + (cx + 4) + ',' + (cy - 14) + ' h14 l10,12 v20 h-24 z" fill="#e5484d" stroke="' + INK + '" stroke-width="2"/>';
      o += '<circle cx="' + (cx - 20) + '" cy="' + (cy + 18) + '" r="6" fill="' + INK + '"/><circle cx="' + (cx + 18) + '" cy="' + (cy + 18) + '" r="6" fill="' + INK + '"/>';
      return o;
    }
    if (kind === 'bus') {
      o += '<rect x="' + (cx - 34) + '" y="' + (cy - 14) + '" width="68" height="30" rx="7" fill="#1f6feb" stroke="' + INK + '" stroke-width="2"/>';
      for (var i = 0; i < 4; i++) o += '<rect x="' + (cx - 28 + i * 15) + '" y="' + (cy - 9) + '" width="11" height="11" rx="2" fill="#dff0ff" stroke="' + INK + '" stroke-width="1"/>';
      o += '<circle cx="' + (cx - 20) + '" cy="' + (cy + 17) + '" r="6" fill="' + INK + '"/><circle cx="' + (cx + 20) + '" cy="' + (cy + 17) + '" r="6" fill="' + INK + '"/>';
      return o;
    }
    // car
    o += '<path d="M' + (cx - 30) + ',' + (cy + 8) + ' q4,-16 16,-16 h18 q12,0 16,16 z" fill="#7bc47f" stroke="' + INK + '" stroke-width="2"/>';
    o += '<rect x="' + (cx - 32) + '" y="' + (cy + 6) + '" width="64" height="12" rx="4" fill="#7bc47f" stroke="' + INK + '" stroke-width="2"/>';
    o += '<circle cx="' + (cx - 18) + '" cy="' + (cy + 19) + '" r="6" fill="' + INK + '"/><circle cx="' + (cx + 18) + '" cy="' + (cy + 19) + '" r="6" fill="' + INK + '"/>';
    return o;
  }

  /* ---------- Q22 连点图：6 个点每次随机摆放 ----------
     主图只画 6 个「带编号的点」，不画任何线；4 个选项是「按编号顺序连线」的四种画法（闭合）。
     主图和 4 个选项必须用**同一组坐标**，否则学生没法逐点比对；所以这里用一个以 seed 为种子
     的确定性 PRNG（mulberry32）：只要 seed 一样，任何一次 q22Build() 都得到同一组点和编号。
     选项的画法由 which 指定（0 = 按编号连 = 正确项；1..3 = 干扰项），干扰项的连线顺序从
     坐标几何算出来（外圈顺序 / 隔一个连 / 按 x 交错），并保证与正确项及彼此都不重复。 */
  var Q22_W = 320, Q22_H = 252;

  function q22Prng(seed) {
    var s = (Math.round(seed) >>> 0) || 1;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function q22BBox(p) {
    var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, i;
    for (i = 0; i < p.length; i++) {
      x0 = Math.min(x0, p[i][0]); x1 = Math.max(x1, p[i][0]);
      y0 = Math.min(y0, p[i][1]); y1 = Math.max(y1, p[i][1]);
    }
    return [x0, y0, x1, y1];
  }

  function q22Spread(p, min) {
    var i, j, dx, dy;
    for (i = 0; i < p.length; i++) for (j = i + 1; j < p.length; j++) {
      dx = p[i][0] - p[j][0]; dy = p[i][1] - p[j][1];
      if (dx * dx + dy * dy < min * min) return false;
    }
    return true;
  }

  /* 数字写在点的正上方（宽 22、高 21），别的点不能落进这个框里，否则字会被盖住 */
  function q22LabelsOk(p) {
    var i, j, lx0, lx1, ly0, ly1;
    for (i = 0; i < p.length; i++) {
      lx0 = p[i][0] - 12; lx1 = p[i][0] + 12; ly0 = p[i][1] - 34; ly1 = p[i][1] - 12;
      for (j = 0; j < p.length; j++) {
        if (j === i) continue;
        if (p[j][0] > lx0 - 6 && p[j][0] < lx1 + 6 && p[j][1] > ly0 - 6 && p[j][1] < ly1 + 6) return false;
      }
    }
    return true;
  }

  /* 6 个点的坐标 + 每点上的编号（编号是一个排列）。同一个 seed 必定得到同一结果。 */
  function q22Build(seed) {
    var rnd = q22Prng(seed * 2654435761 + 12345);
    var mx = 34, myTop = 50, myBot = 26, pts = null, tries, i;
    for (tries = 0; tries < 900; tries++) {
      var p = [];
      for (i = 0; i < 6; i++) {
        p.push([mx + rnd() * (Q22_W - 2 * mx), myTop + rnd() * (Q22_H - myTop - myBot)]);
      }
      if (!q22Spread(p, 68) || !q22LabelsOk(p)) continue;
      var bb = q22BBox(p);
      if ((bb[2] - bb[0]) < 170 || (bb[3] - bb[1]) < 118) continue;
      pts = p; break;
    }
    if (!pts) {                                  /* 兜底：抖动 3×2 网格（一定满足间距要求） */
      var gx = [64, 160, 256], gy = [76, 186];
      pts = [];
      for (i = 0; i < 6; i++) {
        pts.push([gx[i % 3] + (rnd() - 0.5) * 24, gy[Math.floor(i / 3)] + (rnd() - 0.5) * 24]);
      }
    }
    /* 把外接框在画布里居中，再取整（主图和选项要用完全一样的整数坐标） */
    var b2 = q22BBox(pts);
    var dx = (Q22_W - (b2[2] - b2[0])) / 2 - b2[0], dy = (Q22_H - (b2[3] - b2[1])) / 2 - b2[1];
    for (i = 0; i < 6; i++) { pts[i][0] = Math.round(pts[i][0] + dx); pts[i][1] = Math.round(pts[i][1] + dy); }
    /* 编号：随机排列 1..6 */
    var num = [1, 2, 3, 4, 5, 6], r2 = q22Prng(seed * 40503 + 7), a, b, t;
    for (a = 5; a > 0; a--) { b = Math.floor(r2() * (a + 1)); t = num[a]; num[a] = num[b]; num[b] = t; }
    return { pts: pts, num: num };
  }

  /* 闭合环的规范形：旋转、反向都算同一个环，取字典序最小者（用于判「两幅图是不是同一幅」） */
  function q22Canon(seq) {
    var best = null, dir, r, s, rot, str;
    for (dir = 0; dir < 2; dir++) {
      s = dir ? seq.slice().reverse() : seq.slice();
      for (r = 0; r < s.length; r++) {
        rot = s.slice(r).concat(s.slice(0, r));
        str = rot.join('-');
        if (best === null || str < best) best = str;
      }
    }
    return best;
  }

  /* 把 6 个点按「绕重心一圈」的角度排序（外圈顺序） */
  function q22AngularOrder(pts) {
    var idx = [], i, cx = 0, cy = 0;
    for (i = 0; i < pts.length; i++) { idx.push(i); cx += pts[i][0]; cy += pts[i][1]; }
    cx /= pts.length; cy /= pts.length;
    idx.sort(function (a, b) {
      var ta = Math.atan2(pts[a][1] - cy, pts[a][0] - cx), tb = Math.atan2(pts[b][1] - cy, pts[b][0] - cx);
      return (ta - tb) || (pts[a][0] - pts[b][0]);
    });
    return idx;
  }

  /* 四个选项的连线顺序：0 = 按编号 1→6 连（正确项）；1..3 = 三个互不相同的画法 */
  function q22Pick(seed) {
    var L = q22Build(seed), pts = L.pts, num = L.num, i, k;
    var correct = [];
    for (k = 1; k <= 6; k++) for (i = 0; i < 6; i++) if (num[i] === k) correct.push(i);
    var out = [correct], seen = [q22Canon(correct)];
    var ang = q22AngularOrder(pts);
    var byX = [0, 1, 2, 3, 4, 5].sort(function (a, b) { return pts[a][0] - pts[b][0]; });
    var pool = [
      ang.slice(),
      [ang[0], ang[2], ang[4], ang[1], ang[3], ang[5]],
      [byX[0], byX[2], byX[4], byX[1], byX[3], byX[5]],
      [ang[0], ang[1], ang[2], ang[5], ang[4], ang[3]],
      [ang[0], ang[3], ang[1], ang[4], ang[2], ang[5]]
    ];
    for (i = 0; i < pool.length && out.length < 4; i++) {
      var c = q22Canon(pool[i]);
      if (seen.indexOf(c) < 0) { seen.push(c); out.push(pool[i]); }
    }
    var rnd = q22Prng(seed * 2246822519 + 91), guard = 0, j, m, tt, perm, cc;
    while (out.length < 4 && guard++ < 300) {          /* 兜底：还不够就用确定性乱序补 */
      perm = [0, 1, 2, 3, 4, 5];
      for (j = 5; j > 0; j--) { m = Math.floor(rnd() * (j + 1)); tt = perm[j]; perm[j] = perm[m]; perm[m] = tt; }
      cc = q22Canon(perm);
      if (seen.indexOf(cc) < 0) { seen.push(cc); out.push(perm); }
    }
    return out;
  }

  function fmt(v) {
    if (typeof v !== 'number' || !isFinite(v)) return String(v);
    return (Math.abs(v - Math.round(v)) < 1e-9) ? String(Math.round(v)) : String(Math.round(v * 100) / 100);
  }

  /* ==================================================================
     第三批（2025 SEAMO Paper A）用到的图元与图形类型。
     原则同上：图上文字一律用原卷语言（英文卷 → 英文）；凡是"能数出来/能量出来"的
     元素都挂 data-u 与 data-* ，test-figs.js 靠它照图独立重算一遍答案。
     ================================================================== */

  /* 由恰好 n 条直线段组成的图形（n=0 画一个圆）。
     Q2 的规律就是"线段条数依次加 1"，所以图形必须真的能数出线段数。 */
  function segShapeSvg(n, cx, cy, s, fill) {
    var i, p = [], ang;
    if (n <= 0) {
      return '<circle data-u="shape" data-n="0" cx="' + cx + '" cy="' + cy + '" r="' + (s * 0.8).toFixed(1) + '" fill="' + fill + '" stroke="' + INK + '" stroke-width="2.2"/>';
    }
    if (n === 1) {
      return '<line data-u="shape" data-n="1" x1="' + cx + '" y1="' + (cy - s).toFixed(1) + '" x2="' + cx + '" y2="' + (cy + s).toFixed(1) + '" stroke="' + INK + '" stroke-width="2.6"/>';
    }
    if (n === 2) {
      return '<polyline data-u="shape" data-n="2" points="' + cx + ',' + (cy - s).toFixed(1) + ' ' + cx + ',' + cy + ' ' + (cx + s).toFixed(1) + ',' + cy +
             '" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>';
    }
    for (i = 0; i < n; i++) {                       /* n≥3：正 n 边形正好有 n 条边 */
      ang = -Math.PI / 2 + i * 2 * Math.PI / n;
      p.push((cx + s * Math.cos(ang)).toFixed(1) + ',' + (cy + s * Math.sin(ang)).toFixed(1));
    }
    return '<polygon data-u="shape" data-n="' + n + '" points="' + p.join(' ') + '" fill="' + fill + '" stroke="' + INK + '" stroke-width="2.2"/>';
  }

  /* 12 等分圆盘：从 start 点钟方向起连续涂 count 格（Q10）。
     阴影格本身由 start/count 决定 —— 图与答案同源，不能各写各的。
     注意：**盘面里不要写 1..12 的钟点数字** —— 原卷（2025seamoA-q10.png）只有 12 条辐条 + 外圆，
     一个数字都没有；多写数字等于往图里塞原题没有的信息（解析里用「N 点钟方向」描述起点，
     12 条辐条本身就足以让学生自己数出来）。 */
  function discSvg(cx, cy, r, start, count) {
    var o = '', k, a0, a1;
    start = ((Math.round(start) % 12) + 12) % 12;
    count = Math.max(0, Math.min(12, Math.round(count)));
    for (k = 0; k < 12; k++) {
      a0 = (k * 30 - 90) * Math.PI / 180;
      a1 = ((k + 1) * 30 - 90) * Math.PI / 180;
      o += '<path d="M' + cx + ',' + cy +
           ' L' + (cx + r * Math.cos(a0)).toFixed(1) + ',' + (cy + r * Math.sin(a0)).toFixed(1) +
           ' A' + r + ',' + r + ' 0 0 1 ' + (cx + r * Math.cos(a1)).toFixed(1) + ',' + (cy + r * Math.sin(a1)).toFixed(1) +
           ' Z" fill="' + (((k - start + 12) % 12) < count ? '#6cbf72' : '#ffffff') + '" stroke="' + INK + '" stroke-width="1"/>';
    }
    o += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + INK + '" stroke-width="2"/>';
    return o;
  }

  /* 带 1..12 数字的钟面（clockFace 只有刻度，读数题需要数字） */
  function faceN(cx, cy, r, hh, mm) {
    var s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#ffffff" stroke="' + INK + '" stroke-width="2"/>', t, a, rr = r - 12;
    for (t = 0; t < 12; t++) {
      a = t * Math.PI / 6;
      s += '<line x1="' + (cx + rr * Math.sin(a)).toFixed(1) + '" y1="' + (cy - rr * Math.cos(a)).toFixed(1) +
           '" x2="' + (cx + (rr + 7) * Math.sin(a)).toFixed(1) + '" y2="' + (cy - (rr + 7) * Math.cos(a)).toFixed(1) +
           '" stroke="' + INK + '" stroke-width="2"/>';
    }
    for (t = 1; t <= 12; t++) {
      a = (t * 30 - 90) * Math.PI / 180;
      s += '<text x="' + (cx + (r - 24) * Math.cos(a)).toFixed(1) + '" y="' + (cy + (r - 24) * Math.sin(a) + 3.6).toFixed(1) +
           '" font-size="11" text-anchor="middle" fill="' + INK + '">' + t + '</text>';
    }
    var ha = ((hh % 12) + mm / 60) * Math.PI / 6, ma = (mm % 60) * Math.PI / 30;
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + r * 0.46 * Math.sin(ha)).toFixed(1) + '" y2="' + (cy - r * 0.46 * Math.cos(ha)).toFixed(1) + '" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>';
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + r * 0.74 * Math.sin(ma)).toFixed(1) + '" y2="' + (cy - r * 0.74 * Math.cos(ma)).toFixed(1) + '" stroke="' + BLUE + '" stroke-width="3" stroke-linecap="round"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="' + INK + '"/>';
    return s;
  }

  /* 分钟数(0..1439) -> "h:mm" 12 小时制 + PM（图注用；答案侧由模板的约束保证分钟两位） */
  function ampmLabel(mins) {
    var h = Math.floor(mins / 60), m = mins % 60, h12 = ((h + 11) % 12) + 1;
    return h12 + ':' + (m < 10 ? '0' + m : String(m)) + ' PM';
  }

  /* 水果 / 砝码小图标（Q16 天平用） */
  function grapeIcon(cx, cy, s) {
    var pts = [[-0.52, -0.18], [0.52, -0.18], [0, -0.58], [-0.30, 0.20], [0.30, 0.20], [0, 0.52]], i, o = '';
    for (i = 0; i < pts.length; i++) {
      o += '<circle cx="' + (cx + pts[i][0] * s).toFixed(1) + '" cy="' + (cy + pts[i][1] * s).toFixed(1) + '" r="' + (s * 0.31).toFixed(1) + '" fill="#8b5cf6" stroke="' + INK + '" stroke-width="0.9"/>';
    }
    o += '<line x1="' + cx + '" y1="' + (cy - s * 0.78).toFixed(1) + '" x2="' + cx + '" y2="' + (cy - s * 1.02).toFixed(1) + '" stroke="#5a3d1e" stroke-width="1.8"/>';
    return o;
  }
  function bananaIcon(cx, cy, s) {
    return '<path d="M' + (cx - s * 0.62).toFixed(1) + ',' + (cy - s * 0.5).toFixed(1) +
           ' Q' + cx + ',' + (cy + s * 0.98).toFixed(1) + ' ' + (cx + s * 0.62).toFixed(1) + ',' + (cy - s * 0.42).toFixed(1) +
           '" fill="none" stroke="#e8b400" stroke-width="' + (s * 0.40).toFixed(1) + '" stroke-linecap="round"/>' +
           '<path d="M' + (cx - s * 0.62).toFixed(1) + ',' + (cy - s * 0.5).toFixed(1) +
           ' Q' + cx + ',' + (cy + s * 0.98).toFixed(1) + ' ' + (cx + s * 0.62).toFixed(1) + ',' + (cy - s * 0.42).toFixed(1) +
           '" fill="none" stroke="' + INK + '" stroke-width="0.9" stroke-linecap="round"/>';
  }
  function appleIcon(cx, cy, s) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + (s * 0.52).toFixed(1) + '" fill="#e5484d" stroke="' + INK + '" stroke-width="1.1"/>' +
           '<line x1="' + cx + '" y1="' + (cy - s * 0.5).toFixed(1) + '" x2="' + cx + '" y2="' + (cy - s * 0.80).toFixed(1) + '" stroke="#5a3d1e" stroke-width="1.8"/>' +
           '<ellipse cx="' + (cx + s * 0.30).toFixed(1) + '" cy="' + (cy - s * 0.74).toFixed(1) + '" rx="' + (s * 0.26).toFixed(1) + '" ry="' + (s * 0.13).toFixed(1) + '" fill="#2ea043" stroke="' + INK + '" stroke-width="0.7"/>';
  }
  function weightIcon(cx, cy, s, label) {
    return '<rect x="' + (cx - s * 0.52).toFixed(1) + '" y="' + (cy - s * 0.40).toFixed(1) + '" width="' + (s * 1.04).toFixed(1) + '" height="' + (s * 0.80).toFixed(1) + '" rx="3" fill="#6b7280" stroke="' + INK + '" stroke-width="1.3"/>' +
           '<path d="M' + (cx - s * 0.22).toFixed(1) + ',' + (cy - s * 0.40).toFixed(1) + ' q' + (s * 0.22).toFixed(1) + ',-' + (s * 0.46).toFixed(1) + ' ' + (s * 0.44).toFixed(1) + ',0" fill="none" stroke="' + INK + '" stroke-width="1.5"/>' +
           '<text x="' + cx + '" y="' + (cy + s * 0.16).toFixed(1) + '" font-size="' + (s * 0.34).toFixed(1) + '" text-anchor="middle" fill="#ffffff">' + esc(label) + '</text>';
  }
  function itemIcon(kind, cx, cy, s, label) {
    if (kind === 'grape') return grapeIcon(cx, cy, s);
    if (kind === 'banana') return bananaIcon(cx, cy, s);
    if (kind === 'apple') return appleIcon(cx, cy, s);
    if (kind === 'weight') return weightIcon(cx, cy, s, label || '');
    return '<rect x="' + (cx - s * 0.4).toFixed(1) + '" y="' + (cy - s * 0.4).toFixed(1) + '" width="' + (s * 0.8).toFixed(1) + '" height="' + (s * 0.8).toFixed(1) + '" fill="' + GREY + '" stroke="' + INK + '" stroke-width="1.2"/>';
  }
  /* 一行小图标：items = [[kind,count],…]；weight 的标签用 labelOf */
  function itemRow(cx, baseY, items, vars, labelOf) {
    var list = [], i, o = '';
    (items || []).forEach(function (it) {
      var cnt = Math.round(num(it[1], vars));
      for (i = 0; i < cnt; i++) list.push(it[0]);
    });
    var slot = 34, x0 = cx - (list.length - 1) * slot / 2;
    for (i = 0; i < list.length; i++) o += itemIcon(list[i], x0 + i * slot, baseY - 20, 22, labelOf ? labelOf(list[i]) : '');
    return o;
  }
  /* 一段折线集合（Q19 叠加规律）：segs = ["00-20", …]，坐标在 3×3 点阵上，y 向上 */
  function segFigInner(segs, ox, oy, u) {
    var o = '';
    (Array.isArray(segs) ? segs : String(segs).split(';')).forEach(function (code) {
      var p = String(code).split('-');
      if (p.length !== 2) return;
      var a = p[0].split(','), b = p[1].split(',');
      if (a.length !== 2 || b.length !== 2) return;
      o += '<line data-u="line" data-a="' + a[0] + ',' + a[1] + '" data-b="' + b[0] + ',' + b[1] +
           '" x1="' + (ox + (+a[0]) * u).toFixed(1) + '" y1="' + (oy + (2 - (+a[1])) * u).toFixed(1) +
           '" x2="' + (ox + (+b[0]) * u).toFixed(1) + '" y2="' + (oy + (2 - (+b[1])) * u).toFixed(1) +
           '" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>';
    });
    return o;
  }

  /* Q19「叠加规律」用的四组图形：每组 a、b 两条线段集合满足 u = a ∪ b（且有公共线段，
     这样「叠加」和「异或」能区分开）；um = u 去掉一条线段（干扰项）。
     连线一律画在同一条线上（3×3 点阵，坐标 x,y ∈ 0..2，y 向上）。 */
  var SEGTRIPLES = [
    {   /* 0：缺上边的正方形＋对角线  ⊕  缺下边的正方形＋另一条对角线  =  正方形＋两条对角线 */
      a: ['00-20', '20-22', '02-00', '00-22'],
      b: ['20-22', '22-02', '02-00', '20-02'],
      u: ['00-20', '20-22', '22-02', '02-00', '00-22', '20-02'],
      um: ['00-20', '20-22', '22-02', '02-00', '00-22']
    },
    {   /* 1：三边  ⊕  左边＋中线  =  三边＋中线 */
      a: ['00-20', '20-22', '02-00'],
      b: ['02-00', '01-21'],
      u: ['00-20', '20-22', '02-00', '01-21'],
      um: ['00-20', '20-22', '01-21']
    },
    {   /* 2：左边＋下边  ⊕  右边＋上边＋左边  =  下边＋右边＋上边＋左边 */
      a: ['02-00', '00-20'],
      b: ['20-22', '22-02', '02-00'],
      u: ['02-00', '00-20', '20-22', '22-02'],
      um: ['02-00', '00-20', '20-22']
    },
    {   /* 3：下边＋竖中线  ⊕  正方形＋对角线  =  正方形＋对角线＋竖中线 */
      a: ['10-12', '00-20'],
      b: ['00-20', '20-22', '22-02', '02-00', '00-22'],
      u: ['10-12', '00-20', '20-22', '22-02', '02-00', '00-22'],
      um: ['10-12', '00-20', '20-22', '22-02', '02-00']
    }
  ];
  /* 取下标：spec 里给的是变量名或数字，统一折算成 0..n-1 */
  function modIdx(v, vars, n) {
    var i = Math.round(num(v, vars));
    if (!isFinite(i)) i = 0;
    return ((i % n) + n) % n;
  }
  /* segfig 的线段来源：直接给 segs，或给 tbl + i 从 SEGTRIPLES 里取 */
  function segsOf(spec, vars) {
    if (spec.segs) return Array.isArray(spec.segs) ? spec.segs : String(spec.segs).split(';');
    var t = SEGTRIPLES[modIdx(spec.i, vars, SEGTRIPLES.length)] || SEGTRIPLES[0];
    var key = String(spec.tbl || 'U').toLowerCase();
    return t[key === 'a' ? 'a' : (key === 'b' ? 'b' : (key === 'um' ? 'um' : 'u'))];
  }

  var TYPES5 = {
    /* 数字拼图「小房子」（Q1）：屋顶的数 = 下面左右两格之积 − 1。
       最后一座屋顶画成「?」；图片里的数字都挂 data-* 供自检脚本独立验算。 */
    puzzlehouse: function (spec, vars) {
      var pairs = spec.pairs || [], roofs = spec.roofs || [];
      var n = Math.max(1, pairs.length), cw = 92, pad = 14, i;
      var W = Math.round(Math.min(480, pad * 2 + n * cw)), H = 146;
      var s = svgOpen(W, H, 'number puzzle houses');
      for (i = 0; i < n; i++) {
        var x = pad + i * cw, cx = x + cw / 2;
        var a = cellText((pairs[i] || [])[0], vars), b = cellText((pairs[i] || [])[1], vars);
        var rv = (i < roofs.length && roofs[i] !== null && roofs[i] !== undefined && roofs[i] !== '') ? cellText(roofs[i], vars) : '?';
        s += '<polygon points="' + (x + 8) + ',70 ' + cx + ',24 ' + (x + cw - 8) + ',70" fill="#bfe3ff" stroke="' + INK + '" stroke-width="2"/>';
        s += '<text data-u="roof" data-v="' + esc(rv) + '" x="' + cx + '" y="62" font-size="21" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(rv) + '</text>';
        s += '<rect x="' + (x + 8) + '" y="70" width="' + ((cw - 16) / 2) + '" height="46" fill="#ffffff" stroke="' + INK + '" stroke-width="2"/>';
        s += '<rect x="' + (x + 8 + (cw - 16) / 2) + '" y="70" width="' + ((cw - 16) / 2) + '" height="46" fill="#ffffff" stroke="' + INK + '" stroke-width="2"/>';
        s += '<text data-u="cell" data-side="l" data-v="' + esc(a) + '" x="' + (x + 8 + (cw - 16) / 4) + '" y="101" font-size="21" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(a) + '</text>';
        s += '<text data-u="cell" data-side="r" data-v="' + esc(b) + '" x="' + (x + 8 + (cw - 16) * 3 / 4) + '" y="101" font-size="21" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(b) + '</text>';
      }
      s += '</svg>';
      return s;
    },

    /* 单个「由 n 条线段组成」的图形（Q2 选项用）：n=0 圆、1 直线、2 直角折线、n≥3 正 n 边形 */
    segshape: function (spec, vars) {
      var n = Math.max(0, Math.min(8, Math.round(num(spec.n, vars))));
      var W = 96, H = 84, s = svgOpen(W, H, 'shape with ' + n + ' sides');
      s += segShapeSvg(n, W / 2, H / 2, 26, '#cfe6ff');
      s += '</svg>';
      return s;
    },

    /* 线段数递增的图形序列，末尾一个「?」（Q2 主图） */
    segseq: function (spec, vars) {
      var s0 = Math.max(0, Math.round(num(spec.s, vars)));
      var len = Math.max(2, Math.min(5, Math.round(num(spec.len, vars) || 3)));
      var cw = 74, pad = 16, i;
      var W = Math.round(pad * 2 + (len + 1) * cw), H = 120;
      var s = svgOpen(W, H, 'sequence of shapes with increasing number of sides');
      for (i = 0; i <= len; i++) {
        var cx = pad + (i + 0.5) * cw, cy = 62;
        if (i === len) {
          s += '<rect x="' + (cx - 26) + '" y="' + (cy - 30) + '" width="52" height="60" rx="4" fill="#e5484d" stroke="' + INK + '" stroke-width="2"/>';
          s += '<text x="' + cx + '" y="' + (cy + 11) + '" font-size="30" font-weight="700" text-anchor="middle" fill="#ffffff">?</text>';
        } else {
          s += '<g data-u="step" data-n="' + (s0 + i) + '">' + segShapeSvg(s0 + i, cx, cy, 25, '#cfe6ff') + '</g>';
        }
      }
      s += '</svg>';
      return s;
    },

    /* 两点之间的距离示意图（Q5）：左边 Cindy，右边房子，中间箭头标注距离 */
    distline: function (spec, vars) {
      var d = cellText(spec.d, vars), i;
      var W = 450, H = 178, s = svgOpen(W, H, 'distance ' + d + ' m');
      s += '<circle cx="58" cy="48" r="15" fill="#f7d774" stroke="' + INK + '" stroke-width="2"/>';
      s += '<line x1="58" y1="63" x2="58" y2="94" stroke="' + INK + '" stroke-width="3"/>';
      s += '<line x1="58" y1="74" x2="40" y2="86" stroke="' + INK + '" stroke-width="3"/>';
      s += '<line x1="58" y1="74" x2="76" y2="86" stroke="' + INK + '" stroke-width="3"/>';
      s += '<line x1="58" y1="94" x2="46" y2="114" stroke="' + INK + '" stroke-width="3"/>';
      s += '<line x1="58" y1="94" x2="70" y2="114" stroke="' + INK + '" stroke-width="3"/>';
      s += '<text x="58" y="134" font-size="14" text-anchor="middle" fill="' + INK + '">Cindy</text>';
      s += houseIcon(368, 120, 92, 58, '#f7d774', '#d97706');
      s += '<text x="368" y="140" font-size="13" text-anchor="middle" fill="' + INK + '">Granny\u2019s house</text>';
      s += '<line x1="96" y1="70" x2="304" y2="70" stroke="' + BLUE + '" stroke-width="3"/>';
      s += '<polygon points="316,70 300,62 300,78" fill="' + BLUE + '"/>';
      /* 距离标注（下方双箭头 + 数字） */
      s += '<line x1="58" y1="152" x2="368" y2="152" stroke="' + INK + '" stroke-width="1.6"/>';
      for (i = 0; i < 2; i++) {
        var ex = i ? 368 : 58, dir = i ? 1 : -1;
        s += '<line x1="' + ex + '" y1="146" x2="' + ex + '" y2="158" stroke="' + INK + '" stroke-width="1.6"/>';
        s += '<polygon points="' + (ex + dir * 9) + ',152 ' + ex + ',148 ' + ex + ',156" fill="' + INK + '"/>';
      }
      s += '<text data-u="dist" data-v="' + esc(d) + '" x="213" y="170" font-size="17" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(d) + ' m</text>';
      s += '</svg>';
      return s;
    },

    /* 三角形数字阵（Q6）：画出前 rows 行，下面用「...」表示继续 */
    numtri: function (spec, vars) {
      var rows = Math.max(2, Math.min(6, Math.round(num(spec.rows, vars) || 4)));
      var rowH = 30, cw = 34, pad = 16, r, c, v = 1;
      var W = Math.round(pad * 2 + rows * cw + 24);
      if (W > 480) { cw = (480 - pad * 2 - 24) / rows; W = 480; }
      var H = Math.round(pad * 2 + rows * rowH + 26);
      var s = svgOpen(W, H, 'number triangle');
      for (r = 1; r <= rows; r++) {
        var y = pad + r * rowH - 6, x0 = (W - r * cw) / 2;
        for (c = 0; c < r; c++) {
          s += '<text data-u="num" data-v="' + v + '" x="' + (x0 + (c + 0.5) * cw).toFixed(1) + '" y="' + y + '" font-size="18" text-anchor="middle" fill="' + INK + '">' + v + '</text>';
          v++;
        }
      }
      s += '<text x="' + (W / 2) + '" y="' + (pad + rows * rowH + 20) + '" font-size="22" font-weight="700" text-anchor="middle" fill="' + INK + '">...</text>';
      s += '</svg>';
      return s;
    },

    /* 逆推圆圈链（Q9）：? →(+3)→ ○ →(×3)→ ○ →(−3)→ ○ →(÷3)→ 3 */
    opchain: function (spec, vars) {
      var ops = spec.ops || [], finalV = cellText(spec.final, vars);
      var n = ops.length + 1, r = 20, gap = 58, pad = 12, j;
      var W = Math.round(pad * 2 + n * 2 * r + ops.length * gap), H = 96;
      var s = svgOpen(W, H, 'reverse operations chain');
      for (j = 0; j < n; j++) {
        var cx = pad + r + j * (2 * r + gap);
        var txt = j === 0 ? '?' : (j === n - 1 ? finalV : '');
        s += '<circle data-u="node" data-i="' + j + '" data-v="' + esc(txt) + '" cx="' + cx + '" cy="48" r="' + r + '" fill="' +
             ((j === 0 || j === n - 1) ? '#ffe9a8' : '#ffffff') + '" stroke="' + INK + '" stroke-width="2"/>';
        if (txt) s += '<text x="' + cx + '" y="' + (txt.length > 2 ? 54 : 57) + '" font-size="' + (txt.length > 2 ? 14 : 20) + '" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(txt) + '</text>';
      }
      for (j = 0; j < ops.length; j++) {
        var x1 = pad + r + j * (2 * r + gap) + r + 4, x2 = pad + r + (j + 1) * (2 * r + gap) - r - 4;
        s += '<line x1="' + x1 + '" y1="48" x2="' + x2 + '" y2="48" stroke="' + INK + '" stroke-width="2"/>';
        s += '<polygon points="' + (x2 + 6) + ',48 ' + x2 + ',43 ' + x2 + ',53" fill="' + INK + '"/>';
        var v = cellText(ops[j][1], vars);
        s += '<text data-u="op" data-sym="' + esc(ops[j][0]) + '" data-v="' + esc(v) + '" x="' + ((x1 + x2) / 2).toFixed(1) +
             '" y="36" font-size="16" font-weight="700" text-anchor="middle" fill="' + BLUE + '">' + esc(ops[j][0] + v) + '</text>';
      }
      s += '</svg>';
      return s;
    },

    /* 3×3 圆盘阵（Q10）：第 i 行涂 j+1 格、起始钟点每行顺时针推进 1 格；缺的那格画成「?」 */
    discgrid: function (spec, vars) {
      var rows = Math.max(1, Math.min(4, Math.round(num(spec.rows, vars) || 3)));
      var cols = Math.max(1, Math.min(4, Math.round(num(spec.cols, vars) || 3)));
      var start = Math.round(num(spec.start, vars) || 1);
      var mr = Math.round(num(spec.mr, vars)), mc = Math.round(num(spec.mc, vars));
      var r = 30, cell = 2 * r + 12, pad = 14, i, j;
      var W = Math.round(pad * 2 + cols * cell), H = Math.round(pad * 2 + rows * cell);
      var s = svgOpen(W, H, 'grid of twelve-sector discs');
      for (i = 0; i < rows; i++) {
        for (j = 0; j < cols; j++) {
          var cx = pad + (j + 0.5) * cell, cy = pad + (i + 0.5) * cell;
          if (i === mr && j === mc) {
            s += '<rect data-u="blank" data-r="' + i + '" data-c="' + j + '" x="' + (cx - r) + '" y="' + (cy - r) + '" width="' + (2 * r) + '" height="' + (2 * r) + '" rx="4" fill="#6cbf72" stroke="' + INK + '" stroke-width="2"/>';
            s += '<text x="' + cx + '" y="' + (cy + 11) + '" font-size="30" font-weight="700" text-anchor="middle" fill="#ffffff">?</text>';
          } else {
            s += '<g data-u="disc" data-r="' + i + '" data-c="' + j + '" data-start="' + (((start + i) % 12) + 12) % 12 + '" data-count="' + (j + 1) + '">' + discSvg(cx, cy, r, start + i, j + 1) + '</g>';
          }
        }
      }
      s += '</svg>';
      return s;
    },

    /* 单个十二等分圆盘（Q10 选项）：start 点钟起涂 count 格 */
    disc: function (spec, vars) {
      var start = Math.round(num(spec.start, vars)), count = Math.round(num(spec.count, vars));
      var W = 96, H = 96, s = svgOpen(W, H, 'disc');
      s += '<g data-u="disc" data-start="' + start + '" data-count="' + count + '">' + discSvg(W / 2, H / 2, 42, start, count) + '</g>';
      s += '</svg>';
      return s;
    },

    /* 两个钟面 + 箭头（Q11）：h1..m2 直接用变量（24 小时制的 h） */
    clockpair: function (spec, vars) {
      var h1 = Math.round(num(spec.h1, vars)), m1 = Math.round(num(spec.m1, vars));
      var h2 = Math.round(num(spec.h2, vars)), m2 = Math.round(num(spec.m2, vars));
      var W = 400, H = 176, s = svgOpen(W, H, 'two clocks');
      s += '<g data-u="clock" data-h="' + h1 + '" data-m="' + m1 + '">' + faceN(100, 88, 70, h1 % 12, m1) + '</g>';
      s += '<g data-u="clock" data-h="' + h2 + '" data-m="' + m2 + '">' + faceN(300, 88, 70, h2 % 12, m2) + '</g>';
      s += '<line x1="182" y1="88" x2="212" y2="88" stroke="' + INK + '" stroke-width="3"/>';
      s += '<polygon points="224,88 208,80 208,96" fill="' + INK + '"/>';
      s += '</svg>';
      return s;
    },

    /* 四个钟面排成一行，前三个标出时刻、第 4 个画「?」（Q22）。
       c1..c3 传「当天第几分钟」；时刻标签由图形自己排版（图上文字一律英文）。 */
    clockseq: function (spec, vars) {
      var cs = [spec.c1, spec.c2, spec.c3].map(function (v) { return Math.round(num(v, vars)); });
      var r = 44, gap = 116, pad = 14, i, cy = 84;
      var W = Math.round(pad * 2 + 3 * gap + 2 * r), H = 176;
      var s = svgOpen(W, H, 'four clocks in a row');
      for (i = 0; i < 3; i++) {
        var cx = pad + r + i * gap, h = Math.floor(cs[i] / 60), m = cs[i] % 60, lbl = ampmLabel(cs[i]);
        s += '<g data-u="clock" data-h="' + h + '" data-m="' + m + '">' + faceN(cx, cy, r, h % 12, m) + '</g>';
        s += '<text data-u="clabel" data-t="' + esc(lbl) + '" x="' + cx + '" y="' + (cy + r + 26) + '" font-size="15" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(lbl) + '</text>';
      }
      var bx = pad + r + 3 * gap;
      s += '<circle data-u="blank" cx="' + bx + '" cy="' + cy + '" r="' + r + '" fill="#e9f7ea" stroke="' + INK + '" stroke-width="2"/>';
      s += '<text x="' + bx + '" y="' + (cy + 12) + '" font-size="34" font-weight="700" text-anchor="middle" fill="#2ea043">?</text>';
      s += '</svg>';
      return s;
    },

    /* 空白周历表（Q14）：表头 Sun..Sat，下面留空若干行供推算 */
    calgrid: function (spec, vars) {
      var rows = Math.max(2, Math.min(6, Math.round(num(spec.rows, vars) || 4)));
      var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      var cols = ['#e5484d', '#2ea043', '#1f6feb', '#8b5cf6', '#d97706', '#ec4899', '#b08900'];
      var cw = 62, ch = 34, pad = 14, i, j;
      var W = Math.round(pad * 2 + 7 * cw), H = Math.round(pad * 2 + ch + rows * ch);
      var s = svgOpen(W, H, 'blank week calendar');
      for (i = 0; i < 7; i++) {
        var x = pad + i * cw;
        s += '<rect x="' + x + '" y="' + pad + '" width="' + (cw - 4) + '" height="' + ch + '" fill="#ffffff" stroke="' + cols[i] + '" stroke-width="2"/>';
        s += '<text data-u="dow" data-d="' + days[i] + '" x="' + (x + (cw - 4) / 2) + '" y="' + (pad + ch - 10) + '" font-size="14" font-weight="700" text-anchor="middle" fill="' + cols[i] + '">' + days[i] + '</text>';
      }
      for (i = 0; i < rows; i++) {
        for (j = 0; j < 7; j++) {
          s += '<rect x="' + (pad + j * cw) + '" y="' + (pad + ch + i * ch) + '" width="' + (cw - 4) + '" height="' + ch + '" fill="#ffffff" stroke="' + GREY + '" stroke-width="1.4"/>';
        }
      }
      s += '</svg>';
      return s;
    },

    /* 3×3 数字方阵（Q15）：第 (i,j) 格 = base + (i+j)*step，一格画「?」 */
    numgrid: function (spec, vars) {
      var step = Math.round(num(spec.step, vars)), base = Math.round(num(spec.base, vars));
      var mr = Math.round(num(spec.mr, vars)), mc = Math.round(num(spec.mc, vars));
      var cw = 68, ch = 54, pad = 14, i, j;
      var W = pad * 2 + 3 * cw, H = pad * 2 + 3 * ch;
      var s = svgOpen(W, H, 'number grid');
      for (i = 0; i < 3; i++) {
        for (j = 0; j < 3; j++) {
          var x = pad + j * cw, y = pad + i * ch, v = base + (i + j) * step;
          var isM = (i === mr && j === mc);
          s += '<rect x="' + x + '" y="' + y + '" width="' + cw + '" height="' + ch + '" fill="' + (isM ? '#ffe9a8' : '#ffffff') + '" stroke="' + INK + '" stroke-width="2"/>';
          s += '<text' + (isM ? '' : ' data-u="cell" data-r="' + i + '" data-c="' + j + '" data-v="' + v + '"') +
               ' x="' + (x + cw / 2) + '" y="' + (y + ch / 2 + 9) + '" font-size="24" font-weight="700" text-anchor="middle" fill="' + INK + '">' +
               (isM ? '?' : v) + '</text>';
        }
      }
      s += '</svg>';
      return s;
    },

    /* 天平（Q16）：balances = [{l:[[kind,count]…], r:[[kind,count]…], weight:"140 g"}…]，全部平衡 */
    balance: function (spec, vars) {
      var bs = spec.balances || [], bw = 150, bh = 186, pad = 8, i;
      var W = Math.round(pad * 2 + Math.max(1, bs.length) * bw), H = Math.round(pad * 2 + bh);
      var s = svgOpen(W, H, 'balance scales');
      for (i = 0; i < bs.length; i++) {
        var ox = pad + i * bw, cx = ox + bw / 2, beamY = 96, baseY = 168, arm = 62;
        var label = bs[i].weight ? (cellText(bs[i].weight, vars) + ' g') : '';
        s += '<rect x="' + (cx - 26) + '" y="' + baseY + '" width="52" height="8" rx="3" fill="#9aa3af" stroke="' + INK + '" stroke-width="1.4"/>';
        s += '<rect x="' + (cx - 4) + '" y="' + beamY + '" width="8" height="' + (baseY - beamY) + '" fill="#9aa3af" stroke="' + INK + '" stroke-width="1.4"/>';
        s += '<g data-u="balance" data-arm="' + arm + '" data-side-l="' + itemsKey(bs[i].l, vars) + '" data-side-r="' + itemsKey(bs[i].r, vars) +
             '" data-w="' + esc(bs[i].weight ? cellText(bs[i].weight, vars) : '') + '">';
        s += '<line x1="' + (cx - arm) + '" y1="' + beamY + '" x2="' + (cx + arm) + '" y2="' + beamY + '" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>';
        s += '<circle cx="' + cx + '" cy="' + beamY + '" r="4" fill="' + INK + '"/>';
        for (var k = 0; k < 2; k++) {
          var px = cx + (k ? arm : -arm);
          s += '<line x1="' + px + '" y1="' + beamY + '" x2="' + (px - 22) + '" y2="' + (beamY + 26) + '" stroke="' + INK + '" stroke-width="1.4"/>';
          s += '<line x1="' + px + '" y1="' + beamY + '" x2="' + (px + 22) + '" y2="' + (beamY + 26) + '" stroke="' + INK + '" stroke-width="1.4"/>';
          s += '<path d="M' + (px - 26) + ',' + (beamY + 26) + ' L' + (px + 26) + ',' + (beamY + 26) + ' L' + (px + 17) + ',' + (beamY + 36) + ' L' + (px - 17) + ',' + (beamY + 36) + ' Z" fill="#c9d3e0" stroke="' + INK + '" stroke-width="1.6"/>';
          s += itemRow(px, beamY + 26, k ? bs[i].r : bs[i].l, vars, function () { return label; });
        }
        s += '</g>';
      }
      s += '</svg>';
      return s;
    },

    /* 台阶形格线（Q17）：n 级，每级 2 格宽、逐级向右错 1 格；A 左下、B 右上。
       格线由"每级两个小方格的四条边"推出来 —— test-figs.js 从 data-* 重建格点图再 BFS。 */
    gridpath: function (spec, vars) {
      var n = Math.max(1, Math.min(6, Math.round(num(spec.n, vars) || 3)));
      var u = n <= 3 ? 46 : (n === 4 ? 40 : (n === 5 ? 34 : 29));
      var pad = 26, padTop = 34, i, c;
      var W = Math.round(pad * 2 + (n + 1) * u + 16), H = Math.round(padTop + n * u + pad + 12);
      var seen = {}, lines = [];
      function edge(x1, y1, x2, y2) {
        var k1 = x1 + ',' + y1 + ',' + x2 + ',' + y2, k2 = x2 + ',' + y2 + ',' + x1 + ',' + y1;
        if (seen[k1] || seen[k2]) return;
        seen[k1] = 1;
        lines.push([x1, y1, x2, y2]);
      }
      for (i = 0; i < n; i++) {
        for (c = 0; c < 2; c++) {
          var x0 = i + c, y0 = i;
          edge(x0, y0, x0 + 1, y0);
          edge(x0, y0 + 1, x0 + 1, y0 + 1);
          edge(x0, y0, x0, y0 + 1);
          edge(x0 + 1, y0, x0 + 1, y0 + 1);
        }
      }
      var s = svgOpen(W, H, 'staircase grid of ' + n + ' levels');
      s += '<g data-u="grid" data-n="' + n + '">';
      lines.forEach(function (L) {
        s += '<line data-u="edge" data-x1="' + L[0] + '" data-y1="' + L[1] + '" data-x2="' + L[2] + '" data-y2="' + L[3] +
             '" x1="' + (pad + L[0] * u) + '" y1="' + (padTop + (n - L[1]) * u) + '" x2="' + (pad + L[2] * u) + '" y2="' + (padTop + (n - L[3]) * u) +
             '" stroke="' + INK + '" stroke-width="2"/>';
      });
      s += '</g>';
      s += '<text data-u="pt" data-name="A" data-x="0" data-y="0" x="' + (pad - 16) + '" y="' + (padTop + n * u + 6) + '" font-size="18" font-weight="700" fill="' + RED + '">A</text>';
      s += '<text data-u="pt" data-name="B" data-x="' + (n + 1) + '" data-y="' + n + '" x="' + (pad + (n + 1) * u + 8) + '" y="' + (padTop - 12) + '" font-size="18" font-weight="700" fill="' + BLUE + '">B</text>';
      s += '</svg>';
      return s;
    },

    /* 单个「线段图」（Q19 选项）：
       写法一 segs: ["00-20", …] 直接给线段；
       写法二 tbl: "U"|"A"|"B"|"UM" + i: 下标，从下面的三连表里取 —— 保证选项和主图同源。 */
    segfig: function (spec, vars) {
      var segs = segsOf(spec, vars);
      var u = Math.round(num(spec.u, vars) || 24), pad = 8;
      var W = Math.round(pad * 2 + 2 * u), H = Math.round(pad * 2 + 2 * u);
      var s = svgOpen(W, H, 'figure made of line segments');
      s += '<g data-u="fig" data-segs="' + esc(segs.join(';')) + '">' + segFigInner(segs, pad, pad, u) + '</g>';
      s += '</svg>';
      return s;
    },

    /* 3×3 线段图阵（Q19 主图）：
       写法一 rows: [[fig,fig,fig]…]，fig 为 "00-20;…" 或 null（画「?」）；
       写法二 p0/p1/p2: 三个下标，行 = [A(i), B(i), U(i)]，第三行第三格留空（画「?」）。 */
    figgrid: function (spec, vars) {
      var rows = spec.rows;
      if (!rows) {
        rows = [];
        [spec.p0, spec.p1, spec.p2].forEach(function (p, ri) {
          var t = SEGTRIPLES[modIdx(p, vars, SEGTRIPLES.length)];
          rows.push(ri < 2 ? [t.a, t.b, t.u] : [t.a, t.b, null]);
        });
      }
      var u = Math.round(num(spec.u, vars) || 24), edge = 2 * u, gap = 16, pad = 12;
      var nr = rows.length, nc = 3, i, j;
      var W = Math.round(pad * 2 + nc * edge + (nc - 1) * gap);
      var H = Math.round(pad * 2 + nr * edge + (nr - 1) * gap);
      var s = svgOpen(W, H, 'grid of figures built from line segments');
      for (i = 0; i < nr; i++) {
        for (j = 0; j < nc; j++) {
          var ox = pad + j * (edge + gap), oy = pad + i * (edge + gap);
          var f = (rows[i] || [])[j];
          s += '<rect x="' + (ox - 4) + '" y="' + (oy - 4) + '" width="' + (edge + 8) + '" height="' + (edge + 8) + '" fill="none" stroke="' + GREY + '" stroke-width="1.2"/>';
          if (f) {
            s += '<g data-u="fig" data-r="' + i + '" data-c="' + j + '" data-segs="' + esc(Array.isArray(f) ? f.join(';') : String(f)) + '">' + segFigInner(f, ox, oy, u) + '</g>';
          } else {
            s += '<text data-u="blank" data-r="' + i + '" data-c="' + j + '" x="' + (ox + edge / 2) + '" y="' + (oy + edge / 2 + 11) + '" font-size="30" font-weight="700" text-anchor="middle" fill="#6cbf72">?</text>';
          }
        }
      }
      s += '</svg>';
      return s;
    },

    /* 数正方形（「图中有多少个正方形」题）。
       与普通方格图不同：这里允许**故意缺掉内部线段**，从而改变各尺寸正方形的数目。
       spec.n = 网格边长（n x n 个 1x1 格）
       spec.missH = 缺掉的水平线段，元素为 [row, col]，表示第 row 条水平线（0..n，从上往下）
                   在第 col 列（0..n-1，从左往右）这一小段被擦掉
       spec.missV = 缺掉的竖直线段，元素为 [row, col]，表示第 col 条竖直线（0..n）
                   在第 row 行（0..n-1）这一小段被擦掉
       图上每条线段都写 data-h/data-v 与 data-row/data-col，自检脚本据此独立重算正方形总数：
       一个 k x k 正方形存在 ⇔ 它的 4k 条单位线段全部存在。 */
    squarecount: function (spec, vars) {
      /* 支持矩形网格：cols 列 × rows 行（缺省为正方形 n×n）。
         missH/missV 用「端点坐标索引」：水平线 r 取 0..rows、c 取 0..cols-1；
         竖直线 c 取 0..cols、r 取 0..rows-1。 */
      var cols = Math.max(2, Math.min(6, Math.round(num(spec.cols, vars) || num(spec.n, vars) || 4)));
      var rows = Math.max(2, Math.min(6, Math.round(num(spec.rows, vars) || num(spec.n, vars) || 4)));
      var u = spec.u ? num(spec.u, vars) : 56, pad = 18;
      var W = pad * 2 + cols * u, H = pad * 2 + rows * u;
      /* 缺线支持两种写法：
         (a) 直接给数组：missH: [[r,c],…]（静态图用）
         (b) 给「槽位」标量，便于随变量变化：
             kH 条缺水平线，用 (mH1,mHc1) (mH2,mHc2) … 描述；行索引 -1 表示该槽位不用
             kV 条缺竖线，用 (mV1,mVc1) (mV2,mVc2) … 描述；行索引 -1 表示该槽位不用 */
      var missH = spec.missH || [], missV = spec.missV || [];
      if (!Array.isArray(missH)) missH = [];
      if (!Array.isArray(missV)) missV = [];
      var kH = Math.round(num(spec.kH, vars)), kV = Math.round(num(spec.kV, vars));
      var si;
      for (si = 1; si <= kH; si++) {
        var hr = Math.round(num(spec['mH' + si], vars));
        var hc = Math.round(num(spec['mHc' + si], vars));
        if (hr >= 0 && hr <= rows && hc >= 0 && hc < cols) missH = missH.concat([[hr, hc]]);
      }
      for (si = 1; si <= kV; si++) {
        var vr2 = Math.round(num(spec['mV' + si], vars));
        var vc2 = Math.round(num(spec['mVc' + si], vars));
        if (vr2 >= 0 && vr2 < rows && vc2 >= 0 && vc2 <= cols) missV = missV.concat([[vr2, vc2]]);
      }
      function hMissing(r, c) { return missH.some(function (m) { return m[0] === r && m[1] === c; }); }
      function vMissing(r, c) { return missV.some(function (m) { return m[0] === r && m[1] === c; }); }
      var s = svgOpen(W, H, 'grid figure for counting squares');
      s += '<g data-u="sqgrid" data-n="' + Math.max(cols, rows) + '" data-cols="' + cols + '" data-rows="' + rows + '">';
      var r, c;
      /* 水平线段：第 r 条线（0..rows），第 c 段（0..cols-1） */
      for (r = 0; r <= rows; r++) {
        for (c = 0; c < cols; c++) {
          if (hMissing(r, c)) continue;
          s += '<line data-h="1" data-row="' + r + '" data-col="' + c + '" x1="' + (pad + c * u) + '" y1="' + (pad + r * u) +
               '" x2="' + (pad + (c + 1) * u) + '" y2="' + (pad + r * u) + '" stroke="' + INK + '" stroke-width="2"/>';
        }
      }
      /* 竖直线段：第 c 条线（0..cols），第 r 段（0..rows-1） */
      for (c = 0; c <= cols; c++) {
        for (r = 0; r < rows; r++) {
          if (vMissing(r, c)) continue;
          s += '<line data-v="1" data-row="' + r + '" data-col="' + c + '" x1="' + (pad + c * u) + '" y1="' + (pad + r * u) +
               '" x2="' + (pad + c * u) + '" y2="' + (pad + (r + 1) * u) + '" stroke="' + INK + '" stroke-width="2"/>';
        }
      }
      s += '</g>';
      s += '</svg>';
      return s;
    },

    /* 数三角形（Q20）：A(0,1) 左下、B(0.5,0) 顶、C(1,1) 右下；
       从 A 向对边 BC 引 j 条分割线（把 BC 等分成 j+1 段），extra=1 时再从 AB 中点连到 C。 */
    trilines: function (spec, vars) {
      var j = Math.max(1, Math.min(6, Math.round(num(spec.j, vars) || 3)));
      var extra = Math.round(num(spec.extra, vars));
      var W = 480, H = 300, padX = 40, padY = 18, i;
      function SX(x) { return (padX + x * (W - padX * 2)).toFixed(2); }
      function SY(y) { return (padY + (1 - y) * (H - padY * 2)).toFixed(2); }
      var A = [0, 1], B = [0.5, 0], C = [1, 1];
      var s = svgOpen(W, H, 'triangle with internal lines');
      s += '<g data-u="tri" data-j="' + j + '" data-extra="' + extra + '">';
      function seg(p, q, kind) {
        s += '<line data-u="line" data-kind="' + kind + '" data-x1="' + p[0] + '" data-y1="' + p[1] + '" data-x2="' + q[0] + '" data-y2="' + q[1] +
             '" x1="' + SX(p[0]) + '" y1="' + SY(p[1]) + '" x2="' + SX(q[0]) + '" y2="' + SY(q[1]) + '" stroke="' + INK + '" stroke-width="2.2"/>';
      }
      seg(A, B, 'side');
      seg(B, C, 'side');
      seg(C, A, 'side');
      for (i = 1; i <= j; i++) {
        var t = i / (j + 1);
        seg(A, [B[0] + t * (C[0] - B[0]), B[1] + t * (C[1] - B[1])], 'div');
      }
      if (extra) seg([(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], C, 'extra');
      s += '</g>';
      s += '</svg>';
      return s;
    }
  };

  /* 天平一边的内容签名（自检脚本据此独立核对"两边是否等价"；数量要**求值**，
     否则 data-side 里留下的是变量名，脚本没法独立重算） */
  function itemsKey(items, vars) {
    return (items || []).map(function (it) { return it[0] + ':' + Math.round(num(it[1], vars)); }).join('+');
  }

  /* ==========================================================================
   * Book 1（Mastering Mathematics Selective & Scholarship）新增图元
   * ========================================================================== */
  var TYPES6 = {

    /* 三角形：已知面积 A，图上只标面积与底边，不标高（高由学生算） */
    triangleareagiven: function (spec, vars) {
      var A = Math.max(4, Math.round(num(spec.A, vars)));
      var W = 420, H = 250, x0 = 70, x1 = 350, yb = 200, yt = 60;
      var s = svgOpen(W, H, 'triangle with area ' + A + ' square centimetres');
      s += '<polygon points="' + x0 + ',' + yb + ' ' + x1 + ',' + yb + ' 190,' + yt +
           '" fill="none" stroke="' + INK + '" stroke-width="2.5"/>';
      /* 底边直角标记 */
      s += '<polyline points="' + (x1 - 26) + ',' + yb + ' ' + (x1 - 26) + ',' + (yb - 26) + ' ' + x1 + ',' + (yb - 26) +
           '" fill="none" stroke="' + INK + '" stroke-width="1.5" opacity="0.5"/>';
      s += '<line x1="190" y1="' + yt + '" x2="190" y2="' + yb + '" stroke="' + GREY + '" stroke-dasharray="6 5" stroke-width="1.5"/>';
      s += '<text x="200" y="' + (yt + 52) + '" font-size="17" fill="' + INK + '">h</text>';
      s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (yb + 28) + '" font-size="17" text-anchor="middle" fill="' + INK + '">base</text>';
      s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (yb + 56) + '" font-size="17" text-anchor="middle" fill="' + RED + '">Area = ' + A + ' cm&#178;</text>';
      s += '</svg>';
      return s;
    },

    /* 平行四边形：中心分割线把图形分成 P1 / P2（面积必相等） */
    parabiset: function (spec, vars) {
      var W = 400, H = 240, ox = 60, oy = 60, w = 220, h = 140, sk = 70;
      var A = [ox + sk, oy], B = [ox + sk + w, oy], C = [ox + w, oy + h], D = [ox, oy + h];
      var s = svgOpen(W, H, 'parallelogram split into P1 and P2');
      s += '<polygon points="' + A.join(',') + ' ' + B.join(',') + ' ' + C.join(',') + ' ' + D.join(',') +
           '" fill="none" stroke="' + INK + '" stroke-width="2.5"/>';
      /* 过中心的分割线：取 AD 中点与 BC 中点 */
      var mid = function (p, q) { return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; };
      var P = mid(A, B), Q = mid(D, C);
      s += '<line x1="' + P[0] + '" y1="' + P[1] + '" x2="' + Q[0] + '" y2="' + Q[1] + '" stroke="' + RED + '" stroke-width="2.5"/>';
      s += '<text x="' + (P[0] + 8) + '" y="' + (P[1] - 10) + '" font-size="18" fill="' + RED + '">P1</text>';
      s += '<text x="' + (Q[0] - 30) + '" y="' + (Q[1] - 10) + '" font-size="18" fill="' + BLUE + '">P2</text>';
      s += '<circle cx="' + (A[0] + C[0]) / 2 + '" cy="' + (A[1] + C[1]) / 2 + '" r="3.5" fill="' + INK + '"/>';
      s += '</svg>';
      return s;
    },

    /* 正方形四角各剪去边长 s 的小正方形
       ★ 只标「题干提及的数」：大正方形边长 S（顶）、小正方形边长 c（标在小正方形
         底边正下方、紧贴那条边，一眼看出是小正方形的边长）。
         ★ 绝不标 S−c 之类的中间量——那是留给考生自己算的（用户明确要求） */
    cornercut: function (spec, vars) {
      var S = Math.max(3, Math.round(num(spec.S, vars)));
      var s0 = Math.max(1, Math.round(num(spec.c !== undefined ? spec.c : spec.s, vars)));
      var W = 360, H = 300, x0 = 50, y0 = 40, size = 220, px = size / S, k = s0 * px;
      var s = svgOpen(W, H, 'square of side ' + S + ' with four corners of side ' + s0 + ' removed');
      /* 外框（虚线，原大正方形） */
      s += '<rect x="' + x0 + '" y="' + y0 + '" width="' + size + '" height="' + size +
           '" fill="none" stroke="' + GREY + '" stroke-width="1.5" stroke-dasharray="6 5"/>';
      /* 阴影十字形 */
      var pts = [
        [x0 + k, y0], [x0 + size - k, y0], [x0 + size - k, y0 + k], [x0 + size, y0 + k],
        [x0 + size, y0 + size - k], [x0 + size - k, y0 + size - k], [x0 + size - k, y0 + size],
        [x0 + k, y0 + size], [x0 + k, y0 + size - k], [x0, y0 + size - k],
        [x0, y0 + k], [x0 + k, y0 + k]
      ];
      s += '<polygon points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') +
           '" fill="#5b9bd5" fill-opacity="0.55" stroke="' + INK + '" stroke-width="2"/>';
      /* 四个被剪掉的小正方形：用虚线勾出 */
      [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (c) {
        var cx = x0 + c[0] * (size - k), cy = y0 + c[1] * (size - k);
        s += '<rect x="' + cx + '" y="' + cy + '" width="' + k + '" height="' + k +
             '" fill="#ffffff" stroke="' + GREY + '" stroke-width="1.2" stroke-dasharray="4 4"/>';
      });
      /* 标注一：大正方形边长 S（顶部，带端点箭头线） */
      s += '<line x1="' + x0 + '" y1="' + (y0 - 16) + '" x2="' + (x0 + size) + '" y2="' + (y0 - 16) + '" stroke="' + INK + '" stroke-width="1.2"/>';
      s += '<line x1="' + x0 + '" y1="' + (y0 - 21) + '" x2="' + x0 + '" y2="' + (y0 - 11) + '" stroke="' + INK + '" stroke-width="1.2"/>';
      s += '<line x1="' + (x0 + size) + '" y1="' + (y0 - 21) + '" x2="' + (x0 + size) + '" y2="' + (y0 - 11) + '" stroke="' + INK + '" stroke-width="1.2"/>';
      s += '<text x="' + (x0 + size / 2) + '" y="' + (y0 - 22) + '" font-size="17" text-anchor="middle" fill="' + INK + '">' + S + ' cm</text>';
      /* 标注二：小正方形边长 c —— 紧贴右下角小正方形的底边正下方（一眼看出量的是这条边） */
      var bx = x0 + (size - k), by = y0 + size;
      s += '<line x1="' + bx + '" y1="' + (by + 12) + '" x2="' + (bx + k) + '" y2="' + (by + 12) + '" stroke="' + INK + '" stroke-width="1.2"/>';
      s += '<line x1="' + bx + '" y1="' + (by + 7) + '" x2="' + bx + '" y2="' + (by + 17) + '" stroke="' + INK + '" stroke-width="1.2"/>';
      s += '<line x1="' + (bx + k) + '" y1="' + (by + 7) + '" x2="' + (bx + k) + '" y2="' + (by + 17) + '" stroke="' + INK + '" stroke-width="1.2"/>';
      s += '<text x="' + (bx + k / 2) + '" y="' + (by + 30) + '" font-size="15" text-anchor="middle" fill="' + INK + '">' + s0 + ' cm</text>';
      s += '</svg>';
      return s;
    },

    /* 三圆韦恩图（岗位 / 集合）
       ★ 区域字母 W/X/Y/Z 必须画在图上（原卷就有）：
         X = 左圆∩右圆（仅这两个）· W = 左圆∩下圆 · Z = 右圆∩下圆 · Y = 三者交集
       ★ 圆的标签可随变量变（labels 里写 {占位符}，由 strSpec 解析）
       ★ 不画任何「答案点」——原卷图上只有字母，答案靠学生自己读 */
    venn3: function (spec, vars) {
      var W = 420, H = 300;
      var lab = strSpec(spec.labels, vars).split(',');
      if (lab.length < 3) lab = ['S', 'C', 'D'];
      var r = 78, cx = [170, 250, 210], cy = [110, 110, 178];
      var s = svgOpen(W, H, 'three-circle Venn diagram with regions W X Y Z');
      s += '<circle cx="' + cx[0] + '" cy="' + cy[0] + '" r="' + r + '" fill="#5b9bd5" fill-opacity="0.22" stroke="' + INK + '" stroke-width="2"/>';
      s += '<circle cx="' + cx[1] + '" cy="' + cy[1] + '" r="' + r + '" fill="#e5484d" fill-opacity="0.18" stroke="' + INK + '" stroke-width="2"/>';
      s += '<circle cx="' + cx[2] + '" cy="' + cy[2] + '" r="' + r + '" fill="#2ea043" fill-opacity="0.20" stroke="' + INK + '" stroke-width="2"/>';
      s += '<text x="' + (cx[0] - 46) + '" y="' + (cy[0] - 46) + '" font-size="17" font-weight="bold" fill="' + INK + '">' + esc(lab[0]) + '</text>';
      s += '<text x="' + (cx[1] + 30) + '" y="' + (cy[1] - 46) + '" font-size="17" font-weight="bold" fill="' + INK + '">' + esc(lab[1]) + '</text>';
      s += '<text x="' + (cx[2]) + '" y="' + (cy[2] + 66) + '" font-size="17" font-weight="bold" text-anchor="middle" fill="' + INK + '">' + esc(lab[2]) + '</text>';
      /* 四个区域字母（位置都验算过：落在对应交集内、且不在第三个圆里） */
      var regions = [['X', 210, 82], ['W', 148, 163], ['Z', 272, 163], ['Y', 210, 140]];
      regions.forEach(function (rg) {
        s += '<text x="' + rg[1] + '" y="' + rg[2] + '" font-size="18" font-weight="bold" text-anchor="middle" fill="' + INK + '">' + esc(rg[0]) + '</text>';
      });
      s += '</svg>';
      return s;
    },

    /* 一面靠墙（房子）的长方形花园：画房子 + 花园 + 「?」长度标记。
       ★ 图上绝不标数值 —— 长度正是题目要求的答案，标出来就泄题了（原卷只画 ?） */
    gardenfence: function (spec, vars) {
      var L = Math.max(4, Math.round(num(spec.L, vars)));
      var Wd = Math.max(2, Math.round(num(spec.W, vars)));
      var maxW = 300, maxH = 150;
      var scale = Math.min(maxW / L, maxH / Wd);
      var w = L * scale, h = Wd * scale;
      var x0 = (440 - w) / 2, y0 = 110;
      var s = svgOpen(440, y0 + h + 78, 'rectangular garden beside a house, one side not fenced');
      /* 房子（上边 = 不用围的那一侧） */
      s += '<rect x="' + x0 + '" y="' + (y0 - 46) + '" width="' + w + '" height="42" fill="#7da7d9" stroke="' + INK + '" stroke-width="1.5"/>';
      s += '<polygon points="' + x0 + ',' + (y0 - 46) + ' ' + (x0 + 18) + ',' + (y0 - 64) + ' ' + (x0 + w - 18) + ',' + (y0 - 64) + ' ' + (x0 + w) + ',' + (y0 - 46) +
           '" fill="#5d88bd" stroke="' + INK + '" stroke-width="1.5"/>';
      s += '<text x="' + (x0 + w / 2) + '" y="' + (y0 - 19) + '" font-size="16" font-weight="bold" text-anchor="middle" fill="#ffffff">House</text>';
      /* 花园：与房子共边（墙侧不画篱笆），三边篱笆就是这条虚线边框本身——
         ★ 不加等分格短线（用户明确要求，原卷也没有） */
      s += '<rect x="' + x0 + '" y="' + y0 + '" width="' + w + '" height="' + h + '" fill="#d9f2d0" stroke="' + GREEN + '" stroke-width="2.5" stroke-dasharray="7 5"/>';
      s += '<text x="' + (x0 + w / 2) + '" y="' + (y0 + h / 2 + 6) + '" font-size="16" font-weight="bold" text-anchor="middle" fill="' + GREEN + '">Garden</text>';
      /* 长度用「?」标注（原卷样式） */
      var ay = y0 + h + 34;
      s += '<line x1="' + x0 + '" y1="' + ay + '" x2="' + (x0 + w) + '" y2="' + ay + '" stroke="' + INK + '" stroke-width="1.5"/>';
      s += '<polygon points="' + x0 + ',' + ay + ' ' + (x0 + 10) + ',' + (ay - 5) + ' ' + (x0 + 10) + ',' + (ay + 5) + '" fill="' + INK + '"/>';
      s += '<polygon points="' + (x0 + w) + ',' + ay + ' ' + (x0 + w - 10) + ',' + (ay - 5) + ' ' + (x0 + w - 10) + ',' + (ay + 5) + '" fill="' + INK + '"/>';
      s += '<text x="' + (x0 + w / 2) + '" y="' + (ay + 22) + '" font-size="17" font-weight="bold" text-anchor="middle" fill="' + INK + '">?</text>';
      s += '</svg>';
      return s;
    },

    /* 菱形/平行四边形 ABCD + 对角线 BD，标出 AB 与 BD 的倍数关系 */
    rhombustri: function (spec, vars) {
      var A = Math.max(8, Math.round(num(spec.A, vars)));
      var W = 420, H = 280;
      var B = [110, 60], D = [250, 60], C = [330, 220], Aa = [190, 220];
      var s = svgOpen(W, H, 'two identical triangles ABD and BCD with common diagonal BD');
      s += '<polygon points="' + Aa.join(',') + ' ' + B.join(',') + ' ' + D.join(',') +
           '" fill="#5b9bd5" fill-opacity="0.30" stroke="' + INK + '" stroke-width="2.5"/>';
      s += '<polygon points="' + D.join(',') + ' ' + B.join(',') + ' ' + C.join(',') +
           '" fill="#e5484d" fill-opacity="0.20" stroke="' + INK + '" stroke-width="2.5"/>';
      /* 对角线 BD */
      s += '<line x1="' + B[0] + '" y1="' + B[1] + '" x2="' + D[0] + '" y2="' + D[1] + '" stroke="' + INK + '" stroke-width="2"/>';
      /* 直角标记在 A 处（BD 为底，高 = AB） */
      s += '<text x="' + (Aa[0] - 6) + '" y="' + (Aa[1] - 12) + '" font-size="17" font-weight="bold" fill="' + INK + '">A</text>';
      s += '<text x="' + (B[0] - 22) + '" y="' + (B[1] - 8) + '" font-size="17" font-weight="bold" fill="' + INK + '">B</text>';
      s += '<text x="' + (D[0] + 10) + '" y="' + (D[1] - 8) + '" font-size="17" font-weight="bold" fill="' + INK + '">D</text>';
      s += '<text x="' + (C[0] + 8) + '" y="' + (C[1] + 8) + '" font-size="17" font-weight="bold" fill="' + INK + '">C</text>';
      s += '<text x="' + ((Aa[0] + B[0]) / 2 - 30) + '" y="' + ((Aa[1] + B[1]) / 2) + '" font-size="15" fill="' + RED + '">AB</text>';
      s += '<text x="' + ((B[0] + D[0]) / 2) + '" y="' + (B[1] - 12) + '" font-size="15" text-anchor="middle" fill="' + BLUE + '">BD</text>';
      s += '<text x="210" y="' + (H - 22) + '" font-size="16" text-anchor="middle" fill="' + INK + '">AB = &#189; BD    Total area = ' + A + ' cm&#178;</text>';
      s += '</svg>';
      return s;
    },

    /* 方格街道 + S/F + 四条长度严格递增的路径（Q33 专用，v3 · 四走廊设计）。
       ★ 用户要求：路线必须**严格走在格线上**（v2 的 dy 平行偏移让线飘离格线，被否）。
       v3 设计——四条路线各走一条水平走廊，只在左列/右列少量共享：
         红（位0，最短）：底行(第0行) → 右列，长 m+n，无绕行
         蓝（位1）：先上 1 格走第 1 行走廊，绕 1 个街区(+2)，长 m+n+2
         绿（位2）：先上 2 格走第 2 行走廊，绕 2 个街区(+4)，长 m+n+4
         橙（位3）：先上 3 格走第 3 行走廊，绕 3 个街区(+6)，长 m+n+6
       绕街区 = (c,k)→(c,k+1)→(c+1,k+1)→(c+1,k) 向上凸一格（+2）。
       蓝凸起在列 3、绿在列 1 和 4、橙在列 1/3/5（同路线凸起隔 2 列避免重复边）。
       绿色方块 = 街区（原卷样式），路线画在方块之间的白色街道格线上。
       字母钉在各自凸起内（红无凸起，钉在底行上方第 0 行街区中央），互不重叠。
       需 m ≥ 7（橙三个凸起占列 1..6 且不触右列）、n ≥ 5（橙走廊行 3，凸起到行 4）。 */
    gridroutes: function (spec, vars) {
      var m = Math.max(7, Math.min(8, Math.round(num(spec.m, vars))));
      var n = Math.max(5, Math.min(8, Math.round(num(spec.n, vars))));
      var kids = strSpec(spec.kids, vars).split(',').map(function (x) { return x.trim(); });
      var c = 46, x0 = 42, YB = 40;                 /* YB = 底行(y=0)的屏幕 y */
      var W = x0 * 2 + m * c, H = YB + n * c + 34;

      /* 数学坐标 → 屏幕：gy=0 是底行，向上递增 */
      function P(gx, gy) { return [x0 + gx * c, YB + (n - gy) * c]; }

      /* 走廊路径：沿左列上到 k 层，沿第 k 行向右（含凸起），最后沿右列上到 F */
      function corridor(k, bumps) {
        var pts = [[0, 0], [0, k]];
        for (var i = 0; i < bumps.length; i++) {
          var bc = bumps[i];
          pts.push([bc, k], [bc, k + 1], [bc + 1, k + 1], [bc + 1, k]);   /* 绕一格街区 +2 */
        }
        pts.push([m, k], [m, n]);
        return pts;
      }
      var paths = [
        corridor(0, []),          /* 红：底行，无绕行 */
        corridor(1, [3]),         /* 蓝 */
        corridor(2, [1, 4]),      /* 绿 */
        corridor(3, [1, 3, 5])    /* 橙 */
      ];

      var s = svgOpen(W, H, 'street grid from S to F with four routes on the grid lines');
      /* 绿色街区（原卷样式）：格子间留白色街道缝，路线画在缝的格线上 */
      for (var gi = 0; gi < m; gi++) {
        for (var gj = 0; gj < n; gj++) {
          var tl = P(gi, gj + 1);
          s += '<rect x="' + (tl[0] + 3.5) + '" y="' + (tl[1] + 3.5) + '" width="' + (c - 7) + '" height="' + (c - 7) +
               '" rx="3" fill="#a5d6a7" stroke="#7fbf82" stroke-width="1"/>';
        }
      }
      /* 路线（先画长的，短线盖在上层：红最短最后画最清晰） */
      var cols = [RED, BLUE, GREEN, '#d97706'];
      [3, 2, 1, 0].forEach(function (k) {
        var d = paths[k].map(function (pt, t) {
          var p = P(pt[0], pt[1]);
          return (t ? 'L' : 'M') + p[0] + ',' + p[1];
        }).join(' ');
        s += '<path data-u="route" d="' + d + '" fill="none" stroke="' + cols[k] +
             '" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>';
      });
      /* 名字首字母钉在各自凸起内（红钉在底行上方第 0 行街区中央） */
      var letterAt = [
        P(m / 2, 0.5),
        P(3.5, 1.5),
        P(1.5, 2.5),
        P(1.5, 3.5)
      ];
      letterAt.forEach(function (lp, k) {
        var name = kids[k] || 'ABCD'[k];
        s += '<text x="' + lp[0].toFixed(1) + '" y="' + (lp[1] + 5).toFixed(1) + '" font-size="15" font-weight="bold" text-anchor="middle" fill="' + cols[k] +
             '" stroke="#ffffff" stroke-width="4" paint-order="stroke">' + esc(name.charAt(0).toUpperCase()) + '</text>';
      });
      /* S（左下，蓝点）与 F（右上，原卷星形） */
      var sp = P(0, 0), fp = P(m, n);
      s += '<circle cx="' + sp[0] + '" cy="' + sp[1] + '" r="7" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="1.5"/>';
      s += '<text x="' + (sp[0] - 10) + '" y="' + (sp[1] + 24) + '" font-size="17" font-weight="bold" fill="' + INK + '">S</text>';
      var star = '';
      for (var si = 0; si < 10; si++) {
        var ang = -Math.PI / 2 + si * Math.PI / 5, rr = (si % 2 === 0) ? 11 : 4.8;
        star += (fp[0] + rr * Math.cos(ang)).toFixed(1) + ',' + (fp[1] + rr * Math.sin(ang)).toFixed(1) + ' ';
      }
      s += '<polygon points="' + star + '" fill="' + INK + '"/>';
      s += '<text x="' + (fp[0] + 14) + '" y="' + (fp[1] + 6) + '" font-size="17" font-weight="bold" fill="' + INK + '">F</text>';
      s += '</svg>';
      return s;
    }
  };

  /* ==========================================================================
   * Book 1 · TEST 2 新增图元（TYPES7）
   * ========================================================================== */
  var TYPES7 = {

    /* 九宫格去掉中心：k×k 网格，四角的对角各切掉半个中心格，形成八角形
       data-u="cell" 标出每个存活的小格；data-u="hole" 标出被挖掉的中心格 */
    octagon9: function (spec, vars) {
      var k = Math.max(3, Math.min(5, Math.round(num(spec.k, vars) || 3)));
      var cell = k <= 3 ? 54 : 40, pad = 22, i, j;
      var W = pad * 2 + k * cell, H = pad * 2 + k * cell;
      var s = svgOpen(W, H, 'square cut into ' + k + ' by ' + k + ' with the middle removed');
      /* 网格线 */
      for (i = 0; i <= k; i++) {
        s += '<line x1="' + (pad + i * cell) + '" y1="' + pad + '" x2="' + (pad + i * cell) + '" y2="' + (pad + k * cell) + '" stroke="' + GREY + '" stroke-width="1.2"/>';
        s += '<line x1="' + pad + '" y1="' + (pad + i * cell) + '" x2="' + (pad + k * cell) + '" y2="' + (pad + i * cell) + '" stroke="' + GREY + '" stroke-width="1.2"/>';
      }
      /* 每个存活小格填浅色（除中心格外全部保留 —— 原图就是挖掉中心、
         并且把与该格相邻的四条边的中点连成八角形轮廓） */
      for (i = 0; i < k; i++) {
        for (j = 0; j < k; j++) {
          var isHole = (i === (k - 1) / 2 && j === (k - 1) / 2);
          if (k % 2 === 0) continue;
          s += '<rect data-u="cell" data-r="' + i + '" data-c="' + j + '" x="' + (pad + j * cell) + '" y="' + (pad + i * cell) +
               '" width="' + cell + '" height="' + cell + '" fill="' + (isHole ? '#ffffff' : '#dbeafe') + '" fill-opacity="' +
               (isHole ? '1' : '0.75') + '"/>';
        }
      }
      /* 八角形轮廓：四条边的中点依次相连 */
      if (k % 2 === 1) {
        var mid = (k - 1) / 2;
        var c0 = pad, c1 = pad + k * cell, mc0 = pad + (mid + 0.5) * cell;
        var pts = [[mc0, c0], [c1, c0], [c1, mc0], [c1, c1], [mc0, c1], [c0, c1], [c0, mc0], [c0, c0]];
        s += '<polygon data-u="oct" points="' + pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' ') +
             '" fill="none" stroke="' + INK + '" stroke-width="2.6"/>';
        s += '<rect data-u="hole" x="' + (pad + mid * cell) + '" y="' + (pad + mid * cell) + '" width="' + cell + '" height="' + cell +
             '" fill="' + '#ffffff' + '" stroke="' + INK + '" stroke-width="2"/>';
      }
      s += '<rect x="' + pad + '" y="' + pad + '" width="' + (k * cell) + '" height="' + (k * cell) + '" fill="none" stroke="' + INK + '" stroke-width="2.4"/>';
      s += '</svg>';
      return s;
    },

    /* 平均分条带：左段 n1 场均值 a1，右段 n2 场均值 a2；只画段长比例与两个均值
       （图里不写最终答案，答案靠算） */
    avgstrip: function (spec, vars) {
      var n1 = Math.max(1, Math.round(num(spec.n1, vars) || 15));
      var n2 = Math.max(1, Math.round(num(spec.n2, vars) || 5));
      var a1 = Math.round(num(spec.a1, vars) || 17);
      var a2 = Math.round(num(spec.a2, vars) || 21);
      var W = 470, H = 150, x0 = 45, y = 74, h = 34;
      var unit = Math.min(22, (W - x0 * 2) / (n1 + n2));
      var w1 = n1 * unit, w2 = n2 * unit;
      var s = svgOpen(W, H, 'strip showing ' + n1 + ' games at average ' + a1 + ' and ' + n2 + ' games at average ' + a2);
      s += '<rect data-u="seg" data-games="' + n1 + '" data-avg="' + a1 + '" x="' + x0 + '" y="' + y + '" width="' + w1.toFixed(1) + '" height="' + h +
           '" fill="#dbeafe" stroke="' + INK + '" stroke-width="2"/>';
      s += '<rect data-u="seg" data-games="' + n2 + '" data-avg="' + a2 + '" x="' + (x0 + w1).toFixed(1) + '" y="' + y + '" width="' + w2.toFixed(1) + '" height="' + h +
           '" fill="#fde68a" stroke="' + INK + '" stroke-width="2"/>';
      s += '<text x="' + (x0 + w1 / 2).toFixed(1) + '" y="' + (y + h / 2 + 6) + '" font-size="15" text-anchor="middle" fill="' + INK + '">' + n1 + ' games</text>';
      s += '<text x="' + (x0 + w1 + w2 / 2).toFixed(1) + '" y="' + (y + h / 2 + 6) + '" font-size="15" text-anchor="middle" fill="' + INK + '">' + n2 + ' games</text>';
      s += '<text x="' + (x0 + w1 / 2).toFixed(1) + '" y="' + (y + h + 24) + '" font-size="15" text-anchor="middle" fill="' + INK + '">average ' + a1 + '</text>';
      s += '<text x="' + (x0 + w1 + w2 / 2).toFixed(1) + '" y="' + (y + h + 24) + '" font-size="15" text-anchor="middle" fill="' + INK + '">average ' + a2 + '</text>';
      s += '<text x="' + (x0 + w1 + w2 / 2).toFixed(1) + '" y="30" font-size="15" text-anchor="middle" fill="' + INK + '">average of all ' + (n1 + n2) + ' games = ?</text>';
      s += '</svg>';
      return s;
    },

    /* 方位点阵：N 在上，C 在 N 正下方，S 在 C 左下方；另标一个 SW 参考点
       （原卷就有 SW 标注，保留原词） */
    compasspts: function (spec, vars) {
      var W = 380, H = 290, cx = 205, cy = 120;
      var s = svgOpen(W, H, 'compass diagram with points N, C, S and SW');
      /* 指北针小图 */
      s += '<circle cx="46" cy="46" r="24" fill="#f8fafc" stroke="' + INK + '" stroke-width="1.6"/>';
      s += '<polygon points="46,24 51,46 46,68 41,46" fill="' + RED + '"/>';
      s += '<text x="46" y="16" font-size="14" text-anchor="middle" fill="' + INK + '">N</text>';
      /* 四个点：N 在 C 正上方；S 在 C 左下方；SW 在最左下作为参照 */
      var pN = [cx, cy - 78], pC = [cx, cy + 24], pS = [cx - 76, cy + 96], pSW = [cx - 140, cy + 150];
      s += '<line x1="' + pN[0] + '" y1="' + pN[1] + '" x2="' + pC[0] + '" y2="' + pC[1] + '" stroke="' + GREY + '" stroke-width="1.6" stroke-dasharray="5 4"/>';
      s += '<line x1="' + pS[0] + '" y1="' + pS[1] + '" x2="' + pC[0] + '" y2="' + pC[1] + '" stroke="' + GREY + '" stroke-width="1.6" stroke-dasharray="5 4"/>';
      [[pN, 'N'], [pC, 'C'], [pS, 'S'], [pSW, 'SW']].forEach(function (e) {
        s += '<circle data-u="pt" data-label="' + e[1] + '" cx="' + e[0][0] + '" cy="' + e[0][1] + '" r="7" fill="' + (e[1] === 'C' ? RED : INK) + '"/>';
        s += '<text x="' + (e[0][0] + (e[1] === 'S' || e[1] === 'SW' ? -24 : 14)) + '" y="' + (e[0][1] + 6) +
             '" font-size="17" font-weight="bold" fill="' + INK + '">' + e[1] + '</text>';
      });
      /* 方向十字 */
      s += '<line x1="' + (cx - 168) + '" y1="' + cy + '" x2="' + (cx + 150) + '" y2="' + cy + '" stroke="' + GREY + '" stroke-width="1" opacity="0.55"/>';
      s += '<line x1="' + cx + '" y1="' + (cy - 130) + '" x2="' + cx + '" y2="' + (cy + 176) + '" stroke="' + GREY + '" stroke-width="1" opacity="0.55"/>';
      s += '</svg>';
      return s;
    },

    /* L 形（阶梯状）多边形：宽 W、左侧高 HL、右侧高 HR，所有转角为直角
       data-u="dim" 标出三个尺寸；顶点数固定为 6（5 个直角 + 1 个凹角 270°） */
    lshape: function (spec, vars) {
      var Wm = num(spec.W, vars), HL = num(spec.HL, vars), HR = num(spec.HR, vars);
      var maxV = Math.max(HL, HR), u = 190 / maxV;
      var w = Wm * u, hl = HL * u, hr = HR * u;
      var x0 = 66, yb = 246, padR = 60, padT = 34;
      var SX0 = x0, SX1 = x0 + w, SYb = yb, SYt = yb - hr, SYs = yb - hl;
      var W = Math.round(SX1 + padR), H = Math.round(padT + hr + 66);
      var pts = [[SX0, SYb], [SX1, SYb], [SX1, SYt], [SX1 - w * 0.42, SYt], [SX1 - w * 0.42, SYs], [SX0, SYs]];
      var s = svgOpen(W, H, 'L shaped playground, all corners right angles');
      s += '<polygon data-u="shape" data-corners="6" points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') +
           '" fill="#bbf7d0" fill-opacity="0.75" stroke="' + INK + '" stroke-width="2.2"/>';
      /* 直角标记（每个角画个小方块） */
      var cornerIdx = [0, 1, 2, 4, 5];
      cornerIdx.forEach(function (ci) {
        var p = pts[ci], a = pts[(ci + 5) % 6], b = pts[(ci + 1) % 6], d = 11;
        var u1 = norm([a[0] - p[0], a[1] - p[1]]), u2 = norm([b[0] - p[0], b[1] - p[1]]);
        if (!u1 || !u2) return;
        var q1 = [p[0] + u1[0] * d, p[1] + u1[1] * d], q2 = [p[0] + u2[0] * d, p[1] + u2[1] * d];
        s += '<polyline data-u="rightangle" points="' + q1[0].toFixed(1) + ',' + q1[1].toFixed(1) + ' ' +
             (q1[0] + u2[0] * d).toFixed(1) + ',' + (q1[1] + u2[1] * d).toFixed(1) + ' ' +
             q2[0].toFixed(1) + ',' + q2[1].toFixed(1) + '" fill="none" stroke="' + INK + '" stroke-width="1.6"/>';
      });
      /* 尺寸标注 */
      s += '<text data-u="dim" data-d="W" x="' + ((SX0 + SX1) / 2).toFixed(1) + '" y="' + (SYb + 24) + '" font-size="14" text-anchor="middle" fill="' + INK + '">' + fmt(Wm) + ' m</text>';
      s += '<text data-u="dim" data-d="HL" x="' + (SX0 - 10) + '" y="' + ((SYs + SYb) / 2 + 5).toFixed(1) + '" font-size="14" text-anchor="end" fill="' + INK + '">' + fmt(HL) + ' m</text>';
      s += '<text data-u="dim" data-d="HR" x="' + (SX1 + 10) + '" y="' + ((SYt + SYb) / 2 + 5).toFixed(1) + '" font-size="14" fill="' + INK + '">' + fmt(HR) + ' m</text>';
      s += '</svg>';
      return s;
    },

    /* 折线统计图：横轴 1..6 天，纵轴 Number of PUPILS
       data-u="pt" 逐个标出 (天数, 人数)，图上的高度由 data-v 给出 */
    linegraph: function (spec, vars) {
      var vs = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'].map(function (k) { return Math.round(num(spec[k], vars)); });
      var x0 = 74, x1 = 372, y0 = 250, y1 = 40, i;
      var top = Math.max.apply(null, vs.concat([10]));
      var step = Math.ceil(top / 5);
      var maxV = step * 5;
      var W = 430, H = 300;
      var s = svgOpen(W, H, 'line graph of pupils against days absent');
      /* 轴 */
      s += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y0 + '" stroke="' + INK + '" stroke-width="2"/>';
      s += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x0 + '" y2="' + y1 + '" stroke="' + INK + '" stroke-width="2"/>';
      for (i = 0; i <= 5; i++) {
        var gy = y0 - (y0 - y1) * i / 5, gv = maxV * i / 5;
        s += '<line x1="' + x0 + '" y1="' + gy.toFixed(1) + '" x2="' + x1 + '" y2="' + gy.toFixed(1) + '" stroke="' + GREY + '" stroke-width="1"/>';
        s += '<text x="' + (x0 - 10) + '" y="' + (gy + 5).toFixed(1) + '" font-size="13" text-anchor="end" fill="' + INK + '">' + gv + '</text>';
      }
      var X = function (d) { return (x0 + (x1 - x0) * d / 7).toFixed(1); };
      var Y = function (v) { return (y0 - (y0 - y1) * v / maxV).toFixed(1); };
      var dpath = vs.map(function (v, k) { return (k ? 'L' : 'M') + X(k + 1) + ',' + Y(v); }).join(' ');
      s += '<path data-u="line" data-series="' + vs.join(',') + '" d="' + dpath + '" fill="none" stroke="#9f1239" stroke-width="2.4"/>';
      vs.forEach(function (v, k) {
        s += '<circle data-u="pt" data-x="' + (k + 1) + '" data-v="' + v + '" cx="' + X(k + 1) + '" cy="' + Y(v) + '" r="5" fill="#9f1239"/>';
        s += '<text x="' + X(k + 1) + '" y="' + (y0 + 22) + '" font-size="14" text-anchor="middle" fill="' + INK + '">' + (k + 1) + '</text>';
      });
      s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (y0 + 48) + '" font-size="14" text-anchor="middle" fill="' + INK + '">Number of days ABSENT</text>';
      s += '<text x="22" y="' + ((y0 + y1) / 2) + '" font-size="14" text-anchor="middle" fill="' + INK + '" transform="rotate(-90 22 ' + ((y0 + y1) / 2) + ')">Number of PUPILS</text>';
      s += '</svg>';
      return s;
    },

    /* 两个表盘（无指针时间）：左侧逆时针箭头、右侧顺时针箭头，中心标 O / P */
    clockpair2: function (spec, vars) {
      var W = 420, H = 190;
      var s = svgOpen(W, H, 'two dials labelled O and P with rotation arrows');
      s += '<g data-u="dial" data-id="O" data-turn="anticlockwise">';
      s += '<circle cx="115" cy="96" r="62" fill="#dbeafe" stroke="' + INK + '" stroke-width="2.2"/>';
      s += '<line x1="115" y1="96" x2="115" y2="46" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>';
      s += '<polygon points="115,38 108,52 122,52" fill="' + INK + '"/>';
      s += '<path d="M 62 60 A 62 62 0 0 0 62 132" fill="none" stroke="' + BLUE + '" stroke-width="2.4"/>';
      s += '<polygon points="62,132 56,118 70,120" fill="' + BLUE + '"/>';
      s += '<text x="115" y="120" font-size="20" font-weight="bold" text-anchor="middle" fill="' + INK + '">O</text>';
      s += '</g>';
      s += '<g data-u="dial" data-id="P" data-turn="clockwise">';
      s += '<circle cx="305" cy="96" r="62" fill="#d1fae5" stroke="' + INK + '" stroke-width="2.2"/>';
      s += '<line x1="305" y1="96" x2="305" y2="46" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>';
      s += '<polygon points="305,38 298,52 312,52" fill="' + INK + '"/>';
      s += '<path d="M 358 132 A 62 62 0 0 0 358 60" fill="none" stroke="' + GREEN + '" stroke-width="2.4"/>';
      s += '<polygon points="358,60 352,74 366,72" fill="' + GREEN + '"/>';
      s += '<text x="305" y="120" font-size="20" font-weight="bold" text-anchor="middle" fill="' + INK + '">P</text>';
      s += '</g>';
      s += '</svg>';
      return s;
    },

    /* n 个棱长 s 的正方体排成一排（等距斜二测），data-u="cube" 逐个标出 */
    rowcubes: function (spec, vars) {
      var n = Math.max(2, Math.min(5, Math.round(num(spec.n, vars) || 3)));
      var s0 = 52, dx = s0 * 0.46, dy = s0 * 0.30, pad = 40;
      var W = Math.round(pad * 2 + n * s0 + dx), H = Math.round(pad * 2 + s0 + dy);
      var s = svgOpen(W, H, n + ' cubes of side glued in a row');
      function cube(ox, oy) {
        var b = '', x, y;
        /* 右面 */
        b += '<polygon points="' + (ox + s0) + ',' + oy + ' ' + (ox + s0 + dx) + ',' + (oy - dy) + ' ' +
             (ox + s0 + dx) + ',' + (oy + s0 - dy) + ' ' + (ox + s0) + ',' + (oy + s0) + '" fill="#bfdbfe" stroke="' + INK + '" stroke-width="1.6"/>';
        /* 顶面 */
        b += '<polygon points="' + ox + ',' + oy + ' ' + (ox + dx) + ',' + (oy - dy) + ' ' +
             (ox + s0 + dx) + ',' + (oy - dy) + ' ' + (ox + s0) + ',' + oy + '" fill="#eff6ff" stroke="' + INK + '" stroke-width="1.6"/>';
        /* 前面 */
        b += '<rect x="' + ox + '" y="' + oy + '" width="' + s0 + '" height="' + s0 + '" fill="#ffffff" stroke="' + INK + '" stroke-width="1.6"/>';
        return b;
      }
      for (var i = 0; i < n; i++) {
        var ox = pad + i * s0, oy = pad + dy;
        s += '<g data-u="cube" data-i="' + i + '" data-side="' + Math.round(num(spec.s, vars)) + '">' + cube(ox, oy) + '</g>';
      }
      /* 接缝（粘合面）标虚线 */
      for (var j = 1; j < n; j++) {
        var sx = pad + j * s0;
        s += '<line data-u="join" x1="' + sx + '" y1="' + (pad + dy) + '" x2="' + sx + '" y2="' + (pad + dy + s0) +
             '" stroke="' + RED + '" stroke-width="2.4" stroke-dasharray="6 4"/>';
      }
      s += '</svg>';
      return s;
    },

    /* 一条直线 AD，在中间点处竖起两条斜线到 B、C，并在该点标直角
       data-u="rightangle" 标出直角，data-u="angle" 标出 x 与 y */
    angleline: function (spec, vars) {
      var W = 460, H = 260, x0 = 44, x1 = 416, yb = 196;
      var fx = 250;
      var s = svgOpen(W, H, 'straight line AD with a right angle and two slanted segments');
      s += '<line x1="' + x0 + '" y1="' + yb + '" x2="' + x1 + '" y2="' + yb + '" stroke="' + INK + '" stroke-width="2.4"/>';
      s += '<line data-u="seg" data-id="B" x1="' + fx + '" y1="' + yb + '" x2="' + (fx - 104) + '" y2="' + (yb - 118) + '" stroke="' + INK + '" stroke-width="2.4"/>';
      s += '<line data-u="seg" data-id="C" x1="' + fx + '" y1="' + yb + '" x2="' + (fx + 84) + '" y2="' + (yb - 96) + '" stroke="' + INK + '" stroke-width="2.4"/>';
      /* 直角标记 */
      s += '<polyline data-u="rightangle" points="' + (fx - 20) + ',' + yb + ' ' + (fx - 20) + ',' + (yb - 20) + ' ' + fx + ',' + (yb - 20) +
           '" fill="none" stroke="' + INK + '" stroke-width="1.8"/>';
      /* 角 x 在左侧（AB 与 AD 之间），角 y 在右侧（AC 与 AD 之间） */
      s += '<text data-u="angle" data-id="x" x="' + (fx - 74) + '" y="' + (yb - 22) + '" font-size="19" font-weight="bold" fill="' + BLUE + '">x</text>';
      s += '<text data-u="angle" data-id="y" x="' + (fx + 36) + '" y="' + (yb - 18) + '" font-size="19" font-weight="bold" fill="' + RED + '">y</text>';
      s += '<text x="' + (x0 - 4) + '" y="' + (yb + 26) + '" font-size="18" font-weight="bold" fill="' + INK + '">A</text>';
      s += '<text x="' + (x1 - 6) + '" y="' + (yb + 26) + '" font-size="18" font-weight="bold" fill="' + INK + '">D</text>';
      s += '<text x="' + (fx - 120) + '" y="' + (yb - 124) + '" font-size="18" font-weight="bold" fill="' + INK + '">B</text>';
      s += '<text x="' + (fx + 88) + '" y="' + (yb - 102) + '" font-size="18" font-weight="bold" fill="' + INK + '">C</text>';
      s += '</svg>';
      return s;
    },

    /* 三个正方形：A 左上、B 右上（顶边对齐），C 在下方横跨 A 与 B
       C 的边长 = A 边长 + B 边长；图上只标 A、B、C 字母与已知的两个面积 */
    threesquares: function (spec, vars) {
      var aA = num(spec.aA, vars), aB = num(spec.aB, vars);
      var sA = Math.sqrt(aA), sB = Math.sqrt(aB), sC = sA + sB;
      var u = 168 / sC, pad = 34;
      var wa = sA * u, wb = sB * u, wc = sC * u;
      var W = Math.round(pad * 2 + wc), H = Math.round(pad * 2 + Math.max(wa, wb) + wc);
      var ytop = pad, ymid = pad + Math.max(wa, wb), ybot = ymid + wc;
      var s = svgOpen(W, H, 'three squares A, B and C');
      s += '<rect data-u="sq" data-id="A" data-area="' + fmt(aA) + '" data-side="' + fmt(sA) + '" x="' + pad + '" y="' + ytop + '" width="' + wa.toFixed(1) + '" height="' + wa.toFixed(1) +
           '" fill="#fed7aa" stroke="' + INK + '" stroke-width="2"/>';
      s += '<rect data-u="sq" data-id="B" data-area="' + fmt(aB) + '" data-side="' + fmt(sB) + '" x="' + (pad + wa).toFixed(1) + '" y="' + ytop + '" width="' + wb.toFixed(1) + '" height="' + wb.toFixed(1) +
           '" fill="#fbcfe8" stroke="' + INK + '" stroke-width="2"/>';
      s += '<rect data-u="sq" data-id="C" data-side="' + fmt(sC) + '" x="' + pad + '" y="' + ymid + '" width="' + wc.toFixed(1) + '" height="' + wc.toFixed(1) +
           '" fill="#a7f3d0" stroke="' + INK + '" stroke-width="2"/>';
      s += '<text x="' + (pad + wa / 2).toFixed(1) + '" y="' + (ytop + wa / 2 + 6).toFixed(1) + '" font-size="16" font-weight="bold" text-anchor="middle" fill="' + INK + '">A</text>';
      s += '<text x="' + (pad + wa + wb / 2).toFixed(1) + '" y="' + (ytop + wb / 2 + 6).toFixed(1) + '" font-size="16" font-weight="bold" text-anchor="middle" fill="' + INK + '">B</text>';
      s += '<text x="' + (pad + wc / 2).toFixed(1) + '" y="' + (ymid + wc / 2 + 6).toFixed(1) + '" font-size="16" font-weight="bold" text-anchor="middle" fill="' + INK + '">C</text>';
      s += '<text x="' + (pad - 8) + '" y="' + (ytop + wa / 2 + 5).toFixed(1) + '" font-size="12" text-anchor="end" fill="' + INK + '">' + fmt(aA) + ' cm²</text>';
      s += '<text x="' + (pad + wa + wb + 8).toFixed(1) + '" y="' + (ytop + wb / 2 + 5).toFixed(1) + '" font-size="12" fill="' + INK + '">' + fmt(aB) + ' cm²</text>';
      s += '</svg>';
      return s;
    },

    /* 两向表（Boys / Girls × Glasses / No Glasses / Total）空表，
       data-u="cell" 逐个标出 (row, col)，表内不填数字（数据在题干里） */
    twoway: function (spec, vars) {
      var cols = ['Boys', 'Girls', 'Total'], rows = ['Glasses', 'No Glasses', 'Total'];
      var cw = 92, ch = 40, pad = 16, i, j;
      var W = pad * 2 + 4 * cw, H = pad * 2 + 4 * ch;
      var s = svgOpen(W, H, 'two way table with empty cells');
      for (i = 0; i <= 3; i++) {
        for (j = 0; j <= 3; j++) {
          var x = pad + j * cw, y = pad + i * ch;
          s += '<rect data-u="cell" data-r="' + i + '" data-c="' + j + '" x="' + x + '" y="' + y + '" width="' + cw + '" height="' + ch +
               '" fill="' + (i === 0 || j === 0 ? '#f1f5f9' : '#ffffff') + '" stroke="' + INK + '" stroke-width="1.4"/>';
        }
      }
      for (j = 0; j < 3; j++) {
        s += '<text x="' + (pad + (j + 1) * cw + cw / 2) + '" y="' + (pad + ch / 2 + 5) + '" font-size="13" text-anchor="middle" fill="' + INK + '">' + cols[j] + '</text>';
      }
      for (i = 0; i < 3; i++) {
        s += '<text x="' + (pad + cw / 2) + '" y="' + (pad + (i + 1) * ch + ch / 2 + 5) + '" font-size="13" text-anchor="middle" fill="' + INK + '">' + rows[i] + '</text>';
      }
      s += '</svg>';
      return s;
    },

    /* 3×3 中空方框（10 个立方体粘成）：8 个围成环 + 2 个补厚度
       data-u="cube" 逐个标出，data-u="join" 标出接缝数 */
    framecubes: function (spec, vars) {
      var n = Math.round(num(spec.n, vars) || 10);
      var s0 = 44, dx = s0 * 0.46, dy = s0 * 0.30, pad = 40;
      var W = Math.round(pad * 2 + 3 * s0 + dx), H = Math.round(pad * 2 + 3 * s0 + dy);
      var s = svgOpen(W, H, 'ten cubes glued into a hollow square frame');
      function cubeAt(cx, cy, key) {
        var b = '';
        /* 右面 */
        b += '<polygon points="' + (cx + s0) + ',' + cy + ' ' + (cx + s0 + dx) + ',' + (cy - dy) + ' ' +
             (cx + s0 + dx) + ',' + (cy + s0 - dy) + ' ' + (cx + s0) + ',' + (cy + s0) + '" fill="#bfdbfe" stroke="' + INK + '" stroke-width="1.5"/>';
        /* 顶面 */
        b += '<polygon points="' + cx + ',' + cy + ' ' + (cx + dx) + ',' + (cy - dy) + ' ' +
             (cx + s0 + dx) + ',' + (cy - dy) + ' ' + (cx + s0) + ',' + cy + '" fill="#eff6ff" stroke="' + INK + '" stroke-width="1.5"/>';
        /* 前面 */
        b += '<rect x="' + cx + '" y="' + cy + '" width="' + s0 + '" height="' + s0 + '" fill="#ffffff" stroke="' + INK + '" stroke-width="1.5"/>';
        return '<g data-u="cube" data-key="' + key + '">' + b + '</g>';
      }
      var cells = [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1], [2, 2]];
      cells.forEach(function (c, idx) {
        s += cubeAt(pad + c[0] * s0, pad + dy + c[1] * s0, 'front' + idx);
      });
      /* 后面补 2 个（画在右上/右下偏移处，表示有厚度） */
      s += cubeAt(pad + 2 * s0 + dx, pad + dy - dy + s0 * 0.0, 'backA');
      s += cubeAt(pad + 2 * s0 + dx, pad + dy + 1 * s0, 'backB');
      /* 空缺的中心 */
      s += '<rect data-u="hole" x="' + (pad + s0) + '" y="' + (pad + dy + s0) + '" width="' + s0 + '" height="' + s0 +
           '" fill="#ffffff" stroke="' + GREY + '" stroke-width="1.4" stroke-dasharray="5 4"/>';
      s += '<text data-u="count" data-n="' + n + '" x="' + (pad + 1.5 * s0) + '" y="' + (pad + dy + 1.5 * s0 + 6) + '" font-size="15" font-weight="bold" text-anchor="middle" fill="' + INK + '">' + n + ' cubes</text>';
      s += '</svg>';
      return s;
    }
  };

  function norm(v) {
    var L = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    if (!L) return null;
    return [v[0] / L, v[1] / L];
  }
  function fmt(x) {
    var r = Math.round(x * 100) / 100;
    return String(r);
  }

  Object.keys(TYPES2).forEach(function (k) { TYPES[k] = TYPES2[k]; });
  Object.keys(TYPES3).forEach(function (k) { if (k !== 'vehicleIcon') TYPES[k] = TYPES3[k]; });
  Object.keys(TYPES4).forEach(function (k) { TYPES[k] = TYPES4[k]; });
  Object.keys(TYPES5).forEach(function (k) { TYPES[k] = TYPES5[k]; });
  Object.keys(TYPES6).forEach(function (k) { TYPES[k] = TYPES6[k]; });
  Object.keys(TYPES7).forEach(function (k) { TYPES[k] = TYPES7[k]; });

  /* =====================================================================
   * Mastering Mathematics Book 1 · TEST 3 新增图元（TYPES8）
   * 每个图元都用 data-* 标注可复算结构，供 test-figs.js 断言。
   * ===================================================================== */
  var TYPES8 = {
    /* 五个全等小矩形拼成一个大矩形（上排 3 竖、下排 2 横）
       关键几何：设小矩形 长 L、宽 W。上排 3 个竖放 ⇒ 大宽 = 3W；下排 2 个横放 ⇒ 大宽 = 2L
       ⇒ 3W = 2L。大高 = L + W。周长 = 2(3W + L + W) = 2(4W + L)。
       模板给出大周长 P，解出 W：因 L = 1.5W ⇒ 2(4W + 1.5W) = 11W = P ⇒ W = P/11，L = 1.5W。
       data-u = 小矩形宽 W；data-bigw/data-bigh = 大矩形尺寸；
       data-s="L" / data-s="W" 供断言。 */
    fivefit: function (spec, vars) {
      var P = Math.max(11, Math.round(num(spec.P, vars)));
      var W = P / 11, L = 1.5 * W;
      var sc = 320 / (3 * W);                     // 3W 是大宽，缩放到 320px
      var u = W * sc;                             // 小矩形宽（像素）
      var v = L * sc;                             // 小矩形长（像素）
      var pad = 34;
      var bigW = 3 * u, bigH = v + u;
      var Wpx = Math.round(bigW + pad * 2), Hpx = Math.round(bigH + pad * 2 + 26);
      var s = svgOpen(Wpx, Hpx, 'a rectangle divided into five identical smaller rectangles');
      var x0 = pad, y0 = pad;
      s += '<rect x="' + fmt(x0) + '" y="' + fmt(y0) + '" width="' + fmt(bigW) + '" height="' + fmt(bigH) +
           '" fill="#eaf3fb" stroke="' + INK + '" stroke-width="2.5" data-u="' + fmt(W) + '" data-bigw="' + fmt(3 * W) + '" data-bigh="' + fmt(L + W) + '"/>';
      var i;
      /* 上排 3 个竖放小矩形：宽 u、高 v */
      for (i = 0; i < 3; i++) {
        s += '<rect x="' + fmt(x0 + i * u) + '" y="' + fmt(y0) + '" width="' + fmt(u) + '" height="' + fmt(v) +
             '" fill="none" stroke="' + INK + '" stroke-width="1.8" data-s="W"/>';
      }
      /* 下排 2 个横放小矩形：宽 v、高 u */
      for (i = 0; i < 2; i++) {
        s += '<rect x="' + fmt(x0 + i * v) + '" y="' + fmt(y0 + v) + '" width="' + fmt(v) + '" height="' + fmt(u) +
             '" fill="none" stroke="' + INK + '" stroke-width="1.8" data-s="L"/>';
      }
      s += '<text x="' + fmt(x0 + 0.5 * u) + '" y="' + fmt(y0 + bigH + 20) + '" font-size="15" text-anchor="middle" fill="' + INK + '">a</text>';
      s += '<text x="' + fmt(x0 + v + 0.5 * v) + '" y="' + fmt(y0 + bigH + 20) + '" font-size="15" text-anchor="middle" fill="' + INK + '">b</text>';
      s += '</svg>';
      return s;
    },

    /* 骰子展开图（十字/阶梯形 6 面净图），3 面已画点数、3 面留空写 A/B/C
       布局（squares 数组给出面内点数，null 表示留空并给标签）：
         列: 0    1    2    3
         行0:              [3]
         行1:        [6]  [4x] [A]     ← 说明见模板：A 与 5 相对
         行2: [空]  [1]  ...
       为通用起见，用 spec.cells = 每格 {r,c,dots|null,label} 描述。 */
    dienet: function (spec, vars) {
      var cells = spec.cells || [];
      var u = 56, pad = 26;
      var maxR = 0, maxC = 0;
      cells.forEach(function (c) { maxR = Math.max(maxR, c.r); maxC = Math.max(maxC, c.c); });
      var W = pad * 2 + (maxC + 1) * u, H = pad * 2 + (maxR + 1) * u + 20;
      var s = svgOpen(W, H, 'an unfolded cube net with dotted fold lines');
      /* 点阵坐标（3x3 九宫格里的位置，1..9） */
      var POS = {
        1: [[1, 1]],
        2: [[0, 0], [2, 2]],
        3: [[0, 0], [1, 1], [2, 2]],
        4: [[0, 0], [2, 0], [0, 2], [2, 2]],
        5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
        6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]]
      };
      cells.forEach(function (c) {
        var x = pad + c.c * u, y = pad + c.r * u;
        s += '<rect x="' + x + '" y="' + y + '" width="' + u + '" height="' + u +
             '" fill="#eef7ee" stroke="' + INK + '" stroke-width="1.8" stroke-dasharray="5 4"/>';
        if (c.dots) {
          var pos = POS[c.dots] || [];
          pos.forEach(function (p) {
            var cx = x + u * (0.25 + p[0] * 0.25), cy = y + u * (0.25 + p[1] * 0.25);
            s += '<circle cx="' + fmt(cx) + '" cy="' + fmt(cy) + '" r="3.6" fill="' + INK + '"/>';
          });
          s += '<text x="' + (x + 5) + '" y="' + (y + u - 6) + '" font-size="10" fill="' + GREY + '">' + c.dots + '</text>';
        }
        if (c.label) {
          s += '<text x="' + (x + u / 2) + '" y="' + (y + u / 2 + 8) + '" font-size="24" font-weight="700" text-anchor="middle" fill="' + BLUE + '">' + esc(c.label) + '</text>';
        }
      });
      s += '</svg>';
      return s;
    },

    /* 邮包资费阶梯图：横轴 Mass (kg) 0..5，纵轴 Cost ($) 1..7
       spec.steps = [ {m0, m1, cost}, ... ] 每段的质量区间与价格
       data-u="step" data-cost data-m0 data-m1 */
    stepcost: function (spec, vars) {
      var steps = spec.steps || [];
      var W = 460, H = 300, x0 = 62, y0 = 24, x1 = 420, y1 = 248;
      var maxM = 5, maxC = 7;
      var px = function (m) { return x0 + (m / maxM) * (x1 - x0); };
      var py = function (c) { return y1 - (c / maxC) * (y1 - y0); };
      var s = svgOpen(W, H, 'a step graph showing postage cost against mass');
      /* 轴 */
      s += '<line x1="' + x0 + '" y1="' + y1 + '" x2="' + x1 + '" y2="' + y1 + '" stroke="' + INK + '" stroke-width="2"/>';
      s += '<line x1="' + x0 + '" y1="' + y1 + '" x2="' + x0 + '" y2="' + y0 + '" stroke="' + INK + '" stroke-width="2"/>';
      var i;
      for (i = 1; i <= maxC; i++) {
        s += '<line x1="' + (x0 - 6) + '" y1="' + fmt(py(i)) + '" x2="' + x0 + '" y2="' + fmt(py(i)) + '" stroke="' + INK + '" stroke-width="1.5"/>';
        s += '<text x="' + (x0 - 10) + '" y="' + fmt(py(i) + 5) + '" font-size="13" text-anchor="end" fill="' + INK + '">' + i + '</text>';
      }
      for (i = 0; i <= maxM; i++) {
        s += '<line x1="' + fmt(px(i)) + '" y1="' + y1 + '" x2="' + fmt(px(i)) + '" y2="' + (y1 + 6) + '" stroke="' + INK + '" stroke-width="1.5"/>';
        s += '<text x="' + fmt(px(i)) + '" y="' + (y1 + 22) + '" font-size="13" text-anchor="middle" fill="' + INK + '">' + i + '</text>';
      }
      s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (y1 + 46) + '" font-size="14" text-anchor="middle" fill="' + INK + '">Mass (kg)</text>';
      s += '<text x="14" y="' + ((y0 + y1) / 2) + '" font-size="14" fill="' + INK + '" transform="rotate(-90 14 ' + ((y0 + y1) / 2) + ')">Cost ($)</text>';
      /* 阶梯段 */
      steps.forEach(function (st) {
        var xa = px(st.m0), xb = px(st.m1), yy = py(st.cost);
        s += '<line x1="' + fmt(xa) + '" y1="' + fmt(yy) + '" x2="' + fmt(xb) + '" y2="' + fmt(yy) +
             '" stroke="' + BLUE + '" stroke-width="2.5" data-u="step" data-cost="' + st.cost + '" data-m0="' + st.m0 + '" data-m1="' + st.m1 + '"/>';
        s += '<circle cx="' + fmt(xa) + '" cy="' + fmt(yy) + '" r="4" fill="' + BLUE + '"/>';
        s += '<circle cx="' + fmt(xb) + '" cy="' + fmt(yy) + '" r="4" fill="#ffffff" stroke="' + BLUE + '" stroke-width="2"/>';
      });
      s += '</svg>';
      return s;
    },

    /* 12 个全等矩形围成方框（外边长 O，内孔边长 I）
       每边 4 个竖放（上下）/ 2 个横放（左右），共 4+4+2+2 = 12
       由 O 与 I 求单块面积：(O^2 - I^2)/12
       data-o / data-i / data-u=n */
    framefill: function (spec, vars) {
      var O = Math.max(2, Math.round(num(spec.O, vars)));
      var I = Math.max(1, Math.round(num(spec.I, vars)));
      var n = 12;
      var W = 330, H = 330, pad = 46;
      var sc = Math.min(W - pad * 2, H - pad * 2) / O;
      var oc = O * sc, ic = I * sc;
      var x0 = (W - oc) / 2, y0 = (H - oc) / 2 + 8;
      var t = (oc - ic) / 2;                       // 框厚
      var s = svgOpen(W, H, 'twelve identical rectangles arranged into a square frame');
      /* 框体 */
      s += '<rect x="' + fmt(x0) + '" y="' + fmt(y0) + '" width="' + fmt(oc) + '" height="' + fmt(oc) +
           '" fill="#f6efe2" stroke="' + INK + '" stroke-width="2" data-o="' + O + '" data-i="' + I + '" data-u="' + n + '"/>';
      s += '<rect x="' + fmt(x0 + t) + '" y="' + fmt(y0 + t) + '" width="' + fmt(ic) + '" height="' + fmt(ic) +
           '" fill="#ffffff" stroke="' + INK + '" stroke-width="2"/>';
      /* 上下各 4 个竖放：宽 t、高 t（此处为视觉分割，实际由 t 决定） */
      var i;
      for (i = 1; i < 4; i++) {
        var xx = x0 + t + (ic / 4) * i;
        s += '<line x1="' + fmt(xx) + '" y1="' + fmt(y0) + '" x2="' + fmt(xx) + '" y2="' + fmt(y0 + t) + '" stroke="' + INK + '" stroke-width="1.6"/>';
        s += '<line x1="' + fmt(xx) + '" y1="' + fmt(y0 + t + ic) + '" x2="' + fmt(xx) + '" y2="' + fmt(y0 + oc) + '" stroke="' + INK + '" stroke-width="1.6"/>';
      }
      /* 左右各 2 个横放 */
      for (i = 1; i < 2; i++) {
        var yy = y0 + t + (ic / 2) * i;
        s += '<line x1="' + fmt(x0) + '" y1="' + fmt(yy) + '" x2="' + fmt(x0 + t) + '" y2="' + fmt(yy) + '" stroke="' + INK + '" stroke-width="1.6"/>';
        s += '<line x1="' + fmt(x0 + t + ic) + '" y1="' + fmt(yy) + '" x2="' + fmt(x0 + oc) + '" y2="' + fmt(yy) + '" stroke="' + INK + '" stroke-width="1.6"/>';
      }
      /* 标注：内边长 + 外底边 */
      s += '<line x1="' + fmt(x0 + t) + '" y1="' + fmt(y0 + t / 2) + '" x2="' + fmt(x0 + t + ic) + '" y2="' + fmt(y0 + t / 2) + '" stroke="' + RED + '" stroke-width="1.6" marker-start="url(#ar)" marker-end="url(#ar)"/>';
      s += '<text x="' + fmt(x0 + t + ic / 2) + '" y="' + fmt(y0 + t / 2 - 6) + '" font-size="14" text-anchor="middle" fill="' + RED + '">' + I + ' cm</text>';
      s += '<line x1="' + fmt(x0) + '" y1="' + fmt(y0 + oc + 24) + '" x2="' + fmt(x0 + oc) + '" y2="' + fmt(y0 + oc + 24) + '" stroke="' + RED + '" stroke-width="1.6"/>';
      s += '<text x="' + fmt(x0 + oc / 2) + '" y="' + fmt(y0 + oc + 40) + '" font-size="14" text-anchor="middle" fill="' + RED + '">' + O + ' cm</text>';
      s += '</svg>';
      return s;
    },

    /* 正方形 ABCD 各边中点连成内接正方形 EFGH（菱形朝向）
       面积比 ABCD : EFGH = 2 : 1 ⇒ ABCD 是 EFGH 的 2/1
       data-outer / data-inner = 面积倍数（固定 2）
       spec.labels = 'ABCD'/'EFGH' 是否标字母 */
    midsquare: function (spec, vars) {
      var W = 360, H = 330, pad = 54, id = spec.id || 1;
      var a = Math.min(W - pad * 2, H - pad * 2);
      var x0 = (W - a) / 2, y0 = (H - a) / 2 + 6;
      var s = svgOpen(W, H, 'square ABCD with inner square EFGH joining the midpoints');
      /* 外正方形 */
      s += '<polygon points="' + x0 + ',' + y0 + ' ' + (x0 + a) + ',' + y0 + ' ' + (x0 + a) + ',' + (y0 + a) + ' ' + x0 + ',' + (y0 + a) +
           '" fill="#eaf3fb" stroke="' + INK + '" stroke-width="2.5" data-u="outer" data-id="' + id + '"/>';
      /* 内接菱形（四个中点） */
      var m = [[x0 + a / 2, y0], [x0 + a, y0 + a / 2], [x0 + a / 2, y0 + a], [x0, y0 + a / 2]];
      s += '<polygon points="' + m.map(function (p) { return fmt(p[0]) + ',' + fmt(p[1]); }).join(' ') +
           '" fill="#cfe6f7" stroke="' + BLUE + '" stroke-width="2" data-u="inner" data-id="' + id + '" data-ratio="2"/>';
      var L = spec.labels !== false;
      if (L) {
        var lab = [['A', x0 - 16, y0 - 8], ['B', x0 + a + 16, y0 - 8], ['C', x0 + a + 16, y0 + a + 20], ['D', x0 - 16, y0 + a + 20]];
        lab.forEach(function (t) {
          s += '<text x="' + t[1] + '" y="' + t[2] + '" font-size="17" font-weight="600" text-anchor="middle" fill="' + INK + '">' + t[0] + '</text>';
        });
        var lab2 = [['F', m[0][0], m[0][1] - 8], ['G', m[1][0] + 14, m[1][1] + 5], ['H', m[2][0], m[2][1] + 20], ['E', m[3][0] - 14, m[3][1] + 5]];
        lab2.forEach(function (t) {
          s += '<text x="' + t[1] + '" y="' + t[2] + '" font-size="16" font-weight="600" text-anchor="middle" fill="' + BLUE + '">' + t[0] + '</text>';
        });
      }
      s += '</svg>';
      return s;
    },

    /* 四选项图象面板（t-y 曲线）：用于「哪个图符合表格」题
       spec.panels = [ {kind:'dec-steep'|'dec-soft'|'inc-line'|'dec-line'}, ... ] 共 4 个
       每个面板一条曲线 + 轴标 y/t + 面板字母
       data-u="panel" data-kind data-i */
    curveopts: function (spec, vars) {
      var panels = spec.panels || [];
      var pw = 168, ph = 138, gap = 16, pad = 12;
      var n = panels.length || 4, cols = 2, rows = Math.ceil(n / cols);
      var W = pad * 2 + cols * pw + (cols - 1) * gap;
      var H = pad * 2 + rows * (ph + 24) + (rows - 1) * gap;
      var s = svgOpen(W, H, 'four graph options for cost against mass');
      panels.forEach(function (p, k) {
        var cx0 = pad + (k % cols) * (pw + gap);
        var cy0 = pad + Math.floor(k / cols) * (ph + 24 + gap);
        var bx = cx0 + 26, by = cy0 + ph - 24, ex = cx0 + pw - 10, ey = cy0 + 10;
        s += '<line x1="' + bx + '" y1="' + by + '" x2="' + ex + '" y2="' + by + '" stroke="' + INK + '" stroke-width="1.8"/>';
        s += '<line x1="' + bx + '" y1="' + by + '" x2="' + bx + '" y2="' + ey + '" stroke="' + INK + '" stroke-width="1.8"/>';
        s += '<text x="' + (bx - 8) + '" y="' + (ey + 4) + '" font-size="12" text-anchor="end" fill="' + INK + '">y</text>';
        s += '<text x="' + (ex + 2) + '" y="' + (by + 4) + '" font-size="12" fill="' + INK + '">t</text>';
        var d = '';
        if (p.kind === 'dec-steep') {
          /* 从 y 轴高位快速下降后趋平（凸） */
          d = 'M' + bx + ' ' + ey + ' C' + (bx + 10) + ' ' + (ey + ph * 0.30) + ' ' + (bx + 16) + ' ' + (by - 14) + ' ' + ex + ' ' + (by - 6);
        } else if (p.kind === 'dec-soft') {
          d = 'M' + bx + ' ' + ey + ' C' + (bx + 24) + ' ' + (ey + ph * 0.14) + ' ' + (bx + 46) + ' ' + (by - 16) + ' ' + ex + ' ' + (by - 8);
        } else if (p.kind === 'inc-line') {
          d = 'M' + bx + ' ' + by + ' L' + ex + ' ' + (ey + 16);
        } else {
          d = 'M' + bx + ' ' + ey + ' L' + ex + ' ' + by;
        }
        s += '<path d="' + d + '" fill="none" stroke="' + GREEN + '" stroke-width="2.4" data-u="panel" data-kind="' + p.kind + '" data-i="' + k + '"/>';
        s += '<text x="' + (cx0 + pw / 2) + '" y="' + (cy0 + ph + 14) + '" font-size="15" font-weight="700" text-anchor="middle" fill="' + INK + '">' + String.fromCharCode(65 + k) + '</text>';
      });
      s += '</svg>';
      return s;
    },

    /* 单个图象面板：作为选择题的「图形选项」用。
       四联的 curveopts 只能当题干配图，不能整块塞进某一个选项，所以单独出一个单面板图元。
       spec.kind = 'dec-steep'|'dec-soft'|'inc-line'|'dec-line'；可选 spec.label 覆盖面板字母
       data-u="panel" data-kind */
    graphopt: function (spec, vars) {      var pw = 168, ph = 138, pad = 12;
      var W = pad * 2 + pw, H = pad * 2 + ph + 24;
      var s = svgOpen(W, H, 'graph option');
      var cx0 = pad, cy0 = pad;
      var bx = cx0 + 26, by = cy0 + ph - 24, ex = cx0 + pw - 10, ey = cy0 + 10;
      s += '<line x1="' + bx + '" y1="' + by + '" x2="' + ex + '" y2="' + by + '" stroke="' + INK + '" stroke-width="1.8"/>';
      s += '<line x1="' + bx + '" y1="' + by + '" x2="' + bx + '" y2="' + ey + '" stroke="' + INK + '" stroke-width="1.8"/>';
      s += '<text x="' + (bx - 8) + '" y="' + (ey + 4) + '" font-size="12" text-anchor="end" fill="' + INK + '">y</text>';
      s += '<text x="' + (ex + 2) + '" y="' + (by + 4) + '" font-size="12" fill="' + INK + '">t</text>';
      var d = '';
      if (spec.kind === 'dec-steep') {
        d = 'M' + bx + ' ' + ey + ' C' + (bx + 10) + ' ' + (ey + ph * 0.30) + ' ' + (bx + 16) + ' ' + (by - 14) + ' ' + ex + ' ' + (by - 6);
      } else if (spec.kind === 'dec-soft') {
        d = 'M' + bx + ' ' + ey + ' C' + (bx + 24) + ' ' + (ey + ph * 0.14) + ' ' + (bx + 46) + ' ' + (by - 16) + ' ' + ex + ' ' + (by - 8);
      } else if (spec.kind === 'inc-line') {
        d = 'M' + bx + ' ' + by + ' L' + ex + ' ' + (ey + 16);
      } else {
        d = 'M' + bx + ' ' + ey + ' L' + ex + ' ' + by;
      }
      s += '<path d="' + d + '" fill="none" stroke="' + GREEN + '" stroke-width="2.4" data-u="panel" data-kind="' + spec.kind + '"/>';
      s += '<text x="' + (cx0 + pw / 2) + '" y="' + (cy0 + ph + 14) + '" font-size="15" font-weight="700" text-anchor="middle" fill="' + INK + '">' + (spec.label || 'A') + '</text>';
      s += '</svg>';
      return s;
    },

    /* 数据表 + 四个图象选项面板（「哪个图符合表格数据」题的整幅题干配图）。
       spec.cols = ['t','y']，spec.rows = [['0','120'], ...]，spec.panels = [{kind}, ...]
       表在上、四个面板 2x2 在下，面板字母 A/B/C/D；四个面板本身也可作为选项图（graphopt）。
       data-u="panel" data-kind data-i；表体用 data-cell 标注 */
    tableopts: function (spec, vars) {
      var cols = spec.cols || [], rows = spec.rows || [];
      var panels = spec.panels || [];
      var widths = spec.widths || cols.map(function () { return 118; });
      var rowH = 30, pad = 14, headRows = 1;
      var total = widths.reduce(function (a, b) { return a + b; }, 0);
      var xOf = function (c) { var x = pad; for (var i = 0; i < c; i++) x += widths[i]; return x; };

      var pw = 168, ph = 138, gap = 16;
      var n = panels.length || 4, pcols = 2, prows = Math.ceil(n / pcols);
      var gridW = pcols * pw + (pcols - 1) * gap;
      var W = Math.max(pad * 2 + total, pad * 2 + gridW);
      var tableH = (rows.length + headRows) * rowH;
      var H = pad * 2 + tableH + 20 + prows * (ph + 24) + (prows - 1) * gap;
      var s = svgOpen(W, H, 'table of data with four graph options');

      /* 表格 */
      var padX = Math.round((W - total) / 2);
      var tx = function (c) { return padX + xOf(c) - pad; };
      s += '<rect x="' + padX + '" y="' + pad + '" width="' + total + '" height="' + tableH + '" fill="#ffffff" stroke="' + INK + '" stroke-width="2"/>';
      for (var c = 0; c < cols.length; c++) {
        s += '<rect x="' + tx(c) + '" y="' + pad + '" width="' + widths[c] + '" height="' + rowH + '" fill="#f7d774" stroke="' + INK + '" stroke-width="1.4"/>';
        s += '<text x="' + (tx(c) + widths[c] / 2) + '" y="' + (pad + rowH - 9) + '" font-size="14" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(cols[c]) + '</text>';
      }
      for (var r = 0; r < rows.length; r++) {
        for (var c3 = 0; c3 < cols.length; c3++) {
          s += '<rect x="' + tx(c3) + '" y="' + (pad + (r + headRows) * rowH) + '" width="' + widths[c3] + '" height="' + rowH + '" fill="none" stroke="' + INK + '" stroke-width="1"/>';
          s += '<text data-cell="1" x="' + (tx(c3) + widths[c3] / 2) + '" y="' + (pad + (r + headRows + 1) * rowH - 9) + '" font-size="15" text-anchor="middle" fill="' + INK + '">' + esc(cellText(rows[r][c3], vars)) + '</text>';
        }
      }

      /* 四个图象面板 */
      var gy0 = pad + tableH + 20;
      var gx0 = Math.round((W - gridW) / 2);
      panels.forEach(function (p, k) {
        var cx0 = gx0 + (k % pcols) * (pw + gap);
        var cy0 = gy0 + Math.floor(k / pcols) * (ph + 24 + gap);
        var bx = cx0 + 26, by = cy0 + ph - 24, ex = cx0 + pw - 10, ey = cy0 + 10;
        s += '<line x1="' + bx + '" y1="' + by + '" x2="' + ex + '" y2="' + by + '" stroke="' + INK + '" stroke-width="1.8"/>';
        s += '<line x1="' + bx + '" y1="' + by + '" x2="' + bx + '" y2="' + ey + '" stroke="' + INK + '" stroke-width="1.8"/>';
        s += '<text x="' + (bx - 8) + '" y="' + (ey + 4) + '" font-size="12" text-anchor="end" fill="' + INK + '">y</text>';
        s += '<text x="' + (ex + 2) + '" y="' + (by + 4) + '" font-size="12" fill="' + INK + '">t</text>';
        var d = '';
        if (p.kind === 'dec-steep') {
          d = 'M' + bx + ' ' + ey + ' C' + (bx + 10) + ' ' + (ey + ph * 0.30) + ' ' + (bx + 16) + ' ' + (by - 14) + ' ' + ex + ' ' + (by - 6);
        } else if (p.kind === 'dec-soft') {
          d = 'M' + bx + ' ' + ey + ' C' + (bx + 24) + ' ' + (ey + ph * 0.14) + ' ' + (bx + 46) + ' ' + (by - 16) + ' ' + ex + ' ' + (by - 8);
        } else if (p.kind === 'inc-line') {
          d = 'M' + bx + ' ' + by + ' L' + ex + ' ' + (ey + 16);
        } else {
          d = 'M' + bx + ' ' + ey + ' L' + ex + ' ' + by;
        }
        s += '<path d="' + d + '" fill="none" stroke="' + GREEN + '" stroke-width="2.4" data-u="panel" data-kind="' + p.kind + '" data-i="' + k + '"/>';
        s += '<text x="' + (cx0 + pw / 2) + '" y="' + (cy0 + ph + 14) + '" font-size="15" font-weight="700" text-anchor="middle" fill="' + INK + '">' + String.fromCharCode(65 + k) + '</text>';
      });
      s += '</svg>';
      return s;
    }
  };
  Object.keys(TYPES8).forEach(function (k) { TYPES[k] = TYPES8[k]; });

  function render(spec, vars) {
    if (!spec || !spec.type) return '';
    var fn = TYPES[spec.type];
    if (!fn) return '';
    try { return fn(spec, vars || {}); } catch (e) { return ''; }
  }

  global.Diagrams = { render: render, types: Object.keys(TYPES) };
})(window);
