import Anthropic from '@anthropic-ai/sdk';

// Zero-config constructor: Netlify AI Gateway injects the credentials
// (ANTHROPIC_API_KEY / ANTHROPIC_BASE_URL) automatically in production.
const anthropic = new Anthropic();

export default async (req) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { question, context } = await req.json();

    if (!question) {
      return Response.json({ error: 'Question is required' }, { status: 400 });
    }

    const message = await anthropic.messages.create({
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
    });

    const block = message.content?.find((b) => b.type === 'text');
    if (block?.text) {
      // Clean up any formatting artifacts
      const text = block.text.replace(/^\{\{/, '').replace(/\}\}$/, '').trim();
      return Response.json({ text });
    }

    return Response.json({
      text: "I couldn't process that question. Please try asking about your mares, actions, or schedule.",
    });
  } catch (error) {
    console.error('Error in chat function:', error);
    return Response.json(
      { error: error.message || 'Failed to get response from Claude' },
      { status: 200 },
    );
  }
};
