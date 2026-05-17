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
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    const messages = [
      {
        role: "system",
        content: `
You are K2000, a luxury intelligent driving assistant for Fleetconnect Taxi.

Your persona:
- Futuristic, intelligent, calm, and premium.
- You speak like an elite chauffeur assistant.
- Your tone is professional, helpful, and concise.
- Naturally adapt to the user's language (Dutch, English, French, etc.) and STAY in that language.

Vehicle Suggestions:
- Airport transfer -> Business Class, First Class Executive, or Mercedes V-Class.
- Large group (5+ pax) -> Van / Shuttle.
- VIP/Luxury -> First Class Executive.
- Standard -> Business Class.

IMPORTANT:
- Always return ONLY valid JSON.
- NEVER use markdown or \`\`\`json blocks.
- Date format: DD-MM-YYYY.
- Time format: 24h European (e.g., 14:30).

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
  "extras": [],
  "payment_method": "Cash",
  "missing_fields": [],
  "follow_up_question": "",
  "reply": "",
  "language": "en"
}

Rules:
- missing_fields must contain all missing required fields.
- Required fields: name, email, phone, pickup, destination, date, time, vehicle.
- if all required fields exist: missing_fields = []
- payment_method options: Cash, Card, Invoice, Online. Default is Cash if not specified.
- "extras" is an array of strings (e.g., ["Water", "Wifi"]).
- Respond in the "reply" field using your premium K2000 persona in the user's language.
- "language" field should be "nl", "fr", or "en".
`
      },
      ...conversationHistory,
      { role: "user", content: message }
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.1
    });

    let raw = completion.choices[0].message.content;
    raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(raw);

    if (parsed.intent === "booking" && parsed.missing_fields && parsed.missing_fields.length === 0) {
      // Check for duplicates
      const existingBooking = await supabase
        .from("bookings")
        .select("id, created_at")
        .eq("email", parsed.email)
        .eq("datetime", parsed.date)
        .eq("time", parsed.time)
        .maybeSingle();

      if (existingBooking.data) {
        const createdAt = new Date(existingBooking.data.created_at);
        const diffMinutes = (new Date() - createdAt) / 1000 / 60;

        if (diffMinutes < 10) {
          const dupReplies = {
            nl: "Er bestaat al een boeking voor deze datum en tijd. Uw assistent K2000 staat voor u klaar.",
            fr: "Une réservation existe déjà pour cette date et heure. K2000 est à votre service.",
            en: "A booking already exists for this date and time. K2000 is at your service."
          };
          return res.status(200).json({
            ...parsed,
            reply: dupReplies[parsed.language] || dupReplies.en
          });
        }
      }

      const bookingId = BookingLogic.generateBookingId();

      // Calculate real price using shared logic
      const distancePlaceholder = 10; // Ideally we'd have distance here, but AI doesn't know it yet.
      // In a real scenario, the AI might call a tool for distance.
      // For now, we at least use the shared logic for baseline pricing.
      const amount = BookingLogic.calculatePrice(distancePlaceholder, parsed.vehicle, parsed.extras);

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
        extras: Array.isArray(parsed.extras) ? parsed.extras.join(", ") : (parsed.extras || ""),
        amount: amount,
        payment: parsed.payment_method || "Cash",
        status: "pending",
        customer_id: "CUST-" + parsed.email.replace(/[^a-zA-Z0-9]/g, ""),
        form_data: { source: "ai-chat", ai: true, k2000: true },
        partner_id: BookingLogic.CONFIG.PARTNER_ID
      };

      const { data, error } = await supabase.from("bookings").insert([insertPayload]).select();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      parsed.reply = parsed.reply + `\n\nBooking ID: ${bookingId}`;
    }

    return res.status(200).json(parsed);
  } catch (error) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};
