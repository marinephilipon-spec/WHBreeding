// The AI brain behind the Breeding Log Chat. Both chat modes are powered by
// Claude, reached through the Netlify AI Gateway:
//
//   mode: 'ask' -> answer a free-form question about the user's operation using
//                  the data the client sends as context. Returns { text }.
//   mode: 'log' -> turn a free-form "what happened / what to schedule" message
//                  into the structured confirmation card the client renders.
//                  Returns { parsed: {...} }.
//
// Connection: requests go to the Netlify AI Gateway, NOT directly to Anthropic.
// Netlify injects ANTHROPIC_BASE_URL (the gateway endpoint) and ANTHROPIC_API_KEY
// (the gateway credential) into every server context — so the function never
// holds a real provider key, and billing flows through the Netlify account. The
// `anthropic-version` header is required by the Messages API; without it the
// request is rejected, which is why the previous hardcoded call to
// api.anthropic.com failed.
const ANTHROPIC_VERSION = '2023-06-01';
const MODEL = 'claude-sonnet-4-6';

// Kept in sync with BREEDING_STATUSES in src/App.jsx — these are the only
// statuses the mare dropdown understands, so the model must pick from this set.
const BREEDING_STATUSES = [
  'Waiting for cycle',
  'Ready to breed',
  'Inseminated',
  '14-day pregnancy check',
  'Confirmed in foal',
  'Lost - back open',
];

const CATEGORIES = ['check', 'breed', 'drug', 'short-cycle', 'foaled'];

// Single place that talks to the gateway. Throws on a transport/HTTP error so
// callers can fall back gracefully.
//
// Routing is always through the Netlify AI Gateway and NEVER the public Anthropic
// API. Netlify injects ANTHROPIC_BASE_URL / ANTHROPIC_API_KEY in server contexts,
// and NETLIFY_AI_GATEWAY_BASE_URL / NETLIFY_AI_GATEWAY_KEY are always set as a
// backstop. We deliberately do not fall back to api.anthropic.com: the gateway
// credential is not a valid Anthropic key, so sending it there returns
// "invalid x-api-key" — the exact failure this guards against.
const callClaude = async (payload) => {
  const rawBase = process.env.ANTHROPIC_BASE_URL || process.env.NETLIFY_AI_GATEWAY_BASE_URL;
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.NETLIFY_AI_GATEWAY_KEY;
  if (!rawBase || !apiKey) {
    throw new Error(
      'AI Gateway is not configured. Ensure the site has a production deploy with AI features enabled.',
    );
  }
  // The injected base URL ends with a slash (".../.netlify/ai/"); trim it so we
  // don't build a double-slash path.
  const baseUrl = rawBase.replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({ model: MODEL, ...payload }),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || `Gateway returned ${response.status}`;
    throw new Error(message);
  }
  return data;
};

// --- mode: 'ask' -------------------------------------------------------------
const answerQuestion = async ({ question, context }) => {
  const data = await callClaude({
    max_tokens: 600,
    system:
      'You are a helpful assistant for a horse breeding operation. Answer the ' +
      "user's question using only the data provided. Be concise and practical. " +
      'Refer to horses by their name/nickname. If the data does not contain the ' +
      'answer, say so plainly rather than guessing.',
    messages: [
      {
        role: 'user',
        content: `Here is the current data for my breeding operation:\n\n${JSON.stringify(
          context,
          null,
          2,
        )}\n\nQuestion: ${question}`,
      },
    ],
  });

  const text = data?.content?.find((b) => b.type === 'text')?.text?.trim();
  if (!text) {
    return "I couldn't process that question. Please try asking about your mares, actions, or schedule.";
  }
  return text;
};

// --- mode: 'log' -------------------------------------------------------------
// A tool is used (rather than free-text JSON) so the model is forced to return
// an object that matches the confirmation card's shape exactly — no parsing of
// loosely-formatted text, and enums are validated by the schema.
const LOG_TOOL = {
  name: 'record_breeding_entry',
  description:
    'Record the structured breeding-log entry parsed from the keeper\'s message. ' +
    'A message can describe something that already happened (an action taken), ' +
    'something to do later (an action item / reminder), or both.',
  input_schema: {
    type: 'object',
    properties: {
      horseId: {
        type: ['string', 'null'],
        description:
          'The id of the horse this message is about, chosen from the provided list. ' +
          'null if no horse can be identified.',
      },
      horseName: {
        type: 'string',
        description: 'The barn name of the matched horse, or "Unknown".',
      },
      actionTakenCategory: { type: 'string', enum: CATEGORIES },
      actionTaken: {
        type: 'string',
        description:
          'Short label of what already happened (e.g. "Bred", "Administered Regumate", ' +
          '"Ultrasound check", "Foaled out"). Empty string if the message only schedules ' +
          'something for later.',
      },
      actionTakenDate: {
        type: 'string',
        description:
          'ISO date (YYYY-MM-DD) the action was taken, resolving relative terms like ' +
          '"yesterday" against today\'s date. Empty string if no action was taken.',
      },
      actionRequiredCategory: { type: 'string', enum: CATEGORIES },
      actionItem: {
        type: 'string',
        description:
          'Short label of a reminder to schedule (e.g. "Check Bella for pregnancy"). ' +
          'Empty string if nothing is being scheduled.',
      },
      dueDate: {
        type: 'string',
        description:
          'ISO date (YYYY-MM-DD) the reminder is due. Resolve "in 2 weeks", "day 28" ' +
          '(N days after the breeding date), etc. Empty string if no reminder.',
      },
      scheduleSeries: {
        type: ['object', 'null'],
        description:
          'Only for recurring checks like "12 hour checks for 3 days". null otherwise.',
        properties: {
          intervalHours: { type: 'number' },
          days: { type: 'number' },
          label: { type: 'string' },
        },
      },
      breedingStatusUpdate: {
        type: 'string',
        enum: [...BREEDING_STATUSES, ''],
        description:
          'The breeding-cycle status this message implies, or empty string if none. ' +
          'Breeding/insemination -> "Inseminated"; confirmed pregnant/heartbeat -> ' +
          '"Confirmed in foal"; lost/reabsorbed/back open -> "Lost - back open".',
      },
      note: { type: 'string', description: 'The original message text, verbatim.' },
    },
    required: [
      'horseId',
      'horseName',
      'actionTakenCategory',
      'actionTaken',
      'actionTakenDate',
      'actionRequiredCategory',
      'actionItem',
      'dueDate',
      'scheduleSeries',
      'breedingStatusUpdate',
      'note',
    ],
  },
};

const parseLogEntry = async ({ message, horses, breedingDates, today, fallbackHorseId }) => {
  const data = await callClaude({
    max_tokens: 700,
    tools: [LOG_TOOL],
    tool_choice: { type: 'tool', name: LOG_TOOL.name },
    system:
      "You parse a horse breeder's free-form note into a structured log entry by " +
      `calling the ${LOG_TOOL.name} tool. Today's date is ${today}.\n\n` +
      'Horses (use these ids exactly):\n' +
      JSON.stringify(horses, null, 2) +
      '\n\nMost recent breeding date per horse id (for resolving "day N" reminders, ' +
      'which count N days from the breeding date):\n' +
      JSON.stringify(breedingDates, null, 2) +
      (fallbackHorseId
        ? `\n\nIf the message names no horse, assume it is about horse id "${fallbackHorseId}" ` +
          '(the one the conversation was already about).'
        : '') +
      '\n\nGuidance:\n' +
      '- A breeding/insemination ("bred Bella today") should also schedule a 14-day ' +
      'pregnancy check as the action item, due 14 days after the breeding date.\n' +
      '- "day 28" means 28 days after the mare\'s most recent breeding date.\n' +
      '- "in 2 weeks" / "in 10 days" are offsets from today.\n' +
      '- Resolve every date to an absolute YYYY-MM-DD value.\n' +
      '- Leave actionTaken empty for pure scheduling requests, and leave actionItem ' +
      'empty when nothing is scheduled.',
    messages: [{ role: 'user', content: message }],
  });

  const toolUse = data?.content?.find((b) => b.type === 'tool_use' && b.name === LOG_TOOL.name);
  if (!toolUse?.input) {
    throw new Error('Model did not return a structured entry');
  }
  return toolUse.input;
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const mode = body.mode || 'ask';

  try {
    if (mode === 'log') {
      if (!body.message) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Message is required' }) };
      }
      const parsed = await parseLogEntry({
        message: body.message,
        horses: body.horses || [],
        breedingDates: body.breedingDates || {},
        today: body.today,
        fallbackHorseId: body.fallbackHorseId || null,
      });
      return { statusCode: 200, body: JSON.stringify({ parsed }) };
    }

    // Default: ask mode.
    if (!body.question) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Question is required' }) };
    }
    const text = await answerQuestion({ question: body.question, context: body.context });
    return { statusCode: 200, body: JSON.stringify({ text }) };
  } catch (error) {
    console.error('Error in chat function:', error);
    return {
      statusCode: 200,
      body: JSON.stringify({ error: error.message || 'Failed to reach the AI gateway' }),
    };
  }
};
