const express = require('express');
const router = express.Router();
const { parseCommand, generateReply } = require('../services/aiService');
const { sendEmail, fetchEmails, getEmailById } = require('../services/emailService');
const { isAuthenticated } = require('../middleware/auth');

// Process AI command
router.post('/command', isAuthenticated, async (req, res) => {
  try {
    const { command, context = {} } = req.body;
    
    console.log('🤖 AI Command:', command);
    
    // Parse the natural language command
    const parsed = await parseCommand(command, context);
    console.log('📝 Parsed command:', parsed);
    
    // Execute the action
    let result = null;
    let message = '';
    
    switch (parsed.action) {
      case 'COMPOSE':
        result = await handleCompose(req.user.id, parsed.params);
        message = `✅ Email composed successfully to ${parsed.params.to}`;
        break;
      case 'SEARCH':
        result = await handleSearch(req.user.id, parsed.params);
        message = `🔍 Found ${result.length} emails matching your search`;
        break;
      case 'OPEN':
        result = await handleOpen(req.user.id, parsed.params);
        message = `📧 Opened email: ${result.subject}`;
        break;
      case 'REPLY':
        result = await handleReply(req.user.id, parsed.params, context);
        message = `✉️ Reply generated for: ${result.email.subject}`;
        break;
      case 'FILTER':
        result = await handleFilter(req.user.id, parsed.params);
        message = `🔍 Filter applied, found ${result.length} emails`;
        break;
      default:
        throw new Error('Unknown action');
    }
    
    res.json({
      success: true,
      action: parsed.action,
      result,
      message
    });
  } catch (error) {
    console.error('❌ Error processing AI command:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process command'
    });
  }
});

// Handle compose action
async function handleCompose(userId, params) {
  const { to, subject, body } = params;
  return await sendEmail(userId, { to, subject, body });
}

// Handle search action
async function handleSearch(userId, params) {
  const { query, dateRange, unreadOnly } = params;
  let searchQuery = '';
  
  if (query) searchQuery += query;
  if (dateRange) {
    const date = new Date();
    if (dateRange === 'last7days') {
      date.setDate(date.getDate() - 7);
      searchQuery += ` after:${date.toISOString().split('T')[0]}`;
    } else if (dateRange === 'last30days') {
      date.setDate(date.getDate() - 30);
      searchQuery += ` after:${date.toISOString().split('T')[0]}`;
    }
  }
  if (unreadOnly) searchQuery += ' is:unread';
  
  return await fetchEmails(userId, searchQuery || 'in:inbox');
}

// Handle open action
async function handleOpen(userId, params) {
  const { sender, subject } = params;
  let query = '';
  if (sender) query += ` from:${sender}`;
  if (subject) query += ` subject:${subject}`;
  
  const emails = await fetchEmails(userId, query || 'in:inbox');
  if (emails.length > 0) {
    return emails[0]; // Return the most recent email
  }
  throw new Error('Email not found');
}

// Handle reply action
async function handleReply(userId, params, context) {
  const { emailId, message } = params;
  const email = await getEmailById(userId, emailId || context.currentEmailId);
  if (!email) {
    throw new Error('Email not found');
  }
  
  const replyBody = await generateReply(email, message || 'Please generate a professional reply');
  return {
    email,
    reply: {
      to: email.from.email,
      subject: `Re: ${email.subject}`,
      body: replyBody
    }
  };
}

// Handle filter action
async function handleFilter(userId, params) {
  const { unreadOnly, dateRange, sender, keyword } = params;
  let query = 'in:inbox';
  
  if (unreadOnly) query += ' is:unread';
  if (sender) query += ` from:${sender}`;
  if (keyword) query += ` ${keyword}`;
  if (dateRange) {
    const date = new Date();
    if (dateRange === 'today') {
      query += ` after:${new Date().toISOString().split('T')[0]}`;
    } else if (dateRange === 'thisweek') {
      date.setDate(date.getDate() - 7);
      query += ` after:${date.toISOString().split('T')[0]}`;
    } else if (dateRange === 'thismonth') {
      date.setMonth(date.getMonth() - 1);
      query += ` after:${date.toISOString().split('T')[0]}`;
    }
  }
  
  return await fetchEmails(userId, query);
}

module.exports = router;