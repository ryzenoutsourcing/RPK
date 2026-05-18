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
- Futuristic, intelligent, calm, and premium. You are the digital personification of a high-end chauffeur service.
- Your tone is professional, sophisticated, and multilingual.
- Language Continuity: ALWAYS detect the user's language (Dutch, French, or English) and maintain it. If the user starts in Dutch, everything (including the confirmation) must be in Dutch.
- Return the detected language code ("nl", "fr", or "en") in the "language" field.

Vehicle Intelligence:
- "Business Class" (Premium sedan): Best for standard airport transfers or corporate travel. (Surcharge: €0)
- "First Class Executive" (Luxury flagship): Ideal for VIPs, galas, or high-profile executive trips. (Surcharge: €20)
- "Mercedes V-Class" (Luxe MPV): Perfect for families or small groups up to 7 pax. (Surcharge: €15)
- "Van / Shuttle" (Large capacity): For groups of 8+ pax or excessive luggage. (Surcharge: €25)

Intelligent Suggestions:
- Propose vehicles naturally based on trip context.
- Airport/Business Trip: Suggest "Business Class" or "First Class Executive".
- Groups of 4-7: Suggest "Mercedes V-Class".
- Groups of 8+: Suggest "Van / Shuttle".
- VIP/Premium events: Suggest "First Class Executive".

Rules:
- European Standard: Dates MUST be DD-MM-YYYY. Time MUST be 24h format (HH:MM).
- Pricing: Base €1.50/km.
- Payment Methods: [Cash, Card, Invoice, Online].
- Return ONLY valid JSON. NEVER use markdown or \`\`\` blocks.

JSON FORMAT:
{
  "intent": "booking",
  "language": "nl|fr|en",
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

Operational Validation:
- Collect all fields: name, email, phone, pickup, destination, date, time, vehicle, passengers, luggage, payment_method.
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

    const validation = BookingLogic.validateBooking(parsed);

    if (parsed.date && parsed.time) {
      const bDate = BookingLogic.parseDate(parsed.date, parsed.time);
      if (bDate && bDate < now) {
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

      // Session history duplicate prevention
      const alreadyHandledInSession = conversationHistory.some(m =>
        m.role === "assistant" &&
        m.content.includes('"intent":"booking"') &&
        m.content.includes(`"date":"${parsed.date}"`) &&
        m.content.includes(`"time":"${parsed.time}"`)
      );

      if (alreadyHandledInSession) {
        return res.status(200).json(parsed);
      }

      // Database duplicate check
      const { data: existingBooking } = await supabase
        .from("bookings")
        .select("id, pickup, destination")
        .eq("email", parsed.email)
        .eq("datetime", parsed.date)
        .eq("time", parsed.time)
        .maybeSingle();

      if (existingBooking &&
          existingBooking.pickup === parsed.pickup &&
          existingBooking.destination === parsed.destination) {

          const duplicateMsg = {
            en: "A similar booking already exists in our system for this schedule. If this is a separate request, please adjust the time slightly.",
            nl: "Er bestaat al een gelijkaardige boeking in ons systeem voor dit tijdstip. Indien dit een nieuwe aanvraag is, gelieve het tijdstip licht aan te passen.",
            fr: "Une réservation similaire existe déjà dans notre système pour cet horaire. S'il s'agit d'une nouvelle demande, veuillez modifier légèrement l'heure."
          };
          return res.status(200).json({
            ...parsed,
            reply: duplicateMsg[lang] || duplicateMsg.en
          });
      }

      // Calculate amount using shared logic (default 20km for AI-only bookings if distance unknown)
      const calculatedAmount = BookingLogic.calculatePrice(20, parsed.vehicle, parsed.extras);

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
        amount: calculatedAmount,
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

      const { error } = await supabase
        .from("bookings")
        .insert([insertPayload]);

      if (error) {
        console.error("SUPABASE INSERT ERROR:", error);
        return res.status(500).json({ error: error.message });
      }

      const confirmMsg = {
        en: "Your high-end transportation has been secured. Your driving assistant K2000 is at your service.",
        nl: "Uw exclusief transport is bevestigd. Uw rij-assistent K2000 staat tot uw dienst.",
        fr: "Votre transport de luxe a été confirmé. Votre assistant de conduite K2000 est à votre service."
      };

      parsed.reply = parsed.reply + `\n\nBooking ID: ${bookingId}\n\n${confirmMsg[lang] || confirmMsg.en}`;
      parsed.id = bookingId;
    }

    return res.status(200).json(parsed);

  } catch (error) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};
