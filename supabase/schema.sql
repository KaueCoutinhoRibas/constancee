-- Constância — Fase 8A
-- Execute este arquivo inteiro no SQL Editor do seu projeto Supabase.
-- Esta fase prepara Auth + banco para a sincronização da Fase 8B.
-- Os dados do IndexedDB ainda NÃO são enviados para a nuvem nesta fase.

create extension if not exists pgcrypto;

-- ============================================================
-- PERFIL
-- ============================================================

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Atleta / Estudante',
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
on public.profiles for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Cria o perfil automaticamente quando uma conta é criada.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'Atleta / Estudante')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ============================================================
-- DADOS DO CONSTÂNCIA
-- ============================================================
-- Cada registro mantém o ID estável que já existe no IndexedDB.
-- O payload JSONB preserva exatamente a estrutura atual dos tipos.
-- Isso facilita a sincronização posterior sem criar um segundo
-- modelo paralelo para o aplicativo.

create table if not exists public.habits (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.tasks (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.workout_templates (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.workout_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.goals (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Índices para as políticas e futuras consultas.
create index if not exists habits_user_id_idx on public.habits using btree (user_id);
create index if not exists tasks_user_id_idx on public.tasks using btree (user_id);
create index if not exists workout_templates_user_id_idx on public.workout_templates using btree (user_id);
create index if not exists workout_sessions_user_id_idx on public.workout_sessions using btree (user_id);
create index if not exists goals_user_id_idx on public.goals using btree (user_id);
create index if not exists user_settings_user_id_idx on public.user_settings using btree (user_id);

-- ============================================================
-- RLS
-- ============================================================

alter table public.habits enable row level security;
alter table public.tasks enable row level security;
alter table public.workout_templates enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.goals enable row level security;
alter table public.user_settings enable row level security;

revoke all on table public.habits, public.tasks, public.workout_templates,
  public.workout_sessions, public.goals, public.user_settings
from anon, authenticated;

grant select, insert, update, delete on table public.habits, public.tasks,
  public.workout_templates, public.workout_sessions, public.goals,
  public.user_settings to authenticated;

-- Hábitos
create policy "Users can select their own habits" on public.habits for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Users can insert their own habits" on public.habits for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "Users can update their own habits" on public.habits for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own habits" on public.habits for delete to authenticated
using ((select auth.uid()) = user_id);

-- Tarefas
create policy "Users can select their own tasks" on public.tasks for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Users can insert their own tasks" on public.tasks for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "Users can update their own tasks" on public.tasks for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own tasks" on public.tasks for delete to authenticated
using ((select auth.uid()) = user_id);

-- Fichas de treino
create policy "Users can select their own workout templates" on public.workout_templates for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Users can insert their own workout templates" on public.workout_templates for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "Users can update their own workout templates" on public.workout_templates for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own workout templates" on public.workout_templates for delete to authenticated
using ((select auth.uid()) = user_id);

-- Sessões de treino
create policy "Users can select their own workout sessions" on public.workout_sessions for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Users can insert their own workout sessions" on public.workout_sessions for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "Users can update their own workout sessions" on public.workout_sessions for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own workout sessions" on public.workout_sessions for delete to authenticated
using ((select auth.uid()) = user_id);

-- Metas
create policy "Users can select their own goals" on public.goals for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Users can insert their own goals" on public.goals for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "Users can update their own goals" on public.goals for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own goals" on public.goals for delete to authenticated
using ((select auth.uid()) = user_id);

-- Configurações
create policy "Users can select their own settings" on public.user_settings for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Users can insert their own settings" on public.user_settings for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "Users can update their own settings" on public.user_settings for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own settings" on public.user_settings for delete to authenticated
using ((select auth.uid()) = user_id);

-- Atualiza updated_at automaticamente em alterações futuras.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists habits_set_updated_at on public.habits;
create trigger habits_set_updated_at before update on public.habits for each row execute procedure public.set_updated_at();
drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks for each row execute procedure public.set_updated_at();
drop trigger if exists workout_templates_set_updated_at on public.workout_templates;
create trigger workout_templates_set_updated_at before update on public.workout_templates for each row execute procedure public.set_updated_at();
drop trigger if exists workout_sessions_set_updated_at on public.workout_sessions;
create trigger workout_sessions_set_updated_at before update on public.workout_sessions for each row execute procedure public.set_updated_at();
drop trigger if exists goals_set_updated_at on public.goals;
create trigger goals_set_updated_at before update on public.goals for each row execute procedure public.set_updated_at();
drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at before update on public.user_settings for each row execute procedure public.set_updated_at();
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
