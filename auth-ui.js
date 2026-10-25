const cfg=window.MF_AUTH_CONFIG||{};
if(cfg.provider==='superdb'&&cfg.enabled===true){
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
     if(!client)throw Error('Conexão ainda indisponível. Verifique o diagnóstico do SDK.');
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
 const diagnostic=document.getElementById('mf-test-status');
 const info=message=>{if(diagnostic)diagnostic.textContent=message;status(message)};
 const withTimeout=(promise,ms,label)=>new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(new Error(label+' excedeu o tempo limite de '+Math.round(ms/1000)+' segundos.')),ms);
   Promise.resolve(promise).then(v=>{clearTimeout(timeout);resolve(v)},e=>{clearTimeout(timeout);reject(e)});
 });
 async function initializeSdk(){
   login();
   if(!cfg.anonKey||!cfg.projectId||!cfg.url){
     info('Configure a chave pública anon do SuperDB para testar o login.');
     return;
   }
   info('Carregando biblioteca SuperDB…');
   let factory=null,errors=[];
   for(const source of ['https://esm.sh/@superdb/client?bundle','https://cdn.jsdelivr.net/npm/@superdb/client/+esm']){
     try{
       const module=await withTimeout(import(source),9000,'Carregamento do SDK');
       if(typeof module.createClient!=='function')throw Error('Exportação createClient não encontrada');
       factory=module.createClient;break;
     }catch(error){errors.push(error.message||String(error));console.warn('Erro SDK SuperDB:',source,error)}
   }
   if(!factory){
     info('Não foi possível carregar o SDK: '+errors.join(' / ')+'. Abra o console com F12 para detalhes.');
     return;
   }
   try{
     client=factory(cfg.url,cfg.anonKey,{project:cfg.projectId});
     info('SDK carregado. Verificando sessão existente…');
     await withTimeout(checkSession(),10000,'Verificação de sessão');
     if(!profile)info('SDK conectado. Informe e-mail e senha para entrar.');
     else info('Sessão autenticada e perfil carregado.');
   }catch(error){
     login();info('Não foi possível validar a sessão: '+(error.message||error)+'. Tente entrar ou veja o console.');
   }
 }
 initializeSdk().catch(error=>info('Falha ao iniciar autenticação: '+(error.message||error)));
}