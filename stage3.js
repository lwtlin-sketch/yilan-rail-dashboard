/* =========================================================
   宜蘭高架履約管制系統 Stage 3
   契約時限主檔（設計階段）
   單一規則來源：rules.js
   ========================================================= */

function r3ParseDate(text){
  if(!text) return null;
  const m=String(text).match(/(\d{4})[\/-](\d{2})[\/-](\d{2})/);
  if(!m) return null;
  return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12,0,0,0);
}

function r3Fmt(d){
  if(!d) return '-';
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function r3Add(d,n){
  if(!d || n==null) return null;
  const x=new Date(d);
  x.setDate(x.getDate()+Number(n));
  x.setHours(12,0,0,0);
  return x;
}

function r3Days(a,b){
  if(!a||!b) return null;
  const x=new Date(a),y=new Date(b);
  x.setHours(12,0,0,0);
  y.setHours(12,0,0,0);
  return Math.round((y-x)/86400000);
}

function r3Field(id){
  const e=document.getElementById(id);
  return e?.value ? r3ParseDate(e.value) : null;
}

function r3Project(){
  return document.getElementById('projectSelect')?.value || window.current?.id || 'south';
}

function r3Actual(id,k){
  return typeof actual==='function' ? actual(id,k) : null;
}

function r3HumanName(id,model){
  if(!id) return '—';
  if(id==='sign') return '契約簽訂';
  if(id==='award') return '決標';
  if(id==='noticeDate') return '甲方通知';
  return model[id]?.name || id;
}

function r3Build(){
  if(!window.YilanRules) return {list:[],model:{},pcm:30,projectId:r3Project()};

  const rules=window.YilanRules.getRules(r3Project());
  const pcm=Number(document.getElementById('pcmDays')?.value||30);
  const sign=r3Field('signDate');
  const award=r3Field('awardDate');
  const notice=r3Field('noticeDate');

  const model={
    sign:{id:'sign',name:'契約簽訂',group:'契約',base:sign,due:sign,approval:sign,actual:sign,actualApproval:sign}
  };
  const list=[];

  for(const rule of rules){
    let base=null;
    let due=null;

    const actualSubmit=r3Actual(rule.id,'submit');
    const actualApproval=r3Actual(rule.id,'approval');

    if(rule.triggerType==='signDate'){
      base=sign;
      due=r3Add(base,rule.days);
    }
    else if(rule.triggerType==='awardDate'){
      base=award;
      due=r3Add(base,rule.days);
    }
    else if(rule.triggerType==='approvalOf'){
      const ref=model[rule.triggerRef];
      base=ref?.actualApproval || ref?.approval || null;
      due=r3Add(base,rule.days);
    }
    else if(rule.triggerType==='basicApprovalOrNotice'){
      const ref=model[rule.triggerRef];
      base=notice || ref?.actualApproval || ref?.approval || null;
      due=r3Add(base,rule.days);
    }
    else if(rule.triggerType==='sameAs'){
      const ref=model[rule.triggerRef];
      base=ref?.base || null;
      due=ref?.due || null;
    }
    else if(rule.triggerType==='externalDate'){
      due=r3Field(rule.dateField);
    }
    else if(rule.triggerType==='eventAfter'){
      const ref=model[rule.triggerRef];
      base=ref?.actual || ref?.due || null;
      due=rule.days!=null ? r3Add(base,rule.days) : base;
    }
    else if(rule.triggerType==='externalNotice'){
      base=null;
      due=null;
    }
    else if(rule.triggerType==='conditionalAfterBasic'){
      const ref=model[rule.triggerRef];
      base=ref?.actualApproval || ref?.approval || null;
      /* 無固定日數，不自動計算 due */
      due=actualSubmit || null;
    }

    const approval=rule.contractRule && due
      ?(actualApproval || r3Add(actualSubmit || due,pcm))
      :(actualApproval || due);

    const item={...rule,base,due,approval,actualSubmit,actualApproval,actual:actualApproval||actualSubmit||null};
    model[rule.id]=item;
    list.push(item);
  }

  return {list,model,pcm,projectId:r3Project()};
}

function r3Status(item){
  const today=new Date();
  today.setHours(12,0,0,0);

  if(item.actualApproval){
    const d=item.due?r3Days(item.due,item.actualApproval):null;
    if(d!==null&&d>0) return {text:`核定晚 ${d} 日`,cls:'tl-danger'};
    return {text:'已核定',cls:'tl-done'};
  }

  if(item.actualSubmit){
    const d=item.due?r3Days(item.due,item.actualSubmit):null;
    if(d!==null&&d>0) return {text:`提送晚 ${d} 日`,cls:'tl-danger'};
    return {text:'已提送待核定',cls:'tl-warning'};
  }

  if(item.conditional && !item.due){
    return {text:item.applicability==='pending'?'條件式／待確認':'條件式',cls:'tl-external'};
  }

  if(!item.due) return {text:'待通知／外部日期',cls:'tl-external'};

  const remain=r3Days(today,item.due);
  if(remain<0) return {text:`逾期 ${Math.abs(remain)} 日`,cls:'tl-danger'};
  if(remain<=14) return {text:`${remain} 日內到期`,cls:'tl-warning'};
  if(remain<=30) return {text:`${remain} 日內到期`,cls:'tl-normal'};
  return {text:'管制中',cls:'tl-normal'};
}

function r3HideSupervision(){
  document.querySelectorAll('.supervision-details').forEach(el=>el.style.display='none');
  document.querySelectorAll('section.card').forEach(sec=>{
    const h2=sec.querySelector('.hd h2');
    if(h2 && h2.textContent.trim().startsWith('六、施工監造')) sec.style.display='none';
  });
}

function renderStage3(){
  const root=document.getElementById('contractRuleControl');
  if(!root) return;

  r3HideSupervision();
  const data=r3Build();
  const tbody=document.querySelector('#contractRuleTable tbody');

  const set=(id,t)=>{
    const e=document.getElementById(id);
    if(e) e.textContent=t;
  };

  set('r3ProjectName',document.getElementById('projectSelect')?.selectedOptions?.[0]?.textContent||data.projectId);
  set('r3RuleCount',`${data.list.filter(x=>x.contractRule).length} 項`);
  set('r3ExternalCount',`${data.list.filter(x=>!x.contractRule || x.conditional).length} 項`);

  const dates=data.list.filter(x=>x.contractRule && x.due && !x.conditional).map(x=>x.due);
  set('r3LastDue',dates.length?r3Fmt(new Date(Math.max(...dates.map(d=>d.getTime())))):'-');

  if(tbody){
    tbody.innerHTML=data.list.map(item=>{
      const st=r3Status(item);
      let nature='外部／事件節點';
      if(item.conditional) nature='條件式';
      else if(item.contractRule) nature=item.days!=null?`${item.days}日曆天`:'契約節點';

      return `<tr>
        <td>${item.group||''}</td>
        <td><b>${item.name}</b><div class="small">${item.note||''}</div></td>
        <td>${r3HumanName(item.predecessor,data.model)}</td>
        <td>${nature}</td>
        <td>${r3Fmt(item.base)}</td>
        <td>${r3Fmt(item.due)}</td>
        <td>${item.actualSubmit?r3Fmt(item.actualSubmit):'-'}</td>
        <td>${item.actualApproval?r3Fmt(item.actualApproval):'-'}</td>
        <td><span class="timeline-pill ${st.cls}">${st.text}</span></td>
        <td>${item.payment||'—'}</td>
      </tr>`;
    }).join('');
  }
}

const r3Observer=new MutationObserver(()=>{
  clearTimeout(window.__r3Timer);
  window.__r3Timer=setTimeout(renderStage3,120);
});

window.addEventListener('load',()=>{
  r3HideSupervision();
  [250,600,1200,2000].forEach(ms=>setTimeout(renderStage3,ms));

  const schedule=document.getElementById('scheduleTable');
  const payment=document.getElementById('paymentTable');
  if(schedule) r3Observer.observe(schedule,{childList:true,subtree:true});
  if(payment) r3Observer.observe(payment,{childList:true,subtree:true});

  document.addEventListener('change',e=>{
    const ids=['signDate','awardDate','noticeDate','pccDate','tenderApprovalDate','allWorksAwardDate','allWorksCloseDate','pcmDays','projectSelect'];
    if(ids.includes(e.target.id)||e.target.closest?.('#scheduleTable')) setTimeout(renderStage3,150);
  });
});
