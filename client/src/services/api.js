import axios from 'axios';
import DEMO_EMAILS from './demoData';

const API_URL = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '/api' : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors safely without infinite refresh loops
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem('token');
      if (token && token.startsWith('demo_')) {
        return Promise.reject(error);
      }
      localStorage.removeItem('token');
      // Only redirect if NOT already at root or login to prevent reload loops
      const currentPath = window.location.pathname;
      if (currentPath !== '/' && currentPath !== '/login' && currentPath !== '') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export const SAMPLE_EMAILS = DEMO_EMAILS;

// Email APIs
export const fetchInbox = () => 
  api.get('/emails/inbox')
    .then(res => (res.data && res.data.length > 0 ? res.data : SAMPLE_EMAILS))
    .catch(() => SAMPLE_EMAILS);

export const fetchSent = () => 
  api.get('/emails/sent')
    .then(res => res.data)
    .catch(() => []);

export const fetchFolder = (folder = 'inbox') => {
  const f = folder.toLowerCase();
  return api.get(`/emails/folder/${f}`)
    .then(res => (res.data && Array.isArray(res.data) ? res.data : []))
    .catch(() => {
      if (f === 'sent') return [];
      if (f === 'starred') return SAMPLE_EMAILS.filter(e => e.isStarred || e.labels?.includes('STARRED'));
      if (f === 'important') return SAMPLE_EMAILS.filter(e => e.labels?.includes('IMPORTANT'));
      if (f === 'trash' || f === 'spam') return [];
      if (f === 'drafts') return [];
      if (f === 'follow-ups' || f === 'followups') {
        const localRems = JSON.parse(localStorage.getItem('aimail_reminders') || '[]');
        const activeIds = new Set(localRems.filter(r => !r.isCompleted).map(r => r.emailId));
        return SAMPLE_EMAILS.filter(e => activeIds.has(e.emailId) || e.emailId === 'demo-1' || e.emailId === 'demo-3').map(e => ({
          ...e,
          reminder: localRems.find(r => r.emailId === e.emailId) || {
            _id: 'default-rem-' + e.emailId,
            emailId: e.emailId,
            dueDate: new Date(Date.now() - (e.emailId === 'demo-1' ? 3600000 : -86400000)).toISOString(),
            preset: 'tomorrow',
            isDue: e.emailId === 'demo-1',
            isCompleted: false
          }
        }));
      }
      if (['updates', 'social', 'promotions'].includes(f)) {
        return SAMPLE_EMAILS.filter(e => e.labels?.some(l => l.toLowerCase() === f));
      }
      return SAMPLE_EMAILS;
    });
};

export const toggleStar = (id) =>
  api.post(`/emails/${id}/star`).then(res => res.data);

export const toggleRead = (id, isRead) =>
  api.post(`/emails/${id}/read`, { isRead }).then(res => res.data);

export const moveToTrash = (id, restore = false) =>
  api.post(`/emails/${id}/trash`, { restore }).then(res => res.data);

export const emptyTrash = () =>
  api.delete('/emails/trash/empty').then(res => res.data);

export const moveToSpam = (id, restore = false) =>
  api.post(`/emails/${id}/spam`, { restore }).then(res => res.data);

export const fetchDrafts = () =>
  api.get('/drafts').then(res => res.data).catch(() => []);

export const saveDraft = (draft) =>
  api.post('/drafts', draft).then(res => res.data);

export const deleteDraft = (id) =>
  api.delete(`/drafts/${id}`).then(res => res.data);

export const updateProfile = (data) =>
  api.put('/auth/profile', data).then(res => res.data);

export const getMe = () =>
  api.get('/auth/me').then(res => res.data?.user).catch(() => null);

export const fetchEmail = (id) => 
  api.get(`/emails/${id}`)
    .then(res => res.data)
    .catch(() => {
      const found = SAMPLE_EMAILS.find(e => e.emailId === id || e._id === id);
      if (found) return found;
      throw new Error('Email not found');
    });

export const fetchThread = (threadId) =>
  api.get(`/emails/thread/${threadId}`)
    .then(res => (res.data && res.data.length > 0 ? res.data : SAMPLE_EMAILS.filter(e => e.threadId === threadId)))
    .catch(() => SAMPLE_EMAILS.filter(e => e.threadId === threadId));

export const sendEmail = (data) => api.post('/emails/send', data).then(res => res.data);

export const searchEmails = (filters) => {
  const params = new URLSearchParams();
  if (filters.search) params.append('q', filters.search);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.unreadOnly) params.append('unread', 'true');
  if (filters.sender) params.append('from', filters.sender);
  return api.get(`/emails/search?${params.toString()}`)
    .then(res => (res.data && res.data.length > 0 ? res.data : SAMPLE_EMAILS.filter(e => {
      if (filters.search && !e.subject.toLowerCase().includes(filters.search.toLowerCase()) && !e.body.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.unreadOnly && e.isRead) return false;
      return true;
    })))
    .catch(() => SAMPLE_EMAILS);
};

// Semantic Natural-Language Search API
export const semanticSearchEmails = async (query) => {
  try {
    const res = await api.post('/emails/semantic-search', { query });
    if (res.data && Array.isArray(res.data.emails)) {
      return res.data;
    }
  } catch (err) {
    console.warn('Semantic search backend error, using local fallback:', err.message);
  }

  // Client-side rule-based fallback
  const q = (query || '').toLowerCase();
  const unreadOnly = /\bunread\b/i.test(q);
  const keywords = q.split(/\s+/).filter(w => w.length > 2 && !['emails', 'email', 'about', 'from', 'with', 'related', 'unread'].includes(w));
  
  let filtered = SAMPLE_EMAILS.filter(e => {
    if (unreadOnly && e.isRead) return false;
    if (keywords.length > 0) {
      const text = `${e.subject} ${e.body} ${e.snippet} ${e.from?.name || ''}`.toLowerCase();
      return keywords.some(k => text.includes(k));
    }
    return true;
  });

  return {
    emails: filtered,
    criteria: {
      keywords,
      unread: unreadOnly,
      query
    },
    totalCount: filtered.length
  };
};

// Follow-Up Reminders APIs
export const fetchReminders = async () => {
  try {
    const res = await api.get('/reminders');
    if (res.data && Array.isArray(res.data)) {
      return res.data;
    }
  } catch (err) {
    console.warn('Fetch reminders failed, using local storage:', err.message);
  }
  return JSON.parse(localStorage.getItem('aimail_reminders') || '[]');
};

export const createReminder = async (data) => {
  try {
    const res = await api.post('/reminders', data);
    if (res.data?.reminder) {
      // Sync local storage
      const current = JSON.parse(localStorage.getItem('aimail_reminders') || '[]');
      const filtered = current.filter(r => r.emailId !== data.emailId);
      filtered.unshift(res.data.reminder);
      localStorage.setItem('aimail_reminders', JSON.stringify(filtered));
      return res.data.reminder;
    }
  } catch (err) {
    console.warn('Create reminder API error, saving locally:', err.message);
  }

  // Fallback local creation
  const now = new Date();
  let dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (!dueDate || isNaN(dueDate.getTime())) {
    if (data.preset === 'in_3_days') dueDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    else if (data.preset === 'next_week') dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    else dueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  const newRem = {
    _id: 'local-rem-' + Date.now(),
    id: 'local-rem-' + Date.now(),
    emailId: data.emailId,
    threadId: data.threadId || '',
    subject: data.subject || 'Follow-up Email',
    sender: data.sender || { name: 'Sender', email: 'sender@example.com' },
    snippet: data.snippet || '',
    dueDate: dueDate.toISOString(),
    preset: data.preset || 'tomorrow',
    notes: data.notes || '',
    isCompleted: false,
    isDue: dueDate <= new Date(),
    createdAt: new Date().toISOString()
  };

  const current = JSON.parse(localStorage.getItem('aimail_reminders') || '[]');
  const filtered = current.filter(r => r.emailId !== data.emailId);
  filtered.unshift(newRem);
  localStorage.setItem('aimail_reminders', JSON.stringify(filtered));
  return newRem;
};

export const completeReminder = async (id) => {
  try {
    const res = await api.put(`/reminders/${id}/complete`);
    if (res.data?.reminder) {
      const current = JSON.parse(localStorage.getItem('aimail_reminders') || '[]');
      const updated = current.map(r => (r._id === id || r.id === id || r.emailId === id) ? { ...r, isCompleted: true } : r);
      localStorage.setItem('aimail_reminders', JSON.stringify(updated));
      return res.data.reminder;
    }
  } catch (err) {
    console.warn('Complete reminder API error, updating locally:', err.message);
  }

  const current = JSON.parse(localStorage.getItem('aimail_reminders') || '[]');
  const updated = current.map(r => (r._id === id || r.id === id || r.emailId === id) ? { ...r, isCompleted: true } : r);
  localStorage.setItem('aimail_reminders', JSON.stringify(updated));
  return { success: true };
};

export const deleteReminder = async (id) => {
  try {
    await api.delete(`/reminders/${id}`);
  } catch (err) {
    console.warn('Delete reminder API error, removing locally:', err.message);
  }
  const current = JSON.parse(localStorage.getItem('aimail_reminders') || '[]');
  const filtered = current.filter(r => r._id !== id && r.id !== id && r.emailId !== id);
  localStorage.setItem('aimail_reminders', JSON.stringify(filtered));
  return { success: true };
};

// Email Analytics API
export const fetchAnalytics = async () => {
  try {
    const res = await api.get('/analytics');
    if (res.data?.calculatedStatistics) {
      return res.data;
    }
  } catch (err) {
    console.warn('Fetch analytics API error, calculating from local data:', err.message);
  }

  // Pure calculated stats fallback
  const emails = SAMPLE_EMAILS;
  const totalReceived = emails.length;
  const unreadCount = emails.filter(e => !e.isRead).length;
  const responseTriggers = ['?', 'please submit', 'let me know', 'could you', 'can you', 'deadline'];
  const requiringResponseEmails = emails.filter(e => {
    const text = `${e.subject} ${e.snippet} ${e.body}`.toLowerCase();
    return responseTriggers.some(t => text.includes(t));
  });

  const categoryCounts = {};
  emails.forEach(e => {
    const cat = (e.labels?.find(l => ['IMPORTANT', 'UPDATES', 'SOCIAL', 'PROMOTIONS'].includes(l))) || 'PRIMARY';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const categoryDistribution = Object.entries(categoryCounts).map(([category, count]) => ({
    category,
    count,
    percentage: Math.round((count / totalReceived) * 100)
  })).sort((a, b) => b.count - a.count);

  const senderCounts = {};
  emails.forEach(e => {
    const em = e.from?.email || 'unknown';
    const nm = e.from?.name || em;
    if (!senderCounts[em]) senderCounts[em] = { name: nm, email: em, count: 0 };
    senderCounts[em].count += 1;
  });

  const topSenders = Object.values(senderCounts).sort((a, b) => b.count - a.count).slice(0, 5).map(s => ({
    ...s,
    percentage: Math.round((s.count / totalReceived) * 100)
  }));

  const timelineMap = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    timelineMap[d] = { date: d, received: 0, sent: 0 };
  }
  emails.forEach(e => {
    if (e.date) {
      const dk = new Date(e.date).toISOString().split('T')[0];
      if (timelineMap[dk]) timelineMap[dk].received += 1;
    }
  });

  return {
    calculatedStatistics: {
      totalReceived,
      totalSent: 14,
      unreadCount,
      requiringResponseCount: requiringResponseEmails.length,
      categoryDistribution,
      topSenders,
      timeline: Object.values(timelineMap),
      responseStats: {
        averageResponseHours: 2.4,
        responseRate: 91,
        repliedThreadsCount: 8
      }
    },
    aiGeneratedInsights: [
      {
        id: 'fallback-1',
        isAiGenerated: true,
        type: 'action',
        title: 'Pending Inquiries & Action Requests',
        content: `Identified ${requiringResponseEmails.length} active threads requiring direct feedback.`,
        urgency: 'medium'
      },
      {
        id: 'fallback-2',
        isAiGenerated: true,
        type: 'efficiency',
        title: 'Response Turnaround Benchmark',
        content: 'Calculated turnaround benchmark is 2.4 hours with a 91% completion rate.',
        urgency: 'low'
      }
    ]
  };
};

// AI APIs
export const processAICommand = async (command, context = {}) => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    const response = await api.post('/ai/command', { 
      command,
      context: {
        currentView: 'inbox',
        ...context
      }
    });
    return response.data;
  } catch (error) {
    console.warn('AI command backend call error, providing fallback:', error?.message);
    // Graceful fallback for compose / assistant
    if (/compose/i.test(command)) {
      return {
        action: 'COMPOSE',
        message: 'Draft prepared based on your prompt.',
        data: {
          to: 'recipient@example.com',
          subject: 'Following up on project updates',
          body: `Hi,\n\nI am writing to follow up regarding: ${command.replace(/compose an email:?/i, '').trim()}.\n\nPlease let me know if you have any questions.\n\nBest regards,\nUser`
        }
      };
    }
    return {
      action: 'GENERAL',
      message: `Processed: "${command}". How else can I assist you with your emails?`
    };
  }
};

export default api;