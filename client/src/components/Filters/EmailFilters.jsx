import React, { useState } from 'react';
import { useEmailContext } from '../../context/EmailContext';
import { 
  FunnelIcon, 
  XMarkIcon, 
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  UserIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const EmailFilters = () => {
  const { filters, setFilters, searchEmailsWithFilters, loadEmails } = useEmailContext();
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = (e) => {
    e?.preventDefault();
    searchEmailsWithFilters();
  };

  const handleClear = () => {
    const cleared = {
      search: '',
      dateFrom: '',
      dateTo: '',
      unreadOnly: false,
      sender: ''
    };
    setFilters(cleared);
    loadEmails('inbox');
  };

  const activeFilterCount = [
    filters.search,
    filters.dateFrom,
    filters.dateTo,
    filters.unreadOnly,
    filters.sender
  ].filter(Boolean).length;

  return (
    <div className="border-b border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md transition-all">
      {/* Filter Trigger Bar */}
      <div className="px-5 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isOpen || activeFilterCount > 0
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <FunnelIcon className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 transition-colors ml-1"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              Clear filters
            </button>
          )}
        </div>

        {isOpen && (
          <button
            onClick={handleApply}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-indigo-500/20 transition-all hover:scale-[1.02]"
          >
            <CheckIcon className="w-3.5 h-3.5" />
            Apply
          </button>
        )}
      </div>

      {/* Expanded Filter Panel */}
      {isOpen && (
        <form onSubmit={handleApply} className="px-5 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fadeIn">
          {/* Keyword Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Keyword in subject or body..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            />
          </div>

          {/* Sender Filter */}
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Sender email or name..."
              value={filters.sender}
              onChange={(e) => handleFilterChange('sender', e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <CalendarDaysIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="date"
                title="From date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full pl-8 pr-2 py-2 bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>
            <span className="text-xs text-slate-400">to</span>
            <div className="relative flex-1">
              <input
                type="date"
                title="To date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-2 py-2 bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>
          </div>

          {/* Unread Checkbox & Action */}
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={filters.unreadOnly}
                onChange={(e) => handleFilterChange('unreadOnly', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800"
              />
              <span>Unread only</span>
            </label>
          </div>
        </form>
      )}
    </div>
  );
};

export default EmailFilters;