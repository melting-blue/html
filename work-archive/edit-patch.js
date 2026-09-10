// Work Archive: edit/delete uploaded work records while keeping raw report text in sync.
(() => {
  const splitProjectTokens=(p='')=>String(p).split(/\s*[·/]\s*/).map(x=>x.trim()).filter(Boolean);

  const style=document.createElement('style');
  style.textContent=`
    .work-item.wa-editable{position:relative;cursor:pointer;padding-right:48px!important;transition:transform .12s,border-color .12s,box-shadow .12s}
    .work-item.wa-editable::after{content:'수정';position:absolute;right:9px;top:9px;font-size:9px;font-weight:900;color:#8392aa;background:rgba(255,255,255,.72);border:1px solid rgba(207,219,236,.95);border-radius:999px;padding:3px 6px}
    .work-item.wa-editable:hover{border-color:#bfd3ee;box-shadow:0 7px 18px rgba(88,116,163,.08);transform:translateY(-1px)}
    #searchBody tr.wa-editable-row{cursor:pointer}.wa-editable-row:hover{background:#f8fbff}
    .wa-edit-form{display:grid;gap:12px}.wa-edit-field{display:grid;gap:6px}.wa-edit-field label{font-size:10px;font-weight:850;color:#7f8da5}.wa-edit-field input,.wa-edit-field textarea{width:100%;border:1px solid var(--line);background:#fff;border-radius:11px;padding:10px 11px;outline:none}.wa-edit-field textarea{min-height:170px;resize:vertical;line-height:1.65}.wa-edit-date{font-size:11px;color:#8795aa;background:#f7f9fd;border-radius:10px;padding:9px 11px}.wa-edit-note{font-size:9.5px;color:#98a4b7;line-height:1.55}.btn.danger{border-color:#f0cbd3;background:#fff7f9;color:#b25d72}.btn.danger:hover{background:#fff0f3}.wa-edit-actions{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:4px}.wa-edit-actions-right{display:flex;gap:8px}.wa-day-admin{display:flex;justify-content:flex-end;margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}.day-head.wa-day-open{cursor:pointer}
    @media(max-width:700px){
      .work-item.wa-editable{padding-right:52px!important}.work-item.wa-editable::after{font-size:10px;right:10px;top:10px;padding:4px 7px}
      #waTaskEditDialog{width:100vw!important;max-width:none!important;margin:auto 0 0!important;border-radius:22px 22px 0 0!important}.wa-edit-field textarea{min-height:220px;font-size:15px}.wa-edit-field input{font-size:14px}.wa-edit-actions{align-items:stretch;flex-direction:column-reverse}.wa-edit-actions-right{display:grid;grid-template-columns:1fr 1fr}.wa-edit-actions .btn{width:100%}
    }
  `;
  document.head.appendChild(style);

  const dlg=document.createElement('dialog');
  dlg.id='waTaskEditDialog';
  dlg.innerHTML=`<div class="modal"><div class="modal-head"><div><h2>업무 수정</h2><div class="modal-sub">오타나 잘못 분류된 프로젝트를 바로 고칠 수 있습니다.</div></div><button class="close" id="waTaskEditClose">×</button></div><div class="wa-edit-form"><div class="wa-edit-field"><label>날짜</label><div class="wa-edit-date" id="waEditDate"></div></div><div class="wa-edit-field"><label>프로젝트</label><input id="waEditProject" autocomplete="off"></div><div class="wa-edit-field"><label>업무 원문</label><textarea id="waEditText"></textarea></div><div class="wa-edit-note">수정하면 검색용 업무 데이터와 해당 날짜의 원본 업무보고(raw text)를 함께 갱신합니다.</div><div class="wa-edit-actions"><button class="btn danger" id="waDeleteTask">이 업무 삭제</button><div class="wa-edit-actions-right"><button class="btn" id="waCancelEdit">취소</button><button class="btn primary" id="waSaveTask">저장</button></div></div></div></div>`;
  document.body.appendChild(dlg);

  let editingTaskId=null;
  $('waTaskEditClose').onclick=()=>dlg.close();
  $('waCancelEdit').onclick=()=>dlg.close();
  $('waSaveTask').onclick=saveTaskEdit;
  $('waDeleteTask').onclick=deleteTask;

  function taskById(id){return state.tasks.find(t=>String(t.id)===String(id))||null}
  function reportById(id){return state.reports.find(r=>String(r.id)===String(id))||null}
  function tasksInReport(reportId){return state.tasks.filter(t=>String(t.reportId)===String(reportId))}

  function replaceFirst(raw,needle,replacement){
    const i=raw.indexOf(needle);if(i<0)return raw;return raw.slice(0,i)+replacement+raw.slice(i+needle.length)
  }
  function editRawTask(raw,oldText,newText){
    if(!raw||!oldText)return raw;
    for(const p of ['- ','• ','* ','· ']){
      const needle=p+oldText;if(raw.includes(needle))return replaceFirst(raw,needle,p+newText)
    }
    if(raw.includes(oldText))return replaceFirst(raw,oldText,newText);
    return raw;
  }
  function deleteRawTask(raw,oldText){
    if(!raw||!oldText)return raw;
    let out=raw;
    for(const p of ['- ','• ','* ','· ']){
      const needle=p+oldText;
      const i=out.indexOf(needle);
      if(i>=0){
        let start=i,end=i+needle.length;
        if(start>0&&out[start-1]==='\n')start--;
        else if(end<out.length&&out[end]==='\n')end++;
        out=out.slice(0,start)+out.slice(end);
        return out.replace(/\n{3,}/g,'\n\n').trim();
      }
    }
    if(out.includes(oldText))out=replaceFirst(out,oldText,'');
    return out.replace(/\n[ \t]*[-•·*]?[ \t]*\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  }

  function openTaskEditor(id){
    const t=taskById(id);if(!t)return;
    editingTaskId=t.id;$('waEditDate').textContent=fmtDate(t.date);$('waEditProject').value=t.project||'';$('waEditText').value=t.task||'';dlg.showModal();setTimeout(()=>$('waEditText').focus(),30)
  }

  async function updateReportRaw(report,newRaw){
    if(!report||newRaw===report.raw)return {changed:false};
    const newFingerprint=typeof reportFingerprint==='function'?reportFingerprint(newRaw):report.fingerprint;
    const {error}=await db.from('work_reports').update({raw_text:newRaw,fingerprint:newFingerprint}).eq('id',report.id);
    if(error)throw error;
    return {changed:true,oldRaw:report.raw,oldFingerprint:report.fingerprint};
  }
  async function rollbackReport(report,backup){
    if(!report||!backup?.changed)return;
    try{await db.from('work_reports').update({raw_text:backup.oldRaw,fingerprint:backup.oldFingerprint}).eq('id',report.id)}catch(e){console.warn('raw rollback failed',e)}
  }

  async function saveTaskEdit(){
    const t=taskById(editingTaskId);if(!t)return;
    const text=$('waEditText').value.trim(),project=$('waEditProject').value.trim()||inferProject(text);
    if(!text)return alert('업무 내용을 입력해 주세요.');
    const report=reportById(t.reportId),newRaw=report?editRawTask(report.raw,t.task,text):null;
    $('waSaveTask').disabled=true;$('waSaveTask').textContent='저장 중…';let backup=null;
    try{
      if(report&&newRaw!==report.raw)backup=await updateReportRaw(report,newRaw);
      const {error}=await db.from('work_tasks').update({task_text:text,project,task_type:inferType(text),collaborator:inferCollab(text)}).eq('id',t.id);
      if(error){await rollbackReport(report,backup);throw error}
      dlg.close();toast('업무 수정 완료');await loadRemote();
    }catch(e){alert('수정 실패: '+e.message)}finally{$('waSaveTask').disabled=false;$('waSaveTask').textContent='저장'}
  }

  async function deleteTask(){
    const t=taskById(editingTaskId);if(!t)return;
    if(!confirm(`이 업무를 삭제할까요?\n\n${t.task}`))return;
    const report=reportById(t.reportId),siblings=report?tasksInReport(report.id):[];
    $('waDeleteTask').disabled=true;$('waDeleteTask').textContent='삭제 중…';let backup=null;
    try{
      if(report&&siblings.length<=1){
        const {error}=await db.from('work_reports').delete().eq('id',report.id);if(error)throw error;
      }else{
        if(report){const newRaw=deleteRawTask(report.raw,t.task);if(newRaw!==report.raw)backup=await updateReportRaw(report,newRaw)}
        const {error}=await db.from('work_tasks').delete().eq('id',t.id);if(error){await rollbackReport(report,backup);throw error}
      }
      dlg.close();toast('업무 삭제 완료');await loadRemote();
    }catch(e){alert('삭제 실패: '+e.message)}finally{$('waDeleteTask').disabled=false;$('waDeleteTask').textContent='이 업무 삭제'}
  }

  async function deleteDateReports(date){
    const reports=state.reports.filter(r=>r.date===date);if(!reports.length)return;
    const n=state.tasks.filter(t=>t.date===date).length;
    if(!confirm(`${fmtDate(date)} 업무보고 전체를 삭제할까요?\n\n보고 ${reports.length}건 · 업무 ${n}개가 삭제됩니다.\n연차/반차 기록은 삭제되지 않습니다.`))return;
    const ids=reports.map(r=>r.id);const {error}=await db.from('work_reports').delete().in('id',ids);if(error)return alert('삭제 실패: '+error.message);
    try{$('dayDialog').close()}catch(e){}toast('해당 날짜 업무보고 삭제 완료');await loadRemote();
  }

  function markItems(items,tasks){items.forEach((el,i)=>{const t=tasks[i];if(!t)return;el.dataset.taskId=t.id;el.classList.add('wa-editable');el.title='눌러서 수정 또는 삭제';el.onclick=(e)=>{e.stopPropagation();openTaskEditor(t.id)}})}

  function bindWeek(){
    const cols=[...document.querySelectorAll('#weekGrid .day-col')];
    cols.forEach((col,i)=>{
      const date=iso(addDays(weekCursor,i)),tasks=tasksForDate(date);markItems([...col.querySelectorAll('.day-body .work-item')],tasks);
      const head=col.querySelector('.day-head');if(head){head.classList.add('wa-day-open');head.title='날짜 상세 보기';head.onclick=()=>showDay(date)}
    });
  }
  function bindDay(date){
    const tasks=tasksForDate(date);markItems([...document.querySelectorAll('#dayItems .work-item')],tasks);
    const modal=$('dayItems')?.closest('.modal');if(!modal)return;
    modal.querySelector('.wa-day-admin')?.remove();
    if(state.reports.some(r=>r.date===date)){
      const a=document.createElement('div');a.className='wa-day-admin';a.innerHTML='<button class="btn danger">이 날짜 업무보고 전체 삭제</button>';a.querySelector('button').onclick=()=>deleteDateReports(date);modal.appendChild(a)
    }
  }
  function bindProject(project){
    const tasks=state.tasks.filter(t=>splitProjectTokens(t.project).includes(project)).sort((a,b)=>a.date.localeCompare(b.date));markItems([...document.querySelectorAll('#projectTimeline .work-item')],tasks)
  }
  function bindSearch(){
    const q=normalize($('searchQuery').value),type=$('typeFilter').value;
    const rows=state.tasks.filter(t=>(!type||t.type===type)&&(!q||normalize([t.project,t.task,t.type,t.collab,(t.tags||[]).join(' ')].join(' ')).includes(q))).sort((a,b)=>b.date.localeCompare(a.date));
    [...document.querySelectorAll('#searchBody tr')].forEach((tr,i)=>{const t=rows[i];if(!t)return;tr.classList.add('wa-editable-row');tr.title='눌러서 수정 또는 삭제';tr.onclick=()=>openTaskEditor(t.id)})
  }

  const rWeek=renderWeek;renderWeek=function(){rWeek();bindWeek()};
  const rSearch=renderSearch;renderSearch=function(){rSearch();bindSearch()};
  const sDay=showDay;showDay=function(date){sDay(date);bindDay(date)};
  const sProject=showProject;showProject=function(project){sProject(project);bindProject(project)};

  // Re-render once so current screen also gets edit affordances.
  try{renderWeek();renderSearch()}catch(e){console.warn('editable UI init failed',e)}
})();
