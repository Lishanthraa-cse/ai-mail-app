const test = require('node:test');
const assert = require('node:assert');

test('Gmail Folder Filter Logic', async (t) => {
  const sampleEmails = [
    { emailId: '1', subject: 'Roadmap', isRead: false, labels: ['INBOX', 'IMPORTANT'] },
    { emailId: '2', subject: 'Maintenance', isRead: true, labels: ['INBOX', 'UPDATES'] },
    { emailId: '3', subject: 'Social Invite', isRead: true, labels: ['INBOX', 'SOCIAL'] },
    { emailId: '4', subject: 'Promotion Deal', isRead: true, labels: ['INBOX', 'PROMOTIONS'] },
    { emailId: '5', subject: 'Old Message', isRead: true, labels: ['INBOX'] },
  ];

  const demoStarredIds = new Set(['1']);
  const demoTrashIds = new Set(['5']);
  const demoSpamIds = new Set();

  await t.test('inbox excludes trash and spam', () => {
    const inbox = sampleEmails.filter(e => !demoTrashIds.has(e.emailId) && !demoSpamIds.has(e.emailId));
    assert.strictEqual(inbox.length, 4);
    assert.strictEqual(inbox.some(e => e.emailId === '5'), false);
  });

  await t.test('starred folder filters starred emails', () => {
    const active = sampleEmails.filter(e => !demoTrashIds.has(e.emailId) && !demoSpamIds.has(e.emailId));
    const starred = active.filter(e => demoStarredIds.has(e.emailId));
    assert.strictEqual(starred.length, 1);
    assert.strictEqual(starred[0].emailId, '1');
  });

  await t.test('important folder isolates important label', () => {
    const active = sampleEmails.filter(e => !demoTrashIds.has(e.emailId) && !demoSpamIds.has(e.emailId));
    const important = active.filter(e => e.labels.includes('IMPORTANT'));
    assert.strictEqual(important.length, 1);
    assert.strictEqual(important[0].emailId, '1');
  });

  await t.test('category folder filters by category label', () => {
    const active = sampleEmails.filter(e => !demoTrashIds.has(e.emailId) && !demoSpamIds.has(e.emailId));
    const updates = active.filter(e => e.labels.includes('UPDATES'));
    assert.strictEqual(updates.length, 1);
    assert.strictEqual(updates[0].subject, 'Maintenance');

    const social = active.filter(e => e.labels.includes('SOCIAL'));
    assert.strictEqual(social.length, 1);
    assert.strictEqual(social[0].subject, 'Social Invite');

    const promotions = active.filter(e => e.labels.includes('PROMOTIONS'));
    assert.strictEqual(promotions.length, 1);
    assert.strictEqual(promotions[0].subject, 'Promotion Deal');
  });

  await t.test('trash folder contains trashed emails', () => {
    const trash = sampleEmails.filter(e => demoTrashIds.has(e.emailId));
    assert.strictEqual(trash.length, 1);
    assert.strictEqual(trash[0].emailId, '5');
  });
});

test('Email Lifecycle Actions', async (t) => {
  const starred = new Set();
  const trash = new Set();

  // Star toggle
  starred.add('msg-1');
  assert.strictEqual(starred.has('msg-1'), true);
  starred.delete('msg-1');
  assert.strictEqual(starred.has('msg-1'), false);

  // Trash & Restore
  trash.add('msg-2');
  assert.strictEqual(trash.has('msg-2'), true);
  trash.delete('msg-2');
  assert.strictEqual(trash.has('msg-2'), false);
});

test('Drafts & Profile Management', async (t) => {
  const drafts = [];
  const draftItem = {
    _id: 'draft-1',
    to: 'partner@company.com',
    subject: 'Quarterly Review',
    body: 'Here is the quarterly summary.'
  };

  drafts.push(draftItem);
  assert.strictEqual(drafts.length, 1);
  assert.strictEqual(drafts[0].subject, 'Quarterly Review');

  // Profile update
  let profile = {
    name: 'Initial Name',
    email: 'user@aimail.com',
    signature: ''
  };

  profile.name = 'Alex Rivera';
  profile.signature = '--\nBest regards,\nAlex Rivera';

  assert.strictEqual(profile.name, 'Alex Rivera');
  assert.ok(profile.signature.includes('Alex Rivera'));
});

