import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getTodayIsoDate } from '../lib/workspaceLogic.ts';
import { validateProjectInput } from '../lib/validation.ts';
import { BLUEPRINT_LIMITS, type Project, type ProjectStatus } from '../types/orbit.ts';

interface ProjectModalProps {
  open: boolean;
  initialProject?: Project | null;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    status: ProjectStatus;
    startDate: string;
    endDate: string;
  }) => Promise<void>;
}

export function ProjectModal({ open, initialProject, onClose, onSubmit }: ProjectModalProps) {
  const today = getTodayIsoDate();
  const nextMonth = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return getTodayIsoDate(d);
  })();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('Active');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(nextMonth);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialProject) {
      setName(initialProject.name);
      setDescription(initialProject.description);
      setStatus(initialProject.status);
      setStartDate(initialProject.startDate);
      setEndDate(initialProject.endDate);
    } else {
      setName('');
      setDescription('');
      setStatus('Active');
      setStartDate(today);
      setEndDate(nextMonth);
    }
    setError(null);
  }, [initialProject, open, today, nextMonth]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const check = validateProjectInput({ name, description, status, startDate, endDate });
    if (!check.valid) {
      setError(check.error || 'Invalid project details.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ name, description, status, startDate, endDate });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white font-display">
            {initialProject ? 'Edit Project' : 'Create New Project'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
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
            <label htmlFor="proj-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Project Name
            </label>
            <input
              id="proj-name"
              type="text"
              required
              maxLength={BLUEPRINT_LIMITS.MAX_PROJECT_NAME_LENGTH}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Q4 Infrastructure Migration"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700"
            />
          </div>

          <div>
            <label htmlFor="proj-desc" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              id="proj-desc"
              rows={3}
              maxLength={BLUEPRINT_LIMITS.MAX_PROJECT_DESC_LENGTH}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline project objectives, milestones, and deliverables..."
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="proj-status" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Status
              </label>
              <select
                id="proj-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
              >
                <option value="Active">Active</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label htmlFor="proj-start" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Start Date
              </label>
              <input
                id="proj-start"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
              />
            </div>

            <div>
              <label htmlFor="proj-end" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                End Date
              </label>
              <input
                id="proj-end"
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
              />
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
              {busy ? 'Saving...' : initialProject ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
