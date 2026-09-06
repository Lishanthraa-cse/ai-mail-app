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

  // 2. Try Groq or OpenAI
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
      console.warn('⚠️ AI API call error, falling back to intelligent rule parser:', error.message);
    }
  }

  // 3. Robust rule-based parser (always works offline with 0 credits)
  return parseCommandRuleBased(command, context);
};

const generateReply = async (email, userMessage) => {
  const openai = getOpenAiClient();
  if (!openai) {
    return `Thank you for your email regarding "${email.subject}". ${userMessage ? `\n\n${userMessage}` : '\n\nI will review and follow up shortly.'}\n\nBest regards`;
  }

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
    console.error('❌ Error generating reply:', error);
    return `Thank you for your email. I will follow up shortly.`;
  }
};

const parseCommandRuleBased = (command, context = {}) => {
  if (!command || typeof command !== 'string') {
    return {
      action: 'SEARCH',
      message: 'No command provided',
      data: { search: '' }
    };
  }

  const lower = command.toLowerCase().trim();

  // 1. FORWARD ACTION
  if (lower.startsWith('forward') || lower.includes('forward this') || lower.includes('forward email')) {
    const toMatch = command.match(/(?:to|recipient)\s+([^\s,]+@[^\s,]+)/i);
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
    const toMatch = command.match(/(?:to|recipient)\s+([^\s,]+@[^\s,]+)/i);
    const subjMatch = command.match(/subject\s+['"]?([^'"]+?)['"]?(?:\s+(?:body|and|with)|$)/i);
    const bodyMatch = command.match(/body\s+['"]?([^'"]+?)['"]?$/i);
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
  if (lower.startsWith('reply') || lower.includes('reply to this') || lower.includes('reply saying') || lower.includes('reply that')) {
    const msgMatch = command.match(/reply\s+(?:saying|that|with)?\s*['"]?([^'"]+?)['"]?$/i);
    return {
      action: 'REPLY',
      message: 'Drafting contextual reply',
      data: {
        emailId: context.currentEmailId || null,
        message: msgMatch ? msgMatch[1].trim() : 'Thank you for your email. I will follow up shortly.'
      }
    };
  }

  // 4. FILTER ACTION
  if (lower.startsWith('filter') || lower.includes('show unread') || lower.includes('unread emails') || lower.includes('from last week') || lower.includes('last 7 days')) {
    const isLastWeek = lower.includes('last 7 days') || lower.includes('last week') || lower.includes('this week');
    const senderMatch = command.match(/from\s+([^\s]+)/i);
    return {
      action: 'FILTER',
      message: 'Applying inbox filters',
      data: {
        unread: lower.includes('unread'),
        sender: senderMatch ? senderMatch[1] : undefined,
        dateRange: isLastWeek ? 'last7days' : undefined
      }
    };
  }

  // 5. OPEN ACTION
  if (lower.startsWith('open') || lower.startsWith('read') || lower.startsWith('view') || lower.includes('show email')) {
    const fromMatch = command.match(/(?:from|by)\s+([^\s]+)/i);
    const subjMatch = command.match(/(?:about|subject|titled)\s+['"]?([^'"]+?)['"]?$/i);
    return {
      action: 'OPEN',
      message: 'Opening requested email',
      data: {
        sender: fromMatch ? fromMatch[1] : undefined,
        subject: subjMatch ? subjMatch[1] : undefined
      }
    };
  }

  // 6. DEFAULT: SEARCH ACTION
  const cleanQuery = command.replace(/^(?:search|find|show|look for)\s+(?:emails?\s+)?(?:for\s+|about\s+)?/i, '').trim();
  return {
    action: 'SEARCH',
    message: `Searching for "${cleanQuery || command}"`,
    data: {
      search: cleanQuery || command
    }
  };
};

module.exports = {
  parseCommand,
  generateReply,
  parseCommandRuleBased
};