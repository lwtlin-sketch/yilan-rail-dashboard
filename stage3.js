function r3ParseDate(text){if(!text)return null;const m=String(text).match(/(\d{4})[\/-](\d{2})[\/-](\d{2})/);if(!m)return null;return new Date(+m[1],+m[2]-1,+m[3],12,0,0,0)}
function r3Fmt(d){if(!d)return '-';return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`}
function r3Add(d,n){if(!d)return null;const x=new Date(d);x.setDate(x.getDate()+Number(n||0));x.setHours(12,0,0,0);return x}
function r3Days(a,b){if(!a||!b)return null;const x=new Date(a),y=new Date(b);x.setHours(12,0,0,0);y.setHours(12,0,0,0);return Math.round((y-x)/86400000)}
function r3Field(id){const e=document.getElementById(id);return e?.value?r3ParseDate(e.value):null}
function r3Project(){return document.getElementById('projectSelect')?.value||current?.id||'south'}
function r3Actual(id,k){return typeof actual==='function'?actual(id,k):null}
function r3Build(){
 if(!window.YilanRules)return{list:[],model:{},pcm:30};
 const rules=window.YilanRules.getRules(r3Project()),pcm=Number(document.getElementById('pcmDays')?.value||30),sign=r3Field('signDate'),award=r3Field('awardDate'),notice=r3Field('noticeDate'),model={sign:{id:'sign',name:'契約簽訂',due:sign,approval:sign,actual:sign}},list=[];
 for(const rule of rules){
  let base=null,due=null,actualSubmit=r3Actual(rule.id,'submit'),actualApproval=r3Actual(rule.id,'approval');
  if(rule.triggerType==='signDate'){base=sign;due=r3Add(base,rule.days)}
  if(rule.triggerType==='awardDate'){base=award;due=r3Add(base,rule.days)}
  if(rule.triggerType==='approvalOf'){const ref=model[rule.triggerRef];base=ref?.actualApproval||ref?.approval||null;due=r3Add(base,rule.days)}
  if(rule.triggerType==='basicApprovalOrNotice'){const ref=model[rule.triggerRef];base=notice||ref?.actualApproval||ref?.approval||null;due=r3Add(base,rule.days)}
  if(rule.triggerType==='sameAs'){const ref=model[rule.triggerRef];base=ref?.base||null;due=ref?.due||null}
  if(rule.triggerType==='externalDate')due=r3Field(rule.dateField)
  if(rule.triggerType==='eventAfter'){const ref=model[rule.triggerRef];base=ref?.actual||ref?.due||null;due=rule.days!=null?r3Add(base,rule.days):base}
  if(rule.triggerType==='externalNotice'){base=null;due=null}
  const approval=rule.contractRule&&due?(actualApproval||r3Add(actualSubmit||due,pcm)):(actualApproval||due);
  const item={...rule,base,due,approval,actualSubmit,actualApproval,actual:actualApproval||actualSubmit||null};
  model[rule.id]=item;list.push(item)
 }
 return{list,model,pcm,projectId:r3Project()}
}
function r3Status(item){
 const today=new Date();today.setHours(12,0,0,0);
 if(item.actualApproval){const d=item.due?r3Days(item.due,item.actualApproval):null;if(d!==null&&d>0)return{text:`核定晚 ${d} 日`,cls:'tl-danger'};return{text:'已核定',cls:'tl-done'}}
 if(item.actualSubmit){const d=item.due?r3Days(item.due,item.actualSubmit):null;if(d!==null&&d>0)return{text:`提送晚 ${d} 日`,cls:'tl-danger'};return{text:'已提送待核定',cls:'tl-warning'}}
 if(!item.due)return{text:'待通知／外部日期',cls:'tl-external'};
 const remain=r3Days(today,item.due);
 if(remain<0)return{text:`逾期 ${Math.abs(remain)} 日`,cls:'tl-danger'};
 if(remain<=14)return{text:`${remain} 日內到期`,cls:'tl-warning'};
 if(remain<=30)return{text:`${remain} 日內到期`,cls:'tl-normal'};
 return{text:'管制中',cls:'tl-normal'}
}
function renderStage3(){
 const root=document.getElementById('contractRuleControl');if(!root)return;
 const data=r3Build(),tbody=document.querySelector('#contractRuleTable tbody');
 const set=(id,t)=>{const e=document.getElementById(id);if(e)e.textContent=t};
 set('r3ProjectName',document.getElementById('projectSelect')?.selectedOptions?.[0]?.textContent||data.projectId);
 set('r3RuleCount',`${data.list.filter(x=>x.contractRule).length} 項`);
 set('r3ExternalCount',`${data.list.filter(x=>!x.contractRule).length} 項`);
 const dates=data.list.map(x=>x.due).filter(Boolean);set('r3LastDue',dates.length?r3Fmt(new Date(Math.max(...dates.map(d=>d.getTime())))):'-');
 if(tbody)tbody.innerHTML=data.list.map(item=>{const st=r3Status(item),nature=item.contractRule?(item.days!=null?`${item.days}日曆天`:'契約節點'):'外部／事件節點';return `<tr><td>${item.group||''}</td><td><b>${item.name}</b><div class="small">${item.note||''}</div></td><td>${item.predecessor||'—'}</td><td>${nature}</td><td>${r3Fmt(item.base)}</td><td>${r3Fmt(item.due)}</td><td>${item.actualSubmit?r3Fmt(item.actualSubmit):'-'}</td><td>${item.actualApproval?r3Fmt(item.actualApproval):'-'}</td><td><span class="timeline-pill ${st.cls}">${st.text}</span></td><td>${item.payment||'—'}</td></tr>`}).join('')
}
window.addEventListener('load',()=>{setTimeout(renderStage3,650);document.addEventListener('change',e=>{const ids=['signDate','awardDate','noticeDate','pccDate','tenderApprovalDate','allWorksAwardDate','allWorksCloseDate','pcmDays','projectSelect'];if(ids.includes(e.target.id)||e.target.closest?.('#scheduleTable'))setTimeout(renderStage3,150)})});
