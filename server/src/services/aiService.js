const OpenAI = require('openai');

const getOpenAiClient = () => {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } catch (e) {
    return null;
  }
};

const parseCommand = async (command, context = {}) => {
  const openai = getOpenAiClient();
  if (!openai) {
    return parseCommandRuleBased(command, context);
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that controls a mail application. 
          Parse the user's natural language command and return a structured action.
          
          Available actions:
          1. COMPOSE - Send an email
          2. SEARCH - Search/filter emails
          3. OPEN - Open a specific email
          4. REPLY - Reply to current email
          5. FILTER - Apply filters to inbox
          6. FORWARD - Forward an email
          
          Return JSON with action, parameters, and any relevant data.
          
          Current context: ${JSON.stringify(context)}`
        },
        {
          role: 'user',
          content: command
        }
      ],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.warn('⚠️ OpenAI API call error, falling back to rule parser:', error.message);
    return parseCommandRuleBased(command, context);
  }
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