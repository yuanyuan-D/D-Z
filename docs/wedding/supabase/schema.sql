-- 在 Supabase → SQL Editor 中整段执行一次
-- 与 family_home 同一项目，互不冲突

create table if not exists public.wedding_plan (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.wedding_plan enable row level security;

drop policy if exists "wedding_plan_anon_all" on public.wedding_plan;
create policy "wedding_plan_anon_all"
  on public.wedding_plan
  for all
  to anon, authenticated
  using (true)
  with check (true);

do $$
begin
  alter publication supabase_realtime add table public.wedding_plan;
exception
  when duplicate_object then null;
end $$;

insert into public.wedding_plan (id, payload)
values ('wedding', '{}'::jsonb)
on conflict (id) do nothing;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.wedding_plan to anon, authenticated;

-- 强制 PostgREST 刷新表缓存（Run 后若 API 仍报找不到表可再单独执行下一行）
notify pgrst, 'reload schema';
