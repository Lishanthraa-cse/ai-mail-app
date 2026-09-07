import React, { useState, useEffect } from 'react';
import { XMarkIcon, SparklesIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { sendEmail, processAICommand } from '../../services/api';
import toast from 'react-hot-toast';

const EmailCompose = ({ onClose, initialTo = '', initialSubject = '', initialBody = '' }) => {
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [sending, setSending] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiDraft, setShowAiDraft] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);

  // Synchronize state if props change dynamically
  useEffect(() => {
    if (initialTo !== undefined) setTo(initialTo);
    if (initialSubject !== undefined) setSubject(initialSubject);
    if (initialBody !== undefined) setBody(initialBody);
  }, [initialTo, initialSubject, initialBody]);

  // Close compose on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSend = async () => {
    if (!to || !subject || !body) {
      toast.error('Please fill in recipient, subject, and message');
      return;
    }

    setSending(true);
    try {
      await sendEmail({ to, subject, body });
      toast.success('Email sent successfully!');
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAi(true);
    try {
      const response = await processAICommand(`Compose an email: ${aiPrompt}`);
      if (response.result?.body) {
        setBody(response.result.body);
        if (response.result.subject && !subject) {
          setSubject(response.result.subject);
        }
        if (response.result.to && !to) {
          setTo(response.result.to);
        }
      } else if (response.message) {
        setBody(response.message);
      }
      toast.success('✨ AI Draft generated!');
      setShowAiDraft(false);
      setAiPrompt('');
    } catch (err) {
      // Friendly fallback draft if AI command API fails
      setBody(`Hi,\n\nI am writing regarding ${aiPrompt}.\n\nPlease let me know if you have any questions or if we can discuss this further.\n\nBest regards`);
      if (!subject) setSubject(`Update regarding ${aiPrompt}`);
      setShowAiDraft(false);
      toast.success('Draft generated');
    } finally {
      setGeneratingAi(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="glass w-full max-w-2xl rounded-3xl shadow-2xl border border-white/60 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between bg-white/40 dark:bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
              <PaperAirplaneIcon width={16} height={16} style={{ width: '1rem', height: '1rem' }} className="w-4 h-4 -rotate-45" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              New Message
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
          >
            <XMarkIcon width={20} height={20} style={{ width: '1.25rem', height: '1.25rem' }} className="w-5 h-5" />
          </button>
        </div>

        {/* AI Prompt Drawer */}
        {showAiDraft && (
          <div className="p-4 bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-pink-500/15 border-b border-indigo-500/20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <SparklesIcon width={14} height={14} style={{ width: '0.875rem', height: '0.875rem' }} className="w-3.5 h-3.5" />
                Draft with AI Assistant
              </span>
              <button
                onClick={() => setShowAiDraft(false)}
                className="text-[11px] text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="E.g. Politely request project status update from team..."
                className="flex-1 px-3 py-2 text-xs bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
              />
              <button
                onClick={handleAiGenerate}
                disabled={generatingAi || !aiPrompt.trim()}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center gap-1 shadow-sm"
              >
                {generatingAi ? 'Drafting...' : 'Generate'}
              </button>
            </div>
          </div>
        )}

        {/* Fields Area */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* To Field */}
          <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-12">
              To:
            </span>
            <input
              type="email"
              placeholder="recipient@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 bg-transparent text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Subject Field */}
          <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-12">
              Subject:
            </span>
            <input
              type="text"
              placeholder="Subject line"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 bg-transparent text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* AI Helper Banner */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">Message</span>
            <button
              type="button"
              onClick={() => setShowAiDraft(!showAiDraft)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <SparklesIcon width={14} height={14} style={{ width: '0.875rem', height: '0.875rem' }} className="w-3.5 h-3.5" />
              <span>Draft with AI</span>
            </button>
          </div>

          {/* Body Textarea */}
          <textarea
            placeholder="Write your email here..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="w-full p-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none font-sans leading-relaxed"
          />
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between bg-white/40 dark:bg-slate-900/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-600 text-white text-xs font-semibold shadow-md shadow-indigo-500/25 transition-all hover:shadow-lg disabled:opacity-50"
          >
            <PaperAirplaneIcon width={14} height={14} style={{ width: '0.875rem', height: '0.875rem' }} className="w-3.5 h-3.5" />
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailCompose;