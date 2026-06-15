'use client'

import { useState, useRef, useTransition } from 'react'
import { useReactToPrint } from 'react-to-print'
import ReportPrintArea from './ReportPrintArea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Printer, Plus, Paperclip, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { addTaskLog } from '@/lib/actions/tasks'
import { createClient } from '@/lib/supabase/client'
import type { Task, TaskAssignment, TaskLog, EmployeeStats, Profile } from '@/lib/types'

interface PeriodData {
  from: string
  to: string
  tasks: Task[]
  employeeStats?: EmployeeStats[]
  myAssignments?: TaskAssignment[]
  taskLogs: Record<string, TaskLog[]>
}

interface ReportViewProps {
  daily: PeriodData
  weekly: PeriodData
  monthly: PeriodData
  isAdmin: boolean
  profile: Profile
  currentUserId: string
}

export default function ReportView({ daily, weekly, monthly, isAdmin, profile, currentUserId }: ReportViewProps) {
  const [activePeriod, setActivePeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const printRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // 특이사항 추가 모달 상태
  const [logTarget, setLogTarget] = useState<Task | null>(null)
  const [logContent, setLogContent] = useState('')
  const [logFile, setLogFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [, startTransition] = useTransition()

  // 로그를 클라이언트에서도 관리 (추가 후 즉시 반영)
  const [extraLogs, setExtraLogs] = useState<Record<string, TaskLog[]>>({})

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `업무보고서_${activePeriod === 'daily' ? '일간' : activePeriod === 'weekly' ? '주간' : '월간'}`,
  })

  const currentData = activePeriod === 'daily' ? daily : activePeriod === 'weekly' ? weekly : monthly

  function getMergedLogs(taskId: string): TaskLog[] {
    const base = currentData.taskLogs[taskId] || []
    const extra = extraLogs[taskId] || []
    const all = [...base, ...extra]
    const seen = new Set<string>()
    return all.filter((l) => { if (seen.has(l.id)) return false; seen.add(l.id); return true })
  }

  function mergedLogsForAll(): Record<string, TaskLog[]> {
    const result: Record<string, TaskLog[]> = {}
    for (const task of currentData.tasks) {
      result[task.id] = getMergedLogs(task.id)
    }
    return result
  }

  async function handleAddLog() {
    if (!logTarget || !logContent.trim()) return
    setUploading(true)
    try {
      let fileUrl: string | undefined
      let fileName: string | undefined

      if (logFile) {
        const ext = logFile.name.split('.').pop()
        const path = `${logTarget.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('task-files')
          .upload(path, logFile)
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('task-files').getPublicUrl(path)
          fileUrl = urlData.publicUrl
          fileName = logFile.name
        }
      }

      await addTaskLog(logTarget.id, logContent.trim(), fileUrl, fileName)

      // 낙관적으로 목록에 추가
      const newLog: TaskLog = {
        id: `temp-${Date.now()}`,
        task_id: logTarget.id,
        author_id: currentUserId,
        content: logContent.trim(),
        file_url: fileUrl || null,
        file_name: fileName || null,
        created_at: new Date().toISOString(),
        author: { id: currentUserId, full_name: profile.full_name } as Profile,
      }
      setExtraLogs((prev) => ({
        ...prev,
        [logTarget.id]: [...(prev[logTarget.id] || []), newLog],
      }))
      setLogTarget(null)
      setLogContent('')
      setLogFile(null)
    } finally {
      setUploading(false)
    }
  }

  const statusLabel: Record<string, string> = {
    pending: '대기중', in_progress: '진행중', completed: '완료', overdue: '지연', cancelled: '취소',
  }

  return (
    <div>
      {/* 탭 + 인쇄 버튼 */}
      <div className="flex items-center justify-between mb-6">
        <Tabs value={activePeriod} onValueChange={(v) => setActivePeriod(v as typeof activePeriod)}>
          <TabsList>
            <TabsTrigger value="daily">일간 ({daily.tasks.length})</TabsTrigger>
            <TabsTrigger value="weekly">주간 ({weekly.tasks.length})</TabsTrigger>
            <TabsTrigger value="monthly">월간 ({monthly.tasks.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <button
          onClick={() => handlePrint()}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'flex items-center gap-2')}
        >
          <Printer className="h-4 w-4" />PDF 저장
        </button>
      </div>

      {/* 특이사항 추가 버튼 목록 (화면 전용, 인쇄 제외) */}
      {currentData.tasks.length > 0 && (
        <div className="mb-4 print:hidden">
          <div className="flex flex-wrap gap-2">
            {currentData.tasks.map((task) => {
              const logCount = getMergedLogs(task.id).length
              return (
                <button key={task.id}
                  onClick={() => { setLogTarget(task); setLogContent(''); setLogFile(null) }}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors">
                  <Plus className="h-3 w-3" />
                  {task.title.length > 20 ? task.title.slice(0, 20) + '…' : task.title}
                  {logCount > 0 && (
                    <span className="bg-orange-200 text-orange-800 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                      {logCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">버튼 클릭 → 특이사항 / 메모 추가</p>
        </div>
      )}

      {/* 보고서 본문 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <ReportPrintArea
          ref={printRef}
          period={activePeriod}
          from={currentData.from}
          to={currentData.to}
          tasks={currentData.tasks}
          employeeStats={currentData.employeeStats}
          myAssignments={currentData.myAssignments}
          taskLogs={mergedLogsForAll()}
          isAdmin={isAdmin}
          profile={profile}
        />
      </div>

      {/* 특이사항 추가 다이얼로그 */}
      <Dialog open={!!logTarget} onOpenChange={(v) => !v && setLogTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              특이사항 추가
              <span className="ml-2 font-normal text-gray-500 truncate block mt-0.5">
                {logTarget?.title}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="특이사항이나 진행 내용을 입력하세요..."
              value={logContent}
              onChange={(e) => setLogContent(e.target.value)}
              rows={4}
              className="resize-none"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                <Paperclip className="h-3.5 w-3.5" />
                {logFile ? (
                  <span className="text-indigo-600 font-medium">{logFile.name}</span>
                ) : '파일 첨부 (선택)'}
                <input type="file" className="hidden"
                  onChange={(e) => setLogFile(e.target.files?.[0] || null)} />
              </label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setLogTarget(null)}>취소</Button>
                <Button size="sm" onClick={handleAddLog} disabled={uploading || !logContent.trim()}>
                  {uploading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  저장
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
