// Work Archive auth patch: email + password login, no magic-link emails.
(() => {
  const $id = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const style = document.createElement('style');
  style.textContent = `
    .wa-auth-password-wrap{margin-top:10px}
    .wa-auth-password-wrap label{display:block;font-size:10px;color:#8391a9;font-weight:800;margin-bottom:6px}
    .wa-auth-password-wrap input{width:100%;border:1px solid var(--line);border-radius:11px;padding:11px 12px;background:#fff;outline:none}
    .wa-auth-note{font-size:9.5px!important;color:#91a0b6!important;margin-top:10px!important}
    #waPasswordBtn{white-space:nowrap}
    .wa-password-form{display:grid;gap:10px}
    .wa-password-form input{width:100%;border:1px solid var(--line);border-radius:11px;padding:11px 12px;background:#fff;outline:none}
    @media(max-width:700px){#waPasswordBtn{grid-column:1/-1;width:100%}}
  `;
  document.head.appendChild(style);

  async function waitForApp(){
    for(let i=0;i<80;i++){
      if(typeof db !== 'undefined' && db && $id('authShell') && $id('authBtn') && $id('authEmail')) return true;
      await sleep(100);
    }
    return false;
  }

  function humanAuthError(error){
    const msg = String(error?.message || error || '로그인에 실패했습니다.');
    if(/invalid login credentials/i.test(msg)) return '이메일 또는 비밀번호가 맞지 않습니다.';
    if(/email not confirmed/i.test(msg)) return '이 이메일은 아직 확인되지 않았습니다.';
    if(/too many requests|rate limit/i.test(msg)) return '로그인 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
    return msg;
  }

  function setupLoginUI(){
    const shell = $id('authShell');
    const card = shell?.querySelector('.auth-card');
    const email = $id('authEmail');
    const btn = $id('authBtn');
    if(!card || !email || !btn) return;

    const desc = card.querySelector('p');
    if(desc) desc.textContent = '메일 인증 없이 이메일과 비밀번호로 바로 접속합니다. 로그인 상태는 이 기기에 계속 유지됩니다.';

    let wrap = $id('waAuthPasswordWrap');
    if(!wrap){
      wrap = document.createElement('div');
      wrap.id = 'waAuthPasswordWrap';
      wrap.className = 'wa-auth-password-wrap';
      wrap.innerHTML = '<label for="waAuthPassword">비밀번호</label><input type="password" id="waAuthPassword" autocomplete="current-password" placeholder="비밀번호">';
      email.insertAdjacentElement('afterend', wrap);
    }

    const help = card.querySelector('.auth-help');
    if(help){
      help.className = 'auth-help wa-auth-note';
      help.textContent = '로그인할 때 메일은 발송되지 않습니다.';
    }
    const setupNote = $id('setupNote');
    if(setupNote) setupNote.hidden = true;

    const saved = localStorage.getItem('wa-login-email');
    if(saved && !email.value) email.value = saved;

    btn.textContent = '로그인';
    btn.disabled = false;
    btn.onclick = async () => {
      const e = email.value.trim();
      const p = $id('waAuthPassword')?.value || '';
      if(!e) return alert('이메일을 입력해 주세요.');
      if(!p) return alert('비밀번호를 입력해 주세요.');
      btn.disabled = true;
      btn.textContent = '접속 중…';
      try{
        const { error } = await db.auth.signInWithPassword({ email:e, password:p });
        if(error) return alert(humanAuthError(error));
        localStorage.setItem('wa-login-email', e);
        if($id('waAuthPassword')) $id('waAuthPassword').value = '';
      } finally {
        btn.disabled = false;
        btn.textContent = '로그인';
      }
    };

    const enter = (ev) => { if(ev.key === 'Enter') btn.click(); };
    email.addEventListener('keydown', enter);
    $id('waAuthPassword')?.addEventListener('keydown', enter);
  }

  function ensurePasswordDialog(){
    if($id('waPasswordDialog')) return;
    const dlg = document.createElement('dialog');
    dlg.id = 'waPasswordDialog';
    dlg.innerHTML = `
      <div class="modal">
        <div class="modal-head">
          <div><h2>로그인 비밀번호 설정</h2><div class="modal-sub">한 번 설정하면 이후에는 메일 인증 없이 로그인할 수 있습니다.</div></div>
          <button class="close" id="waPasswordClose">×</button>
        </div>
        <div class="wa-password-form">
          <input type="password" id="waNewPassword" autocomplete="new-password" placeholder="새 비밀번호 (8자 이상)">
          <input type="password" id="waNewPassword2" autocomplete="new-password" placeholder="새 비밀번호 확인">
          <div class="hint">비밀번호는 이 사이트나 GitHub 코드에 저장되지 않고 Supabase Auth에서 해시로 관리됩니다.</div>
        </div>
        <div class="actions"><button class="btn primary" id="waSavePassword">비밀번호 저장</button></div>
      </div>`;
    document.body.appendChild(dlg);
    $id('waPasswordClose').onclick = () => dlg.close();
    $id('waSavePassword').onclick = async () => {
      const p1 = $id('waNewPassword').value;
      const p2 = $id('waNewPassword2').value;
      if(p1.length < 8) return alert('비밀번호를 8자 이상으로 설정해 주세요.');
      if(p1 !== p2) return alert('비밀번호 확인이 일치하지 않습니다.');
      const b = $id('waSavePassword');
      b.disabled = true; b.textContent = '저장 중…';
      try{
        const { error } = await db.auth.updateUser({ password:p1 });
        if(error) return alert(humanAuthError(error));
        $id('waNewPassword').value = '';
        $id('waNewPassword2').value = '';
        dlg.close();
        if(typeof toast === 'function') toast('비밀번호 설정 완료 · 이제 메일 인증이 필요 없습니다.');
      } finally {
        b.disabled = false; b.textContent = '비밀번호 저장';
      }
    };
  }

  function ensurePasswordButton(){
    if($id('waPasswordBtn')) return;
    const logout = $id('logoutBtn');
    if(!logout) return;
    const b = document.createElement('button');
    b.className = 'btn soft';
    b.id = 'waPasswordBtn';
    b.textContent = '비밀번호 설정/변경';
    b.onclick = () => { ensurePasswordDialog(); $id('waPasswordDialog').showModal(); };
    logout.parentNode.insertBefore(b, logout);
  }

  (async () => {
    if(!(await waitForApp())) return;
    setupLoginUI();
    ensurePasswordDialog();

    // If already signed in, expose a one-time password setup/change action.
    for(let i=0;i<80;i++){
      if(typeof user !== 'undefined' && user){ ensurePasswordButton(); break; }
      await sleep(100);
    }

    db.auth.onAuthStateChange((event, session) => {
      if(session?.user){
        setTimeout(() => ensurePasswordButton(), 0);
      } else if(event === 'SIGNED_OUT'){
        setTimeout(() => setupLoginUI(), 0);
      }
    });
  })();
})();