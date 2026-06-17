exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { question, context } = JSON.parse(event.body);

    if (!question) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Question is required' }),
      };
    }

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
    console.error('Error in chat function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};
