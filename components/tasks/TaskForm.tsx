'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTask } from '@/lib/actions/tasks'
import type { Profile, Team, TaskType, TaskPriority } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskFormProps {
  employees: Profile[]
  teams: Team[]
  isAdmin: boolean
}

export default function TaskForm({ employees, teams, isAdmin }: TaskFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assignMode, setAssignMode] = useState<'individual' | 'team'>('individual')
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const data = new FormData(form)

    try {
      await createTask({
        title: data.get('title') as string,
        description: data.get('description') as string,
        task_type: data.get('task_type') as TaskType,
        priority: data.get('priority') as TaskPriority,
        due_date: data.get('due_date') as string,
        // 관리자: 선택한 담당자/팀, 직원: 빈 배열(서버에서 본인으로 자동 할당)
        assignee_ids: isAdmin && assignMode === 'individual' ? selectedEmployees : [],
        team_id: isAdmin && assignMode === 'team' ? (data.get('team_id') as string) : undefined,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '오류가 발생했습니다'
      if (!msg.includes('NEXT_REDIRECT')) {
        setError(msg)
        setLoading(false)
      }
    }
  }

  function toggleEmployee(id: string) {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const today = new Date().toISOString().split('T')[0]

  // 제출 버튼 비활성화 조건
  const submitDisabled =
    loading ||
    (isAdmin && assignMode === 'individual' && selectedEmployees.length === 0 && teams.length === 0)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">업무 제목 *</Label>
            <Input id="title" name="title" placeholder="업무 제목을 입력하세요" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">상세 내용</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="업무 내용, 요구사항, 참고사항 등"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task_type">업무 유형 *</Label>
              <Select name="task_type" defaultValue="weekly">
                <SelectTrigger id="task_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">데일리 (오늘)</SelectItem>
                  <SelectItem value="weekly">주간</SelectItem>
                  <SelectItem value="monthly">월간</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">우선순위 *</Label>
              <Select name="priority" defaultValue="medium">
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">낮음</SelectItem>
                  <SelectItem value="medium">보통</SelectItem>
                  <SelectItem value="high">높음</SelectItem>
                  <SelectItem value="urgent">긴급</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">마감일 *</Label>
            <Input
              id="due_date"
              name="due_date"
              type="date"
              min={today}
              defaultValue={today}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* 담당자 설정 — 관리자 전용 */}
      {isAdmin && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Label>담당자 설정 *</Label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAssignMode('individual')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                  assignMode === 'individual'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                )}
              >
                <User className="h-4 w-4" />
                개인 할당
              </button>
              <button
                type="button"
                onClick={() => setAssignMode('team')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                  assignMode === 'team'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                )}
              >
                <Users className="h-4 w-4" />
                팀 할당
              </button>
            </div>

            {assignMode === 'individual' ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">담당자를 선택하세요 (복수 선택 가능)</p>
                <div className="grid grid-cols-2 gap-2">
                  {employees.length === 0 ? (
                    <p className="text-sm text-gray-400 col-span-2">등록된 직원이 없습니다</p>
                  ) : (
                    employees.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => toggleEmployee(emp.id)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors text-left',
                          selectedEmployees.includes(emp.id)
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        )}
                      >
                        <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                          {emp.full_name[0].toUpperCase()}
                        </div>
                        {emp.full_name}
                      </button>
                    ))
                  )}
                </div>
                {selectedEmployees.length === 0 && employees.length > 0 && (
                  <p className="text-xs text-amber-600">담당자를 1명 이상 선택하세요</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {teams.length === 0 ? (
                  <p className="text-sm text-gray-400">등록된 팀이 없습니다</p>
                ) : (
                  <Select name="team_id">
                    <SelectTrigger>
                      <SelectValue placeholder="팀을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 직원: 자기 업무 안내 */}
      {!isAdmin && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
          <p className="text-sm text-indigo-700">
            내 업무로 추가됩니다. 추가한 업무는 관리자도 확인할 수 있습니다.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          취소
        </Button>
        <Button type="submit" disabled={submitDisabled}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          업무 추가
        </Button>
      </div>
    </form>
  )
}
