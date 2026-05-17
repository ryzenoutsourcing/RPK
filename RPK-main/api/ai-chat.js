const OpenAI = require("openai").default;
const { createClient } = require("@supabase/supabase-js");
const BookingLogic = require("../booking-logic");

const supabase = createClient(
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
      conversationHistory = [],
      userId = null
    } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message required"
      });
    }

    // Get current time in Europe/Brussels for the prompt
    const now = new Date();
    const brusselsTimeStr = now.toLocaleString("en-GB", { timeZone: "Europe/Brussels" });

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
  "language": "en|nl|fr",
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

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages
    });

    let raw = completion.choices[0].message.content;
    raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(raw);
    const lang = parsed.language || "en";

    // Use Shared Logic for Validation
    const validation = BookingLogic.validateBooking(parsed);

    // Custom check for past dates using Brussels context
    if (parsed.date && parsed.time) {
      const bDate = BookingLogic.parseDate(parsed.date, parsed.time);
      if (bDate < now) {
         const pastDateMsg = {
           en: "That departure time appears to be in the past. Could you provide a valid future time?",
           nl: "Die vertrektijd lijkt in het verleden te liggen. Kunt u een geldige tijd in de toekomst opgeven?",
           fr: "Cette heure de départ semble être passée. Pourriez-vous indiquer une heure future valide ?"
         };
         return res.status(200).json({
           ...parsed,
           missing_fields: ["date", "time"],
           reply: pastDateMsg[lang] || pastDateMsg.en
         });
      }
    }

    if (parsed.intent === "booking" && validation.isValid) {

      const bookingId = BookingLogic.generateBookingId();

      // Check for Duplicates - Improved logic to avoid false positives
      const existingBooking = await supabase
        .from("bookings")
        .select("id, form_data")
        .eq("email", parsed.email)
        .eq("datetime", parsed.date)
        .eq("time", parsed.time)
        .maybeSingle();

      if (existingBooking.data) {
        // If we already talked about THIS specific booking in this session, don't block it
        const alreadyConfirmedInSession = conversationHistory.some(m =>
          m.role === "assistant" && m.content.includes(existingBooking.data.id)
        );

        if (!alreadyConfirmedInSession) {
          const duplicateMsg = {
            en: "An identical booking already exists in our system for this time.",
            nl: "Er bestaat al een identieke boeking in ons systeem voor dit tijdstip.",
            fr: "Une réservation identique existe alreadey in ons systeem voor dit tijdstip."
          };
          return res.status(200).json({
            ...parsed,
            reply: duplicateMsg[lang] || duplicateMsg.en
          });
        }
      }

      const insertPayload = {
        id: bookingId,
        datetime: parsed.date,
        time: parsed.time,
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        pickup: parsed.pickup,
        destination: parsed.destination,
        flight_number: parsed.flight_number || "",
        vehicle: parsed.vehicle || "Business Class",
        extras: parsed.extras || "",
        amount: 0,

        payment: parsed.payment_method || "pending",

        status: "pending",

        user_id: userId,
        customer_id: userId ? null : "CUST-" + parsed.email.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(),

        form_data: {
          source: "ai-chat",
          ai: true,
          payment_method: parsed.payment_method,
          passengers: parsed.passengers || 1,
          luggage: parsed.luggage || 0,
          language: lang
        },
        partner_id: BookingLogic.CONFIG.PARTNER_ID
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
        console.error("SUPABASE INSERT ERROR:", error);
        return res.status(500).json({ error: error.message });
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
    console.error("SERVER ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};
