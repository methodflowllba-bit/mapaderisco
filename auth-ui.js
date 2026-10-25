let createClient;
try {
 const sdk=await import('https://esm.sh/@superdb/client@0.3.0?bundle');
 if(typeof sdk.createClient!=='function')throw Error('O módulo não exporta createClient.');
 createClient=sdk.createClient;
} catch (firstError) {
 try {
  const sdk=await import('https://cdn.jsdelivr.net/npm/@superdb/client@0.3.0/+esm');
  if(typeof sdk.createClient!=='function')throw Error('O CDN alternativo não exporta createClient.');
  createClient=sdk.createClient;
 } catch(secondError) {
  const el=document.getElementById('mf-test-status');
  if(el)el.textContent='Falha ao carregar SDK SuperDB: '+String(secondError?.message||secondError)+'. Verifique a rede, a versão publicada e o console (F12).';
  console.error('SuperDB SDK:',firstError,secondError);
 }
}
const cfg=window.MF_AUTH_CONFIG||{};
if(createClient&&cfg.provider==='superdb'&&cfg.enabled===true){
 const root=document.createElement('div');root.id='mfAuthOverlay';root.className='mf-auth-overlay';
 root.innerHTML='<section class="mf-auth-panel"><h2>Method Flow — Mapa de Risco</h2><p id="mfStatus"></p><div id="mfAuthBody"></div></section>';
 const style=document.createElement('style');
 style.textContent='.mf-auth-overlay{position:fixed;inset:0;z-index:6000;background:#071a3af2;display:flex;align-items:center;justify-content:center;padding:16px}.mf-auth-panel{width:min(580px,96vw);max-height:94vh;overflow:auto;background:#fff;color:#122a45;border-radius:12px;padding:24px;box-shadow:0 12px 45px #0006}.mf-auth-panel input{width:100%;padding:11px;margin:5px 0 12px;border:1px solid #cad8e7;border-radius:6px}.mf-auth-panel label{font-weight:600;font-size:13px}.mf-auth-panel button{margin:5px}.mf-auth-user{padding:10px;border-bottom:1px solid #d9e4ee}.mf-auth-users{max-height:320px;overflow:auto;border:1px solid #d6dfeb;border-radius:8px}.mf-auth-hint{color:#61728b;font-size:13px}.mf-auth-error{color:#b22232}';
 document.head.appendChild(style);document.body.appendChild(root);
 const $=id=>document.getElementById(id);
 const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const status=(m,error=false)=>{const el=$('mfStatus');el.textContent=m;el.className=error?'mf-auth-error':'mf-auth-hint'};
 const input=(id,label,type='text')=>'<label for="'+id+'">'+label+'</label><input id="'+id+'" type="'+type+'" required>';
 const show=()=>{root.style.display='flex'};
 const hide=()=>{root.style.display='none'};
 let client=null,profile=null,navigation=null;
 function login(){
   show();
   $('mfAuthBody').innerHTML=input('mfEmail','E-mail','email')+input('mfPassword','Senha','password')+
    '<button id="mfSignIn">Entrar</button><button class="secondary" id="mfFirst">1º acesso</button>';
   status('Entre com sua conta cadastrada no SuperDB.');
   $('mfSignIn').onclick=async()=>{
    const btn=$('mfSignIn');btn.disabled=true;
    try{
     const email=$('mfEmail').value.trim().toLowerCase(),password=$('mfPassword').value;
     if(!email||!password)throw Error('Preencha e-mail e senha.');
     const {error}=await client.auth.signInWithPassword({email,password});
     if(error)throw error;
     await checkSession();
    }catch(e){status(e.message||'Não foi possível entrar.',true)}
    finally{btn.disabled=false}
   };
   $('mfFirst').onclick=()=>status('1º acesso sem e-mail: o serviço administrativo de ativação ainda precisa ser implantado.',true);
 }
 async function checkSession(){
  const {data,error}=await client.auth.getUser();
  const user=data?.user;
  if(error||!user){login();return}
  try{
   const {data:p,error:e}=await client.from('art_profiles').select('id,email,role,active').eq('id',user.id).maybeSingle();
   if(e)throw e;
   if(!p?.active)throw Error('Conta não ativa ou sem perfil autorizado.');
   profile=p;hide();createNavigation();
  }catch(e){await client.auth.signOut();login();status(e.message||'Perfil não autorizado.',true)}
 }
 async function signOut(){
  if(!client)throw Error('SuperDB não conectado.');
  const {error}=await client.auth.signOut();
  if(error)throw error;
  profile=null;navigation?.remove();navigation=null;login();
 }
 function createNavigation(){
  navigation?.remove();
  const nav=document.createElement('div');
  nav.className='no-print';nav.style='position:fixed;bottom:12px;right:12px;z-index:1800;background:#fff;border:1px solid #cad9ed;border-radius:9px;padding:8px;box-shadow:0 4px 15px #0002';
  if(profile.role==='principal'||profile.role==='administrador'){
   const users=document.createElement('button');users.textContent='👥 Usuários';users.onclick=showUsers;nav.appendChild(users);
  }
  const logout=document.createElement('button');logout.textContent='⏻ Sair';logout.className='secondary';
  logout.onclick=()=>signOut().catch(e=>alert(e.message));nav.appendChild(logout);
  navigation=nav;document.body.appendChild(nav);
 }
 async function showUsers(){
  if(!profile||!['principal','administrador'].includes(profile.role))return;
  show();
  status('Consulta de usuários. Para cadastrar ou ativar sem e-mail, ainda será necessário conectar um serviço administrativo seguro.');
  $('mfAuthBody').innerHTML='<h3>Usuários</h3><div class="mf-auth-users" id="mfUsersList">Consultando...</div><button id="mfCloseUsers">Voltar ao mapa</button>';
  $('mfCloseUsers').onclick=hide;
  try{
   const {data,error}=await client.from('art_profiles').select('email,role,active').order('email');
   if(error)throw error;
   $('mfUsersList').innerHTML=(data||[]).map(p=>'<div class="mf-auth-user"><strong>'+escapeHTML(p.email)+'</strong><div class="mf-auth-hint">'+escapeHTML(p.role)+' — '+(p.active?'Ativo':'Inativo')+'</div></div>').join('')||'Nenhum usuário encontrado.';
  }catch(e){status('Erro ao listar usuários: '+e.message,true)}
 }
 window.MethodFlowAuth={get client(){return client},get profile(){return profile},signOut,showUsers};
 if(!cfg.anonKey||!cfg.projectId||!cfg.url){
  status('Falta configurar a chave pública anon em auth-config.js.',true);
  $('mfAuthBody').textContent='Login não ativado: configure a conexão antes de liberar o sistema.';
 }else{
  try{client=createClient(cfg.url,cfg.anonKey,{project:cfg.projectId});checkSession().catch(e=>{login();status(e.message,true)})}
  catch(e){status('Erro no SDK: '+e.message,true)}
 }
}