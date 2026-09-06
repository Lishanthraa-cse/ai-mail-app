describe('Client Utilities & Formatting', () => {
  test('Markdown parser splits bold tags correctly', () => {
    const text = 'Hello **world**!';
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    expect(parts).toContain('**world**');
  });

  test('Filter logic filters unread emails properly', () => {
    const emails = [
      { id: 1, isRead: false },
      { id: 2, isRead: true },
      { id: 3, isRead: false },
    ];
    const unread = emails.filter(e => !e.isRead);
    expect(unread.length).toBe(2);
  });

  test('Avatar gradient selector generates consistent index', () => {
    const getGradientIndex = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return Math.abs(hash) % 6;
    };
    const idx1 = getGradientIndex('alice@example.com');
    const idx2 = getGradientIndex('alice@example.com');
    expect(idx1).toBe(idx2);
  });
});
