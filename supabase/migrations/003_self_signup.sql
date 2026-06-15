-- ============================================================
-- 003_self_signup.sql
-- 자체 회원가입 지원: 신규 가입자 is_active = false (관리자 승인 필요)
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- 트리거 함수 업데이트: 신규 가입자는 is_active = false로 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'employee'),
    false
  );
  RETURN new;
END;
$$;

-- 관리자가 비활성 프로필도 조회할 수 있도록 기존 정책 보완
-- (기존 정책이 is_active 필터를 앱 레벨에서만 하므로 DB 레벨 정책은 그대로 유지)
