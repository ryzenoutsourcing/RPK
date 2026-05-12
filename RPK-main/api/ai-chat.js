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
You are an AI booking assistant for a taxi company.

Your job is to extract booking information.

Required fields:

- name
- email
- phone
- pickup
- destination
- date
- time
- vehicle

Optional:
- flight_number
- extras

Always return ONLY valid JSON.

Format:

{
  "name": "",
  "email": "",
  "phone": "",
  "pickup": "",
  "destination": "",
  "date": "",
  "time": "",
  "vehicle": "",
  "flight_number": "",
  "extras": "",
  "missing_fields": [],
  "follow_up_question": ""
}

If fields are missing:
- add them inside missing_fields
- generate ONE conversational follow_up_question

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
   if (
  parsed.pickup &&
  parsed.destination &&
  parsed.date &&
  parsed.time
) {

  const bookingId =
    "AI-" + Date.now();

  const { data, error } =
    await supabase
      .from("bookings")
      .insert([
        {
          id: bookingId,

          datetime: parsed.date,
          time: parsed.time,

          pickup: parsed.pickup,
          destination: parsed.destination,

          status: "pending",

          name: "AI Customer",

          payment: "pending",

          vehicle: "Standard",

          extras: "None",

          form_data: {
            source: "ai-chat"
          }
        }
      ]);

  if (error) {
    console.error("SUPABASE INSERT ERROR:", error);
  } else {
    console.log("BOOKING CREATED:", data);
  }
}
return res.status(200).json(parsed);

  } catch (error) {

    console.error("AI ERROR:", error);

    return res.status(500).json({
      error: error.message
    });
  }
};
