/*!
 * expr.js — 轻量表达式求值器（无 eval，无外部依赖）
 * 支持：+ - * / % ^  == != < <= > >=  && || !  括号  变量  函数
 * 用途：题库模板里的答案表达式、派生变量、约束条件。
 */
(function (global) {
  'use strict';

  var CONST = { pi: Math.PI, e: Math.E, PI: Math.PI };

  function gcd(a, b) {
    a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b));
    while (b) { var t = b; b = a % b; a = t; }
    return a || 1;
  }
  function lcm(a, b) { return Math.abs(a * b) / gcd(a, b); }

  var FUNCS = {
    abs: Math.abs, sqrt: Math.sqrt, floor: Math.floor, ceil: Math.ceil,
    round: function (x) { return Math.round(x); },
    sign: Math.sign, pow: Math.pow, exp: Math.exp, log: Math.log,
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    min: function () { return Math.min.apply(null, arguments); },
    max: function () { return Math.max.apply(null, arguments); },
    gcd: gcd, lcm: lcm,
    roundTo: function (x, n) { var p = Math.pow(10, n || 0); return Math.round(x * p) / p; },
    fracPart: function (x) { return x - Math.floor(x); },
    mod: function (a, b) { var r = a % b; return r < 0 ? r + b : r; }
  };

  function tokenize(src) {
    var toks = [], i = 0, n = src.length;
    while (i < n) {
      var c = src[i];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
      if (c >= '0' && c <= '9' || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        var j = i; while (i < n && /[0-9.]/.test(src[i])) i++;
        toks.push({ t: 'num', v: parseFloat(src.slice(j, i)) }); continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        var k = i; while (i < n && /[A-Za-z0-9_]/.test(src[i])) i++;
        toks.push({ t: 'id', v: src.slice(k, i) }); continue;
      }
      var two = src.substr(i, 2);
      if (two === '==' || two === '!=' || two === '<=' || two === '>=' || two === '&&' || two === '||') {
        toks.push({ t: 'op', v: two }); i += 2; continue;
      }
      if ('+-*/%^<>()!,'.indexOf(c) >= 0) { toks.push({ t: 'op', v: c }); i++; continue; }
      throw new Error('无法识别的字符 "' + c + '" @' + i);
    }
    return toks;
  }

  // 递归下降
  function Parser(toks) { this.t = toks; this.p = 0; }
  Parser.prototype.peek = function () { return this.t[this.p]; };
  Parser.prototype.next = function () { return this.t[this.p++]; };
  Parser.prototype.eat = function (v) {
    var tk = this.t[this.p];
    if (tk && tk.t === 'op' && tk.v === v) { this.p++; return true; }
    return false;
  };
  Parser.prototype.expect = function (v) {
    if (!this.eat(v)) throw new Error('期望 "' + v + '"');
  };
  Parser.prototype.parse = function () { var a = this.orExpr(); if (this.p < this.t.length) throw new Error('多余的输入'); return a; };

  Parser.prototype.orExpr = function () {
    var a = this.andExpr();
    while (this.peek() && this.peek().v === '||') { this.next(); a = { k: '||', a: a, b: this.andExpr() }; }
    return a;
  };
  Parser.prototype.andExpr = function () {
    var a = this.eqExpr();
    while (this.peek() && this.peek().v === '&&') { this.next(); a = { k: '&&', a: a, b: this.eqExpr() }; }
    return a;
  };
  Parser.prototype.eqExpr = function () {
    var a = this.relExpr();
    while (this.peek() && (this.peek().v === '==' || this.peek().v === '!=')) {
      var op = this.next().v; a = { k: op, a: a, b: this.relExpr() };
    }
    return a;
  };
  Parser.prototype.relExpr = function () {
    var a = this.addExpr();
    while (this.peek() && ['<', '<=', '>', '>='].indexOf(this.peek().v) >= 0) {
      var op = this.next().v; a = { k: op, a: a, b: this.addExpr() };
    }
    return a;
  };
  Parser.prototype.addExpr = function () {
    var a = this.mulExpr();
    while (this.peek() && (this.peek().v === '+' || this.peek().v === '-')) {
      var op = this.next().v; a = { k: op, a: a, b: this.mulExpr() };
    }
    return a;
  };
  Parser.prototype.mulExpr = function () {
    var a = this.unary();
    while (this.peek() && ['*', '/', '%'].indexOf(this.peek().v) >= 0) {
      var op = this.next().v; a = { k: op, a: a, b: this.unary() };
    }
    return a;
  };
  Parser.prototype.unary = function () {
    if (this.peek() && this.peek().v === '-') { this.next(); return { k: 'neg', a: this.unary() }; }
    if (this.peek() && this.peek().v === '+') { this.next(); return this.unary(); }
    if (this.peek() && this.peek().v === '!') { this.next(); return { k: '!', a: this.unary() }; }
    return this.powExpr();
  };
  Parser.prototype.powExpr = function () {
    var a = this.primary();
    if (this.peek() && this.peek().v === '^') { this.next(); return { k: '^', a: a, b: this.unary() }; }
    return a;
  };
  Parser.prototype.primary = function () {
    var tk = this.next();
    if (!tk) throw new Error('表达式意外结束');
    if (tk.t === 'num') return { k: 'num', v: tk.v };
    if (tk.t === 'id') {
      if (this.peek() && this.peek().v === '(') {
        this.next();
        var args = [];
        if (!this.eat(')')) {
          do { args.push(this.orExpr()); } while (this.eat(','));
          this.expect(')');
        }
        return { k: 'call', name: tk.v, args: args };
      }
      return { k: 'var', name: tk.v };
    }
    if (tk.t === 'op' && tk.v === '(') {
      var e = this.orExpr(); this.expect(')'); return e;
    }
    throw new Error('意外的记号 ' + JSON.stringify(tk.v));
  };

  function evalNode(node, scope) {
    switch (node.k) {
      case 'num': return node.v;
      case 'var':
        if (Object.prototype.hasOwnProperty.call(scope, node.name)) return scope[node.name];
        if (Object.prototype.hasOwnProperty.call(CONST, node.name)) return CONST[node.name];
        throw new Error('未定义变量 ' + node.name);
      case 'neg': return -evalNode(node.a, scope);
      case '!': return evalNode(node.a, scope) ? 0 : 1;
      case '+': return evalNode(node.a, scope) + evalNode(node.b, scope);
      case '-': return evalNode(node.a, scope) - evalNode(node.b, scope);
      case '*': return evalNode(node.a, scope) * evalNode(node.b, scope);
      case '/': {
        var d = evalNode(node.b, scope);
        if (d === 0) throw new Error('除以 0');
        return evalNode(node.a, scope) / d;
      }
      case '%': return evalNode(node.a, scope) % evalNode(node.b, scope);
      case '^': return Math.pow(evalNode(node.a, scope), evalNode(node.b, scope));
      case '==': return num(evalNode(node.a, scope)) === num(evalNode(node.b, scope)) ? 1 : 0;
      case '!=': return num(evalNode(node.a, scope)) !== num(evalNode(node.b, scope)) ? 1 : 0;
      case '<': return evalNode(node.a, scope) < evalNode(node.b, scope) ? 1 : 0;
      case '<=': return evalNode(node.a, scope) <= evalNode(node.b, scope) ? 1 : 0;
      case '>': return evalNode(node.a, scope) > evalNode(node.b, scope) ? 1 : 0;
      case '>=': return evalNode(node.a, scope) >= evalNode(node.b, scope) ? 1 : 0;
      case '&&': return evalNode(node.a, scope) && evalNode(node.b, scope) ? 1 : 0;
      case '||': return evalNode(node.a, scope) || evalNode(node.b, scope) ? 1 : 0;
      case 'call': {
        var f = FUNCS[node.name];
        if (!f) throw new Error('未知函数 ' + node.name);
        var vals = node.args.map(function (a) { return evalNode(a, scope); });
        return f.apply(null, vals);
      }
      default: throw new Error('未知节点 ' + node.k);
    }
  }
  function num(v) { return Math.round((+v) * 1e9) / 1e9; }

  var cache = Object.create(null);
  function compile(src) {
    if (cache[src]) return cache[src];
    var ast = new Parser(tokenize(String(src))).parse();
    cache[src] = ast;
    return ast;
  }

  global.Expr = {
    eval: function (src, scope) { return evalNode(compile(src), scope || {}); },
    test: function (src, scope) { return !!evalNode(compile(src), scope || {}); },
    compile: compile
  };
})(window);
