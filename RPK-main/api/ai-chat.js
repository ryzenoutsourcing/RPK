const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async function handler(req, res) {

  try {

    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed"
      });
    }

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const completion =
      await client.chat.completions.create({

      model: "gpt-4.1-mini",

      messages: [
        {
          role: "system",
          content: `
You are an AI booking assistant for a transport company.

You support all languages.

You help users book rides naturally.
`
        },

        {
          role: "user",
          content: message
        }
      ]
    });

    return res.status(200).json({
      reply:
        completion.choices[0].message.content
    });

  } catch (error) {

    console.error("AI ERROR:", error);

    return res.status(500).json({
      error: error.message
    });
  }
};
