import React, { useEffect, useState } from 'react';
import { ExternalLink, History, MessageSquare, Paperclip, Send, Trash2, X } from 'lucide-react';
import { getProjectPermissions, getUserProjectRole, isTaskOverdue, toMillis } from '../lib/workspaceLogic.ts';
import {
  BLUEPRINT_LIMITS,
  type ActivityLog,
  type Comment,
  type Project,
  type ProjectMember,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from '../types/orbit.ts';
import { Avatar } from './Avatar.tsx';
import { TaskPriorityIndicator, TaskStatusIndicator } from './StatusLabels.tsx';

interface TaskDetailModalProps {
  task: Task | null;
  project: Project | null;
  members: ProjectMember[];
  comments: Comment[];
  activityLogs: ActivityLog[];
  currentUserId: string;
  onClose: () => void;
  onUpdateDetails: (
    task: Task,
    updates: {
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      dueDate: string;
      assigneeId: string;
      assigneeName: string;
    }
  ) => Promise<void>;
  onUpdateStatus: (task: Task, status: TaskStatus) => Promise<void>;
  onDeleteTask: (task: Task) => Promise<void>;
  onAddComment: (task: Task, body: string) => Promise<void>;
  onAddAttachment: (task: Task, att: { name: string; url: string; type: string }) => Promise<void>;
  onRemoveAttachment: (task: Task, attachmentId: string) => Promise<void>;
}

export function TaskDetailModal({
  task,
  project,
  members,
  comments,
  activityLogs,
  currentUserId,
  onClose,
  onUpdateDetails,
  onUpdateStatus,
  onDeleteTask,
  onAddComment,
  onAddAttachment,
  onRemoveAttachment,
}: TaskDetailModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('To Do');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [attName, setAttName] = useState('');
  const [attUrl, setAttUrl] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.dueDate);
      setAssigneeId(task.assigneeId);
      setCommentBody('');
      setAttName('');
      setAttUrl('');
      setConfirmDelete(false);
      setError(null);
    }
  }, [task]);

  if (!task || !project) return null;

  const role = getUserProjectRole(project, members, currentUserId);
  const perms = getProjectPermissions(role);
  const taskComments = comments
    .filter((c) => c.scope === 'task' && c.taskId === task.id)
    .sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
  const taskLogs = activityLogs
    .filter((l) => l.entityId === task.id)
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  const overdue = isTaskOverdue(task);
  const assignedMember = members.find((m) => m.userId === task.assigneeId);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    setBusy(true);
    setError(null);
    try {
      if (perms.canEditAllTaskFields) {
        const assignee = members.find((m) => m.userId === assigneeId);
        await onUpdateDetails(task, {
          title,
          description,
          status,
          priority,
          dueDate,
          assigneeId: assignee ? assignee.userId : '',
          assigneeName: assignee ? assignee.memberName : '',
        });
      } else if (perms.canUpdateTaskStatus) {
        await onUpdateStatus(task, status);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task.');
    } finally {
      setBusy(false);
    }
  }

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!task || !commentBody.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onAddComment(task, commentBody);
      setCommentBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddAttachment(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    setBusy(true);
    setError(null);
    try {
      await onAddAttachment(task, { name: attName, url: attUrl, type: 'link' });
      setAttName('');
      setAttUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add attachment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col overflow-hidden shadow-2xl">
        {/* Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="truncate">{project.name}</span>
              <span aria-hidden="true">/</span>
              <span className="font-mono">{task.id}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <TaskStatusIndicator status={task.status} />
              <TaskPriorityIndicator priority={task.priority} />
              {overdue && (
                <span className="text-xs font-medium text-red-700 dark:text-red-400">Overdue</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {perms.canDeleteTask && !confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete task"
                className="p-2 rounded-lg text-slate-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close task panel"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {confirmDelete && (
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 flex items-center justify-between gap-4">
              <p className="text-xs font-medium text-red-800 dark:text-red-300">
                Permanently delete this task? This action cannot be undone.
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
                      await onDeleteTask(task);
                      onClose();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to delete task.');
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded-md"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          )}

          {/* Task Form */}
          <form onSubmit={handleSave} className="space-y-4">
            {!perms.canEditAllTaskFields && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                As a Project Member, you can update task status, add attachments, and post comments. Task details and
                assignment are managed by the Project Owner.
              </p>
            )}

            <div>
              <label htmlFor="detail-title" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Title
              </label>
              <input
                id="detail-title"
                type="text"
                disabled={!perms.canEditAllTaskFields}
                maxLength={BLUEPRINT_LIMITS.MAX_TASK_TITLE_LENGTH}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm font-medium bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:opacity-65"
              />
            </div>

            <div>
              <label htmlFor="detail-desc" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Description
              </label>
              <textarea
                id="detail-desc"
                rows={4}
                disabled={!perms.canEditAllTaskFields}
                maxLength={BLUEPRINT_LIMITS.MAX_TASK_DESC_LENGTH}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:opacity-65"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label htmlFor="detail-status" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Status
                </label>
                <select
                  id="detail-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full px-2.5 py-2 text-xs font-medium bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label htmlFor="detail-priority" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Priority
                </label>
                <select
                  id="detail-priority"
                  disabled={!perms.canEditAllTaskFields}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-2.5 py-2 text-xs font-medium bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:opacity-65"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div>
                <label htmlFor="detail-due" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Due Date
                </label>
                <input
                  id="detail-due"
                  type="date"
                  disabled={!perms.canEditAllTaskFields}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:opacity-65"
                />
              </div>

              <div>
                <label htmlFor="detail-assignee" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Assignee
                </label>
                <select
                  id="detail-assignee"
                  disabled={!perms.canEditAllTaskFields}
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-medium bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:opacity-65"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.memberName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {assignedMember && (
              <div className="flex items-center gap-2.5 pt-1 text-xs text-slate-600 dark:text-slate-400">
                <Avatar name={assignedMember.memberName} color={assignedMember.avatarColor} size="sm" />
                <span>
                  Assigned to <strong className="text-slate-900 dark:text-slate-100">{assignedMember.memberName}</strong>
                  {assignedMember.memberTitle ? ` · ${assignedMember.memberTitle}` : ''}
                </span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 text-xs font-medium text-white bg-[#0F172A] hover:bg-slate-800 dark:bg-emerald-800 dark:hover:bg-emerald-700 rounded-lg disabled:opacity-50"
              >
                {busy ? 'Saving...' : perms.canEditAllTaskFields ? 'Save Task Changes' : 'Update Status'}
              </button>
            </div>
          </form>

          {/* Task Attachments */}
          <section className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Paperclip className="w-4 h-4 text-slate-400" />
              <span>Attachments ({task.attachments.length}/10)</span>
            </div>

            {task.attachments.length > 0 && (
              <div className="space-y-2">
                {task.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                  >
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-slate-800 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 font-medium truncate"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{att.name}</span>
                    </a>
                    <div className="flex items-center gap-3 shrink-0 text-slate-400">
                      <span>{att.addedBy}</span>
                      <button
                        type="button"
                        onClick={() => void onRemoveAttachment(task, att.id)}
                        aria-label={`Remove attachment ${att.name}`}
                        className="text-slate-400 hover:text-red-700 dark:hover:text-red-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddAttachment} className="grid sm:grid-cols-5 gap-2">
              <input
                type="text"
                value={attName}
                onChange={(e) => setAttName(e.target.value)}
                placeholder="Resource label (e.g. API Spec)"
                maxLength={120}
                className="sm:col-span-2 px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
              <input
                type="url"
                value={attUrl}
                onChange={(e) => setAttUrl(e.target.value)}
                placeholder="https://docs.example.com/..."
                maxLength={500}
                className="sm:col-span-2 px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={busy || !attName.trim() || !attUrl.trim()}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 whitespace-nowrap"
              >
                Add Link
              </button>
            </form>
          </section>

          {/* Task Comments */}
          <section className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span>Comments ({taskComments.length})</span>
            </div>

            <form onSubmit={handlePostComment} className="flex gap-2">
              <input
                type="text"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                maxLength={BLUEPRINT_LIMITS.MAX_COMMENT_BODY_LENGTH}
                placeholder="Write a comment or progress update..."
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={busy || !commentBody.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0F172A] hover:bg-slate-800 dark:bg-emerald-800 dark:hover:bg-emerald-700 rounded-lg disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post</span>
              </button>
            </form>

            {taskComments.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No comments on this task yet.</p>
            ) : (
              <div className="space-y-3">
                {taskComments.map((cmt) => {
                  const timeMs = toMillis(cmt.createdAt);
                  return (
                    <div
                      key={cmt.id}
                      className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{cmt.authorName}</span>
                        <span className="font-mono tabular-nums text-slate-400">
                          {timeMs ? new Date(timeMs).toLocaleString() : 'Just now'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{cmt.body}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Task Activity History */}
          <section className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <History className="w-4 h-4 text-slate-400" />
              <span>Task History</span>
            </div>
            {taskLogs.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No recorded history for this task yet.</p>
            ) : (
              <div className="space-y-2">
                {taskLogs.map((log) => {
                  const ms = toMillis(log.createdAt);
                  return (
                    <div key={log.id} className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <span>{log.details}</span>
                      <span className="font-mono tabular-nums text-slate-400 shrink-0">
                        {ms ? new Date(ms).toLocaleString() : 'Just now'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
