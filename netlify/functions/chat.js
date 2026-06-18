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
// Netlify injects the gateway credentials into every server context — so the
// function never holds a real provider key, and billing flows through the Netlify
// account. We use the official Anthropic SDK pointed at the gateway, instead of
// hand-rolling the HTTP call (the previous hardcoded call to api.anthropic.com is
// what originally failed). See getClient() for why the credential and base URL
// must be taken from the SAME source.
//
// NOTE: the AI Gateway variables are only injected once the site has a published
// production deploy with AI features enabled. Until then `getClient()` below
// throws the "AI Gateway is not configured" error that surfaces in the chat.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';

// The event types the breeding log understands — kept in sync with EVENT_TYPES
// in src/App.jsx. The model classifies each note into exactly ONE of these so the
// client can feed the result through the same deriveEvent() pipeline the local
// rule-based parser uses. That shared pipeline — not this function — is what turns
// an event type into the card title, follow-up actions, and breeding-status move,
// so the AI path and the offline fallback produce an identical confirmation card.
const EVENT_TYPES = [
  'insemination',
  'ultrasound',
  'ovulation',
  'pregnancy-check',
  'heartbeat',
  'lutalyse',
  'monitoring',
  'double-ovulation',
  'uterine-issue',
  'pregnancy-loss',
  'foaled',
  'note',
];

const PRIORITIES = ['low', 'medium', 'high', 'critical'];

// Single place that talks to the gateway. Throws on a transport/HTTP error so
// callers can fall back gracefully.
//
// Routing is always through the Netlify AI Gateway and NEVER the public Anthropic
// API. The credential and the base URL must come from the SAME source — they are a
// matched pair, and crossing them makes the gateway reject the request. This is the
// production failure the earlier fixes missed: Netlify injects ANTHROPIC_API_KEY +
// ANTHROPIC_BASE_URL *together*, but the moment a project sets its own
// ANTHROPIC_API_KEY in the Netlify env, Netlify deliberately stops injecting
// ANTHROPIC_BASE_URL. Reading each variable independently (`ANTHROPIC_API_KEY ||
// NETLIFY_AI_GATEWAY_KEY` for the key, `ANTHROPIC_BASE_URL || NETLIFY_AI_GATEWAY_BASE_URL`
// for the URL) then pairs that custom key with the gateway base URL — a mismatch the
// gateway answers with an auth error that only shows up in production.
//
// So we pick ONE consistent pair. The NETLIFY_AI_GATEWAY_* pair is always injected,
// always belongs together, and is never affected by project-set provider keys, so we
// prefer it; we only fall back to the Anthropic-specific pair when BOTH halves of it
// are present. If no complete pair is available (e.g. a deploy whose runtime predates
// AI features being enabled), we raise a clear, catchable error instead of letting the
// SDK throw a cryptic one, so log-mode can fall back to the rule-based parser and
// ask-mode can surface a helpful message.
let client;
const getClient = () => {
  if (client) return client;
  // Prefer the always-present, internally-consistent gateway pair; only use the
  // Anthropic-specific pair when both of its halves are injected together.
  let apiKey = process.env.NETLIFY_AI_GATEWAY_KEY;
  let baseURL = process.env.NETLIFY_AI_GATEWAY_BASE_URL;
  if ((!apiKey || !baseURL) && process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_BASE_URL) {
    apiKey = process.env.ANTHROPIC_API_KEY;
    baseURL = process.env.ANTHROPIC_BASE_URL;
  }
  baseURL = baseURL?.replace(/\/+$/, '');
  if (!apiKey || !baseURL) {
    // None of the gateway variables made it into this runtime. That happens on a
    // deploy whose function runtime predates AI features being enabled — the fix
    // is a fresh production deploy with AI features on, not a code change. Raise a
    // clear, catchable error so log-mode falls back to the offline parser and
    // ask-mode shows a helpful message.
    const err = new Error(
      'AI Gateway is not configured. Ensure the site has a production deploy with AI features enabled.',
    );
    err.code = 'GATEWAY_NOT_CONFIGURED';
    throw err;
  }
  client = new Anthropic({ apiKey, baseURL });
  return client;
};

// One transport-level retry smooths over the gateway's occasional cold-start 5xx
// and per-minute 429s, which would otherwise surface to the user as a hard error.
const isTransient = (error) => error?.status === 429 || (error?.status >= 500 && error?.status < 600);

const callClaude = async (payload) => {
  try {
    return await getClient().messages.create({ model: MODEL, ...payload });
  } catch (error) {
    if (!isTransient(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 600));
    return getClient().messages.create({ model: MODEL, ...payload });
  }
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
// A tool is used (rather than free-text JSON) so the model is forced to return a
// well-typed object. The fields below mirror the ones the app's own rule-based
// parser extracts; the client (normalizeParsed) maps them straight into the
// shared deriveEvent() factory, so a note parsed by the AI yields exactly the
// same confirmation card, save payload, and editable form as one parsed offline.
const LOG_TOOL = {
  name: 'record_breeding_entry',
  description:
    "Record the structured breeding-log entry parsed from the keeper's free-form note. " +
    'Classify what happened into a single eventType and extract its details, resolving ' +
    'every relative date to an absolute calendar date.',
  input_schema: {
    type: 'object',
    properties: {
      horseId: {
        type: ['string', 'null'],
        description:
          'The id of the mare this note is about, chosen from the provided list. ' +
          'null if no mare can be identified.',
      },
      eventType: {
        type: 'string',
        enum: EVENT_TYPES,
        description:
          'The single best-matching event type. Use "note" only when nothing more ' +
          'specific fits. Bred/inseminated/covered -> "insemination"; scan/ultrasound -> ' +
          '"ultrasound"; ovulation confirmed -> "ovulation"; 14-day or embryo pregnancy ' +
          'check -> "pregnancy-check"; 28-day heartbeat check -> "heartbeat"; gave ' +
          'lutalyse/lute/prostaglandin -> "lutalyse"; recurring N-hour checks -> ' +
          '"monitoring"; double ovulation -> "double-ovulation"; uterine infection/fluid/' +
          'flush -> "uterine-issue"; reabsorbed/slipped/lost the foal -> "pregnancy-loss"; ' +
          'foaled/gave birth -> "foaled".',
      },
      date: {
        type: 'string',
        description:
          'ISO date (YYYY-MM-DD) the event happened, resolving relative terms like ' +
          '"yesterday" / "this morning" against today\'s date. Empty string -> today.',
      },
      time: {
        type: 'string',
        description: '24-hour time (HH:MM) if the note states one, else empty string.',
      },
      semenType: {
        type: 'string',
        enum: ['fresh', 'chilled', 'frozen', 'natural', ''],
        description: 'For an insemination, the semen type mentioned, else empty string.',
      },
      stallion: {
        type: 'string',
        description: 'For an insemination, the stallion / sire named, else empty string.',
      },
      follicleRight: {
        type: 'string',
        description:
          'Right-ovary follicle size in mm (digits only) for an ultrasound / monitoring ' +
          'note, else empty string.',
      },
      follicleLeft: {
        type: 'string',
        description:
          'Left-ovary follicle size in mm (digits only) for an ultrasound / monitoring ' +
          'note, else empty string.',
      },
      dose: {
        type: 'string',
        description: 'Drug dose for a lutalyse note (e.g. "0.5"), else empty string.',
      },
      result: {
        type: 'string',
        enum: ['positive', 'negative', ''],
        description:
          'For a pregnancy check: "positive" if an embryo / pregnancy was found, ' +
          '"negative" if open / empty / not in foal, else empty string.',
      },
      series: {
        type: ['object', 'null'],
        description:
          'Only for recurring checks like "12 hour checks for 3 days". null otherwise.',
        properties: {
          intervalHours: { type: 'number' },
          days: { type: 'number' },
        },
      },
      extraActions: {
        type: 'array',
        description:
          'Follow-up reminders the keeper explicitly asks to schedule, on top of whatever ' +
          'the event type already implies (e.g. "remind me in 3 days to call the vet", ' +
          '"recheck her on day 28"). Empty array if none. Do NOT include the routine ' +
          'follow-ups an event type already creates on its own.',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Short label, e.g. "Call the vet".' },
            dueDate: {
              type: 'string',
              description:
                'ISO date (YYYY-MM-DD) the reminder is due, resolved absolutely. "day N" ' +
                'counts N days from the mare\'s most recent breeding date.',
            },
            priority: { type: 'string', enum: PRIORITIES },
          },
          required: ['title', 'dueDate', 'priority'],
        },
      },
      note: { type: 'string', description: 'The original note text, verbatim.' },
    },
    required: [
      'horseId',
      'eventType',
      'date',
      'time',
      'semenType',
      'stallion',
      'follicleRight',
      'follicleLeft',
      'dose',
      'result',
      'series',
      'extraActions',
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
      'Mares (use these ids exactly):\n' +
      JSON.stringify(horses, null, 2) +
      '\n\nMost recent breeding date per mare id (for resolving "day N" reminders, ' +
      'which count N days from the breeding date):\n' +
      JSON.stringify(breedingDates, null, 2) +
      (fallbackHorseId
        ? `\n\nIf the note names no mare, assume it is about mare id "${fallbackHorseId}" ` +
          '(the one the conversation was already about).'
        : '') +
      '\n\nGuidance:\n' +
      '- Pick the single eventType that best matches; use "note" only as a last resort.\n' +
      '- Resolve EVERY date to an absolute YYYY-MM-DD value: "yesterday" is relative to ' +
      'today, "day 28" means 28 days after the mare\'s most recent breeding date, and ' +
      '"in 2 weeks" / "in 10 days" are offsets from today.\n' +
      '- The routine follow-ups for an event (e.g. the 14-day pregnancy check after an ' +
      'insemination) are added automatically downstream — only put genuinely extra, ' +
      'explicitly-requested reminders in extraActions.\n' +
      '- Leave any field that does not apply to the chosen eventType as an empty string, ' +
      'empty array, or null.',
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
    // Log the real cause (status + message) so production failures are diagnosable.
    console.error('Error in chat function:', error?.status, error?.message);
    const message =
      error?.code === 'GATEWAY_NOT_CONFIGURED'
        ? error.message
        : error?.status
          ? `The AI service returned an error (${error.status}). Please try again in a moment.`
          : error?.message || 'Failed to reach the AI gateway';
    return {
      statusCode: 200,
      body: JSON.stringify({ error: message }),
    };
  }
};
