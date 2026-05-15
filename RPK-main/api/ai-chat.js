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
      conversationHistory = []
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

CURRENT DATE/TIME (Europe/Brussels): ${brusselsTimeStr}

Your persona:
- Intelligent, calm, premium, and reassuring.
- You speak like a high-end AI chauffeur (think futuristic luxury SaaS / Uber Black elite).
- Your tone is professional, sophisticated, and concise.
- Avoid chatbot clichés, emoji spam, and technical phrasing.
- Language Continuity: You MUST detect the user's language (Dutch, French, or English) and maintain it throughout the entire conversation. Return the detected language code in the "language" field.

Vehicle Selection:
- "Business Class" (Standard premium sedan, surcharge: €0)
- "First Class Executive" (Top-tier luxury sedan, surcharge: €20)
- "Mercedes V-Class" (Premium MPV up to 7 pax, surcharge: €15)
- "Van / Shuttle" (Large group transport 8+ pax, surcharge: €25)

Intelligent Suggestions:
- Airport transfer -> Business Class
- VIP/Executive trip -> First Class Executive
- Groups/Families -> Mercedes V-Class or Van / Shuttle

Rules:
- Standard Pricing: €1.50 per km.
- European Format: Use DD-MM-YYYY and 24h (HH:MM) for dates and times.
- Normalization: Normalize "today", "tomorrow" etc. into DD-MM-YYYY using the current date provided above.
- Payment Methods: [Cash, Card, Invoice, Online].
- Return ONLY valid JSON.
- NEVER use markdown or \`\`\`json blocks.

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
  "passengers": 1,
  "luggage": 0,
  "payment_method": "",
  "flight_number": "",
  "extras": "",
  "missing_fields": [],
  "follow_up_question": "",
  "reply": ""
}
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
        customer_id: "CUST-" + parsed.email.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(),
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

      const { data, error } = await supabase
        .from("bookings")
        .insert([insertPayload])
        .select();

      if (error) {
        console.error("SUPABASE INSERT ERROR:", error);
        return res.status(500).json({ error: error.message });
      }

      const confirmMsg = {
        en: "Your taxi booking has been confirmed successfully.",
        nl: "Uw taxiboeking is succesvol bevestigd.",
        fr: "Votre réservation de taxi a été confirmée avec succès."
      };

      parsed.reply = parsed.reply + `\n\nBooking ID: ${bookingId}\n\n${confirmMsg[lang] || confirmMsg.en}`;
    }

    return res.status(200).json(parsed);

  } catch (error) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};
