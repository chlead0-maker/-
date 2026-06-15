-- ============================================================
-- 001_initial_schema.sql
-- Supabase SQL Editor에 붙여넣고 실행하세요.
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES (auth.users 확장)
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text not null,
  avatar_url  text,
  role        text not null default 'employee'
                check (role in ('admin', 'employee')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'employee')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TEAMS
-- ============================================================
create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  color       text default '#6366f1',
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

-- ============================================================
-- TEAM MEMBERS
-- ============================================================
create table public.team_members (
  team_id    uuid not null references public.teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (team_id, profile_id)
);

-- ============================================================
-- TASKS
-- ============================================================
create table public.tasks (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  task_type        text not null default 'weekly'
                     check (task_type in ('daily', 'weekly', 'monthly')),
  status           text not null default 'pending'
                     check (status in ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')),
  priority         text not null default 'medium'
                     check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date         date not null,
  assigned_to_team uuid references public.teams(id) on delete set null,
  created_by       uuid not null references public.profiles(id),
  completed_at     timestamptz,
  completion_notes text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============================================================
-- TASK ASSIGNMENTS (개인별 완료 상태 추적)
-- ============================================================
create table public.task_assignments (
  id               uuid primary key default gen_random_uuid(),
  task_id          uuid not null references public.tasks(id) on delete cascade,
  assignee_id      uuid not null references public.profiles(id) on delete cascade,
  status           text not null default 'pending'
                     check (status in ('pending', 'in_progress', 'completed')),
  completed_at     timestamptz,
  completion_notes text,
  assigned_at      timestamptz not null default now(),
  unique (task_id, assignee_id)
);

-- ============================================================
-- TASK COMMENTS
-- ============================================================
create table public.task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  author_id  uuid not null references public.profiles(id),
  content    text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- UPDATED_AT 트리거
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.set_updated_at();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles         enable row level security;
alter table public.teams            enable row level security;
alter table public.team_members     enable row level security;
alter table public.tasks            enable row level security;
alter table public.task_assignments enable row level security;
alter table public.task_comments    enable row level security;

create or replace function public.current_user_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;

-- profiles
create policy "profiles_select" on public.profiles
  for select using (auth.uid() is not null);
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());
create policy "profiles_update_admin" on public.profiles
  for update using (public.current_user_role() = 'admin');

-- tasks
create policy "tasks_select" on public.tasks
  for select using (auth.uid() is not null);
create policy "tasks_insert_admin" on public.tasks
  for insert with check (public.current_user_role() = 'admin');
create policy "tasks_update_admin" on public.tasks
  for update using (public.current_user_role() = 'admin');
create policy "tasks_delete_admin" on public.tasks
  for delete using (public.current_user_role() = 'admin');

-- task_assignments
create policy "assignments_select" on public.task_assignments
  for select using (auth.uid() is not null);
create policy "assignments_admin" on public.task_assignments
  for all using (public.current_user_role() = 'admin');
create policy "assignments_update_own" on public.task_assignments
  for update using (assignee_id = auth.uid());

-- teams
create policy "teams_select" on public.teams
  for select using (auth.uid() is not null);
create policy "teams_admin" on public.teams
  for all using (public.current_user_role() = 'admin');

-- team_members
create policy "team_members_select" on public.team_members
  for select using (auth.uid() is not null);
create policy "team_members_admin" on public.team_members
  for all using (public.current_user_role() = 'admin');

-- task_comments
create policy "comments_select" on public.task_comments
  for select using (auth.uid() is not null);
create policy "comments_insert" on public.task_comments
  for insert with check (author_id = auth.uid());

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_tasks_due_date        on public.tasks(due_date);
create index idx_tasks_status          on public.tasks(status);
create index idx_tasks_task_type       on public.tasks(task_type);
create index idx_tasks_created_by      on public.tasks(created_by);
create index idx_assignments_task      on public.task_assignments(task_id);
create index idx_assignments_assignee  on public.task_assignments(assignee_id);
create index idx_comments_task         on public.task_comments(task_id);

-- ============================================================
-- REALTIME 활성화
-- ============================================================
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.task_assignments;
alter publication supabase_realtime add table public.task_comments;
