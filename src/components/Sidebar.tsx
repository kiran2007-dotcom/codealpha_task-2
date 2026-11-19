import {
  Bell,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Plus,
  UserCircle,
  X,
} from 'lucide-react';
import type { Project } from '../types/orbit.ts';

export type WorkspaceView = 'dashboard' | 'projects' | 'project_detail' | 'my_tasks' | 'notifications' | 'profile';

interface SidebarProps {
  activeView: WorkspaceView;
  selectedProjectId: string | null;
  projects: Project[];
  unreadCount: number;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onNavigate: (view: WorkspaceView, projectId?: string | null) => void;
  onNewProject: () => void;
  onSignOut: () => void;
}

export function Sidebar({
  activeView,
  selectedProjectId,
  projects,
  unreadCount,
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
  onNavigate,
  onNewProject,
  onSignOut,
}: SidebarProps) {
  const navItems: { id: WorkspaceView; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'my_tasks', label: 'My Tasks', icon: CheckSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { id: 'profile', label: 'Profile', icon: UserCircle },
  ];

  const handleSelect = (view: WorkspaceView, projectId: string | null = null) => {
    onNavigate(view, projectId);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0F172A] text-slate-200 border-r border-slate-800 select-none">
      {/* Brand Row */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 shrink-0">
        <button
          type="button"
          onClick={() => handleSelect('dashboard')}
          className="flex items-center gap-2.5 text-left min-w-0"
        >
          <svg className="w-7 h-7 text-emerald-400 shrink-0" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="26" height="26" rx="6" stroke="currentColor" strokeWidth="2" />
            <circle cx="16" cy="16" r="6" stroke="white" strokeWidth="2" />
            <circle cx="22" cy="10" r="2" fill="currentColor" />
          </svg>
          {!collapsed && (
            <span className="font-display font-semibold text-base text-white tracking-tight truncate whitespace-nowrap">
              Orbit Workspace
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:inline-flex p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Nav */}
      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeView === item.id || (item.id === 'projects' && activeView === 'project_detail');
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#1E3A5F] text-white'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </span>
              {!collapsed && typeof item.badge === 'number' && item.badge > 0 && (
                <span className="font-mono tabular-nums text-xs font-semibold text-emerald-300">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Projects Quick List */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-3 pt-4 pb-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-medium text-slate-400">Active Projects</span>
            <button
              type="button"
              onClick={() => {
                onNewProject();
                onCloseMobile();
              }}
              aria-label="Create project"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-0.5">
            {projects.length === 0 ? (
              <p className="px-2 py-2 text-xs text-slate-500">No projects yet</p>
            ) : (
              projects.slice(0, 12).map((proj) => {
                const selected = activeView === 'project_detail' && selectedProjectId === proj.id;
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => handleSelect('project_detail', proj.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-md text-xs transition-colors truncate ${
                      selected
                        ? 'bg-slate-800 text-emerald-300 font-medium'
                        : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    {proj.name}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Footer Sign Out */}
      <div className="p-3 border-t border-slate-800/80 mt-auto">
        <button
          type="button"
          onClick={onSignOut}
          title={collapsed ? 'Sign Out' : undefined}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors whitespace-nowrap"
        >
          <LogOut className="w-4 h-4 shrink-0 text-slate-400" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-[width] duration-200 ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/60" onClick={onCloseMobile} />
          <div className="relative w-72 max-w-[85vw] h-full z-10">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
