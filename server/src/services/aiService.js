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
    console.warn(`⚠️ Gemini API call returned: ${err.message}`);
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
          console.warn('⚠️ OpenAI quota exhausted (429). Fast switching to intelligent local NLP rule engine.');
        } else {
          console.warn('⚠️ AI API call error, falling back to intelligent rule parser:', error.message);
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

module.exports = {
  parseCommand,
  generateReply,
  parseCommandRuleBased
};