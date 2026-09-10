// Work Archive live patch: project grouping + annual leave + duplicate guards
(() => {
  const splitProjects = (p='') => String(p).split(/\s*[·/]\s*/).map(x=>x.trim()).filter(Boolean);

  // Project inference: Todayhouse event names are projects in their own right.
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

  // One task can belong to multiple named projects without creating duplicate DB rows.
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

  // Remove exact duplicate task lines inside one pasted report while preserving raw_text.
  if(typeof parseReport === 'function'){
    const baseParseReport=parseReport;
    parseReport=function(raw,year){
      const r=baseParseReport(raw,year); if(!r)return r;
      const seen=new Set(); r.tasks=r.tasks.filter(t=>{const k=normalize(t.task);if(seen.has(k))return false;seen.add(k);return true});
      return r;
    };
  }

  // Annual leave UI.
  const nav=document.querySelector('.nav');
  if(nav && !document.querySelector('[data-page="leave"]')){
    const dataBtn=nav.querySelector('[data-page="data"]');
    const b=document.createElement('button');b.dataset.page='leave';b.textContent='연차';nav.insertBefore(b,dataBtn||null);
    const main=document.querySelector('main.main');
    const sec=document.createElement('section');sec.className='page';sec.id='leave';
    sec.innerHTML=`<div class="topbar"><div class="title"><h1>연차</h1><p>연차와 반차를 업무기록과 분리해서 날짜별로 기록합니다.</p></div></div>
      <div class="data-grid" style="margin-bottom:14px"><div class="data-card"><h3>연차 기록 추가</h3><div class="toolbar" style="margin:0"><input id="leaveDate" type="date" style="min-width:150px"><select id="leaveType"><option>연차</option><option>오전반차</option><option>오후반차</option><option>기타</option></select><input id="leaveNote" placeholder="메모 (선택)" style="min-width:180px"><button class="btn primary" id="saveLeaveBtn">저장</button></div></div><div class="data-card"><h3>연도별 사용</h3><div class="toolbar" style="margin:0"><select id="leaveYear"></select><strong id="leaveSummary" style="font-size:13px"></strong></div></div></div>
      <div class="table-wrap"><table><thead><tr><th>날짜</th><th>유형</th><th>일수</th><th>메모</th><th></th></tr></thead><tbody id="leaveBody"></tbody></table></div>`;
    main.appendChild(sec);
    const style=document.createElement('style');style.textContent='.leave-badge,.cal-leave{background:#fff1f7;color:#b36f8d}.leave-badge{display:inline-block;margin-top:7px;padding:4px 7px;border-radius:999px;font-size:9px;font-weight:900}.cal-leave{margin-top:6px;padding:4px 6px;border-radius:6px;font-size:9px;font-weight:850}.btn.mini{padding:5px 8px;font-size:9px}';document.head.appendChild(style);

    const curYear=new Date().getFullYear();$('leaveYear').innerHTML=Array.from({length:6},(_,i)=>curYear-i).map(y=>`<option value="${y}">${y}</option>`).join('');$('leaveDate').value=iso(new Date());
    b.onclick=()=>{document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='leave'));loadLeaves()};
    $('leaveYear').onchange=()=>renderLeaves(window._waLeaves||[]);
    $('saveLeaveBtn').onclick=saveLeave;
  }

  async function loadLeaves(){
    if(!db||!user)return;const {data,error}=await db.from('leave_records').select('*').order('leave_date',{ascending:false});if(error){alert('연차 불러오기 실패: '+error.message);return}window._waLeaves=(data||[]);renderLeaves(window._waLeaves);
  }
  function renderLeaves(rows){
    if(!$('leaveBody'))return;const y=Number($('leaveYear').value||new Date().getFullYear());const list=rows.filter(l=>Number(l.leave_date.slice(0,4))===y);const used=list.reduce((s,l)=>s+Number(l.amount||0),0);$('leaveSummary').textContent=`${y}년 ${list.length}건 · 사용 ${String(used).replace(/\.0$/,'')}일`;
    $('leaveBody').innerHTML=list.length?list.map(l=>`<tr><td>${fmtDate(l.leave_date)}</td><td>${esc(l.leave_type)}</td><td>${Number(l.amount)}</td><td>${esc(l.note||'')}</td><td><button class="btn mini leave-delete" data-id="${l.id}">삭제</button></td></tr>`).join(''):'<tr><td colspan="5" class="empty">연차 기록이 없습니다.</td></tr>';
    document.querySelectorAll('.leave-delete').forEach(x=>x.onclick=async()=>{if(!confirm('이 연차 기록을 삭제할까요?'))return;const {error}=await db.from('leave_records').delete().eq('id',x.dataset.id);if(error)return alert(error.message);toast('연차 기록 삭제 완료');loadLeaves()});
  }
  async function saveLeave(){
    if(!user)return alert('접속 인증이 필요합니다.');const date=$('leaveDate').value,type=$('leaveType').value,note=$('leaveNote').value.trim();if(!date)return alert('날짜를 선택해 주세요.');const amount=(type==='오전반차'||type==='오후반차')?0.5:1;
    const {data:old}=await db.from('leave_records').select('id').eq('leave_date',date).limit(1);let res;if(old&&old[0])res=await db.from('leave_records').update({leave_type:type,amount,note}).eq('id',old[0].id);else res=await db.from('leave_records').insert({user_id:user.id,leave_date:date,leave_type:type,amount,note});if(res.error)return alert('연차 저장 실패: '+res.error.message);$('leaveNote').value='';toast(old&&old[0]?'연차 기록 수정 완료':'연차 기록 저장 완료');loadLeaves();
  }

  // Refresh project page now that grouping rules changed.
  try{renderProjects()}catch(e){console.warn(e)}
})();
