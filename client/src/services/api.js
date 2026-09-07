import axios from 'axios';

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

export const SAMPLE_EMAILS = [
  {
    emailId: 'demo-1',
    threadId: 'thread-q4-ai-roadmap',
    threadCount: 2,
    from: { name: 'Alex Rivera', email: 'alex.rivera@techcorp.io' },
    subject: 'Quarterly AI Roadmap & Integration Strategy',
    snippet: 'Hey team, I put together the draft for our upcoming Q4 AI agent rollout. Please take a look at the attached doc before our sync tomorrow at 10 AM.',
    body: 'Hey team,\n\nI put together the draft for our upcoming Q4 AI agent rollout. Please take a look at the attached doc before our sync tomorrow at 10 AM.\n\nKey highlights:\n- Direct LLM function calling for inbox actions\n- Sub-second UI paint response\n- Automated draft generation and summary\n\nLooking forward to your feedback!\n\nBest,\nAlex Rivera\nVP of Product, TechCorp',
    date: new Date(Date.now() - 45 * 60000).toISOString(),
    isRead: false,
    labels: ['INBOX', 'IMPORTANT']
  },
  {
    emailId: 'demo-1-reply',
    threadId: 'thread-q4-ai-roadmap',
    from: { name: 'Elena Rostova', email: 'elena@techcorp.io' },
    to: [{ name: 'Alex Rivera', email: 'alex.rivera@techcorp.io' }, { name: 'You', email: 'user@aimail.com' }],
    subject: 'Re: Quarterly AI Roadmap & Integration Strategy',
    snippet: 'I reviewed the proposal and strongly agree with the direct LLM approach.',
    body: 'Hi Alex,\n\nI reviewed the proposal and strongly agree with the direct LLM approach. We should ensure sub-second latency for UI form filling and keep the fallback intent parser resilient.\n\nI will prepare the telemetry benchmarks ahead of the 10 AM sync.\n\nBest,\nElena Rostova\nLead AI Architect',
    date: new Date(Date.now() - 15 * 60000).toISOString(),
    isRead: true,
    labels: ['INBOX']
  },
  {
    emailId: 'demo-2',
    threadId: 'thread-design-review',
    from: { name: 'Sarah Chen', email: 'sarah.c@designsystems.dev' },
    subject: 'Design Review: Glassmorphic UI & Micro-Interactions',
    snippet: 'The new frosted glass components and micro-interactions look incredible! Loved the vibrant gradient avatars and instant AI replies.',
    body: 'Hi everyone,\n\nThe new frosted glass components and micro-interactions look incredible! Loved the vibrant gradient avatars and instant AI replies.\n\nThe typography contrasts nicely against both light and dark themes, and all buttons pass accessibility guidelines.\n\nLet me know when the final build is deployed.\n\nCheers,\nSarah Chen',
    date: new Date(Date.now() - 2 * 3600000).toISOString(),
    isRead: false,
    labels: ['INBOX']
  },
  {
    emailId: 'demo-3',
    threadId: 'thread-stripe-billing',
    from: { name: 'Stripe Billing', email: 'invoices@stripe.com' },
    subject: 'Invoice #INV-2026-0906 for Workspace Pro',
    snippet: 'Your invoice for the period Sep 1 – Sep 30 is ready. The amount of $49.00 has been charged to your default payment card.',
    body: 'Hello,\n\nYour monthly subscription for AI Mail Workspace Pro has renewed. The amount of $49.00 has been charged successfully.\n\nSummary:\n- AI Assistant Unlimited Actions\n- Real-time Gmail Sync\n- Priority Support\n\nThank you for choosing AI Mail!\n\nStripe Payments Team',
    date: new Date(Date.now() - 22 * 3600000).toISOString(),
    isRead: true,
    labels: ['INBOX', 'FINANCE']
  },
  {
    emailId: 'demo-4',
    threadId: 'thread-security-alert',
    from: { name: 'Google Cloud Security', email: 'no-reply@accounts.google.com' },
    subject: 'Security Alert: New sign-in detected on Windows',
    snippet: 'We noticed a new login to your Google Account from Windows 11. If this was you, no further action is required.',
    body: 'Hi User,\n\nA new login was detected from your Windows workstation.\n\nDevice: Windows 11 Desktop\nLocation: Localhost\n\nIf you recognize this activity, you can safely ignore this notification.\n\nGoogle Cloud Security Team',
    date: new Date(Date.now() - 48 * 3600000).toISOString(),
    isRead: true,
    labels: ['INBOX', 'SECURITY']
  }
];

// Email APIs
export const fetchInbox = () => 
  api.get('/emails/inbox')
    .then(res => (res.data && res.data.length > 0 ? res.data : SAMPLE_EMAILS))
    .catch(() => SAMPLE_EMAILS);

export const fetchSent = () => 
  api.get('/emails/sent')
    .then(res => res.data)
    .catch(() => []);

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