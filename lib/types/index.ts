export type Role = 'admin' | 'team_lead' | 'employee'
export type TaskType = 'daily' | 'weekly' | 'monthly'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type AssignmentStatus = 'pending' | 'in_progress' | 'completed'
export type ItemType = 'task' | 'event'

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  name: string
  description: string | null
  color: string
  created_by: string | null
  created_at: string
  members?: Profile[]
}

export interface Task {
  id: string
  title: string
  description: string | null
  notes: string | null
  location: string | null
  task_type: TaskType
  item_type: ItemType
  status: TaskStatus
  priority: TaskPriority
  due_date: string
  start_time: string | null
  end_time: string | null
  assigned_to_team: string | null
  created_by: string
  completed_at: string | null
  completion_notes: string | null
  created_at: string
  updated_at: string
  assignments?: TaskAssignment[]
  team?: Team | null
  creator?: Profile | null
}

export interface TaskAssignment {
  id: string
  task_id: string
  assignee_id: string
  status: AssignmentStatus
  completed_at: string | null
  completion_notes: string | null
  assigned_at: string
  assignee?: Profile | null
}

export interface TaskComment {
  id: string
  task_id: string
  author_id: string
  content: string
  created_at: string
  author?: Profile | null
}

export interface TaskLog {
  id: string
  task_id: string
  author_id: string
  content: string
  file_url: string | null
  file_name: string | null
  created_at: string
  author?: Profile | null
}

export interface TaskWithDetails extends Task {
  assignments: (TaskAssignment & { assignee: Profile })[]
  team: Team | null
  creator: Profile
}

export interface EmployeeStats {
  profile: Profile
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  overdueTasks: number
}
