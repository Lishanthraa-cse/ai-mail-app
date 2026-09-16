import React, { useState } from 'react';
import { 
  XMarkIcon, 
  UserIcon, 
  Cog6ToothIcon, 
  CommandLineIcon, 
  CheckIcon 
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const KEYBOARD_SHORTCUTS = [
  { key: 'C', desc: 'Compose a new email' },
  { key: '/', desc: 'Focus the search bar' },
  { key: 'Cmd / Ctrl + K', desc: 'Quick search palette' },
  { key: 'j', desc: 'Move down in email list' },
  { key: 'k', desc: 'Move up in email list' },
  { key: 'Enter / o', desc: 'Open selected email' },
  { key: 'Esc', desc: 'Close open modal or draft' }
];

const SettingsModal = ({ 
  isOpen, 
  onClose, 
  userProfile = {}, 
  onSaveProfile, 
  isDarkMode, 
  toggleTheme 
}) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(userProfile.name || 'User Account');
  const [signature, setSignature] = useState(userProfile.signature || '--\nBest regards,\n' + (userProfile.name || 'User Account'));
  const [autoAdvance, setAutoAdvance] = useState(userProfile.autoAdvance ?? true);
  const [desktopNotify, setDesktopNotify] = useState(userProfile.desktopNotify ?? true);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Display name cannot be empty');
      return;
    }
    if (onSaveProfile) {
      onSaveProfile({
        ...userProfile,
        name: name.trim(),
        signature,
        autoAdvance,
        desktopNotify
      });
    }
    toast.success('Settings saved successfully!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="glass w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-white/40 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 flex flex-col max-h-[90vh] animate-scale-up">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Cog6ToothIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Mail Settings & Preferences
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalize your display name, signature, and workflow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200/60 dark:border-slate-800/60 px-5 pt-2 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            Profile & Name
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'general'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Cog6ToothIcon className="w-4 h-4" />
            General & Signature
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'shortcuts'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <CommandLineIcon className="w-4 h-4" />
            Shortcuts
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name (e.g. Alex Rivera)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This name will appear on sent emails, in your dashboard header, and to your AI Assistant.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Connected Account Email
                </label>
                <input
                  type="text"
                  value={userProfile.email || 'user@aimail.com'}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40 text-sm text-slate-500 cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Connected via Google OAuth 2.0. To switch accounts, sign out and sign in with a different ID.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Email Signature
                </label>
                <textarea
                  rows={4}
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Enter custom signature to append to new emails..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none font-mono text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Automatically attached at the end of every composed message and AI draft.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Auto-Advance After Actions
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Automatically return to the inbox after deleting or archiving an email.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoAdvance}
                    onChange={(e) => setAutoAdvance(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Real-time Push Notifications
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Show toast popups when new incoming emails arrive via WebSocket.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={desktopNotify}
                    onChange={(e) => setDesktopNotify(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Theme Mode
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Current: {isDarkMode ? 'Dark Glass' : 'Light Glass'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-xs font-semibold"
                  >
                    Switch to {isDarkMode ? 'Light' : 'Dark'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Keyboard shortcuts supercharge your email triage speed:
              </p>
              <div className="space-y-2">
                {KEYBOARD_SHORTCUTS.map((sc, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50"
                  >
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {sc.desc}
                    </span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 shadow-sm">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all"
          >
            <CheckIcon className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
