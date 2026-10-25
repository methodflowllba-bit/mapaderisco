-- Method Flow — Mapa de Risco / SuperDB p_4c359bf39f
-- CONFIRA no painel que o schema é proj_p_4c359bf39f antes de executar.
-- NÃO cole senhas/chaves neste arquivo. Nenhum dado será excluído.
-- SuperDB gerencia a transação automaticamente; não utilizar BEGIN.
-- Schema já existe e pertence ao projeto. Não executar CREATE SCHEMA (sem permissão no database).
create table if not exists proj_p_4c359bf39f.art_profiles(
 id uuid primary key,
 email text not null unique,
 role text not null default 'usuario' check (role in ('principal','administrador','usuario')),
 active boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists proj_p_4c359bf39f.art_pending_users(
 id uuid primary key default gen_random_uuid(),
 email text not null unique,
 role text not null check(role in ('administrador','usuario')),
 active boolean not null default false,
 code_hash text,
 code_expires timestamptz,
 failed_attempts integer not null default 0,
 claimed_at timestamptz,
 created_by uuid,
 created_at timestamptz not null default now()
);
create table if not exists proj_p_4c359bf39f.art_audits(
 id uuid primary key default gen_random_uuid(),
 data jsonb not null,
 created_by uuid not null default auth.uid(),
 updated_by uuid,
 updated_at timestamptz not null default now()
);
create index if not exists idx_art_audits_owner on proj_p_4c359bf39f.art_audits(created_by,updated_at desc);

-- Helpers SECURITY DEFINER to avoid RLS recursion on profiles.
create or replace function proj_p_4c359bf39f.mf_active()
returns boolean language sql stable security definer
set search_path=proj_p_4c359bf39f,pg_catalog
as $$select exists(select 1 from proj_p_4c359bf39f.art_profiles where id=auth.uid() and active=true)$$;
create or replace function proj_p_4c359bf39f.mf_admin()
returns boolean language sql stable security definer
set search_path=proj_p_4c359bf39f,pg_catalog
as $$select exists(select 1 from proj_p_4c359bf39f.art_profiles where id=auth.uid() and active=true and role in ('principal','administrador'))$$;
revoke all on function proj_p_4c359bf39f.mf_active() from public;
revoke all on function proj_p_4c359bf39f.mf_admin() from public;
grant execute on function proj_p_4c359bf39f.mf_active() to authenticated;
grant execute on function proj_p_4c359bf39f.mf_admin() to authenticated;

alter table proj_p_4c359bf39f.art_profiles enable row level security;
alter table proj_p_4c359bf39f.art_pending_users enable row level security;
alter table proj_p_4c359bf39f.art_audits enable row level security;

drop policy if exists mf_profiles_read on proj_p_4c359bf39f.art_profiles;
create policy mf_profiles_read on proj_p_4c359bf39f.art_profiles for select to authenticated
 using(id=auth.uid() or proj_p_4c359bf39f.mf_admin());

drop policy if exists mf_audits_read on proj_p_4c359bf39f.art_audits;
create policy mf_audits_read on proj_p_4c359bf39f.art_audits for select to authenticated
 using(proj_p_4c359bf39f.mf_active() and (created_by=auth.uid() or proj_p_4c359bf39f.mf_admin()));
drop policy if exists mf_audits_insert on proj_p_4c359bf39f.art_audits;
create policy mf_audits_insert on proj_p_4c359bf39f.art_audits for insert to authenticated
 with check(proj_p_4c359bf39f.mf_active() and created_by=auth.uid());
drop policy if exists mf_audits_update on proj_p_4c359bf39f.art_audits;
create policy mf_audits_update on proj_p_4c359bf39f.art_audits for update to authenticated
 using(proj_p_4c359bf39f.mf_active() and (created_by=auth.uid() or proj_p_4c359bf39f.mf_admin()))
 with check(proj_p_4c359bf39f.mf_active() and (created_by=auth.uid() or proj_p_4c359bf39f.mf_admin()));
drop policy if exists mf_audits_delete on proj_p_4c359bf39f.art_audits;
create policy mf_audits_delete on proj_p_4c359bf39f.art_audits for delete to authenticated
 using(proj_p_4c359bf39f.mf_active() and (created_by=auth.uid() or proj_p_4c359bf39f.mf_admin()));

revoke all on proj_p_4c359bf39f.art_profiles,proj_p_4c359bf39f.art_audits,proj_p_4c359bf39f.art_pending_users from anon;
revoke all on proj_p_4c359bf39f.art_profiles,proj_p_4c359bf39f.art_audits,proj_p_4c359bf39f.art_pending_users from authenticated;
grant select on proj_p_4c359bf39f.art_profiles to authenticated;
grant select,insert,update,delete on proj_p_4c359bf39f.art_audits to authenticated;
-- art_pending_users intentionally inaccessible to anon/authenticated;
-- only a trusted backend with service credentials may manage invitations.
-- SuperDB gerencia a transação automaticamente; não utilizar COMMIT.
-- DEPOIS de criar a credencial principal em Autenticação > Usuários,
-- copie o UUID do usuário autenticado e execute separadamente:
-- insert into proj_p_4c359bf39f.art_profiles(id,email,role,active)
-- values ('UUID_DO_USUARIO','alvaro.batistella@method-flow.com','principal',true)
-- on conflict(id) do update set role='principal',active=true;
