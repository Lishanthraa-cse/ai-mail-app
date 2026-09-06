const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
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

describe('🤖 AI Copilot Command & Intent Parser', () => {
  describe('1. COMPOSE Intent', () => {
    it('should correctly parse "Send an email to john@example.com with subject Meeting and body See you tomorrow"', () => {
      const command = "Send an email to john@example.com with subject 'Meeting' and body 'See you tomorrow'";
      const result = parseCommandRuleBased(command);

      assert.equal(result.action, 'COMPOSE');
      assert.equal(result.data.to, 'john@example.com');
      assert.equal(result.data.subject, 'Meeting');
      assert.equal(result.data.body, 'See you tomorrow');
    });

    it('should parse simple "Compose to alex@techcorp.io"', () => {
      const command = 'Compose an email to alex@techcorp.io';
      const result = parseCommandRuleBased(command);

      assert.equal(result.action, 'COMPOSE');
      assert.equal(result.data.to, 'alex@techcorp.io');
    });

    it('should open empty compose if no recipient specified', () => {
      const command = 'Write an email';
      const result = parseCommandRuleBased(command);

      assert.equal(result.action, 'COMPOSE');
      assert.equal(result.data.to, '');
    });
  });

  describe('2. FORWARD Intent (+5 Bonus)', () => {
    it('should recognize "Forward this to team@example.com" and extract recipient and context', () => {
      const command = 'Forward this to team@example.com';
      const context = { currentEmailId: 'demo-1' };
      const result = parseCommandRuleBased(command, context);

      assert.equal(result.action, 'FORWARD');
      assert.equal(result.data.to, 'team@example.com');
      assert.equal(result.data.emailId, 'demo-1');
    });

    it('should handle "Forward email to dev@startup.ai"', () => {
      const command = 'Forward email to dev@startup.ai';
      const result = parseCommandRuleBased(command);

      assert.equal(result.action, 'FORWARD');
      assert.equal(result.data.to, 'dev@startup.ai');
    });
  });

  describe('3. REPLY Intent (+5 Bonus)', () => {
    it('should extract contextual reply text: "Reply saying I will be there"', () => {
      const command = "Reply saying I will be there";
      const context = { currentEmailId: 'demo-2' };
      const result = parseCommandRuleBased(command, context);

      assert.equal(result.action, 'REPLY');
      assert.equal(result.data.emailId, 'demo-2');
      assert.ok(result.data.message.toLowerCase().includes('i will be there'));
    });

    it('should handle simple "Reply to this"', () => {
      const command = 'Reply to this';
      const result = parseCommandRuleBased(command);

      assert.equal(result.action, 'REPLY');
      assert.ok(result.data.message.length > 0);
    });
  });

  describe('4. OPEN & NAVIGATE Intent', () => {
    it('should parse sender in "Open the latest email from Sarah"', () => {
      const command = 'Open the latest email from Sarah';
      const result = parseCommandRuleBased(command);

      assert.equal(result.action, 'OPEN');
      assert.equal(result.data.sender?.toLowerCase(), 'sarah');
    });

    it('should parse subject in "Read email titled Quarterly AI Roadmap"', () => {
      const command = 'Read email titled Quarterly AI Roadmap';
      const result = parseCommandRuleBased(command);

      assert.equal(result.action, 'OPEN');
      assert.ok(result.data.subject?.includes('Quarterly AI Roadmap'));
    });
  });

  describe('5. FILTER & SEARCH Intent', () => {
    it('should detect unread filter in "Show unread emails from last week"', () => {
      const command = 'Show unread emails from last week';
      const result = parseCommandRuleBased(command);

      assert.equal(result.action, 'FILTER');
      assert.equal(result.data.unread, true);
      assert.equal(result.data.dateRange, 'last7days');
    });

    it('should detect search query in "Find emails about Q4 roadmap"', () => {
      const command = 'Find emails about Q4 roadmap';
      const result = parseCommandRuleBased(command);

      assert.equal(result.action, 'SEARCH');
      assert.ok(result.data.search.toLowerCase().includes('q4 roadmap'));
    });
  });

  describe('6. Email RFC Address Parsing Helpers', () => {
    it('should correctly parse "Alex Rivera <alex@techcorp.io>"', () => {
      const parsed = parseEmailAddress('Alex Rivera <alex@techcorp.io>');
      assert.equal(parsed.name, 'Alex Rivera');
      assert.equal(parsed.email, 'alex@techcorp.io');
    });

    it('should parse bare email "sarah@designsystems.dev"', () => {
      const parsed = parseEmailAddress('sarah@designsystems.dev');
      assert.equal(parsed.email, 'sarah@designsystems.dev');
    });

    it('should parse multiple comma-separated addresses', () => {
      const parsed = parseEmailAddresses('Alex <alex@co.com>, Sarah <sarah@co.com>');
      assert.equal(parsed.length, 2);
      assert.equal(parsed[0].email, 'alex@co.com');
      assert.equal(parsed[1].email, 'sarah@co.com');
    });
  });
});
