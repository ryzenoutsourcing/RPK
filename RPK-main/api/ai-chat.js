const OpenAI = require("openai").default;
const { createClient } =
  require("@supabase/supabase-js");

const supabase =
  createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
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

Extract booking information into structured JSON.

Always return ONLY valid JSON.

Format:

{
  "pickup": "",
  "destination": "",
  "date": "",
  "time": "",
  "missing_fields": []
}

If information is missing,
add field names inside "missing_fields".

Support all languages.
`
        },

        {
          role: "user",
          content: message
        }
      ]
    });

  const raw =
  completion.choices[0].message.content;

const parsed =
  JSON.parse(raw);

return res.status(200).json(parsed);

  } catch (error) {

    console.error("AI ERROR:", error);

    return res.status(500).json({
      error: error.message
    });
  }
};
