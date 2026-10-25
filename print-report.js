(function(){
const $=id=>document.getElementById(id);let cuts=new Set();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function scores(){const a=[['Aceitável','#16c83b',0,0],['Menos crítico','#ffc000',0,0],['Crítico','#ff2929',0,0],['Muito crítico','#222',0,0]];passos.forEach(p=>[p,...(p.avaliacoes||[])].forEach(v=>{if(v.probabilidade===''||v.severidade===''||v.probabilidade==null||v.severidade==null)return;let n=Number(v.probabilidade)*Number(v.severidade),i=n<16?0:n<=168?1:n<=400?2:3;a[i][2]++;a[i][3]+=n}));return a}
function render(){
 const orient=$('prOrientation').value,mode=$('prMode').value,grades=scores();
 const f=(k,v)=>'<div class="field"><b>'+esc(k)+'</b><span>'+esc(v||'—')+'</span></div>';
 const info=Object.entries(header).map(([k,v])=>f(k,v)).join('');
 const steps=passos.map((p,i)=>{
 const fields=[['Descrição',p.descricao],['Perigo',p.perigo],['Risco',p.risco],['Dano potencial',p.dano],['EPI',p.epi],['Controle existente',p.controle],['Medidas de controle',p.medidas]].map(x=>f(...x)).join('');
 const assessments=[p,...(p.avaliacoes||[])].map((a,j)=>{const valid=a.probabilidade!==''&&a.severidade!==''&&a.probabilidade!=null&&a.severidade!=null,n=Number(a.probabilidade)*Number(a.severidade);return '<tr><td>'+(j+1)+'</td><td>'+esc(a.probabilidade||'—')+'</td><td>'+esc(a.severidade||'—')+'</td><td>'+(valid?n:'—')+'</td><td>'+(valid?esc(nivel(n)[0]):'—')+'</td><td>'+esc(a.acoes||'')+'</td><td>'+esc(a.responsavel||'')+'</td><td>'+esc(a.prazo||'')+'</td></tr>'}).join('');
 return '<section class="step '+(mode==='manual'&&cuts.has(i)?'breakpage':'')+'"><h2>Passo '+(i+1)+'</h2><div class="fields">'+fields+'</div>'+($('prPhotos').checked&&p.foto?'<img class="photo" src="'+esc(p.foto)+'">':'')+'<h3>Avaliações de risco</h3><table><thead><tr><th>Aval.</th><th>Prob.</th><th>Sev.</th><th>NR</th><th>Classe</th><th>Ação recomendada</th><th>Responsável</th><th>Prazo</th></tr></thead><tbody>'+assessments+'</tbody></table></section>';
 }).join('');
 const total=grades.reduce((a,g)=>a+g[3],0),quantity=grades.reduce((a,g)=>a+g[2],0);
 const summary='<h2>Classificação dos riscos</h2><table><thead><tr><th>Classificação</th><th>Quantidade</th><th>Soma NR</th></tr></thead><tbody>'+grades.map(g=>'<tr><td><i style="display:inline-block;background:'+g[1]+';width:13px;height:13px;margin-right:8px"></i>'+g[0]+'</td><td>'+g[2]+'</td><td>'+g[3]+'</td></tr>').join('')+'<tr><th>TOTAL</th><th>'+quantity+'</th><th>'+total+'</th></tr></tbody></table>';
 const max=Math.max(1,...grades.map(g=>g[2]));
 const chart=$('prChart').checked?'<section class="chart"><h2>Gráfico dos resultados</h2>'+grades.map(g=>'<div class="bar"><span>'+g[0]+'</span><div class="track"><div style="height:100%;width:'+(g[2]/max*100)+'%;background:'+g[1]+'"></div></div><b>'+g[2]+'</b></div>').join('')+'</section>':'';
 const width=orient==='portrait'?210:297,height=orient==='portrait'?297:210;
 const style='*{box-sizing:border-box}body{font:12px Arial;color:#16263d;background:#dee3ec;margin:0}.paper{background:#fff;width:'+width+'mm;min-height:'+height+'mm;margin:18px auto;padding:12mm;box-shadow:0 2px 12px #9aa5b4}.head{display:flex;align-items:center;gap:14px;border-bottom:3px solid #165ca4;padding-bottom:10px}.head img{width:85px}.head h1{font-size:19px;margin:0}.fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.field{white-space:pre-wrap;overflow-wrap:anywhere;display:flex;flex-direction:column;padding:5px;border-bottom:1px solid #dde4ed}.field b{font-size:11px;color:#56667a}.step{border:1px solid #c8d5e5;padding:10px;margin:12px 0;break-inside:avoid-page}h2{font-size:15px;color:#174a79}h3{font-size:13px}.photo{max-width:220px;max-height:160px;object-fit:contain;margin:8px}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px}th,td{padding:5px;border:1px solid #c5cfdd;vertical-align:top;text-align:left;overflow-wrap:anywhere}th{background:#eaf1fb}.bar{display:flex;align-items:center;gap:9px;margin:10px 0}.bar span{width:130px}.bar .track{flex:1;height:22px;background:#eee}.bar b{width:22px}.chart{break-inside:avoid-page}.breakpage{page-break-before:always;break-before:page}@page{size:A4 '+orient+';margin:10mm}@media print{body{background:white}.paper{margin:0;padding:0;min-height:0;width:auto;box-shadow:none}.step{break-inside:avoid-page}}';
 return '<!doctype html><html><head><meta charset="utf-8"><base href="'+esc(location.href.split('?')[0])+'"><style>'+style+'</style></head><body><div class="paper"><div class="head"><img src="method-flow.png"><div><h1>ART — Análise de Risco da Tarefa</h1><p>Method Flow · FO-EHS-37 · Matriz Safhear</p></div></div><section class="fields">'+info+'</section>'+steps+summary+chart+'</div></body></html>';
}
function preview(after){
 const frame=$('prPreview');frame.onload=()=>{
 try{if($('prMode').value==='single'){const doc=frame.contentDocument,paper=doc.querySelector('.paper'),portrait=$('prOrientation').value==='portrait',scale=Math.min(1,(portrait?277:190)*96/25.4/paper.scrollHeight,(portrait?190:277)*96/25.4/paper.scrollWidth);paper.style.zoom=String(scale);paper.style.minHeight='0';paper.style.margin='0'}
 if(after)after(frame.contentWindow)}catch(e){alert('Falha na prévia: '+e.message)}
 };
 frame.srcdoc=render();
}
function mode(){$('prBreaks').style.display=$('prMode').value==='manual'?'block':'none';preview()}
function open(){capture();$('prModal').style.display='flex';cuts=new Set([...cuts].filter(i=>i>0&&i<passos.length));$('prBreakList').innerHTML=passos.map((p,i)=>i?'<label><input type="checkbox" data-idx="'+i+'" '+(cuts.has(i)?'checked':'')+'> Antes do passo '+(i+1)+'</label>':'').join('');$('prBreakList').querySelectorAll('input').forEach(input=>input.onchange=()=>{const i=Number(input.dataset.idx);input.checked?cuts.add(i):cuts.delete(i);preview()});mode()}
function close(){$('prModal').style.display='none'}
window.printSetup={open,close,preview,mode,print(){preview(w=>{w.focus();w.print()})}};
})();