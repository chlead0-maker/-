'use client'

import { forwardRef } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Paperclip } from 'lucide-react'
import type { Task, TaskAssignment, TaskLog, EmployeeStats, Profile } from '@/lib/types'

interface ReportData {
  period: 'daily' | 'weekly' | 'monthly'
  from: string
  to: string
  tasks: Task[]
  employeeStats?: EmployeeStats[]
  myAssignments?: TaskAssignment[]
  taskLogs?: Record<string, TaskLog[]>
  isAdmin: boolean
  profile: Profile
}

const periodLabel: Record<string, string> = { daily: '일간', weekly: '주간', monthly: '월간' }
const statusLabel: Record<string, string> = {
  pending: '대기중', in_progress: '진행중', completed: '완료', overdue: '지연', cancelled: '취소',
}
const priorityLabel: Record<string, string> = {
  low: '낮음', medium: '보통', high: '높음', urgent: '긴급',
}
const typeLabel: Record<string, string> = { daily: '데일리', weekly: '주간', monthly: '월간' }

const ReportPrintArea = forwardRef<HTMLDivElement, ReportData>(
  ({ period, from, to, tasks, employeeStats, myAssignments, taskLogs = {}, isAdmin, profile }, ref) => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === 'completed').length
    const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length
    const overdue = tasks.filter((t) => t.status === 'overdue').length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    const fromDate = format(new Date(from), 'yyyy년 M월 d일', { locale: ko })
    const toDate = from === to ? '' : ` ~ ${format(new Date(to), 'yyyy년 M월 d일', { locale: ko })}`

    return (
      <div ref={ref} className="bg-white p-8 max-w-4xl mx-auto print:p-6">
        {/* 헤더 */}
        <div className="border-b-2 border-indigo-600 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{periodLabel[period]} 업무 보고서</h1>
              <p className="text-gray-600 mt-1">기간: {fromDate}{toDate}</p>
              <p className="text-gray-500 text-sm mt-0.5">
                {isAdmin ? '전체 팀 현황' : `${profile.full_name} 개인 보고서`}
              </p>
            </div>
            <div className="text-right text-sm text-gray-400">
              <p>출력일: {format(new Date(), 'yyyy년 M월 d일', { locale: ko })}</p>
            </div>
          </div>
        </div>

        {/* 통계 요약 */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: '전체 업무', value: total, color: 'text-gray-700' },
            { label: '완료', value: completed, color: 'text-green-600' },
            { label: '미완료', value: pending, color: 'text-yellow-600' },
            { label: '지연', value: overdue, color: 'text-red-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="mb-2 text-sm text-gray-600">
          전체 완료율: <span className="font-semibold text-indigo-600">{completionRate}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full mb-8">
          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${completionRate}%` }} />
        </div>

        {/* 관리자: 직원별 현황 */}
        {isAdmin && employeeStats && employeeStats.length > 0 && (
          <div className="mb-8">
            <h2 className="text-base font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-200">
              직원별 완료 현황
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">이름</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">전체</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">완료</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">미완료</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">지연</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">완료율</th>
                </tr>
              </thead>
              <tbody>
                {employeeStats.map(({ profile: emp, totalTasks, completedTasks, pendingTasks, overdueTasks }) => (
                  <tr key={emp.id} className="border-b border-gray-100">
                    <td className="py-2 px-3 font-medium text-gray-900">{emp.full_name}</td>
                    <td className="py-2 px-3 text-center text-gray-700">{totalTasks}</td>
                    <td className="py-2 px-3 text-center text-green-600 font-medium">{completedTasks}</td>
                    <td className="py-2 px-3 text-center text-yellow-600">{pendingTasks}</td>
                    <td className="py-2 px-3 text-center text-red-600">{overdueTasks}</td>
                    <td className="py-2 px-3 text-center font-medium text-indigo-600">
                      {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 업무 목록 */}
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-200">
            {isAdmin ? `전체 업무 목록 (${tasks.length}건)` : `내 업무 목록 (${tasks.length}건)`}
          </h2>
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">해당 기간에 업무가 없습니다</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const myAssignment = myAssignments?.find((a) => a.task_id === task.id)
                const logs = taskLogs[task.id] || []
                const assignees = task.assignments
                  ?.map((a) => (a.assignee as Profile)?.full_name)
                  .filter(Boolean).join(', ')
                const effectiveStatus = isAdmin
                  ? task.status
                  : myAssignment?.status === 'completed' ? 'completed' : task.status

                return (
                  <div key={task.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{task.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                          <span>{typeLabel[task.task_type]}</span>
                          <span>·</span>
                          <span>{priorityLabel[task.priority]}</span>
                          <span>·</span>
                          <span>마감: {format(new Date(task.due_date), 'M/d', { locale: ko })}</span>
                          {isAdmin && assignees && (
                            <><span>·</span><span>담당: {assignees}</span></>
                          )}
                          {!isAdmin && myAssignment?.completion_notes && (
                            <><span>·</span><span className="text-green-600">{myAssignment.completion_notes}</span></>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs font-medium shrink-0 px-2 py-0.5 rounded ${
                        effectiveStatus === 'completed' ? 'bg-green-100 text-green-700' :
                        effectiveStatus === 'overdue' ? 'bg-red-100 text-red-700' :
                        effectiveStatus === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {statusLabel[effectiveStatus]}
                      </span>
                    </div>

                    {/* 특이사항 */}
                    {logs.length > 0 && (
                      <div className="mt-2 pl-3 border-l-2 border-orange-200 space-y-1.5">
                        {logs.map((log) => {
                          const author = log.author as { full_name: string } | null
                          return (
                            <div key={log.id}>
                              <p className="text-xs text-gray-500">
                                <span className="font-medium text-gray-700">{author?.full_name}</span>
                                {' '}
                                {format(new Date(log.created_at), 'M/d HH:mm', { locale: ko })}
                              </p>
                              <p className="text-xs text-gray-700 mt-0.5">{log.content}</p>
                              {log.file_name && (
                                <a href={log.file_url!} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-indigo-600 mt-0.5">
                                  <Paperclip className="h-3 w-3" />{log.file_name}
                                </a>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center print:block hidden">
          팀 캘린더 시스템 | {format(new Date(), 'yyyy년 M월 d일 HH:mm', { locale: ko })} 출력
        </div>
      </div>
    )
  }
)

ReportPrintArea.displayName = 'ReportPrintArea'
export default ReportPrintArea
