'use client'

import { useState, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import ReportPrintArea from './ReportPrintArea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { buttonVariants } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task, TaskAssignment, EmployeeStats, Profile } from '@/lib/types'

interface PeriodData {
  from: string
  to: string
  tasks: Task[]
  employeeStats?: EmployeeStats[]
  myAssignments?: TaskAssignment[]
}

interface ReportViewProps {
  daily: PeriodData
  weekly: PeriodData
  monthly: PeriodData
  isAdmin: boolean
  profile: Profile
}

export default function ReportView({ daily, weekly, monthly, isAdmin, profile }: ReportViewProps) {
  const [activePeriod, setActivePeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `업무보고서_${activePeriod === 'daily' ? '일간' : activePeriod === 'weekly' ? '주간' : '월간'}`,
  })

  const currentData = activePeriod === 'daily' ? daily : activePeriod === 'weekly' ? weekly : monthly

  return (
    <div>
      {/* 탭 + 인쇄 버튼 */}
      <div className="flex items-center justify-between mb-6">
        <Tabs value={activePeriod} onValueChange={(v) => setActivePeriod(v as typeof activePeriod)}>
          <TabsList>
            <TabsTrigger value="daily">
              일간 ({daily.tasks.length})
            </TabsTrigger>
            <TabsTrigger value="weekly">
              주간 ({weekly.tasks.length})
            </TabsTrigger>
            <TabsTrigger value="monthly">
              월간 ({monthly.tasks.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <button
          onClick={() => handlePrint()}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'flex items-center gap-2')}
        >
          <Printer className="h-4 w-4" />
          PDF 저장
        </button>
      </div>

      {/* 보고서 본문 (화면 + 인쇄 공용) */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <ReportPrintArea
          ref={printRef}
          period={activePeriod}
          from={currentData.from}
          to={currentData.to}
          tasks={currentData.tasks}
          employeeStats={currentData.employeeStats}
          myAssignments={currentData.myAssignments}
          isAdmin={isAdmin}
          profile={profile}
        />
      </div>
    </div>
  )
}
