// Work Archive live patch: project grouping + inline annual leave + duplicate guards
(() => {
  const splitProjects = (p='') => String(p).split(/\s*[·/]\s*/).map(x=>x.trim()).filter(Boolean);

  window._waInferProjectBase = typeof inferProject === 'function' ? inferProject : null;
  inferProject = function(t){
    const s=String(t||''); const hits=[];
    if(/집요한\s*세일/i.test(s)) hits.push('집요한세일');
    if(/스페셜딜/i.test(s)) hits.push('스페셜딜');
    if(/월간\s*가구\s*세일/i.test(s)) hits.push('월간가구세일');
    if(/오늘의딜/i.test(s)) hits.push('오늘의딜');
    if(/오세일/i.test(s)) hits.push('오세일');
    if(/단독\s*컬렉션/i.test(s)) hits.push('단독컬렉션');
    if(hits.length) return [...new Set(hits)].join(' · ');
    return window._waInferProjectBase ? window._waInferProjectBase(t) : '기타 업무';
  };

  renderProjects = function(){
    const q=normalize($('projectQuery').value), groups={};
    state.tasks.forEach(t=>[...new Set(splitProjects(t.project||'기타 업무'))].forEach(p=>(groups[p]??=[]).push(t)));
    const arr=Object.entries(groups).filter(([p])=>!q||normalize(p).includes(q)).sort((a,b)=>b[1].length-a[1].length);
    $('projectList').innerHTML=arr.length?arr.map(([p,tasks])=>{const dates=tasks.map(t=>t.date).sort();return `<button class="project-card" data-project="${esc(p)}"><h3>${esc(p)}</h3><div class="project-count">${tasks.length}</div><p>${fmtDate(dates[0])} — ${fmtDate(dates[dates.length-1])}</p></button>`}).join(''):'<div class="empty">프로젝트가 없습니다.</div>';
    document.querySelectorAll('.project-card').forEach(el=>el.onclick=()=>showProject(el.dataset.project));
  };
  showProject = function(project){
    const tasks=state.tasks.filter(t=>splitProjects(t.project).includes(project)).sort((a,b)=>a.date.localeCompare(b.date));
    $('projectTitle').textContent=project;$('projectSub').textContent=`${tasks.length}개 기록`;
    $('projectTimeline').innerHTML=tasks.map(t=>`<div style="display:grid;grid-template-columns:105px 1fr;gap:12px;margin-bottom:8px"><div style="font-size:10px;color:#8b99b0;padding-top:10px">${fmtDate(t.date)}</div><div class="work-item"><div class="work-text">${esc(t.task)}</div></div></div>`).join('');
    $('projectDialog').showModal();
  };

  if(typeof parseReport === 'function'){
    const baseParseReport=parseReport;
    parseReport=function(raw,year){
      const r=baseParseReport(raw,year); if(!r)return r;
      const seen=new Set(); r.tasks=r.tasks.filter(t=>{const k=normalize(t.task);if(seen.has(k))return false;seen.add(k);return true});
      return r;
    };
  }

  const style=document.createElement('style');
  style.textContent=`
    .leave-open{background:var(--pink-soft)!important;color:#ad6c89!important;border-color:#f2c4d7!important}
    .leave-card{border:1px solid #f3c9da;border-left:4px solid var(--pink);border-radius:12px;padding:9px 10px;background:var(--pink-soft);color:#9f5f7c}
    .leave-card strong{display:block;font-size:10.5px;margin-bottom:2px}.leave-card span{font-size:9.5px;color:#b47a93}
    .cal-leave{margin-top:5px;padding:4px 6px;border-radius:6px;background:var(--pink-soft);color:#aa6986;font-size:9px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .leave-form{display:grid;grid-template-columns:1.2fr 1fr;gap:10px}.leave-form label{font-size:10px;color:#8391a9;font-weight:800}.leave-form input,.leave-form select{width:100%;margin-top:5px;border:1px solid var(--line);border-radius:10px;padding:9px 10px;background:#fff;outline:none}.leave-form .wide{grid-column:1/-1}
    .leave-summary{margin:13px 0 8px;font-size:10px;color:#7f8da5}.leave-list{border-top:1px solid var(--line);margin-top:12px;padding-top:10px;display:grid;gap:7px}.leave-row{display:grid;grid-template-columns:82px 90px 1fr auto;gap:8px;align-items:center;font-size:10px}.leave-row .muted{color:#8f9db4}.btn.mini{padding:5px 8px;font-size:9px}
    @media(max-width:650px){.leave-form{grid-template-columns:1fr}.leave-form .wide{grid-column:auto}.leave-row{grid-template-columns:72px 78px 1fr}.leave-row button{grid-column:3;justify-self:end}}
  `;
  document.head.appendChild(style);

  const leaveDialog=document.createElement('dialog');
  leaveDialog.id='leaveDialog';
  leaveDialog.innerHTML=`<div class="modal"><div class="modal-head"><div><h2>연차 등록</h2><div class="modal-sub">연차/반차는 업무와 분리해서 저장하고 캘린더에 표시합니다.</div></div><button class="close" id="closeLeaveDialog">×</button></div>
    <div class="leave-form">
      <label>날짜<input id="leaveDate" type="date"></label>
      <label>유형<select id="leaveType"><option>연차</option><option>오전반차</option><option>오후반차</option><option>기타</option></select></label>
      <label class="wide">메모<input id="leaveNote" placeholder="선택"></label>
    </div>
    <div class="actions"><button class="btn primary" id="saveLeaveBtn">저장</button></div>
    <div class="leave-summary" id="leaveSummary"></div><div class="leave-list" id="leaveList"></div>
  </div>`;
  document.body.appendChild(leaveDialog);
  $('closeLeaveDialog').onclick=()=>leaveDialog.close();
  $('leaveDate').value=iso(new Date());
  $('saveLeaveBtn').onclick=saveLeave;

  function addLeaveButton(container){
    if(!container || container.querySelector('.leave-open'))return;
    const b=document.createElement('button');b.className='btn leave-open';b.textContent='+ 연차';b.onclick=()=>openLeaveDialog();
    const reportBtn=container.querySelector('.open-report');
    if(reportBtn)container.insertBefore(b,reportBtn); else container.appendChild(b);
  }
  addLeaveButton(document.querySelector('#week .top-actions'));
  addLeaveButton(document.querySelector('#month .topbar'));

  async function loadLeaves(){
    if(!db||!user)return;
    const {data,error}=await db.from('leave_records').select('*').order('leave_date',{ascending:false});
    if(error){console.error('leave load',error);return}
    window._waLeaves=(data||[]);
    renderLeaveList();
    try{renderWeek()}catch(e){}
    try{renderMonth()}catch(e){}
  }
  function leaveForDate(date){return (window._waLeaves||[]).find(l=>l.leave_date===date)||null}
  function leaveLabel(l){return l?`${l.leave_type}${l.note?` · ${l.note}`:''}`:''}
  function renderLeaveList(){
    if(!$('leaveList'))return;
    const rows=window._waLeaves||[]; const y=new Date().getFullYear(); const current=rows.filter(l=>l.leave_date.startsWith(String(y))); const used=current.reduce((s,l)=>s+Number(l.amount||0),0);
    $('leaveSummary').textContent=`${y}년 사용 ${used}일 · ${current.length}건`;
    const recent=rows.slice(0,8);
    $('leaveList').innerHTML=recent.length?recent.map(l=>`<div class="leave-row"><span>${fmtDate(l.leave_date).slice(5)}</span><strong>${esc(l.leave_type)}</strong><span class="muted">${esc(l.note||'')}</span><button class="btn mini leave-delete" data-id="${l.id}">삭제</button></div>`).join(''):'<div class="empty" style="padding:14px">연차 기록이 없습니다.</div>';
    document.querySelectorAll('.leave-delete').forEach(x=>x.onclick=async()=>{if(!confirm('이 연차 기록을 삭제할까요?'))return;const {error}=await db.from('leave_records').delete().eq('id',x.dataset.id);if(error)return alert(error.message);toast('연차 기록 삭제 완료');await loadLeaves()});
  }
  function openLeaveDialog(date){
    $('leaveDate').value=date||iso(new Date());
    const existing=leaveForDate($('leaveDate').value);
    $('leaveType').value=existing?.leave_type||'연차';$('leaveNote').value=existing?.note||'';
    renderLeaveList();leaveDialog.showModal();
  }
  $('leaveDate').onchange=()=>{const l=leaveForDate($('leaveDate').value);$('leaveType').value=l?.leave_type||'연차';$('leaveNote').value=l?.note||''};
  async function saveLeave(){
    if(!user)return alert('접속 인증이 필요합니다.');
    const date=$('leaveDate').value,type=$('leaveType').value,note=$('leaveNote').value.trim();if(!date)return alert('날짜를 선택해 주세요.');
    const amount=(type==='오전반차'||type==='오후반차')?0.5:1;
    const existing=leaveForDate(date);let res;
    if(existing)res=await db.from('leave_records').update({leave_type:type,amount,note}).eq('id',existing.id);
    else res=await db.from('leave_records').insert({user_id:user.id,leave_date:date,leave_type:type,amount,note});
    if(res.error)return alert('연차 저장 실패: '+res.error.message);
    toast(existing?'연차 기록 수정 완료':'연차 기록 저장 완료');await loadLeaves();leaveDialog.close();
  }

  const baseRenderWeek=renderWeek;
  renderWeek=function(){
    baseRenderWeek();
    document.querySelectorAll('#weekGrid .day-col').forEach((col,i)=>{
      const date=iso(addDays(weekCursor,i)),l=leaveForDate(date);if(!l)return;
      const body=col.querySelector('.day-body'); if(!body)return;
      const el=document.createElement('div');el.className='leave-card';el.innerHTML=`<strong>${esc(l.leave_type)}</strong>${l.note?`<span>${esc(l.note)}</span>`:''}`;body.prepend(el);
      const count=col.querySelector('.day-count');if(count)count.textContent=(count.textContent?count.textContent+' · ':'')+l.leave_type;
    });
  };

  const baseRenderMonth=renderMonth;
  renderMonth=function(){
    baseRenderMonth();
    document.querySelectorAll('#calendar .cal-day[data-date]').forEach(cell=>{const l=leaveForDate(cell.dataset.date);if(!l)return;const lines=cell.querySelector('.cal-lines')||cell;const el=document.createElement('div');el.className='cal-leave';el.textContent=leaveLabel(l);lines.prepend(el)});
  };

  const baseShowDay=showDay;
  showDay=function(date){
    baseShowDay(date);
    const l=leaveForDate(date);if(!l)return;
    const wrap=$('dayItems');if(!wrap)return;
    const el=document.createElement('div');el.className='leave-card';el.style.marginBottom='8px';el.innerHTML=`<strong>${esc(l.leave_type)}</strong>${l.note?`<span>${esc(l.note)}</span>`:''}`;wrap.prepend(el);
  };

  if(typeof afterAuth==='function'){
    const baseAfterAuth=afterAuth;
    afterAuth=async function(){await baseAfterAuth();await loadLeaves()};
  }
  if(db&&user)loadLeaves();

  try{renderProjects()}catch(e){console.warn(e)}
})();
