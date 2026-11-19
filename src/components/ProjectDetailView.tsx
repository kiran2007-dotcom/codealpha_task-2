import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  History,
  Kanban,
  ListChecks,
  MessageSquare,
  Plus,
  Search,
  Send,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  calculateProjectProgress,
  filterAndSortTasks,
  getProjectPermissions,
  getTodayIsoDate,
  getUserProjectRole,
  isTaskOverdue,
  toMillis,
} from '../lib/workspaceLogic.ts';
import {
  BLUEPRINT_LIMITS,
  type ActivityLog,
  type Comment,
  type Project,
  type ProjectMember,
  type Task,
  type TaskFilterOptions,
  type TaskPriority,
  type TaskStatus,
} from '../types/orbit.ts';
import { Avatar } from './Avatar.tsx';
import { ProjectStatusIndicator, TaskPriorityIndicator, TaskStatusIndicator } from './StatusLabels.tsx';

type ProjectTab = 'board' | 'list' | 'calendar' | 'discussions' | 'team' | 'activity';

interface ProjectDetailViewProps {
  project: Project;
  members: ProjectMember[];
  tasks: Task[];
  comments: Comment[];
  activityLogs: ActivityLog[];
  currentUserId: string;
  onBack: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => Promise<void>;
  onExportProject: (project: Project, tasks: Task[]) => Promise<void>;
  onNewTask: (defaultStatus?: TaskStatus) => void;
  onOpenTask: (task: Task) => void;
  onQuickStatusChange: (task: Task, status: TaskStatus) => Promise<void>;
  onInviteMemberByEmail: (email: string) => Promise<void>;
  onRemoveMember: (member: ProjectMember) => Promise<void>;
  onPostDiscussion: (body: string) => Promise<void>;
}

const KANBAN_COLUMNS: TaskStatus[] = ['To Do', 'In Progress', 'Completed'];

export function ProjectDetailView({
  project,
  members,
  tasks,
  comments,
  activityLogs,
  currentUserId,
  onBack,
  onEditProject,
  onDeleteProject,
  onExportProject,
  onNewTask,
  onOpenTask,
  onQuickStatusChange,
  onInviteMemberByEmail,
  onRemoveMember,
  onPostDiscussion,
}: ProjectDetailViewProps) {
  const [activeTab, setActiveTab] = useState<ProjectTab>('board');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [teamMsg, setTeamMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [discussionBody, setDiscussionBody] = useState('');
  const [busy, setBusy] = useState(false);

  const [filters, setFilters] = useState<TaskFilterOptions>({
    search: '',
    status: 'All',
    priority: 'All',
    assigneeId: 'All',
    dueFilter: 'all',
    sortBy: 'newest',
  });

  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const projectMembers = useMemo(
    () => members.filter((m) => m.projectId === project.id),
    [members, project.id]
  );
  const projectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === project.id),
    [tasks, project.id]
  );
  const projectDiscussions = useMemo(
    () =>
      comments
        .filter((c) => c.projectId === project.id && c.scope === 'discussion')
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)),
    [comments, project.id]
  );
  const projectLogs = useMemo(
    () =>
      activityLogs
        .filter((l) => l.projectId === project.id)
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)),
    [activityLogs, project.id]
  );

  const role = getUserProjectRole(project, projectMembers, currentUserId);
  const perms = getProjectPermissions(role);
  const progress = calculateProjectProgress(projectTasks, project.id);
  const todayIso = getTodayIsoDate();
  const filteredTasks = filterAndSortTasks(projectTasks, filters, todayIso);

  const tabs: { id: ProjectTab; label: string; icon: typeof Kanban }[] = [
    { id: 'board', label: 'Board', icon: Kanban },
    { id: 'list', label: 'Task List', icon: ListChecks },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'discussions', label: 'Discussions', icon: MessageSquare },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'activity', label: 'Activity', icon: History },
  ];

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setBusy(true);
    setTeamMsg(null);
    try {
      await onInviteMemberByEmail(inviteEmail.trim());
      setInviteEmail('');
      setTeamMsg({ type: 'ok', text: 'Team member added to the project and notified.' });
    } catch (err) {
      setTeamMsg({ type: 'err', text: err instanceof Error ? err.message : 'Unable to add member.' });
    } finally {
      setBusy(false);
    }
  }

  async function handleDiscussionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!discussionBody.trim()) return;
    setBusy(true);
    try {
      await onPostDiscussion(discussionBody);
      setDiscussionBody('');
    } finally {
      setBusy(false);
    }
  }

  // Calendar calculations
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const firstDayOffset = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const monthLabel = calendarDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Project Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Projects</span>
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white font-display">
                {project.name}
              </h2>
              <ProjectStatusIndicator status={project.status} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
              {project.description || 'No description provided for this project.'}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span>Role: {role === 'owner' ? 'Project Owner' : 'Project Member'}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {project.startDate} to {project.endDate}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{projectMembers.length} members</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void onExportProject(project, projectTasks)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {perms.canEditProject && (
              <button
                type="button"
                onClick={() => onEditProject(project)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg whitespace-nowrap"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Project</span>
              </button>
            )}

            {perms.canDeleteProject && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-400 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNewTask('To Do')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0F172A] hover:bg-slate-800 dark:bg-emerald-800 dark:hover:bg-emerald-700 rounded-lg whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Delete Confirmation */}
        {confirmDelete && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs font-medium text-red-800 dark:text-red-300">
              Delete "{project.name}" and all of its tasks, discussions, and activity logs? This cannot be undone.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onDeleteProject(project);
                  } finally {
                    setBusy(false);
                  }
                }}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded-md"
              >
                {busy ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-500 dark:text-slate-400">Overall Completion</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
              {progress.completed} of {progress.total} tasks completed ({progress.percentage}%)
            </span>
          </div>
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-700 dark:bg-emerald-500 transition-[width] duration-200"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-emerald-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: KANBAN BOARD */}
      {activeTab === 'board' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {KANBAN_COLUMNS.map((colStatus) => {
            const colTasks = projectTasks
              .filter((t) => t.status === colStatus)
              .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
            return (
              <div
                key={colStatus}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (!draggedTaskId) return;
                  const target = projectTasks.find((t) => t.id === draggedTaskId);
                  setDraggedTaskId(null);
                  if (target && target.status !== colStatus) {
                    void onQuickStatusChange(target, colStatus);
                  }
                }}
                className="bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 min-h-[360px] flex flex-col gap-3"
              >
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <TaskStatusIndicator status={colStatus} />
                    <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      ({colTasks.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNewTask(colStatus)}
                    aria-label={`Add task to ${colStatus}`}
                    className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {colTasks.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center text-xs text-slate-400">
                    Drag tasks here or click + to add
                  </div>
                ) : (
                  <div className="space-y-3">
                    {colTasks.map((task) => {
                      const overdue = isTaskOverdue(task, todayIso);
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => setDraggedTaskId(task.id)}
                          onDragEnd={() => setDraggedTaskId(null)}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 cursor-grab active:cursor-grabbing hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => onOpenTask(task)}
                            className="text-left w-full"
                          >
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                          </button>

                          <div className="flex items-center justify-between gap-2 text-xs">
                            <TaskPriorityIndicator priority={task.priority} />
                            <span
                              className={`font-mono tabular-nums ${
                                overdue
                                  ? 'text-red-700 dark:text-red-400 font-medium'
                                  : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {task.dueDate}
                              {overdue ? ' · Overdue' : ''}
                            </span>
                          </div>

                          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                              {task.assigneeName || 'Unassigned'}
                            </span>
                            <select
                              aria-label={`Move ${task.title}`}
                              value={task.status}
                              onChange={(e) => void onQuickStatusChange(task, e.target.value as TaskStatus)}
                              className="text-[11px] font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-700 dark:text-slate-300"
                            >
                              <option value="To Do">To Do</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: TASK LIST WITH SEARCH & FILTERS */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="Search tasks..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <select
              aria-label="Filter by status"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as TaskFilterOptions['status'] }))}
              className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            >
              <option value="All">Status: All</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>

            <select
              aria-label="Filter by priority"
              value={filters.priority}
              onChange={(e) =>
                setFilters((f) => ({ ...f, priority: e.target.value as TaskFilterOptions['priority'] }))
              }
              className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            >
              <option value="All">Priority: All</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              aria-label="Filter by assignee"
              value={filters.assigneeId}
              onChange={(e) => setFilters((f) => ({ ...f, assigneeId: e.target.value }))}
              className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            >
              <option value="All">Assignee: All</option>
              <option value="Unassigned">Unassigned</option>
              {projectMembers.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.memberName}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by due date and sort"
              value={`${filters.dueFilter}:${filters.sortBy}`}
              onChange={(e) => {
                const [dueFilter, sortBy] = e.target.value.split(':') as [
                  TaskFilterOptions['dueFilter'],
                  TaskFilterOptions['sortBy'],
                ];
                setFilters((f) => ({ ...f, dueFilter, sortBy }));
              }}
              className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            >
              <option value="all:newest">All Dates · Newest</option>
              <option value="all:oldest">All Dates · Oldest</option>
              <option value="all:due_asc">All Dates · Due Soonest</option>
              <option value="overdue:due_asc">Overdue Only</option>
              <option value="due_soon:due_asc">Due Within 3 Days</option>
            </select>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {filteredTasks.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500 dark:text-slate-400">
                No tasks match the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60">
                      <th className="py-3 px-4">Task</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Assignee</th>
                      <th className="py-3 px-4 text-right">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {filteredTasks.map((task) => {
                      const overdue = isTaskOverdue(task, todayIso);
                      return (
                        <tr
                          key={task.id}
                          onClick={() => onOpenTask(task)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 max-w-xs truncate">
                            {task.title}
                          </td>
                          <td className="py-3 px-4">
                            <TaskStatusIndicator status={task.status} />
                          </td>
                          <td className="py-3 px-4">
                            <TaskPriorityIndicator priority={task.priority} />
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                            {task.assigneeName || 'Unassigned'}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-mono tabular-nums text-xs ${
                              overdue ? 'text-red-700 dark:text-red-400 font-medium' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {task.dueDate}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white font-display">{monthLabel}</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCalendarDate(new Date(calYear, calMonth - 1, 1))}
                aria-label="Previous month"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCalendarDate(new Date(calYear, calMonth + 1, 1))}
                aria-label="Next month"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div
                key={d}
                className="bg-slate-50 dark:bg-slate-950 py-2 px-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400"
              >
                {d}
              </div>
            ))}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-slate-50/50 dark:bg-slate-950/40 min-h-[92px] p-1.5" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const iso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayTasks = projectTasks.filter((t) => t.dueDate === iso);
              const isToday = iso === todayIso;

              return (
                <div
                  key={iso}
                  className={`bg-white dark:bg-slate-900 min-h-[92px] p-2 space-y-1 ${
                    isToday ? 'ring-1 ring-inset ring-emerald-700 dark:ring-emerald-500' : ''
                  }`}
                >
                  <div className="text-xs font-mono tabular-nums font-medium text-slate-500 dark:text-slate-400">
                    {day}
                  </div>
                  {dayTasks.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onOpenTask(t)}
                      className={`w-full text-left px-1.5 py-1 rounded text-[11px] truncate block ${
                        t.status === 'Completed'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                          : isTaskOverdue(t, todayIso)
                            ? 'bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: TEAM DISCUSSIONS */}
      {activeTab === 'discussions' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Team Discussions</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Project-wide announcements, decisions, and collaboration updates.
            </p>
          </div>

          <form onSubmit={handleDiscussionSubmit} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={discussionBody}
              onChange={(e) => setDiscussionBody(e.target.value)}
              maxLength={BLUEPRINT_LIMITS.MAX_COMMENT_BODY_LENGTH}
              placeholder="Share an update or start a discussion with the project team..."
              className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={busy || !discussionBody.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0F172A] hover:bg-slate-800 dark:bg-emerald-800 dark:hover:bg-emerald-700 rounded-lg disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Post Message</span>
            </button>
          </form>

          {projectDiscussions.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
              No discussion messages yet. Start the conversation above.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {projectDiscussions.map((msg) => {
                const ms = toMillis(msg.createdAt);
                return (
                  <div key={msg.id} className="py-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{msg.authorName}</span>
                      <span className="font-mono tabular-nums text-slate-400">
                        {ms ? new Date(ms).toLocaleString() : 'Just now'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{msg.body}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: TEAM & PERMISSIONS */}
      {activeTab === 'team' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Project Team & Roles</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Owners manage project settings, membership, and tasks. Members update permitted task statuses and
                collaborate.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {projectMembers.length} / {BLUEPRINT_LIMITS.MAX_MEMBERS_PER_PROJECT} seats
            </span>
          </div>

          {perms.canManageMembers && (
            <form onSubmit={handleInvite} className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <label htmlFor="invite-email" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Add Registered User by Email
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="invite-email"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0F172A] hover:bg-slate-800 dark:bg-emerald-800 dark:hover:bg-emerald-700 rounded-lg disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{busy ? 'Adding...' : 'Add Member'}</span>
                </button>
              </div>
              {teamMsg && (
                <p
                  className={`text-xs ${
                    teamMsg.type === 'ok'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}
                >
                  {teamMsg.text}
                </p>
              )}
            </form>
          )}

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {projectMembers.map((member) => (
              <div key={member.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={member.memberName} color={member.avatarColor} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {member.memberName}
                      {member.userId === currentUserId ? ' (You)' : ''}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {member.memberTitle || 'Team Member'} ·{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {member.role === 'owner' ? 'Project Owner' : 'Project Member'}
                      </span>
                    </p>
                  </div>
                </div>

                {perms.canManageMembers && member.role !== 'owner' && (
                  <button
                    type="button"
                    onClick={() => void onRemoveMember(member)}
                    className="px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/60 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 whitespace-nowrap shrink-0"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: PROJECT ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Project Activity Log</h3>
          </div>
          {projectLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No activity recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {projectLogs.map((log) => {
                const ms = toMillis(log.createdAt);
                return (
                  <div
                    key={log.id}
                    className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{log.action}</span>
                      <span className="text-slate-400 mx-2">·</span>
                      <span className="text-slate-600 dark:text-slate-300">{log.details}</span>
                    </div>
                    <span className="font-mono tabular-nums text-slate-400 shrink-0">
                      {ms ? new Date(ms).toLocaleString() : 'Just now'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
