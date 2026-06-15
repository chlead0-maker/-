'use client'

import { useState, useTransition, useRef } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { addTaskLog, deleteTaskLog } from '@/lib/actions/tasks'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Paperclip, Loader2, Trash2, ExternalLink, FileText } from 'lucide-react'
import type { TaskLog } from '@/lib/types'

interface TaskLogSectionProps {
  taskId: string
  initialLogs: TaskLog[]
  currentUserId: string
  isAdmin: boolean
}

export default function TaskLogSection({ taskId, initialLogs, currentUserId, isAdmin }: TaskLogSectionProps) {
  const [logs, setLogs] = useState<TaskLog[]>(initialLogs)
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleSubmit() {
    if (!content.trim()) return
    setUploading(true)

    try {
      let fileUrl: string | undefined
      let fileName: string | undefined

      // 파일 업로드 (Supabase Storage)
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `${taskId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('task-files')
          .upload(path, file)

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('task-files').getPublicUrl(path)
          fileUrl = urlData.publicUrl
          fileName = file.name
        }
      }

      await addTaskLog(taskId, content.trim(), fileUrl, fileName)

      // 낙관적 업데이트 대신 새로 조회
      const { data } = await supabase
        .from('task_logs')
        .select('*, author:profiles(*)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
      setLogs((data || []) as TaskLog[])
      setContent('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setUploading(false)
    }
  }

  function handleDelete(logId: string) {
    if (!confirm('이 메모를 삭제하시겠습니까?')) return
    startTransition(async () => {
      await deleteTaskLog(logId, taskId)
      setLogs((prev) => prev.filter((l) => l.id !== logId))
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <FileText className="h-4 w-4 text-gray-400" />
        특이사항 / 진행 메모
      </h2>

      {/* 기존 로그 */}
      <div className="space-y-4 mb-5">
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400">등록된 메모가 없습니다</p>
        ) : (
          logs.map((log) => {
            const author = log.author as { full_name: string } | null
            const canDelete = isAdmin || log.author_id === currentUserId
            return (
              <div key={log.id} className="flex gap-3">
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs">
                    {author?.full_name?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-gray-900">{author?.full_name || '알 수 없음'}</span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(log.created_at), 'M/d HH:mm', { locale: ko })}
                      </span>
                    </div>
                    {canDelete && (
                      <button onClick={() => handleDelete(log.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{log.content}</p>
                  {log.file_url && log.file_name && (
                    <a href={log.file_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded">
                      <Paperclip className="h-3 w-3" />
                      {log.file_name}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 새 메모 입력 */}
      <div className="space-y-2 border-t border-gray-100 pt-4">
        <Textarea
          placeholder="특이사항이나 진행 내용을 기록하세요..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          className="resize-none"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer hover:text-gray-700">
            <Paperclip className="h-3.5 w-3.5" />
            {file ? (
              <span className="text-indigo-600 font-medium">{file.name}</span>
            ) : (
              '파일 첨부'
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <Button size="sm" onClick={handleSubmit} disabled={uploading || !content.trim()}>
            {uploading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            저장
          </Button>
        </div>
      </div>
    </div>
  )
}
