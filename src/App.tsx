import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { AuthView } from './components/AuthView.tsx';
import { Sidebar, type WorkspaceView } from './components/Sidebar.tsx';
import { TopBar } from './components/TopBar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { ProjectsView } from './components/ProjectsView.tsx';
import { ProjectDetailView } from './components/ProjectDetailView.tsx';
import { MyTasksView } from './components/MyTasksView.tsx';
import { NotificationsView } from './components/NotificationsView.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { ProjectModal } from './components/ProjectModal.tsx';
import { TaskCreateModal } from './components/TaskCreateModal.tsx';
import { TaskDetailModal } from './components/TaskDetailModal.tsx';
import { db, handleFirestoreError, OperationType } from './lib/firebase.ts';
import {
  addComment,
  addProjectMember,
  addTaskAttachment,
  createProject,
  createTask,
  deleteProject,
  deleteTask,
  exportProjectReport,
  lookupRegisteredUserByEmail,
  markAllNotificationsRead,
  markNotificationRead,
  removeProjectMember,
  removeTaskAttachment,
  updateProject,
  updateTaskDetails,
  updateTaskStatus,
} from './services/firestoreService.ts';
import type {
  ActivityLog,
  AppNotification,
  Comment,
  Project,
  ProjectMember,
  Task,
  TaskStatus,
} from './types/orbit.ts';

function WorkspaceShell() {
  const { authReady, firebaseUser, profile, isVerified, darkMode, toggleDarkMode, signOut } = useAuth();

  const [activeView, setActiveView] = useState<WorkspaceView>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [taskCreateOpen, setTaskCreateOpen] = useState(false);
  const [taskDefaultStatus, setTaskDefaultStatus] = useState<TaskStatus>('To Do');
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Attach real-time Firestore listeners only when auth is ready, user is signed in, and email is verified
  useEffect(() => {
    if (!authReady || !firebaseUser || !isVerified) {
      setProjects([]);
      setMembers([]);
      setTasks([]);
      setComments([]);
      setNotifications([]);
      setActivityLogs([]);
      setDataLoading(false);
      return;
    }

    const uid = firebaseUser.uid;
    setDataLoading(true);

    const unsubProjects = onSnapshot(
      query(collection(db, 'projects'), where('memberIds', 'array-contains', uid)),
      (snap) => {
        setProjects(snap.docs.map((d) => d.data() as Project));
        setDataLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'projects')
    );

    const unsubMembers = onSnapshot(
      query(collection(db, 'projectMembers'), where('projectMemberIds', 'array-contains', uid)),
      (snap) => setMembers(snap.docs.map((d) => d.data() as ProjectMember)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'projectMembers')
    );

    const unsubTasks = onSnapshot(
      query(collection(db, 'tasks'), where('projectMemberIds', 'array-contains', uid)),
      (snap) => setTasks(snap.docs.map((d) => d.data() as Task)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'tasks')
    );

    const unsubComments = onSnapshot(
      query(collection(db, 'comments'), where('projectMemberIds', 'array-contains', uid)),
      (snap) => setComments(snap.docs.map((d) => d.data() as Comment)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'comments')
    );

    const unsubNotifs = onSnapshot(
      query(collection(db, 'notifications'), where('recipientId', '==', uid)),
      (snap) => setNotifications(snap.docs.map((d) => d.data() as AppNotification)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
    );

    const unsubLogs = onSnapshot(
      query(collection(db, 'activityLogs'), where('projectMemberIds', 'array-contains', uid)),
      (snap) => setActivityLogs(snap.docs.map((d) => d.data() as ActivityLog)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'activityLogs')
    );

    return () => {
      unsubProjects();
      unsubMembers();
      unsubTasks();
      unsubComments();
      unsubNotifs();
      unsubLogs();
    };
  }, [authReady, firebaseUser, isVerified]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  const selectedTaskProject = useMemo(
    () => (selectedTask ? projects.find((p) => p.id === selectedTask.projectId) || null : null),
    [selectedTask, projects]
  );

  const selectedTaskMembers = useMemo(
    () => (selectedTask ? members.filter((m) => m.projectId === selectedTask.projectId) : []),
    [selectedTask, members]
  );

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Loading Orbit Workspace...</div>
      </div>
    );
  }

  if (!firebaseUser || !isVerified || !profile) {
    return <AuthView />;
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  const breadcrumb = (() => {
    if (activeView === 'dashboard') return 'Dashboard';
    if (activeView === 'projects') return 'Projects';
    if (activeView === 'project_detail') return `Projects / ${selectedProject?.name || 'Workspace'}`;
    if (activeView === 'my_tasks') return 'Tasks';
    if (activeView === 'notifications') return 'Notification Center';
    return 'Profile & Settings';
  })();

  function navigate(view: WorkspaceView, projectId: string | null = null, taskId: string | null = null) {
    setActiveView(view);
    if (projectId !== undefined) setSelectedProjectId(projectId);
    if (taskId) setSelectedTaskId(taskId);
  }

  async function runAction(fn: () => Promise<void>, successMessage?: string) {
    try {
      await fn();
      if (successMessage) setToast({ type: 'ok', text: successMessage });
    } catch (err) {
      setToast({
        type: 'err',
        text: err instanceof Error ? err.message : 'Operation failed.',
      });
      throw err;
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar
        activeView={activeView}
        selectedProjectId={selectedProjectId}
        projects={projects}
        unreadCount={unreadCount}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onNavigate={(view, pid) => navigate(view, pid ?? null)}
        onNewProject={() => {
          setEditingProject(null);
          setProjectModalOpen(true);
        }}
        onSignOut={() => void signOut()}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          breadcrumb={breadcrumb}
          globalSearch={globalSearch}
          onGlobalSearchChange={(val) => {
            setGlobalSearch(val);
            if (val.trim() && activeView === 'dashboard') {
              setActiveView('my_tasks');
            }
          }}
          notifications={notifications}
          profile={profile}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onMarkRead={(id) => void markNotificationRead(id)}
          onMarkAllRead={() => void markAllNotificationsRead(notifications)}
          onNavigate={navigate}
        />

        {toast && (
          <div className="px-4 sm:px-6 pt-4">
            <div
              role="status"
              className={`px-4 py-2.5 rounded-lg border text-xs font-medium ${
                toast.type === 'ok'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300'
              }`}
            >
              {toast.text}
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {activeView === 'dashboard' && (
            <DashboardView
              profile={profile}
              projects={projects}
              tasks={tasks}
              activityLogs={activityLogs}
              loading={dataLoading}
              onNavigate={(v, pid) => navigate(v, pid ?? null)}
              onOpenTask={(t) => setSelectedTaskId(t.id)}
              onQuickStatusChange={async (task, status) => {
                const proj = projects.find((p) => p.id === task.projectId);
                if (!proj) return;
                await runAction(() => updateTaskStatus(profile, proj, task, status), `Task moved to ${status}`);
              }}
              onNewProject={() => {
                setEditingProject(null);
                setProjectModalOpen(true);
              }}
            />
          )}

          {activeView === 'projects' && (
            <ProjectsView
              projects={projects}
              tasks={tasks}
              currentUserId={profile.uid}
              globalSearch={globalSearch}
              onSelectProject={(pid) => navigate('project_detail', pid)}
              onNewProject={() => {
                setEditingProject(null);
                setProjectModalOpen(true);
              }}
            />
          )}

          {activeView === 'project_detail' && selectedProject && (
            <ProjectDetailView
              project={selectedProject}
              members={members}
              tasks={tasks}
              comments={comments}
              activityLogs={activityLogs}
              currentUserId={profile.uid}
              onBack={() => navigate('projects')}
              onEditProject={(proj) => {
                setEditingProject(proj);
                setProjectModalOpen(true);
              }}
              onDeleteProject={async (proj) => {
                await runAction(
                  () => deleteProject(proj, members, tasks, comments, activityLogs),
                  `Project "${proj.name}" deleted`
                );
                navigate('projects', null);
              }}
              onExportProject={async (proj, projTasks) => {
                await runAction(async () => {
                  const res = await exportProjectReport(proj, projTasks);
                  const blob = new Blob([res.content], { type: 'text/markdown;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = res.filename;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  URL.revokeObjectURL(url);
                }, 'Project report downloaded');
              }}
              onNewTask={(status = 'To Do') => {
                setTaskDefaultStatus(status);
                setTaskCreateOpen(true);
              }}
              onOpenTask={(t) => setSelectedTaskId(t.id)}
              onQuickStatusChange={async (task, status) => {
                await runAction(
                  () => updateTaskStatus(profile, selectedProject, task, status),
                  `Task moved to ${status}`
                );
              }}
              onInviteMemberByEmail={async (email) => {
                const target = await lookupRegisteredUserByEmail(email);
                if (!target) {
                  throw new Error(
                    'No registered verified Orbit Workspace user found for that email. Ask them to sign in once first.'
                  );
                }
                await addProjectMember(profile, selectedProject, target, members, tasks, comments, activityLogs);
                setToast({ type: 'ok', text: `${target.displayName} added to ${selectedProject.name}` });
              }}
              onRemoveMember={async (member) => {
                await runAction(
                  () => removeProjectMember(profile, selectedProject, member, members, tasks, comments, activityLogs),
                  `${member.memberName} removed from project`
                );
              }}
              onPostDiscussion={async (body) => {
                await runAction(
                  () => addComment(profile, selectedProject, 'discussion', null, body),
                  'Discussion message posted'
                );
              }}
            />
          )}

          {activeView === 'project_detail' && !selectedProject && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Project not found or access revoked.
              </p>
              <button
                type="button"
                onClick={() => navigate('projects')}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-emerald-800 rounded-lg"
              >
                Return to Projects
              </button>
            </div>
          )}

          {activeView === 'my_tasks' && (
            <MyTasksView
              projects={projects}
              members={members}
              tasks={tasks}
              currentUserId={profile.uid}
              globalSearch={globalSearch}
              onOpenTask={(t) => setSelectedTaskId(t.id)}
              onQuickStatusChange={async (task, status) => {
                const proj = projects.find((p) => p.id === task.projectId);
                if (!proj) return;
                await runAction(() => updateTaskStatus(profile, proj, task, status), `Task moved to ${status}`);
              }}
            />
          )}

          {activeView === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              onMarkRead={(id) => void markNotificationRead(id)}
              onMarkAllRead={() => void markAllNotificationsRead(notifications)}
              onOpenNotification={(n) => {
                if (!n.read) void markNotificationRead(n.id);
                navigate('project_detail', n.projectId, n.taskId || null);
              }}
            />
          )}

          {activeView === 'profile' && <ProfileView />}
        </main>
      </div>

      {/* Modals */}
      <ProjectModal
        open={projectModalOpen}
        initialProject={editingProject}
        onClose={() => {
          setProjectModalOpen(false);
          setEditingProject(null);
        }}
        onSubmit={async (data) => {
          if (editingProject) {
            await runAction(
              () => updateProject(profile, editingProject, data),
              `Project "${data.name}" updated`
            );
          } else {
            const newId = await createProject(profile, data);
            setToast({ type: 'ok', text: `Project "${data.name}" created` });
            navigate('project_detail', newId);
          }
        }}
      />

      {selectedProject && (
        <TaskCreateModal
          open={taskCreateOpen}
          defaultStatus={taskDefaultStatus}
          members={members.filter((m) => m.projectId === selectedProject.id)}
          onClose={() => setTaskCreateOpen(false)}
          onSubmit={async (data) => {
            await runAction(
              async () => {
                await createTask(profile, selectedProject, data);
              },
              `Task "${data.title}" created`
            );
          }}
        />
      )}

      <TaskDetailModal
        task={selectedTask}
        project={selectedTaskProject}
        members={selectedTaskMembers}
        comments={comments}
        activityLogs={activityLogs}
        currentUserId={profile.uid}
        onClose={() => setSelectedTaskId(null)}
        onUpdateDetails={async (task, updates) => {
          if (!selectedTaskProject) return;
          await runAction(
            () => updateTaskDetails(profile, selectedTaskProject, task, updates),
            'Task updated'
          );
        }}
        onUpdateStatus={async (task, status) => {
          if (!selectedTaskProject) return;
          await runAction(
            () => updateTaskStatus(profile, selectedTaskProject, task, status),
            `Task moved to ${status}`
          );
        }}
        onDeleteTask={async (task) => {
          if (!selectedTaskProject) return;
          await runAction(() => deleteTask(profile, selectedTaskProject, task), 'Task deleted');
        }}
        onAddComment={async (task, body) => {
          if (!selectedTaskProject) return;
          await runAction(
            () => addComment(profile, selectedTaskProject, 'task', task, body),
            'Comment posted'
          );
        }}
        onAddAttachment={async (task, att) => {
          if (!selectedTaskProject) return;
          await runAction(
            () => addTaskAttachment(profile, selectedTaskProject, task, att),
            'Attachment added'
          );
        }}
        onRemoveAttachment={async (task, attId) => {
          if (!selectedTaskProject) return;
          await runAction(
            () => removeTaskAttachment(profile, selectedTaskProject, task, attId),
            'Attachment removed'
          );
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <WorkspaceShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
