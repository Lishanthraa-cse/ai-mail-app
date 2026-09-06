import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { EmailProvider, useEmailContext } from './context/EmailContext';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import InboxList from './components/Inbox/InboxList';
import EmailDetail from './components/Email/EmailDetail';
import EmailCompose from './components/Email/EmailCompose';
import AssistantPanel from './components/Assistant/AssistantPanel';
import { initializeSocket } from './services/socket';
import './styles/App.css';

function AppContent({ 
  isDarkMode, 
  toggleTheme, 
  onLogout, 
  showAssistant, 
  setShowAssistant, 
  selectedEmail, 
  setSelectedEmail 
}) {
  const { showCompose, composeData, openCompose, closeCompose } = useEmailContext();

  // Keyboard shortcut: C to compose (+3 bonus)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInputting = activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.isContentEditable;
      if (isInputting) return;

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        openCompose();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [openCompose]);

  return (
    <div className={`app-container ${isDarkMode ? 'dark' : ''}`}>
      <div className="app-background">
        <div className="app-blob blob-1"></div>
        <div className="app-blob blob-2"></div>
        <div className="app-blob blob-3"></div>
      </div>
      
      <Sidebar 
        onCompose={() => openCompose()}
        onLogout={onLogout}
      />
      
      <div className="app-main">
        <Header 
          toggleTheme={toggleTheme} 
          isDarkMode={isDarkMode}
          onToggleAssistant={() => setShowAssistant(!showAssistant)}
          showAssistant={showAssistant}
        />
        
        <div className="app-content">
          <div className="app-inbox glass">
            <Routes>
              <Route path="/inbox" element={<InboxList onEmailSelect={setSelectedEmail} />} />
              <Route path="/sent" element={<InboxList sent={true} onEmailSelect={setSelectedEmail} />} />
              <Route path="/email/:id" element={<EmailDetail />} />
              <Route path="/" element={<Navigate to="/inbox" />} />
            </Routes>
          </div>
          
          {showAssistant && (
            <div className="app-assistant-wrapper glass">
              <AssistantPanel />
            </div>
          )}
        </div>
      </div>
      
      {showCompose && (
        <EmailCompose 
          onClose={closeCompose}
          initialTo={composeData.to || (selectedEmail?.from?.email || '')}
          initialSubject={composeData.subject || (selectedEmail ? `Re: ${selectedEmail.subject}` : '')}
          initialBody={composeData.body || ''}
        />
      )}
    </div>
  );
}

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showAssistant, setShowAssistant] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (token) {
      localStorage.setItem('token', token);
      setIsAuthenticated(true);
      window.history.replaceState({}, document.title, '/');
      console.log('🔐 Authenticated successfully');
    }

    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setIsAuthenticated(true);
      initializeSocket();
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDarkMode ? 'light' : 'dark');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    window.location.href = '/';
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-background">
          <div className="login-blob blob-1"></div>
          <div className="login-blob blob-2"></div>
          <div className="login-blob blob-3"></div>
        </div>
        <div className="login-card glass">
          <div className="login-icon-wrapper">
            <div className="login-icon-glow"></div>
            <div className="login-icon">✉️</div>
          </div>
          <h1 className="login-title">
            AI-Powered
            <span className="login-title-gradient"> Mail</span>
          </h1>
          <p className="login-subtitle">
            Experience the future of email with AI assistance
          </p>
          <div className="login-features">
            <div className="login-feature">
              <span className="login-feature-icon">🤖</span>
              <span>AI Assistant</span>
            </div>
            <div className="login-feature">
              <span className="login-feature-icon">⚡</span>
              <span>Smart Inbox</span>
            </div>
            <div className="login-feature">
              <span className="login-feature-icon">🔒</span>
              <span>Secure Gmail</span>
            </div>
          </div>
          <div className="space-y-3">
            <a
              href="http://localhost:5000/api/auth/google"
              className="login-button"
            >
              <svg className="login-google-icon" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.478,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
              </svg>
              Sign in with Google
            </a>

            <button
              onClick={() => {
                localStorage.setItem('token', 'demo_preview_token');
                setIsAuthenticated(true);
              }}
              className="w-full py-3 px-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
            >
              <span>✨</span>
              <span>Explore Instant Demo Preview</span>
            </button>
          </div>
          <p className="login-footer">Free • Secure • AI-Powered</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <EmailProvider>
        <AppContent 
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          onLogout={handleLogout}
          showAssistant={showAssistant}
          setShowAssistant={setShowAssistant}
          selectedEmail={selectedEmail}
          setSelectedEmail={setSelectedEmail}
        />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: isDarkMode ? '#1e293b' : '#ffffff',
              color: isDarkMode ? '#f1f5f9' : '#0f172a',
              borderRadius: '12px',
              border: '1px solid',
              borderColor: isDarkMode ? '#334155' : '#e2e8f0',
            },
          }}
        />
      </EmailProvider>
    </Router>
  );
}

export default App;