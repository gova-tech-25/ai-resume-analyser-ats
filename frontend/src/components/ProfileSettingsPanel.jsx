import React, { useState, useEffect } from 'react';
import { useRole } from '../context/RoleContext';
import { Settings, AlertTriangle, Check, RefreshCw } from 'lucide-react';

export default function ProfileSettingsPanel() {
  const { activeUser, updateProfile } = useRole();

  const [activeSettingsTab, setActiveSettingsTab] = useState('details');
  const [profileForm, setProfileForm] = useState({
    username: activeUser?.username || '',
    email: activeUser?.email || '',
    goal: activeUser?.goal || '',
    password: '',
    confirmPassword: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  useEffect(() => {
    if (activeUser) {
      setProfileForm({
        username: activeUser.username,
        email: activeUser.email,
        goal: activeUser.goal || '',
        password: '',
        confirmPassword: ''
      });
      setProfileError('');
      setProfileSuccess('');
    }
  }, [activeUser]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    const trimmedUsername = profileForm.username.trim();
    const trimmedEmail = profileForm.email.trim();
    const trimmedGoal = profileForm.goal.trim();

    if (!trimmedUsername || !trimmedEmail) {
      setProfileError('Username and Email are required.');
      return;
    }

    if (trimmedUsername.length < 3) {
      setProfileError('Username must be at least 3 characters long.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setProfileError('Please enter a valid email address.');
      return;
    }

    if (profileForm.password) {
      if (profileForm.password.length < 6) {
        setProfileError('Password must be at least 6 characters long.');
        return;
      }
      if (profileForm.password !== profileForm.confirmPassword) {
        setProfileError('Passwords do not match.');
        return;
      }
    }

    try {
      setProfileLoading(true);
      const res = await updateProfile({
        username: trimmedUsername,
        email: trimmedEmail,
        goal: trimmedGoal,
        password: profileForm.password || undefined
      });
      setProfileSuccess(res?.message || 'Profile updated successfully.');
      setProfileForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err) {
      setProfileError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-3xl flex flex-col gap-4 w-full max-w-lg">
      <h2 className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
        <Settings className="w-4 h-4 text-indigo-500" />
        Profile Settings
      </h2>

      {profileError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{profileError}</span>
        </div>
      )}

      {profileSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{profileSuccess}</span>
        </div>
      )}

      <div className="flex border border-slate-200/50 dark:border-slate-800/50 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl p-1">
        <button
          type="button"
          onClick={() => { setActiveSettingsTab('details'); setProfileError(''); }}
          className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
            activeSettingsTab === 'details'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          Personal Details
        </button>
        <button
          type="button"
          onClick={() => { setActiveSettingsTab('goal'); setProfileError(''); }}
          className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
            activeSettingsTab === 'goal'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          Goal
        </button>
        <button
          type="button"
          onClick={() => { setActiveSettingsTab('password'); setProfileError(''); }}
          className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
            activeSettingsTab === 'password'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          Password
        </button>
      </div>

      <form onSubmit={handleProfileUpdate} className="flex flex-col gap-4 text-xs">
        {activeSettingsTab === 'details' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-slate-500 dark:text-slate-400">Username</label>
              <input
                type="text"
                required
                value={profileForm.username}
                onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                placeholder="Username"
                className="px-3 py-2 rounded-xl border border-slate-200 bg-transparent text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-800 text-slate-700 dark:text-slate-200"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-slate-500 dark:text-slate-400">Email Address</label>
              <input
                type="email"
                required
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                placeholder="Email Address"
                className="px-3 py-2 rounded-xl border border-slate-200 bg-transparent text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-800 text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
        )}

        {activeSettingsTab === 'goal' && (
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-slate-500 dark:text-slate-400">Professional/Career Goal</label>
            <textarea
              rows={4}
              value={profileForm.goal}
              onChange={(e) => setProfileForm({ ...profileForm, goal: e.target.value })}
              placeholder="Describe your career goals or target match score (e.g. Secure a software developer job with >80% ATS score within 3 months)"
              className="px-3 py-2 rounded-xl border border-slate-200 bg-transparent text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-800 text-slate-700 dark:text-slate-200 leading-normal"
            />
          </div>
        )}

        {activeSettingsTab === 'password' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-slate-500 dark:text-slate-400">New Password</label>
              <input
                type="password"
                value={profileForm.password}
                onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                placeholder="Leave blank to keep current password"
                className="px-3 py-2 rounded-xl border border-slate-200 bg-transparent text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-800 text-slate-700 dark:text-slate-200"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-slate-500 dark:text-slate-400">Confirm New Password</label>
              <input
                type="password"
                value={profileForm.confirmPassword}
                onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                placeholder="Leave blank to keep current password"
                className="px-3 py-2 rounded-xl border border-slate-200 bg-transparent text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-800 text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={profileLoading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5 text-xs font-bold"
          >
            {profileLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
