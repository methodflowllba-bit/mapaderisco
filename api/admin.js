import { createClient } from '@superdb/client';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

const PROJECT='p_4c359bf39f',AUTH='https://auth.superdb.com.br';
const FRONT='https://methodflowllba-bit.github.io';
const allowedRoles=new Set(['usuario','administrador']);
const reply=(res,status,body)=>res.status(status).json(body);
const digest=v=>createHash('sha256').update(v).digest('hex');
const equal=(a,b)=>{if(!a||!b)return false;const aa=Buffer.from(a,'hex'),bb=Buffer.from(b,'hex');return aa.length===bb.length&&timingSafeEqual(aa,bb)};
const emailValid=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)&&e.length<=254;
function readBody(req){return req.body&&typeof req.body==='object'?req.body:{}}
function clients(){
 const anon=process.env.SUPERDB_ANON_KEY,service=process.env.SUPERDB_SERVICE_ROLE_KEY;
 if(!anon||!service)throw Error('Server credentials not configured');
 return {app:createClient(AUTH,anon,{project:PROJECT,autoRefreshToken:false}),admin:createClient(AUTH,service,{project:PROJECT,autoRefreshToken:false})};
}
async function verifiedAdmin(req,app,admin){
 const bearer=String(req.headers.authorization||'');
 if(!bearer.startsWith('Bearer '))return null;
 const token=bearer.slice(7).trim();
 if(!token)return null;
 const {data,error}=await app.auth.getUser(token);
 if(error||!data?.user?.id)return null;
 const {data:profile,error:pError}=await admin.from('art_profiles').select('id,role,active').eq('id',data.user.id).maybeSingle();
 if(pError||!profile?.active||!['principal','administrador'].includes(profile.role))return null;
 return profile;
}
async function findPending(admin,email){
 const {data,error}=await admin.from('art_pending_users').select('*').eq('email',email).maybeSingle();
 if(error)throw error;
 return data;
}
async function respond(req,res){
 res.setHeader('Access-Control-Allow-Origin',FRONT);
 res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
 res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
 res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='POST')return reply(res,405,{message:'Método não permitido'});
 const route=String(req.query?.route||'');
 try{
 const {app,admin}=clients(),body=readBody(req);
 if(route==='users'){
  const profile=await verifiedAdmin(req,app,admin);
  if(!profile)return reply(res,403,{message:'Acesso administrativo não autorizado'});
  const email=String(body.email||'').trim().toLowerCase();
  const role=String(body.role||''),name=String(body.name||'').trim(),active=body.active===true;
  if(!emailValid(email)||!allowedRoles.has(role)||name.length<2||name.length>160)return reply(res,400,{message:'Nome, e-mail ou perfil inválido'});
  if(await findPending(admin,email))return reply(res,409,{message:'Esse e-mail já possui um cadastro pendente'});
  const existing=await admin.from('art_profiles').select('id').eq('email',email).maybeSingle();
  if(existing.error)throw existing.error;
  if(existing.data)return reply(res,409,{message:'Esse e-mail já possui uma conta'});
  const code=randomBytes(20).toString('base64url');
  const exp=new Date(Date.now()+24*60*60*1000).toISOString();
  const {error}=await admin.from('art_pending_users').insert({email,role,active,code_hash:digest(code),code_expires:exp,failed_attempts:0,created_by:profile.id});
  if(error)throw error;
  return reply(res,201,{message:'Cadastro pré-autorizado. Entregue o código ao usuário por canal seguro.',email,code,expires_at:exp});
 }
 if(route==='account/activate'){
  const email=String(body.email||'').trim().toLowerCase(),code=String(body.code||'').trim(),pass=String(body.password||'');
  if(!emailValid(email)||code.length<20||pass.length<12||pass.length>128)return reply(res,400,{message:'Dados inválidos'});
  const record=await findPending(admin,email);
  if(!record||!record.active||record.claimed_at||!record.code_expires||Date.parse(record.code_expires)<Date.now()||record.failed_attempts>=5)return reply(res,400,{message:'Autorização inválida, inativa ou expirada'});
  if(!equal(digest(code),record.code_hash)){
   await admin.from('art_pending_users').update({failed_attempts:Number(record.failed_attempts||0)+1}).eq('id',record.id);
   return reply(res,400,{message:'Autorização inválida, inativa ou expirada'});
  }
  if(body.mode==='reset')return reply(res,501,{message:'Redefinição sem e-mail ainda exige suporte confirmado da API administrativa SuperDB'});
  if(body.mode!=='first')return reply(res,400,{message:'Operação inválida'});
  const {data,error}=await app.auth.signUp({email,password:pass});
  if(error||!data?.user?.id)return reply(res,400,{message:'Não foi possível ativar o usuário na autenticação'});
  const {error:profileError}=await admin.from('art_profiles').insert({id:data.user.id,email,role:record.role,active:true});
  if(profileError)return reply(res,500,{message:'Conta criada, mas o perfil precisa de reconciliação administrativa'});
  const {error:claimError}=await admin.from('art_pending_users').update({claimed_at:new Date().toISOString(),code_hash:null}).eq('id',record.id);
  if(claimError)return reply(res,500,{message:'Conta criada, mas a autorização precisa de revisão administrativa'});
  return reply(res,200,{message:'Senha criada. Entre com e-mail e senha.'});
 }
 return reply(res,404,{message:'Rota inexistente'});
 }catch(err){console.error('MF admin API',err?.message||err);return reply(res,500,{message:'Falha no serviço administrativo'})}
}
export default respond;
