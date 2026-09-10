const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
const ctx={console,Math,JSON,Object,Array,Number,String,isFinite,parseFloat,Date,Set};
ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
['assets/js/expr.js','assets/js/diagrams.js','assets/js/generator.js','assets/js/grader.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));
const {Generator}=ctx;
const bank=JSON.parse(fs.readFileSync(path.join(root,'data/question-bank.json'),'utf8'));
const list=bank.templates||bank;
let h='<!doctype html><meta charset="utf-8"><title>SVG 配图预览</title><style>body{font-family:system-ui;background:#15181d;color:#e6e6e6;padding:20px}table{border-collapse:collapse;width:100%}td{border:1px solid #333;padding:10px;vertical-align:top;width:50%}.d{background:#1d222a;border:1px solid #333;border-radius:10px;padding:8px}.d svg{max-width:320px}.optsv{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}.optsv .d{padding:4px}.optsv svg{max-width:130px}h3{margin:18px 0 6px;color:#8ab4f8}</style>';
h+='<h1>简化 SVG 配图预览（每图两个随机变式）</h1>';
const figs=list.filter(t=>t.diagram);
for(const t of figs){
  h+='<h3>'+t.id+' · '+t.title+' · '+t.diagram.type+'</h3><table><tr>';
  for(let i=0;i<2;i++){
    const q=Generator.instantiate(t);
    h+='<td><div>'+q.stemText+' <b>⇒ '+q.display+'</b></div><div class="d">'+(q.diagramSvg||'(空)')+'</div>';
    if(q.optionsSvg)h+='<div class="optsv">'+q.optionsSvg.map((s,k)=>'<div class="d">'+'ABCD'[k]+'<br>'+s+'</div>').join('')+'</div>';
    h+='</td>';
  }
  h+='</tr></table>';
}
h+='<p style="color:#888">共 '+figs.length+' 个配图模板</p>';
fs.writeFileSync(path.join(root,'tools/_figs-preview.html'),h,'utf8');
console.log('已生成 tools/_figs-preview.html，配图模板 '+figs.length+' 个');
