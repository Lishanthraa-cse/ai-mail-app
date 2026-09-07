const { getGmailClient } = require('../config/gmail');
const Email = require('../models/Email');

// Fetch emails from Gmail
const fetchEmails = async (userId, query = 'in:inbox') => {
  try {
    const gmail = await getGmailClient(userId);
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 50
    });

    const emails = [];
    if (response.data.messages) {
      for (const message of response.data.messages) {
        const emailData = await getEmailById(userId, message.id);
        if (emailData) {
          emails.push(emailData);
        }
      }
    }

    return emails;
  } catch (error) {
    console.error('Error fetching emails:', error);
    throw error;
  }
};

// Get single email by ID
const getEmailById = async (userId, gmailId) => {
  try {
    // Check if email exists in DB
    let email = await Email.findOne({ userId, gmailId });
    
    if (email) {
      return email;
    }

    // Fetch from Gmail if not in DB
    const gmail = await getGmailClient(userId);
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: gmailId,
      format: 'full'
    });

    const parsedEmail = parseGmailMessage(response.data);
    parsedEmail.userId = userId;
    parsedEmail.gmailId = gmailId;
    
    email = new Email(parsedEmail);
    await email.save();
    
    return email;
  } catch (error) {
    console.error('Error fetching email by ID:', error);
    throw error;
  }
};

// Parse Gmail message
const parseGmailMessage = (message) => {
  const headers = message.payload.headers;
  
  const getHeader = (name) => {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
  };

  const from = parseEmailAddress(getHeader('from'));
  const to = parseEmailAddresses(getHeader('to'));
  
  let body = '';
  if (message.payload.parts) {
    const textPart = message.payload.parts.find(part => 
      part.mimeType === 'text/plain' || part.mimeType === 'text/html'
    );
    if (textPart && textPart.body.data) {
      body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
    }
  } else if (message.payload.body && message.payload.body.data) {
    body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  }

  return {
    threadId: message.threadId,
    from,
    to,
    subject: getHeader('subject'),
    body: body || getHeader('snippet') || message.snippet,
    snippet: message.snippet,
    date: new Date(getHeader('date')),
    isRead: !message.labelIds?.includes('UNREAD'),
    labels: message.labelIds || []
  };
};

// Parse email address
const parseEmailAddress = (str) => {
  if (!str) return { email: '', name: '' };
  const match = str.match(/(.*)<(.*)>/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: str, email: str };
};

// Parse multiple email addresses
const parseEmailAddresses = (str) => {
  if (!str) return [];
  return str.split(',').map(s => parseEmailAddress(s.trim()));
};

// Send email
const sendEmail = async (userId, { to, subject, body, cc = [], bcc = [] }) => {
  try {
    const gmail = await getGmailClient(userId);
    
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

    return response.data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Sync emails for a user
const syncEmails = async (userId) => {
  try {
    const emails = await fetchEmails(userId);
    
    for (const emailData of emails) {
      await Email.findOneAndUpdate(
        { userId, gmailId: emailData.gmailId },
        emailData,
        { upsert: true, new: true }
      );
    }

    // Emit real-time update
    const io = require('../index').io;
    if (io) {
      io.emit('emails-synced', { userId, count: emails.length });
    }

    return emails;
  } catch (error) {
    console.error('Error syncing emails:', error);
    throw error;
  }
};

module.exports = {
  fetchEmails,
  getEmailById,
  sendEmail,
  syncEmails
};