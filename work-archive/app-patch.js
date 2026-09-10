// Work Archive live patch: project grouping + inline leave + Korean holidays + duplicate guards
(() => {
  const splitProjects = (p='') => String(p).split(/\s*[·/]\s*/).map(x=>x.trim()).filter(Boolean);
  const holidayMap = new Map();
  let holidaysReady = false;

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
    .wa-action-btn{background:#fff7fb!important;border-color:#f0c9d8!important;color:#aa6884!important}
    .wa-day-flags{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}
    .wa-flag{display:inline-flex;align-items:center;gap:4px;padding:4px 7px;border-radius:999px;font-size:9px;font-weight:900;line-height:1.1}
    .wa-flag.holiday{background:#ffe1e8;color:#b9546d}.wa-flag.temporary{background:#ffe8df;color:#b86c52}
    .wa-flag.leave{background:#dfeeff;color:#507db8}.wa-flag.half{background:#ece6ff;color:#725fae}
    .day-col.wa-holiday,.day-col.wa-holiday .day-head{background:#fff1f4!important}
    .day-col.wa-leave-full,.day-col.wa-leave-full .day-head{background:#edf6ff!important}
    .day-col.wa-leave-half,.day-col.wa-leave-half .day-head{background:#f3efff!important}
    .day-col.wa-holiday.wa-leave-full,.day-col.wa-holiday.wa-leave-full .day-head{background:linear-gradient(135deg,#fff1f4 0 50%,#edf6ff 50% 100%)!important}
    .day-col.wa-holiday.wa-leave-half,.day-col.wa-holiday.wa-leave-half .day-head{background:linear-gradient(135deg,#fff1f4 0 50%,#f3efff 50% 100%)!important}
    .day-col.wa-holiday .day-date{color:#bd5a70}.day-col.wa-leave-full:not(.wa-holiday) .day-date{color:#5a82b9}.day-col.wa-leave-half:not(.wa-holiday) .day-date{color:#7664ad}
    .cal-day.wa-holiday{background:#fff1f4!important}.cal-day.wa-leave-full{background:#edf6ff!important}.cal-day.wa-leave-half{background:#f3efff!important}
    .cal-day.wa-holiday.wa-leave-full{background:linear-gradient(135deg,#fff1f4 0 50%,#edf6ff 50% 100%)!important}
    .cal-day.wa-holiday.wa-leave-half{background:linear-gradient(135deg,#fff1f4 0 50%,#f3efff 50% 100%)!important}
    .cal-day.wa-holiday .cal-num{color:#bd5a70}.cal-day.wa-leave-full:not(.wa-holiday) .cal-num{color:#5a82b9}.cal-day.wa-leave-half:not(.wa-holiday) .cal-num{color:#7664ad}
    .wa-cal-status{display:grid;gap:4px;margin-top:7px}.wa-cal-label{font-size:9px;font-weight:900;padding:5px 6px;border-radius:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .wa-cal-label.holiday{background:rgba(255,207,218,.68);color:#a84e66}.wa-cal-label.temporary{background:rgba(255,219,204,.72);color:#aa6049}.wa-cal-label.leave{background:rgba(207,229,255,.8);color:#4f78ad}.wa-cal-label.half{background:rgba(224,216,255,.78);color:#6e5ba6}
    .wa-detail-status{border-radius:13px;padding:11px 12px;margin-bottom:10px;font-size:11px;font-weight:800;line-height:1.55}.wa-detail-status.holiday{background:#fff1f4;color:#a94d65}.wa-detail-status.leave{background:#edf6ff;color:#5078ad}.wa-detail-status.half{background:#f3efff;color:#6e5ba6}
    .wa-leave-modal .toolbar{margin:0}.wa-leave-modal input,.wa-leave-modal select{border:1px solid var(--line);background:#fff;border-radius:10px;padding:9px 10px;outline:none}.wa-leave-history{display:grid;gap:6px;margin-top:12px}.wa-leave-row{display:grid;grid-template-columns:90px 80px 1fr auto;gap:8px;align-items:center;padding:8px 10px;border:1px solid var(--line);border-radius:10px;font-size:10px;background:#fbfdff}.btn.mini{padding:5px 8px;font-size:9px}
  `;
  document.head.appendChild(style);

  function holidaysForDate(date){return holidayMap.get(date)||[]}
  function leaveForDate(date){return (window._waLeaves||[]).find(l=>l.leave_date===date)||null}
  function dayClasses(date){
    const hs=holidaysForDate(date), l=leaveForDate(date), out=[];
    if(hs.length)out.push('wa-holiday');
    if(l)out.push(Number(l.amount)===0.5?'wa-leave-half':'wa-leave-full');
    return out.join(' ');
  }
  function holidayFlags(date){
    return holidaysForDate(date).map(h=>`<span class="wa-flag ${h.kind==='temporary'?'temporary':'holiday'}">${esc(h.kind==='temporary'?'임시공휴일 · '+h.name:h.name)}</span>`).join('');
  }
  function leaveFlag(date){
    const l=leaveForDate(date);if(!l)return'';const half=Number(l.amount)===0.5;return `<span class="wa-flag ${half?'half':'leave'}">${esc(l.leave_type)}${l.note?` · ${esc(l.note)}`:''}</span>`;
  }
  function calendarStatus(date){
    const hs=holidaysForDate(date), l=leaveForDate(date);let html='';
    hs.forEach(h=>html+=`<div class="wa-cal-label ${h.kind==='temporary'?'temporary':'holiday'}">${esc(h.kind==='temporary'?'임시공휴일 · '+h.name:h.name)}</div>`);
    if(l){const half=Number(l.amount)===0.5;html+=`<div class="wa-cal-label ${half?'half':'leave'}">${esc(l.leave_type)}${l.note?` · ${esc(l.note)}`:''}</div>`}
    return html?`<div class="wa-cal-status">${html}</div>`:'';
  }

  async function loadHolidayData(){
    try{
      const mod=await import('https://cdn.jsdelivr.net/npm/@hangukit/holidays-core@0.1.0/+esm');
      const years=typeof mod.coveredYears==='function'?mod.coveredYears():[2021,2022,2023,2024,2025,2026];
      years.forEach(y=>{
        const rows=typeof mod.getHolidays==='function'?mod.getHolidays(y):[];
        rows.forEach(h=>{const arr=holidayMap.get(h.date)||[];arr.push({date:h.date,name:h.name,kind:h.kind||'legal'});holidayMap.set(h.date,arr)})
      });
      holidaysReady=true;
      renderWeek();renderMonth();
    }catch(e){console.warn('Korean holiday data load failed',e)}
  }

  async function loadLeaves(){
    if(!db||!user)return;
    const {data,error}=await db.from('leave_records').select('*').order('leave_date',{ascending:false});
    if(error){console.warn('leave load failed',error);return}
    window._waLeaves=data||[];
    renderWeek();renderMonth();
    if($('waLeaveHistory'))renderLeaveModal();
  }

  const baseRenderWeek=renderWeek;
  renderWeek=function(){
    const end=addDays(weekCursor,4);$('weekRange').textContent=`${weekCursor.getFullYear()}.${pad(weekCursor.getMonth()+1)}.${pad(weekCursor.getDate())} — ${end.getFullYear()}.${pad(end.getMonth()+1)}.${pad(end.getDate())}`;
    const today=iso(new Date());let total=0;const cols=[];
    for(let i=0;i<5;i++){
      const d=addDays(weekCursor,i),date=iso(d),tasks=tasksForDate(date);total+=tasks.length;
      const items=tasks.length?tasks.map(t=>{const c=projectColor(t.project);return `<div class="work-item" style="--accent:${c.accent};--soft:${c.soft}"><div class="work-project">${esc(t.project)}</div><div class="work-text">${esc(t.task)}</div>${t.type||t.collab?`<div class="work-meta">${esc([t.type,t.collab].filter(Boolean).join(' · '))}</div>`:''}</div>`}).join(''):'<div class="empty-day">기록 없음</div>';
      const flags=holidayFlags(date)+leaveFlag(date);
      cols.push(`<div class="day-col ${dayClasses(date)}"><div class="day-head ${date===today?'today':''}"><div class="day-name">${koreanDay(d)}요일</div><div class="day-date">${d.getMonth()+1}.${d.getDate()}</div><div class="day-count">${tasks.length}개 업무</div>${flags?`<div class="wa-day-flags">${flags}</div>`:''}</div><div class="day-body">${items}</div></div>`)
    }
    $('weekGrid').innerHTML=cols.join('');$('weekMeta').textContent=`이번 주 ${total}개 업무`;
  };

  renderMonth=function(){
    $('monthTitle').textContent=`${monthCursor.getFullYear()}.${pad(monthCursor.getMonth()+1)}`;const y=monthCursor.getFullYear(),m=monthCursor.getMonth();const first=new Date(y,m,1),start=new Date(y,m,1-first.getDay()),today=iso(new Date());const cells=[];
    for(let i=0;i<42;i++){
      const d=addDays(start,i),date=iso(d),tasks=tasksForDate(date);const projects=[...new Set(tasks.map(t=>t.project))].slice(0,3);const status=calendarStatus(date);
      cells.push(`<div class="cal-day ${d.getMonth()!==m?'other':''} ${date===today?'today':''} ${dayClasses(date)}" data-date="${date}"><div class="cal-num"><span>${d.getDate()}</span><span class="cal-count">${tasks.length?tasks.length+'건':''}</span></div>${status}<div class="cal-lines">${projects.map(p=>`<div class="cal-line">${esc(p)}</div>`).join('')}${tasks.length&&projects.length<tasks.length?`<div class="cal-line">+ ${Math.max(0,tasks.length-projects.length)} more</div>`:''}</div></div>`)
    }
    $('calendar').innerHTML=cells.join('');document.querySelectorAll('.cal-day').forEach(el=>{el.onclick=()=>showDay(el.dataset.date)});
  };

  showDay=function(date){
    const tasks=tasksForDate(date), hs=holidaysForDate(date), l=leaveForDate(date);$('dayTitle').textContent=fmtDate(date);$('daySub').textContent=`${tasks.length}개 업무`;
    let pre='';
    hs.forEach(h=>pre+=`<div class="wa-detail-status holiday">${esc(h.kind==='temporary'?'임시공휴일 · '+h.name:h.name)}</div>`);
    if(l){const half=Number(l.amount)===0.5;pre+=`<div class="wa-detail-status ${half?'half':'leave'}">${esc(l.leave_type)}${l.note?` · ${esc(l.note)}`:''}</div>`}
    $('dayItems').innerHTML=pre+(tasks.length?tasks.map(t=>{const c=projectColor(t.project);return `<div class="work-item" style="--accent:${c.accent};--soft:${c.soft};margin-bottom:8px"><div class="work-project">${esc(t.project)}</div><div class="work-text">${esc(t.task)}</div></div>`}).join(''):'<div class="empty">업무 기록 없음</div>');$('dayDialog').showModal()
  };

  function ensureLeaveButton(){
    if(document.getElementById('waLeaveBtn'))return;
    const buttons=document.querySelectorAll('.open-report');
    buttons.forEach((reportBtn,idx)=>{
      const b=document.createElement('button');b.className='btn wa-action-btn';b.id=idx===0?'waLeaveBtn':'';b.textContent='+ 연차 / 반차';b.onclick=openLeaveModal;reportBtn.parentNode.insertBefore(b,reportBtn)
    });
    const dlg=document.createElement('dialog');dlg.id='waLeaveDialog';dlg.innerHTML=`<div class="modal wa-leave-modal"><div class="modal-head"><div><h2>연차 / 반차 등록</h2><div class="modal-sub">등록하면 주간과 월간 캘린더의 날짜 칸 전체에 바로 표시됩니다.</div></div><button class="close" id="waLeaveClose">×</button></div><div class="toolbar"><input id="waLeaveDate" type="date"><select id="waLeaveType"><option>연차</option><option>오전반차</option><option>오후반차</option><option>기타</option></select><input id="waLeaveNote" placeholder="메모 (선택)"><button class="btn primary" id="waLeaveSave">저장</button></div><div id="waLeaveSummary" class="hint" style="margin-top:11px"></div><div id="waLeaveHistory" class="wa-leave-history"></div></div>`;document.body.appendChild(dlg);
    $('waLeaveClose').onclick=()=>dlg.close();$('waLeaveSave').onclick=saveLeave;
  }
  function openLeaveModal(){
    if(!$('waLeaveDialog'))ensureLeaveButton();$('waLeaveDate').value=iso(new Date());renderLeaveModal();$('waLeaveDialog').showModal()
  }
  function renderLeaveModal(){
    if(!$('waLeaveHistory'))return;const rows=window._waLeaves||[],y=new Date().getFullYear(),yearRows=rows.filter(l=>l.leave_date.startsWith(String(y))),used=yearRows.reduce((s,l)=>s+Number(l.amount||0),0);$('waLeaveSummary').textContent=`${y}년 사용 ${used}일 · ${yearRows.length}건`;
    $('waLeaveHistory').innerHTML=rows.slice(0,8).map(l=>`<div class="wa-leave-row"><span>${fmtDate(l.leave_date)}</span><strong>${esc(l.leave_type)}</strong><span>${esc(l.note||'')}</span><button class="btn mini wa-leave-delete" data-id="${l.id}">삭제</button></div>`).join('')||'<div class="empty" style="padding:16px">등록된 연차가 없습니다.</div>';
    document.querySelectorAll('.wa-leave-delete').forEach(x=>x.onclick=async()=>{if(!confirm('이 연차 기록을 삭제할까요?'))return;const {error}=await db.from('leave_records').delete().eq('id',x.dataset.id);if(error)return alert(error.message);toast('연차 기록 삭제 완료');await loadLeaves()})
  }
  async function saveLeave(){
    if(!user)return alert('접속 인증이 필요합니다.');const date=$('waLeaveDate').value,type=$('waLeaveType').value,note=$('waLeaveNote').value.trim();if(!date)return alert('날짜를 선택해 주세요.');const amount=(type==='오전반차'||type==='오후반차')?0.5:1;
    const {data:old}=await db.from('leave_records').select('id').eq('leave_date',date).limit(1);let res;if(old&&old[0])res=await db.from('leave_records').update({leave_type:type,amount,note}).eq('id',old[0].id);else res=await db.from('leave_records').insert({user_id:user.id,leave_date:date,leave_type:type,amount,note});if(res.error)return alert('연차 저장 실패: '+res.error.message);$('waLeaveNote').value='';toast(old&&old[0]?'연차 기록 수정 완료':'연차 기록 저장 완료');await loadLeaves();$('waLeaveDialog').close()
  }

  const baseAfterAuth=afterAuth;
  afterAuth=async function(){await baseAfterAuth();ensureLeaveButton();await loadLeaves()};

  ensureLeaveButton();
  loadHolidayData();
  try{renderProjects()}catch(e){console.warn(e)}
})();
