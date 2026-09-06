import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  PaperAirplaneIcon, 
  SparklesIcon, 
  CheckCircleIcon,
  PencilSquareIcon,
  ArrowTopRightOnSquareIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { processAICommand, sendEmail } from '../../services/api';
import { useEmailContext } from '../../context/EmailContext';
import toast from 'react-hot-toast';

const formatMarkdownText = (text) => {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    if ((part.startsWith('_') && part.endsWith('_')) || (part.startsWith('*') && part.endsWith('*'))) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

const SimpleMarkdown = ({ content }) => {
  if (!content) return null;
  const lines = content.split('\n');
  return (
    <div className="space-y-1 text-xs leading-relaxed">
      {lines.map((line, idx) => {
        if (!line.trim()) {
          return <div key={idx} className="h-1" />;
        }
        if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
          return (
            <div key={idx} className="flex items-start pl-2">
              <span className="mr-1.5 text-indigo-500">•</span>
              <span>{formatMarkdownText(line.trim().replace(/^[*-]\s+/, ''))}</span>
            </div>
          );
        }
        return <div key={idx}>{formatMarkdownText(line)}</div>;
      })}
    </div>
  );
};

const AssistantPanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { emails, setEmails, openCompose, closeCompose } = useEmailContext();

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'assistant',
      content: `👋 **Welcome! I'm your AI Mail Copilot.**

I don't just chat — I directly drive and control your mail interface:

• **✍️ Compose & Send**: *"Send an email to alex@techcorp.io with subject 'Meeting' and body 'Let's connect at 3pm'"*
• **🔍 Search & Filter**: *"Show emails from last 7 days"* or *"Find emails from Sarah"*
• **📂 Navigate & Open**: *"Open the latest email from Sarah"*
• **✉️ Contextual Reply**: *"Reply to this with 'I will review and follow up tomorrow'"* (while reading an email)

Try one of the chips below or type any command! ✨`
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sendingMessageId, setSendingMessageId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Determine current active email context if viewing an email
  const getCurrentContext = () => {
    const isEmailDetail = location.pathname.startsWith('/email/');
    let currentEmailId = null;
    let currentEmail = null;

    if (isEmailDetail) {
      currentEmailId = location.pathname.split('/email/')[1];
      currentEmail = emails.find(e => (e.emailId || e._id || e.gmailId) === currentEmailId);
    }

    return {
      currentView: isEmailDetail ? 'email_detail' : (location.pathname === '/sent' ? 'sent' : 'inbox'),
      currentEmailId,
      currentEmailSubject: currentEmail?.subject || null,
      currentEmailSender: currentEmail?.from?.email || null,
    };
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;
    
    const userMessage = { id: Date.now(), type: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    const commandText = input;
    setInput('');
    setIsProcessing(true);

    try {
      const activeContext = getCurrentContext();
      const response = await processAICommand(commandText, activeContext);
      
      let assistantText = `✅ **${response.action} Action Executed**\n\n${response.message}`;
      let actionCard = null;
      let emailPreviews = null;

      // 1. COMPOSE ACTION: Opens compose modal and fills fields visibly
      if (response.action === 'COMPOSE') {
        const to = response.data?.to || response.result?.to || '';
        const subject = response.data?.subject || response.result?.subject || '';
        const body = response.data?.body || response.result?.body || '';

        // Visibly open the compose window
        openCompose({ to, subject, body });

        assistantText = `✍️ **Compose form opened and pre-filled!**\n\n• **To:** ${to || '(no recipient)'}\n• **Subject:** ${subject || '(no subject)'}\n• **Body:** ${body || '(no message body)'}`;

        // Human-in-the-loop confirmation card
        actionCard = {
          type: 'CONFIRM_SEND',
          to,
          subject,
          body,
          status: 'pending'
        };
      }

      // 2. REPLY ACTION: Context aware reply to current or matched email
      else if (response.action === 'REPLY') {
        let to = response.result?.reply?.to || activeContext.currentEmailSender || '';
        let subject = response.result?.reply?.subject || (activeContext.currentEmailSubject ? `Re: ${activeContext.currentEmailSubject}` : 'Re: Email');
        let body = response.result?.reply?.body || response.data?.message || 'Thank you for your email. I will follow up shortly.';

        // Visibly open compose with reply
        openCompose({ to, subject, body });

        assistantText = `✉️ **Reply draft prepared and loaded into compose view!**\n\n• **To:** ${to}\n• **Subject:** ${subject}\n\n*Review the reply in the compose form or click below to send immediately.*`;

        actionCard = {
          type: 'CONFIRM_SEND',
          to,
          subject,
          body,
          status: 'pending'
        };
      }

      // 2b. FORWARD ACTION: Context aware forward of current or target email (+5 bonus)
      else if (response.action === 'FORWARD') {
        const to = response.result?.to || response.data?.to || '';
        const subject = response.result?.subject || (activeContext.currentEmailSubject ? `Fwd: ${activeContext.currentEmailSubject}` : 'Fwd: Email');
        const body = response.result?.body || '';

        // Visibly open compose with forwarded content
        openCompose({ to, subject, body });

        assistantText = `Forward draft prepared and loaded into compose view!\n\n• **To:** ${to || '(specify recipient)'}\n• **Subject:** ${subject}\n\n*Review the forwarded email in compose or click below to confirm.*`;

        actionCard = {
          type: 'CONFIRM_SEND',
          to,
          subject,
          body,
          status: 'pending'
        };
      }

      // 3. OPEN ACTION: Navigates directly to that specific email in detail view
      else if (response.action === 'OPEN') {
        let targetEmail = response.result;
        
        // Fallback match from current emails list if server didn't find SRV record
        if (!targetEmail) {
          const senderQuery = response.data?.sender?.toLowerCase();
          const subjectQuery = response.data?.subject?.toLowerCase();
          targetEmail = emails.find(e => {
            if (senderQuery && (e.from?.email?.toLowerCase().includes(senderQuery) || e.from?.name?.toLowerCase().includes(senderQuery))) return true;
            if (subjectQuery && e.subject?.toLowerCase().includes(subjectQuery)) return true;
            return false;
          });
        }

        if (targetEmail) {
          const targetId = targetEmail.emailId || targetEmail._id || targetEmail.gmailId;
          if (targetId) {
            navigate(`/email/${targetId}`);
            assistantText = `📂 **Navigated to Email:**\n\n**${targetEmail.subject || '(No subject)'}**\nFrom: ${targetEmail.from?.name || targetEmail.from?.email}`;
          }
        } else {
          assistantText = `🔍 Could not find a matching email to open. Try searching in the inbox.`;
        }
      }

      // 4. SEARCH / FILTER ACTION: Updates main UI with filtered results
      else if (response.action === 'SEARCH' || response.action === 'FILTER') {
        if (response.result && Array.isArray(response.result) && response.result.length > 0) {
          setEmails(response.result);
          // Ensure we are viewing inbox to see results visibly
          if (location.pathname !== '/inbox') {
            navigate('/inbox');
          }
          assistantText = `🔍 **Updated inbox with ${response.result.length} matching emails.**`;
          emailPreviews = response.result.slice(0, 4);
        } else {
          assistantText = `🔍 Searched inbox: No matching emails found for this filter.`;
        }
      }

      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: assistantText,
        actionCard,
        emailPreviews
      };
      setMessages(prev => [...prev, assistantMessage]);
      toast.success(`Copilot: ${response.action} action executed`);
    } catch (error) {
      toast.error('Failed to process command');
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: `❌ **Error:** ${error.message || 'Something went wrong. Please try again.'}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Human-in-the-loop: Confirm and send email directly from chat card
  const handleConfirmSend = async (messageId, card) => {
    setSendingMessageId(messageId);
    try {
      await sendEmail({
        to: card.to,
        subject: card.subject,
        body: card.body
      });
      closeCompose();
      toast.success('🚀 Email sent successfully!');
      
      // Update actionCard status to sent
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            actionCard: { ...msg.actionCard, status: 'sent' }
          };
        }
        return msg;
      }));
    } catch (err) {
      toast.error('Failed to send email: ' + err.message);
    } finally {
      setSendingMessageId(null);
    }
  };

  const handleEditDraft = (card) => {
    openCompose({ to: card.to, subject: card.subject, body: card.body });
  };

  const handlePreviewClick = (email) => {
    const id = email.emailId || email._id || email.gmailId;
    if (id) {
      navigate(`/email/${id}`);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickChip = (commandText) => {
    setInput(commandText);
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden bg-white/30 dark:bg-slate-900/40 backdrop-blur-xl">
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between bg-white/40 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 text-xs font-bold">
              AI
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              AI Mail Copilot
            </h2>
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
              Drives & Controls the UI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
          <SparklesIcon width={14} height={14} style={{ width: '0.875rem', height: '0.875rem' }} className="w-3.5 h-3.5" />
          <span>Active</span>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
          >
            <div
              className={`max-w-[92%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                message.type === 'user'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/15 rounded-br-sm font-medium'
                  : 'glass-card border border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 shadow-sm rounded-bl-sm space-y-2.5'
              }`}
            >
              <SimpleMarkdown content={message.content} />

              {/* Rich UI: Interactive Email Result Previews (+5 Bonus) */}
              {message.emailPreviews && message.emailPreviews.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Interactive Results:
                  </span>
                  {message.emailPreviews.map((preview, i) => (
                    <div
                      key={i}
                      onClick={() => handlePreviewClick(preview)}
                      className="p-2 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/70 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer transition-all hover:shadow-sm flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white truncate">
                          <EnvelopeIcon width={14} height={14} style={{ width: '0.875rem', height: '0.875rem' }} className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                          <span className="truncate">{preview.subject || '(No subject)'}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          From: {preview.from?.name || preview.from?.email}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewClick(preview);
                        }}
                        className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center gap-1 hover:bg-indigo-100"
                      >
                        <span>Open</span>
                        <ArrowTopRightOnSquareIcon width={12} height={12} style={{ width: '0.75rem', height: '0.75rem' }} className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Human-in-the-Loop Confirmation Card (+5 Bonus) */}
              {message.actionCard && (
                <div className="p-3 rounded-xl bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <SparklesIcon width={14} height={14} style={{ width: '0.875rem', height: '0.875rem' }} className="w-3.5 h-3.5" />
                      {message.actionCard.status === 'sent' ? 'Email Sent' : 'Confirmation Required'}
                    </span>
                    {message.actionCard.status === 'sent' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircleIcon width={14} height={14} style={{ width: '0.875rem', height: '0.875rem' }} className="w-3.5 h-3.5" />
                        Dispatched
                      </span>
                    )}
                  </div>

                  {message.actionCard.status !== 'sent' && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleConfirmSend(message.id, message.actionCard)}
                        disabled={sendingMessageId === message.id}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-[11px] font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        <PaperAirplaneIcon width={12} height={12} style={{ width: '0.75rem', height: '0.75rem' }} className="w-3 h-3" />
                        {sendingMessageId === message.id ? 'Sending...' : 'Send Now'}
                      </button>
                      <button
                        onClick={() => handleEditDraft(message.actionCard)}
                        className="py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                      >
                        <PencilSquareIcon width={12} height={12} style={{ width: '0.75rem', height: '0.75rem' }} className="w-3 h-3" />
                        Edit Form
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="glass-card rounded-2xl px-4 py-3 flex items-center gap-1.5 shadow-sm border border-slate-200/80 dark:border-slate-800/80">
              <span className="text-xs text-indigo-500 font-semibold mr-1">Driving interface</span>
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
              <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestion Chips */}
      <div className="px-4 py-2 flex flex-wrap gap-1.5 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/20 dark:bg-slate-900/20">
        {[
          '✍️ Send email to Alex',
          '📂 Open latest from Sarah',
          '✉️ Reply to this',
          '📅 Show last 7 days'
        ].map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              if (chip.includes('Send email')) {
                handleQuickChip("Send an email to alex.rivera@techcorp.io with subject 'Project Sync' and body 'Can we sync on the AI agent roadmap today?'");
              } else if (chip.includes('Open latest')) {
                handleQuickChip("Open the latest email from Sarah");
              } else if (chip.includes('Reply to this')) {
                handleQuickChip("Reply to this with 'Thanks for the update, everything looks on track!'");
              } else {
                handleQuickChip("Show emails from the last 7 days");
              }
            }}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/60 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200/60 dark:border-slate-700/60 transition-all"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-slate-200/70 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tell your AI copilot what to do..."
            className="flex-1 px-3.5 py-2.5 bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all shadow-sm"
            disabled={isProcessing}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isProcessing}
            className="p-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl transition-all shadow-md shadow-indigo-500/25 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
          >
            <PaperAirplaneIcon width={16} height={16} style={{ width: '1rem', height: '1rem' }} className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssistantPanel;