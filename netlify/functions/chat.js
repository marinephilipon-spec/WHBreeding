exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { mode = 'ask', input, question, context, horses = [] } = JSON.parse(event.body);

    if (!input && !question) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Input or question is required' }),
      };
    }

    // Mode 1: ASK QUESTIONS (existing behavior - kept for backward compatibility)
    if (mode === 'ask' || !mode) {
      return handleAskMode(question, context);
    }

    // Mode 2: LOG ACTIONS (new - parse breeding events with AI)
    if (mode === 'log') {
      return handleLogMode(input, horses);
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid mode. Use "ask" or "log".' }),
    };
  } catch (error) {
    console.error('Error in chat function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};

// ============================================
// MODE 1: ASK QUESTIONS
// ============================================

async function handleAskMode(question, context) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `You are a helpful breeding operation assistant. Answer this question about the user's horse breeding operation based on the provided data.

User's Data:
${JSON.stringify(context, null, 2)}

User's Question: ${question}

Provide a concise, helpful answer based on the data. Use the horse nicknames/names when referring to specific horses.`,
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.content && data.content[0] && data.content[0].text) {
      let text = data.content[0].text;
      // Clean up any formatting artifacts
      text = text.replace(/^\{\{/, '').replace(/\}\}$/, '').trim();
      return {
        statusCode: 200,
        body: JSON.stringify({ text }),
      };
    } else if (data.error) {
      return {
        statusCode: 200,
        body: JSON.stringify({ error: data.error.message || 'Failed to get response from Claude' }),
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({ text: "I couldn't process that question. Please try asking about your mares, actions, or schedule." }),
      };
    }
  } catch (error) {
    console.error('Error in ask mode:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
}

// ============================================
// MODE 2: LOG ACTIONS (Parse Breeding Events)
// ============================================

async function handleLogMode(userInput, horses) {
  try {
    // Build mare name list for Claude
    const mareNames = horses
      .map(h => `${h.barnName}${h.nickname ? ` (${h.nickname})` : ''}`)
      .join(', ');

    const systemPrompt = `You are an expert breeding assistant for sport horse AI breeding operations.

Your job: Parse natural language breeding updates and extract structured data.

MARE NAMES IN THIS OPERATION:
${mareNames || 'No mares found - respond with clarification'}

BREEDING PROTOCOL YOU UNDERSTAND:
The breeder tracks ultrasound checks, inseminations, ovulation confirmation, 12/6-hour intensive checks, Lutalyse (Lute) doses, uterine issues, and pregnancy monitoring.

EVENT TYPES YOU SHOULD DETECT:
1. ultrasound_check - Follicle monitoring
2. insemination - Breeding (fresh/frozen)
3. ovulation_confirmed - Follicle ruptured
4. ovulation_check_no_result - Didn't ovulate yet
5. intensive_check_12h - 12-hour monitoring
6. intensive_check_6h - 6-hour monitoring
7. lutalyse_given - Lute dose for shortcycling
8. double_ovulation - Double ovulation detected
9. uterine_issue - Dirty uterus or fluid
10. pregnancy_check_14d - 14-day ultrasound
11. pregnancy_check_28d - 28-day heartbeat check
12. pregnancy_failed - Loss or no embryo

RESPOND WITH VALID JSON ONLY (no other text):

{
  "eventType": "insemination|ultrasound_check|ovulation_confirmed|etc",
  "mareName": "exact mare name from list or null if unclear",
  "eventDate": "YYYY-MM-DD or null if today",
  "eventTime": "HH:MM or null if not mentioned",
  "eventDetails": {
    "semenType": "fresh|frozen|null",
    "stallionName": "name or null",
    "follicleRight": "mm or null",
    "follicleLeft": "mm or null",
    "edema": "yes|no|null",
    "dose": "0.5|1.0|null (for Lute)",
    "checkFrequency": "12_hours|6_hours|null",
    "result": "positive|negative|null (for checks)"
  },
  "autoActionsToCreate": [
    {
      "actionType": "ovulation_check_24h|pregnancy_check_14d|etc",
      "title": "Human readable title",
      "dueDate": "YYYY-MM-DD",
      "dueTime": "HH:MM or null",
      "priority": "critical|high|medium",
      "note": "Optional note"
    }
  ],
  "confidence": 0.95,
  "clarifications": []
}

RULES:
1. Always try to identify event type from context
2. Extract ALL available data points
3. For inseminations, ALWAYS create 2 actions: 24h ovulation check + 14d pregnancy check
4. For ovulation, return action to REPLACE 14d with 7d check
5. Keep times exact (HH:MM)
6. Return confidence 0.95 if very sure, 0.70 if somewhat sure, 0.50 if unsure
7. Use "clarifications" array to explain any uncertainties
8. If mare name is unclear, ask in clarifications and set mareName to null
9. If event type is unclear, set eventType to null and ask in clarifications

EXAMPLES:

User: "Inseminate Roma fresh 11am"
Response:
{
  "eventType": "insemination",
  "mareName": "Roma",
  "eventDate": "2026-06-01",
  "eventTime": "11:00",
  "eventDetails": {
    "semenType": "fresh",
    "stallionName": null
  },
  "autoActionsToCreate": [
    {
      "actionType": "ovulation_check_24h",
      "title": "24-hour Ovulation Check - Roma",
      "dueDate": "2026-06-02",
      "dueTime": "11:00",
      "priority": "high",
      "note": "Check if follicle ruptured"
    },
    {
      "actionType": "pregnancy_check_14d",
      "title": "14-day Pregnancy Check - Roma",
      "dueDate": "2026-06-15",
      "dueTime": null,
      "priority": "medium",
      "note": "Look for embryo (8-10mm)"
    }
  ],
  "confidence": 0.95,
  "clarifications": []
}

User: "Spirit 36 right 36 left ready!"
Response:
{
  "eventType": "ultrasound_check",
  "mareName": "Spirit",
  "eventDate": "2026-06-02",
  "eventTime": null,
  "eventDetails": {
    "follicleRight": 36,
    "follicleLeft": 36,
    "edema": true
  },
  "autoActionsToCreate": [],
  "confidence": 0.95,
  "clarifications": []
}

User: "Q 12 hour checks, 40 right 40 left"
Response:
{
  "eventType": "intensive_check_12h",
  "mareName": "Q",
  "eventDate": "2026-06-02",
  "eventTime": "14:30",
  "eventDetails": {
    "checkFrequency": "12_hours",
    "follicleRight": 40,
    "follicleLeft": 40
  },
  "autoActionsToCreate": [
    {
      "actionType": "intensive_check_12h",
      "title": "12-hour Check - Q",
      "dueDate": "2026-06-03",
      "dueTime": "02:30",
      "priority": "critical",
      "note": "Continue until ovulation confirmed"
    }
  ],
  "confidence": 0.90,
  "clarifications": []
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `${systemPrompt}\n\nUser input: "${userInput}"`,
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.content && data.content[0] && data.content[0].text) {
      let responseText = data.content[0].text;
      
      // Extract JSON from response (in case Claude adds extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            statusCode: 200,
            body: JSON.stringify({
              mode: 'log',
              ...parsed,
            }),
          };
        } catch (parseError) {
          return {
            statusCode: 200,
            body: JSON.stringify({
              error: 'Failed to parse event data. Please try again with more specific information.',
              rawResponse: responseText,
            }),
          };
        }
      } else {
        return {
          statusCode: 200,
          body: JSON.stringify({
            error: 'Could not extract event data from response. Please try again.',
            rawResponse: responseText,
          }),
        };
      }
    } else if (data.error) {
      return {
        statusCode: 200,
        body: JSON.stringify({ error: data.error.message || 'Failed to parse event' }),
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({ error: 'Unexpected response from Claude. Please try again.' }),
      };
    }
  } catch (error) {
    console.error('Error in log mode:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
}
