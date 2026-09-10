const TYPE_OPTIONS=['기획/자료','레퍼런스','상세페이지','배너/프로모션','AI 이미지','AI 영상','카피/텍스트','촬영/소스','파일정리','수정/검수','운영/등록','개발/자동화','기타'];
const PROJECT_PALETTE=[
  {accent:'#78aef8',soft:'#eef6ff'},
  {accent:'#b8aaf4',soft:'#f4f1ff'},
  {accent:'#f1aac7',soft:'#fff1f7'},
  {accent:'#9fd9f6',soft:'#eefbff'}
];
let db=null,user=null,state={reports:[],tasks:[]};
let weekCursor=startOfWeek(new Date());
let monthCursor=new Date(new Date().getFullYear(),new Date().getMonth(),1);
const $=id=>document.getElementById(id);
const esc=(s='')=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const pad=n=>String(n).padStart(2,'0');
const iso=(d)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const normalize=(s='')=>String(s).toLowerCase().replace(/\s+/g,' ').trim();
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove('show'),2300)}
function setSync(text,kind=''){const el=$('syncState');if(!el)return;el.textContent=text;el.className='sync '+kind}
function startOfWeek(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());const day=x.getDay();const diff=day===0?-6:1-day;x.setDate(x.getDate()+diff);return x}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function fmtDate(s){const d=new Date(s+'T00:00:00');return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())}`}
function koreanDay(d){return ['일','월','화','수','목','금','토'][d.getDay()]}
function hashIndex(s=''){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h)+s.charCodeAt(i),h|=0;return Math.abs(h)%PROJECT_PALETTE.length}
function projectColor(project){return PROJECT_PALETTE[hashIndex(project)]}
function shortHash(str=''){let h1=2166136261>>>0,h2=0x9e3779b9>>>0;for(let i=0;i<str.length;i++){const c=str.charCodeAt(i);h1^=c;h1=Math.imul(h1,16777619);h2^=(c+i);h2=Math.imul(h2,2246822519)}return (h1>>>0).toString(16).padStart(8,'0')+(h2>>>0).toString(16).padStart(8,'0')}
function reportFingerprint(raw=''){return shortHash(normalize(raw))}
function csvEscape(v){const s=String(v??'');return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
function download(name,text,type){const blob=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

function inferType(t){
  const s=normalize(t);
  if(/플러그인|자동화|스크립트|개발|json|figma 불러오기/.test(s))return'개발/자동화';
  if(/영상|gif|클링|kling|씨댄스|cinedance|video|릴스|쇼츠|모션 생성|영상 생성|영상 제작|영상 편집/.test(s))return'AI 영상';
  if(/이미지 생성|합성|누끼|박스누끼|보정|ai 이미지|고스트샷|3d 이미지/.test(s))return'AI 이미지';
  if(/배너|오세일|프로모션|기획전|특가|세일|브랜드위크|캠페인|페스타/.test(s))return'배너/프로모션';
  if(/상세|상세페이지|페이지 초안|상세 초안|와이어프레임|옵션페이지/.test(s))return'상세페이지';
  if(/카피|문구|영문|본문|타이틀|텍스트|번역|대본|스크립트/.test(s))return'카피/텍스트';
  if(/촬영|소스|원본|촬영본|매장 촬영/.test(s))return'촬영/소스';
  if(/파일 경로|분류|폴더|나스|시놀로지|파일 이동|파일 정리|백업/.test(s))return'파일정리';
  if(/검수|점검|수정|변경|교체|컨펌|피드백|오기|오타/.test(s))return'수정/검수';
  if(/등록|업로드|세팅|운영|전달/.test(s))return'운영/등록';
  if(/레퍼런스|래퍼런스|reference|참고|서치/.test(s))return'레퍼런스';
  if(/자료 수집|내용 정리|기획|조사|스펙|인증서|인증번호/.test(s))return'기획/자료';
  return'기타';
}
function inferCollab(t){
  const out=[];const patterns=[/\(\s*with\.?\s*([^\)]+)\)/ig,/with\.?\s*([가-힣A-Za-z0-9_,· ]+)/ig,/([가-힣]{2,4})\s*(?:씨|대리님|주임님|부장님|이사님)\s*(?:전달|확인|검수|피드백)/g];
  for(const re of patterns){let m;while((m=re.exec(t)))out.push(m[1].trim())}
  return [...new Set(out)].join(', ');
}
function inferProject(t){
  const s=String(t);
  const known=['컨티넨탈','보이저 신형','보이저 프로','보이저','코니엘 데이베드','코니엘','헬레네','디오니','데네브','오르트','이클립스','베스퍼','지젤','이음','라이즈','뉴포트 유로탑','뉴포트 필로우탑','뉴포트 스탠다드','뉴포트','스파인코어','크루저','에르고','아틀란','시에나','룬덴','헤일리','코트니','클레어','데바','로프트','라일라','말론','틸다','그루터','세라믹','방수커버','매트리스 방수커버','니오','오슬로','엘든','린델','크리스','허쉬','리브','미쉘','루나','마리안','에이바','올시즌','다니','플러피','브리즈','벨라','하모니','지노','앤틀러스','루미에르','뉴도로모','도로모','로빈','카푸','프라제르','네티','로미','뮤즈화이트','상판만','보니애','오늘의집'];
  const hits=known.filter(k=>s.toLowerCase().includes(k.toLowerCase()));
  if(hits.length){const unique=hits.filter((k,i)=>!hits.some((x,j)=>j!==i&&x.includes(k)&&x.length>k.length)).slice(0,3);return unique.join(' · ')}
  let p=s.replace(/^[-•·*]\s*/,'').split(/\s*[>→]\s*/)[0].trim().replace(/\([^\)]*\)/g,'').trim();
  const cuts=[' 상세',' 이미지',' 배너',' 초안',' 썸네일',' 옵션',' 파일',' 내용',' 파트',' 관련',' 수정',' 변경',' 보정',' 생성',' 작업',' 기획',' 자료',' 인증'];let idx=p.length;cuts.forEach(c=>{const i=p.indexOf(c);if(i>0)idx=Math.min(idx,i)});p=p.slice(0,idx).trim();
  return p.length>=2&&p.length<=36?p:'기타 업무';
}
function extractDateFromHeader(line,year){
  let m=line.match(/(?:(20\d{2})[.\/-]\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/);if(m)return `${m[1]||year}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`;
  m=line.match(/^(?:(20\d{2})[.\/-])?(\d{1,2})[.\/-](\d{1,2})/);if(m)return `${m[1]||year}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`;
  m=line.match(/^(\d{2})(\d{2})\s+소담\s+업무보고/);if(m)return `${year}-${m[1]}-${m[2]}`;
  return null;
}
function isRealReportHeader(line){return /소담\s*업무보고/.test(line)&&!/—/.test(line)}
function splitReportChunks(raw){const lines=raw.split(/\r?\n/),chunks=[];let cur=[];for(const line of lines){if(isRealReportHeader(line)&&cur.some(x=>x.trim())){chunks.push(cur.join('\n').trim());cur=[line]}else cur.push(line)}if(cur.some(x=>x.trim()))chunks.push(cur.join('\n').trim());return chunks.filter(c=>/소담\s*업무보고/.test(c))}
function parseReport(raw,year){
  const lines=raw.split(/\r?\n/);const h=lines.findIndex(isRealReportHeader);if(h<0)return null;const date=extractDateFromHeader(lines[h],year);if(!date)return null;const tasks=[];
  for(let i=h+1;i<lines.length;i++){
    const trim=lines[i].trim();if(!trim)continue;if(/—/.test(trim)&&/업무보고/.test(trim))continue;if(/^✅\s*완료/.test(trim)||/^🔄\s*진행/.test(trim)||/^📋\s*예정/.test(trim)||/^🚧/.test(trim)||/^#+\s*/.test(trim))continue;
    const cont=/^(>|ㄴ|→|\(|※)/.test(trim);if(cont&&tasks.length){tasks[tasks.length-1].task+='\n'+trim;tasks[tasks.length-1].type=inferType(tasks[tasks.length-1].task);continue}
    const line=trim.replace(/^[-•·*]\s*/,'').trim();if(!line||/업무보고$/.test(line))continue;
    tasks.push({date,project:inferProject(line),task:line,type:inferType(line),collab:inferCollab(line),tags:[],note:''});
  }
  return {date,raw,source:'daily_report',fingerprint:reportFingerprint(raw),tasks};
}
function parseReports(raw,year){return splitReportChunks(raw).map(c=>parseReport(c,year)).filter(x=>x&&x.tasks.length)}

function mapReport(r){return{id:r.id,date:r.report_date,raw:r.raw_text,source:r.source||'daily_report',fingerprint:r.fingerprint}}
function mapTask(t){return{id:t.id,reportId:t.report_id,date:t.task_date,project:t.project,task:t.task_text,type:t.task_type,collab:t.collaborator||'',tags:t.tags||[],note:t.note||''}}
async function fetchAll(table,orderCol){const out=[];for(let from=0;;from+=1000){const {data,error}=await db.from(table).select('*').order(orderCol,{ascending:true}).range(from,from+999);if(error)throw error;out.push(...(data||[]));if(!data||data.length<1000)break}return out}
async function loadRemote(){if(!db||!user)return;setSync('동기화 중…');try{const [reports,tasks]=await Promise.all([fetchAll('work_reports','report_date'),fetchAll('work_tasks','task_date')]);state={reports:reports.map(mapReport),tasks:tasks.map(mapTask)};renderAll();setSync(`${state.tasks.length}건 동기화`,'ok')}catch(e){console.error(e);setSync('동기화 오류','err')}}
async function insertParsed(parsedList){
  if(!user)throw new Error('접속 인증이 필요합니다.');
  const existing=new Set(state.reports.map(r=>r.fingerprint||reportFingerprint(r.raw)));let reportsAdded=0,tasksAdded=0,dupes=0;
  for(const parsed of parsedList){
    if(existing.has(parsed.fingerprint)){dupes++;continue}
    const {data:report,error:rErr}=await db.from('work_reports').insert({user_id:user.id,report_date:parsed.date,raw_text:parsed.raw,source:parsed.source,fingerprint:parsed.fingerprint}).select().single();
    if(rErr){if(String(rErr.code)==='23505'){dupes++;continue}throw rErr}
    const rows=parsed.tasks.map(t=>({user_id:user.id,report_id:report.id,task_date:t.date,project:t.project,task_text:t.task,task_type:t.type,collaborator:t.collab||'',tags:t.tags||[],note:t.note||'',source:parsed.source}));
    if(rows.length){const {error:tErr}=await db.from('work_tasks').insert(rows);if(tErr){await db.from('work_reports').delete().eq('id',report.id);throw tErr}}
    existing.add(parsed.fingerprint);reportsAdded++;tasksAdded+=rows.length;
  }
  await loadRemote();return{reportsAdded,tasksAdded,dupes};
}

function tasksForDate(date){return state.tasks.filter(t=>t.date===date)}
function renderWeek(){
  const end=addDays(weekCursor,4);$('weekRange').textContent=`${weekCursor.getFullYear()}.${pad(weekCursor.getMonth()+1)}.${pad(weekCursor.getDate())} — ${end.getFullYear()}.${pad(end.getMonth()+1)}.${pad(end.getDate())}`;
  const today=iso(new Date());let total=0;const cols=[];
  for(let i=0;i<5;i++){
    const d=addDays(weekCursor,i),date=iso(d),tasks=tasksForDate(date);total+=tasks.length;
    const items=tasks.length?tasks.map(t=>{const c=projectColor(t.project);return `<div class="work-item" style="--accent:${c.accent};--soft:${c.soft}"><div class="work-project">${esc(t.project)}</div><div class="work-text">${esc(t.task)}</div>${t.type||t.collab?`<div class="work-meta">${esc([t.type,t.collab].filter(Boolean).join(' · '))}</div>`:''}</div>`}).join(''):'<div class="empty-day">기록 없음</div>';
    cols.push(`<div class="day-col"><div class="day-head ${date===today?'today':''}"><div class="day-name">${koreanDay(d)}요일</div><div class="day-date">${d.getMonth()+1}.${d.getDate()}</div><div class="day-count">${tasks.length}개 업무</div></div><div class="day-body">${items}</div></div>`)
  }
  $('weekGrid').innerHTML=cols.join('');$('weekMeta').textContent=`이번 주 ${total}개 업무`;
}
function renderMonth(){
  $('monthTitle').textContent=`${monthCursor.getFullYear()}.${pad(monthCursor.getMonth()+1)}`;const y=monthCursor.getFullYear(),m=monthCursor.getMonth();const first=new Date(y,m,1),start=new Date(y,m,1-first.getDay()),today=iso(new Date());const cells=[];
  for(let i=0;i<42;i++){
    const d=addDays(start,i),date=iso(d),tasks=tasksForDate(date);const projects=[...new Set(tasks.map(t=>t.project))].slice(0,3);cells.push(`<div class="cal-day ${d.getMonth()!==m?'other':''} ${date===today?'today':''}" data-date="${date}"><div class="cal-num"><span>${d.getDate()}</span><span class="cal-count">${tasks.length?tasks.length+'건':''}</span></div><div class="cal-lines">${projects.map(p=>`<div class="cal-line">${esc(p)}</div>`).join('')}${tasks.length&&projects.length<tasks.length?`<div class="cal-line">+ ${Math.max(0,tasks.length-projects.length)} more</div>`:''}</div></div>`)
  }
  $('calendar').innerHTML=cells.join('');document.querySelectorAll('.cal-day').forEach(el=>{el.onclick=()=>showDay(el.dataset.date)});
}
function renderProjects(){
  const q=normalize($('projectQuery').value);const groups={};state.tasks.forEach(t=>(groups[t.project]??=[]).push(t));
  const arr=Object.entries(groups).filter(([p])=>!q||normalize(p).includes(q)).sort((a,b)=>b[1].length-a[1].length);
  $('projectList').innerHTML=arr.length?arr.map(([p,tasks])=>{const dates=tasks.map(t=>t.date).sort();return `<button class="project-card" data-project="${esc(p)}"><h3>${esc(p)}</h3><div class="project-count">${tasks.length}</div><p>${fmtDate(dates[0])} — ${fmtDate(dates[dates.length-1])}</p></button>`}).join(''):'<div class="empty">프로젝트가 없습니다.</div>';
  document.querySelectorAll('.project-card').forEach(el=>el.onclick=()=>showProject(el.dataset.project));
}
function renderSearch(){
  const q=normalize($('searchQuery').value),type=$('typeFilter').value;const rows=state.tasks.filter(t=>(!type||t.type===type)&&(!q||normalize([t.project,t.task,t.type,t.collab,(t.tags||[]).join(' ')].join(' ')).includes(q))).sort((a,b)=>b.date.localeCompare(a.date));
  $('searchBody').innerHTML=rows.length?rows.map(t=>`<tr><td>${fmtDate(t.date)}</td><td>${esc(t.project)}</td><td class="raw-cell">${esc(t.task)}</td><td>${esc(t.type)}</td><td>${esc(t.collab)}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">검색 결과가 없습니다.</td></tr>';
}
function renderAll(){renderWeek();renderMonth();renderProjects();renderSearch()}
function showDay(date){const tasks=tasksForDate(date);$('dayTitle').textContent=fmtDate(date);$('daySub').textContent=`${tasks.length}개 업무`;$('dayItems').innerHTML=tasks.length?tasks.map(t=>{const c=projectColor(t.project);return `<div class="work-item" style="--accent:${c.accent};--soft:${c.soft};margin-bottom:8px"><div class="work-project">${esc(t.project)}</div><div class="work-text">${esc(t.task)}</div></div>`}).join(''):'<div class="empty">기록 없음</div>';$('dayDialog').showModal()}
function showProject(project){const tasks=state.tasks.filter(t=>t.project===project).sort((a,b)=>a.date.localeCompare(b.date));$('projectTitle').textContent=project;$('projectSub').textContent=`${tasks.length}개 기록`;$('projectTimeline').innerHTML=tasks.map(t=>`<div style="display:grid;grid-template-columns:105px 1fr;gap:12px;margin-bottom:8px"><div style="font-size:10px;color:#8b99b0;padding-top:10px">${fmtDate(t.date)}</div><div class="work-item"><div class="work-text">${esc(t.task)}</div></div></div>`).join('');$('projectDialog').showModal()}

function initControls(){
  const curYear=new Date().getFullYear();$('reportYear').innerHTML=Array.from({length:5},(_,i)=>curYear-i).map(y=>`<option value="${y}">${y}</option>`).join('');
  $('typeFilter').innerHTML='<option value="">모든 유형</option>'+TYPE_OPTIONS.map(x=>`<option>${x}</option>`).join('');
  document.querySelectorAll('.nav button').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===btn.dataset.page))});
  document.querySelectorAll('.open-report').forEach(b=>b.onclick=()=>$('reportDialog').showModal());
  $('prevWeek').onclick=()=>{weekCursor=addDays(weekCursor,-7);renderWeek()};$('nextWeek').onclick=()=>{weekCursor=addDays(weekCursor,7);renderWeek()};$('thisWeek').onclick=()=>{weekCursor=startOfWeek(new Date());renderWeek()};
  $('prevMonth').onclick=()=>{monthCursor=new Date(monthCursor.getFullYear(),monthCursor.getMonth()-1,1);renderMonth()};$('nextMonth').onclick=()=>{monthCursor=new Date(monthCursor.getFullYear(),monthCursor.getMonth()+1,1);renderMonth()};$('thisMonth').onclick=()=>{monthCursor=new Date(new Date().getFullYear(),new Date().getMonth(),1);renderMonth()};
  $('projectQuery').oninput=renderProjects;$('searchQuery').oninput=renderSearch;$('typeFilter').onchange=renderSearch;
  $('sampleBtn').onclick=()=>{$('reportInput').value='04월28일(화) 소담 업무보고\n- 모션 리클라이너 모터 추가 파트 초안 디자인\n- 세라믹 토치 파트 파일 경로 및 분류 작업 (with. 혜주)\n- 매트리스 방수커버 내용 정리 및 상세 초안 ing'};
  $('saveReportBtn').onclick=async()=>{const raw=$('reportInput').value.trim();if(!raw)return alert('업무보고 내용을 붙여넣어 주세요.');const parsed=parseReports(raw,Number($('reportYear').value));if(!parsed.length)return alert('업무보고 날짜를 찾지 못했습니다.');try{const r=await insertParsed(parsed);$('reportInput').value='';$('reportDialog').close();toast(`${r.reportsAdded}일치 · ${r.tasksAdded}개 저장${r.dupes?` · 중복 ${r.dupes}건 제외`:''}`)}catch(e){alert('저장 실패: '+e.message)}};
  $('importText').onchange=e=>{const f=e.target.files[0];if(!f)return;const reader=new FileReader();reader.onload=async()=>{try{$('importState').textContent='저장 중…';const parsed=parseReports(reader.result,Number($('reportYear').value)||2026);if(!parsed.length)throw new Error('업무보고 형식을 찾지 못했습니다.');const r=await insertParsed(parsed);$('importState').textContent=`${r.tasksAdded}개 저장 · 중복 ${r.dupes}건 제외`;toast('기존 기록 가져오기 완료')}catch(err){$('importState').textContent='실패';alert(err.message)}e.target.value=''};reader.readAsText(f)};
  $('exportJson').onclick=()=>download(`work-archive-${iso(new Date())}.json`,JSON.stringify(state,null,2),'application/json');
  $('exportCsv').onclick=()=>{const rows=[['날짜','프로젝트','업무 원문','유형','협업'],...state.tasks.map(t=>[t.date,t.project,t.task,t.type,t.collab])];download(`work-archive-${iso(new Date())}.csv`,rows.map(r=>r.map(csvEscape).join(',')).join('\n'),'text/csv;charset=utf-8')};
  $('logoutBtn').onclick=async()=>{if(db)await db.auth.signOut();location.reload()};
}

async function initAuth(){
  const cfg=window.WORK_ARCHIVE_CONFIG||{};if(!cfg.supabaseUrl||!cfg.supabaseAnonKey){$('setupNote').hidden=false;$('setupNote').innerHTML='온라인 DB 연결 전입니다. <b>config.js</b>에 Supabase Project URL과 Publishable/Anon key가 들어가면 바로 사용할 수 있습니다.';$('authBtn').disabled=true;return}
  db=supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{session}}=await db.auth.getSession();if(session?.user){user=session.user;afterAuth()}
  db.auth.onAuthStateChange((event,session)=>{if(session?.user){user=session.user;afterAuth()}else if(event==='SIGNED_OUT'){$('authShell').classList.remove('hidden')}});
  $('authBtn').onclick=async()=>{const email=$('authEmail').value.trim();if(!email)return alert('이메일을 입력해 주세요.');$('authBtn').disabled=true;$('authBtn').textContent='메일 보내는 중…';const redirect=location.origin+location.pathname;const {error}=await db.auth.signInWithOtp({email,options:{emailRedirectTo:redirect,shouldCreateUser:true}});$('authBtn').disabled=false;$('authBtn').textContent='내 기록 열기';if(error)return alert(error.message);toast('이메일로 접속 링크를 보냈습니다.');$('setupNote').hidden=false;$('setupNote').textContent='메일에서 접속 링크를 한 번 눌러 주세요. 이 브라우저에는 로그인 상태가 유지됩니다.'};
}
async function afterAuth(){$('authShell').classList.add('hidden');$('accountEmail').textContent=user.email||'';await loadRemote()}

initControls();renderAll();initAuth();
