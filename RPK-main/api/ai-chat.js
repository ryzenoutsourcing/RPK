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

    const {
      message,
      conversationHistory = []
    } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const messages = [

      {
        role: "system",

        content: `
You are an AI booking assistant for a taxi company.

Your job is to help customers book rides
and answer transport-related questions.

You must:

- extract booking information
- detect missing fields
- ask conversational follow-up questions
- support all languages
- answer operational questions
like:
  - where is my driver
  - ETA
  - booking status
  - driver details

Required booking fields:

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

FORMAT:

{
  "intent": "booking",

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

  "follow_up_question": "",

  "reply": ""
}

RULES:

- If user asks normal support questions,
set intent accordingly.

Possible intents:
- booking
- booking_status
- support
- cancellation
- modification

- If fields are missing:
  - add them to missing_fields
  - generate ONE conversational follow_up_question

- If enough information exists:
  - follow_up_question should be empty

- reply should contain a natural conversational response
`
      },

      ...conversationHistory,

      {
        role: "user",
        content: message
      }
    ];

    const completion =
      await client.chat.completions.create({

        model: "gpt-4.1-mini",

        messages
      });

    const raw =
      completion.choices[0]
      .message.content;

    let parsed;

    try {

      parsed = JSON.parse(raw);

    } catch (parseError) {

      console.error(
        "JSON PARSE ERROR:",
        raw
      );

      return res.status(500).json({
        error:
          "Invalid AI JSON response",
        raw
      });
    }

    if (
      parsed.intent === "booking" &&
      parsed.missing_fields &&
      parsed.missing_fields.length === 0
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

              name: parsed.name,

              email: parsed.email,

              phone: parsed.phone,

              pickup: parsed.pickup,

              destination:
                parsed.destination,

              flight_number:
                parsed.flight_number,

              vehicle:
                parsed.vehicle,

              extras:
                parsed.extras,

              payment: "pending",

              status: "pending",

              customer_id:
                "AI-" + parsed.phone,

              form_data: {
                source: "ai-chat",
                ai_generated: true
              }
            }
          ]);

      if (error) {

        console.error(
          "SUPABASE INSERT ERROR:",
          error
        );

      } else {

        console.log(
          "BOOKING CREATED:",
          data
        );

        parsed.booking_created = true;

        parsed.booking_id =
          bookingId;
      }
    }

    return res
      .status(200)
      .json(parsed);

  } catch (error) {

    console.error(
      "AI ERROR:",
      error
    );

    return res.status(500).json({
      error: error.message
    });
  }
};
