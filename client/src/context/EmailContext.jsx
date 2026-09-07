import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { fetchInbox, fetchSent, searchEmails } from '../services/api';
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
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    unreadOnly: false,
    sender: ''
  });

  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });

  const openCompose = (initialData = {}) => {
    setComposeData({
      to: initialData.to || '',
      subject: initialData.subject || '',
      body: initialData.body || ''
    });
    setShowCompose(true);
  };

  const closeCompose = () => {
    setShowCompose(false);
    setComposeData({ to: '', subject: '', body: '' });
  };

  const loadEmails = async (type = 'inbox', showLoading = true) => {
    currentTypeRef.current = type;
    setCurrentType(type);
    if (showLoading) {
      setLoading(true);
      setError(null);
    }
    try {
      let data;
      if (type === 'sent') {
        data = await fetchSent();
      } else {
        data = await fetchInbox();
      }
      setEmails(data);
      console.log(`📥 Loaded ${data.length} emails from ${type}`);
    } catch (err) {
      if (showLoading) {
        setError(err.message || 'Failed to load emails');
      }
      console.error('❌ Error loading emails:', err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const searchEmailsWithFilters = async () => {
    setLoading(true);
    try {
      const results = await searchEmails(filters);
      setEmails(results);
      console.log(`🔍 Search found ${results.length} emails`);
    } catch (err) {
      setError(err.message || 'Search failed');
      console.error('❌ Search error:', err);
    } finally {
      setLoading(false);
    }
  };

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
        console.log('📨 New email received in real-time:', newEmail.subject);
      });
      
      socket.on('emails-synced', ({ count } = {}) => {
        // Silently reload current view in background
        loadEmails(currentTypeRef.current, false);
        console.log(`🔄 Real-time auto-sync completed`);
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
  }, []);

  const value = {
    emails,
    activeEmail,
    setActiveEmail,
    currentType,
    loading,
    error,
    filters,
    setFilters,
    loadEmails,
    searchEmailsWithFilters,
    setEmails,
    showCompose,
    composeData,
    openCompose,
    closeCompose
  };

  return (
    <EmailContext.Provider value={value}>
      {children}
    </EmailContext.Provider>
  );
};