create extension if not exists pgcrypto;

create table if not exists public.work_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_date date not null,
  raw_text text not null,
  source text not null default 'daily_report',
  fingerprint text not null,
  created_at timestamptz not null default now(),
  unique (user_id, fingerprint)
);

create table if not exists public.work_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid references public.work_reports(id) on delete cascade,
  task_date date not null,
  project text not null default '기타 업무',
  task_text text not null,
  task_type text not null default '기타',
  collaborator text not null default '',
  tags text[] not null default '{}',
  note text not null default '',
  source text not null default 'daily_report',
  created_at timestamptz not null default now()
);

create index if not exists work_tasks_user_date_idx on public.work_tasks(user_id, task_date desc);
create index if not exists work_tasks_user_project_idx on public.work_tasks(user_id, project);
create index if not exists work_reports_user_date_idx on public.work_reports(user_id, report_date desc);

alter table public.work_reports enable row level security;
alter table public.work_tasks enable row level security;

drop policy if exists "reports_select_own" on public.work_reports;
drop policy if exists "reports_insert_own" on public.work_reports;
drop policy if exists "reports_update_own" on public.work_reports;
drop policy if exists "reports_delete_own" on public.work_reports;
create policy "reports_select_own" on public.work_reports for select using (auth.uid() = user_id);
create policy "reports_insert_own" on public.work_reports for insert with check (auth.uid() = user_id);
create policy "reports_update_own" on public.work_reports for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reports_delete_own" on public.work_reports for delete using (auth.uid() = user_id);

drop policy if exists "tasks_select_own" on public.work_tasks;
drop policy if exists "tasks_insert_own" on public.work_tasks;
drop policy if exists "tasks_update_own" on public.work_tasks;
drop policy if exists "tasks_delete_own" on public.work_tasks;
create policy "tasks_select_own" on public.work_tasks for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.work_tasks for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.work_tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks_delete_own" on public.work_tasks for delete using (auth.uid() = user_id);
