window.WORK_ARCHIVE_CONFIG = {
  supabaseUrl: 'https://rkcmdpbrfsewkifskkkq.supabase.co',
  supabaseAnonKey: 'sb_publishable_d_xuZvGqh1yG9OfVncEiow_W64g_Iai'
};
window.addEventListener('load',()=>{
  const mobile=document.createElement('link');
  mobile.rel='stylesheet';
  mobile.href='./mobile.css?v=20260910-1';
  document.head.appendChild(mobile);

  const s=document.createElement('script');
  s.src='./app-patch.js?v=20260910-3';
  s.onload=()=>{
    const edit=document.createElement('script');
    edit.src='./edit-patch.js?v=20260910-1';
    document.body.appendChild(edit);

    const auth=document.createElement('script');
    auth.src='./auth-patch.js?v=20260916-2';
    document.body.appendChild(auth);

    let tries=0;
    const timer=setInterval(async()=>{
      tries++;
      try{
        if(typeof db!=='undefined'&&db&&typeof user!=='undefined'&&user){
          clearInterval(timer);
          const {data,error}=await db.from('leave_records').select('*').order('leave_date',{ascending:false});
          if(!error){
            window._waLeaves=data||[];
            if(typeof renderWeek==='function')renderWeek();
            if(typeof renderMonth==='function')renderMonth();
          }
        }else if(tries>=20){clearInterval(timer)}
      }catch(e){if(tries>=20)clearInterval(timer)}
    },250);
  };
  document.body.appendChild(s);
});
