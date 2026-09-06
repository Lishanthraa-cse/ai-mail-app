import React, { useRef, useEffect } from 'react';
import { 
  SunIcon, 
  MoonIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useEmailContext } from '../../context/EmailContext';

const Header = ({ toggleTheme, isDarkMode, onToggleAssistant, showAssistant }) => {
  const { filters, setFilters, searchEmailsWithFilters, loadEmails } = useEmailContext();
  const searchInputRef = useRef(null);

  // Ctrl+K, Cmd+K, or / shortcut to focus search bar (+3 bonus)
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
    searchEmailsWithFilters();
  };

  const handleClearSearch = () => {
    setFilters(prev => ({ ...prev, search: '' }));
    loadEmails('inbox');
  };

  return (
    <header className="glass rounded-3xl p-3 mb-4 flex items-center justify-between gap-4 shadow-lg shadow-indigo-500/5 border border-white/60 dark:border-white/10 z-10">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-lg">
        <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
        <input
          ref={searchInputRef}
          type="text"
          value={filters.search || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          placeholder="Search emails, contacts, keywords..."
          className="w-full pl-10 pr-20 py-2.5 bg-white/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-sm"
        />
        
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {filters.search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] uppercase font-mono font-medium rounded-lg bg-slate-200/60 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 border border-slate-300/40 dark:border-slate-600/40">
            Ctrl K
          </kbd>
        </div>
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Toggle AI Copilot Panel */}
        <button
          onClick={onToggleAssistant}
          title={showAssistant ? 'Hide AI Copilot' : 'Show AI Copilot'}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all duration-200 shadow-sm ${
            showAssistant
              ? 'bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-400/40 dark:border-indigo-500/40 shadow-indigo-500/10'
              : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <div className="relative">
            <SparklesIcon className="w-4 h-4 text-indigo-500" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
          </div>
          <span className="hidden sm:inline">Copilot</span>
        </button>

        {/* Dark/Light Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={isDarkMode ? 'Switch to Light mode' : 'Switch to Dark mode'}
          className="p-2.5 rounded-2xl bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-slate-700/60 transition-all hover:scale-105 shadow-sm"
        >
          {isDarkMode ? (
            <SunIcon className="w-4 h-4 text-amber-400" />
          ) : (
            <MoonIcon className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;