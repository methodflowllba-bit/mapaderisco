
-- Method Flow / Mapa de Risco: autenticação e acesso a ARTs
-- Execute no SQL Editor de um projeto Supabase dedicado.
create extension if not exists pgcrypto;

create table if not exists public.art_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'usuario' check (role in ('principal','administrador','usuario')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.art_pending_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null check (role in ('administrador','usuario')),
  active boolean not null default false,
  code_hash text,
  code_expires timestamptz,
  failed_attempts integer not null default 0,
  claimed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.art_audits (
  id uuid primary key default gen_random_uuid(),
  data jsonb not null,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create or replace function public.art_current_active()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.art_profiles where id=auth.uid() and active=true) $$;
create or replace function public.art_current_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.art_profiles where id=auth.uid() and active=true and role in ('principal','administrador')) $$;
revoke all on function public.art_current_active() from public;
revoke all on function public.art_current_admin() from public;
grant execute on function public.art_current_active() to authenticated;
grant execute on function public.art_current_admin() to authenticated;

alter table public.art_profiles enable row level security;
alter table public.art_pending_users enable row level security;
alter table public.art_audits enable row level security;

drop policy if exists "profiles read own or admin" on public.art_profiles;
create policy "profiles read own or admin" on public.art_profiles for select to authenticated
using (id=auth.uid() or public.art_current_admin());

drop policy if exists "audits read authorized" on public.art_audits;
create policy "audits read authorized" on public.art_audits for select to authenticated
using (public.art_current_active() and (public.art_current_admin() or created_by=auth.uid()));
drop policy if exists "audits insert own" on public.art_audits;
create policy "audits insert own" on public.art_audits for insert to authenticated
with check (public.art_current_active() and created_by=auth.uid());
drop policy if exists "audits update authorized" on public.art_audits;
create policy "audits update authorized" on public.art_audits for update to authenticated
using (public.art_current_active() and (public.art_current_admin() or created_by=auth.uid()))
with check (public.art_current_active() and (public.art_current_admin() or created_by=auth.uid()));
drop policy if exists "audits delete authorized" on public.art_audits;
create policy "audits delete authorized" on public.art_audits for delete to authenticated
using (public.art_current_active() and (public.art_current_admin() or created_by=auth.uid()));

-- ATIVAÇÃO INICIAL (executar SOMENTE após criar o usuário principal no Authentication > Users):
-- insert into public.art_profiles(id,email,role,active)
-- select id,lower(email),'principal',true from auth.users
-- where lower(email)='alvaro.batistella@method-flow.com'
-- on conflict (id) do update set role='principal',active=true;
-- ATENÇÃO: não use a chave service_role no GitHub Pages.

-- Para projetos que já criaram a tabela antes desta alteração:
alter table public.art_pending_users add column if not exists failed_attempts integer not null default 0;
