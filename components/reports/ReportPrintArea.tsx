'use client'

import { forwardRef } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Task, TaskAssignment, EmployeeStats, Profile } from '@/lib/types'

interface ReportData {
  period: 'daily' | 'weekly' | 'monthly'
  from: string
  to: string
  tasks: Task[]
  employeeStats?: EmployeeStats[]
  myAssignments?: TaskAssignment[]
  isAdmin: boolean
  profile: Profile
}

const periodLabel: Record<string, string> = {
  daily: '일간',
  weekly: '주간',
  monthly: '월간',
}

const statusLabel: Record<string, string> = {
  pending: '대기중',
  in_progress: '진행중',
  completed: '완료',
  overdue: '지연',
  cancelled: '취소',
}

const priorityLabel: Record<string, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
  urgent: '긴급',
}

const typeLabel: Record<string, string> = {
  daily: '데일리',
  weekly: '주간',
  monthly: '월간',
}

const ReportPrintArea = forwardRef<HTMLDivElement, ReportData>(
  ({ period, from, to, tasks, employeeStats, myAssignments, isAdmin, profile }, ref) => {
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
              <h1 className="text-2xl font-bold text-gray-900">
                {periodLabel[period]} 업무 보고서
              </h1>
              <p className="text-gray-600 mt-1">
                기간: {fromDate}{toDate}
              </p>
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
          <div
            className="h-full bg-indigo-500 rounded-full"
            style={{ width: `${completionRate}%` }}
          />
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

        {/* 전체 업무 목록 (관리자) */}
        {isAdmin && (
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-200">
              전체 업무 목록 ({tasks.length}건)
            </h2>
            {tasks.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">해당 기간에 업무가 없습니다</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-2 px-3 font-medium text-gray-600">업무 제목</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600">유형</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600">우선순위</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600">상태</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600">마감일</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">담당자</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => {
                    const assignees = task.assignments?.map((a) => (a.assignee as Profile)?.full_name).filter(Boolean).join(', ')
                    return (
                      <tr key={task.id} className="border-b border-gray-100">
                        <td className="py-2 px-3 text-gray-900">{task.title}</td>
                        <td className="py-2 px-3 text-center text-gray-600">{typeLabel[task.task_type]}</td>
                        <td className="py-2 px-3 text-center text-gray-600">{priorityLabel[task.priority]}</td>
                        <td className={`py-2 px-3 text-center font-medium ${
                          task.status === 'completed' ? 'text-green-600' :
                          task.status === 'overdue' ? 'text-red-600' :
                          task.status === 'in_progress' ? 'text-blue-600' : 'text-gray-600'
                        }`}>
                          {statusLabel[task.status]}
                        </td>
                        <td className="py-2 px-3 text-center text-gray-600">
                          {format(new Date(task.due_date), 'M/d', { locale: ko })}
                        </td>
                        <td className="py-2 px-3 text-gray-700 text-xs">{assignees || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 직원: 본인 업무 목록 */}
        {!isAdmin && myAssignments && (
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-200">
              내 업무 목록 ({tasks.length}건)
            </h2>
            {tasks.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">해당 기간에 업무가 없습니다</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-2 px-3 font-medium text-gray-600">업무 제목</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600">유형</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600">우선순위</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600">상태</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600">마감일</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">완료 내용</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => {
                    const myAssignment = myAssignments.find((a) => a.task_id === task.id)
                    return (
                      <tr key={task.id} className="border-b border-gray-100">
                        <td className="py-2 px-3 text-gray-900">{task.title}</td>
                        <td className="py-2 px-3 text-center text-gray-600">{typeLabel[task.task_type]}</td>
                        <td className="py-2 px-3 text-center text-gray-600">{priorityLabel[task.priority]}</td>
                        <td className={`py-2 px-3 text-center font-medium ${
                          myAssignment?.status === 'completed' ? 'text-green-600' :
                          task.status === 'overdue' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {myAssignment?.status === 'completed' ? '완료' : statusLabel[task.status]}
                        </td>
                        <td className="py-2 px-3 text-center text-gray-600">
                          {format(new Date(task.due_date), 'M/d', { locale: ko })}
                        </td>
                        <td className="py-2 px-3 text-gray-600 text-xs">
                          {myAssignment?.completion_notes || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 인쇄용 푸터 */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center print:block hidden">
          팀 업무 관리 시스템 | {format(new Date(), 'yyyy년 M월 d일 HH:mm', { locale: ko })} 출력
        </div>
      </div>
    )
  }
)

ReportPrintArea.displayName = 'ReportPrintArea'

export default ReportPrintArea
