const test = require('node:test');
const assert = require('node:assert');

test('Command parser action detection', () => {
  const parseAction = (query) => {
    const q = query.toLowerCase();
    if (q.includes('inbox') || q.includes('go to inbox')) return { action: 'NAVIGATE', target: 'inbox' };
    if (q.includes('sent') || q.includes('sent messages')) return { action: 'NAVIGATE', target: 'sent' };
    if (q.includes('compose') || q.includes('write an email')) return { action: 'NAVIGATE', target: 'compose' };
    return { action: 'UNKNOWN' };
  };

  assert.deepStrictEqual(parseAction('Take me to my inbox'), { action: 'NAVIGATE', target: 'inbox' });
  assert.deepStrictEqual(parseAction('Show sent messages'), { action: 'NAVIGATE', target: 'sent' });
  assert.deepStrictEqual(parseAction('Open compose window'), { action: 'NAVIGATE', target: 'compose' });
});

test('Compose parameter extraction', () => {
  const extractCompose = (query) => {
    const toMatch = query.match(/to\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    const subjectMatch = query.match(/subject\s+['"]([^'"]+)['"]/i);
    return {
      action: 'COMPOSE',
      to: toMatch ? toMatch[1] : null,
      subject: subjectMatch ? subjectMatch[1] : null,
    };
  };

  const parsed = extractCompose("Send email to alex@techcorp.io with subject 'Project Sync'");
  assert.strictEqual(parsed.action, 'COMPOSE');
  assert.strictEqual(parsed.to, 'alex@techcorp.io');
  assert.strictEqual(parsed.subject, 'Project Sync');
});

test('Email Thread Grouper groups messages by threadId', () => {
  const emails = [
    { id: '1', threadId: 'thread-A', subject: 'Roadmap' },
    { id: '2', threadId: 'thread-B', subject: 'Invoice' },
    { id: '3', threadId: 'thread-A', subject: 'Re: Roadmap' },
  ];

  const grouped = emails.reduce((acc, email) => {
    const tid = email.threadId || email.id;
    if (!acc[tid]) acc[tid] = [];
    acc[tid].push(email);
    return acc;
  }, {});

  assert.strictEqual(Object.keys(grouped).length, 2);
  assert.strictEqual(grouped['thread-A'].length, 2);
  assert.strictEqual(grouped['thread-B'].length, 1);
});

test('Filter Logic isolates unread emails', () => {
  const emails = [
    { id: '1', isRead: false, isStarred: true },
    { id: '2', isRead: true, isStarred: false },
    { id: '3', isRead: false, isStarred: false },
  ];

  const unreadOnly = emails.filter(e => !e.isRead);
  assert.strictEqual(unreadOnly.length, 2);
});

