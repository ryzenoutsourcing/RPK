const OpenAI = require("openai").default;
const { createClient } = require("@supabase/supabase-js");

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
    // Format: "DD/MM/YYYY, HH:MM:SS"

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
- Language Continuity: You MUST detect the user's language (Dutch, French, or English) and maintain it throughout the entire conversation and booking confirmation. Return the detected language code in the "language" field.

Vehicle Selection & Pricing:
- Standard Pricing: €1.50 per km.
- Vehicle Classes & Surcharges:
  - "Business Class" (Standard premium sedan, +€0)
  - "First Class Executive" (Top-tier luxury sedan, +€20)
  - "Mercedes V-Class" (Premium MPV for up to 7 passengers, +€15)
  - "Van / Shuttle" (Large group transport up to 8+ passengers, +€25)
- Intelligent Suggestions: Propose "First Class Executive" for VIP trips, "Mercedes V-Class" or "Van / Shuttle" for groups, and "Business Class" for standard airport transfers.

Extras & Validation:
- Available Extras: Water bottles, Child seat, Meet & Greet, WiFi, Kiss & Ride.
- Validation: Ensure all pickup, destination, and passenger requirements are met.
- DATE/TIME VALIDATION: You MUST ensure the departure date and time are in the future. If the user provides a past date/time, do not confirm the booking and ask for a valid one.
- Normalization: If the user says "today", "tomorrow", or "next Friday", normalize it using the CURRENT DATE provided above into DD-MM-YYYY format.

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
  "passengers": 1,
  "luggage": 0,
  "payment_method": "",
  "flight_number": "",
  "extras": "",
  "missing_fields": [],
  "follow_up_question": "",
  "reply": ""
}

Rules:
- missing_fields: name, email, phone, pickup, destination, date, time, vehicle, passengers, luggage, payment_method.
- payment_method: Must be one of [Cash, Card, Invoice, Online].
- vehicle: Use one of the specific classes mentioned above.
- passengers: Integer.
- luggage: Integer.
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
    console.log("RAW AI:", raw);

    raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(raw);
    console.log("PARSED:", parsed);

    const lang = parsed.language || "en";

    // --- Strict Date/Time Validation (Brussels Timezone) ---
    if (parsed.date && parsed.time) {
      try {
        const [day, month, year] = parsed.date.split("-").map(Number);
        const [hours, minutes] = parsed.time.split(":").map(Number);

        // Construct date string for comparison in Brussels timezone
        const bookingDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

        // Use Intl.DateTimeFormat to get current Brussels time for comparison
        const brusselsNowStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Europe/Brussels',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(now).replace(', ', 'T');

        // Comparison works alphabetically for ISO-like strings
        if (bookingDateStr <= brusselsNowStr) {
           const pastDateMsg = {
             en: "That departure time appears to be in the past. Could you provide a new departure time?",
             nl: "Die vertrektijd lijkt in het verleden te liggen. Kunt u een nieuwe vertrektijd opgeven?",
             fr: "Cette heure de départ semble être passée. Pourriez-vous indiquer une nouvelle heure de départ ?"
           };

           return res.status(200).json({
             ...parsed,
             missing_fields: ["date", "time"],
             reply: pastDateMsg[lang] || pastDateMsg.en
           });
        }
      } catch (e) {
        console.error("Date validation error:", e);
      }
    }

    if (
      parsed.intent === "booking" &&
      parsed.missing_fields &&
      parsed.missing_fields.length === 0
    ) {
      // Use Brussels date for the booking ID prefix
      const brusselsParts = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/Brussels',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
      }).formatToParts(now);

      const bYear = brusselsParts.find(p => p.type === 'year').value;
      const bMonth = brusselsParts.find(p => p.type === 'month').value;
      const bDay = brusselsParts.find(p => p.type === 'day').value;

      const sequence = String(Math.floor(Math.random() * 999)).padStart(3, "0");
      const bookingId = `PK-${bYear}${bMonth}${bDay}-${sequence}`;

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
        vehicle: parsed.vehicle || "",
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
        partner_id: 1001
      };

      console.log("INSERT PAYLOAD:", insertPayload);

      const existingBooking = await supabase
        .from("bookings")
        .select("id, form_data")
        .eq("email", parsed.email)
        .eq("datetime", parsed.date)
        .eq("time", parsed.time)
        .maybeSingle();

      if (existingBooking.data) {
        const isSameSession = conversationHistory.some(m =>
          m.role === "assistant" && m.content.includes(existingBooking.data.id)
        );

        if (!isSameSession) {
          const duplicateMsg = {
            en: "A booking already exists for this date and time.",
            nl: "Er bestaat al een boeking voor deze datum en tijd.",
            fr: "Une réservation existe déjà pour cette date et cette heure."
          };

          return res.status(200).json({
            ...parsed,
            reply: duplicateMsg[lang] || duplicateMsg.en
          });
        }
      }

      const { data, error } = await supabase
        .from("bookings")
        .insert([insertPayload])
        .select();

      if (error) {
        console.error("SUPABASE INSERT ERROR:", error);
        return res.status(500).json({
          error: error.message,
          details: error
        });
      }

      console.log("BOOKING CREATED:", data);

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
    return res.status(500).json({
      error: error.message
    });
  }
};
