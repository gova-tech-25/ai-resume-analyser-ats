import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { Lock, Sparkles, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
  const { resetPassword } = useRole();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Password reset token is missing. Please check your email link.');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const res = await resetPassword(token, password);
      setSuccess(res?.message || 'Password has been reset successfully.');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-slate-950 text-white p-6 relative overflow-hidden">
      {/* Background ambient animations */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none animate-pulse duration-[8s]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none animate-pulse duration-[6s]" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo Header */}
        <div className="flex flex-col items-center mb-8 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-3 border border-indigo-400/25">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            Reset Your Password
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Create a secure new password for your ATSify account
          </p>
        </div>

        {/* Form Box Card */}
        <div className="glass-panel border border-slate-800/60 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-md p-8">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-3 mb-6 animate-shake">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex flex-col gap-2 mb-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-400" />
                <span className="font-bold">{success}</span>
              </div>
              <p className="text-slate-400 text-[11px] pl-8">Redirecting you to the sign in page in 3 seconds...</p>
            </div>
          )}

          {!token ? (
            <div className="text-center py-4">
              <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
              <p className="text-sm text-slate-300">Invalid reset request. The token parameter is missing from the URL.</p>
              <button
                onClick={() => navigate('/login')}
                className="mt-6 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-800/80 bg-slate-950/40 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500/50 transition-all text-white placeholder-slate-600"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-800/80 bg-slate-950/40 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500/50 transition-all text-white placeholder-slate-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !!success}
                className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] transition-all font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
