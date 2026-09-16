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
    console.error('AI command error:', error);
    throw error;
  }
};

export default api;