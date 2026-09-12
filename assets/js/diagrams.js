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
      var W = 460, H = 106, x0 = 28, x1 = 432, y = 64, step = (x1 - x0) / n;
      var s = svgOpen(W, H, 'number line 0 to ' + E);
      s += '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="' + INK + '" stroke-width="2"/>';
      for (var i = 0; i <= n; i++) {
        var x = x0 + i * step;
        s += '<line x1="' + x.toFixed(2) + '" y1="' + (y - 9) + '" x2="' + x.toFixed(2) + '" y2="' + (y + 9) + '" stroke="' + INK + '" stroke-width="1.5"/>';
      }
      s += '<text x="' + x0 + '" y="' + (y + 32) + '" font-size="17" text-anchor="middle" fill="' + INK + '">0</text>';
      s += '<text x="' + x1 + '" y="' + (y + 32) + '" font-size="17" text-anchor="middle" fill="' + INK + '">' + esc(E) + '</text>';
      // 箭头必须「向下指」到数轴上的那个刻度（原来画成向上指，方向反了）
      var kx = x0 + k * step;
      s += '<line x1="' + kx.toFixed(2) + '" y1="' + (y - 48) + '" x2="' + kx.toFixed(2) + '" y2="' + (y - 20) + '" stroke="' + RED + '" stroke-width="3"/>';
      s += '<polygon points="' + kx.toFixed(2) + ',' + (y - 8) + ' ' + (kx - 8).toFixed(2) + ',' + (y - 22) + ' ' + (kx + 8).toFixed(2) + ',' + (y - 22) + '" fill="' + RED + '"/>';
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
      var names = ['春 9-11月', '夏 12-2月', '秋 3-5月', '冬 6-8月'];
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
    /* 四个礼物盒 A(长扁) B(高) C(最小) D(中等)，pick 高亮其中一个（Q8） */
    giftboxes: function (spec, vars) {
      var pick = Math.max(0, Math.min(3, Math.round(num(spec.pick, vars))));
      var W = 500, H = 268, base = 214;
      var boxes = [
        { x: 18, w: 176, h: 46, t: 'A' },
        { x: 210, w: 64, h: 124, t: 'B' },
        { x: 290, w: 56, h: 56, t: 'C' },
        { x: 362, w: 112, h: 88, t: 'D' }
      ];
      var cols = ['#f2a6b3', '#9fd3f0', '#f7d774', '#b7e3a8'];
      var s = svgOpen(W, H, 'four present boxes');
      s += '<line x1="8" y1="' + (base + 1) + '" x2="492" y2="' + (base + 1) + '" stroke="' + INK + '" stroke-width="2"/>';
      boxes.forEach(function (b, i) {
        var y = base - b.h, fill = cols[i];
        if (i === pick) s += '<rect x="' + (b.x - 8) + '" y="' + (y - 8) + '" width="' + (b.w + 16) + '" height="' + (b.h + 16) + '" fill="none" stroke="' + RED + '" stroke-width="3" stroke-dasharray="8 6"/>';
        s += '<rect x="' + b.x + '" y="' + y + '" width="' + b.w + '" height="' + b.h + '" fill="' + fill + '" stroke="' + INK + '" stroke-width="2"/>';
        s += '<rect x="' + (b.x + b.w / 2 - 7) + '" y="' + y + '" width="14" height="' + b.h + '" fill="#e5484d" opacity="0.75"/>';
        s += '<rect x="' + b.x + '" y="' + (y + b.h / 2 - 7) + '" width="' + b.w + '" height="14" fill="#e5484d" opacity="0.75"/>';
        s += '<text x="' + (b.x + b.w / 2) + '" y="' + (base + 26) + '" font-size="19" font-weight="700" text-anchor="middle" fill="' + (i === pick ? RED : INK) + '">' + b.t + '</text>';
      });
      s += '</svg>';
      return s;
    },

    /* 钱包里可用的硬币面值（Q23） */
    coins: function (spec, vars) {
      var vals = [5, 10, 20, 50], r = [22, 27, 33, 40];
      var W = 440, H = 150, s = svgOpen(W, H, 'coins 5 10 20 50');
      s += '<path d="M22,78 Q22,44 78,44 Q134,44 134,78 Q134,116 78,116 Q22,116 22,78 Z" fill="#e0c9a6" stroke="' + INK + '" stroke-width="2"/>';
      s += '<path d="M46,46 Q78,20 110,46" fill="none" stroke="' + INK + '" stroke-width="3"/>';
      s += '<text x="78" y="86" font-size="17" font-weight="700" text-anchor="middle" fill="' + INK + '">钱包</text>';
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
      s += '<text x="' + (W / 2) + '" y="22" font-size="18" font-weight="700" text-anchor="middle" fill="' + BLUE + '">↑ 西塔 Sita ↑</text>';
      for (i = 0; i < rows; i++) for (j = 0; j < cols; j++) {
        s += '<rect x="' + (10 + j * cell) + '" y="' + (top + i * cell) + '" width="' + cell + '" height="' + cell +
             '" fill="' + (((i + j) % 2 === 0) ? '#3a3f45' : '#f2f2f2') + '" stroke="' + INK + '" stroke-width="1.5"/>';
      }
      s += '<circle cx="' + (10 + sc * cell + cell / 2) + '" cy="' + (top + sr * cell + cell / 2) + '" r="17" fill="' + BLUE + '" stroke="#ffffff" stroke-width="3"/>';
      s += '<text x="' + (W / 2) + '" y="' + (top + rows * cell + 30) + '" font-size="18" font-weight="700" text-anchor="middle" fill="' + INK + '">↓ 马克 Mark ↓</text>';
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
      s += '<text x="' + (W / 2) + '" y="' + (y0 + ph + 52) + '" font-size="14" text-anchor="middle" fill="#666">猪只能按箭头方向穿过门</text>';
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

  /* 划记法：5 个一组（4 竖 + 1 斜） */
  function tally(cx0, cy, n) {
    var o = '', i, gx;
    for (i = 0; i < n; i++) {
      gx = cx0 + Math.floor(i / 5) * 46 + (i % 5) * 9;
      if (i % 5 === 4) {
        o += '<line data-u="tally" x1="' + (gx - 30) + '" y1="' + (cy + 12) + '" x2="' + (gx + 2) + '" y2="' + (cy - 14) + '" stroke="' + INK + '" stroke-width="2.6"/>';
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
      s += '<text x="288" y="88" font-size="20" font-weight="700" text-anchor="middle" fill="' + INK + '">Today is</text>';
      s += '<text x="288" y="122" font-size="21" font-weight="700" text-anchor="middle" fill="' + RED + '">' + mm + ' 月 ' + d + ' 日 · 星期一</text>';
      s += '<text x="102" y="172" font-size="22" font-weight="700" text-anchor="middle" fill="' + INK + '">' + (sunny ? 'It is sunny. 晴天' : 'It is raining. 下雨') + '</text>';
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

    /* 象形统计图：每列 label，count 个球，附 KEY（Q9） */
    pictograph: function (spec, vars) {
      var labels = spec.labels || [], counts = spec.counts || [];
      var maxC = 1, i, j;
      counts.forEach(function (c) { maxC = Math.max(maxC, Math.round(num(c, vars))); });
      var r = 12, stepY = 26, colW = 72, pad = 18, baseY = 38 + maxC * stepY;
      var W = pad * 2 + labels.length * colW + 142;
      var s = svgOpen(W, baseY + 76, 'pictograph of goals');
      s += '<line x1="' + (pad - 6) + '" y1="' + (baseY + 8) + '" x2="' + (pad + labels.length * colW + 4) + '" y2="' + (baseY + 8) + '" stroke="' + INK + '" stroke-width="2"/>';
      for (i = 0; i < labels.length; i++) {
        var cx = pad + i * colW + colW / 2, n = Math.round(num(counts[i], vars));
        for (j = 0; j < n; j++) s += ballIcon(cx, baseY - 6 - j * stepY, r);
        s += '<text x="' + cx + '" y="' + (baseY + 32) + '" font-size="16" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(labels[i]) + '</text>';
      }
      var kx = pad + labels.length * colW + 14;
      s += '<rect x="' + kx + '" y="26" width="132" height="86" rx="8" fill="#ffffff" stroke="' + INK + '" stroke-width="2"/>';
      s += '<text x="' + (kx + 66) + '" y="50" font-size="15" font-weight="700" text-anchor="middle" fill="' + INK + '">KEY 图例</text>';
      s += ballIcon(kx + 30, 76, 11);
      s += '<text x="' + (kx + 50) + '" y="82" font-size="13" fill="' + INK + '">= 1 个进球</text>';
      s += '</svg>';
      return s;
    },

    /* 楼层剖面：地面 G，地上 1..up，地下 B1..Bdown（Q13） */
    building: function (spec, vars) {
      var up = Math.max(2, Math.min(8, Math.round(num(spec.up, vars) || 6)));
      var down = Math.max(1, Math.min(6, Math.round(num(spec.down, vars) || 4)));
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
      s += '<text x="' + (x + w / 2) + '" y="' + (y + 20) + '" font-size="14" text-anchor="middle" fill="' + INK + '">地面 Ground</text>';
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

    /* 车辆图标（划记统计表用） */
    tallychart: function (spec, vars) {
      var rows = spec.rows || [];
      var rowH = 58, w = 470, headH = 28;
      var H = headH + rows.length * rowH + 20;
      var s = svgOpen(w, H, 'tally chart of vehicles');
      s += '<rect x="8" y="8" width="' + (w - 16) + '" height="' + (H - 16) + '" fill="#ffffff" stroke="' + INK + '" stroke-width="2"/>';
      s += '<line x1="8" y1="' + (8 + headH) + '" x2="' + (w - 8) + '" y2="' + (8 + headH) + '" stroke="' + INK + '" stroke-width="1.6"/>';
      s += '<text x="90" y="' + (8 + 21) + '" font-size="14" fill="#666">交通工具</text>';
      s += '<text x="' + (8 + 180) + '" y="' + (8 + 21) + '" font-size="14" fill="#666">划记（每 5 个一组）</text>';
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
      var names = ['甲 A', '乙 B', '丙 C', '丁 D'];
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
        { label: 'blue 蓝', w: unit, fill: '#bfe3ff' },
        { label: 'red 红', w: unit * k, fill: '#e5484d' },
        { label: 'yellow 黄', w: unit * k * m, fill: '#f5c518' }
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

    /* 数据表格（Q27） */
    datatable: function (spec, vars) {
      var cols = spec.cols || [], rows = spec.rows || [];
      var colW = 118, rowH = 30, pad = 14, W = pad * 2 + cols.length * colW;
      var H = pad * 2 + (rows.length + 1) * rowH;
      var s = svgOpen(W, H, 'data table');
      s += '<rect x="' + pad + '" y="' + pad + '" width="' + (cols.length * colW) + '" height="' + ((rows.length + 1) * rowH) + '" fill="#ffffff" stroke="' + INK + '" stroke-width="2"/>';
      for (var c = 0; c < cols.length; c++) {
        s += '<rect x="' + (pad + c * colW) + '" y="' + pad + '" width="' + colW + '" height="' + rowH + '" fill="#f7d774" stroke="' + INK + '" stroke-width="1.4"/>';
        s += '<text x="' + (pad + c * colW + colW / 2) + '" y="' + (pad + rowH - 9) + '" font-size="14" font-weight="700" text-anchor="middle" fill="' + INK + '">' + esc(cols[c]) + '</text>';
      }
      for (var r = 0; r < rows.length; r++) {
        for (var c2 = 0; c2 < cols.length; c2++) {
          s += '<rect x="' + (pad + c2 * colW) + '" y="' + (pad + (r + 1) * rowH) + '" width="' + colW + '" height="' + rowH + '" fill="none" stroke="' + INK + '" stroke-width="1"/>';
          s += '<text x="' + (pad + c2 * colW + colW / 2) + '" y="' + (pad + (r + 2) * rowH - 9) + '" font-size="15" text-anchor="middle" fill="' + INK + '">' + esc(cellText(rows[r][c2], vars)) + '</text>';
        }
      }
      s += '</svg>';
      return s;
    },

    /* 四色积木塔（3D）（Q28） */
    blockstack: function (spec, vars) {
      var labels = spec.labels || ['黄', '蓝', '绿', '粉'];
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
        s += '<text x="' + (pad + 40 + bw / 2) + '" y="' + (y + bh / 2 + 6) + '" font-size="15" font-weight="700" text-anchor="middle" fill="#1a1a1a">' + esc(labels[idx]) + '</text>';
        s += '<text data-u="layer" x="' + (pad + 40 + bw + d + 14) + '" y="' + (y + bh / 2 + 6) + '" font-size="13" fill="#666">第 ' + (n - i) + ' 层</text>';
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
      var W = pad * 2 + widest * k + 4;
      var rowH = Math.max(44, 56 * k);
      var H = pad * 2 + (legend.length ? rowH : 0) + rows.length * rowH + 4;
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
        (row.terms || []).forEach(function (t) {
          var isOp = (t === '+' || t === '-' || t === '=');
          s += '<text x="' + tx.toFixed(1) + '" y="' + base.toFixed(1) + '" font-size="' + fs(isOp ? FS_OP : FS_SYM) + '" fill="' + INK + '">' + esc(t) + '</text>';
          tx += (isOp ? A_OP : A_SYM) * k;
        });
        var rt = rhsOf(row.rhs);
        if (rt) {
          s += '<text x="' + tx.toFixed(1) + '" y="' + base.toFixed(1) + '" font-size="' + fs(FS_OP + 4) + '" fill="' + INK + '">=</text>';
          tx += A_EQ * k;
          s += '<text x="' + tx.toFixed(1) + '" y="' + base.toFixed(1) + '" font-size="' + fs(FS_NUM) + '" font-weight="700" fill="' + INK + '">' + esc(rt) + '</text>';
        }
      });
      s += '</svg>';
      return s;
    },

    /* 车辆图标 */
    vehicleIcon: function () { return ''; }
  };

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

  function fmt(v) {
    if (typeof v !== 'number' || !isFinite(v)) return String(v);
    return (Math.abs(v - Math.round(v)) < 1e-9) ? String(Math.round(v)) : String(Math.round(v * 100) / 100);
  }

  Object.keys(TYPES2).forEach(function (k) { TYPES[k] = TYPES2[k]; });
  Object.keys(TYPES3).forEach(function (k) { if (k !== 'vehicleIcon') TYPES[k] = TYPES3[k]; });

  function render(spec, vars) {
    if (!spec || !spec.type) return '';
    var fn = TYPES[spec.type];
    if (!fn) return '';
    try { return fn(spec, vars || {}); } catch (e) { return ''; }
  }

  global.Diagrams = { render: render, types: Object.keys(TYPES) };
})(window);
