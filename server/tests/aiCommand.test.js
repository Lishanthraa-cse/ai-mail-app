const test = require('node:test');
const assert = require('node:assert');
const { describe, it } = test;
const { parseCommandRuleBased } = require('../src/services/aiService');

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

describe('AI Command & Intent Parser', () => {
  describe('1. COMPOSE Intent', () => {
    it('should parse email with recipient, subject and body', () => {
      const command = "Send an email to john@example.com with subject 'Meeting' and body 'See you tomorrow'";
      const result = parseCommandRuleBased(command);

      assert.strictEqual(result.action, 'COMPOSE');
      assert.strictEqual(result.data.to, 'john@example.com');
      assert.strictEqual(result.data.subject, 'Meeting');
      assert.strictEqual(result.data.body, 'See you tomorrow');
    });

    it('should parse compose to recipient', () => {
      const command = 'Compose an email to alex@techcorp.io';
      const result = parseCommandRuleBased(command);

      assert.strictEqual(result.action, 'COMPOSE');
      assert.strictEqual(result.data.to, 'alex@techcorp.io');
    });

    it('should open compose with empty recipient if none specified', () => {
      const command = 'Write an email';
      const result = parseCommandRuleBased(command);

      assert.strictEqual(result.action, 'COMPOSE');
      assert.strictEqual(result.data.to, '');
    });
  });

  describe('2. FORWARD Intent', () => {
    it('should parse forward command with recipient and context', () => {
      const command = 'Forward this to team@example.com';
      const context = { currentEmailId: 'demo-1' };
      const result = parseCommandRuleBased(command, context);

      assert.strictEqual(result.action, 'FORWARD');
      assert.strictEqual(result.data.to, 'team@example.com');
      assert.strictEqual(result.data.emailId, 'demo-1');
    });

    it('should handle forward email to address', () => {
      const command = 'Forward email to dev@startup.ai';
      const result = parseCommandRuleBased(command);

      assert.strictEqual(result.action, 'FORWARD');
      assert.strictEqual(result.data.to, 'dev@startup.ai');
    });
  });

  describe('3. REPLY Intent', () => {
    it('should extract reply message with context', () => {
      const command = 'Reply saying I will be there';
      const context = { currentEmailId: 'demo-2' };
      const result = parseCommandRuleBased(command, context);

      assert.strictEqual(result.action, 'REPLY');
      assert.strictEqual(result.data.emailId, 'demo-2');
      assert.ok(result.data.message.toLowerCase().includes('i will be there'));
    });

    it('should handle simple reply command', () => {
      const command = 'Reply to this';
      const result = parseCommandRuleBased(command);

      assert.strictEqual(result.action, 'REPLY');
      assert.ok(result.data.message.length > 0);
    });
  });

  describe('4. OPEN & NAVIGATE Intent', () => {
    it('should extract sender name in open command', () => {
      const command = 'Open the latest email from Sarah';
      const result = parseCommandRuleBased(command);

      assert.strictEqual(result.action, 'OPEN');
      assert.strictEqual(result.data.sender?.toLowerCase(), 'sarah');
    });

    it('should extract subject in read command', () => {
      const command = 'Read email titled Quarterly AI Roadmap';
      const result = parseCommandRuleBased(command);

      assert.strictEqual(result.action, 'OPEN');
      assert.ok(result.data.subject?.includes('Quarterly AI Roadmap'));
    });
  });

  describe('5. FILTER & SEARCH Intent', () => {
    it('should detect unread filter and date range', () => {
      const command = 'Show unread emails from last week';
      const result = parseCommandRuleBased(command);

      assert.strictEqual(result.action, 'FILTER');
      assert.strictEqual(result.data.unread, true);
      assert.strictEqual(result.data.dateRange, 'last7days');
    });

    it('should detect search query', () => {
      const command = 'Find emails about Q4 roadmap';
      const result = parseCommandRuleBased(command);

      assert.strictEqual(result.action, 'SEARCH');
      assert.ok(result.data.search.toLowerCase().includes('q4 roadmap'));
    });
  });

  describe('6. Email Address Parsing Helpers', () => {
    it('should parse formatted email address', () => {
      const parsed = parseEmailAddress('Alex Rivera <alex@techcorp.io>');
      assert.strictEqual(parsed.name, 'Alex Rivera');
      assert.strictEqual(parsed.email, 'alex@techcorp.io');
    });

    it('should parse bare email address', () => {
      const parsed = parseEmailAddress('sarah@designsystems.dev');
      assert.strictEqual(parsed.email, 'sarah@designsystems.dev');
    });

    it('should parse comma-separated email list', () => {
      const parsed = parseEmailAddresses('Alex <alex@co.com>, Sarah <sarah@co.com>');
      assert.strictEqual(parsed.length, 2);
      assert.strictEqual(parsed[0].email, 'alex@co.com');
      assert.strictEqual(parsed[1].email, 'sarah@co.com');
    });
  });
});

