import { ArrowRight, Calendar, FolderPlus } from 'lucide-react';
import {
  calculateDashboardMetrics,
  calculateProjectProgress,
  getTodayIsoDate,
  isTaskOverdue,
  toMillis,
} from '../lib/workspaceLogic.ts';
import type { ActivityLog, Project, Task, TaskStatus, UserProfile } from '../types/orbit.ts';
import { ProjectStatusIndicator, TaskPriorityIndicator, TaskStatusIndicator } from './StatusLabels.tsx';
import type { WorkspaceView } from './Sidebar.tsx';

interface DashboardViewProps {
  profile: UserProfile;
  projects: Project[];
  tasks: Task[];
  activityLogs: ActivityLog[];
  loading: boolean;
  onNavigate: (view: WorkspaceView, projectId?: string | null) => void;
  onOpenTask: (task: Task) => void;
  onQuickStatusChange: (task: Task, status: TaskStatus) => Promise<void>;
  onNewProject: () => void;
}

export function DashboardView({
  profile,
  projects,
  tasks,
  activityLogs,
  loading,
  onNavigate,
  onOpenTask,
  onQuickStatusChange,
  onNewProject,
}: DashboardViewProps) {
  const todayIso = getTodayIsoDate();
  const metrics = calculateDashboardMetrics(projects, tasks, todayIso);

  const recentProjects = [...projects]
    .sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt))
    .slice(0, 5);

  const myTasks = tasks
    .filter((t) => t.assigneeId === profile.uid)
    .sort((a, b) => {
      if (a.status === 'Completed' && b.status !== 'Completed') return 1;
      if (a.status !== 'Completed' && b.status === 'Completed') return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

  const recentLogs = [...activityLogs]
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
    .slice(0, 8);

  const kpiCards = [
    { label: 'Total Projects', value: metrics.totalProjects, tone: 'text-slate-900 dark:text-white' },
    { label: 'Total Tasks', value: metrics.totalTasks, tone: 'text-slate-900 dark:text-white' },
    { label: 'Tasks To Do', value: metrics.todoTasks, tone: 'text-slate-700 dark:text-slate-300' },
    { label: 'In Progress', value: metrics.inProgressTasks, tone: 'text-amber-700 dark:text-amber-400' },
    { label: 'Completed', value: metrics.completedTasks, tone: 'text-emerald-700 dark:text-emerald-400' },
    { label: 'Overdue Tasks', value: metrics.overdueTasks, tone: 'text-red-700 dark:text-red-400' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse p-5"
            />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
          <div className="h-80 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white font-display">
            Welcome back, {profile.displayName}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time overview across all authorized projects and tasks.
          </p>
        </div>
        <button
          type="button"
          onClick={onNewProject}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0F172A] hover:bg-slate-800 dark:bg-emerald-800 dark:hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <FolderPlus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className={`text-2xl font-semibold font-mono tabular-nums mt-2 ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Main Split: Assigned Tasks & Recently Updated Projects */}
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Tasks Assigned to Current User */}
        <section className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Assigned to Me</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                {myTasks.length} {myTasks.length === 1 ? 'task' : 'tasks'} assigned
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('my_tasks')}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {myTasks.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No tasks assigned to you yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Create a task in a project and assign it to yourself to track it here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {myTasks.slice(0, 8).map((task) => {
                const project = projects.find((p) => p.id === task.projectId);
                const overdue = isTaskOverdue(task, todayIso);
                return (
                  <div
                    key={task.id}
                    className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenTask(task)}
                      className="text-left min-w-0 flex-1"
                    >
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span>{project?.name || 'Project'}</span>
                        <span aria-hidden="true">·</span>
                        <span className={`font-mono tabular-nums ${overdue ? 'text-red-700 dark:text-red-400 font-medium' : ''}`}>
                          Due {task.dueDate}
                          {overdue ? ' (Overdue)' : ''}
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center gap-4 shrink-0">
                      <TaskPriorityIndicator priority={task.priority} />
                      <select
                        aria-label={`Change status for ${task.title}`}
                        value={task.status}
                        onChange={(e) => void onQuickStatusChange(task, e.target.value as TaskStatus)}
                        className="text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-700/25"
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
        </section>

        {/* Recently Updated Projects */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recently Updated Projects</h3>
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
            >
              All projects
            </button>
          </div>

          {recentProjects.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No projects created yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                Start your first project to organize tasks and collaborate with teammates.
              </p>
              <button
                type="button"
                onClick={onNewProject}
                className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-emerald-800 rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-700"
              >
                Create First Project
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentProjects.map((project) => {
                const progress = calculateProjectProgress(tasks, project.id);
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => onNavigate('project_detail', project.id)}
                    className="w-full text-left px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors block"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {project.name}
                      </span>
                      <ProjectStatusIndicator status={project.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Calendar className="w-3.5 h-3.5" />
                        {project.endDate}
                      </span>
                      <span className="font-mono tabular-nums">
                        {progress.completed}/{progress.total} tasks ({progress.percentage}%)
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-700 dark:bg-emerald-500 transition-[width] duration-200"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Recent Team Activity */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Team Activity</h3>
        </div>
        {recentLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            Activity logs will appear automatically as your team creates projects, updates tasks, and collaborates.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentLogs.map((log) => {
              const proj = projects.find((p) => p.id === log.projectId);
              const timeMs = toMillis(log.createdAt);
              return (
                <div
                  key={log.id}
                  className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-slate-900 dark:text-slate-100">{log.details}</span>
                    <span className="text-slate-400 mx-2">·</span>
                    <span className="text-slate-500 dark:text-slate-400">{proj?.name || 'Project'}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-slate-400 font-mono tabular-nums">
                    <TaskStatusIndicator
                      status={log.action.includes('Completed') ? 'Completed' : 'In Progress'}
                    />
                    <span>{timeMs ? new Date(timeMs).toLocaleString() : 'Just now'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
