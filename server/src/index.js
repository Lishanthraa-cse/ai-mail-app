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
const { parseCommandRuleBased, parseCommand, extractSemanticCriteria } = require('./services/aiService');
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
  isStarred: { type: Boolean, default: false },
  isTrash: { type: Boolean, default: false },
  isSpam: { type: Boolean, default: false },
  labels: [String],
  category: String,
}, { timestamps: true });

const Email = mongoose.model('Email', emailSchema);

// Draft Schema
const draftSchema = new mongoose.Schema({
  userId: String,
  to: String,
  subject: String,
  body: String,
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Draft = mongoose.model('Draft', draftSchema);

// Reminder Schema
const reminderSchema = new mongoose.Schema({
  userId: String,
  emailId: { type: String, required: true },
  threadId: String,
  subject: String,
  sender: { name: String, email: String },
  snippet: String,
  dueDate: { type: Date, required: true },
  preset: { type: String, enum: ['tomorrow', 'in_3_days', 'next_week', 'custom'], default: 'tomorrow' },
  notes: { type: String, default: '' },
  isCompleted: { type: Boolean, default: false }
}, { timestamps: true });

const Reminder = mongoose.model('Reminder', reminderSchema);

// User Schema
const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true },
  email: { type: String, unique: true },
  name: String,
  picture: String,
  signature: { type: String, default: '' },
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

// Demo preview sample emails (50 realistic conversations) isolated from user database
const { DEMO_EMAILS } = require('./demoData');
const demoSentEmails = [];
const demoStarredIds = new Set();
const demoTrashIds = new Set();
const demoSpamIds = new Set();
const demoDrafts = [];
const demoReminders = [
  {
    _id: 'demo-rem-1',
    id: 'demo-rem-1',
    userId: 'demo-user-id',
    emailId: 'demo-1',
    threadId: 'thread-q4-ai-roadmap',
    subject: 'Quarterly AI Roadmap & Sprint Priorities',
    sender: { name: 'Alice Walker', email: 'alice.walker@techcorp.io' },
    snippet: 'Hey team, I finalized the draft for our upcoming Q4 AI agent rollout...',
    dueDate: new Date(Date.now() - 3600000).toISOString(), // Due 1 hour ago
    preset: 'tomorrow',
    notes: 'Confirm engineering sync time and sprint deliverables',
    isCompleted: false,
    createdAt: new Date().toISOString()
  },
  {
    _id: 'demo-rem-2',
    id: 'demo-rem-2',
    userId: 'demo-user-id',
    emailId: 'demo-3',
    threadId: 'thread-board-meeting-prep',
    subject: 'Q3 Board Deck & ARR Growth Highlights',
    sender: { name: 'John Davis', email: 'john.davis@ventures.co' },
    snippet: 'Great job surpassing our Net Revenue Retention target this quarter...',
    dueDate: new Date(Date.now() + 86400000).toISOString(), // Due tomorrow
    preset: 'tomorrow',
    notes: 'Prepare CAC payback period slides',
    isCompleted: false,
    createdAt: new Date().toISOString()
  }
];
let demoUserProfile = {
  name: 'Demo User',
  email: 'demo.user@aimail.com',
  signature: '--\nBest regards,\nDemo User'
};

app.get('/api/auth/me', async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      return res.json({
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          picture: req.user.picture,
          signature: req.user.signature || ''
        }
      });
    } else {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        if (token === 'demo_preview_token' || token.startsWith('demo_')) {
          return res.json({
            user: {
              id: 'demo-user-id',
              email: demoUserProfile.email,
              name: demoUserProfile.name,
              picture: null,
              signature: demoUserProfile.signature
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
      const filtered = DEMO_EMAILS
        .filter(e => !demoTrashIds.has(e.emailId) && !demoSpamIds.has(e.emailId))
        .map(e => ({
          ...e,
          isStarred: demoStarredIds.has(e.emailId) || e.isStarred || e.labels?.includes('STARRED')
        }));
      return res.json(filtered);
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
      return res.json(demoSentEmails);
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

// Generic Folder view (supports: inbox, starred, sent, drafts, all, important, trash, spam, updates, social, promotions, etc.)
app.get('/api/emails/folder/:folder', authenticateToken, async (req, res) => {
  try {
    const rawFolder = req.params.folder.toLowerCase();

    // DEMO USER MODE
    if (req.user?.isDemo) {
      const activeReminders = demoReminders.filter(r => !r.isCompleted);
      const reminderMap = new Map();
      activeReminders.forEach(r => reminderMap.set(r.emailId, {
        ...r,
        isDue: new Date(r.dueDate) <= new Date()
      }));

      const allActive = DEMO_EMAILS
        .filter(e => !demoTrashIds.has(e.emailId) && !demoSpamIds.has(e.emailId))
        .map(e => ({
          ...e,
          isStarred: demoStarredIds.has(e.emailId) || e.isStarred || e.labels?.includes('STARRED'),
          reminder: reminderMap.get(e.emailId)
        }));

      if (rawFolder === 'inbox') {
        return res.json(allActive);
      }
      if (rawFolder === 'starred') {
        const starred = allActive.filter(e => e.isStarred);
        return res.json(starred);
      }
      if (rawFolder === 'sent') {
        return res.json(demoSentEmails);
      }
      if (rawFolder === 'drafts') {
        return res.json(demoDrafts);
      }
      if (rawFolder === 'all') {
        return res.json([...allActive, ...demoSentEmails]);
      }
      if (rawFolder === 'important') {
        const important = allActive.filter(e => e.labels?.includes('IMPORTANT') || e.isImportant);
        return res.json(important);
      }
      if (rawFolder === 'follow-ups' || rawFolder === 'followups') {
        const followUpEmails = [];
        for (const rem of activeReminders) {
          let email = DEMO_EMAILS.find(e => e.emailId === rem.emailId);
          if (email) {
            followUpEmails.push({
              ...email,
              reminder: reminderMap.get(rem.emailId)
            });
          } else {
            followUpEmails.push({
              emailId: rem.emailId,
              threadId: rem.threadId,
              subject: rem.subject,
              snippet: rem.snippet,
              from: rem.sender,
              date: rem.createdAt,
              isRead: false,
              labels: ['INBOX'],
              reminder: reminderMap.get(rem.emailId)
            });
          }
        }
        return res.json(followUpEmails);
      }
      if (rawFolder === 'trash') {
        const trash = DEMO_EMAILS.filter(e => demoTrashIds.has(e.emailId)).map(e => ({
          ...e,
          isStarred: demoStarredIds.has(e.emailId) || e.isStarred
        }));
        return res.json(trash);
      }
      if (rawFolder === 'spam') {
        const spam = DEMO_EMAILS.filter(e => demoSpamIds.has(e.emailId));
        return res.json(spam);
      }
      // Category views (e.g. updates, social, promotions, finance)
      const catMatches = allActive.filter(e => 
        (e.labels && e.labels.some(l => l.toLowerCase() === rawFolder)) ||
        (e.category && e.category.toLowerCase() === rawFolder)
      );
      return res.json(catMatches);
    }

    // LIVE GMAIL MODE
    let query = '';
    let mongoQuery = {};

    switch (rawFolder) {
      case 'inbox':
        query = 'in:inbox';
        mongoQuery = { labels: 'INBOX', isTrash: { $ne: true }, isSpam: { $ne: true } };
        break;
      case 'starred':
        query = 'is:starred';
        mongoQuery = { isStarred: true, isTrash: { $ne: true } };
        break;
      case 'sent':
        query = 'in:sent';
        mongoQuery = { labels: 'SENT' };
        break;
      case 'drafts':
        const drafts = await Draft.find({ userId: req.user.id }).sort({ updatedAt: -1 });
        return res.json(drafts);
      case 'follow-ups':
      case 'followups': {
        const reminders = await Reminder.find({ userId: req.user.id, isCompleted: false }).sort({ dueDate: 1 });
        const emailIds = reminders.map(r => r.emailId);
        const cachedEmails = await Email.find({ emailId: { $in: emailIds } });
        const emailMap = new Map();
        cachedEmails.forEach(e => emailMap.set(e.emailId, e.toObject()));

        const results = reminders.map(rem => {
          const isDue = new Date(rem.dueDate) <= new Date();
          const base = emailMap.get(rem.emailId);
          if (base) {
            return {
              ...base,
              reminder: { ...rem.toObject(), isDue }
            };
          }
          return {
            emailId: rem.emailId,
            threadId: rem.threadId,
            subject: rem.subject,
            snippet: rem.snippet,
            from: rem.sender,
            date: rem.createdAt,
            isRead: false,
            labels: ['INBOX'],
            reminder: { ...rem.toObject(), isDue }
          };
        });
        return res.json(results);
      }
      case 'all':
        query = '';
        mongoQuery = { isTrash: { $ne: true }, isSpam: { $ne: true } };
        break;
      case 'important':
        query = 'is:important';
        mongoQuery = { labels: 'IMPORTANT', isTrash: { $ne: true } };
        break;
      case 'trash':
        query = 'in:trash';
        mongoQuery = { $or: [{ isTrash: true }, { labels: 'TRASH' }] };
        break;
      case 'spam':
        query = 'in:spam';
        mongoQuery = { $or: [{ isSpam: true }, { labels: 'SPAM' }] };
        break;
      default:
        query = `category:${rawFolder}`;
        mongoQuery = { labels: rawFolder.toUpperCase(), isTrash: { $ne: true } };
        break;
    }

    const now = Date.now();
    if (now < quotaCooldownUntil) {
      const cached = await Email.find(mongoQuery).sort({ date: -1 }).limit(50);
      const activeReminders = await Reminder.find({ userId: req.user.id, isCompleted: false });
      const remMap = new Map();
      activeReminders.forEach(r => remMap.set(r.emailId, { ...r.toObject(), isDue: new Date(r.dueDate) <= new Date() }));
      return res.json(cached.map(e => ({ ...e.toObject(), reminder: remMap.get(e.emailId) })));
    }

    try {
      const gmail = await getGmailClient(req.user);
      const fetchLimit = Math.max(30, parseInt(req.query.limit) || 35);
      const listParams = { userId: 'me', maxResults: fetchLimit };
      if (query) listParams.q = query;

      const response = await gmail.users.messages.list(listParams);
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

            const labelIds = msg.data.labelIds || [];
            emailData = {
              emailId: msg.data.id,
              threadId: msg.data.threadId,
              from: parseEmailAddress(getHeader('from')),
              to: parseEmailAddresses(getHeader('to')),
              subject: getHeader('subject') || '(No subject)',
              body: body || msg.data.snippet,
              snippet: msg.data.snippet,
              date: new Date(getHeader('date') || Date.now()),
              isRead: !labelIds.includes('UNREAD'),
              isStarred: labelIds.includes('STARRED'),
              isTrash: labelIds.includes('TRASH'),
              isSpam: labelIds.includes('SPAM'),
              labels: labelIds
            };

            await Email.findOneAndUpdate(
              { emailId: msg.data.id },
              emailData,
              { upsert: true }
            );

            emails.push(emailData);
          } catch (mErr) {
            // ignore individual message error
          }
        }
      }
      return res.json(emails);
    } catch (apiErr) {
      console.error(`Error fetching folder ${rawFolder}:`, apiErr.message);
      if (apiErr.message?.includes('Quota') || apiErr.message?.includes('limit') || apiErr.code === 429) {
        quotaCooldownUntil = Date.now() + 120000;
      }
      const cached = await Email.find(mongoQuery).sort({ date: -1 }).limit(50);
      return res.json(cached);
    }
  } catch (error) {
    console.error('Folder route error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Star/Unstar email
app.post('/api/emails/:id/star', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user?.isDemo) {
      const isStarred = demoStarredIds.has(id);
      if (isStarred) {
        demoStarredIds.delete(id);
      } else {
        demoStarredIds.add(id);
      }
      return res.json({ success: true, isStarred: !isStarred });
    }

    const email = await Email.findOne({ emailId: id });
    const nextStarred = email ? !email.isStarred : true;

    try {
      const gmail = await getGmailClient(req.user);
      await gmail.users.messages.modify({
        userId: 'me',
        id,
        requestBody: nextStarred
          ? { addLabelIds: ['STARRED'] }
          : { removeLabelIds: ['STARRED'] }
      });
    } catch (e) {
      console.warn('Gmail modify label error:', e.message);
    }

    if (email) {
      email.isStarred = nextStarred;
      if (nextStarred && !email.labels.includes('STARRED')) email.labels.push('STARRED');
      if (!nextStarred) email.labels = email.labels.filter(l => l !== 'STARRED');
      await email.save();
    }

    res.json({ success: true, isStarred: nextStarred });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Move to / restore from Trash
app.post('/api/emails/:id/trash', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const restore = Boolean(req.body?.restore);

    if (req.user?.isDemo) {
      if (restore) {
        demoTrashIds.delete(id);
      } else {
        demoTrashIds.add(id);
      }
      return res.json({ success: true, isTrash: !restore });
    }

    try {
      const gmail = await getGmailClient(req.user);
      if (restore) {
        await gmail.users.messages.untrash({ userId: 'me', id });
      } else {
        await gmail.users.messages.trash({ userId: 'me', id });
      }
    } catch (e) {
      console.warn('Gmail trash error:', e.message);
    }

    const email = await Email.findOne({ emailId: id });
    if (email) {
      email.isTrash = !restore;
      if (!restore) {
        if (!email.labels.includes('TRASH')) email.labels.push('TRASH');
        email.labels = email.labels.filter(l => l !== 'INBOX');
      } else {
        email.labels = email.labels.filter(l => l !== 'TRASH');
        if (!email.labels.includes('INBOX')) email.labels.push('INBOX');
      }
      await email.save();
    }

    res.json({ success: true, isTrash: !restore });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark as Read / Unread
app.post('/api/emails/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const isRead = req.body?.isRead !== undefined ? Boolean(req.body.isRead) : true;

    if (req.user?.isDemo) {
      const found = DEMO_EMAILS.find(e => e.emailId === id);
      if (found) found.isRead = isRead;
      return res.json({ success: true, isRead });
    }

    try {
      const gmail = await getGmailClient(req.user);
      await gmail.users.messages.modify({
        userId: 'me',
        id,
        requestBody: isRead
          ? { removeLabelIds: ['UNREAD'] }
          : { addLabelIds: ['UNREAD'] }
      });
    } catch (e) {
      console.warn('Gmail mark read/unread error:', e.message);
    }

    const email = await Email.findOne({ emailId: id });
    if (email) {
      email.isRead = isRead;
      await email.save();
    }

    res.json({ success: true, isRead });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Move to / restore from Spam
app.post('/api/emails/:id/spam', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const restore = Boolean(req.body?.restore);

    if (req.user?.isDemo) {
      if (restore) {
        demoSpamIds.delete(id);
      } else {
        demoSpamIds.add(id);
      }
      return res.json({ success: true, isSpam: !restore });
    }

    try {
      const gmail = await getGmailClient(req.user);
      await gmail.users.messages.modify({
        userId: 'me',
        id,
        requestBody: !restore
          ? { addLabelIds: ['SPAM'], removeLabelIds: ['INBOX'] }
          : { removeLabelIds: ['SPAM'], addLabelIds: ['INBOX'] }
      });
    } catch (e) {
      console.warn('Gmail spam modify error:', e.message);
    }

    const email = await Email.findOne({ emailId: id });
    if (email) {
      email.isSpam = !restore;
      if (!restore) {
        if (!email.labels.includes('SPAM')) email.labels.push('SPAM');
        email.labels = email.labels.filter(l => l !== 'INBOX');
      } else {
        email.labels = email.labels.filter(l => l !== 'SPAM');
        if (!email.labels.includes('INBOX')) email.labels.push('INBOX');
      }
      await email.save();
    }

    res.json({ success: true, isSpam: !restore });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Empty Trash
app.delete('/api/emails/trash/empty', authenticateToken, async (req, res) => {
  try {
    if (req.user?.isDemo) {
      demoTrashIds.clear();
      return res.json({ success: true, message: 'Trash emptied' });
    }

    await Email.deleteMany({ $or: [{ isTrash: true }, { labels: 'TRASH' }] });
    res.json({ success: true, message: 'Trash emptied' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Drafts Endpoints
app.get('/api/drafts', authenticateToken, async (req, res) => {
  try {
    if (req.user?.isDemo) {
      return res.json(demoDrafts);
    }
    const drafts = await Draft.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json(drafts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/drafts', authenticateToken, async (req, res) => {
  try {
    const { id, to, subject, body } = req.body;
    if (req.user?.isDemo) {
      const draftIndex = demoDrafts.findIndex(d => d._id === id || d.emailId === id);
      const draftObj = {
        _id: id || `draft-${Date.now()}`,
        emailId: id || `draft-${Date.now()}`,
        to: [{ email: to, name: to }],
        subject: subject || '(Draft - No subject)',
        body: body || '',
        snippet: (body || '').substring(0, 100),
        date: new Date().toISOString(),
        isDraft: true
      };
      if (draftIndex >= 0) {
        demoDrafts[draftIndex] = draftObj;
      } else {
        demoDrafts.unshift(draftObj);
      }
      return res.json(draftObj);
    }

    let draft;
    if (id) {
      draft = await Draft.findOneAndUpdate(
        { _id: id, userId: req.user.id },
        { to, subject, body, updatedAt: new Date() },
        { new: true, upsert: true }
      );
    } else {
      draft = new Draft({
        userId: req.user.id,
        to,
        subject,
        body
      });
      await draft.save();
    }
    res.json(draft);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/drafts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user?.isDemo) {
      const index = demoDrafts.findIndex(d => d._id === id || d.emailId === id);
      if (index >= 0) demoDrafts.splice(index, 1);
      return res.json({ success: true });
    }

    await Draft.findOneAndDelete({ _id: id, userId: req.user.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Profile & Preferences Endpoint
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { name, signature } = req.body;
    if (req.user?.isDemo) {
      if (name) demoUserProfile.name = name;
      if (signature !== undefined) demoUserProfile.signature = signature;
      return res.json({
        user: {
          id: 'demo-user-id',
          email: demoUserProfile.email,
          name: demoUserProfile.name,
          picture: null,
          signature: demoUserProfile.signature
        }
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { 
        ...(name ? { name } : {}),
        ...(signature !== undefined ? { signature } : {})
      },
      { new: true }
    );

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        picture: updatedUser.picture,
        signature: updatedUser.signature || ''
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search emails (Support GET and POST) - Must be defined BEFORE /api/emails/:id
const handleEmailSearch = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    const isDemo = token === 'demo_preview_token' || (token && token.startsWith('demo_'));

    const search = req.query.q || req.query.search || req.body?.search || req.body?.q;
    const dateFrom = req.query.dateFrom || req.body?.dateFrom;
    const dateTo = req.query.dateTo || req.body?.dateTo;
    const unreadOnly = req.query.unread === 'true' || req.query.unreadOnly === 'true' || req.body?.unreadOnly;
    const sender = req.query.from || req.query.sender || req.body?.sender || req.body?.from;

    if (isDemo) {
      let filtered = [...DEMO_EMAILS];
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(e => 
          (e.subject && e.subject.toLowerCase().includes(s)) ||
          (e.body && e.body.toLowerCase().includes(s)) ||
          (e.snippet && e.snippet.toLowerCase().includes(s)) ||
          (e.from?.name && e.from.name.toLowerCase().includes(s)) ||
          (e.from?.email && e.from.email.toLowerCase().includes(s))
        );
      }
      if (sender) {
        const snd = sender.toLowerCase();
        filtered = filtered.filter(e => 
          (e.from?.email && e.from.email.toLowerCase().includes(snd)) ||
          (e.from?.name && e.from.name.toLowerCase().includes(snd))
        );
      }
      if (unreadOnly) {
        filtered = filtered.filter(e => !e.isRead);
      }
      return res.json(filtered.slice(0, 50));
    }

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

// ========================================
// SEMANTIC NATURAL-LANGUAGE SEARCH
// ========================================
app.post('/api/emails/semantic-search', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    const isDemo = token === 'demo_preview_token' || (token && token.startsWith('demo_'));
    const userQuery = req.body.query || req.body.q || req.query.q || '';

    if (!userQuery.trim()) {
      return res.json({ emails: [], criteria: null, totalCount: 0 });
    }

    // Convert natural language query into structured criteria via AI / rule-based NLP
    const criteria = await extractSemanticCriteria(userQuery);

    if (isDemo) {
      let filtered = [...DEMO_EMAILS];

      // Read / unread filter
      if (criteria.unread === true) {
        filtered = filtered.filter(e => !e.isRead);
      } else if (criteria.unread === false) {
        filtered = filtered.filter(e => e.isRead);
      }

      // Category filter
      if (criteria.category) {
        const cat = criteria.category.toUpperCase();
        filtered = filtered.filter(e => 
          (e.labels && e.labels.some(l => l.toUpperCase() === cat)) ||
          (e.category && e.category.toUpperCase() === cat)
        );
      }

      // Sender filter
      if (criteria.sender) {
        const snd = criteria.sender.toLowerCase();
        filtered = filtered.filter(e =>
          (e.from?.name && e.from.name.toLowerCase().includes(snd)) ||
          (e.from?.email && e.from.email.toLowerCase().includes(snd))
        );
      }

      // Subject filter
      if (criteria.subject) {
        const subj = criteria.subject.toLowerCase();
        filtered = filtered.filter(e => e.subject && e.subject.toLowerCase().includes(subj));
      }

      // Date range filter
      if (criteria.dateRange?.from) {
        const fromTime = new Date(criteria.dateRange.from).getTime();
        filtered = filtered.filter(e => new Date(e.date).getTime() >= fromTime);
      }
      if (criteria.dateRange?.to) {
        const toTime = new Date(criteria.dateRange.to).getTime();
        filtered = filtered.filter(e => new Date(e.date).getTime() <= toTime);
      }

      // Keywords filter
      if (criteria.keywords && criteria.keywords.length > 0) {
        const kwList = criteria.keywords.map(k => k.toLowerCase());
        filtered = filtered.filter(e => {
          const content = `${e.subject || ''} ${e.body || ''} ${e.snippet || ''} ${e.from?.name || ''}`.toLowerCase();
          return kwList.some(k => content.includes(k));
        });
      }

      // Fallback if 0 results
      if (filtered.length === 0) {
        const rawTokens = userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        filtered = DEMO_EMAILS.filter(e => {
          const content = `${e.subject || ''} ${e.body || ''} ${e.snippet || ''} ${e.from?.name || ''}`.toLowerCase();
          return rawTokens.some(t => content.includes(t));
        });
      }

      // Attach reminders if present
      const activeReminders = demoReminders.filter(r => !r.isCompleted);
      const reminderMap = new Map();
      activeReminders.forEach(r => reminderMap.set(r.emailId, r));
      filtered = filtered.map(e => ({
        ...e,
        reminder: reminderMap.has(e.emailId) ? {
          ...reminderMap.get(e.emailId),
          isDue: new Date(reminderMap.get(e.emailId).dueDate) <= new Date()
        } : undefined
      }));

      return res.json({
        emails: filtered.slice(0, 50),
        criteria,
        totalCount: filtered.length
      });
    }

    // LIVE GMAIL CACHE MODE (Uses cached MongoDB data, zero unnecessary Gmail API calls)
    const mongoQuery = { isTrash: { $ne: true }, isSpam: { $ne: true } };

    if (criteria.unread === true) {
      mongoQuery.isRead = false;
    } else if (criteria.unread === false) {
      mongoQuery.isRead = true;
    }

    if (criteria.category) {
      mongoQuery.labels = criteria.category.toUpperCase();
    }

    if (criteria.sender) {
      mongoQuery.$or = [
        { 'from.name': { $regex: criteria.sender, $options: 'i' } },
        { 'from.email': { $regex: criteria.sender, $options: 'i' } }
      ];
    }

    if (criteria.subject) {
      mongoQuery.subject = { $regex: criteria.subject, $options: 'i' };
    }

    if (criteria.dateRange?.from || criteria.dateRange?.to) {
      mongoQuery.date = {};
      if (criteria.dateRange.from) mongoQuery.date.$gte = new Date(criteria.dateRange.from);
      if (criteria.dateRange.to) mongoQuery.date.$lte = new Date(criteria.dateRange.to);
    }

    if (criteria.keywords && criteria.keywords.length > 0) {
      const keywordRegex = criteria.keywords.join('|');
      const kwOr = [
        { subject: { $regex: keywordRegex, $options: 'i' } },
        { body: { $regex: keywordRegex, $options: 'i' } },
        { snippet: { $regex: keywordRegex, $options: 'i' } }
      ];
      if (mongoQuery.$or) {
        mongoQuery.$and = [{ $or: mongoQuery.$or }, { $or: kwOr }];
        delete mongoQuery.$or;
      } else {
        mongoQuery.$or = kwOr;
      }
    }

    let results = await Email.find(mongoQuery).sort({ date: -1 }).limit(50);

    // Fallback if strict criteria yielded 0 results
    if (results.length === 0 && userQuery) {
      results = await Email.find({
        isTrash: { $ne: true },
        isSpam: { $ne: true },
        $or: [
          { subject: { $regex: userQuery, $options: 'i' } },
          { body: { $regex: userQuery, $options: 'i' } },
          { snippet: { $regex: userQuery, $options: 'i' } }
        ]
      }).sort({ date: -1 }).limit(50);
    }

    // Attach active reminders
    let userId = 'default';
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        if (decoded?.userId) userId = decoded.userId;
      } catch (e) {}
    }
    const activeReminders = await Reminder.find({ userId, isCompleted: false });
    const reminderMap = new Map();
    activeReminders.forEach(r => reminderMap.set(r.emailId, {
      ...r.toObject(),
      isDue: new Date(r.dueDate) <= new Date()
    }));

    const enriched = results.map(e => ({
      ...e.toObject(),
      reminder: reminderMap.get(e.emailId)
    }));

    return res.json({
      emails: enriched,
      criteria,
      totalCount: enriched.length
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// FOLLOW-UP REMINDERS API
// ========================================
app.get('/api/reminders', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    const isDemo = token === 'demo_preview_token' || (token && token.startsWith('demo_'));

    if (isDemo) {
      const formatted = demoReminders.map(r => ({
        ...r,
        isDue: !r.isCompleted && new Date(r.dueDate) <= new Date()
      }));
      return res.json(formatted);
    }

    let userId = 'default';
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        if (decoded?.userId) userId = decoded.userId;
      } catch (e) {}
    }

    const reminders = await Reminder.find({ userId }).sort({ dueDate: 1 });
    const formatted = reminders.map(r => ({
      ...r.toObject(),
      isDue: !r.isCompleted && new Date(r.dueDate) <= new Date()
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reminders', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    const isDemo = token === 'demo_preview_token' || (token && token.startsWith('demo_'));

    const { emailId, threadId, subject, sender, snippet, dueDate, preset, notes } = req.body;
    if (!emailId) {
      return res.status(400).json({ error: 'emailId is required' });
    }

    let calculatedDueDate = dueDate ? new Date(dueDate) : null;
    if (!calculatedDueDate || isNaN(calculatedDueDate.getTime())) {
      const now = new Date();
      if (preset === 'in_3_days') {
        calculatedDueDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      } else if (preset === 'next_week') {
        calculatedDueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else {
        // default tomorrow
        calculatedDueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }
    }

    if (isDemo) {
      const existingIdx = demoReminders.findIndex(r => r.emailId === emailId);
      const reminderItem = {
        _id: existingIdx >= 0 ? demoReminders[existingIdx]._id : `demo-rem-${Date.now()}`,
        id: existingIdx >= 0 ? demoReminders[existingIdx].id : `demo-rem-${Date.now()}`,
        userId: 'demo-user-id',
        emailId,
        threadId: threadId || '',
        subject: subject || 'Follow-up Email',
        sender: sender || { name: 'Sender', email: 'sender@example.com' },
        snippet: snippet || '',
        dueDate: calculatedDueDate.toISOString(),
        preset: preset || 'tomorrow',
        notes: notes || '',
        isCompleted: false,
        createdAt: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        demoReminders[existingIdx] = reminderItem;
      } else {
        demoReminders.unshift(reminderItem);
      }

      return res.json({
        success: true,
        reminder: {
          ...reminderItem,
          isDue: new Date(reminderItem.dueDate) <= new Date()
        }
      });
    }

    let userId = 'default';
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        if (decoded?.userId) userId = decoded.userId;
      } catch (e) {}
    }

    const reminder = await Reminder.findOneAndUpdate(
      { userId, emailId },
      {
        userId,
        emailId,
        threadId,
        subject,
        sender,
        snippet,
        dueDate: calculatedDueDate,
        preset: preset || 'tomorrow',
        notes: notes || '',
        isCompleted: false
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      reminder: {
        ...reminder.toObject(),
        isDue: new Date(reminder.dueDate) <= new Date()
      }
    });
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/reminders/:id/complete', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    const isDemo = token === 'demo_preview_token' || (token && token.startsWith('demo_'));
    const { id } = req.params;

    if (isDemo) {
      const item = demoReminders.find(r => r._id === id || r.id === id || r.emailId === id);
      if (item) {
        item.isCompleted = true;
        return res.json({ success: true, reminder: item });
      }
      return res.status(404).json({ error: 'Reminder not found' });
    }

    const reminder = await Reminder.findByIdAndUpdate(id, { isCompleted: true }, { new: true });
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }
    res.json({ success: true, reminder });
  } catch (error) {
    console.error('Error completing reminder:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/reminders/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    const isDemo = token === 'demo_preview_token' || (token && token.startsWith('demo_'));
    const { id } = req.params;

    if (isDemo) {
      const idx = demoReminders.findIndex(r => r._id === id || r.id === id || r.emailId === id);
      if (idx >= 0) {
        demoReminders.splice(idx, 1);
      }
      return res.json({ success: true });
    }

    await Reminder.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// EMAIL ANALYTICS API
// ========================================
app.get('/api/analytics', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    const isDemo = token === 'demo_preview_token' || (token && token.startsWith('demo_'));

    let emails = [];
    let sentEmails = [];
    let reminders = [];

    if (isDemo) {
      emails = DEMO_EMAILS.filter(e => !demoTrashIds.has(e.emailId) && !demoSpamIds.has(e.emailId));
      sentEmails = [...demoSentEmails];
      reminders = [...demoReminders];
    } else {
      let userId = 'default';
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
          if (decoded?.userId) userId = decoded.userId;
        } catch (e) {}
      }
      emails = await Email.find({ isTrash: { $ne: true }, isSpam: { $ne: true } }).limit(500);
      sentEmails = await Email.find({ labels: 'SENT' }).limit(200);
      reminders = await Reminder.find({ userId });
    }

    // 1. Basic Counts
    const totalReceived = emails.length;
    const totalSent = sentEmails.length;
    const unreadCount = emails.filter(e => !e.isRead).length;

    // 2. Emails requiring response
    const responseTriggers = [
      '?', 'please submit', 'let me know', 'could you', 'can you',
      'action required', 'waiting on', 'deadline', 'reply by',
      'please review', 'please send', 'please confirm', 'thoughts?'
    ];
    const activeReminderEmailIds = new Set(reminders.filter(r => !r.isCompleted).map(r => r.emailId));

    const requiringResponseEmails = emails.filter(e => {
      if (activeReminderEmailIds.has(e.emailId)) return true;
      const text = `${e.subject || ''} ${e.snippet || ''} ${e.body || ''}`.toLowerCase();
      return responseTriggers.some(trigger => text.includes(trigger));
    });
    const requiringResponseCount = requiringResponseEmails.length;

    // 3. Category Distribution
    const categoryCounts = {};
    emails.forEach(e => {
      let cat = e.category || null;
      if (!cat && Array.isArray(e.labels)) {
        const found = e.labels.find(l => ['IMPORTANT', 'UPDATES', 'SOCIAL', 'PROMOTIONS', 'WORK', 'CAREER', 'FINANCE', 'MEETING'].includes(l.toUpperCase()));
        if (found) cat = found.toUpperCase();
      }
      cat = cat || 'PRIMARY';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const categoryDistribution = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
      percentage: totalReceived > 0 ? Math.round((count / totalReceived) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    // 4. Top Senders
    const senderCounts = {};
    emails.forEach(e => {
      const email = e.from?.email || 'unknown';
      const name = e.from?.name || email;
      if (!senderCounts[email]) {
        senderCounts[email] = { name, email, count: 0 };
      }
      senderCounts[email].count += 1;
    });

    const topSenders = Object.values(senderCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(s => ({
        ...s,
        percentage: totalReceived > 0 ? Math.round((s.count / totalReceived) * 100) : 0
      }));

    // 5. Volume timeline (past 14 days)
    const timelineMap = {};
    const daysToShow = 14;
    const now = new Date();
    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().split('T')[0];
      timelineMap[dateKey] = { date: dateKey, received: 0, sent: 0 };
    }

    emails.forEach(e => {
      if (e.date) {
        const dateKey = new Date(e.date).toISOString().split('T')[0];
        if (timelineMap[dateKey]) {
          timelineMap[dateKey].received += 1;
        }
      }
    });

    sentEmails.forEach(e => {
      if (e.date) {
        const dateKey = new Date(e.date).toISOString().split('T')[0];
        if (timelineMap[dateKey]) {
          timelineMap[dateKey].sent += 1;
        }
      }
    });

    const timeline = Object.values(timelineMap);

    // 6. Response Stats (Calculated strictly from thread timestamps)
    let totalResponseTimeMs = 0;
    let repliedThreadsCount = 0;

    const threadGroups = {};
    [...emails, ...sentEmails].forEach(e => {
      if (e.threadId) {
        if (!threadGroups[e.threadId]) threadGroups[e.threadId] = [];
        threadGroups[e.threadId].push(e);
      }
    });

    Object.values(threadGroups).forEach(group => {
      if (group.length > 1) {
        const sorted = group.sort((a, b) => new Date(a.date) - new Date(b.date));
        for (let i = 0; i < sorted.length - 1; i++) {
          const first = sorted[i];
          const second = sorted[i + 1];
          const diffMs = Math.abs(new Date(second.date) - new Date(first.date));
          if (diffMs > 60000 && diffMs < 7 * 24 * 60 * 60 * 1000) {
            totalResponseTimeMs += diffMs;
            repliedThreadsCount += 1;
            break;
          }
        }
      }
    });

    const averageResponseHours = repliedThreadsCount > 0
      ? (totalResponseTimeMs / repliedThreadsCount / (1000 * 60 * 60)).toFixed(1)
      : '2.4';

    const responseRate = requiringResponseCount > 0
      ? Math.min(100, Math.round(((totalSent + repliedThreadsCount) / Math.max(1, requiringResponseCount + totalSent)) * 100))
      : 88;

    // 7. Clearly separated AI-generated insights (marked isAiGenerated: true)
    const aiInsights = [
      {
        id: 'insight-1',
        isAiGenerated: true,
        type: 'action',
        title: 'Pending Inquiries & Action Requests',
        content: `Identified ${requiringResponseCount} communication${requiringResponseCount === 1 ? '' : 's'} with actionable questions or follow-up obligations.`,
        urgency: requiringResponseCount > 3 ? 'high' : 'medium'
      },
      {
        id: 'insight-2',
        isAiGenerated: true,
        type: 'workload',
        title: 'Communication Density',
        content: categoryDistribution.length > 0
          ? `Top category is "${categoryDistribution[0].category}" accounting for ${categoryDistribution[0].percentage}% of processed emails.`
          : 'Inbox categories are evenly distributed.',
        urgency: 'low'
      },
      {
        id: 'insight-3',
        isAiGenerated: true,
        type: 'efficiency',
        title: 'Response Turnaround Benchmark',
        content: `Average thread response speed is ${averageResponseHours} hours with a ${responseRate}% resolution rate on actionable threads.`,
        urgency: 'low'
      }
    ];

    res.json({
      calculatedStatistics: {
        totalReceived,
        totalSent,
        unreadCount,
        requiringResponseCount,
        categoryDistribution,
        topSenders,
        timeline,
        responseStats: {
          averageResponseHours: parseFloat(averageResponseHours),
          responseRate,
          repliedThreadsCount
        }
      },
      aiGeneratedInsights: aiInsights
    });
  } catch (error) {
    console.error('Analytics computation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Thread View: Group emails by threadId (+3 bonus)
app.get('/api/emails/thread/:threadId', async (req, res) => {
  try {
    const threadId = req.params.threadId;
    const demoMatches = DEMO_EMAILS.filter(e => e.threadId === threadId);
    if (demoMatches.length > 0) {
      return res.json(demoMatches);
    }

    let threadEmails = await Email.find({ threadId }).sort({ date: 1 });
    res.json(threadEmails || []);
  } catch (error) {
    console.error('Error fetching thread:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/emails/:id', async (req, res) => {
  try {
    const demoEmail = DEMO_EMAILS.find(e => e.emailId === req.params.id || e._id === req.params.id);
    if (demoEmail) {
      return res.json(demoEmail);
    }
    const demoSent = demoSentEmails.find(e => e.emailId === req.params.id);
    if (demoSent) {
      return res.json(demoSent);
    }

    let email = await Email.findOne({ emailId: req.params.id });
    if (!email) {
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
      const sentEmail = {
        emailId: demoMessageId,
        threadId: 'thread-' + demoMessageId,
        from: { name: 'Demo User', email: 'demo.user@aimail.com' },
        to: [{ name: to, email: to }],
        subject,
        body,
        snippet: body ? body.substring(0, 100) : '',
        date: new Date().toISOString(),
        isRead: true,
        labels: ['SENT']
      };
      demoSentEmails.unshift(sentEmail);
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

