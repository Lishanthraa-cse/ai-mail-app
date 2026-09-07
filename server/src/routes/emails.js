const express = require('express');
const router = express.Router();
const { 
  fetchEmails, 
  getEmailById, 
  sendEmail, 
  syncEmails 
} = require('../services/emailService');
const { isAuthenticated } = require('../middleware/auth');

// Get inbox emails
router.get('/inbox', isAuthenticated, async (req, res) => {
  try {
    const { query = 'in:inbox', limit = 50 } = req.query;
    const emails = await fetchEmails(req.user.id, query);
    res.json(emails);
  } catch (error) {
    console.error('Error fetching inbox:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// Get sent emails
router.get('/sent', isAuthenticated, async (req, res) => {
  try {
    const emails = await fetchEmails(req.user.id, 'in:sent');
    res.json(emails);
  } catch (error) {
    console.error('Error fetching sent emails:', error);
    res.status(500).json({ error: 'Failed to fetch sent emails' });
  }
});

// Get single email
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const email = await getEmailById(req.user.id, req.params.id);
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    res.json(email);
  } catch (error) {
    console.error('Error fetching email:', error);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

// Send email
router.post('/send', isAuthenticated, async (req, res) => {
  try {
    const { to, subject, body, cc, bcc } = req.body;
    const result = await sendEmail(req.user.id, { to, subject, body, cc, bcc });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Search emails
router.get('/search', isAuthenticated, async (req, res) => {
  try {
    const { q, from, to, dateFrom, dateTo, unread } = req.query;
    let query = '';
    
    if (q) query += ` ${q}`;
    if (from) query += ` from:${from}`;
    if (to) query += ` to:${to}`;
    if (dateFrom) query += ` after:${dateFrom}`;
    if (dateTo) query += ` before:${dateTo}`;
    if (unread === 'true') query += ' is:unread';
    
    const emails = await fetchEmails(req.user.id, query.trim() || 'in:inbox');
    res.json(emails);
  } catch (error) {
    console.error('Error searching emails:', error);
    res.status(500).json({ error: 'Failed to search emails' });
  }
});

// Sync emails (for real-time updates)
router.post('/sync', isAuthenticated, async (req, res) => {
  try {
    const emails = await syncEmails(req.user.id);
    res.json({ message: 'Emails synced successfully', count: emails.length });
  } catch (error) {
    console.error('Error syncing emails:', error);
    res.status(500).json({ error: 'Failed to sync emails' });
  }
});

module.exports = router;