import { useState } from 'react';
import { Calendar, FolderPlus, Search, Users } from 'lucide-react';
import { calculateProjectProgress, toMillis } from '../lib/workspaceLogic.ts';
import type { Project, ProjectStatus, Task } from '../types/orbit.ts';
import { ProjectStatusIndicator } from './StatusLabels.tsx';

interface ProjectsViewProps {
  projects: Project[];
  tasks: Task[];
  currentUserId: string;
  globalSearch: string;
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
}

export function ProjectsView({
  projects,
  tasks,
  currentUserId,
  globalSearch,
  onSelectProject,
  onNewProject,
}: ProjectsViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ProjectStatus>('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const queryText = (search || globalSearch).trim().toLowerCase();

  const filteredProjects = projects
    .filter((p) => {
      if (queryText) {
        const match = `${p.name} ${p.description} ${p.ownerName}`.toLowerCase().includes(queryText);
        if (!match) return false;
      }
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const aMs = toMillis(a.createdAt);
      const bMs = toMillis(b.createdAt);
      return sortOrder === 'oldest' ? aMs - bMs : bMs - aMs;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white font-display">Projects</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage authorized projects, team roles, and delivery schedules.
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

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter projects by name, description, or owner..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700/25"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {(['All', 'Active', 'On Hold', 'Completed'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <select
            aria-label="Sort projects"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            className="px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
          >
            <option value="newest">Sort: Newest first</option>
            <option value="oldest">Sort: Oldest first</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {projects.length === 0 ? 'No projects in your workspace' : 'No projects match your filters'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
            {projects.length === 0
              ? 'Create a project to start assigning tasks and inviting team members.'
              : 'Try adjusting your search query or status filter.'}
          </p>
          {projects.length === 0 && (
            <button
              type="button"
              onClick={onNewProject}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0F172A] dark:bg-emerald-800 rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-700"
            >
              Create First Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const progress = calculateProjectProgress(tasks, project.id);
            const isOwner = project.ownerId === currentUserId;
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelectProject(project.id)}
                className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-5 transition-colors flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white line-clamp-1">
                      {project.name}
                    </h3>
                    <ProjectStatusIndicator status={project.status} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 min-h-[32px]">
                    {project.description || 'No project description provided.'}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {isOwner ? 'Owner' : 'Member'} · {project.ownerName}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <Users className="w-3.5 h-3.5" />
                      {project.memberIds.length}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 font-mono tabular-nums">
                        <Calendar className="w-3.5 h-3.5" />
                        {project.startDate} – {project.endDate}
                      </span>
                      <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">
                        {progress.percentage}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-700 dark:bg-emerald-500 transition-[width] duration-200"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
