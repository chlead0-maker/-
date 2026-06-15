-- ============================================================
-- 006_team_lead_role.sql
-- 팀장(team_lead) 역할 추가
-- Supabase SQL Editor에 붙여넣고 실행하세요.
-- ============================================================

-- profiles 역할 제약조건에 team_lead 추가
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'team_lead', 'employee'));

-- profiles UPDATE: 관리자가 team_lead 역할도 부여할 수 있도록
-- (기존 profiles_update_admin 정책이 이미 처리함)

-- tasks INSERT: team_lead도 본인 task 생성 가능 (기존 tasks_insert_employee_self 정책이 이미 처리)
-- tasks SELECT/UPDATE/DELETE 는 기존 정책 유지 (auth.uid() IS NOT NULL)

-- current_user_role() 함수는 변경 불필요 (role 값 그대로 반환)
