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
        error: "Message required"
      });
    }

    const messages = [

      {
        role: "system",
        content: `
You are a luxury concierge booking assistant for Fleetconnect Taxi.

Your persona:
- Calm, intelligent, premium, and reassuring.
- You speak like an elite chauffeur service dispatcher (Uber Black / Premium Chauffeur tone).
- Your tone is professional, helpful, and concise.
- Avoid chatbot clichés (e.g., "How can I assist you today?"), emoji spam, and technical phrasing.
- Naturally adapt to the user's language (Dutch, English, French, etc.).

Good examples of your tone:
- "Good afternoon. Where would you like to be picked up?"
- "Certainly. What destination do you need?"
- "I can arrange that for you."
- "One moment while I confirm your route."
- "Your chauffeur has been scheduled."

Your tasks:
- Assist with taxi bookings, answer questions, and provide a seamless luxury experience.
- Gather required information for bookings conversationally.

IMPORTANT:
- Always return ONLY valid JSON.
- NEVER use markdown.
- NEVER use \`\`\`json blocks.

JSON FORMAT:
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

Rules:
- missing_fields must contain all missing required fields.
- Required fields: name, email, phone, pickup, destination, date, time, vehicle.
- if all required fields exist: missing_fields = []
- "tomorrow" means the real next calendar day.
- "today" means the current real date.
- Always use current year.
- Respond in the "reply" field using your premium concierge persona in the user's language.
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

      model: "gpt-4o-mini",

      messages
    });

    let raw =
      completion
        .choices[0]
        .message
        .content;

    console.log("RAW AI:", raw);

    raw = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed =
      JSON.parse(raw);

    console.log("PARSED:", parsed);

    if (
      parsed.intent === "booking" &&
      parsed.missing_fields &&
      parsed.missing_fields.length === 0
    ) {

    const today = new Date();

const year =
  today.getFullYear();

const month =
  String(today.getMonth() + 1)
    .padStart(2, "0");

const day =
  String(today.getDate())
    .padStart(2, "0");

const sequence =
  String(
    Math.floor(Math.random() * 999)
  ).padStart(3, "0");

const bookingId =
  `T-PV-${year}${month}${day}-${sequence}`;

      const insertPayload = {

        id: bookingId,

        datetime: parsed.date,
        time: parsed.time,

        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,

        pickup: parsed.pickup,
        destination: parsed.destination,

        flight_number:
          parsed.flight_number || "",

        vehicle:
          parsed.vehicle || "",

        extras:
          parsed.extras || "",

        amount: 0,

        payment: "pending",

        status: "pending",

        customer_id:
          "CUST-" +
          parsed.email
            .replace(/[^a-zA-Z0-9]/g, ""),

        form_data: {
          source: "ai-chat",
          ai: true
        },

        partner_id: 1
      };

      console.log(
        "INSERT PAYLOAD:",
        insertPayload
      );

      const existingBooking =
  await supabase
    .from("bookings")
    .select("id")
    .eq("email", parsed.email)
    .eq("datetime", parsed.date)
    .eq("time", parsed.time)
    .maybeSingle();

if (existingBooking.data) {

  return res.status(200).json({
    ...parsed,
    reply:
      "A booking already exists for this date and time."
  });
}
     const { data, error } =
  await supabase
    .from("bookings")
    .insert([insertPayload])
    .select();

      if (error) {

        console.error(
          "SUPABASE INSERT ERROR:",
          error
        );

        return res.status(500).json({
          error: error.message,
          details: error
        });
      }

      console.log(
        "BOOKING CREATED:",
        data
      );

     parsed.reply =
  parsed.reply +
  `

Booking ID: ${bookingId}

Your taxi booking has been confirmed successfully.`;
    }

    return res.status(200).json(parsed);

  } catch (error) {

    console.error(
      "SERVER ERROR:",
      error
    );

    return res.status(500).json({
      error: error.message
    });
  }
};
