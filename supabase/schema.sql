-- 在 Supabase → SQL Editor 中整段执行一次

create table if not exists public.family_home (
  id text primary key,
  name text not null default '小董和小赵的家',
  categories jsonb not null default '[]'::jsonb,
  dishes jsonb not null default '[]'::jsonb,
  orders jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.family_home enable row level security;

drop policy if exists "family_home_anon_all" on public.family_home;
create policy "family_home_anon_all"
  on public.family_home
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- 打开 Realtime（若已添加会跳过）
do $$
begin
  alter publication supabase_realtime add table public.family_home;
exception
  when duplicate_object then null;
end $$;
