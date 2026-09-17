import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { 
  fetchInbox, 
  fetchSent, 
  fetchFolder, 
  toggleStar, 
  toggleRead, 
  moveToTrash, 
  emptyTrash, 
  moveToSpam, 
  fetchDrafts, 
  saveDraft, 
  deleteDraft, 
  updateProfile, 
  getMe, 
  searchEmails,
  semanticSearchEmails,
  fetchReminders,
  createReminder,
  completeReminder,
  deleteReminder
} from '../services/api';
import { getSocket, initializeSocket } from '../services/socket';

const EmailContext = createContext();

export const useEmailContext = () => useContext(EmailContext);

export const EmailProvider = ({ children }) => {
  const [emails, setEmails] = useState([]);
  const [activeEmail, setActiveEmail] = useState(null);
  const [currentType, setCurrentType] = useState('inbox');
  const currentTypeRef = useRef('inbox');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [reminderModalEmail, setReminderModalEmail] = useState(null);
  const [semanticCriteria, setSemanticCriteria] = useState(null);
  const [dueNotification, setDueNotification] = useState(null);
  
  // User profile & preferences state
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('user_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      name: 'User Account',
      email: 'user@aimail.com',
      signature: '--\nBest regards,\nUser Account',
      autoAdvance: true,
      desktopNotify: true
    };
  });

  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    unreadOnly: false,
    sender: ''
  });

  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState({ to: '', subject: '', body: '', draftId: null });

  // Load user profile on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getMe().then(user => {
        if (user) {
          setUserProfile(prev => {
            const updated = {
              ...prev,
              name: user.name || prev.name,
              email: user.email || prev.email,
              picture: user.picture || prev.picture,
              signature: user.signature || prev.signature
            };
            try {
              localStorage.setItem('user_profile', JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        }
      });
    }
  }, []);

  const openCompose = (initialData = {}) => {
    const initialBody = initialData.body !== undefined 
      ? initialData.body 
      : (userProfile.signature ? `\n\n${userProfile.signature}` : '');

    setComposeData({
      to: initialData.to || '',
      subject: initialData.subject || '',
      body: initialBody,
      draftId: initialData.draftId || null
    });
    setShowCompose(true);
  };

  const closeCompose = () => {
    setShowCompose(false);
    setComposeData({ to: '', subject: '', body: '', draftId: null });
  };

  const loadEmails = useCallback(async (type = 'inbox', showLoading = true) => {
    currentTypeRef.current = type;
    setCurrentType(type);
    if (showLoading) {
      setLoading(true);
      setError(null);
    }
    try {
      let data;
      if (type === 'inbox') {
        data = await fetchInbox();
      } else if (type === 'sent') {
        data = await fetchSent();
      } else if (type === 'drafts') {
        data = await fetchDrafts();
        setDrafts(data || []);
      } else {
        data = await fetchFolder(type);
      }

      // Sync reminders and enrich emails
      let currentRems = [];
      try {
        currentRems = await fetchReminders();
        setReminders(currentRems || []);
      } catch (e) {}

      const remMap = new Map();
      (currentRems || []).forEach(r => {
        if (!r.isCompleted) {
          remMap.set(r.emailId, { ...r, isDue: new Date(r.dueDate) <= new Date() });
        }
      });

      const enriched = (data || []).map(e => ({
        ...e,
        reminder: e.reminder || remMap.get(e.emailId || e._id)
      }));

      setEmails(enriched);
    } catch (err) {
      if (showLoading) {
        setError(err.message || 'Failed to load emails');
      }
      console.error('Error loading emails:', err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  // Email Actions
  const toggleStarAction = async (email) => {
    const id = email.emailId || email._id || email.gmailId;
    const nextVal = !(email.isStarred || email.labels?.includes('STARRED'));

    // Optimistic UI update
    setEmails(prev => prev.map(e => {
      const match = (e.emailId && e.emailId === id) || (e._id && e._id === id);
      if (!match) return e;
      const newLabels = nextVal 
        ? [...(e.labels || []).filter(l => l !== 'STARRED'), 'STARRED']
        : (e.labels || []).filter(l => l !== 'STARRED');
      return { ...e, isStarred: nextVal, labels: newLabels };
    }));

    try {
      await toggleStar(id);
    } catch (e) {
      console.error('Failed to toggle star:', e);
    }
  };

  const toggleReadAction = async (email, markAsRead) => {
    const id = email.emailId || email._id || email.gmailId;
    const nextRead = markAsRead !== undefined ? markAsRead : !email.isRead;

    // Optimistic UI update
    setEmails(prev => prev.map(e => {
      const match = (e.emailId && e.emailId === id) || (e._id && e._id === id);
      if (!match) return e;
      return { ...e, isRead: nextRead };
    }));

    try {
      await toggleRead(id, nextRead);
    } catch (e) {
      console.error('Failed to toggle read state:', e);
    }
  };

  const moveToTrashAction = async (email, restore = false) => {
    const id = email.emailId || email._id || email.gmailId;

    if (!restore && currentTypeRef.current !== 'trash') {
      setEmails(prev => prev.filter(e => (e.emailId !== id && e._id !== id)));
    } else if (restore && currentTypeRef.current === 'trash') {
      setEmails(prev => prev.filter(e => (e.emailId !== id && e._id !== id)));
    }

    try {
      await moveToTrash(id, restore);
    } catch (e) {
      console.error('Failed to move to trash:', e);
    }
  };

  const emptyTrashAction = async () => {
    setEmails([]);
    try {
      await emptyTrash();
    } catch (e) {
      console.error('Failed to empty trash:', e);
    }
  };

  const moveToSpamAction = async (email, restore = false) => {
    const id = email.emailId || email._id || email.gmailId;

    if (!restore && currentTypeRef.current !== 'spam') {
      setEmails(prev => prev.filter(e => (e.emailId !== id && e._id !== id)));
    } else if (restore && currentTypeRef.current === 'spam') {
      setEmails(prev => prev.filter(e => (e.emailId !== id && e._id !== id)));
    }

    try {
      await moveToSpam(id, restore);
    } catch (e) {
      console.error('Failed to move to spam:', e);
    }
  };

  const saveDraftAction = async (draft) => {
    try {
      const res = await saveDraft(draft);
      setDrafts(prev => {
        const id = res._id || res.emailId;
        const exists = prev.findIndex(d => (d._id === id || d.emailId === id));
        if (exists >= 0) {
          const updated = [...prev];
          updated[exists] = res;
          return updated;
        }
        return [res, ...prev];
      });
      return res;
    } catch (e) {
      console.error('Failed to save draft:', e);
      throw e;
    }
  };

  const deleteDraftAction = async (id) => {
    setDrafts(prev => prev.filter(d => d._id !== id && d.emailId !== id));
    if (currentTypeRef.current === 'drafts') {
      setEmails(prev => prev.filter(d => d._id !== id && d.emailId !== id));
    }
    try {
      await deleteDraft(id);
    } catch (e) {
      console.error('Failed to delete draft:', e);
    }
  };

  const updateUserProfileAction = async (newProfile) => {
    setUserProfile(newProfile);
    try {
      localStorage.setItem('user_profile', JSON.stringify(newProfile));
      await updateProfile(newProfile);
    } catch (e) {
      console.error('Failed to update profile:', e);
    }
  };

  const searchEmailsWithFilters = async () => {
    setLoading(true);
    try {
      const results = await searchEmails(filters);
      setEmails(results);
    } catch (err) {
      setError(err.message || 'Search failed');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reminders Actions
  const openReminderModal = (email) => {
    setReminderModalEmail(email);
  };

  const closeReminderModal = () => {
    setReminderModalEmail(null);
  };

  const createReminderAction = async (data) => {
    try {
      const saved = await createReminder(data);
      setReminders(prev => {
        const filtered = prev.filter(r => r.emailId !== data.emailId);
        return [saved, ...filtered];
      });
      // Attach reminder to email in state
      setEmails(prev => prev.map(e => {
        const id = e.emailId || e._id;
        if (id === data.emailId) {
          return {
            ...e,
            reminder: {
              ...saved,
              isDue: new Date(saved.dueDate) <= new Date()
            }
          };
        }
        return e;
      }));
      return saved;
    } catch (e) {
      console.error('Failed to create reminder:', e);
      throw e;
    }
  };

  const completeReminderAction = async (id, emailId) => {
    try {
      await completeReminder(id || emailId);
      setReminders(prev => prev.map(r => (r._id === id || r.id === id || r.emailId === emailId) ? { ...r, isCompleted: true, isDue: false } : r));
      setEmails(prev => prev.map(e => {
        const match = (e.emailId && e.emailId === emailId) || (e._id && e._id === emailId);
        if (match && e.reminder) {
          return { ...e, reminder: { ...e.reminder, isCompleted: true, isDue: false } };
        }
        return e;
      }));
    } catch (e) {
      console.error('Failed to complete reminder:', e);
    }
  };

  const deleteReminderAction = async (id, emailId) => {
    try {
      await deleteReminder(id || emailId);
      setReminders(prev => prev.filter(r => r._id !== id && r.id !== id && r.emailId !== emailId));
      setEmails(prev => prev.map(e => {
        const match = (e.emailId && e.emailId === emailId) || (e._id && e._id === emailId);
        if (match) {
          const clone = { ...e };
          delete clone.reminder;
          return clone;
        }
        return e;
      }));
    } catch (e) {
      console.error('Failed to delete reminder:', e);
    }
  };

  // Semantic Natural-Language Search
  const runSemanticSearch = async (query) => {
    if (!query || !query.trim()) {
      clearSemanticSearch();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await semanticSearchEmails(query);
      setSemanticCriteria(res.criteria);
      setEmails(res.emails || []);
    } catch (err) {
      setError(err.message || 'Semantic search failed');
    } finally {
      setLoading(false);
    }
  };

  const clearSemanticSearch = () => {
    setSemanticCriteria(null);
    loadEmails(currentTypeRef.current);
  };

  const dismissDueNotification = () => {
    setDueNotification(null);
  };

  // Check for due reminders periodically
  useEffect(() => {
    const checkReminders = () => {
      const due = reminders.filter(r => !r.isCompleted && new Date(r.dueDate) <= new Date());
      if (due.length > 0) {
        const latest = due[0];
        setDueNotification({
          id: latest._id || latest.id || latest.emailId,
          emailId: latest.emailId,
          subject: latest.subject,
          notes: latest.notes,
          dueDate: latest.dueDate
        });
      }
    };

    checkReminders();
    const timer = setInterval(checkReminders, 20000);
    return () => clearInterval(timer);
  }, [reminders]);

  const dueRemindersCount = reminders.filter(r => !r.isCompleted && new Date(r.dueDate) <= new Date()).length;

  useEffect(() => {
    // Initialize socket connection
    initializeSocket();
    const socket = getSocket();
    
    // Listen for real-time email updates
    if (socket) {
      socket.on('new-email', (newEmail) => {
        if (currentTypeRef.current === 'inbox') {
          setEmails(prev => {
            const exists = prev.some(e => 
              (e.emailId && newEmail.emailId && e.emailId === newEmail.emailId) || 
              (e._id && newEmail._id && e._id === newEmail._id)
            );
            if (exists) return prev;
            return [newEmail, ...prev];
          });
        }
      });
      
      socket.on('emails-synced', () => {
        loadEmails(currentTypeRef.current, false);
      });
    }

    // Safety fallback: silent background poll every 25 seconds
    const pollInterval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token) {
        loadEmails(currentTypeRef.current, false);
      }
    }, 25000);
    
    return () => {
      clearInterval(pollInterval);
      const socket = getSocket();
      if (socket) {
        socket.off('new-email');
        socket.off('emails-synced');
      }
    };
  }, [loadEmails]);

  const value = {
    emails,
    activeEmail,
    setActiveEmail,
    currentType,
    loading,
    error,
    filters,
    setFilters,
    drafts,
    userProfile,
    loadEmails,
    searchEmailsWithFilters,
    setEmails,
    showCompose,
    composeData,
    openCompose,
    closeCompose,
    toggleStar: toggleStarAction,
    toggleRead: toggleReadAction,
    moveToTrash: moveToTrashAction,
    emptyTrash: emptyTrashAction,
    moveToSpam: moveToSpamAction,
    saveDraft: saveDraftAction,
    deleteDraft: deleteDraftAction,
    updateProfile: updateUserProfileAction,
    // Reminders & Follow-ups
    reminders,
    dueRemindersCount,
    reminderModalEmail,
    openReminderModal,
    closeReminderModal,
    createReminder: createReminderAction,
    completeReminder: completeReminderAction,
    deleteReminder: deleteReminderAction,
    dueNotification,
    dismissDueNotification,
    // Semantic Natural-Language Search
    semanticCriteria,
    runSemanticSearch,
    clearSemanticSearch
  };

  return (
    <EmailContext.Provider value={value}>
      {children}
    </EmailContext.Provider>
  );
};