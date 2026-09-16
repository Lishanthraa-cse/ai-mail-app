import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEmailContext } from '../../context/EmailContext';
import SettingsModal from '../Settings/SettingsModal';
import ConfirmModal from '../Common/ConfirmModal';
import { 
  InboxIcon, 
  PaperAirplaneIcon, 
  PencilSquareIcon,
  ArrowRightOnRectangleIcon,
  SparklesIcon,
  StarIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  BookmarkIcon,
  TrashIcon,
  ShieldExclamationIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UserGroupIcon,
  TagIcon,
  BellAlertIcon
} from '@heroicons/react/24/outline';

const Sidebar = ({ onCompose, onLogout, isDarkMode, toggleTheme }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { emails, userProfile, updateProfile } = useEmailContext();

  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const unreadCount = emails ? emails.filter(e => !e.isRead).length : 0;
  const currentPath = location.pathname;

  const mainNavItems = [
    { 
      id: 'inbox', 
      label: 'Inbox', 
      path: '/inbox', 
      icon: InboxIcon,
      badge: unreadCount > 0 ? unreadCount : null,
      badgeColor: 'bg-indigo-500 text-white'
    },
    { 
      id: 'starred', 
      label: 'Starred', 
      path: '/starred', 
      icon: StarIcon,
      badge: null
    },
    { 
      id: 'sent', 
      label: 'Sent', 
      path: '/sent', 
      icon: PaperAirplaneIcon,
      badge: null
    },
    { 
      id: 'drafts', 
      label: 'Drafts', 
      path: '/drafts', 
      icon: DocumentTextIcon,
      badge: null
    },
    { 
      id: 'all', 
      label: 'All Mail', 
      path: '/all', 
      icon: EnvelopeIcon,
      badge: null
    },
    { 
      id: 'important', 
      label: 'Important', 
      path: '/important', 
      icon: BookmarkIcon,
      badge: null
    },
  ];

  const categoryItems = [
    {
      id: 'updates',
      label: 'Updates',
      path: '/category/updates',
      icon: BellAlertIcon,
      color: 'text-amber-500'
    },
    {
      id: 'social',
      label: 'Social',
      path: '/category/social',
      icon: UserGroupIcon,
      color: 'text-blue-500'
    },
    {
      id: 'promotions',
      label: 'Promotions',
      path: '/category/promotions',
      icon: TagIcon,
      color: 'text-emerald-500'
    }
  ];

  const bottomNavItems = [
    { 
      id: 'spam', 
      label: 'Spam', 
      path: '/spam', 
      icon: ShieldExclamationIcon,
      badge: null
    },
    { 
      id: 'trash', 
      label: 'Trash', 
      path: '/trash', 
      icon: TrashIcon,
      badge: null
    },
  ];

  const handleNavClick = (path) => {
    navigate(path);
  };

  const displayName = userProfile?.name || 'User Account';
  const initial = displayName.charAt(0).toUpperCase() || 'U';

  return (
    <>
      <aside className="w-64 flex-shrink-0 flex flex-col p-4 z-20 h-screen">
        {/* Brand Card */}
        <div className="glass rounded-3xl p-4 mb-3 flex flex-col gap-3 shadow-lg shadow-indigo-500/5 border border-white/60 dark:border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 flex-shrink-0">
              <SparklesIcon width={20} height={20} style={{ width: '1.25rem', height: '1.25rem' }} className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 dark:from-white dark:via-indigo-200 dark:to-slate-200 bg-clip-text text-transparent truncate">
                AI Mail Workspace
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Gmail Copilot
                </span>
              </div>
            </div>
          </div>

          {/* Compose Button */}
          <button
            onClick={onCompose}
            className="group relative w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-600 text-white font-semibold text-xs shadow-md shadow-indigo-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-2">
              <PencilSquareIcon width={16} height={16} style={{ width: '1rem', height: '1rem' }} className="w-4 h-4 transition-transform group-hover:rotate-12" />
              <span>Compose</span>
            </div>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] uppercase font-mono font-medium rounded bg-white/20 text-white/90">
              C
            </kbd>
          </button>
        </div>

        {/* Main Navigation Glass Panel */}
        <div className="glass rounded-3xl p-3 flex-1 flex flex-col justify-between shadow-lg shadow-slate-500/5 border border-white/60 dark:border-white/10 overflow-hidden">
          <nav className="space-y-1 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Mailbox
            </div>
            {mainNavItems.map((item) => {
              const isActive = currentPath === item.path || (item.path === '/inbox' && currentPath === '/');
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent text-indigo-600 dark:text-indigo-400 font-bold border-l-4 border-l-indigo-600 dark:border-l-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon width={16} height={16} style={{ width: '1rem', height: '1rem' }} className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${item.badgeColor} shadow-sm`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Collapsible Categories */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setCategoriesExpanded(!categoriesExpanded)}
                className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <span>Categories</span>
                {categoriesExpanded ? (
                  <ChevronDownIcon width={12} height={12} style={{ width: '0.75rem', height: '0.75rem' }} className="w-3 h-3" />
                ) : (
                  <ChevronRightIcon width={12} height={12} style={{ width: '0.75rem', height: '0.75rem' }} className="w-3 h-3" />
                )}
              </button>

              {categoriesExpanded && (
                <div className="space-y-0.5 mt-1 pl-1">
                  {categoryItems.map((cat) => {
                    const isActive = currentPath === cat.path;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleNavClick(cat.path)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all duration-150 ${
                          isActive
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <cat.icon width={15} height={15} style={{ width: '0.9375rem', height: '0.9375rem' }} className={`w-3.5 h-3.5 ${cat.color}`} />
                          <span>{cat.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Spam and Trash */}
            <div className="pt-2 border-t border-slate-200/40 dark:border-slate-800/40 mt-2 space-y-0.5">
              {bottomNavItems.map((item) => {
                const isActive = currentPath === item.path;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.path)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-2xl text-xs transition-all duration-150 ${
                      isActive
                        ? 'bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-transparent text-rose-600 dark:text-rose-400 font-bold border-l-4 border-l-rose-500 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon width={16} height={16} style={{ width: '1rem', height: '1rem' }} className={`w-4 h-4 ${isActive ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Footer User Profile & Settings / Logout */}
          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex-shrink-0">
            <div className="p-2.5 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between gap-2 shadow-sm">
              <div 
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
                title="Click to edit profile and settings"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    Settings & Profile
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  title="Mail & Profile Settings"
                  className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
                >
                  <Cog6ToothIcon width={16} height={16} style={{ width: '1rem', height: '1rem' }} className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  title="Logout"
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                >
                  <ArrowRightOnRectangleIcon width={16} height={16} style={{ width: '1rem', height: '1rem' }} className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        userProfile={userProfile}
        onSaveProfile={updateProfile}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Sign Out of AI Mail"
        message="Are you sure you want to log out? You will need to sign in again to access your emails and AI copilot."
        confirmText="Yes, Log Out"
        cancelText="Stay Signed In"
        confirmColor="bg-rose-600 hover:bg-rose-700"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          onLogout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
};

export default Sidebar;