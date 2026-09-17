import React, { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  XMarkIcon, 
  CalendarDaysIcon, 
  BellAlertIcon, 
  CheckCircleIcon, 
  TrashIcon 
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useEmailContext } from '../../context/EmailContext';

const PRESETS = [
  { id: 'tomorrow', label: 'Tomorrow', desc: 'In 24 hours', days: 1 },
  { id: 'in_3_days', label: 'In 3 Days', desc: 'Follow up after 3 days', days: 3 },
  { id: 'next_week', label: 'Next Week', desc: 'In 7 days', days: 7 },
  { id: 'custom', label: 'Custom Date & Time', desc: 'Pick exact date and time', days: null }
];

const ReminderModal = ({ email, isOpen, onClose }) => {
  const { createReminder, completeReminder, deleteReminder } = useEmailContext();

  const [preset, setPreset] = useState('tomorrow');
  const [customDateTime, setCustomDateTime] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (email) {
      if (email.reminder) {
        setPreset(email.reminder.preset || 'tomorrow');
        setNotes(email.reminder.notes || '');
        if (email.reminder.dueDate) {
          try {
            const d = new Date(email.reminder.dueDate);
            const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            setCustomDateTime(iso);
          } catch (e) {}
        }
      } else {
        setPreset('tomorrow');
        setNotes('');
        const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setCustomDateTime(iso);
      }
    }
  }, [email, isOpen]);

  if (!isOpen || !email) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalDueDate = null;
      if (preset === 'custom') {
        if (!customDateTime) {
          toast.error('Please specify custom date and time');
          setSaving(false);
          return;
        }
        finalDueDate = new Date(customDateTime).toISOString();
      } else {
        const selected = PRESETS.find(p => p.id === preset);
        const days = selected ? selected.days : 1;
        finalDueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }

      await createReminder({
        emailId: email.emailId || email._id,
        threadId: email.threadId || '',
        subject: email.subject || 'Follow-up Email',
        sender: email.from || { name: 'Sender', email: 'sender@example.com' },
        snippet: email.snippet || '',
        dueDate: finalDueDate,
        preset,
        notes: notes.trim()
      });

      toast.success('⏰ Follow-up reminder scheduled!');
      onClose();
    } catch (err) {
      toast.error('Failed to set reminder: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    try {
      const remId = email.reminder?._id || email.reminder?.id || email.emailId || email._id;
      await completeReminder(remId, email.emailId || email._id);
      toast.success('Follow-up marked as completed!');
      onClose();
    } catch (err) {
      toast.error('Failed to complete reminder');
    }
  };

  const handleDelete = async () => {
    try {
      const remId = email.reminder?._id || email.reminder?.id || email.emailId || email._id;
      await deleteReminder(remId, email.emailId || email._id);
      toast.success('Reminder removed');
      onClose();
    } catch (err) {
      toast.error('Failed to remove reminder');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="glass w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-white/40 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 flex flex-col animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-sm">
              <ClockIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Follow-Up Reminder
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                {email.subject || 'Selected email'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Status Banner */}
        {email.reminder && !email.reminder.isCompleted && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-amber-800 dark:text-amber-300">
              <BellAlertIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>
                {email.reminder.isDue ? (
                  <strong className="font-semibold text-amber-600 dark:text-amber-400">Due now!</strong>
                ) : (
                  `Scheduled for ${new Date(email.reminder.dueDate).toLocaleDateString()} ${new Date(email.reminder.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                )}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handleComplete}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center space-x-1 shadow-sm"
              >
                <CheckCircleIcon className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="p-1 text-slate-400 hover:text-rose-500 transition rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                title="Delete Reminder"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Choose Follow-Up Timing
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {PRESETS.map((p) => {
                const isSelected = preset === p.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setPreset(p.id)}
                    className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 shadow-md ring-2 ring-amber-500/30'
                        : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-sm flex items-center justify-between w-full">
                      <span>{p.label}</span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {p.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date Time Picker */}
          {preset === 'custom' && (
            <div className="animate-fade-in p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center space-x-1.5">
                <CalendarDaysIcon className="w-4 h-4 text-amber-500" />
                <span>Specify Custom Due Date & Time</span>
              </label>
              <input
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                required
              />
            </div>
          )}

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Action Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Confirm availability for the engineering sync, or verify invoice details..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-none placeholder-slate-400"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-200/60 dark:border-slate-800/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 transition disabled:opacity-50 flex items-center space-x-2"
            >
              <ClockIcon className="w-4 h-4" />
              <span>{saving ? 'Saving...' : email.reminder ? 'Update Reminder' : 'Set Reminder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReminderModal;

