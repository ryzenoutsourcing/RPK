/**
 * SHARED BOOKING LOGIC FOR FLEETCONNECT & ROYAL VELVET
 * One operational source of truth.
 */

const CONFIG = {
  PRICING_PER_KM: 1.50,
  PARTNER_ID: 1001,
  ID_PREFIX: "PK-",
  VEHICLE_CLASSES: {
    "Business Class": { emoji: "🚗", surcharge: 0, description: "Standard Premium Sedan" },
    "First Class Executive": { emoji: "👑", surcharge: 20, description: "Top-tier Luxury Sedan" },
    "Mercedes V-Class": { emoji: "🚐", surcharge: 15, description: "Premium MPV up to 7 pax" },
    "Van / Shuttle": { emoji: "🚌", surcharge: 25, description: "Large group transport 8+ pax" }
  },
  EXTRAS: {
    "Meet & Greet": 15,
    "Kiss & Ride": 0,
    "Waterfles": 0,
    "WiFi": 0,
    "Child Seat": 10
  },
  PAYMENT_METHODS: ["Cash", "Card", "Invoice", "Online"]
};

/**
 * Universal Price Calculation
 * @param {number} distanceKm
 * @param {string} vehicleClass
 * @param {string[]|string} extras
 * @param {boolean} isRoundtrip
 */
function calculatePrice(distanceKm, vehicleClass, extras = [], isRoundtrip = false) {
  let dist = parseFloat(distanceKm) || 0;
  if (isRoundtrip) dist *= 2;

  let total = dist * CONFIG.PRICING_PER_KM;

  const vInfo = CONFIG.VEHICLE_CLASSES[vehicleClass];
  if (vInfo) {
    total += vInfo.surcharge;
  }

  // Handle extras (can be array or comma-separated string)
  let extrasList = Array.isArray(extras) ? extras : (extras ? extras.split(',').map(e => e.trim()) : []);
  extrasList.forEach(e => {
    if (CONFIG.EXTRAS[e]) {
      total += CONFIG.EXTRAS[e];
    }
  });

  return parseFloat(total.toFixed(2));
}

/**
 * DD-MM-YYYY HH:MM normalization (European)
 */
function parseDate(dateStr, timeStr) {
  if (!dateStr) return null;
  const [d, m, y] = dateStr.split("-").map(Number);
  const [h, min] = (timeStr || "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, h, min);
}

/**
 * Validation Logic
 */
function validateBooking(data) {
  const errors = [];
  const missingFields = [];

  const required = ["pickup", "destination", "date", "time", "name", "email", "phone", "vehicle", "payment_method"];

  required.forEach(f => {
    if (!data[f]) {
      missingFields.push(f);
    }
  });

  if (data.date && data.time) {
    const bookingDate = parseDate(data.date, data.time);
    const now = new Date();
    if (bookingDate < now) {
      errors.push("Departure time must be in the future.");
    }
  }

  if (data.payment_method && !CONFIG.PAYMENT_METHODS.includes(data.payment_method)) {
    errors.push("Invalid payment method.");
  }

  return {
    isValid: errors.length === 0 && missingFields.length === 0,
    errors,
    missingFields
  };
}

/**
 * Format Booking ID: PK-YYYYMMDD-XXX
 */
function generateBookingId() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  // Use random counter
  const seq = String(Math.floor(Math.random() * 999)).padStart(3, "0");
  return `${CONFIG.ID_PREFIX}${yyyy}${mm}${dd}-${seq}`;
}

/**
 * Format date to European DD-MM-YYYY
 */
function formatDate(date) {
  if (!date) return "";
  const dObj = (date instanceof Date) ? date : new Date(date);
  const d = String(dObj.getDate()).padStart(2, "0");
  const m = String(dObj.getMonth() + 1).padStart(2, "0");
  const y = dObj.getFullYear();
  return `${d}-${m}-${y}`;
}

/**
 * Format time to European 24h HH:MM
 */
function formatTime(date) {
  if (!date) return "";
  const dObj = (date instanceof Date) ? date : new Date(date);
  const h = String(dObj.getHours()).padStart(2, "0");
  const m = String(dObj.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Export for both Node.js and Browser
 */
const BookingLogic = {
  CONFIG,
  calculatePrice,
  validateBooking,
  generateBookingId,
  parseDate,
  formatDate,
  formatTime
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = BookingLogic;
} else {
  window.BookingLogic = BookingLogic;
}
