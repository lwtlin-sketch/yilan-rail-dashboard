(function(){
function lbl(i){if(i?.conditional||i?.dueType==='external')return '<span class="timeline-pill deadline-external">外部／條件式</span>';if(i?.dueType==='management')return '<span class="timeline-pill deadline-management">管理預估期限</span>';if(i?.dueType==='contract')return '<span class="timeline-pill deadline-contract">契約期限</span>';return '<span class="timeline-pill deadline-external">外部／條件式</span>'}
function days(i){if(i?.conditional)return '—';if(i?.days!=null)return `${i.days}日曆天`;return '—'}
function fmt(d){return typeof r3Fmt==='function'?r3Fmt(d):(d?d.toISOString().slice(0,10).replaceAll('-','/'):'-')}
function pred(id,m){return typeof r3HumanName==='function'?r3HumanName(id,m):(!id?'—':(m?.[id]?.name||id))}
function stat(i){if(typeof r3Status==='function'){const s=r3Status(i);return `<span class="timeline-pill ${s.cls}">${s.text}</span>`}return '—'}
function patch(){
 if(typeof r3Build!=='function')return;
 const table=document.getElementById('dependencyTable');if(!table)return;
 const data=r3Build(),thead=table.querySelector('thead'),tbody=table.querySelector('tbody');
 if(thead)thead.innerHTML='<tr><th>類別</th><th>工作／成果</th><th>前置節點</th><th>期限性質</th><th>契約日數</th><th>基準日期</th><th>目前日期</th><th>延誤判讀</th><th>付款連動</th></tr>';
 if(!tbody)return;
 tbody.innerHTML=data.list.map(i=>`<tr><td>${i.group||''}</td><td><b>${i.name}</b><div class="small">${i.note||''}${i.dueType==='management'?'<br>前置節點尚未實際核定，目前日期屬管理預估。':''}${i.conditional?'<br>條件式節點，不自行推算契約期限。':''}</div></td><td>${pred(i.predecessor,data.model)}</td><td>${lbl(i)}</td><td>${days(i)}</td><td>${fmt(i.due)}</td><td>${fmt(i.due)}</td><td>${stat(i)}</td><td>${i.payment||'—'}</td></tr>`).join('');
}
window.addEventListener('load',()=>{[300,700,1400].forEach(ms=>setTimeout(patch,ms));const d=document.getElementById('dependencyTable'),s=document.getElementById('scheduleTable');const o=new MutationObserver(()=>{clearTimeout(window.__s2tier);window.__s2tier=setTimeout(patch,100)});if(d)o.observe(d,{childList:true,subtree:true});if(s)o.observe(s,{childList:true,subtree:true});document.addEventListener('change',e=>{const ids=['signDate','awardDate','noticeDate','pccDate','tenderApprovalDate','allWorksAwardDate','allWorksCloseDate','pcmDays','projectSelect'];if(ids.includes(e.target.id)||e.target.closest?.('#scheduleTable'))setTimeout(patch,120)})});
})();