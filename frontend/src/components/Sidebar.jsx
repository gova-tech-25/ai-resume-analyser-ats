import React from 'react';
import { useRole } from '../context/RoleContext';
import { FileText, Briefcase, BarChart2, Shield, Home, History, PlusCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const { activeRole, mobileMenuOpen, setMobileMenuOpen } = useRole();
  const location = useLocation();

  const getLinks = () => {
    const base = [
      { name: 'Home Portal', path: '/', icon: Home }
    ];

    if (activeRole === 'student') {
      base.push({ name: 'My Resumes', path: '/dashboard?tab=resumes', icon: FileText });
      base.push({ name: 'Browse Jobs', path: '/dashboard?tab=jobs', icon: Briefcase });
      base.push({ name: 'Scan History', path: '/dashboard?tab=history', icon: History });
    } else if (activeRole === 'recruiter') {
      base.push({ name: 'Jobs & Candidates', path: '/dashboard?tab=jobs', icon: Briefcase });
      base.push({ name: 'Post a Job', path: '/dashboard?tab=post-job', icon: PlusCircle });
      base.push({ name: 'Job Analytics', path: '/dashboard?tab=analytics', icon: BarChart2 });
    } else if (activeRole === 'admin') {
      base.push({ name: 'Platform Stats', path: '/dashboard?tab=stats', icon: BarChart2 });
      base.push({ name: 'Manage Users', path: '/dashboard?tab=users', icon: Shield });
    }

    return base;
  };

  const links = getLinks();
  const queryParams = new URLSearchParams(location.search);
  const currentTab = queryParams.get('tab');

  const isActive = (link) => {
    if (link.path === '/') {
      return location.pathname === '/';
    }
    if (location.pathname === '/dashboard') {
      const linkParams = new URLSearchParams(link.path.split('?')[1] || '');
      const linkTab = linkParams.get('tab');
      
      if (!currentTab) {
        if (activeRole === 'student') return linkTab === 'resumes';
        if (activeRole === 'recruiter') return linkTab === 'jobs';
        if (activeRole === 'admin') return linkTab === 'stats';
      }
      return currentTab === linkTab;
    }
    return false;
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation Panel */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 py-6 px-4 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-300 transform md:translate-x-0 md:static md:z-0 md:bg-white/50 md:dark:bg-slate-900/50 md:backdrop-blur-md md:border-slate-200/50 md:dark:border-slate-800/50 shrink-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col gap-6">
          <div className="px-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Navigation</span>
          </div>
          <nav className="flex flex-col gap-1.5">
            {links.map((link) => {
              const Icon = link.icon;
              const active = isActive(link);
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                    active
                      ? 'bg-gradient-to-r from-indigo-500/10 to-indigo-500/0 text-indigo-600 dark:text-indigo-400 border-l-4 border-indigo-500'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-900/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="px-4 py-3 bg-indigo-50/50 rounded-2xl dark:bg-indigo-950/20">
            <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 capitalize">
              {activeRole} Dashboard
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Toggle workspace roles in top bar dropdown.
            </p>
          </div>
          <div className="text-[10px] text-center text-slate-400">
            ATSify Platform &copy; 2026
          </div>
        </div>
      </aside>
    </>
  );
}
