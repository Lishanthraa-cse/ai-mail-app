const OpenAI = require('openai');
const axios = require('axios');

const getOpenAiClient = () => {
  if (process.env.GROQ_API_KEY) {
    try {
      return new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1'
      });
    } catch (e) {
      // ignore
    }
  }
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } catch (e) {
    return null;
  }
};

const callGemini = async (systemPrompt, userPrompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nUser Input: ${userPrompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      },
      { timeout: 8000 }
    );
    const text = res.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      return JSON.parse(text);
    }
  } catch (err) {
    // gemini error fallback
  }
  return null;
};

let openaiQuotaExhausted = false;

const parseCommand = async (command, context = {}) => {
  const systemPrompt = `You are an AI assistant that controls a mail application. 
Parse the user's natural language command and return a structured action.

Available actions:
1. COMPOSE - Send an email (to, subject, body)
2. SEARCH - Search/filter emails (search, query)
3. OPEN - Open a specific email (sender, subject)
4. REPLY - Reply to current email (emailId, message)
5. FILTER - Apply filters to inbox (unread, sender, dateRange)
6. FORWARD - Forward an email (to, emailId)

Return strict JSON only (no markdown, no backticks) with keys:
{
  "action": "COMPOSE" | "SEARCH" | "OPEN" | "REPLY" | "FILTER" | "FORWARD",
  "message": "User-friendly description of what was done",
  "data": { ...parameters... }
}
Current context: ${JSON.stringify(context)}`;

  // 1. Try Gemini (Free tier) if key is provided
  if (process.env.GEMINI_API_KEY) {
    const geminiResult = await callGemini(systemPrompt, command);
    if (geminiResult && geminiResult.action) {
      return geminiResult;
    }
  }

  // 2. Try Groq or OpenAI (only if quota not exhausted)
  if (!openaiQuotaExhausted) {
    const openai = getOpenAiClient();
    if (openai) {
      try {
        const modelName = process.env.GROQ_API_KEY ? 'llama-3.1-8b-instant' : 'gpt-3.5-turbo';
        const response = await openai.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: command }
          ],
          response_format: { type: 'json_object' }
        });

        return JSON.parse(response.choices[0].message.content);
      } catch (error) {
        if (error.message?.includes('429') || error.message?.includes('credits') || error.status === 429) {
          openaiQuotaExhausted = true;
        }
      }
    }
  }

  // 3. Robust rule-based parser (always works offline with 0 credits)
  return parseCommandRuleBased(command, context);
};

const generateReply = async (email, userMessage) => {
  if (!openaiQuotaExhausted) {
    const openai = getOpenAiClient();
    if (openai) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an AI assistant helping to compose email replies. Generate a professional reply based on the original email and user instructions.'
            },
            {
              role: 'user',
              content: `Original email: ${email.subject}\n${email.body}\n\nUser instructions: ${userMessage}\n\nGenerate a reply.`
            }
          ]
        });

        return response.choices[0].message.content;
      } catch (error) {
        if (error.message?.includes('429') || error.message?.includes('credits') || error.status === 429) {
          openaiQuotaExhausted = true;
        }
      }
    }
  }

  return `Thank you for your email regarding "${email.subject}". ${userMessage ? `\n\n${userMessage}` : '\n\nI will review and follow up shortly.'}\n\nBest regards`;
};

const parseCommandRuleBased = (command, context = {}) => {
  if (!command || typeof command !== 'string') {
    return {
      action: 'SEARCH',
      message: 'No command provided',
      data: { search: '' }
    };
  }

  // Normalize and clean quotes/punctuation
  let cleaned = command.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();
  const lower = cleaned.toLowerCase();

  // 1. FORWARD ACTION
  if (lower.startsWith('forward') || lower.includes('forward this') || lower.includes('forward email')) {
    const toMatch = cleaned.match(/(?:to|recipient)\s+([^\s,]+@[^\s,]+)/i);
    return {
      action: 'FORWARD',
      message: toMatch ? `Preparing forward to ${toMatch[1]}` : 'Preparing forward',
      data: {
        to: toMatch ? toMatch[1] : '',
        emailId: context.currentEmailId || null
      }
    };
  }

  // 2. COMPOSE ACTION
  if (lower.startsWith('compose') || lower.startsWith('send') || lower.startsWith('write') || lower.includes('send an email') || lower.includes('write an email')) {
    const toMatch = cleaned.match(/(?:to|recipient)\s+([^\s,]+@[^\s,]+|[a-zA-Z0-9_-]+)/i);
    const subjMatch = cleaned.match(/subject\s+['"]?([^'"]+?)['"]?(?:\s+(?:body|and|with)|$)/i);
    const bodyMatch = cleaned.match(/body\s+['"]?([^'"]+?)['"]?$/i);
    return {
      action: 'COMPOSE',
      message: toMatch ? `Opening compose for ${toMatch[1]}` : 'Opening compose window',
      data: {
        to: toMatch ? toMatch[1] : '',
        subject: subjMatch ? subjMatch[1].trim() : '',
        body: bodyMatch ? bodyMatch[1].trim() : ''
      }
    };
  }

  // 3. REPLY ACTION
  const isReply = lower.startsWith('reply') || lower.includes('reply to this') || lower.includes('reply saying') || lower.includes('reply that') || lower.includes('send a reply');
  if (isReply) {
    let userMsg = '';
    if (/^reply\s*(?:to\s*this(?:\s*email)?)?\s*$/i.test(cleaned)) {
      userMsg = '';
    } else {
      userMsg = cleaned.replace(/^(?:please\s+)?reply\s+(?:to\s+this(?:\s+email)?\s*)?(?:saying|that|with)?\s*/i, '').trim();
      userMsg = userMsg.replace(/^['"]|['"]$/g, '');
      if (userMsg.toLowerCase() === 'to this' || userMsg.toLowerCase() === 'to this email') {
        userMsg = '';
      }
    }

    return {
      action: 'REPLY',
      message: 'Drafting contextual reply',
      data: {
        emailId: context.currentEmailId || null,
        message: userMsg || 'Thank you for your email. I will follow up shortly.'
      }
    };
  }

  // Date expression extraction
  let dateDays = null;
  const daysMatch = lower.match(/last\s+(\d+)\s+days?/i);
  const hoursMatch = lower.match(/last\s+(\d+)\s+hours?/i);
  if (daysMatch) {
    dateDays = parseInt(daysMatch[1], 10);
  } else if (hoursMatch) {
    dateDays = Math.max(1, Math.ceil(parseInt(hoursMatch[1], 10) / 24));
  } else if (lower.includes('last 24 hours') || lower.includes('today')) {
    dateDays = 1;
  } else if (lower.includes('last 48 hours') || lower.includes('yesterday')) {
    dateDays = 2;
  } else if (lower.includes('last 7 days') || lower.includes('last week') || lower.includes('past week') || lower.includes('this week')) {
    dateDays = 7;
  } else if (lower.includes('last month') || lower.includes('past month') || lower.includes('last 30 days')) {
    dateDays = 30;
  }

  // Sender extraction (ignoring words like "the", "last", etc.)
  let sender = undefined;
  const fromMatch = cleaned.match(/(?:from|by)\s+([^\s,]+)/i);
  if (fromMatch) {
    const rawSender = fromMatch[1].replace(/['",.]/g, '');
    if (!['the', 'last', 'this', 'past', 'yesterday', 'today', 'me'].includes(rawSender.toLowerCase())) {
      sender = rawSender;
    }
  }

  // Subject / Keyword extraction
  let keyword = undefined;
  const aboutMatch = cleaned.match(/(?:about|regarding|titled|on|subject)\s+['"]?([^'"]+?)['"]?$/i);
  if (aboutMatch) {
    keyword = aboutMatch[1].trim().replace(/^(?:the|an|a)\s+/i, '');
  }

  // 4. OPEN ACTION
  if (lower.startsWith('open') || lower.startsWith('read') || lower.startsWith('view')) {
    return {
      action: 'OPEN',
      message: `Opening email${sender ? ` from ${sender}` : ''}${keyword ? ` about "${keyword}"` : ''}`,
      data: {
        sender,
        subject: keyword
      }
    };
  }

  // 5. FILTER ACTION (Date expressions, unread, or filter commands)
  const isFilter = lower.startsWith('filter') || lower.startsWith('show') || lower.includes('unread') || dateDays !== null;
  if (isFilter) {
    const filterDesc = [];
    if (dateDays) filterDesc.push(`last ${dateDays} day${dateDays === 1 ? '' : 's'}`);
    if (lower.includes('unread')) filterDesc.push('unread');
    if (sender) filterDesc.push(`from ${sender}`);
    if (keyword) filterDesc.push(`about "${keyword}"`);

    return {
      action: 'FILTER',
      message: `Applying inbox filter${filterDesc.length > 0 ? ` (${filterDesc.join(', ')})` : ''}`,
      data: {
        unread: lower.includes('unread'),
        sender,
        dateDays,
        dateRange: dateDays ? `last${dateDays}days` : undefined,
        keyword
      }
    };
  }

  // 6. DEFAULT: SEARCH ACTION
  let cleanQuery = cleaned.replace(/^(?:search|find|show|look for)\s+(?:emails?\s+)?(?:for\s+|about\s+)?/i, '').trim();
  cleanQuery = cleanQuery.replace(/^(?:the|an|a)\s+emails?\s+/i, '').trim();
  return {
    action: 'SEARCH',
    message: `Searching for "${cleanQuery || cleaned}"`,
    data: {
      search: cleanQuery || cleaned,
      sender,
      keyword: keyword || (sender ? undefined : cleanQuery)
    }
  };
};

// Natural-Language Semantic Criteria Extraction
const extractSemanticCriteriaRuleBased = (rawQuery = '') => {
  if (!rawQuery || typeof rawQuery !== 'string') {
    return {
      sender: null,
      keywords: [],
      dateFrom: null,
      dateTo: null,
      dateRangeLabel: null,
      unreadOnly: false,
      subject: null,
      category: null,
      intent: null,
      originalQuery: ''
    };
  }

  const query = rawQuery.trim();
  const lower = query.toLowerCase();

  // 1. Unread status
  const unreadOnly = /\bunread\b/i.test(lower);

  // 2. Date range extraction
  let dateFrom = null;
  let dateTo = null;
  let dateRangeLabel = null;
  const now = new Date();

  if (lower.includes('last month') || lower.includes('past month')) {
    dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    dateTo = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    dateRangeLabel = 'Last month';
  } else if (lower.includes('this month')) {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    dateRangeLabel = 'This month';
  } else if (lower.includes('last week') || lower.includes('past week') || lower.includes('last 7 days')) {
    dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    dateRangeLabel = 'Last 7 days';
  } else if (lower.includes('today')) {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    dateRangeLabel = 'Today';
  } else if (lower.includes('yesterday')) {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    dateRangeLabel = 'Yesterday';
  }

  // 3. Sender extraction
  let sender = null;
  const fromMatch = query.match(/(?:from|sent by)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9_-]+)/i);
  if (fromMatch) {
    let candidate = fromMatch[1].trim().toLowerCase();
    if (!['the', 'a', 'an', 'me', 'last', 'past', 'this', 'yesterday', 'today'].includes(candidate)) {
      if (candidate.endsWith('s') && candidate.length > 4 && !candidate.endsWith('ss')) {
        if (['recruiters', 'managers', 'engineers', 'clients', 'founders'].includes(candidate)) {
          candidate = candidate.slice(0, -1);
        }
      }
      sender = candidate;
    }
  }

  // 4. Category & Intent detection
  let category = null;
  let intent = null;

  if (/\b(?:interview|interviews|recruiter|recruiters|recruiting|job offer|hiring|talent)\b/i.test(lower)) {
    category = 'CAREER';
  } else if (/\b(?:meeting|meetings|invitation|invitations|calendar|schedule|zoom|google meet)\b/i.test(lower)) {
    category = 'MEETING';
  } else if (/\b(?:submit|document|documents|attachment|attachments|files|upload|sign)\b/i.test(lower)) {
    category = 'ACTION_REQUIRED';
    intent = 'document_submission';
  } else if (/\b(?:project|projects|sprint|roadmap|task|tasks|deploy|k8s|kubernetes|github)\b/i.test(lower)) {
    category = 'WORK';
  } else if (/\b(?:invoice|invoices|receipt|receipts|billing|payment|payments|payout)\b/i.test(lower)) {
    category = 'FINANCE';
  } else if (/\b(?:security|alert|alerts|audit|vulnerability)\b/i.test(lower)) {
    category = 'SECURITY';
  } else if (/\b(?:social|party|lunch|coffee|invite)\b/i.test(lower)) {
    category = 'SOCIAL';
  } else if (/\b(?:update|updates|notice|announcement)\b/i.test(lower)) {
    category = 'UPDATES';
  }

  // 5. Keyword extraction
  const stopWords = new Set([
    'email', 'emails', 'mail', 'mails', 'message', 'messages', 'about', 'from', 'where',
    'someone', 'asked', 'me', 'to', 'for', 'a', 'an', 'the', 'in', 'on', 'with', 'containing',
    'related', 'regarding', 'show', 'find', 'search', 'get', 'last', 'month', 'week', 'year',
    'past', 'this', 'of', 'and', 'or', 'is', 'are', 'was', 'were', 'unread', 'by'
  ]);

  const cleanTokens = lower
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !stopWords.has(token));

  const keywords = [...new Set(cleanTokens)];
  cleanTokens.forEach(token => {
    if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) {
      keywords.push(token.slice(0, -1));
    }
  });

  if (category === 'CAREER' && !keywords.includes('interview') && !keywords.includes('recruiter')) {
    keywords.push('interview');
  }
  if (category === 'MEETING' && !keywords.includes('meeting')) {
    keywords.push('meeting');
  }
  if (category === 'ACTION_REQUIRED' && !keywords.includes('document')) {
    keywords.push('document');
  }

  const subject = keywords.length > 0 ? keywords[0] : null;

  return {
    sender,
    keywords,
    dateRange: { from: dateFrom, to: dateTo, label: dateRangeLabel },
    dateFrom,
    dateTo,
    dateRangeLabel,
    unread: unreadOnly,
    unreadOnly,
    subject,
    category,
    intent,
    originalQuery: query
  };
};

const extractSemanticCriteria = async (query = '') => {
  const systemPrompt = `You are a semantic email search assistant.
Convert the user's natural language email search request into strict structured criteria JSON.
Output MUST be a JSON object with:
{
  "sender": string or null,
  "keywords": array of string keywords,
  "dateDays": number or null,
  "dateRange": "last_month" | "last_week" | "today" | "yesterday" | null,
  "unreadOnly": boolean,
  "subject": string or null,
  "category": "WORK" | "FINANCE" | "CAREER" | "MEETING" | "SECURITY" | "SOCIAL" | "UPDATES" | "ACTION_REQUIRED" | null,
  "intent": string or null
}
Return JSON only without backticks or markdown.`;

  if (process.env.GEMINI_API_KEY) {
    try {
      const geminiRes = await callGemini(systemPrompt, query);
      if (geminiRes && (geminiRes.keywords || geminiRes.sender || geminiRes.category)) {
        let dateFrom = null;
        if (geminiRes.dateDays) {
          dateFrom = new Date(Date.now() - geminiRes.dateDays * 24 * 60 * 60 * 1000);
        }
        return {
          sender: geminiRes.sender || null,
          keywords: Array.isArray(geminiRes.keywords) ? geminiRes.keywords : [],
          dateRange: {
            from: dateFrom,
            to: null,
            label: geminiRes.dateRange || (geminiRes.dateDays ? `Last ${geminiRes.dateDays} days` : null)
          },
          dateFrom,
          dateTo: null,
          dateRangeLabel: geminiRes.dateRange || (geminiRes.dateDays ? `Last ${geminiRes.dateDays} days` : null),
          unread: Boolean(geminiRes.unreadOnly),
          unreadOnly: Boolean(geminiRes.unreadOnly),
          subject: geminiRes.subject || null,
          category: geminiRes.category || null,
          intent: geminiRes.intent || null,
          originalQuery: query
        };
      }
    } catch (e) {}
  }

  return extractSemanticCriteriaRuleBased(query);
};

module.exports = {
  parseCommand,
  generateReply,
  parseCommandRuleBased,
  extractSemanticCriteria,
  extractSemanticCriteriaRuleBased
};