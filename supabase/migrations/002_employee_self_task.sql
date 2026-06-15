-- ============================================================
-- 002_employee_self_task.sql
-- 직원이 자기 업무를 직접 추가할 수 있도록 RLS 정책 추가
-- Supabase SQL Editor에 붙여넣고 실행하세요.
-- ============================================================

-- 직원도 tasks에 INSERT 가능 (본인이 created_by인 경우)
create policy "tasks_insert_employee_self"
  on public.tasks
  for insert
  with check (
    auth.uid() = created_by
  );

-- 직원도 자기 task_assignments INSERT 가능
create policy "assignments_insert_own"
  on public.task_assignments
  for insert
  with check (
    assignee_id = auth.uid()
  );
