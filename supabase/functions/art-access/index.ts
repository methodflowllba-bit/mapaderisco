// Supabase Edge Function: art-access
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ART_CODE_PEPPER
import { createClient } from 'npm:@supabase/supabase-js@2';
const URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const PEPPER = Deno.env.get('ART_CODE_PEPPER') ?? '';
const server = createClient(URL,SERVICE,{auth:{persistSession:false}});
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const json=(obj:unknown,status=200)=>new Response(JSON.stringify(obj),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const normal=(x:unknown)=>String(x??'').trim().toLowerCase();
const emailOk=(s:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)&&s.length<=254;
async function sha(text:string){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(PEPPER+':'+text));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('')}
function code(){const bytes=crypto.getRandomValues(new Uint8Array(18));return Array.from(bytes).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase()}
function fail(err:unknown){return json({error:String(err instanceof Error?err.message:err)},400)}
async function actor(req:Request){
 const auth=req.headers.get('Authorization')||'';
 if(!auth.startsWith('Bearer '))return null;
 const userClient=createClient(URL,ANON,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
 const {data,error}=await userClient.auth.getUser();
 if(error||!data.user)return null;
 const {data:profile}=await server.from('art_profiles').select('id,email,role,active').eq('id',data.user.id).maybeSingle();
 return profile?.active&&['principal','administrador'].includes(profile.role)?profile:null;
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return json({error:'Método inválido'},405);
 if(!URL||!ANON||!SERVICE||PEPPER.length<32)return json({error:'Backend não configurado'},503);
 let data:Record<string,unknown>;
 try{data=await req.json();if(!data||typeof data!=='object'||Array.isArray(data))throw Error()}catch{return json({error:'JSON inválido'},400)}
 const action=String(data.action||'');
 try{
  if(action==='first_access'){
   const email=normal(data.email),token=String(data.code??'').trim().toUpperCase(),password=String(data.password??'');
   if(!emailOk(email)||!(/^[0-9A-F]{36}$/.test(token))||password.length<12||password.length>128)return json({error:'Verifique e-mail, código e senha (mínimo de 12 caracteres)'},400);
   const {data:pending}=await server.from('art_pending_users').select('*').eq('email',email).maybeSingle();
   if(!pending||!pending.active||!pending.code_hash||pending.claimed_at||!pending.code_expires||new Date(pending.code_expires).getTime()<Date.now()||pending.failed_attempts>=5)return json({error:'Código inválido, expirado ou bloqueado. Solicite outro ao administrador.'},403);
   if(await sha(token)!==pending.code_hash){
     await server.from('art_pending_users').update({failed_attempts:(pending.failed_attempts||0)+1}).eq('id',pending.id);
     return json({error:'Código inválido, expirado ou bloqueado. Solicite outro ao administrador.'},403);
   }
   // Mark code consumed BEFORE provisioning the Auth account.
   const {data:claim,error:claimError}=await server.from('art_pending_users').update({claimed_at:new Date().toISOString(),code_hash:null}).eq('id',pending.id).is('claimed_at',null).select('id').maybeSingle();
   if(claimError||!claim)return json({error:'Código já utilizado'},409);
   const {data:newUser,error:createError}=await server.auth.admin.createUser({email,password,email_confirm:true});
   if(createError||!newUser.user){
      await server.from('art_pending_users').update({claimed_at:null,code_hash:null,active:false}).eq('id',pending.id);
      return json({error:'Não foi possível criar a conta. O administrador deve gerar novo código.'},400);
   }
   const {error:profileError}=await server.from('art_profiles').insert({id:newUser.user.id,email,role:pending.role,active:true});
   if(profileError){await server.auth.admin.deleteUser(newUser.user.id);return json({error:'Falha ao salvar permissões da conta'},500)}
   return json({ok:true,message:'Senha criada. Agora acesse com e-mail e senha.'});
  }
  const who=await actor(req);
  if(!who)return json({error:'Somente administrador ativo'},403);
  if(action==='list_users'){
    const [profiles,pending]=await Promise.all([server.from('art_profiles').select('id,email,role,active,created_at').order('created_at',{ascending:false}),server.from('art_pending_users').select('id,email,role,active,claimed_at,code_expires,created_at').order('created_at',{ascending:false})]);
    if(profiles.error||pending.error)return json({error:'Erro ao consultar usuários'},500);
    return json({profiles:profiles.data||[],pending:pending.data||[]});
  }
  if(action==='register'){
    const email=normal(data.email),role=String(data.role||'usuario'),active=data.active===true;
    if(!emailOk(email)||!['usuario','administrador'].includes(role))return json({error:'Cadastro inválido'},400);
    const {data:old}=await server.from('art_profiles').select('id').eq('email',email).maybeSingle();
    if(old)return json({error:'Este e-mail já possui acesso'},409);
    const {data:pending,error}=await server.from('art_pending_users').upsert({email,role,active,created_by:who.id,claimed_at:null,code_hash:null,code_expires:null,failed_attempts:0},{onConflict:'email'}).select('id').single();
    if(error)return fail(error);
    return json({ok:true,id:pending.id});
  }
  if(action==='set_active'){
    const userId=String(data.id||''),active=data.active===true,kind=String(data.kind||'');
    if(kind==='pending'){
     const {error}=await server.from('art_pending_users').update({active}).eq('id',userId);
     if(error)return fail(error);
    }else{
     const {data:target}=await server.from('art_profiles').select('role').eq('id',userId).maybeSingle();
     if(!target||target.role==='principal'||userId===who.id)return json({error:'Não é permitido alterar este acesso'},403);
     const {error}=await server.from('art_profiles').update({active}).eq('id',userId);
     if(error)return fail(error);
    }
    return json({ok:true});
  }
  if(action==='issue_code'){
    const id=String(data.id||'');
    const {data:pending}=await server.from('art_pending_users').select('id,active,claimed_at').eq('id',id).maybeSingle();
    if(!pending||!pending.active||pending.claimed_at)return json({error:'Cadastre e ative um usuário pendente antes'},403);
    const token=code();
    const {error}=await server.from('art_pending_users').update({code_hash:await sha(token),code_expires:new Date(Date.now()+48*60*60*1000).toISOString(),failed_attempts:0}).eq('id',id);
    if(error)return fail(error);
    return json({ok:true,code:token,expiresInHours:48});
  }
  return json({error:'Ação desconhecida'},404);
 }catch(e){return fail(e)}
});
