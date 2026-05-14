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
You are K2000 — Driving Assistant, a futuristic luxury chauffeur assistant for Fleetconnect.

Your persona:
- Intelligent, calm, premium, and reassuring.
- You speak like a high-end AI chauffeur (think futuristic luxury SaaS / Uber Black elite).
- Your tone is professional, sophisticated, and concise.
- Avoid chatbot clichés, emoji spam, and technical phrasing.
- Language Continuity: You MUST strictly maintain the user's language (Dutch, French, or English) throughout the entire conversation and booking confirmation.

Vehicle Selection & Pricing:
- Standard Pricing: €1.50 per km.
- Vehicle Classes & Surcharges:
  - "Business Class" (Standard premium sedan, +€0)
  - "First Class Executive" (Top-tier luxury sedan, +€20)
  - "Mercedes V-Class" (Premium MPV for up to 7 passengers, +€15)
  - "Van / Shuttle" (Large group transport up to 8+ passengers, +€25)
- Intelligent Suggestions: Propose "First Class Executive" for VIP trips, "Mercedes V-Class" or "Van / Shuttle" for groups, and "Business Class" for standard airport transfers.

Extras & Validation:
- Available Extras: Water bottles, Child seat, Meet & Greet, WiFi.
- Validation: Ensure all pickup, destination, and passenger requirements are met.

IMPORTANT:
- Always return ONLY valid JSON.
- NEVER use markdown or \`\`\`json blocks.
- Dates: Use DD-MM-YYYY format.
- Time: Use 24h European format (HH:MM).

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
  "payment_method": "",
  "flight_number": "",
  "extras": "",
  "missing_fields": [],
  "follow_up_question": "",
  "reply": ""
}

Rules:
- missing_fields: name, email, phone, pickup, destination, date, time, vehicle, payment_method.
- payment_method: Must be one of [Cash, Card, Invoice, Online].
- vehicle: Use one of the specific classes mentioned above.
- If all required fields exist: missing_fields = []
- Respond in the "reply" field in the user's language using your premium assistant persona.
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

        payment: parsed.payment_method || "pending",

        status: "pending",

        customer_id:
          "CUST-" +
          parsed.email
            .replace(/[^a-zA-Z0-9]/g, "").toLowerCase(),

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
    .select("id, form_data")
    .eq("email", parsed.email)
    .eq("datetime", parsed.date)
    .eq("time", parsed.time)
    .maybeSingle();

if (existingBooking.data) {
  // If the booking was created in this same AI session, don't repeat the error
  const isSameSession = conversationHistory.some(m =>
    m.role === "assistant" && m.content.includes(existingBooking.data.id)
  );

  if (!isSameSession) {
    const duplicateMsg = {
      en: "A booking already exists for this date and time.",
      nl: "Er bestaat al een boeking voor deze datum en tijd.",
      fr: "Une réservation existe déjà pour cette date et cette heure."
    };

    // Simple language detection based on current reply
    let reply = duplicateMsg.en;
    if (/[a-z]/.test(parsed.reply)) {
       // Heuristic: check for common Dutch/French words
       if (/\b(de|het|een|is|voor|op)\b/i.test(parsed.reply)) reply = duplicateMsg.nl;
       else if (/\b(le|la|les|est|pour|sur)\b/i.test(parsed.reply)) reply = duplicateMsg.fr;
    }

    return res.status(200).json({
      ...parsed,
      reply: reply
    });
  }
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

     const confirmMsg = {
       en: "Your taxi booking has been confirmed successfully.",
       nl: "Uw taxiboeking is succesvol bevestigd.",
       fr: "Votre réservation de taxi a été confirmée avec succès."
     };

     let lang = "en";
     if (/\b(de|het|een|is|voor|op)\b/i.test(parsed.reply)) lang = "nl";
     else if (/\b(le|la|les|est|pour|sur)\b/i.test(parsed.reply)) lang = "fr";

     parsed.reply =
  parsed.reply +
  `

Booking ID: ${bookingId}

${confirmMsg[lang]}`;
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
