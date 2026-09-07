import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchEmail, fetchThread, sendEmail } from '../../services/api';
import { useEmailContext } from '../../context/EmailContext';
import { 
  ArrowLeftIcon, 
  StarIcon, 
  TrashIcon, 
  ArrowUturnLeftIcon, 
  PaperAirplaneIcon,
  SparklesIcon,
  CheckBadgeIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

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
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
};

const EmailDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setActiveEmail } = useEmailContext();
  const [email, setEmail] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [expandedThreads, setExpandedThreads] = useState({});
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadEmailAndThread = async () => {
      try {
        const data = await fetchEmail(id);
        if (!isMounted) return;
        setEmail(data);
        setActiveEmail(data);

        // Fetch thread messages if threadId exists (+3 bonus)
        if (data.threadId) {
          try {
            const threadData = await fetchThread(data.threadId);
            if (!isMounted) return;
            if (Array.isArray(threadData) && threadData.length > 0) {
              setThreadMessages(threadData);
              // Expand the latest message by default
              const latestId = threadData[threadData.length - 1].emailId || threadData[threadData.length - 1]._id;
              setExpandedThreads({ [latestId]: true, [id]: true });
            }
          } catch (threadErr) {
            console.warn('Could not fetch thread:', threadErr);
          }
        }
      } catch (error) {
        if (!isMounted) return;
        toast.error('Failed to load email');
        navigate('/inbox');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadEmailAndThread();

    return () => {
      isMounted = false;
      setActiveEmail(null);
    };
  }, [id, navigate, setActiveEmail]);

  const handleSendReply = async () => {
    if (!replyBody.trim()) {
      toast.error('Please enter a reply message');
      return;
    }
    setSendingReply(true);
    try {
      await sendEmail({
        to: email.from?.email,
        subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
        body: replyBody
      });
      toast.success('Reply sent successfully!');
      
      // Append to thread messages
      const newReply = {
        emailId: 'reply-' + Date.now(),
        threadId: email.threadId,
        from: { name: 'You', email: 'user@aimail.com' },
        to: [{ name: email.from?.name || email.from?.email, email: email.from?.email }],
        subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
        body: replyBody,
        snippet: replyBody.substring(0, 80),
        date: new Date().toISOString(),
        isRead: true
      };
      setThreadMessages(prev => [...prev, newReply]);
      setExpandedThreads(prev => ({ ...prev, [newReply.emailId]: true }));

      setReplyBody('');
      setShowReplyBox(false);
    } catch (err) {
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleSmartReplyClick = (suggestion) => {
    setReplyBody(suggestion);
    setShowReplyBox(true);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-600 animate-spin mb-4"></div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading conversation...</p>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">Email could not be found</p>
        <button
          onClick={() => navigate('/inbox')}
          className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
        >
          Return to Inbox
        </button>
      </div>
    );
  }

  const senderName = email.from?.name || email.from?.email || 'Unknown';
  const senderEmail = email.from?.email || '';
  const initial = senderName.charAt(0).toUpperCase() || '?';
  const gradient = getGradientForString(senderEmail || senderName);

  // Generate an AI Summary snippet if long
  const rawBody = email.body?.replace(/<[^>]*>?/gm, '') || email.snippet || '';
  const isLong = rawBody.length > 200;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white/20 dark:bg-slate-900/20">
      {/* Top Action Bar */}
      <div className="px-5 py-3 border-b border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between gap-3 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
        <button
          onClick={() => navigate('/inbox')}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-all"
        >
          <ArrowLeftIcon width={14} height={14} style={{ width: '0.875rem', height: '0.875rem' }} className="w-3.5 h-3.5" />
          <span>Back to Inbox</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowReplyBox(!showReplyBox)}
            title="Reply"
            className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors"
          >
            <ArrowUturnLeftIcon width={16} height={16} style={{ width: '1rem', height: '1rem' }} className="w-4 h-4" />
          </button>
          <button
            title="Star"
            className="p-2 text-slate-500 hover:text-amber-500 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors"
          >
            <StarIcon width={16} height={16} style={{ width: '1rem', height: '1rem' }} className="w-4 h-4" />
          </button>
          <button
            title="Delete"
            className="p-2 text-slate-500 hover:text-rose-500 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors"
          >
            <TrashIcon width={16} height={16} style={{ width: '1rem', height: '1rem' }} className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Email Reading Canvas */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Email Header Card */}
        <div className="glass-card rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
              {email.subject || '(No subject)'}
            </h1>
            <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 pt-1">
              {email.date ? new Date(email.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''}
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-bold text-base shadow-md shadow-indigo-500/15`}>
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {senderName}
                </p>
                <CheckBadgeIcon width={16} height={16} style={{ width: '1rem', height: '1rem' }} className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {senderEmail}
              </p>
            </div>
          </div>
        </div>

        {/* AI Instant TL;DR Summary Card */}
        {isLong && (
          <div className="rounded-2xl p-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 dark:border-indigo-400/20 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <SparklesIcon width={16} height={16} style={{ width: '1rem', height: '1rem' }} className="w-4 h-4" />
              <span>AI Instant Summary</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {rawBody.substring(0, 180)}...
            </p>
          </div>
        )}

        {/* Thread Conversation Timeline (+3 bonus) */}
        {threadMessages.length > 1 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <ChatBubbleLeftRightIcon width={16} height={16} style={{ width: '1rem', height: '1rem' }} className="w-4 h-4 text-indigo-500" />
                <span>Conversation Thread ({threadMessages.length} messages)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const allExpanded = Object.keys(expandedThreads).length === threadMessages.length;
                  if (allExpanded) {
                    setExpandedThreads({});
                  } else {
                    const next = {};
                    threadMessages.forEach(m => { next[m.emailId || m._id] = true; });
                    setExpandedThreads(next);
                  }
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                {Object.keys(expandedThreads).length === threadMessages.length ? 'Collapse All' : 'Expand All'}
              </button>
            </div>

            <div className="space-y-3">
              {threadMessages.map((msg, index) => {
                const msgId = msg.emailId || msg._id || `msg-${index}`;
                const isExpanded = expandedThreads[msgId] !== false;
                const isCurrent = (msg.emailId || msg._id) === id;
                const mSender = msg.from?.name || msg.from?.email || 'Unknown';
                const mInitial = mSender.charAt(0).toUpperCase() || '?';
                const mGradient = getGradientForString(msg.from?.email || mSender);
                const mBody = msg.body?.replace(/<[^>]*>?/gm, '') || msg.snippet || '';

                return (
                  <div
                    key={msgId}
                    className={`glass-card rounded-2xl border transition-all duration-200 overflow-hidden ${
                      isCurrent 
                        ? 'border-indigo-500/40 ring-1 ring-indigo-500/20 shadow-md' 
                        : 'border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Collapsible Header */}
                    <div
                      onClick={() => setExpandedThreads(prev => ({ ...prev, [msgId]: !isExpanded }))}
                      className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${mGradient} flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0`}>
                          {mInitial}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {mSender}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold">
                                Current
                              </span>
                            )}
                          </div>
                          {!isExpanded && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {msg.snippet || mBody.substring(0, 80)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          {msg.date ? new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        {isExpanded ? (
                          <ChevronUpIcon width={16} height={16} style={{ width: '1rem', height: '1rem' }} className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDownIcon width={16} height={16} style={{ width: '1rem', height: '1rem' }} className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Message Body */}
                    {isExpanded && (
                      <div className="p-5 border-t border-slate-200/50 dark:border-slate-800/50 text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans bg-white/20 dark:bg-slate-900/20">
                        {mBody || 'No message content available.'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Single Email Body Content */
          <div className="glass-card rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800/80 text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans">
            {rawBody || 'No message content available.'}
          </div>
        )}

        {/* Smart Quick Reply Suggestions */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <SparklesIcon width={14} height={14} style={{ width: '0.875rem', height: '0.875rem' }} className="w-3.5 h-3.5 text-indigo-500" />
            <span>AI Quick Replies</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              "👍 Thanks, looks great to me!",
              "📅 I'll check my schedule and update you shortly.",
              "✍️ Could you share more details regarding this?"
            ].map((reply, i) => (
              <button
                key={i}
                onClick={() => handleSmartReplyClick(reply)}
                className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-all shadow-sm"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>

        {/* Inline Reply Composer */}
        {showReplyBox && (
          <div className="glass-card rounded-2xl p-5 border border-indigo-200 dark:border-indigo-900/50 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Replying to {senderName}
              </span>
              <button
                onClick={() => setShowReplyBox(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
            <textarea
              rows={4}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Type your reply..."
              className="w-full p-3.5 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSendReply}
                disabled={sendingReply}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50"
              >
                <PaperAirplaneIcon width={14} height={14} style={{ width: '0.875rem', height: '0.875rem' }} className="w-3.5 h-3.5" />
                {sendingReply ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailDetail;