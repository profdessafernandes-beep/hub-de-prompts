-- Hub de Prompts: rode este script UMA vez em Supabase → SQL Editor → New query → Run.

create table if not exists public.prompts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null default '',
  cat         text not null default '',
  tags        text[] not null default '{}',
  body        text not null,
  fav         boolean not null default false,
  uses        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists prompts_user_idx on public.prompts(user_id);

-- Segurança: cada pessoa só vê e mexe nos próprios prompts.
alter table public.prompts enable row level security;

drop policy if exists "ver os meus"      on public.prompts;
drop policy if exists "criar os meus"    on public.prompts;
drop policy if exists "editar os meus"   on public.prompts;
drop policy if exists "apagar os meus"   on public.prompts;

create policy "ver os meus"    on public.prompts for select using (auth.uid() = user_id);
create policy "criar os meus"  on public.prompts for insert with check (auth.uid() = user_id);
create policy "editar os meus" on public.prompts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "apagar os meus" on public.prompts for delete using (auth.uid() = user_id);
