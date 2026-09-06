import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEmailContext } from '../../context/EmailContext';
import { 
  InboxIcon, 
  PaperAirplaneIcon, 
  PencilSquareIcon,
  ArrowRightOnRectangleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const Sidebar = ({ onCompose, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { emails } = useEmailContext();

  const unreadCount = emails ? emails.filter(e => !e.isRead).length : 0;
  const currentPath = location.pathname;

  const navItems = [
    { 
      id: 'inbox', 
      label: 'Inbox', 
      path: '/inbox', 
      icon: InboxIcon,
      badge: unreadCount > 0 ? unreadCount : null,
      badgeColor: 'bg-indigo-500 text-white'
    },
    { 
      id: 'sent', 
      label: 'Sent', 
      path: '/sent', 
      icon: PaperAirplaneIcon,
      badge: null
    },
  ];

  const handleNavClick = (path) => {
    navigate(path);
  };

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col p-4 z-20">
      {/* Brand Card */}
      <div className="glass rounded-3xl p-5 mb-4 flex flex-col gap-3 shadow-lg shadow-indigo-500/5 border border-white/60 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
            <SparklesIcon className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 dark:from-white dark:via-indigo-200 dark:to-slate-200 bg-clip-text text-transparent">
              AI Mail
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Copilot v2.0
              </span>
            </div>
          </div>
        </div>

        {/* Compose Button */}
        <button
          onClick={onCompose}
          className="group relative w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-2.5">
            <PencilSquareIcon className="w-4 h-4 transition-transform group-hover:rotate-12" />
            <span>Compose</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] uppercase font-mono font-medium rounded bg-white/20 text-white/90">
            C
          </kbd>
        </button>
      </div>

      {/* Main Navigation Glass Panel */}
      <div className="glass rounded-3xl p-3 flex-1 flex flex-col justify-between shadow-lg shadow-slate-500/5 border border-white/60 dark:border-white/10 overflow-hidden">
        <nav className="space-y-1.5">
          <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Mailbox
          </div>
          {navItems.map((item) => {
            const isActive = currentPath === item.path || (item.path === '/inbox' && currentPath === '/');
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.path)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent text-indigo-600 dark:text-indigo-400 font-bold border-l-4 border-l-indigo-600 dark:border-l-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor} shadow-sm`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer User / Logout */}
        <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="p-2 rounded-2xl bg-white/40 dark:bg-slate-800/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                AI
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  User Account
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  Connected
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;