import type {
  DashboardMetrics,
  Project,
  ProjectMember,
  ProjectRole,
  Task,
  TaskFilterOptions,
} from '../types/orbit.ts';

export function getTodayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toMillis(ts: unknown): number {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof ts === 'object' && ts !== null) {
    const maybe = ts as { toMillis?: () => number; seconds?: number; _seconds?: number };
    if (typeof maybe.toMillis === 'function') return maybe.toMillis();
    if (typeof maybe.seconds === 'number') return maybe.seconds * 1000;
    if (typeof maybe._seconds === 'number') return maybe._seconds * 1000;
  }
  return 0;
}

export function isTaskOverdue(task: Pick<Task, 'dueDate' | 'status'>, todayIso: string = getTodayIsoDate()): boolean {
  if (task.status === 'Completed') return false;
  if (!task.dueDate) return false;
  return task.dueDate < todayIso;
}

export function calculateDashboardMetrics(
  projects: Project[],
  tasks: Task[],
  todayIso: string = getTodayIsoDate()
): DashboardMetrics {
  let todoTasks = 0;
  let inProgressTasks = 0;
  let completedTasks = 0;
  let overdueTasks = 0;

  for (const task of tasks) {
    if (task.status === 'To Do') todoTasks += 1;
    else if (task.status === 'In Progress') inProgressTasks += 1;
    else if (task.status === 'Completed') completedTasks += 1;

    if (isTaskOverdue(task, todayIso)) overdueTasks += 1;
  }

  return {
    totalProjects: projects.length,
    totalTasks: tasks.length,
    todoTasks,
    inProgressTasks,
    completedTasks,
    overdueTasks,
  };
}

export function calculateProjectProgress(tasks: Task[], projectId: string): {
  total: number;
  completed: number;
  percentage: number;
} {
  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  const total = projectTasks.length;
  const completed = projectTasks.filter((t) => t.status === 'Completed').length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, percentage };
}

export function filterAndSortTasks(
  tasks: Task[],
  options: TaskFilterOptions,
  todayIso: string = getTodayIsoDate()
): Task[] {
  const searchLower = options.search.trim().toLowerCase();

  const plusThreeDaysDate = new Date(`${todayIso}T00:00:00Z`);
  plusThreeDaysDate.setUTCDate(plusThreeDaysDate.getUTCDate() + 3);
  const plusThreeIso = plusThreeDaysDate.toISOString().slice(0, 10);

  const filtered = tasks.filter((task) => {
    if (searchLower) {
      const haystack = `${task.title} ${task.description} ${task.assigneeName}`.toLowerCase();
      if (!haystack.includes(searchLower)) return false;
    }

    if (options.status !== 'All' && task.status !== options.status) return false;
    if (options.priority !== 'All' && task.priority !== options.priority) return false;

    if (options.assigneeId !== 'All') {
      if (options.assigneeId === 'Unassigned') {
        if (task.assigneeId) return false;
      } else if (task.assigneeId !== options.assigneeId) {
        return false;
      }
    }

    if (options.dueFilter === 'overdue') {
      if (!isTaskOverdue(task, todayIso)) return false;
    } else if (options.dueFilter === 'due_soon') {
      if (task.status === 'Completed') return false;
      if (task.dueDate < todayIso || task.dueDate > plusThreeIso) return false;
    }

    return true;
  });

  return filtered.sort((a, b) => {
    if (options.sortBy === 'due_asc') {
      return a.dueDate.localeCompare(b.dueDate);
    }
    const aTime = toMillis(a.createdAt);
    const bTime = toMillis(b.createdAt);
    return options.sortBy === 'oldest' ? aTime - bTime : bTime - aTime;
  });
}

export function getUserProjectRole(
  project: Pick<Project, 'ownerId' | 'memberIds'> | null | undefined,
  memberships: ProjectMember[],
  userId: string
): ProjectRole | null {
  if (!project || !userId) return null;
  if (project.ownerId === userId) return 'owner';
  const membership = memberships.find((m) => m.projectId === (project as Project).id && m.userId === userId);
  if (membership) return membership.role;
  if (project.memberIds.includes(userId)) return 'member';
  return null;
}

export interface PermissionMatrix {
  canViewProject: boolean;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canManageMembers: boolean;
  canCreateTask: boolean;
  canEditAllTaskFields: boolean;
  canDeleteTask: boolean;
  canUpdateTaskStatus: boolean;
  canAddAttachment: boolean;
  canComment: boolean;
}

export function getProjectPermissions(role: ProjectRole | null): PermissionMatrix {
  if (role === 'owner') {
    return {
      canViewProject: true,
      canEditProject: true,
      canDeleteProject: true,
      canManageMembers: true,
      canCreateTask: true,
      canEditAllTaskFields: true,
      canDeleteTask: true,
      canUpdateTaskStatus: true,
      canAddAttachment: true,
      canComment: true,
    };
  }
  if (role === 'member') {
    return {
      canViewProject: true,
      canEditProject: false,
      canDeleteProject: false,
      canManageMembers: false,
      canCreateTask: true,
      canEditAllTaskFields: false,
      canDeleteTask: false,
      canUpdateTaskStatus: true,
      canAddAttachment: true,
      canComment: true,
    };
  }
  return {
    canViewProject: false,
    canEditProject: false,
    canDeleteProject: false,
    canManageMembers: false,
    canCreateTask: false,
    canEditAllTaskFields: false,
    canDeleteTask: false,
    canUpdateTaskStatus: false,
    canAddAttachment: false,
    canComment: false,
  };
}
