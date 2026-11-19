import React, { useEffect, useState } from 'react';
import { CheckCircle2, Moon, ShieldCheck, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { BLUEPRINT_LIMITS } from '../types/orbit.ts';
import { Avatar } from './Avatar.tsx';

const COLOR_SWATCHES = ['#1E3A5F', '#2E6F5E', '#334155', '#155E75', '#374151', '#166534'];

export function ProfileView() {
  const { profile, firebaseUser, darkMode, toggleDarkMode, saveProfile } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [bio, setBio] = useState('');
  const [avatarColor, setAvatarColor] = useState('#1E3A5F');
  const [busy, setBusy] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setJobTitle(profile.jobTitle);
      setDepartment(profile.department);
      setBio(profile.bio);
      setAvatarColor(profile.avatarColor);
    }
  }, [profile]);

  if (!profile) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSavedNotice(null);
    setError(null);
    try {
      await saveProfile({ displayName, jobTitle, department, bio, avatarColor });
      setSavedNotice('Profile updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white font-display">Profile & Settings</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your identity, team presence, and appearance preferences.
        </p>
      </div>

      {/* Summary Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={displayName || profile.displayName} color={avatarColor} size="lg" />
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{profile.displayName}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{profile.email}</p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 mt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{firebaseUser?.emailVerified ? 'Verified Account' : 'Unverified'}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleDarkMode}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 self-start sm:self-center"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
        </button>
      </div>

      {/* Edit Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5"
      >
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
        {savedNotice && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="prof-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Display Name
            </label>
            <input
              id="prof-name"
              type="text"
              required
              maxLength={BLUEPRINT_LIMITS.MAX_DISPLAY_NAME_LENGTH}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="prof-email" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Email Address
            </label>
            <input
              id="prof-email"
              type="email"
              disabled
              value={profile.email}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 dark:text-slate-400"
            />
          </div>

          <div>
            <label htmlFor="prof-title" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Job Title
            </label>
            <input
              id="prof-title"
              type="text"
              maxLength={BLUEPRINT_LIMITS.MAX_JOB_TITLE_LENGTH}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Software Engineer"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="prof-dept" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Department
            </label>
            <input
              id="prof-dept"
              type="text"
              maxLength={BLUEPRINT_LIMITS.MAX_DEPARTMENT_LENGTH}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Product & Engineering"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label htmlFor="prof-bio" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Bio
          </label>
          <textarea
            id="prof-bio"
            rows={3}
            maxLength={BLUEPRINT_LIMITS.MAX_BIO_LENGTH}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Share your responsibilities and focus areas..."
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Avatar Accent Color</span>
          <div className="flex items-center gap-2.5">
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => setAvatarColor(swatch)}
                aria-label={`Select color ${swatch}`}
                className={`w-7 h-7 rounded-lg transition-transform ${
                  avatarColor === swatch ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-emerald-400 scale-105' : ''
                }`}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 text-sm font-medium text-white bg-[#0F172A] hover:bg-slate-800 dark:bg-emerald-800 dark:hover:bg-emerald-700 rounded-lg disabled:opacity-50"
          >
            {busy ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
