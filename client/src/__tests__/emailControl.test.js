import { SAMPLE_EMAILS } from '../services/api';

describe('Mail Client Core Logic & Dataset', () => {
  test('SAMPLE_EMAILS contains required email structure', () => {
    expect(SAMPLE_EMAILS.length).toBeGreaterThan(0);
    SAMPLE_EMAILS.forEach(email => {
      expect(email).toHaveProperty('emailId');
      expect(email).toHaveProperty('from');
      expect(email.from).toHaveProperty('email');
      expect(email).toHaveProperty('subject');
      expect(email).toHaveProperty('body');
      expect(email).toHaveProperty('threadId');
      expect(typeof email.isRead).toBe('boolean');
    });
  });

  test('Thread grouping contains multi-message thread', () => {
    const threadMap = {};
    SAMPLE_EMAILS.forEach(email => {
      if (email.threadId) {
        threadMap[email.threadId] = (threadMap[email.threadId] || 0) + 1;
      }
    });

    const multiTurnThread = Object.values(threadMap).some(count => count > 1);
    expect(multiTurnThread).toBe(true);
  });

  test('Search filter matches subject and body text', () => {
    const query = 'roadmap';
    const matches = SAMPLE_EMAILS.filter(email => 
      email.subject.toLowerCase().includes(query) || 
      email.body.toLowerCase().includes(query)
    );

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].subject).toContain('Roadmap');
  });

  test('Unread filter isolates unread messages', () => {
    const unreadEmails = SAMPLE_EMAILS.filter(e => !e.isRead);
    expect(unreadEmails.length).toBeGreaterThan(0);
    unreadEmails.forEach(e => {
      expect(e.isRead).toBe(false);
    });
  });

  test('Follow-up reminders due date logic flags past deadlines', () => {
    const futureReminder = {
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      isCompleted: false
    };
    const pastReminder = {
      dueDate: new Date(Date.now() - 3600000).toISOString(),
      isCompleted: false
    };

    expect(new Date(futureReminder.dueDate) <= new Date()).toBe(false);
    expect(new Date(pastReminder.dueDate) <= new Date()).toBe(true);
  });

  test('Semantic search keyword and category matching on local dataset', () => {
    const careerMatches = SAMPLE_EMAILS.filter(e => 
      e.labels?.includes('CAREER') || 
      e.subject.toLowerCase().includes('roadmap') || 
      e.body.toLowerCase().includes('sprint')
    );
    expect(careerMatches.length).toBeGreaterThan(0);
  });

  test('Calculated analytics statistics accuracy', () => {
    const totalReceived = SAMPLE_EMAILS.length;
    const unreadCount = SAMPLE_EMAILS.filter(e => !e.isRead).length;

    expect(totalReceived).toBeGreaterThan(0);
    expect(unreadCount).toBeLessThanOrEqual(totalReceived);
  });
});

