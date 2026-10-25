import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const cfg=window.MF_AUTH_CONFIG||{};
if(cfg.url&&cfg.anonKey){
 const supabase=createClient(cfg.url,cfg.anonKey),e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const gate=document.createElement('div');gate.id='mf-login-gate';
 gate.style='position:fixed;inset:0;z-index:6000;background:#071c43;display:flex;justify-content:center;align-items:center;padding:16px';
 const panel=document.createElement('section');panel.style='background:white;padding:24px;max-height:95vh;overflow:auto;width:min(580px,96vw);border-radius:12px;color:#162943';
 gate.appendChild(panel);document.body.appendChild(gate);
 const input=(id,label,type='text')=>'<label style="display:block;margin-top:9px">'+label+'</label><input id="'+id+'" type="'+type+'" style="width:100%;padding:10px;margin:5px 0">';
 const message=s=>{const t=document.getElementById('mf-msg');if(t)t.textContent=s};
 async function api(action,args={},authorized=false){
  const {data:{session}}=await supabase.auth.getSession();
  const res=await fetch(cfg.url.replace(/\/$/,'')+'/functions/v1/'+(cfg.functionName||'art-access'),{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.anonKey,...(authorized&&session?{Authorization:'Bearer '+session.access_token}:{})},body:JSON.stringify({action,...args})});
  const data=await res.json();if(!res.ok||data.error)throw Error(data.error||'Falha na operação');return data;
 }
 function base(title,body){panel.innerHTML='<h2>'+title+'</h2><p id="mf-msg" style="color:#6b7280"></p>'+body}
 function login(){
  base('Method Flow — Entrar',input('mf-email','E-mail','email')+input('mf-pass','Senha','password')+'<button id="mf-entrar">Entrar</button> <button id="mf-first">1º acesso</button>');
  document.getElementById('mf-first').onclick=first;
  document.getElementById('mf-entrar').onclick=async()=>{try{
   const {data,error}=await supabase.auth.signInWithPassword({email:document.getElementById('mf-email').value,password:document.getElementById('mf-pass').value});
   if(error)throw error;
   const {data:profile}=await supabase.from('art_profiles').select('id,role,active,email').eq('id',data.user.id).maybeSingle();
   if(!profile?.active){await supabase.auth.signOut();throw Error('Cadastro não ativo')}
   access(profile);
  }catch(err){message(err.message)}};
 }
 function first(){
  base('1º acesso — Criar senha',input('mf-email','E-mail','email')+input('mf-code','Código fornecido pelo administrador')+input('mf-pass','Senha (mínimo 12 caracteres)','password')+input('mf-confirm','Confirme a senha','password')+'<button id="mf-create">Criar senha</button> <button id="mf-back">Voltar</button>');
  document.getElementById('mf-back').onclick=login;
  document.getElementById('mf-create').onclick=async()=>{try{
   const pwd=document.getElementById('mf-pass').value;if(pwd!==document.getElementById('mf-confirm').value)throw Error('Senhas diferentes');
   await api('first_access',{email:document.getElementById('mf-email').value,code:document.getElementById('mf-code').value,password:pwd});
   login();message('Senha cadastrada. Entre com seu e-mail e senha.');
  }catch(err){message(err.message)}};
 }
 function access(profile){
  gate.style.display='none';
  const nav=document.createElement('aside');nav.id='mf-access-nav';nav.style='position:fixed;bottom:12px;right:12px;z-index:1800;background:white;padding:6px;border-radius:10px;border:1px solid #cbd5e1';
  if(profile.role!=='usuario'){const button=document.createElement('button');button.textContent='👥 Usuários';button.onclick=users;nav.appendChild(button)}
  const logout=document.createElement('button');logout.textContent='Sair';logout.onclick=async()=>{await supabase.auth.signOut();nav.remove();gate.style.display='flex';login()};nav.appendChild(logout);document.body.appendChild(nav);
 }
 async function users(){
  gate.style.display='flex';
  base('Administração — Usuários',input('mf-new-email','E-mail do novo usuário','email')+'<label>Perfil</label><select id="mf-role"><option value="usuario">Usuário</option><option value="administrador">Administrador</option></select><p><label><input id="mf-active" type="checkbox" checked> Ativo</label></p><button id="mf-register">Cadastrar</button> <button id="mf-close">Fechar</button><div id="mf-users"></div>');
  document.getElementById('mf-close').onclick=()=>gate.style.display='none';
  document.getElementById('mf-register').onclick=async()=>{try{await api('register',{email:document.getElementById('mf-new-email').value,role:document.getElementById('mf-role').value,active:document.getElementById('mf-active').checked},true);message('Usuário cadastrado. Gere o código de primeiro acesso.');await list()}catch(err){message(err.message)}};
  await list();
 }
 async function list(){
  try{const users=await api('list_users',{},true),el=document.getElementById('mf-users');
   el.innerHTML='<h3>Cadastros</h3>'+[...users.profiles.map(x=>({...x,kind:'profile'})),...users.pending.map(x=>({...x,kind:'pending'}))].map(x=>'<div style="padding:10px;border-bottom:1px solid #ddd"><b>'+e(x.email)+'</b> — '+e(x.role)+' — '+(x.active?'Ativo':'Inativo')+'<p>'+(x.role==='principal'?'':'<button data-id="'+e(x.id)+'" data-kind="'+x.kind+'" data-active="'+!x.active+'" class="mf-toggle">'+(x.active?'Desativar':'Ativar')+'</button>')+(x.kind==='pending'&&x.active&&!x.claimed_at?' <button class="mf-code" data-id="'+e(x.id)+'">Gerar código 1º acesso</button>':'')+'</p></div>').join('');
   el.querySelectorAll('.mf-toggle').forEach(btn=>btn.onclick=async()=>{try{await api('set_active',{id:btn.dataset.id,kind:btn.dataset.kind,active:btn.dataset.active==='true'},true);await list()}catch(err){message(err.message)}});
   el.querySelectorAll('.mf-code').forEach(btn=>btn.onclick=async()=>{try{const d=await api('issue_code',{id:btn.dataset.id},true);const p=document.createElement('p');p.textContent='Código único (48h): '+d.code+' — entregue ao usuário por um canal seguro. Não é enviado por e-mail.';el.prepend(p)}catch(err){message(err.message)}});
  }catch(err){message(err.message)}
 }
 async function start(){
  const {data:{session}}=await supabase.auth.getSession();
  if(session){const {data:p}=await supabase.from('art_profiles').select('id,role,active,email').eq('id',session.user.id).maybeSingle();if(p?.active){access(p);return}}
  login();
 }
 start().catch(x=>{login();message(x.message)});
 window.MethodFlowAuth={supabase};
}
