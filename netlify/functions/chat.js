// Netlify Function (ESM): answers questions about the user's breeding data via Claude.
// Reachable at /.netlify/functions/chat
export default async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { question, context } = await req.json();

    if (!question) {
      return Response.json({ error: "Question is required" }, { status: 400 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        messages: [
          {
            role: "user",
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
      text = text.replace(/^\{\{/, "").replace(/\}\}$/, "").trim();
      return Response.json({ text });
    } else if (data.error) {
      return Response.json({
        error: data.error.message || "Failed to get response from Claude",
      });
    } else {
      return Response.json({
        text: "I couldn't process that question. Please try asking about your mares, actions, or schedule.",
      });
    }
  } catch (error) {
    console.error("Error in chat function:", error);
    return Response.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
};
