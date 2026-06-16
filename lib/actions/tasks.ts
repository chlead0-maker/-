'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { TaskType, TaskPriority, ItemType } from '@/lib/types'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface CreateTaskInput {
  title: string
  description?: string
  notes?: string
  task_type: TaskType
  priority: TaskPriority
  due_date: string
  assignee_ids?: string[]
  team_id?: string
}

export interface CreateQuickItemInput {
  title: string
  item_type: ItemType
  due_date: string
  task_type?: TaskType
  priority?: TaskPriority
  start_time?: string
  end_time?: string
  description?: string
  notes?: string
  location?: string
  assignee_ids?: string[]
}

export async function createQuickItem(input: CreateQuickItemInput) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('로그인이 필요합니다')
  const user = session.user

  const admin = getAdminClient()
  const { data: task, error } = await admin
    .from('tasks')
    .insert({
      title: input.title,
      item_type: input.item_type,
      task_type: input.task_type || 'daily',
      priority: input.priority || 'medium',
      due_date: input.due_date,
      start_time: input.start_time || null,
      end_time: input.end_time || null,
      description: input.description || null,
      notes: input.notes || null,
      location: input.location || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error || !task) throw new Error(error?.message || '생성 실패')

  const assigneeIds = input.assignee_ids?.length ? input.assignee_ids : [user.id]
  await admin.from('task_assignments').insert(
    assigneeIds.map((id) => ({ task_id: task.id, assignee_id: id }))
  )

  revalidatePath('/calendar')
  revalidatePath('/dashboard')
}

export async function createTask(input: CreateTaskInput) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('로그인이 필요합니다')
  const user = session.user

  const admin = getAdminClient()
  const { data: task, error: taskError } = await admin
    .from('tasks')
    .insert({
      title: input.title,
      description: input.description || null,
      notes: input.notes || null,
      task_type: input.task_type,
      priority: input.priority,
      due_date: input.due_date,
      assigned_to_team: input.team_id || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (taskError || !task) throw new Error(taskError?.message || '업무 생성 실패')

  if (!input.assignee_ids?.length && !input.team_id) {
    input.assignee_ids = [user.id]
  }

  if (input.assignee_ids && input.assignee_ids.length > 0) {
    const assignments = input.assignee_ids.map((id) => ({
      task_id: task.id,
      assignee_id: id,
    }))
    const { error: assignError } = await admin.from('task_assignments').insert(assignments)
    if (assignError) throw new Error(assignError.message)
  }

  if (input.team_id) {
    const { data: members } = await admin
      .from('team_members')
      .select('profile_id')
      .eq('team_id', input.team_id)
    if (members && members.length > 0) {
      const assignments = members.map((m) => ({
        task_id: task.id,
        assignee_id: m.profile_id,
      }))
      await admin.from('task_assignments').upsert(assignments, {
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

  // admin 클라이언트로 조회 — RLS로 인해 본인 assignment만 보이는 문제 방지
  const admin = getAdminClient()
  const { data: allAssignments } = await admin
    .from('task_assignments')
    .select('status')
    .eq('task_id', taskId)

  const newTaskStatus = allAssignments && allAssignments.every((a) => a.status === 'completed')
    ? 'completed'
    : allAssignments?.some((a) => a.status === 'in_progress' || a.status === 'completed')
    ? 'in_progress'
    : 'pending'

  await admin
    .from('tasks')
    .update({
      status: newTaskStatus,
      ...(newTaskStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', taskId)

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  revalidatePath('/calendar')
  revalidatePath(`/tasks/${taskId}`)
}

// 캘린더 팝업에서 빠른 완료 처리 (assignmentId로 task_id 조회 후 완료)
export async function completeAssignmentQuick(assignmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const { data: assignment } = await supabase
    .from('task_assignments')
    .select('task_id')
    .eq('id', assignmentId)
    .eq('assignee_id', user.id)
    .single()

  if (!assignment) throw new Error('권한이 없습니다')

  await updateTaskAssignmentStatus(assignmentId, assignment.task_id, 'completed')
}

export async function addTaskLog(
  taskId: string,
  content: string,
  fileUrl?: string,
  fileName?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const { error } = await supabase.from('task_logs').insert({
    task_id: taskId,
    author_id: user.id,
    content,
    file_url: fileUrl || null,
    file_name: fileName || null,
  })
  if (error) throw new Error(error.message)

  revalidatePath(`/tasks/${taskId}`)
  revalidatePath('/reports')
}

export async function deleteTaskLog(logId: string, taskId: string) {
  const { error } = await getAdminClient().from('task_logs').delete().eq('id', logId)
  if (error) throw new Error(error.message)
  revalidatePath(`/tasks/${taskId}`)
  revalidatePath('/reports')
}

export async function updateTaskStatus(taskId: string, status: string) {
  const { error } = await getAdminClient().from('tasks').update({ status }).eq('id', taskId)
  if (error) throw new Error(error.message)
  revalidatePath('/tasks')
  revalidatePath('/dashboard')
}

export async function deleteTask(taskId: string) {
  const { error } = await getAdminClient().from('tasks').delete().eq('id', taskId)
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
