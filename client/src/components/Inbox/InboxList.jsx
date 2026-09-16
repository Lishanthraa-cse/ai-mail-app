import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEmailContext } from '../../context/EmailContext';
import EmailItem from './EmailItem';
import EmailFilters from '../Filters/EmailFilters';
import ConfirmModal from '../Common/ConfirmModal';
import { 
  InboxIcon, 
  PaperAirplaneIcon, 
  ArrowPathIcon,
  SparklesIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  StarIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  BookmarkIcon,
  TrashIcon,
  ShieldExclamationIcon,
  BellAlertIcon,
  UserGroupIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

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

const FOLDER_CONFIG = {
  inbox: { title: 'Inbox', icon: InboxIcon, gradient: 'from-indigo-500 to-purple-600' },
  starred: { title: 'Starred Messages', icon: StarIcon, gradient: 'from-amber-400 to-orange-500' },
  sent: { title: 'Sent Messages', icon: PaperAirplaneIcon, gradient: 'from-blue-500 to-indigo-600', iconClass: '-rotate-45' },
  drafts: { title: 'Drafts', icon: DocumentTextIcon, gradient: 'from-slate-500 to-slate-700' },
  all: { title: 'All Mail', icon: EnvelopeIcon, gradient: 'from-indigo-600 to-teal-500' },
  important: { title: 'Important', icon: BookmarkIcon, gradient: 'from-yellow-500 to-amber-600' },
  trash: { title: 'Trash', icon: TrashIcon, gradient: 'from-rose-500 to-red-600' },
  spam: { title: 'Spam', icon: ShieldExclamationIcon, gradient: 'from-orange-500 to-rose-600' },
  updates: { title: 'Updates Category', icon: BellAlertIcon, gradient: 'from-amber-500 to-yellow-600' },
  social: { title: 'Social Category', icon: UserGroupIcon, gradient: 'from-blue-500 to-cyan-600' },
  promotions: { title: 'Promotions Category', icon: TagIcon, gradient: 'from-emerald-500 to-teal-600' }
};

const CATEGORY_TABS = [
  { id: 'inbox', label: 'Primary', path: '/inbox', icon: InboxIcon },
  { id: 'updates', label: 'Updates', path: '/category/updates', icon: BellAlertIcon },
  { id: 'social', label: 'Social', path: '/category/social', icon: UserGroupIcon },
  { id: 'promotions', label: 'Promotions', path: '/category/promotions', icon: TagIcon }
];

const InboxList = ({ folder: propFolder, sent = false, onEmailSelect }) => {
  const { category } = useParams();
  const navigate = useNavigate();
  const { 
    emails, 
    loading, 
    loadEmails, 
    toggleStar, 
    toggleRead, 
    moveToTrash, 
    emptyTrash, 
    openCompose 
  } = useEmailContext();

  const [filterMode, setFilterMode] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showEmptyTrashConfirm, setShowEmptyTrashConfirm] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Determine active folder view
  const currentFolder = (category ? category.toLowerCase() : (sent ? 'sent' : (propFolder || 'inbox'))).toLowerCase();
  const folderInfo = FOLDER_CONFIG[currentFolder] || FOLDER_CONFIG.inbox;
  const FolderIcon = folderInfo.icon;

  const isCategoryView = ['inbox', 'updates', 'social', 'promotions'].includes(currentFolder);

  useEffect(() => {
    loadEmails(currentFolder);
  }, [currentFolder, loadEmails]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadEmails(currentFolder);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleEmailClick = (email) => {
    if (email.isDraft || currentFolder === 'drafts') {
      openCompose({
        draftId: email._id || email.emailId,
        to: email.to?.[0]?.email || email.to?.[0]?.name || email.to || '',
        subject: email.subject || '',
        body: email.body || ''
      });
      return;
    }

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

  // Keyboard navigation: j/k to move, Enter/o to open
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

  const handleStar = (email) => {
    toggleStar(email);
  };

  const handleToggleRead = (email, markAsRead) => {
    toggleRead(email, markAsRead);
    toast.success(markAsRead ? 'Marked as read' : 'Marked as unread');
  };

  const handleDelete = (email) => {
    moveToTrash(email, false);
    toast.success('Moved to Trash');
  };

  const handleRestore = (email) => {
    moveToTrash(email, true);
    toast.success('Restored to Inbox');
  };

  const handleConfirmEmptyTrash = async () => {
    setShowEmptyTrashConfirm(false);
    await emptyTrash();
    toast.success('Trash emptied');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Top Toolbar */}
      <div className="px-5 py-3.5 border-b border-slate-200/50 dark:border-slate-800/50 flex flex-wrap items-center justify-between gap-3 bg-white/20 dark:bg-slate-900/20 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${folderInfo.gradient} flex items-center justify-center text-white shadow-lg shadow-indigo-500/20`}>
            <FolderIcon width={20} height={20} style={{ width: '1.25rem', height: '1.25rem' }} className={`w-5 h-5 ${folderInfo.iconClass || ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {folderInfo.title}
              </h2>
              {unreadCount > 0 && currentFolder === 'inbox' && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30">
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
        <div className="flex items-center gap-2 flex-wrap">
          {currentFolder !== 'sent' && currentFolder !== 'drafts' && currentFolder !== 'trash' && (
            <div className="flex items-center bg-white/60 dark:bg-slate-800/60 p-0.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
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
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
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

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 text-[10px] text-slate-500 dark:text-slate-400 font-mono select-none">
            <span>⌨️</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">j</span>/<span className="font-semibold text-slate-700 dark:text-slate-300">k</span>
            <span>navigate</span>
            <span>·</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Enter</span>
            <span>open</span>
          </div>

          <button
            onClick={handleRefresh}
            title="Refresh emails"
            disabled={loading || isRefreshing}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-xl transition-all disabled:opacity-50"
          >
            <ArrowPathIcon width={16} height={16} style={{ width: '1rem', height: '1rem' }} className={`w-4 h-4 ${isRefreshing || loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Gmail Category Tabs */}
      {isCategoryView && (
        <div className="flex border-b border-slate-200/50 dark:border-slate-800/50 bg-white/30 dark:bg-slate-900/30 px-3 overflow-x-auto flex-shrink-0">
          {CATEGORY_TABS.map((tab) => {
            const isActive = (tab.id === 'inbox' && currentFolder === 'inbox') || currentFolder === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/30'
                }`}
              >
                <TabIcon width={16} height={16} style={{ width: '1rem', height: '1rem' }} className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Trash Alert Banner */}
      {currentFolder === 'trash' && (
        <div className="p-3 bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/20 px-5 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200 flex-shrink-0">
          <span>Messages in Trash will be automatically deleted after 30 days.</span>
          {emails.length > 0 && (
            <button
              onClick={() => setShowEmptyTrashConfirm(true)}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm transition-colors"
            >
              Empty Trash Now
            </button>
          )}
        </div>
      )}

      {/* Spam Alert Banner */}
      {currentFolder === 'spam' && (
        <div className="p-3 bg-rose-500/10 dark:bg-rose-500/15 border-b border-rose-500/20 px-5 flex items-center justify-between text-xs text-rose-800 dark:text-rose-200 flex-shrink-0">
          <span>Messages that have been in Spam more than 30 days will be automatically deleted.</span>
        </div>
      )}

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
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/30 flex items-center justify-center mb-5 text-indigo-500 shadow-inner">
              {filterMode === 'unread' ? (
                <MagnifyingGlassIcon width={40} height={40} style={{ width: '2.5rem', height: '2.5rem' }} className="w-10 h-10" />
              ) : (
                <CheckCircleIcon width={40} height={40} style={{ width: '2.5rem', height: '2.5rem' }} className="w-10 h-10" />
              )}
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              {filterMode === 'unread' 
                ? 'No unread messages' 
                : currentFolder === 'trash'
                  ? 'Trash is empty'
                  : currentFolder === 'drafts'
                    ? 'No drafts saved'
                    : 'Nothing in this folder! 🎉'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
              {filterMode === 'unread'
                ? 'All messages have been read. Switch to "All" to view previous conversations.'
                : currentFolder === 'trash'
                  ? 'Your trash folder is clear.'
                  : currentFolder === 'drafts'
                    ? 'Click "Compose" to start writing a new draft.'
                    : "You're all caught up! Enjoy your clean workspace."}
            </p>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all hover:scale-105"
            >
              <SparklesIcon width={16} height={16} style={{ width: '1rem', height: '1rem' }} className="w-4 h-4" />
              Refresh folder
            </button>
          </div>
        ) : (
          displayedEmails.map((email, idx) => (
            <EmailItem
              key={email.emailId || email.gmailId || email._id || `email-${idx}`}
              email={email}
              folder={currentFolder}
              isSelected={idx === selectedIndex}
              onStar={handleStar}
              onDelete={handleDelete}
              onRestore={handleRestore}
              onToggleRead={handleToggleRead}
              onClick={() => {
                setSelectedIndex(idx);
                handleEmailClick(email);
              }}
            />
          ))
        )}
      </div>

      {/* Empty Trash Confirmation Modal */}
      <ConfirmModal
        isOpen={showEmptyTrashConfirm}
        title="Empty Trash?"
        message="All messages in the trash will be permanently deleted. This action cannot be reversed."
        confirmText="Empty Trash"
        cancelText="Cancel"
        confirmColor="bg-rose-600 hover:bg-rose-700"
        onConfirm={handleConfirmEmptyTrash}
        onCancel={() => setShowEmptyTrashConfirm(false)}
      />
    </div>
  );
};

export default InboxList;