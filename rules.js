/* =========================================================
   宜蘭高架履約管制系統 Stage 3（單一規則來源收斂版）
   目的：
   1. 契約時限主檔直接讀 rules.js
   2. 「三、設計階段履約主時程」改讀 rules.js
   3. Dashboard 改讀 rules.js，不再固定 9 項
   4. 付款公式維持 app.js 現況
   5. 監造規則保留但不顯示
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
  if(!d) return null;
  const x=new Date(d);
  x.setDate(x.getDate()+Number(n||0));
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

/* ---------------------------------------------------------
   單一時程模型
   --------------------------------------------------------- */
function r3Build(){
  if(!window.YilanRules){
    return {list:[],model:{},pcm:30,projectId:r3Project()};
  }

  const rules=window.YilanRules.getRules(r3Project());
  const pcm=Number(document.getElementById('pcmDays')?.value||30);
  const sign=r3Field('signDate');
  const award=r3Field('awardDate');
  const notice=r3Field('noticeDate');

  const model={
    sign:{
      id:'sign',
      name:'契約簽訂',
      group:'契約',
      base:sign,
      due:sign,
      approval:sign,
      actual:sign,
      actualApproval:sign
    },
    award:{
      id:'award',
      name:'決標',
      group:'契約',
      base:award,
      due:award,
      approval:award,
      actual:award,
      actualApproval:award
    }
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
      /* 尚未設通知日欄位：保留規則，不臆定日期 */
      base=null;
      due=null;
    }

    else if(rule.triggerType==='conditional'){
      const ref=model[rule.triggerRef];
      base=ref?.actualApproval || ref?.approval || null;
      due=null;
    }

    const approval=
      rule.contractRule && due
        ?(
            actualApproval ||
            r3Add(actualSubmit || due,pcm)
          )
        :(
            actualApproval || due
          );

    const item={
      ...rule,
      base,
      due,
      approval,
      actualSubmit,
      actualApproval,
      actual:actualApproval || actualSubmit || null
    };

    model[rule.id]=item;
    list.push(item);
  }

  return {list,model,pcm,projectId:r3Project()};
}

function r3Status(item){
  const today=new Date();
  today.setHours(12,0,0,0);

  if(item.conditional){
    return {text:'條件式／待確認',cls:'tl-external'};
  }

  if(item.actualApproval){
    const d=item.due ? r3Days(item.due,item.actualApproval) : null;
    if(d!==null && d>0){
      return {text:`核定晚 ${d} 日`,cls:'tl-danger'};
    }
    return {text:'已核定',cls:'tl-done'};
  }

  if(item.actualSubmit){
    const d=item.due ? r3Days(item.due,item.actualSubmit) : null;
    if(d!==null && d>0){
      return {text:`提送晚 ${d} 日`,cls:'tl-danger'};
    }
    return {text:'已提送待核定',cls:'tl-warning'};
  }

  if(!item.due){
    return {text:'待通知／外部日期',cls:'tl-external'};
  }

  const remain=r3Days(today,item.due);

  if(remain<0) return {text:`逾期 ${Math.abs(remain)} 日`,cls:'tl-danger'};
  if(remain<=14) return {text:`${remain} 日內到期`,cls:'tl-warning'};
  if(remain<=30) return {text:`${remain} 日內到期`,cls:'tl-normal'};

  return {text:'管制中',cls:'tl-normal'};
}

function r3Nature(item){
  if(item.conditional) return '條件式';

  if(item.contractRule){
    return item.days!=null
      ?`${item.days}日曆天`
      :'契約節點';
  }

  return '外部／事件節點';
}

/* ---------------------------------------------------------
   主時程改讀 rules.js
   --------------------------------------------------------- */
function r3ActualField(id,kind){
  const key=id+'_'+kind;
  return `<input type="date" value="${window.rows?.[key]||''}" onchange="rows['${key}']=this.value;recalc()">`;
}

function r3RenderMainSchedule(data){
  const tbody=document.querySelector('#scheduleTable tbody');
  if(!tbody) return {};

  const c={};

  tbody.innerHTML=data.list.map(item=>{
    c[item.id+'Deadline']=item.due;
    c[item.id+'Submit']=item.actualSubmit || item.due;
    c[item.id+'Approval']=item.approval;

    const pred=r3HumanName(item.predecessor,data.model);
    const st=r3Status(item);

    const allowInputs =
      item.contractRule ||
      item.triggerType==='externalDate' ||
      item.conditional;

    const submitCell=allowInputs
      ?r3ActualField(item.id,'submit')
      :'-';

    const approvalCell=allowInputs
      ?(
          r3ActualField(item.id,'approval') +
          (
            item.approval && !item.actualApproval
              ?`<div class="small">預估：${r3Fmt(item.approval)}</div>`
              :''
          )
        )
      :'-';

    let note=item.note||'';

    if(item.conditional){
      note+=`<br><span class="small">條件式節點，不自動推算契約期限。</span>`;
    }else if(item.contractRule && item.due){
      note+=`<br><span class="small">未填核定日：採提送/期限＋PCM管理預估${data.pcm}日。</span>`;
    }

    return `
      <tr>
        <td class="center"><span class="pill p-blue">${item.group||''}</span></td>
        <td>${item.name}</td>
        <td>${pred}<br><span class="small">${r3Fmt(item.base)}</span></td>
        <td class="center">${r3Nature(item)}</td>
        <td class="center"><b>${r3Fmt(item.due)}</b></td>
        <td>${submitCell}</td>
        <td>${approvalCell}</td>
        <td class="center"><span class="timeline-pill ${st.cls}">${st.text}</span></td>
        <td>${note}</td>
      </tr>
    `;
  }).join('');

  return c;
}

/* ---------------------------------------------------------
   契約時限主檔
   --------------------------------------------------------- */
function r3RenderRuleTable(data){
  const tbody=document.querySelector('#contractRuleTable tbody');
  if(!tbody) return;

  tbody.innerHTML=data.list.map(item=>{
    const st=r3Status(item);
    const pred=r3HumanName(item.predecessor,data.model);

    return `
      <tr>
        <td>${item.group||''}</td>
        <td>
          <b>${item.name}</b>
          <div class="small">${item.note||''}</div>
        </td>
        <td>${pred}</td>
        <td>${r3Nature(item)}</td>
        <td>${r3Fmt(item.base)}</td>
        <td>${r3Fmt(item.due)}</td>
        <td>${item.actualSubmit ? r3Fmt(item.actualSubmit) : '-'}</td>
        <td>${item.actualApproval ? r3Fmt(item.actualApproval) : '-'}</td>
        <td><span class="timeline-pill ${st.cls}">${st.text}</span></td>
        <td>${item.payment||'—'}</td>
      </tr>
    `;
  }).join('');
}

function r3RenderSummary(data){
  const set=(id,t)=>{
    const e=document.getElementById(id);
    if(e) e.textContent=t;
  };

  set(
    'r3ProjectName',
    document.getElementById('projectSelect')?.selectedOptions?.[0]?.textContent || data.projectId
  );

  set(
    'r3RuleCount',
    `${data.list.filter(x=>x.contractRule).length} 項`
  );

  set(
    'r3ExternalCount',
    `${data.list.filter(x=>!x.contractRule || x.conditional).length} 項`
  );

  const dates=data.list
    .filter(x=>x.contractRule && x.due)
    .map(x=>x.due);

  set(
    'r3LastDue',
    dates.length
      ?r3Fmt(new Date(Math.max(...dates.map(d=>d.getTime()))))
      :'-'
  );

  const label=document.querySelector('#contractRuleControl .timeline-kpis > div:nth-child(3) span');
  if(label){
    label.textContent='外部／事件／條件式節點';
  }
}

/* ---------------------------------------------------------
   Dashboard 改讀 rules.js
   --------------------------------------------------------- */
function r3SetDashboard(id,text){
  const el=document.getElementById(id);
  if(el) el.textContent=text;
}

function r3Dashboard(data){
  if(!document.getElementById('overview')) return;

  const today=new Date();
  today.setHours(12,0,0,0);

  r3SetDashboard('overviewToday',r3Fmt(today));
  r3SetDashboard(
    'ovProject',
    document.getElementById('projectSelect')?.selectedOptions?.[0]?.textContent||'-'
  );
  r3SetDashboard(
    'ovSignDate',
    document.getElementById('signDate')?.value
      ?document.getElementById('signDate').value.replaceAll('-','/')
      :'-'
  );

  const countable=data.list.filter(x=>x.contractRule);

  let overdue=0;
  let due14=0;
  let due30=0;
  let pending=0;
  let completed=0;

  const important=[];

  for(const item of countable){
    if(item.actualApproval){
      completed++;
      continue;
    }

    if(item.actualSubmit && !item.actualApproval){
      pending++;
      important.push({
        item,
        label:'待核定',
        cls:'work-pending',
        sort:-1000
      });
      continue;
    }

    if(!item.due) continue;

    const diff=r3Days(today,item.due);

    if(diff<0){
      overdue++;
      important.push({
        item,
        label:`逾期 ${Math.abs(diff)} 日`,
        cls:'work-danger',
        sort:-10000+diff
      });
    }else if(diff<=14){
      due14++;
      important.push({
        item,
        label:diff===0?'今日到期':`${diff} 日內到期`,
        cls:'work-warning',
        sort:diff
      });
    }else if(diff<=30){
      due30++;
      important.push({
        item,
        label:`${diff} 日內到期`,
        cls:'work-info',
        sort:diff
      });
    }
  }

  r3SetDashboard('ovOverdue',overdue);
  r3SetDashboard('ovDue14',due14);
  r3SetDashboard('ovDue30',due30);
  r3SetDashboard('ovPendingApproval',pending);
  r3SetDashboard('ovCompleted',completed);

  let overall='正常管制';
  if(overdue>0) overall='有逾期事項';
  else if(due14>0) overall='有近期到期事項';
  else if(pending>0) overall='有成果待核定';

  r3SetDashboard('ovOverallStatus',overall);

  const total=countable.length;
  const progress=total?Math.round(completed/total*100):0;

  r3SetDashboard('ovProgress',`${progress}%`);
  r3SetDashboard('ovProgressText',`${completed} / ${total}`);

  const progressBar=document.getElementById('ovProgressBar');
  if(progressBar){
    progressBar.style.width=`${progress}%`;
  }

  important.sort((a,b)=>a.sort-b.sort);

  const importantBox=document.getElementById('ovImportantWorks');
  if(importantBox){
    importantBox.innerHTML=important.length
      ?important.slice(0,8).map(({item,label,cls})=>`
          <div class="work-item ${cls}">
            <div class="work-status">${label}</div>
            <div class="work-name">
              <b>${item.name}</b>
              <span>${item.actualSubmit?'已提送 '+r3Fmt(item.actualSubmit):'尚未提送'}</span>
            </div>
            <div class="work-date">
              契約期限<br>
              <b>${r3Fmt(item.due)}</b>
            </div>
          </div>
        `).join('')
      :'<div class="overview-empty">目前無逾期、待核定或30日內到期事項</div>';
  }

  const stageMap={};

  for(const item of countable){
    const stage=item.group||'其他';
    if(!stageMap[stage]){
      stageMap[stage]={total:0,done:0};
    }

    stageMap[stage].total++;
    if(item.actualApproval){
      stageMap[stage].done++;
    }
  }

  const stageBox=document.getElementById('ovStageList');
  if(stageBox){
    stageBox.innerHTML=Object.entries(stageMap).map(([stage,v])=>{
      const p=v.total?Math.round(v.done/v.total*100):0;
      return `
        <div class="stage-item">
          <span>${stage}</span>
          <b>${v.done}/${v.total}（${p}%）</b>
        </div>
      `;
    }).join('');
  }

  /* 付款摘要仍沿用 app.js 已算好的 paymentTable */
  if(typeof dashboardPaymentData==='function'){
    const pay=dashboardPaymentData();

    r3SetDashboard('ovPayReadyCount',`${pay.readyCount} 項`);
    r3SetDashboard('ovPayReadyAmount',`${Number(pay.readyAmount||0).toLocaleString('zh-TW')} 元`);
    r3SetDashboard('ovPayPendingAmount',`${Number(pay.pendingAmount||0).toLocaleString('zh-TW')} 元`);
    r3SetDashboard('ovNextPayDate',pay.nextPay ? r3Fmt(pay.nextPay) : '-');
  }
}

/* ---------------------------------------------------------
   監造：保留但不顯示
   --------------------------------------------------------- */
function r3HideSupervision(){
  document.querySelectorAll('.supervision-details').forEach(el=>{
    el.style.display='none';
  });

  document.querySelectorAll('section.card').forEach(sec=>{
    const h2=sec.querySelector('.hd h2');
    if(h2 && h2.textContent.trim().startsWith('六、施工監造')){
      sec.style.display='none';
    }
  });
}

/* ---------------------------------------------------------
   重新計算橋接
   app.js 的付款公式維持原狀，只把 computeSchedule 換成 rules.js
   --------------------------------------------------------- */
function r3InstallUnifiedSchedule(){
  if(typeof window.computeSchedule!=='function') return;

  window.computeSchedule=function(){
    const data=r3Build();
    return r3RenderMainSchedule(data);
  };
}

/* Stage3 整體刷新 */
function renderStage3Unified(){
  r3HideSupervision();

  const data=r3Build();

  r3RenderSummary(data);
  r3RenderRuleTable(data);
  r3Dashboard(data);
}

const r3Observer=new MutationObserver(()=>{
  clearTimeout(window.__r3UnifiedTimer);
  window.__r3UnifiedTimer=setTimeout(renderStage3Unified,100);
});

window.addEventListener('load',()=>{
  r3HideSupervision();
  r3InstallUnifiedSchedule();

  /*
    stage3.js 載入時 app.js 可能已經用舊 defs 畫過一次。
    這裡主動 recalc，再由新的 computeSchedule 重畫。
  */
  setTimeout(()=>{
    r3InstallUnifiedSchedule();

    if(typeof window.recalc==='function'){
      window.recalc();
    }

    renderStage3Unified();
  },250);

  [600,1200].forEach(ms=>{
    setTimeout(()=>{
      r3InstallUnifiedSchedule();
      renderStage3Unified();
    },ms);
  });

  const schedule=document.getElementById('scheduleTable');
  const payment=document.getElementById('paymentTable');

  if(schedule){
    r3Observer.observe(schedule,{childList:true,subtree:true});
  }

  if(payment){
    r3Observer.observe(payment,{childList:true,subtree:true});
  }

  document.addEventListener('change',e=>{
    const ids=[
      'signDate','awardDate','noticeDate','pccDate',
      'tenderApprovalDate','allWorksAwardDate',
      'allWorksCloseDate','pcmDays','projectSelect'
    ];

    if(ids.includes(e.target.id) || e.target.closest?.('#scheduleTable')){
      setTimeout(()=>{
        r3InstallUnifiedSchedule();

        if(typeof window.recalc==='function'){
          window.recalc();
        }

        renderStage3Unified();
      },100);
    }
  });
});
