-- 알림 테이블
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null check (type in ('task_assigned', 'comment_added')),
  title      text not null,
  message    text,
  task_id    uuid references public.tasks(id) on delete cascade,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- 본인 알림만 조회/수정 가능
create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid());

-- 리얼타임 활성화
alter publication supabase_realtime add table public.notifications;

-- 조회 성능 인덱스
create index idx_notifications_user on public.notifications(user_id, created_at desc);
create index idx_notifications_unread on public.notifications(user_id, is_read) where is_read = false;
