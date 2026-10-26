const cfg=window.MF_AUTH_CONFIG||{};
const key=cfg.anonKey||localStorage.getItem('mf_superdb_anon')||sessionStorage.getItem('mf_superdb_anon')||'';
const button=document.getElementById('mfUsersHeader');
if(button&&key){
 try{
  let factory=null;
  for(const src of ['https://cdn.jsdelivr.net/npm/@superdb/client/+esm','https://esm.sh/@superdb/client?bundle']){
   try{const m=await import(src);if(typeof m.createClient==='function'){factory=m.createClient;break}}catch(e){console.warn('SDK SuperDB:',e)}
  }
  if(factory){
   const db=factory(cfg.url,key,{project:cfg.projectId});
   const {data,error}=await db.auth.getUser();
   if(!error&&data?.user){
    const {data:profile,error:pErr}=await db.from('art_profiles').select('role,active').eq('id',data.user.id).maybeSingle();
    if(!pErr&&profile?.active&&['principal','administrador'].includes(profile.role))button.hidden=false;
   }
  }
 }catch(err){console.warn('Menu Usuários não disponível:',err)}
}
