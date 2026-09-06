import React, { useState } from 'react';
import { 
  StarIcon as StarOutline, 
  TrashIcon, 
  EnvelopeIcon, 
  EnvelopeOpenIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

const AVATAR_GRADIENTS = [
  'from-indigo-500 to-violet-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-purple-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
];

const getGradientForString = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
};

const getCategoryTag = (subject = '', snippet = '') => {
  const text = `${subject} ${snippet}`.toLowerCase();
  if (text.includes('meet') || text.includes('calendar') || text.includes('schedule') || text.includes('zoom')) {
    return { label: 'Meeting', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
  }
  if (text.includes('invoice') || text.includes('receipt') || text.includes('payment') || text.includes('billing')) {
    return { label: 'Finance', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
  }
  if (text.includes('security') || text.includes('verify') || text.includes('password') || text.includes('alert')) {
    return { label: 'Security', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
  }
  if (text.includes('project') || text.includes('github') || text.includes('task') || text.includes('deploy')) {
    return { label: 'Work', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' };
  }
  return null;
};

const EmailItem = ({ email, onClick, onStar, onDelete, onToggleRead, isSelected = false }) => {
  const [isStarred, setIsStarred] = useState(email.isStarred || email.labels?.includes('STARRED') || false);
  const [isRead, setIsRead] = useState(email.isRead ?? true);

  const senderName = email.from?.name || email.from?.email || 'Unknown';
  const senderEmail = email.from?.email || '';
  const initial = senderName.charAt(0).toUpperCase() || '?';
  const gradient = getGradientForString(senderEmail || senderName);
  const category = getCategoryTag(email.subject, email.snippet);

  const formatDate = (date) => {
    if (!date) return '';
    const now = new Date();
    const emailDate = new Date(date);
    const diff = now - emailDate;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) {
      return emailDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    if (diff < 604800000) {
      return emailDate.toLocaleDateString([], { weekday: 'short' });
    }
    return emailDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleStarClick = (e) => {
    e.stopPropagation();
    setIsStarred(!isStarred);
    if (onStar) onStar(email, !isStarred);
  };

  const handleToggleRead = (e) => {
    e.stopPropagation();
    setIsRead(!isRead);
    if (onToggleRead) onToggleRead(email, !isRead);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(email);
  };

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-2xl p-4 transition-all duration-200 cursor-pointer border ${
        isSelected ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 shadow-md shadow-indigo-500/20' : ''
      } ${
        !isRead
          ? 'bg-white/95 dark:bg-slate-800/90 border-indigo-200/80 dark:border-indigo-500/30 shadow-sm shadow-indigo-500/5'
          : 'bg-white/40 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-800/60'
      } hover:shadow-lg hover:shadow-slate-500/5 hover:-translate-y-0.5`}
    >
      <div className="flex items-start gap-3.5">
        {/* Unread Accent Dot */}
        <div className="pt-2.5 flex-shrink-0 flex items-center justify-center w-2">
          {!isRead ? (
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 ring-4 ring-indigo-500/20 animate-pulse"></span>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-slate-300 dark:group-hover:bg-slate-700 transition-colors"></span>
          )}
        </div>

        {/* Sender Avatar */}
        <div className="flex-shrink-0 relative">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold shadow-md shadow-indigo-500/10 text-sm transform transition-transform group-hover:scale-105`}>
            {initial}
          </div>
        </div>

        {/* Center Content */}
        <div className="flex-1 min-w-0 pr-2">
          {/* Top Row: Sender + Tags + Date */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-sm truncate ${!isRead ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                {senderName}
              </span>
              {category && (
                <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${category.color}`}>
                  {category.label}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {email.hasAttachments && (
                <PaperClipIcon width={14} height={14} style={{ width: '0.875rem', height: '0.875rem' }} className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className={`text-xs ${!isRead ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                {formatDate(email.date)}
              </span>
            </div>
          </div>

          {/* Subject Line */}
          <div className={`text-sm mb-1 truncate flex items-center gap-1.5 ${!isRead ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-800 dark:text-slate-200'}`}>
            <span className="truncate">{email.subject || '(No subject)'}</span>
            {email.threadCount > 1 && (
              <span className="px-1.5 py-0.5 rounded-md bg-slate-200/90 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">
                {email.threadCount}
              </span>
            )}
          </div>

          {/* Snippet */}
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed">
            {email.snippet || email.body?.replace(/<[^>]*>?/gm, '').substring(0, 140) || 'No preview available'}
          </p>
        </div>

        {/* Quick Hover Action Bar */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-2 py-1 rounded-xl shadow-lg border border-slate-200/80 dark:border-slate-700">
          <button
            onClick={handleStarClick}
            title={isStarred ? 'Unstar' : 'Star'}
            className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {isStarred ? (
              <StarSolid width={16} height={16} style={{ width: '1rem', height: '1rem' }} className="w-4 h-4 text-amber-500" />
            ) : (
              <StarOutline width={16} height={16} style={{ width: '1rem', height: '1rem' }} className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={handleToggleRead}
            title={isRead ? 'Mark as unread' : 'Mark as read'}
            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {isRead ? (
              <EnvelopeIcon width={16} height={16} style={{ width: '1rem', height: '1rem' }} className="w-4 h-4" />
            ) : (
              <EnvelopeOpenIcon width={16} height={16} style={{ width: '1rem', height: '1rem' }} className="w-4 h-4" />
            )}
          </button>

          {onDelete && (
            <button
              onClick={handleDeleteClick}
              title="Delete"
              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <TrashIcon width={16} height={16} style={{ width: '1rem', height: '1rem' }} className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailItem;