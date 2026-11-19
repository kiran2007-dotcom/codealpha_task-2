export type ProjectStatus = 'Active' | 'On Hold' | 'Completed';
export type ProjectRole = 'owner' | 'member';
export type TaskStatus = 'To Do' | 'In Progress' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export type CommentScope = 'task' | 'discussion';
export type NotificationType =
  | 'task_assigned'
  | 'task_status'
  | 'comment_added'
  | 'member_added'
  | 'project_updated';
export type ActivityEntityType = 'project' | 'task' | 'member' | 'comment';

export const BLUEPRINT_LIMITS = {
  ID_PATTERN: /^[a-zA-Z0-9_\-]+$/,
  DATE_PATTERN: /^\d{4}-\d{2}-\d{2}$/,
  HEX_COLOR_PATTERN: /^#[0-9a-fA-F]{6}$/,
  URL_PATTERN: /^https?:\/\/.*$/,
  MAX_ID_LENGTH: 128,
  MAX_DISPLAY_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 254,
  MAX_JOB_TITLE_LENGTH: 100,
  MAX_DEPARTMENT_LENGTH: 100,
  MAX_BIO_LENGTH: 500,
  MAX_PROJECT_NAME_LENGTH: 120,
  MAX_PROJECT_DESC_LENGTH: 2000,
  MAX_TASK_TITLE_LENGTH: 160,
  MAX_TASK_DESC_LENGTH: 3000,
  MAX_COMMENT_BODY_LENGTH: 2000,
  MAX_MEMBERS_PER_PROJECT: 25,
  MAX_ATTACHMENTS_PER_TASK: 10,
  MAX_ATTACHMENT_NAME_LENGTH: 120,
  MAX_ATTACHMENT_URL_LENGTH: 500,
} as const;

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  addedBy: string;
  addedAt: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  jobTitle: string;
  department: string;
  bio: string;
  avatarColor: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface EmailDirectoryEntry {
  uid: string;
  displayName: string;
  jobTitle: string;
  avatarColor: string;
  updatedAt?: unknown;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  ownerId: string;
  ownerName: string;
  startDate: string;
  endDate: string;
  memberIds: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  projectOwnerId: string;
  userId: string;
  memberName: string;
  memberTitle: string;
  avatarColor: string;
  role: ProjectRole;
  projectMemberIds: string[];
  addedBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Task {
  id: string;
  projectId: string;
  projectOwnerId: string;
  projectMemberIds: string[];
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assigneeId: string;
  assigneeName: string;
  attachments: TaskAttachment[];
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Comment {
  id: string;
  projectId: string;
  projectOwnerId: string;
  projectMemberIds: string[];
  taskId: string;
  scope: CommentScope;
  authorId: string;
  authorName: string;
  body: string;
  createdAt?: unknown;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  actorId: string;
  actorName: string;
  projectId: string;
  taskId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt?: unknown;
}

export interface ActivityLog {
  id: string;
  projectId: string;
  projectOwnerId: string;
  projectMemberIds: string[];
  entityType: ActivityEntityType;
  entityId: string;
  action: string;
  details: string;
  actorId: string;
  actorName: string;
  createdAt?: unknown;
}

export interface DashboardMetrics {
  totalProjects: number;
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

export interface TaskFilterOptions {
  search: string;
  status: 'All' | TaskStatus;
  priority: 'All' | TaskPriority;
  assigneeId: string;
  dueFilter: 'all' | 'overdue' | 'due_soon' | 'has_date';
  sortBy: 'newest' | 'oldest' | 'due_asc';
}
