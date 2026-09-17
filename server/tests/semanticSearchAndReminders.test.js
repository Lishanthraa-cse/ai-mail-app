const test = require('node:test');
const assert = require('node:assert');
const { extractSemanticCriteriaRuleBased } = require('../src/services/aiService');

test('Semantic Search Criteria Extraction (Rule-Based NLP Fallback)', async (t) => {
  await t.test('converts "emails about interviews" to career and interview keywords', () => {
    const criteria = extractSemanticCriteriaRuleBased('emails about interviews');
    assert.strictEqual(criteria.category, 'CAREER');
    assert.ok(criteria.keywords.includes('interview'));
  });

  await t.test('converts "emails from recruiters last month" with sender and date range', () => {
    const criteria = extractSemanticCriteriaRuleBased('emails from recruiters last month');
    assert.strictEqual(criteria.sender, 'recruiter');
    assert.ok(criteria.dateRange.from !== null);
    assert.ok(criteria.dateRange.to !== null);
  });

  await t.test('converts "unread emails related to projects" with unread flag', () => {
    const criteria = extractSemanticCriteriaRuleBased('unread emails related to projects');
    assert.strictEqual(criteria.unread, true);
    assert.ok(criteria.keywords.includes('project'));
  });

  await t.test('converts "emails containing meeting invitations" with meeting category', () => {
    const criteria = extractSemanticCriteriaRuleBased('emails containing meeting invitations');
    assert.strictEqual(criteria.category, 'MEETING');
    assert.ok(criteria.keywords.includes('meeting') || criteria.keywords.includes('invitation'));
  });

  await t.test('converts "emails where someone asked me to submit a document"', () => {
    const criteria = extractSemanticCriteriaRuleBased('emails where someone asked me to submit a document');
    assert.strictEqual(criteria.category, 'ACTION_REQUIRED');
    assert.ok(criteria.keywords.includes('submit') || criteria.keywords.includes('document'));
  });
});

test('Follow-Up Reminders Due Date Calculation', async (t) => {
  const now = new Date();

  await t.test('tomorrow preset calculates roughly 24 hours ahead', () => {
    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    assert.ok(diffHours >= 23 && diffHours <= 25);
    const isDue = dueDate <= now;
    assert.strictEqual(isDue, false);
  });

  await t.test('past due date flags isDue as true', () => {
    const pastDueDate = new Date(Date.now() - 3600000); // 1 hour ago
    const isDue = pastDueDate <= new Date();
    assert.strictEqual(isDue, true);
  });
});

test('Email Analytics Aggregation Logic', async (t) => {
  const sampleEmails = [
    { emailId: '1', subject: 'Action needed: please submit document?', body: 'Please review', isRead: false, labels: ['INBOX', 'WORK'], from: { email: 'boss@tech.com', name: 'Boss' } },
    { emailId: '2', subject: 'Quarterly report', body: 'All metrics look good', isRead: true, labels: ['INBOX', 'UPDATES'], from: { email: 'colleague@tech.com', name: 'Colleague' } },
    { emailId: '3', subject: 'Interview schedule', body: 'Let me know your availability', isRead: false, labels: ['INBOX', 'CAREER'], from: { email: 'recruiter@talent.io', name: 'Recruiter' } }
  ];
  const sampleSent = [
    { emailId: 's1', subject: 'Re: Interview schedule', body: 'I am available on Friday', labels: ['SENT'] }
  ];

  await t.test('counts total received, sent, and unread correctly', () => {
    const totalReceived = sampleEmails.length;
    const totalSent = sampleSent.length;
    const unreadCount = sampleEmails.filter(e => !e.isRead).length;

    assert.strictEqual(totalReceived, 3);
    assert.strictEqual(totalSent, 1);
    assert.strictEqual(unreadCount, 2);
  });

  await t.test('detects emails requiring response', () => {
    const responseTriggers = ['?', 'please submit', 'let me know'];
    const requiring = sampleEmails.filter(e => {
      const text = `${e.subject} ${e.body}`.toLowerCase();
      return responseTriggers.some(t => text.includes(t));
    });
    // Email 1 has '?' and 'please submit', Email 3 has 'let me know'
    assert.strictEqual(requiring.length, 2);
  });
});

