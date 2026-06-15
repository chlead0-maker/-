'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { TaskType, TaskPriority } from '@/lib/types'

export interface CreateTaskInput {
  title: string
  description?: string
  task_type: TaskType
  priority: TaskPriority
  due_date: string
  assignee_ids?: string[]
  team_id?: string
}

export async function createTask(input: CreateTaskInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      title: input.title,
      description: input.description || null,
      task_type: input.task_type,
      priority: input.priority,
      due_date: input.due_date,
      assigned_to_team: input.team_id || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (taskError || !task) throw new Error(taskError?.message || '업무 생성 실패')

  // 담당자 미지정 시 본인에게 자동 할당 (직원 자기 업무)
  if (!input.assignee_ids?.length && !input.team_id) {
    input.assignee_ids = [user.id]
  }

  // 개인 할당
  if (input.assignee_ids && input.assignee_ids.length > 0) {
    const assignments = input.assignee_ids.map((id) => ({
      task_id: task.id,
      assignee_id: id,
    }))
    const { error: assignError } = await supabase
      .from('task_assignments')
      .insert(assignments)
    if (assignError) throw new Error(assignError.message)
  }

  // 팀 할당: 팀원 전체에게 개별 assignment 생성
  if (input.team_id) {
    const { data: members } = await supabase
      .from('team_members')
      .select('profile_id')
      .eq('team_id', input.team_id)
    if (members && members.length > 0) {
      const assignments = members.map((m) => ({
        task_id: task.id,
        assignee_id: m.profile_id,
      }))
      await supabase.from('task_assignments').upsert(assignments, {
        onConflict: 'task_id,assignee_id',
      })
    }
  }

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  redirect('/tasks')
}

export async function updateTaskAssignmentStatus(
  assignmentId: string,
  taskId: string,
  status: 'in_progress' | 'completed',
  completionNotes?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const update: Record<string, unknown> = { status }
  if (status === 'completed') {
    update.completed_at = new Date().toISOString()
    update.completion_notes = completionNotes || null
  }

  const { error } = await supabase
    .from('task_assignments')
    .update(update)
    .eq('id', assignmentId)
    .eq('assignee_id', user.id)

  if (error) throw new Error(error.message)

  // 모든 담당자 완료 시 상위 task도 completed로 처리
  const { data: allAssignments } = await supabase
    .from('task_assignments')
    .select('status')
    .eq('task_id', taskId)

  if (allAssignments && allAssignments.every((a) => a.status === 'completed')) {
    await supabase
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', taskId)
  }

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  revalidatePath(`/tasks/${taskId}`)
}

export async function updateTaskStatus(
  taskId: string,
  status: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId)

  if (error) throw new Error(error.message)

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) throw new Error(error.message)
  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  redirect('/tasks')
}

export async function addComment(taskId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const { error } = await supabase.from('task_comments').insert({
    task_id: taskId,
    author_id: user.id,
    content,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/tasks/${taskId}`)
}
