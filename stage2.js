/* =========================================================
   宜蘭高架履約管制系統 第二階段
   甘特圖 / 前後置關聯 / 延誤影響 / 付款里程碑
   依既有 app.js 資料與表格運算，不改動原核心計算。
   ========================================================= */

const scRelatedMilestones = [
  {id:'valueEngineering',group:'配套成果',name:'價值工程研析報告',mirror:'basic',predecessor:'execPlan',deadlineType:'contract-linked',note:'併基本設計成果提送'},
  {id:'designRisk',group:'配套成果',name:'設計階段施工風險評估報告',mirror:'basic',predecessor:'execPlan',deadlineType:'contract-linked',note:'列為基本設計成果之一'},
  {id:'pcc',group:'審議',name:'工程會經費審議核定',dateField:'pccDate',predecessor:'basic',deadlineType:'external',payment:'工程設計5%（累計45%）',note:'契約未訂統一固定日數，以實際核定日列管'},
  {id:'tender',group:'招標',name:'招標文件成果核定',dateField:'tenderApprovalDate',predecessor:'final',deadlineType:'external',payment:'工程設計5%（累計90%）',note:'付款節點；未訂統一固定日數'},
  {id:'worksAward',group:'招標',name:'各分標工程全部決標',dateField:'allWorksAwardDate',predecessor:'tender',deadlineType:'external',payment:'工程設計5%（累計95%）',note:'依各標工程預算比例支付'},
  {id:'riskUpdate',group:'施工前置',name:'施工標決標後施工風險簡報／進版更新',eventFrom:'worksAward',predecessor:'worksAward',deadlineType:'event',note:'施工標決標後辦理；契約未訂固定日數'},
  {id:'close',group:'完工',name:'全部工程竣工驗收、結算且無待解決事項',dateField:'allWorksCloseDate',predecessor:'worksAward',deadlineType:'external',payment:'工程設計尾款至100%',note:'契約完成及設計尾款節點'}
];

const scSupervisionRules = [
  {name:'工程保險',contractor:'開工前完成',reviewDays:5,note:'監造收件後5日內審查完成'},
  {name:'河川建造物及公地使用申請（含展期）',contractor:'施工前60日提出',reviewDays:10,note:'監造收件後10日內審查完成'},
  {name:'品質計畫',contractor:'依本局工程施工品質管理作業規定提出',reviewDays:10,note:'監造收件後10日內審查完成'},
  {name:'逕流廢水污染削減計畫',contractor:'施工前提出',reviewDays:10,note:'監造收件後10日內審查完成'},
  {name:'職業安全衛生管理計畫',contractor:'施工前提出',reviewDays:10,note:'監造收件後10日內審查完成'},
  {name:'環境保護執行計畫',contractor:'施工前提出',reviewDays:10,note:'監造收件後10日內審查完成'}
];

function scParseDate(text){
  if(!text) return null;
  const m=String(text).match(/(\d{4})[\/-](\d{2})[\/-](\d{2})/);
  if(!m) return null;
  return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12,0,0,0);
}
function scFormatDate(d){
  if(!d) return '-';
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}
function scAddDays(d,n){
  if(!d) return null;
  const x=new Date(d);
  x.setDate(x.getDate()+Number(n||0));
  x.setHours(12,0,0,0);
  return x;
}
function scDays(a,b){
  if(!a||!b) return null;
  const x=new Date(a),y=new Date(b);
  x.setHours(12,0,0,0);y.setHours(12,0,0,0);
  return Math.round((y-x)/86400000);
}
function scFieldDate(id){
  const el=document.getElementById(id);
  return el?.value?scParseDate(el.value):null;
}
function scToday(){
  const d=new Date();d.setHours(12,0,0,0);return d;
}
function scNumber(text){
  return Number(String(text||'').replace(/[^\d.-]/g,''))||0;
}

function scBuildModel(){
  if(typeof defs==='undefined' || typeof actual!=='function') return {list:[],model:{},pcm:30};

  const pcm=Number(document.getElementById('pcmDays')?.value||30);
  const sign=scFieldDate('signDate');
  const model={},list=[];

  model.sign={id:'sign',group:'契約',name:'契約簽訂',baselineStart:sign,baselineDue:sign,forecastStart:sign,forecastDue:sign,forecastApproval:sign,actual:sign,predecessor:null,deadlineType:'contract',payment:'工程設計10%（累計10%）',note:'設計工作起算基準'};
  list.push(model.sign);

  for(const d of defs){
    let baseBaseline=null,baseForecast=null,predecessor=null;

    if(d.base==='sign'){
      baseBaseline=sign;baseForecast=sign;predecessor='sign';
    }else if(d.base==='execPlanApproval'){
      baseBaseline=model.execPlan?.baselineApproval||null;
      baseForecast=model.execPlan?.forecastApproval||null;
      predecessor='execPlan';
    }else if(d.base==='surveyPlanApproval'){
      baseBaseline=model.surveyPlan?.baselineApproval||null;
      baseForecast=model.surveyPlan?.forecastApproval||null;
      predecessor='surveyPlan';
    }else if(d.base==='geoPlanApproval'){
      baseBaseline=model.geoPlan?.baselineApproval||null;
      baseForecast=model.geoPlan?.forecastApproval||null;
      predecessor='geoPlan';
    }else if(d.base==='utilityPlanApproval'){
      baseBaseline=model.utilityPlan?.baselineApproval||null;
      baseForecast=model.utilityPlan?.forecastApproval||null;
      predecessor='utilityPlan';
    }else if(d.base==='finalBase'){
      const notice=scFieldDate('noticeDate');
      baseBaseline=notice||model.basic?.baselineApproval||null;
      baseForecast=notice||model.basic?.forecastApproval||null;
      predecessor=notice?'noticeDate':'basic';
    }

    const baselineDue=scAddDays(baseBaseline,d.days);
    const baselineApproval=scAddDays(baselineDue,pcm);
    const actualSubmit=actual(d.id,'submit');
    const actualApproval=actual(d.id,'approval');
    const forecastDue=actualSubmit||scAddDays(baseForecast,d.days);
    const forecastApproval=actualApproval||scAddDays(forecastDue,pcm);

    const item={
      id:d.id,group:d.stage,name:d.name,
      baselineStart:baseBaseline,baselineDue,baselineApproval,
      forecastStart:baseForecast,forecastDue,forecastApproval,
      actualSubmit,actualApproval,actual:actualApproval||actualSubmit||null,
      predecessor,deadlineType:'contract',contractDays:d.days,
      payment:d.id==='execPlan'?'工程設計10%（累計20%）':d.id==='basic'?'工程設計20%（累計40%）':d.id==='final'?'工程設計40%（累計85%）':'',
      note:d.basis
    };
    model[d.id]=item;list.push(item);
  }

  for(const r of scRelatedMilestones){
    let item=null;
    if(r.mirror && model[r.mirror]){
      const src=model[r.mirror];
      item={...r,baselineStart:src.baselineStart,baselineDue:src.baselineDue,forecastStart:src.forecastStart,forecastDue:src.forecastDue,actual:src.actual,forecastApproval:src.forecastApproval};
    }else if(r.dateField){
      const actualDate=scFieldDate(r.dateField);
      const pred=model[r.predecessor];
      item={...r,baselineStart:pred?.baselineDue||null,baselineDue:null,forecastStart:pred?.forecastDue||null,forecastDue:actualDate,actual:actualDate,forecastApproval:actualDate};
    }else if(r.eventFrom){
      const pred=model[r.eventFrom];
      const eventDate=pred?.actual||pred?.forecastDue||null;
      item={...r,baselineStart:null,baselineDue:null,forecastStart:eventDate,forecastDue:eventDate,actual:null,forecastApproval:eventDate};
    }
    if(item){model[r.id]=item;list.push(item);}
  }

  return {list,model,pcm};
}

function scStatus(item){
  const today=scToday();
  if(item.actual){
    if(item.baselineDue){
      const delay=scDays(item.baselineDue,item.actual);
      if(delay>0)return{text:`實際晚 ${delay} 日`,cls:'tl-danger',delay};
      return{text:'已完成／已登錄',cls:'tl-done',delay:Math.max(0,delay||0)};
    }
    return{text:'已登錄',cls:'tl-done',delay:0};
  }
  if(!item.forecastDue)return{text:'待外部日期',cls:'tl-external',delay:null};
  if(item.baselineDue){
    const delay=scDays(item.baselineDue,item.forecastDue);
    if(delay>0)return{text:`預估延後 ${delay} 日`,cls:'tl-danger',delay};
    const remain=scDays(today,item.forecastDue);
    if(remain<0)return{text:`逾期 ${Math.abs(remain)} 日`,cls:'tl-danger',delay:0};
    if(remain<=14)return{text:`${remain} 日內到期`,cls:'tl-warning',delay:0};
    return{text:'依基準推估',cls:'tl-normal',delay:0};
  }
  return{text:'外部／事件節點',cls:'tl-external',delay:null};
}

function scSet(id,text){
  const el=document.getElementById(id);if(el)el.textContent=text;
}

function scRenderSummary(data){
  const sign=data.list.find(x=>x.id==='sign')?.forecastDue||null;
  const dated=data.list.map(x=>x.forecastDue).filter(Boolean);
  const end=dated.length?new Date(Math.max(...dated.map(d=>d.getTime()))):null;
  const delayed=data.list.filter(x=>(scStatus(x).delay||0)>0);
  const maxDelay=delayed.length?Math.max(...delayed.map(x=>scStatus(x).delay||0)):0;
  scSet('tlStartDate',scFormatDate(sign));
  scSet('tlForecastFinish',scFormatDate(end));
  scSet('tlDelayDays',`${maxDelay} 日`);
  scSet('tlAffectedCount',`${delayed.length} 項`);
}

function scRenderGantt(data){
  const box=document.getElementById('ganttChart');if(!box)return;
  const items=data.list.filter(x=>x.id!=='sign'&&(x.baselineDue||x.forecastDue));
  const dates=[];
  items.forEach(x=>[x.baselineStart,x.baselineDue,x.forecastStart,x.forecastDue].forEach(d=>{if(d)dates.push(d.getTime())}));
  if(!dates.length){box.innerHTML='<div class="timeline-empty">尚無足夠日期可繪製甘特圖。</div>';return;}

  let min=new Date(Math.min(...dates)),max=new Date(Math.max(...dates));
  min.setDate(min.getDate()-10);max.setDate(max.getDate()+20);
  const total=Math.max(1,scDays(min,max));
  const pos=d=>d?Math.max(0,Math.min(100,scDays(min,d)/total*100)):null;

  const ticks=[];let tick=new Date(min.getFullYear(),min.getMonth(),1,12);
  if(tick<min)tick.setMonth(tick.getMonth()+1);
  while(tick<=max){
    ticks.push({left:pos(tick),label:`${tick.getFullYear()}/${String(tick.getMonth()+1).padStart(2,'0')}`});
    tick.setMonth(tick.getMonth()+1);
  }

  box.innerHTML=`
    <div class="gantt-axis"><div class="gantt-label-head">工作／成果</div><div class="gantt-axis-track">${ticks.map(t=>`<span class="gantt-tick" style="left:${t.left}%"><i></i><b>${t.label}</b></span>`).join('')}</div></div>
    ${items.map(item=>{
      const bs=pos(item.baselineStart),be=pos(item.baselineDue),fs=pos(item.forecastStart||item.baselineStart),fe=pos(item.forecastDue),st=scStatus(item);
      const base=(bs!==null&&be!==null)?`<div class="gantt-bar baseline" style="left:${bs}%;width:${Math.max(.6,be-bs)}%"></div>`:'';
      const forecast=(fs!==null&&fe!==null)?`<div class="gantt-bar forecast ${st.cls}" style="left:${fs}%;width:${Math.max(.6,fe-fs)}%"></div>`:'';
      const milestone=(fe!==null&&(!item.baselineStart||fe===fs))?`<span class="gantt-milestone ${st.cls}" style="left:${fe}%"></span>`:'';
      return `<div class="gantt-row"><div class="gantt-label"><small>${item.group||''}</small><b>${item.name}</b><span>${st.text}</span></div><div class="gantt-track">${ticks.map(t=>`<i class="gantt-gridline" style="left:${t.left}%"></i>`).join('')}${base}${forecast}${milestone}</div></div>`;
    }).join('')}
    <div class="gantt-legend"><span><i class="legend-base"></i>契約／管理基準</span><span><i class="legend-forecast"></i>目前預估／實際</span><span class="small">前置成果核定日未填時，採 PCM ${data.pcm} 日作管理預估，不視為契約明定審查期限。</span></div>`;
}

function scRenderDependency(data){
  const tbody=document.querySelector('#dependencyTable tbody');if(!tbody)return;
  tbody.innerHTML=data.list.filter(x=>x.id!=='sign').map(item=>{
    const pred=item.predecessor?(data.model[item.predecessor]?.name||item.predecessor):'—';
    const st=scStatus(item);
    const nature=item.deadlineType==='contract'?(item.contractDays?item.contractDays+'日':'契約節點'):item.deadlineType==='contract-linked'?'併同成果':item.deadlineType==='event'?'事件觸發':'外部日期';
    return `<tr><td>${item.group||''}</td><td><b>${item.name}</b><div class="small">${item.note||''}</div></td><td>${pred}</td><td>${nature}</td><td>${scFormatDate(item.baselineDue)}</td><td>${scFormatDate(item.forecastDue)}</td><td><span class="timeline-pill ${st.cls}">${st.text}</span></td><td>${item.payment||'—'}</td></tr>`;
  }).join('');
}

function scRenderDelay(data){
  const box=document.getElementById('delayImpactBox');if(!box)return;
  const affected=data.list.filter(x=>(scStatus(x).delay||0)>0).sort((a,b)=>(scStatus(b).delay||0)-(scStatus(a).delay||0));
  if(!affected.length){
    box.innerHTML='<div class="delay-ok"><b>目前未偵測到由已登錄日期造成的後續延誤。</b><span>後續若輸入實際提送／核定日晚於原基準，系統會依前後置關係重新推估受影響節點。</span></div>';
    return;
  }
  box.innerHTML=affected.map(x=>{const st=scStatus(x);return `<div class="delay-item"><div><b>${x.name}</b><span>${x.group||''}</span></div><strong>+${st.delay} 日</strong><small>基準 ${scFormatDate(x.baselineDue)} → 目前 ${scFormatDate(x.forecastDue)}</small></div>`}).join('');
}

function scRenderPayment(){
  const box=document.getElementById('paymentMilestoneStrip');if(!box)return;
  const milestones=[...document.querySelectorAll('#paymentTable tbody tr')].map(tr=>{
    const td=tr.querySelectorAll('td');if(td.length<6)return null;
    return {name:td[1].innerText.trim(),ratio:td[2].innerText.trim(),trigger:scParseDate(td[3].innerText),payDate:scParseDate(td[4].innerText),amount:scNumber(td[5].innerText)};
  }).filter(Boolean);
  box.innerHTML=milestones.map(m=>{
    const reached=m.trigger&&m.trigger<=scToday();
    return `<div class="pay-node ${reached?'reached':''}"><div class="pay-dot"></div><b>${m.name}</b><span>${m.ratio}｜${Number(m.amount).toLocaleString('zh-TW')} 元</span><small>條件：${scFormatDate(m.trigger)}<br>付款：${scFormatDate(m.payDate)}</small></div>`;
  }).join('');
}

function scRenderSupervision(){
  const tbody=document.querySelector('#supervisionRuleTable tbody');if(!tbody)return;
  tbody.innerHTML=scSupervisionRules.map(r=>`<tr><td>${r.name}</td><td>${r.contractor}</td><td class="center"><b>${r.reviewDays} 日</b></td><td>${r.note}</td></tr>`).join('');
}

function renderScheduleControl(){
  if(!document.getElementById('scheduleControl'))return;
  const data=scBuildModel();
  scRenderSummary(data);scRenderGantt(data);scRenderDependency(data);scRenderDelay(data);scRenderPayment();scRenderSupervision();
}

const scObserver=new MutationObserver(()=>{
  clearTimeout(window.__scTimer);
  window.__scTimer=setTimeout(renderScheduleControl,120);
});

window.addEventListener('load',()=>{
  setTimeout(renderScheduleControl,500);
  const schedule=document.getElementById('scheduleTable'),payment=document.getElementById('paymentTable');
  if(schedule)scObserver.observe(schedule,{childList:true,subtree:true});
  if(payment)scObserver.observe(payment,{childList:true,subtree:true});
  document.addEventListener('change',e=>{
    const ids=['signDate','noticeDate','pccDate','tenderApprovalDate','allWorksAwardDate','allWorksCloseDate','pcmDays','projectSelect'];
    if(ids.includes(e.target.id)||e.target.closest?.('#scheduleTable'))setTimeout(renderScheduleControl,150);
  });
});
