import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getTodayIsoDate } from '../lib/workspaceLogic.ts';
import { validateTaskInput } from '../lib/validation.ts';
import {
  BLUEPRINT_LIMITS,
  type ProjectMember,
  type TaskPriority,
  type TaskStatus,
} from '../types/orbit.ts';

interface TaskCreateModalProps {
  open: boolean;
  defaultStatus?: TaskStatus;
  members: ProjectMember[];
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: string;
    assigneeId: string;
    assigneeName: string;
  }) => Promise<void>;
}

export function TaskCreateModal({
  open,
  defaultStatus = 'To Do',
  members,
  onClose,
  onSubmit,
}: TaskCreateModalProps) {
  const defaultDue = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return getTodayIsoDate(d);
  })();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [dueDate, setDueDate] = useState(defaultDue);
  const [assigneeId, setAssigneeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setStatus(defaultStatus);
      setPriority('Medium');
      setDueDate(defaultDue);
      setAssigneeId('');
      setError(null);
    }
  }, [open, defaultStatus, defaultDue]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const check = validateTaskInput({ title, description, status, priority, dueDate });
    if (!check.valid) {
      setError(check.error || 'Invalid task input.');
      return;
    }

    const assignedMember = members.find((m) => m.userId === assigneeId);
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        title,
        description,
        status,
        priority,
        dueDate,
        assigneeId: assignedMember ? assignedMember.userId : '',
        assigneeName: assignedMember ? assignedMember.memberName : '',
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white font-display">Create Task</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="task-title" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Task Title
            </label>
            <input
              id="task-title"
              type="text"
              required
              maxLength={BLUEPRINT_LIMITS.MAX_TASK_TITLE_LENGTH}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Implement database backup policy"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
            />
          </div>

          <div>
            <label htmlFor="task-desc" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              id="task-desc"
              rows={3}
              maxLength={BLUEPRINT_LIMITS.MAX_TASK_DESC_LENGTH}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Acceptance criteria, technical notes, and scope..."
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-status" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Status
              </label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label htmlFor="task-priority" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-due" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Due Date
              </label>
              <input
                id="task-due"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="task-assignee" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Assign To
              </label>
              <select
                id="task-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.memberName} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0F172A] hover:bg-slate-800 dark:bg-emerald-800 dark:hover:bg-emerald-700 rounded-lg disabled:opacity-50"
            >
              {busy ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
