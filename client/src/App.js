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
  const { showCompose, composeData, openCompose, closeCompose, activeEmail } = useEmailContext();

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
      {/* Animated Background */}
      <div className="app-background">
        <div className="app-blob blob-1"></div>
        <div className="app-blob blob-2"></div>
        <div className="app-blob blob-3"></div>
        <div className="app-blob blob-4"></div>
        <div className="app-grid-overlay"></div>
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
          initialTo={composeData.to || (activeEmail?.from?.email || selectedEmail?.from?.email || '')}
          initialSubject={composeData.subject || (activeEmail ? (activeEmail.subject?.startsWith('Re:') ? activeEmail.subject : `Re: ${activeEmail.subject}`) : (selectedEmail ? `Re: ${selectedEmail.subject}` : ''))}
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
  const [isLoading, setIsLoading] = useState(true);

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

    // Simulate loading
    setTimeout(() => setIsLoading(false), 500);
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

  if (isLoading) {
    return (
      <div className="login-container">
        <div className="login-background">
          <div className="login-blob blob-1"></div>
          <div className="login-blob blob-2"></div>
          <div className="login-blob blob-3"></div>
        </div>
        <div className="loading-screen">
          <div className="loading-spinner-container">
            <div className="loading-spinner-ring"></div>
            <div className="loading-spinner-ring ring-2"></div>
            <div className="loading-spinner-ring ring-3"></div>
            <div className="loading-icon">✉️</div>
          </div>
          <p className="loading-text">Loading your AI-powered mailbox...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-background">
          <div className="login-blob blob-1"></div>
          <div className="login-blob blob-2"></div>
          <div className="login-blob blob-3"></div>
          <div className="login-blob blob-4"></div>
          <div className="login-grid-overlay"></div>
        </div>
        <div className="login-card glass animate-fade-in-up">
          {/* Decorative corner accents */}
          <div className="login-corner corner-tl"></div>
          <div className="login-corner corner-tr"></div>
          <div className="login-corner corner-bl"></div>
          <div className="login-corner corner-br"></div>
          
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
              <svg className="login-google-icon" width={20} height={20} style={{ width: 20, height: 20 }} viewBox="0 0 24 24">
                <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.478,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
              </svg>
              Sign in with Google
            </a>

            <div className="login-divider">
              <span className="login-divider-line"></span>
              <span className="login-divider-text">or</span>
              <span className="login-divider-line"></span>
            </div>

            <button
              onClick={() => {
                localStorage.setItem('token', 'demo_preview_token');
                setIsAuthenticated(true);
              }}
              className="login-demo-button"
            >
              <span className="login-demo-icon">✨</span>
              <span>Explore Instant Demo Preview</span>
            </button>
          </div>
          
          <div className="login-footer">
            <span>Free</span>
            <span className="login-footer-dot">•</span>
            <span>Secure</span>
            <span className="login-footer-dot">•</span>
            <span>AI-Powered</span>
          </div>
          
          <div className="login-tech-badge">
            <span className="login-tech-dot"></span>
            <span>Powered by Google Gemini & Gmail API</span>
          </div>
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
              boxShadow: isDarkMode 
                ? '0 20px 60px rgba(0,0,0,0.4)' 
                : '0 20px 60px rgba(0,0,0,0.08)',
            },
          }}
        />
      </EmailProvider>
    </Router>
  );
}

export default App;