import React, { useEffect, useState } from 'react';
import { useEmailContext } from '../../context/EmailContext';
import EmailItem from './EmailItem';
import EmailFilters from '../Filters/EmailFilters';
import { useNavigate } from 'react-router-dom';
import { 
  InboxIcon, 
  PaperAirplaneIcon, 
  ArrowPathIcon,
  SparklesIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const SkeletonEmail = () => (
  <div className="rounded-2xl p-4 bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-3.5">
    <div className="w-2.5 h-2.5 rounded-full skeleton-shimmer flex-shrink-0"></div>
    <div className="w-10 h-10 rounded-xl skeleton-shimmer flex-shrink-0"></div>
    <div className="flex-1 space-y-2">
      <div className="flex items-center justify-between">
        <div className="w-32 h-3.5 rounded skeleton-shimmer"></div>
        <div className="w-16 h-3 rounded skeleton-shimmer"></div>
      </div>
      <div className="w-48 h-3.5 rounded skeleton-shimmer"></div>
      <div className="w-full h-2.5 rounded skeleton-shimmer"></div>
    </div>
  </div>
);

const InboxList = ({ sent = false, onEmailSelect }) => {
  const { emails, loading, loadEmails } = useEmailContext();
  const navigate = useNavigate();
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'unread', 'starred'
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadEmails(sent ? 'sent' : 'inbox');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sent]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadEmails(sent ? 'sent' : 'inbox');
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleEmailClick = (email) => {
    if (onEmailSelect) {
      onEmailSelect(email);
    }
    const id = email.emailId || email.gmailId || email._id;
    if (id) {
      navigate(`/email/${id}`);
    }
  };

  const displayedEmails = emails.filter((email) => {
    if (filterMode === 'unread') return !email.isRead;
    if (filterMode === 'starred') return email.isStarred || email.labels?.includes('STARRED');
    return true;
  });

  const [selectedIndex, setSelectedIndex] = useState(0);

  // Keyboard navigation: j (down), k (up), Enter/o (open) (+3 bonus)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInputting = activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.isContentEditable;
      if (isInputting) return;

      if (e.key === 'j') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, Math.max(0, displayedEmails.length - 1)));
      } else if (e.key === 'k') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'o') {
        if (displayedEmails[selectedIndex]) {
          e.preventDefault();
          handleEmailClick(displayedEmails[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedEmails, selectedIndex]);

  const unreadCount = emails.filter(e => !e.isRead).length;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Top Toolbar */}
      <div className="px-5 py-3.5 border-b border-slate-200/70 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-white/30 dark:bg-slate-900/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            {sent ? (
              <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />
            ) : (
              <InboxIcon className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {sent ? 'Sent Messages' : 'Inbox'}
              </h2>
              {unreadCount > 0 && !sent && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500 text-white shadow-sm shadow-indigo-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {emails.length} {emails.length === 1 ? 'conversation' : 'conversations'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Filter Tabs */}
          {!sent && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm font-semibold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode('unread')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  filterMode === 'unread'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm font-semibold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Unread
                {unreadCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                )}
              </button>
              <button
                onClick={() => setFilterMode('starred')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterMode === 'starred'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm font-semibold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Starred
              </button>
            </div>
          )}

          {/* Keyboard shortcut legend pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-500 dark:text-slate-400 font-mono select-none">
            <span>⌨️</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">j</span>/<span className="font-semibold text-slate-700 dark:text-slate-300">k</span>
            <span>navigate</span>
            <span>·</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Enter</span>
            <span>open</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            title="Refresh emails"
            disabled={loading || isRefreshing}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isRefreshing || loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Advanced Filter Drawer */}
      <EmailFilters />

      {/* Main Email List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {loading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonEmail key={i} />
            ))}
          </div>
        ) : displayedEmails.length === 0 ? (
          <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/30 flex items-center justify-center mb-4 text-indigo-500 shadow-inner">
              <CheckCircleIcon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
              {filterMode === 'unread' ? 'No unread messages' : 'Inbox Zero achieved! 🎉'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
              {filterMode === 'unread'
                ? 'All messages have been read. Switch to "All" to view previous conversations.'
                : "You're completely up to date! Take a breather or compose a message using the AI copilot."}
            </p>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/25 transition-all hover:scale-105"
            >
              <SparklesIcon className="w-4 h-4" />
              Check for new updates
            </button>
          </div>
        ) : (
          displayedEmails.map((email, idx) => (
            <EmailItem
              key={email.emailId || email.gmailId || email._id}
              email={email}
              isSelected={idx === selectedIndex}
              onClick={() => {
                setSelectedIndex(idx);
                handleEmailClick(email);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default InboxList;