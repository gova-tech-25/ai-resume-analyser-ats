import React, { useState, useEffect } from 'react';
import { useRole } from '../context/RoleContext';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import ProfileSettingsPanel from '../components/ProfileSettingsPanel';
import { 
  Users, Shield, FileText, Trash2, Edit2, 
  BarChart2, Server, Check, Activity, AlertTriangle, RefreshCw, PlusCircle, Settings
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, BarChart, Bar, CartesianGrid 
} from 'recharts';

export default function AdminDashboard() {
  const { activeUser, getAuthHeaders, refreshProfiles, onlineUsers = [] } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSubTab = searchParams.get('tab') || 'stats';
  
  const setActiveSubTab = (newTab) => {
    setSearchParams({ tab: newTab });
  };

  // Admin states
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [resumesLoading, setResumesLoading] = useState(false);
  
  // Action state
  const [deletingId, setDeletingId] = useState(null);

  // User Modal & Form State
  const [showUserModal, setShowUserModal] = useState(null); // 'create', 'edit' or null
  const [userForm, setUserForm] = useState({ username: '', email: '', role: 'student' });
  const [editingUserId, setEditingUserId] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    if (activeUser) {
      fetchAnalytics();
      fetchUsers();
    }
  }, [activeUser, activeSubTab]);

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const res = await axios.get('/api/admin/analytics', { headers: getAuthHeaders() });
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to fetch admin analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await axios.get('/api/admin/users', { headers: getAuthHeaders() });
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch admin users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Warning: Deleting this user will also delete all of their uploaded resumes, job applications, and notifications. This action is irreversible. Proceed?')) {
      return;
    }
    try {
      setDeletingId(userId);
      await axios.delete(`/api/admin/users/${userId}`, { headers: getAuthHeaders() });
      setUsers(prev => prev.filter(u => u._id !== userId));
      fetchAnalytics(); // update counts
      refreshProfiles(); // update context dropdown
      alert('User and all associated data deleted.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUserFormSubmit = async (e) => {
    e.preventDefault();
    const trimmedUsername = userForm.username.trim();
    const trimmedEmail = userForm.email.trim();

    if (!trimmedUsername || !trimmedEmail || !userForm.role) {
      alert('Please fill out all fields.');
      return;
    }

    if (trimmedUsername.length < 3) {
      alert('Username must be at least 3 characters long.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      alert('Please enter a valid email address.');
      return;
    }

    try {
      setFormSubmitting(true);
      const reqPayload = {
        username: trimmedUsername,
        email: trimmedEmail,
        role: userForm.role
      };

      if (showUserModal === 'create') {
        const res = await axios.post('/api/admin/users', reqPayload, { headers: getAuthHeaders() });
        setUsers(prev => [res.data.user, ...prev]);
        alert('User created successfully.');
      } else if (showUserModal === 'edit' && editingUserId) {
        const res = await axios.put(`/api/admin/users/${editingUserId}`, reqPayload, { headers: getAuthHeaders() });
        setUsers(prev => prev.map(u => u._id === editingUserId ? res.data.user : u));
        alert('User updated successfully.');
      }
      setShowUserModal(null);
      setUserForm({ username: '', email: '', role: 'student' });
      setEditingUserId(null);
      fetchAnalytics();
      refreshProfiles();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to submit form.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Recharts Helper
  const getAreaChartData = () => {
    if (!analytics?.systemActivity) return [];
    return analytics.systemActivity;
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto py-4">
      {/* Sub Tabs Toggle */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('stats')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'stats'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <BarChart2 className="w-4 h-4" /> Platform Analytics & Metrics
        </button>
        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'users'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <Users className="w-4 h-4" /> Manage User Accounts
        </button>
        <button
          onClick={() => setActiveSubTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'settings'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" /> Settings
        </button>
      </div>

      {/* RENDER VIEW: SYSTEM ANALYTICS */}
      {activeSubTab === 'stats' && (
        <div className="flex flex-col gap-6">
          {/* Active stats counts cards */}
          {analyticsLoading ? (
            <div className="text-center py-6 text-xs text-slate-400">Loading statistics...</div>
          ) : analytics ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="glass-panel p-6 rounded-3xl text-center">
                <span className="text-3xl font-extrabold text-indigo-500">{analytics.counts.totalUsers}</span>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Total Users</p>
                <div className="text-[9px] text-slate-400 mt-1">
                  S: {analytics.counts.studentsCount} | R: {analytics.counts.recruitersCount} | A: {analytics.counts.adminsCount}
                </div>
              </div>
              <div className="glass-panel p-6 rounded-3xl text-center">
                <span className="text-3xl font-extrabold text-cyan-500">{analytics.counts.totalResumes}</span>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Resumes Uploaded</p>
              </div>
              <div className="glass-panel p-6 rounded-3xl text-center">
                <span className="text-3xl font-extrabold text-emerald-500">{analytics.counts.totalApplications}</span>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Job Applications</p>
              </div>
              <div className="glass-panel p-6 rounded-3xl text-center">
                <span className="text-3xl font-extrabold text-amber-500">{analytics.counts.avgAtsScore}%</span>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Average ATS Score</p>
              </div>
              <div className="glass-panel p-6 rounded-3xl text-center relative overflow-hidden border border-emerald-500/20">
                <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-3xl font-extrabold text-emerald-500">{onlineUsers.length}</span>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Online Now</p>
                <div className="text-[9px] text-slate-400 mt-1">
                  Active WebSockets
                </div>
              </div>
            </div>
          ) : null}

          {/* Activity graphs */}
          <div className="grid md:grid-cols-4 gap-6">
            {/* User Registration Growth */}
            <div className="glass-panel p-6 rounded-3xl md:col-span-2 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold">Platform Activity Trend</h2>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 px-2.5 py-0.5 rounded font-bold">Live Monitor</span>
              </div>
              <div className="h-64 w-full">
                {analyticsLoading ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading chart...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getAreaChartData()}>
                      <defs>
                        <linearGradient id="colorResumes" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8' }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="resumes" stroke="#6366f1" fillOpacity={1} fill="url(#colorResumes)" />
                      <Area type="monotone" dataKey="applications" stroke="#06b6d4" fillOpacity={1} fill="url(#colorApps)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* AI Service Stats monitoring */}
            <div className="glass-panel p-6 rounded-3xl flex flex-col gap-4 justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-sm font-bold">AI Microservice Health</h3>
                </div>
                <div className="flex flex-col gap-2.5 mt-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">NLP Parser engine:</span>
                    <span className="font-bold text-emerald-500 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> spaCy (v3.7)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Sentence Transformer:</span>
                    <span className="font-bold text-emerald-500">all-MiniLM-L6-v2</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Database Engine:</span>
                    <span className="font-bold text-emerald-500">MongoDB (v7.0)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Parser Requests:</span>
                    <span className="font-bold text-indigo-500">{analytics?.counts?.totalResumes || 0} calls</span>
                  </div>
                </div>
              </div>
              <div className="p-3.5 bg-indigo-50/50 rounded-2xl dark:bg-indigo-950/20 text-[10px] text-slate-500 leading-normal flex items-start gap-1.5 mt-4">
                <Activity className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                The Python microservice handles Heavy Sentence Embeddings, and the Express backend is isolated for API IO and file streams.
              </div>
            </div>

            {/* Live Online Users List Widget */}
            <div className="glass-panel p-6 rounded-3xl flex flex-col gap-4 justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-sm font-bold">Live Online Users</h3>
                </div>
                <div className="flex flex-col gap-2.5 mt-2 overflow-y-auto max-h-[160px] pr-1">
                  {onlineUsers.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">No other users online.</div>
                  ) : (
                    onlineUsers.map((user, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <img 
                            src={user.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.username)}`} 
                            alt={user.username} 
                            className="w-6 h-6 rounded-full bg-slate-800 shrink-0" 
                          />
                          <div className="flex flex-col truncate max-w-[100px]">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">{user.username}</span>
                            <span className="text-[8px] text-slate-400 uppercase font-semibold">{user.role}</span>
                          </div>
                        </div>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="p-3.5 bg-emerald-50/50 rounded-2xl dark:bg-emerald-950/20 text-[10px] text-slate-500 leading-normal flex items-start gap-1.5 mt-4">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                Live status synchronizes instantly across open browser sessions via WebSockets.
              </div>
            </div>

          </div>
        </div>
      )}

      {/* RENDER VIEW: USER MANAGEMENT DIRECTORY */}
      {activeSubTab === 'users' && (
        <div className="glass-panel p-6 rounded-3xl flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Registered Platform Users</h2>
              <button
                onClick={() => {
                  setUserForm({ username: '', email: '', role: 'student' });
                  setEditingUserId(null);
                  setShowUserModal('create');
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg shadow-md transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Add User
              </button>
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded">
              {users.length} Records
            </span>
          </div>

          {usersLoading ? (
            <div className="text-center py-12 text-xs text-slate-400">Loading user directories...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">No database profiles.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                    <th className="py-3 px-4">User Details</th>
                    <th className="py-3 px-4">System ID</th>
                    <th className="py-3 px-4">Active Role</th>
                    <th className="py-3 px-4">Registration Date</th>
                    <th className="py-3 px-4 text-right">Danger Zone</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img src={user.profileImage} alt={user.username} className="w-7 h-7 rounded-full border" />
                          <div>
                            <div className="font-semibold text-slate-700 dark:text-slate-200">{user.username}</div>
                            <div className="text-[10px] text-slate-400 leading-none mt-0.5">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[10px]">{user._id}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-450' 
                            : user.role === 'recruiter' 
                              ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-450' 
                              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right flex gap-1 justify-end items-center">
                        <button
                          onClick={() => {
                            setUserForm({ username: user.username, email: user.email, role: user.role });
                            setEditingUserId(user._id);
                            setShowUserModal('edit');
                          }}
                          className="p-1.5 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition-colors inline-flex items-center"
                          title="Edit user details"
                        >
                          <Edit2 className="w-4.5 h-4.5" />
                        </button>
                        {user._id === activeUser?._id ? (
                          <span className="text-[10px] font-bold text-slate-400 mr-2">Self</span>
                        ) : (
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            disabled={deletingId === user._id}
                            className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                            title="Delete user account and related audits"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE OR EDIT USER */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl w-full max-w-md flex flex-col gap-4 animate-in zoom-in-95 duration-150 shadow-xl">
            <h2 className="text-md font-bold capitalize">
              {showUserModal === 'create' ? 'Create New User Account' : 'Edit User Details'}
            </h2>
            <form onSubmit={handleUserFormSubmit} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-500">Username</label>
                <input
                  type="text"
                  required
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  placeholder="e.g. johndoe"
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-transparent text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-800"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-500">Email Address</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="e.g. johndoe@example.com"
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-transparent text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-800"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-500">System Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-transparent text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950"
                >
                  <option value="student">Student</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end text-xs font-bold mt-2">
                <button 
                  type="button"
                  onClick={() => { setShowUserModal(null); setEditingUserId(null); }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {formSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save User'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENDER VIEW: SETTINGS */}
      {activeSubTab === 'settings' && (
        <ProfileSettingsPanel />
      )}
    </div>
  );
}
