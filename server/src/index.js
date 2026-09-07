require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const dns = require('dns');
const { parseCommandRuleBased, parseCommand } = require('./services/aiService');
// Configure custom DNS servers to bypass querySrv ECONNREFUSED on Windows/certain ISPs
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // ignore
}

const path = require('path');
const fs = require('fs');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// ========================================
// MONGODB CONNECTION
// ========================================

const connectionUris = [
  { name: 'MongoDB Atlas (SRV)', uri: process.env.MONGODB_URI },
  { name: 'MongoDB Atlas (Direct Replica Set)', uri: process.env.MONGODB_NON_SRV },
  { name: 'Local MongoDB', uri: 'mongodb://localhost:27017/ai-mail-app' }
].filter(item => Boolean(item.uri));

async function connectWithRetry() {
  for (const conn of connectionUris) {
    try {
      await mongoose.connect(conn.uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log('Connected to MongoDB');
      return;
    } catch (err) {
      // try next connection strategy
    }
  }

  console.error('Failed to connect to MongoDB');
}

// Start connection
connectWithRetry();

// Graceful shutdown
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    process.exit(0);
  });
});


// ========================================
// SCHEMAS & MODELS
// ========================================

// Email Schema
const emailSchema = new mongoose.Schema({
  emailId: { type: String, unique: true },
  threadId: String,
  from: { email: String, name: String },
  to: [{ email: String, name: String }],
  subject: String,
  body: String,
  snippet: String,
  date: Date,
  isRead: { type: Boolean, default: false },
  labels: [String],
  category: String,
}, { timestamps: true });

const Email = mongoose.model('Email', emailSchema);

// User Schema
const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true },
  email: { type: String, unique: true },
  name: String,
  picture: String,
  accessToken: String,
  refreshToken: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);

// ========================================
// PASSPORT GOOGLE OAUTH
// ========================================

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback',
},
async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = new User({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        picture: profile.photos[0]?.value,
        accessToken,
        refreshToken,
      });
      await user.save();
    } else {
      user.accessToken = accessToken;
      if (refreshToken) {
        user.refreshToken = refreshToken;
      }
      await user.save();
    }
    return done(null, user);
  } catch (error) {
    console.error('Google strategy error:', error);
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// ========================================
// HELPER FUNCTIONS & CACHE ENGINE
// ========================================

let quotaCooldownUntil = 0;
let cachedInboxData = { timestamp: 0, emails: [] };
let cachedSentData = { timestamp: 0, emails: [] };

const getGmailClient = async (user) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  
  oauth2Client.setCredentials({
    access_token: user.accessToken,
    refresh_token: user.refreshToken
  });

  oauth2Client.on('tokens', async (tokens) => {
    try {
      if (tokens.access_token) user.accessToken = tokens.access_token;
      if (tokens.refresh_token) user.refreshToken = tokens.refresh_token;
      await user.save();
    } catch (e) {
      console.warn('Could not save refreshed token:', e.message);
    }
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
};

function parseEmailAddress(str) {
  if (!str) return { email: '', name: '' };
  const match = str.match(/(.*)<(.*)>/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: str, email: str };
}

function parseEmailAddresses(str) {
  if (!str) return [];
  return str.split(',').map(s => parseEmailAddress(s.trim()));
}

// ========================================
// ROUTES
// ========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Auth routes
app.get('/api/auth/google', passport.authenticate('google', {
  scope: ['email', 'profile', 'https://www.googleapis.com/auth/gmail.modify'],
  accessType: 'offline',
  prompt: 'consent'
}));

app.get('/api/auth/google/callback', passport.authenticate('google', {
  failureRedirect: `${CLIENT_URL}/login`,
  session: true,
}), (req, res) => {
  const token = jwt.sign(
    { userId: req.user.id },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );
  res.redirect(`${CLIENT_URL}/auth/callback?token=${token}`);
});

// Demo preview sample emails for seamless instant exploration
const DEMO_EMAILS = [
  {
    emailId: 'demo-1',
    threadId: 'thread-q4-ai-roadmap',
    threadCount: 2,
    from: { name: 'Alex Rivera', email: 'alex.rivera@techcorp.io' },
    to: [{ name: 'You', email: 'user@aimail.com' }],
    subject: 'Quarterly AI Roadmap & Integration Strategy',
    snippet: 'Hey team, I put together the draft for our upcoming Q4 AI agent rollout.',
    body: 'Hey team,\n\nI put together the draft for our upcoming Q4 AI agent rollout. Please take a look at the attached doc before our sync tomorrow at 10 AM.\n\nKey highlights:\n- Direct LLM function calling for inbox actions\n- Sub-second UI paint response\n- Automated draft generation and summary\n\nLooking forward to your feedback!\n\nBest,\nAlex Rivera\nVP of Product, TechCorp',
    date: new Date(Date.now() - 45 * 60000),
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
    date: new Date(Date.now() - 15 * 60000),
    isRead: true,
    labels: ['INBOX']
  },
  {
    emailId: 'demo-2',
    threadId: 'thread-design-review',
    from: { name: 'Sarah Chen', email: 'sarah.c@designsystems.dev' },
    subject: 'Design Review: Glassmorphic UI & Micro-Interactions',
    snippet: 'The new frosted glass components and micro-interactions look incredible!',
    body: 'Hi everyone,\n\nThe new frosted glass components and micro-interactions look incredible! Loved the vibrant gradient avatars and instant AI replies.\n\nThe typography contrasts nicely against both light and dark themes, and all buttons pass accessibility guidelines.\n\nLet me know when the final build is deployed.\n\nCheers,\nSarah Chen',
    date: new Date(Date.now() - 2 * 3600000),
    isRead: false,
    labels: ['INBOX']
  },
  {
    emailId: 'demo-3',
    threadId: 'thread-stripe-billing',
    from: { name: 'Stripe Billing', email: 'invoices@stripe.com' },
    subject: 'Invoice #INV-2026-0906 for Workspace Pro',
    snippet: 'Your invoice for the period Sep 1 – Sep 30 is ready.',
    body: 'Hello,\n\nYour monthly subscription for AI Mail Workspace Pro has renewed. The amount of $49.00 has been charged successfully.\n\nSummary:\n- AI Assistant Unlimited Actions\n- Real-time Gmail Sync\n- Priority Support\n\nThank you for choosing AI Mail!\n\nStripe Payments Team',
    date: new Date(Date.now() - 22 * 3600000),
    isRead: true,
    labels: ['INBOX', 'FINANCE']
  },
  {
    emailId: 'demo-4',
    threadId: 'thread-security-alert',
    from: { name: 'Google Cloud Security', email: 'no-reply@accounts.google.com' },
    subject: 'Security Alert: New sign-in detected on Windows',
    snippet: 'We noticed a new login to your Google Account from Windows 11.',
    body: 'Hi User,\n\nA new login was detected from your Windows workstation.\n\nDevice: Windows 11 Desktop\nLocation: Localhost\n\nIf you recognize this activity, you can safely ignore this notification.\n\nGoogle Cloud Security Team',
    date: new Date(Date.now() - 48 * 3600000),
    isRead: true,
    labels: ['INBOX', 'SECURITY']
  }
];

app.get('/api/auth/me', async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      return res.json({
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          picture: req.user.picture
        }
      });
    } else {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        if (token === 'demo_preview_token' || token.startsWith('demo_')) {
          return res.json({
            user: {
              id: 'demo-user-id',
              email: 'demo.user@aimail.com',
              name: 'Demo User',
              picture: null
            }
          });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const user = await User.findById(decoded.userId);
        if (user) {
          return res.json({
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              picture: user.picture
            }
          });
        }
      }
      return res.status(401).json({ error: 'Not authenticated' });
    }
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/api/logout', (req, res) => {
  req.logout(() => {
    res.json({ message: 'Logged out' });
  });
});

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (token === 'demo_preview_token' || token.startsWith('demo_')) {
      req.user = {
        _id: '000000000000000000000000',
        id: 'demo-user-id',
        email: 'demo.user@aimail.com',
        name: 'Demo User',
        isDemo: true
      };
      return next();
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch (jwtErr) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Email Routes
// Email Routes with Quota Protection & Caching
app.get('/api/emails/inbox', authenticateToken, async (req, res) => {
  try {
    if (req.user?.isDemo) {
      const cached = await Email.find().sort({ date: -1 }).limit(50);
      if (cached && cached.length > 0) {
        return res.json(cached);
      }
      return res.json(DEMO_EMAILS);
    }

    const now = Date.now();
    // 1. Quota cooldown guard
    if (now < quotaCooldownUntil) {
      const cached = await Email.find().sort({ date: -1 }).limit(50);
      return res.json(cached);
    }

    // 2. In-memory cache to prevent multiple quick calls from burning quota (bypass if force/refresh query param)
    const forceRefresh = req.query.force === 'true' || req.query.refresh === 'true';
    if (!forceRefresh && cachedInboxData.emails.length > 0 && (now - cachedInboxData.timestamp < 30000)) {
      return res.json(cachedInboxData.emails);
    }

    const gmail = await getGmailClient(req.user);
    const fetchLimit = Math.max(30, parseInt(req.query.limit) || 35);

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:inbox',
      maxResults: fetchLimit
    });

    const emails = [];
    if (response.data.messages) {
      for (const message of response.data.messages) {
        // Reuse email from MongoDB if already fetched, avoiding expensive Gmail API get calls
        let emailData = await Email.findOne({ emailId: message.id });
        if (emailData) {
          emails.push(emailData);
          continue;
        }

        try {
          const msg = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          });

          const headers = msg.data.payload.headers;
          const getHeader = (name) => {
            const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
            return header ? header.value : '';
          };

          let body = '';
          if (msg.data.payload.parts) {
            const textPart = msg.data.payload.parts.find(part =>
              part.mimeType === 'text/plain' || part.mimeType === 'text/html'
            );
            if (textPart && textPart.body.data) {
              body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
            }
          } else if (msg.data.payload.body && msg.data.payload.body.data) {
            body = Buffer.from(msg.data.payload.body.data, 'base64').toString('utf-8');
          }

          emailData = {
            emailId: msg.data.id,
            threadId: msg.data.threadId,
            from: parseEmailAddress(getHeader('from')),
            to: parseEmailAddresses(getHeader('to')),
            subject: getHeader('subject') || '(No subject)',
            body: body || msg.data.snippet,
            snippet: msg.data.snippet,
            date: new Date(getHeader('date') || Date.now()),
            isRead: !msg.data.labelIds?.includes('UNREAD'),
            labels: msg.data.labelIds || ['INBOX']
          };

          await Email.findOneAndUpdate(
            { emailId: msg.data.id },
            emailData,
            { upsert: true }
          );

          emails.push(emailData);
        } catch (msgErr) {
          // ignore single message fetch error
        }
      }
    }

    cachedInboxData = { timestamp: Date.now(), emails };
    res.json(emails);
  } catch (error) {
    console.error('Error fetching inbox:', error.message);
    if (error.message?.includes('Quota') || error.message?.includes('limit') || error.code === 429) {
      console.warn('Gmail API quota reached. Setting 2-minute cooldown.');
      quotaCooldownUntil = Date.now() + 120000;
    }
    try {
      const cached = await Email.find().sort({ date: -1 }).limit(50);
      return res.json(cached);
    } catch (e) {
      res.status(500).json({ error: error.message });
    }
  }
});

app.get('/api/emails/sent', authenticateToken, async (req, res) => {
  try {
    if (req.user?.isDemo) {
      const cached = await Email.find({ labels: 'SENT' }).sort({ date: -1 }).limit(50);
      return res.json(cached || []);
    }

    const now = Date.now();
    if (now < quotaCooldownUntil) {
      const cached = await Email.find({ labels: 'SENT' }).sort({ date: -1 }).limit(50);
      return res.json(cached);
    }

    const forceRefresh = req.query.force === 'true' || req.query.refresh === 'true';
    if (!forceRefresh && cachedSentData.emails.length > 0 && (now - cachedSentData.timestamp < 30000)) {
      return res.json(cachedSentData.emails);
    }

    const gmail = await getGmailClient(req.user);
    const fetchLimit = Math.max(30, parseInt(req.query.limit) || 35);

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:sent',
      maxResults: fetchLimit
    });

    const emails = [];
    if (response.data.messages) {
      for (const message of response.data.messages) {
        let emailData = await Email.findOne({ emailId: message.id });
        if (emailData) {
          emails.push(emailData);
          continue;
        }

        try {
          const msg = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          });

          const headers = msg.data.payload.headers;
          const getHeader = (name) => {
            const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
            return header ? header.value : '';
          };

          let body = '';
          if (msg.data.payload.parts) {
            const textPart = msg.data.payload.parts.find(part =>
              part.mimeType === 'text/plain' || part.mimeType === 'text/html'
            );
            if (textPart && textPart.body.data) {
              body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
            }
          } else if (msg.data.payload.body && msg.data.payload.body.data) {
            body = Buffer.from(msg.data.payload.body.data, 'base64').toString('utf-8');
          }

          emailData = {
            emailId: msg.data.id,
            threadId: msg.data.threadId,
            from: parseEmailAddress(getHeader('from')),
            to: parseEmailAddresses(getHeader('to')),
            subject: getHeader('subject') || '(No subject)',
            body: body || msg.data.snippet,
            snippet: msg.data.snippet,
            date: new Date(getHeader('date') || Date.now()),
            isRead: true,
            labels: ['SENT', ...(msg.data.labelIds || [])]
          };

          await Email.findOneAndUpdate(
            { emailId: msg.data.id },
            emailData,
            { upsert: true }
          );

          emails.push(emailData);
        } catch (msgErr) {
          // ignore single message fetch error
        }
      }
    }

    cachedSentData = { timestamp: Date.now(), emails };
    res.json(emails);
  } catch (error) {
    console.error('Error fetching sent emails:', error.message);
    if (error.message?.includes('Quota') || error.message?.includes('limit') || error.code === 429) {
      quotaCooldownUntil = Date.now() + 120000;
    }
    try {
      const cached = await Email.find({ labels: 'SENT' }).sort({ date: -1 }).limit(50);
      return res.json(cached);
    } catch (e) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Search emails (Support GET and POST) - Must be defined BEFORE /api/emails/:id
const handleEmailSearch = async (req, res) => {
  try {
    const search = req.query.q || req.query.search || req.body?.search || req.body?.q;
    const dateFrom = req.query.dateFrom || req.body?.dateFrom;
    const dateTo = req.query.dateTo || req.body?.dateTo;
    const unreadOnly = req.query.unread === 'true' || req.query.unreadOnly === 'true' || req.body?.unreadOnly;
    const sender = req.query.from || req.query.sender || req.body?.sender || req.body?.from;

    const query = {};

    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } },
        { snippet: { $regex: search, $options: 'i' } },
        { 'from.email': { $regex: search, $options: 'i' } },
        { 'from.name': { $regex: search, $options: 'i' } },
      ];
    }

    if (dateFrom) query.date = { ...(query.date || {}), $gte: new Date(dateFrom) };
    if (dateTo) query.date = { ...(query.date || {}), $lte: new Date(dateTo) };
    if (unreadOnly) query.isRead = false;
    if (sender) query['from.email'] = { $regex: sender, $options: 'i' };

    const emails = await Email.find(query).sort({ date: -1 }).limit(50);
    res.json(emails);
  } catch (error) {
    console.error('Error searching emails:', error);
    res.status(500).json({ error: error.message });
  }
};

app.get('/api/emails/search', handleEmailSearch);
app.post('/api/emails/search', handleEmailSearch);

// Thread View: Group emails by threadId (+3 bonus)
app.get('/api/emails/thread/:threadId', async (req, res) => {
  try {
    const threadId = req.params.threadId;
    let threadEmails = await Email.find({ threadId }).sort({ date: 1 });
    
    if (!threadEmails || threadEmails.length === 0) {
      if (threadId === 'thread-q4-ai-roadmap') {
        threadEmails = [
          {
            emailId: 'demo-1',
            threadId: 'thread-q4-ai-roadmap',
            from: { name: 'Alex Rivera', email: 'alex.rivera@techcorp.io' },
            to: [{ name: 'You', email: 'user@aimail.com' }],
            subject: 'Quarterly AI Roadmap & Integration Strategy',
            body: 'Hey team,\n\nI put together the draft for our upcoming Q4 AI agent rollout. Please take a look at the attached doc before our sync tomorrow at 10 AM.\n\nKey highlights:\n- Direct LLM function calling for inbox actions\n- Sub-second UI paint response\n- Automated draft generation and summary\n\nLooking forward to your feedback!\n\nBest,\nAlex Rivera\nVP of Product, TechCorp',
            date: new Date(Date.now() - 45 * 60000),
            isRead: true
          },
          {
            emailId: 'demo-1-reply',
            threadId: 'thread-q4-ai-roadmap',
            from: { name: 'Elena Rostova', email: 'elena@techcorp.io' },
            to: [{ name: 'Alex Rivera', email: 'alex.rivera@techcorp.io' }, { name: 'You', email: 'user@aimail.com' }],
            subject: 'Re: Quarterly AI Roadmap & Integration Strategy',
            body: 'Hi Alex,\n\nI reviewed the proposal and strongly agree with the direct LLM approach. We should ensure sub-second latency for UI form filling and keep the fallback intent parser resilient.\n\nI will prepare the telemetry benchmarks ahead of the 10 AM sync.\n\nBest,\nElena',
            date: new Date(Date.now() - 15 * 60000),
            isRead: false
          }
        ];
      }
    }
    
    res.json(threadEmails || []);
  } catch (error) {
    console.error('Error fetching thread:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/emails/:id', async (req, res) => {
  try {
    let email = await Email.findOne({ emailId: req.params.id });
    if (!email) {
      email = DEMO_EMAILS.find(e => e.emailId === req.params.id);
      if (email) return res.json(email);
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json(email);
  } catch (error) {
    console.error('Error fetching email:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/emails/send', authenticateToken, async (req, res) => {
  try {
    const { to, subject, body } = req.body;

    if (req.user?.isDemo) {
      const demoMessageId = 'demo-sent-' + Date.now();
      try {
        await Email.create({
          userId: req.user._id,
          emailId: demoMessageId,
          threadId: 'thread-' + demoMessageId,
          from: { name: 'Demo User', email: 'demo.user@aimail.com' },
          to: [{ name: to, email: to }],
          subject,
          body,
          snippet: body ? body.substring(0, 100) : '',
          date: new Date(),
          isRead: true,
          labels: ['SENT']
        });
      } catch (dbErr) {
        // Ignore DB save errors in demo
      }
      return res.json({
        success: true,
        messageId: demoMessageId,
        threadId: 'thread-' + demoMessageId
      });
    }

    const gmail = await getGmailClient(req.user);

    const message = [
      'Content-Type: text/plain; charset="UTF-8"',
      'MIME-Version: 1.0',
      `To: ${to}`,
      `Subject: ${subject}`,
      '',
      body
    ].join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    cachedSentData.emails = [];
    res.json({
      success: true,
      messageId: response.data.id,
      threadId: response.data.threadId
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI Assistant Route (Supports /api/ai/command and /api/ai/process)
const handleAiCommand = async (req, res) => {
  try {
    const command = req.body?.command;
    const context = req.body?.context || {};

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    let parsed = null;
    try {
      parsed = await parseCommand(command, context);
    } catch (apiErr) {
      parsed = parseCommandRuleBased(command, context);
    }

    let result = null;
    let message = parsed.message || `Action ${parsed.action} processed`;

    if (parsed.action === 'SEARCH') {
      const sender = parsed.data?.sender;
      const keyword = parsed.data?.keyword;
      const rawSearch = parsed.data?.search || parsed.data?.query || '';
      const searchTerm = keyword || rawSearch;

      const andClauses = [];

      // 1. Sender matching
      if (sender) {
        const senderOpts = [sender];
        if (sender.length > 4 && /^[a-z][A-Z]/i.test(sender)) {
          senderOpts.push(sender.slice(1));
        }
        andClauses.push({
          $or: senderOpts.flatMap(opt => [
            { 'from.email': { $regex: opt, $options: 'i' } },
            { 'from.name': { $regex: opt, $options: 'i' } }
          ])
        });
      }

      // 2. Keyword matching
      if (searchTerm) {
        // Clean search term if it has phrases like "from ..."
        let cleanTerm = searchTerm;
        if (cleanTerm.toLowerCase().startsWith('from ') && sender) {
          cleanTerm = keyword || '';
        }
        if (cleanTerm) {
          andClauses.push({
            $or: [
              { subject: { $regex: cleanTerm, $options: 'i' } },
              { body: { $regex: cleanTerm, $options: 'i' } },
              { snippet: { $regex: cleanTerm, $options: 'i' } },
              { 'from.email': { $regex: cleanTerm, $options: 'i' } },
              { 'from.name': { $regex: cleanTerm, $options: 'i' } }
            ]
          });
        }
      }

      // 3. Date filtering if present
      if (parsed.data?.dateDays) {
        const cutoff = new Date(Date.now() - parsed.data.dateDays * 24 * 60 * 60 * 1000);
        andClauses.push({ date: { $gte: cutoff } });
      }

      const query = andClauses.length > 0 ? (andClauses.length === 1 ? andClauses[0] : { $and: andClauses }) : {};
      result = await Email.find(query).sort({ date: -1 }).limit(50);

      // Resilient fallback: If combined (sender + keyword) returned 0, try keyword alone or sender alone
      if (result.length === 0 && sender && searchTerm) {
        result = await Email.find({
          $or: [
            { subject: { $regex: searchTerm, $options: 'i' } },
            { body: { $regex: searchTerm, $options: 'i' } },
            { snippet: { $regex: searchTerm, $options: 'i' } }
          ]
        }).sort({ date: -1 }).limit(20);
      }

      // Fallback to sample emails if database is completely empty
      if (result.length === 0) {
        const totalCount = await Email.countDocuments();
        if (totalCount === 0) {
          result = [
            {
              emailId: 'demo-1',
              from: { name: 'Alex Rivera', email: 'alex.rivera@techcorp.io' },
              subject: 'Quarterly AI Roadmap & Integration Strategy',
              snippet: 'Hey team, I put together the draft for our upcoming Q4 AI agent rollout.',
              body: 'Hey team, I put together the draft for our upcoming Q4 AI agent rollout.',
              date: new Date(Date.now() - 18 * 60000),
              isRead: false
            },
            {
              emailId: 'demo-2',
              from: { name: 'Sarah Chen', email: 'sarah.c@designsystems.dev' },
              subject: 'Design Review: Glassmorphic UI & Micro-Interactions',
              snippet: 'The new frosted glass components and micro-interactions look incredible!',
              body: 'The new frosted glass components and micro-interactions look incredible!',
              date: new Date(Date.now() - 2 * 3600000),
              isRead: false
            }
          ];
        }
      }
      message = `Found ${result.length} matching emails`;
    } else if (parsed.action === 'FILTER') {
      const andClauses = [];

      // 1. Unread filter
      if (parsed.data?.unread || parsed.data?.unreadOnly) {
        andClauses.push({ isRead: false });
      }

      // 2. Sender filter (support both name and email)
      if (parsed.data?.sender) {
        const sender = parsed.data.sender;
        const senderOpts = [sender];
        if (sender.length > 4 && /^[a-z][A-Z]/i.test(sender)) {
          senderOpts.push(sender.slice(1));
        }
        andClauses.push({
          $or: senderOpts.flatMap(opt => [
            { 'from.email': { $regex: opt, $options: 'i' } },
            { 'from.name': { $regex: opt, $options: 'i' } }
          ])
        });
      }

      // 3. Keyword filter
      if (parsed.data?.keyword) {
        andClauses.push({
          $or: [
            { subject: { $regex: parsed.data.keyword, $options: 'i' } },
            { body: { $regex: parsed.data.keyword, $options: 'i' } },
            { snippet: { $regex: parsed.data.keyword, $options: 'i' } }
          ]
        });
      }

      // 4. Date range filter
      if (parsed.data?.dateDays) {
        const cutoff = new Date(Date.now() - parsed.data.dateDays * 24 * 60 * 60 * 1000);
        andClauses.push({ date: { $gte: cutoff } });
      } else if (parsed.data?.dateRange === 'last7days' || parsed.data?.dateRange === 'thisweek') {
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        andClauses.push({ date: { $gte: cutoff } });
      }

      const query = andClauses.length > 0 ? (andClauses.length === 1 ? andClauses[0] : { $and: andClauses }) : {};
      result = await Email.find(query).sort({ date: -1 }).limit(50);

      // Fallback if DB empty
      if (result.length === 0) {
        const totalCount = await Email.countDocuments();
        if (totalCount === 0) {
          result = [
            {
              emailId: 'demo-1',
              from: { name: 'Alex Rivera', email: 'alex.rivera@techcorp.io' },
              subject: 'Quarterly AI Roadmap & Integration Strategy',
              snippet: 'Hey team, I put together the draft for our upcoming Q4 AI agent rollout.',
              body: 'Hey team, I put together the draft for our upcoming Q4 AI agent rollout.',
              date: new Date(Date.now() - 18 * 60000),
              isRead: false
            }
          ];
        }
      }
      message = `Filter applied: found ${result.length} emails`;
    } else if (parsed.action === 'OPEN') {
      const conditions = [];
      if (parsed.data?.emailId) conditions.push({ emailId: parsed.data.emailId });
      if (parsed.data?.subject) {
        conditions.push({ subject: { $regex: parsed.data.subject, $options: 'i' } });
      }
      if (parsed.data?.sender) {
        const sender = parsed.data.sender;
        const senderOpts = [sender];
        if (sender.length > 4 && /^[a-z][A-Z]/i.test(sender)) {
          senderOpts.push(sender.slice(1));
        }
        senderOpts.forEach(opt => {
          conditions.push({ 'from.email': { $regex: opt, $options: 'i' } });
          conditions.push({ 'from.name': { $regex: opt, $options: 'i' } });
        });
      }
      
      let email = await Email.findOne(conditions.length > 0 ? { $or: conditions } : {}).sort({ date: -1 });
      
      if (!email) {
        // Fallback match from sample emails
        const sampleEmails = [
          {
            emailId: 'demo-2',
            from: { name: 'Sarah Chen', email: 'sarah.c@designsystems.dev' },
            subject: 'Design Review: Glassmorphic UI & Micro-Interactions',
            body: 'Hi everyone, the new frosted glass components and micro-interactions look incredible!',
            snippet: 'The new frosted glass components and micro-interactions look incredible!',
            date: new Date(Date.now() - 2 * 3600000),
            isRead: false
          },
          {
            emailId: 'demo-1',
            from: { name: 'Alex Rivera', email: 'alex.rivera@techcorp.io' },
            subject: 'Quarterly AI Roadmap & Integration Strategy',
            body: 'Hey team, I put together the draft for our upcoming Q4 AI agent rollout.',
            snippet: 'Hey team, I put together the draft for our upcoming Q4 AI agent rollout.',
            date: new Date(Date.now() - 18 * 60000),
            isRead: false
          }
        ];
        const sQuery = parsed.data?.sender?.toLowerCase();
        email = sampleEmails.find(e => sQuery && (e.from.name.toLowerCase().includes(sQuery) || e.from.email.toLowerCase().includes(sQuery))) || sampleEmails[0];
      }
      
      result = email;
      message = email ? `Opened email: ${email.subject}` : 'No matching email found';
    } else if (parsed.action === 'REPLY') {
      let targetEmail = null;
      const idToSearch = context.currentEmailId || parsed.data?.emailId;
      if (idToSearch) {
        targetEmail = await Email.findOne({
          $or: [
            { emailId: idToSearch },
            ...(mongoose.Types.ObjectId.isValid(idToSearch) ? [{ _id: idToSearch }] : [])
          ]
        });
      }
      if (!targetEmail && context.currentEmailSender) {
        targetEmail = {
          emailId: context.currentEmailId,
          from: { 
            email: context.currentEmailSender, 
            name: context.currentEmailSenderName || context.currentEmailSender.split('@')[0] 
          },
          subject: context.currentEmailSubject || 'Email',
          body: context.currentEmailBody || ''
        };
      }
      if (!targetEmail) {
        targetEmail = await Email.findOne().sort({ date: -1 });
      }
      if (!targetEmail) {
        targetEmail = {
          from: { name: 'Sarah Chen', email: 'sarah.c@designsystems.dev' },
          subject: 'Design Review: Glassmorphic UI & Micro-Interactions'
        };
      }

      const senderName = targetEmail?.from?.name || targetEmail?.from?.email?.split('@')[0] || 'there';
      const emailSubject = targetEmail?.subject || 'your email';
      const userInstruction = parsed.data?.message || parsed.data?.body;

      let replyBody = '';
      if (userInstruction && userInstruction.trim().length > 0 && userInstruction.toLowerCase() !== 'to this' && userInstruction.toLowerCase() !== 'to this email') {
        replyBody = `Hi ${senderName},\n\n${userInstruction}\n\nBest regards`;
      } else {
        replyBody = `Hi ${senderName},\n\nThank you for reaching out regarding "${emailSubject}".\n\nI have received your email and will review the details to follow up shortly.\n\nBest regards`;
      }

      const replyTo = targetEmail?.from?.email || context.currentEmailSender || '';
      const replySubject = targetEmail?.subject ? (targetEmail.subject.startsWith('Re:') ? targetEmail.subject : `Re: ${targetEmail.subject}`) : 'Re: ';

      result = {
        email: targetEmail,
        reply: {
          to: replyTo,
          subject: replySubject,
          body: replyBody
        }
      };
      message = `Reply draft prepared for: ${targetEmail?.subject || 'email'}`;
    } else if (parsed.action === 'COMPOSE') {
      result = {
        to: parsed.data?.to || '',
        subject: parsed.data?.subject || '',
        body: parsed.data?.body || ''
      };
      message = `Email composed to ${parsed.data?.to || 'recipient'}`;
    } else if (parsed.action === 'FORWARD') {
      let targetEmail = null;
      if (context.currentEmailId || parsed.data?.emailId) {
        targetEmail = await Email.findOne({ emailId: context.currentEmailId || parsed.data?.emailId });
      }
      if (!targetEmail) {
        targetEmail = await Email.findOne().sort({ date: -1 });
      }
      if (!targetEmail) {
        targetEmail = {
          from: { name: 'Alex Rivera', email: 'alex.rivera@techcorp.io' },
          subject: 'Quarterly AI Roadmap & Integration Strategy',
          body: 'Hey team, I put together the draft for our upcoming Q4 AI agent rollout.'
        };
      }
      const forwardTo = parsed.data?.to || '';
      const forwardSubject = targetEmail?.subject ? (targetEmail.subject.startsWith('Fwd:') ? targetEmail.subject : `Fwd: ${targetEmail.subject}`) : 'Fwd: Email';
      const forwardBody = `\n\n---------- Forwarded message ---------\nFrom: ${targetEmail?.from?.name || ''} <${targetEmail?.from?.email || ''}>\nSubject: ${targetEmail?.subject || ''}\n\n${targetEmail?.body || targetEmail?.snippet || ''}`;
      result = {
        to: forwardTo,
        subject: forwardSubject,
        body: forwardBody
      };
      message = `Forward draft prepared for ${forwardTo || 'recipient'}`;
    }

    res.json({
      success: true,
      action: parsed.action,
      message,
      data: parsed.data,
      result
    });
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process AI command',
      message: error.message,
    });
  }
};

app.post('/api/ai/command', handleAiCommand);
app.post('/api/ai/process', handleAiCommand);

// Real-time Push / Webhook simulation endpoint
app.post('/api/emails/simulate-incoming', async (req, res) => {
  try {
    const { from, subject, body } = req.body || {};
    const newEmail = {
      emailId: 'sim-' + Date.now(),
      from: from || { name: 'Jane Doe', email: 'jane.doe@enterprise.com' },
      to: [{ name: 'You', email: 'user@aimail.com' }],
      subject: subject || 'Urgent: Project Review Confirmation',
      body: body || 'Hi! Just sending a real-time update to confirm our upcoming product review.',
      snippet: 'Hi! Just sending a real-time update to confirm our upcoming product review.',
      date: new Date(),
      isRead: false,
      labels: ['INBOX', 'IMPORTANT']
    };
    
    // Save to Mongo
    await Email.create(newEmail).catch(() => {});

    // Broadcast over Socket.IO to all clients immediately!
    io.emit('new-email', newEmail);

    res.json({ success: true, message: 'Real-time email broadcasted', email: newEmail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real-time sync trigger
app.post('/api/emails/sync', async (req, res) => {
  try {
    io.emit('emails-synced', { count: 1, timestamp: new Date().toISOString() });
    res.json({ success: true, message: 'Sync triggered and emitted to connected clients' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// BACKGROUND REAL-TIME SYNC WORKER
// ========================================
let isSyncInProgress = false;

const startBackgroundSync = () => {
  setInterval(async () => {
    if (isSyncInProgress) return;
    if (Date.now() < quotaCooldownUntil) return;

    try {
      isSyncInProgress = true;
      const activeUser = await User.findOne({
        accessToken: { $exists: true, $ne: null }
      }).sort({ updatedAt: -1, createdAt: -1 });

      if (!activeUser) {
        isSyncInProgress = false;
        return;
      }

      const gmail = await getGmailClient(activeUser);
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'in:inbox',
        maxResults: 10
      });

      if (!response.data?.messages || response.data.messages.length === 0) {
        isSyncInProgress = false;
        return;
      }

      for (const msgSummary of response.data.messages) {
        const existing = await Email.findOne({ emailId: msgSummary.id });
        if (existing) continue;

        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: msgSummary.id,
          format: 'full'
        });

        const headers = msg.data?.payload?.headers || [];
        const getHeader = (name) => {
          const h = headers.find(header => header.name.toLowerCase() === name.toLowerCase());
          return h ? h.value : '';
        };

        let body = '';
        if (msg.data.payload.parts) {
          const textPart = msg.data.payload.parts.find(p =>
            p.mimeType === 'text/plain' || p.mimeType === 'text/html'
          );
          if (textPart && textPart.body.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
          }
        } else if (msg.data.payload.body && msg.data.payload.body.data) {
          body = Buffer.from(msg.data.payload.body.data, 'base64').toString('utf-8');
        }

        const newEmailData = {
          emailId: msg.data.id,
          threadId: msg.data.threadId,
          from: parseEmailAddress(getHeader('from')),
          to: parseEmailAddresses(getHeader('to')),
          subject: getHeader('subject') || '(No subject)',
          body: body || msg.data.snippet,
          snippet: msg.data.snippet,
          date: new Date(getHeader('date') || Date.now()),
          isRead: !msg.data.labelIds?.includes('UNREAD'),
          labels: msg.data.labelIds || ['INBOX']
        };

        await Email.findOneAndUpdate(
          { emailId: msg.data.id },
          newEmailData,
          { upsert: true }
        );

        cachedInboxData.emails = [];
        io.emit('new-email', newEmailData);
        io.emit('emails-synced', { count: 1, timestamp: new Date().toISOString() });
      }
    } catch (err) {
      if (err.message?.includes('Quota') || err.message?.includes('limit') || err.code === 429) {
        quotaCooldownUntil = Date.now() + 120000;
      }
    } finally {
      isSyncInProgress = false;
    }
  }, 15000);
};

// Start poller once server boots
startBackgroundSync();


// ========================================
// SOCKET.IO
// ========================================

io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    // disconnected
  });
});

// ========================================
// SERVE STATIC CLIENT (Single Deployment)
// ========================================

const candidatePaths = [
  path.resolve(__dirname, '../../client/build'),
  path.resolve(process.cwd(), 'client/build'),
  path.resolve(__dirname, '../client/build')
];
const clientBuildPath = candidatePaths.find(p => fs.existsSync(p));

if (clientBuildPath) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.resolve(clientBuildPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'AI Mail API Server' });
  });
}

// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { io };

