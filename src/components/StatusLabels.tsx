import { AlertCircle, CheckCircle2, Circle, Clock, Flag, PauseCircle } from 'lucide-react';
import type { ProjectStatus, TaskPriority, TaskStatus } from '../types/orbit.ts';

export function TaskStatusIndicator({ status }: { status: TaskStatus }) {
  if (status === 'Completed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Completed</span>
      </span>
    );
  }
  if (status === 'In Progress') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>In Progress</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
      <Circle className="w-3.5 h-3.5 shrink-0" />
      <span>To Do</span>
    </span>
  );
}

export function TaskPriorityIndicator({ priority }: { priority: TaskPriority }) {
  if (priority === 'High') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400 whitespace-nowrap">
        <Flag className="w-3.5 h-3.5 shrink-0" />
        <span>High</span>
      </span>
    );
  }
  if (priority === 'Medium') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap">
        <Flag className="w-3.5 h-3.5 shrink-0" />
        <span>Medium</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
      <Flag className="w-3.5 h-3.5 shrink-0" />
      <span>Low</span>
    </span>
  );
}

export function ProjectStatusIndicator({ status }: { status: ProjectStatus }) {
  if (status === 'Completed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Completed</span>
      </span>
    );
  }
  if (status === 'On Hold') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap">
        <PauseCircle className="w-3.5 h-3.5 shrink-0" />
        <span>On Hold</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
      <span>Active</span>
    </span>
  );
}
