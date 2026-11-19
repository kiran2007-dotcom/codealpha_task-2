import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { filterAndSortTasks, getTodayIsoDate, isTaskOverdue } from '../lib/workspaceLogic.ts';
import type { Project, ProjectMember, Task, TaskFilterOptions, TaskStatus } from '../types/orbit.ts';
import { TaskPriorityIndicator, TaskStatusIndicator } from './StatusLabels.tsx';

interface MyTasksViewProps {
  projects: Project[];
  members: ProjectMember[];
  tasks: Task[];
  currentUserId: string;
  globalSearch: string;
  onOpenTask: (task: Task) => void;
  onQuickStatusChange: (task: Task, status: TaskStatus) => Promise<void>;
}

export function MyTasksView({
  projects,
  members,
  tasks,
  currentUserId,
  globalSearch,
  onOpenTask,
  onQuickStatusChange,
}: MyTasksViewProps) {
  const [scope, setScope] = useState<'assigned' | 'all'>('assigned');
  const [filters, setFilters] = useState<TaskFilterOptions>({
    search: '',
    status: 'All',
    priority: 'All',
    assigneeId: 'All',
    dueFilter: 'all',
    sortBy: 'newest',
  });

  const uniqueAssignees = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      map.set(m.userId, m.memberName);
    }
    return Array.from(map.entries()).map(([uid, name]) => ({ uid, name }));
  }, [members]);

  const baseTasks = useMemo(
    () => (scope === 'assigned' ? tasks.filter((t) => t.assigneeId === currentUserId) : tasks),
    [scope, tasks, currentUserId]
  );

  const todayIso = getTodayIsoDate();
  const effectiveFilters: TaskFilterOptions = {
    ...filters,
    search: filters.search || globalSearch,
  };
  const filtered = filterAndSortTasks(baseTasks, effectiveFilters, todayIso);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white font-display">Tasks Workspace</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Search, filter, and update tasks across all your authorized projects.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setScope('assigned')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              scope === 'assigned'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Assigned to Me
          </button>
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              scope === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Workspace Tasks
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search tasks by title or description..."
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
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value as TaskFilterOptions['priority'] }))}
          className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
        >
          <option value="All">Priority: All</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          aria-label="Filter by assigned member"
          value={filters.assigneeId}
          onChange={(e) => setFilters((f) => ({ ...f, assigneeId: e.target.value }))}
          className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
        >
          <option value="All">Member: All</option>
          <option value="Unassigned">Unassigned</option>
          {uniqueAssignees.map((a) => (
            <option key={a.uid} value={a.uid}>
              {a.name}
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

      {/* Task Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">No tasks found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Adjust your filters or open a project to create new tasks.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60">
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filtered.map((task) => {
                  const proj = projects.find((p) => p.id === task.projectId);
                  const overdue = isTaskOverdue(task, todayIso);
                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => onOpenTask(task)}
                          className="text-left font-medium text-slate-900 dark:text-slate-100 hover:text-emerald-700 dark:hover:text-emerald-400"
                        >
                          {task.title}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {proj?.name || 'Project'}
                      </td>
                      <td className="py-3 px-4">
                        <TaskPriorityIndicator priority={task.priority} />
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                        {task.assigneeName || 'Unassigned'}
                      </td>
                      <td
                        className={`py-3 px-4 font-mono tabular-nums text-xs ${
                          overdue ? 'text-red-700 dark:text-red-400 font-medium' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {task.dueDate}
                        {overdue ? ' (Overdue)' : ''}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <TaskStatusIndicator status={task.status} />
                          <select
                            aria-label={`Status for ${task.title}`}
                            value={task.status}
                            onChange={(e) => void onQuickStatusChange(task, e.target.value as TaskStatus)}
                            className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-800 dark:text-slate-200"
                          >
                            <option value="To Do">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
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
  );
}
