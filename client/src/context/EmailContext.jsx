import React, { createContext, useState, useContext, useEffect } from 'react';
import { fetchInbox, fetchSent, searchEmails } from '../services/api';
import { getSocket, initializeSocket } from '../services/socket';

const EmailContext = createContext();

export const useEmailContext = () => useContext(EmailContext);

export const EmailProvider = ({ children }) => {
  const [emails, setEmails] = useState([]);
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

  const loadEmails = async (type = 'inbox') => {
    setLoading(true);
    setError(null);
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
      setError(err.message || 'Failed to load emails');
      console.error('❌ Error loading emails:', err);
    } finally {
      setLoading(false);
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
        setEmails(prev => [newEmail, ...prev]);
        console.log('📨 New email received real-time');
      });
      
      socket.on('emails-synced', ({ count }) => {
        loadEmails();
        console.log(`🔄 Synced ${count} emails`);
      });
    }
    
    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off('new-email');
        socket.off('emails-synced');
      }
    };
  }, []);

  const value = {
    emails,
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