import React, { useState } from 'react';
import { Check, Eye, EyeOff, Lock, Mail, RefreshCw, ShieldCheck, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { validatePasswordStrength } from '../lib/validation.ts';

function formatAuthError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes('auth/operation-not-allowed') || raw.includes('auth/configuration-not-found')) {
    return 'Email/Password sign-in is not enabled in the Firebase Console yet. Enable Email/Password under Authentication -> Sign-in method in Firebase Console, or sign in instantly with Google below.';
  }
  if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password') || raw.includes('auth/user-not-found')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (raw.includes('auth/email-already-in-use')) {
    return 'An account with this email already exists. Switch to Sign In instead.';
  }
  if (raw.includes('auth/popup-closed-by-user')) {
    return 'Google sign-in popup was closed before completion.';
  }
  return raw;
}

export function AuthView() {
  const {
    firebaseUser,
    isVerified,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    resendVerificationEmail,
    refreshVerificationStatus,
    signOut,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const strength = validatePasswordStrength(password);

  if (firebaseUser && !isVerified) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-slate-900 dark:bg-emerald-900/40 text-white dark:text-emerald-300 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Verify your email</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Required for workspace security</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
            A verification link was sent to <span className="font-medium text-slate-900 dark:text-slate-100">{firebaseUser.email}</span>.
            Open the link in your inbox, then confirm below to enter Orbit Workspace.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          {notice && (
            <div className="mb-4 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-800 dark:text-emerald-300">
              {notice}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                setNotice(null);
                try {
                  const verified = await refreshVerificationStatus();
                  if (!verified) {
                    setError('Email is not verified yet. Please click the verification link in your inbox first.');
                  }
                } catch (err) {
                  setError(formatAuthError(err));
                } finally {
                  setBusy(false);
                }
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-800 dark:hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
              <span>I have verified my email</span>
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                setNotice(null);
                try {
                  await resendVerificationEmail();
                  setNotice('Verification email resent. Please check your inbox and spam folder.');
                } catch (err) {
                  setError(formatAuthError(err));
                } finally {
                  setBusy(false);
                }
              }}
              className="w-full px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Resend verification email
            </button>

            <button
              type="button"
              onClick={() => void signOut()}
              className="w-full px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Sign out and use another account
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === 'register') {
      if (!displayName.trim()) {
        setError('Full name is required.');
        return;
      }
      if (!strength.valid) {
        setError(`Password must include: ${strength.errors.join(', ')}.`);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await registerWithEmail(displayName, email, password);
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50 dark:bg-slate-950">
      {/* Left Architectural Navy Panel */}
      <div className="hidden lg:flex flex-col justify-between bg-[#0F172A] text-white p-12 border-r border-slate-800">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="26" height="26" rx="6" stroke="currentColor" strokeWidth="2" />
            <circle cx="16" cy="16" r="6" stroke="white" strokeWidth="2" />
            <circle cx="22" cy="10" r="2" fill="currentColor" />
          </svg>
          <span className="text-xl font-semibold tracking-tight font-display">Orbit Workspace</span>
        </div>

        <div className="max-w-lg space-y-6">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-balance">
            Structured execution for engineering and product teams.
          </h1>
          <p className="text-base text-slate-300 leading-relaxed">
            Plan multi-stage projects, coordinate owners and contributors across Kanban boards, and track real-time
            deliverables with database-enforced access control.
          </p>

          <div className="pt-6 border-t border-slate-800 grid grid-cols-3 gap-6 text-sm">
            <div>
              <p className="font-semibold text-white">Role Security</p>
              <p className="text-xs text-slate-400 mt-1">Owner and Member permissions verified server-side.</p>
            </div>
            <div>
              <p className="font-semibold text-white">Live Kanban</p>
              <p className="text-xs text-slate-400 mt-1">Drag-and-drop task boards persisted in Firestore.</p>
            </div>
            <div>
              <p className="font-semibold text-white">Audit Trail</p>
              <p className="text-xs text-slate-400 mt-1">Event-driven notifications and activity logs.</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">Orbit Workspace · Project Management Platform</p>
      </div>

      {/* Right Auth Form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8">
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <svg className="w-7 h-7 text-emerald-700 dark:text-emerald-400" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="26" height="26" rx="6" stroke="currentColor" strokeWidth="2" />
              <circle cx="16" cy="16" r="6" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="text-lg font-semibold text-slate-900 dark:text-white font-display">Orbit Workspace</span>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
            {mode === 'login' ? 'Sign in to your workspace' : 'Create your Orbit account'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {mode === 'login'
              ? 'Access your projects, tasks, and team discussions.'
              : 'Set up a verified account to collaborate with your team.'}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300 leading-relaxed">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={handleGoogle}
            className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-slate-900 px-3 text-slate-400">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-name"
                    type="text"
                    required
                    maxLength={100}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-9 pr-10 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Password requirements</span>
                    <span className="font-mono tabular-nums text-slate-500">{strength.score}/5</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {[
                      { ok: strength.checks.minLength, label: '8+ characters' },
                      { ok: strength.checks.hasUppercase, label: 'Uppercase letter' },
                      { ok: strength.checks.hasLowercase, label: 'Lowercase letter' },
                      { ok: strength.checks.hasNumber, label: 'Number' },
                      { ok: strength.checks.hasSpecial, label: 'Special character' },
                    ].map((rule) => (
                      <div
                        key={rule.label}
                        className={`flex items-center gap-1.5 ${
                          rule.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {rule.ok ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                        <span>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="auth-confirm-password"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="auth-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 dark:text-white"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#0F172A] hover:bg-slate-800 dark:bg-emerald-800 dark:hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {busy ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
