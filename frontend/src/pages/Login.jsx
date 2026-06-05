import React, { useState, useEffect } from 'react';
import { useRole } from '../context/RoleContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Sparkles, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login, register, isAuthenticated } = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [isLoginTab, setIsLoginTab] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'student'
  });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!loginForm.email || !loginForm.password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setLoading(true);
      await login(loginForm.email, loginForm.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!registerForm.username || !registerForm.email || !registerForm.password || !registerForm.role) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setLoading(true);
      await register(registerForm.username, registerForm.email, registerForm.password, registerForm.role);
      // Auto switch to login tab on success
      setIsLoginTab(true);
      setLoginForm({ email: registerForm.email, password: '' });
      alert('Registration successful! You can now log in.');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Try again.');
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
            Welcome to ATSify
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Privacy-first AI-Powered Resume Scoring & ATS Matcher
          </p>
        </div>

        {/* Auth Box Card */}
        <div className="glass-panel border border-slate-800/60 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-md">
          {/* Tab Selector */}
          <div className="flex border-b border-slate-800/60 bg-slate-950/20">
            <button
              onClick={() => { setIsLoginTab(true); setError(''); }}
              className={`flex-1 py-4 text-sm font-bold transition-all duration-300 relative ${
                isLoginTab ? 'text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Sign In
              {isLoginTab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
              )}
            </button>
            <button
              onClick={() => { setIsLoginTab(false); setError(''); }}
              className={`flex-1 py-4 text-sm font-bold transition-all duration-300 relative ${
                !isLoginTab ? 'text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Create Account
              {!isLoginTab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
              )}
            </button>
          </div>

          <div className="p-8">
            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-3 mb-6 animate-shake">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isLoginTab ? (
              /* --- SIGN IN FORM --- */
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      placeholder="name@example.com"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-800/80 bg-slate-950/40 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500/50 transition-all text-white placeholder-slate-600"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-800/80 bg-slate-950/40 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500/50 transition-all text-white placeholder-slate-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] transition-all font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            ) : (
              /* --- SIGN UP FORM --- */
              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400">Username</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                      placeholder="Jane Doe"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-800/80 bg-slate-950/40 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500/50 transition-all text-white placeholder-slate-600"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      placeholder="jane@example.com"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-800/80 bg-slate-950/40 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500/50 transition-all text-white placeholder-slate-600"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-800/80 bg-slate-950/40 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500/50 transition-all text-white placeholder-slate-600"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400">Join As</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select
                      value={registerForm.role}
                      onChange={(e) => setRegisterForm({ ...registerForm, role: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-800/80 bg-slate-950/40 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500/50 transition-all text-white appearance-none select-custom"
                    >
                      <option value="student" className="bg-slate-900 text-white">Student / Candidate</option>
                      <option value="recruiter" className="bg-slate-900 text-white">Recruiter / Employer</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] transition-all font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? 'Creating Account...' : 'Register'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Demo profiles hint */}
        <div className="text-center mt-6 text-xs text-slate-500">
          💡 Try default profiles: <code className="text-slate-400">alex.student@example.com</code> or <code className="text-slate-400">sarah.recruiter@example.com</code> with password <code className="text-slate-400">password123</code>
        </div>
      </div>
    </div>
  );
}
