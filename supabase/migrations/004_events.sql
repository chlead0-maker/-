-- ============================================================
-- 004_events.sql
-- tasks 테이블에 일정(event) 지원 추가
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'task'
    CHECK (item_type IN ('task', 'event')),
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time;
