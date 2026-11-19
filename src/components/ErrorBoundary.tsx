import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = error.message;
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string; path?: string };
      if (parsed && parsed.error) {
        readable = `${parsed.error}${parsed.path ? ` (${parsed.operationType ?? 'op'} on ${parsed.path})` : ''}`;
      }
    } catch {
      // keep raw message
    }
    return { hasError: true, message: readable };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8">
            <div className="flex items-center gap-3 text-red-700 dark:text-red-400 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h1 className="text-lg font-semibold">Workspace Error</h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6 break-words">
              {this.state.message || 'An unexpected error occurred while communicating with Orbit Workspace.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 dark:bg-emerald-800 rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Workspace</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
