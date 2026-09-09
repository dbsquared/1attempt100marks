/* 把 data/imports/*.json 合并进 data/question-bank.json（按 id 去重，后者覆盖前者）
   用法：node tools/merge-bank.js  [--dry] */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const main = path.join(root, 'data/question-bank.json');
const dir = path.join(root, 'data/imports');
const dry = process.argv.includes('--dry');

const bank = JSON.parse(fs.readFileSync(main, 'utf8'));
const map = {};
bank.templates.forEach(t => { map[t.id] = t; });

let added = 0, updated = 0;
if (fs.existsSync(dir)) {
  fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().forEach(f => {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    (j.templates || []).forEach(t => {
      if (map[t.id]) { map[t.id] = t; updated++; } else { map[t.id] = t; added++; }
    });
    console.log('  读取 ' + f + '（' + (j.templates || []).length + ' 条）');
  });
}
bank.templates = Object.keys(map).map(k => map[k]);
bank.updated = new Date().toISOString().slice(0, 10);
console.log((dry ? '[dry-run] ' : '') + '新增 ' + added + '，更新 ' + updated + '，共 ' + bank.templates.length + ' 条');
if (!dry) fs.writeFileSync(main, JSON.stringify(bank, null, 2) + '\n');
