import React, { useState } from 'react';
import { useRole } from '../context/RoleContext';
import { Bell, Sun, Moon, Sparkles, ChevronDown, Check, User as UserIcon, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { 
    activeRole, 
    switchRole, 
    activeUser, 
    profiles, 
    theme, 
    toggleTheme, 
    notifications,
    markNotificationRead,
    mobileMenuOpen,
    setMobileMenuOpen 
  } = useRole();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const unreadNotifs = notifications.filter(n => !n.isRead);

  const getRoleBadge = (role) => {
    switch(role) {
      case 'student': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400';
      case 'recruiter': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400';
      case 'admin': return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <nav className="glass-navbar px-6 py-3 flex items-center justify-between shadow-sm">
      {/* Brand Logo */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-xl border border-slate-200/50 hover:bg-slate-100 dark:border-slate-800/50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-all md:hidden mr-1"
          title="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        <div className="bg-gradient-to-tr from-indigo-500 to-cyan-500 p-2 rounded-xl text-white shadow-md">
          <Sparkles className="w-5 h-5" />
        </div>
        <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent dark:from-indigo-400 dark:to-cyan-300 font-sans">
          ATSify
        </span>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4 relative">
        
        {/* Role Selector Trigger */}
        <div className="relative">
          <button 
            onClick={() => { setShowRoleMenu(!showRoleMenu); setShowNotifMenu(false); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200/50 hover:bg-slate-100 dark:border-slate-800/50 dark:hover:bg-slate-900 transition-all text-sm font-medium"
          >
            {activeUser?.profileImage ? (
              <img src={activeUser.profileImage} alt="Avatar" className="w-5 h-5 rounded-full" />
            ) : (
              <UserIcon className="w-4 h-4 text-slate-400" />
            )}
            <span className="capitalize hidden sm:inline">{activeRole} Mode</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200/50 bg-white/95 p-1 shadow-lg dark:border-slate-800/50 dark:bg-slate-950/95 backdrop-blur-md z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400">Switch Workspace Role</div>
              {['student', 'recruiter', 'admin'].map((role) => {
                const user = profiles.find(p => p.role === role);
                return (
                  <button
                    key={role}
                    onClick={() => {
                      switchRole(role);
                      setShowRoleMenu(false);
                    }}
                    className={`flex items-center justify-between w-full text-left px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors ${
                      activeRole === role ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <img src={user?.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${role}`} alt={role} className="w-5 h-5 rounded-full" />
                      <div>
                        <div className="capitalize font-semibold text-xs leading-none">{role}</div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">{user?.username}</div>
                      </div>
                    </div>
                    {activeRole === role && <Check className="w-4 h-4 text-indigo-500" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-slate-200/50 hover:bg-slate-100 dark:border-slate-800/50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-all"
          title="Toggle Dark/Light Mode"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifMenu(!showNotifMenu); setShowRoleMenu(false); }}
            className="p-2 rounded-xl border border-slate-200/50 hover:bg-slate-100 dark:border-slate-800/50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-all relative"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none animate-pulse">
                {unreadNotifs.length}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200/50 bg-white/95 p-1 shadow-lg dark:border-slate-800/50 dark:bg-slate-950/95 backdrop-blur-md z-50 max-h-96 overflow-y-auto">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">System Activity Logs</span>
                {unreadNotifs.length > 0 && (
                  <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full dark:bg-indigo-950/50 dark:text-indigo-400">
                    {unreadNotifs.length} Unread
                  </span>
                )}
              </div>
              <div className="py-1">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-400">No logs or notifications.</div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n._id} 
                      className={`px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex flex-col gap-1 relative ${
                        !n.isRead ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{n.title}</span>
                        {!n.isRead && (
                          <button 
                            onClick={() => markNotificationRead(n._id)}
                            className="text-[10px] text-indigo-500 hover:text-indigo-600 font-medium"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">{n.message}</p>
                      <span className="text-[9px] text-slate-400 mt-1">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Current User Info */}
        <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-none">{activeUser?.username}</div>
            <span className={`inline-block text-[9px] font-bold uppercase px-1.5 py-0.5 rounded mt-1 ${getRoleBadge(activeRole)}`}>
              {activeRole}
            </span>
          </div>
        </div>

      </div>
    </nav>
  );
}
