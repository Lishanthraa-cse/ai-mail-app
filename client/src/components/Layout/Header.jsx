import React, { useRef, useEffect } from 'react';
import { 
  SunIcon, 
  MoonIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  MicrophoneIcon,
  BellAlertIcon,
  TagIcon,
  CalendarDaysIcon,
  UserIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useEmailContext } from '../../context/EmailContext';
import useVoiceControl from '../../hooks/useVoiceControl';
import toast from 'react-hot-toast';

const Header = ({ toggleTheme, isDarkMode, onToggleAssistant, showAssistant, onNavigate }) => {
  const { 
    filters, 
    setFilters, 
    loadEmails,
    semanticCriteria,
    runSemanticSearch,
    clearSemanticSearch,
    openCompose,
    dueNotification,
    dismissDueNotification,
    completeReminder
  } = useEmailContext();

  const searchInputRef = useRef(null);

  // Voice Control Integration
  const { isListening, isSupported, toggleListening } = useVoiceControl({
    onCommand: (cmd) => {
      if (cmd.type === 'NAVIGATE') {
        toast(`🎤 Navigating to ${cmd.destination}...`, { icon: '🎙️' });
        if (onNavigate) {
          onNavigate(cmd.destination);
        } else {
          loadEmails(cmd.destination);
        }
      } else if (cmd.type === 'COMPOSE') {
        toast('🎤 Opening compose...', { icon: '✍️' });
        openCompose();
      } else if (cmd.type === 'SEARCH') {
        toast(`🎤 Searching: "${cmd.query}"`, { icon: '🔍' });
        setFilters(prev => ({ ...prev, search: cmd.query }));
        runSemanticSearch(cmd.query);
      } else if (cmd.type === 'RAW') {
        setFilters(prev => ({ ...prev, search: cmd.text }));
        runSemanticSearch(cmd.text);
      }
    }
  });

  // Ctrl+K, Cmd+K, or / shortcut to focus search bar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInputting = activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.isContentEditable;
      if (!isInputting && e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (filters.search && filters.search.trim()) {
      runSemanticSearch(filters.search.trim());
    } else {
      clearSemanticSearch();
    }
  };

  const handleClearSearch = () => {
    setFilters(prev => ({ ...prev, search: '' }));
    clearSemanticSearch();
  };

  const handleCompleteDueNotification = async () => {
    if (dueNotification) {
      await completeReminder(dueNotification.id, dueNotification.emailId);
      toast.success('Follow-up marked as completed!');
      dismissDueNotification();
    }
  };

  return (
    <div className="space-y-3 mb-4 z-10">
      {/* Due Follow-up Notification Banner */}
      {dueNotification && (
        <div className="p-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-400/40 dark:border-amber-500/30 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-3 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
              <BellAlertIcon className="w-4 h-4 animate-bounce" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-black tracking-wider bg-amber-500 text-white">
                  Follow-up due
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {dueNotification.subject}
                </span>
              </div>
              {dueNotification.notes && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  Note: {dueNotification.notes}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={handleCompleteDueNotification}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center space-x-1 shadow-sm"
            >
              <CheckCircleIcon className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
            <button
              onClick={dismissDueNotification}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Dismiss"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Glass Header */}
      <header className="glass rounded-3xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg shadow-indigo-500/5 border border-white/60 dark:border-white/10">
        {/* Search Bar & Voice Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-2xl">
          <MagnifyingGlassIcon 
            style={{ width: '1rem', height: '1rem', minWidth: '1rem', minHeight: '1rem' }}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" 
          />
          <input
            ref={searchInputRef}
            type="text"
            value={filters.search || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Natural-language search e.g. 'emails about interviews', 'from recruiters last month'..."
            className="w-full pl-10 pr-28 py-2.5 bg-white/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-sm"
          />
          
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {/* Clear Button */}
            {filters.search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
                title="Clear Search"
              >
                <XMarkIcon style={{ width: '0.875rem', height: '0.875rem' }} className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Voice Control Button */}
            <button
              type="button"
              onClick={toggleListening}
              disabled={!isSupported}
              title={!isSupported ? 'Voice control is not supported in this browser' : isListening ? 'Listening... click to stop' : 'Hands-free voice control (e.g. "go to inbox", "search interviews")'}
              className={`p-1.5 rounded-xl transition-all ${
                !isSupported
                  ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-700/60 text-slate-400'
                  : isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400'
              }`}
            >
              <MicrophoneIcon className="w-3.5 h-3.5" />
            </button>

            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] uppercase font-mono font-medium rounded-lg bg-slate-200/60 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 border border-slate-300/40 dark:border-slate-600/40">
              Ctrl K
            </kbd>
          </div>
        </form>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 justify-end">
          {/* Toggle AI Assistant Panel */}
          <button
            onClick={onToggleAssistant}
            title={showAssistant ? 'Hide AI Assistant' : 'Show AI Assistant'}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all duration-200 shadow-sm ${
              showAssistant
                ? 'bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-400/40 dark:border-indigo-500/40 shadow-indigo-500/10'
                : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="relative">
              <SparklesIcon style={{ width: '1rem', height: '1rem' }} className="w-4 h-4 text-indigo-500" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
            </div>
            <span className="hidden sm:inline">Assistant</span>
          </button>

          {/* Dark/Light Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={isDarkMode ? 'Switch to Light mode' : 'Switch to Dark mode'}
            className="p-2.5 rounded-2xl bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-slate-700/60 transition-all hover:scale-105 shadow-sm"
          >
            {isDarkMode ? (
              <SunIcon style={{ width: '1rem', height: '1rem' }} className="w-4 h-4 text-amber-400" />
            ) : (
              <MoonIcon style={{ width: '1rem', height: '1rem' }} className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>
      </header>

      {/* Semantic Search Criteria Badges */}
      {semanticCriteria && (
        <div className="px-2 flex flex-wrap items-center gap-2 animate-fade-in text-xs">
          <span className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider flex items-center space-x-1">
            <SparklesIcon className="w-3.5 h-3.5 text-primary-500" />
            <span>AI Criteria:</span>
          </span>

          {semanticCriteria.category && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-semibold">
              <TagIcon className="w-3 h-3" />
              <span>Category: {semanticCriteria.category}</span>
            </span>
          )}

          {semanticCriteria.sender && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold">
              <UserIcon className="w-3 h-3" />
              <span>Sender: {semanticCriteria.sender}</span>
            </span>
          )}

          {semanticCriteria.unread && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-semibold">
              <span>Unread Only</span>
            </span>
          )}

          {(semanticCriteria.dateRange?.label || semanticCriteria.dateRangeLabel) && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold">
              <CalendarDaysIcon className="w-3 h-3" />
              <span>Date: {semanticCriteria.dateRange?.label || semanticCriteria.dateRangeLabel}</span>
            </span>
          )}

          {Array.isArray(semanticCriteria.keywords) && semanticCriteria.keywords.slice(0, 3).map((kw, i) => (
            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-medium">
              #{kw}
            </span>
          ))}

          <button
            onClick={clearSemanticSearch}
            className="text-[11px] text-rose-500 hover:text-rose-600 font-bold underline ml-1 cursor-pointer"
          >
            Clear Filter
          </button>
        </div>
      )}
    </div>
  );
};

export default Header;