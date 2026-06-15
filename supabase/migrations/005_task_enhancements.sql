-- 005: tasks에 장소/메모 추가 + 진행 메모(task_logs) 테이블

-- tasks 컬럼 추가
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS notes text;

-- 진행 메모 + 첨부파일 테이블
CREATE TABLE IF NOT EXISTS public.task_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  file_url text,
  file_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;

-- 로그인한 사용자는 누구나 조회
CREATE POLICY "task_logs_select" ON public.task_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 본인만 삽입
CREATE POLICY "task_logs_insert" ON public.task_logs
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- 본인 또는 관리자만 삭제
CREATE POLICY "task_logs_delete" ON public.task_logs
  FOR DELETE USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Realtime 활성화
ALTER publication supabase_realtime ADD TABLE public.task_logs;
